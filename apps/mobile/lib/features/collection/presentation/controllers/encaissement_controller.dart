import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/ulid.dart';
import '../../../documents/data/documents_providers.dart';
import '../../../documents/domain/entities/document.dart';
import '../../../documents/domain/entities/document_kind.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/collection_providers.dart';
import '../../domain/entities/cash_receipt_result.dart';
import '../../domain/entities/invoice_summary.dart';

part 'encaissement_controller.g.dart';

/// État de l'écran d'encaissement : facture(s) du bail concerné, montant
/// saisi, mode de preuve (signature tactile ou photo du reçu papier) et
/// avancement de l'envoi.
class EncaissementState {
  const EncaissementState({
    required this.leaseInvoices,
    required this.selectedInvoiceIds,
    required this.amount,
    required this.clientRef,
    this.signaturePngBytes,
    this.paperReceiptFilePath,
    this.isSubmitting = false,
    this.errorMessage,
    this.result,
    this.isOfflineBlocked = false,
  });

  /// Message clair affiché à l'écran quand l'appareil est hors ligne :
  /// l'encaissement n'est pas activé en mode hors ligne en phase 3 (seule
  /// la tournée est consultable hors ligne, en lecture seule ; l'outbox de
  /// collecte arrive en phase 5, voir `docs/04_plan_de_phases.md`).
  static const String offlineMessage =
      'Connexion requise pour encaisser. Réessayez une fois en ligne.';

  /// Toutes les factures dues du même bail que la facture d'origine.
  final List<InvoiceSummary> leaseInvoices;
  final Set<String> selectedInvoiceIds;
  final int amount;

  /// Généré une seule fois à l'ouverture de l'écran, conservé jusqu'à la
  /// réponse du serveur : une nouvelle tentative après échec rejoue le
  /// même `clientRef` (idempotence, `docs/api/phase3-contract.md`).
  final String clientRef;

  final Uint8List? signaturePngBytes;
  final String? paperReceiptFilePath;
  final bool isSubmitting;
  final String? errorMessage;
  final CashReceiptResult? result;
  final bool isOfflineBlocked;

  List<InvoiceSummary> get selectedInvoices => leaseInvoices
      .where((invoice) => selectedInvoiceIds.contains(invoice.id))
      .toList();

  InvoiceSummary get primaryInvoice => leaseInvoices.first;

  bool get hasProof =>
      signaturePngBytes != null || paperReceiptFilePath != null;

  EncaissementState copyWith({
    List<InvoiceSummary>? leaseInvoices,
    Set<String>? selectedInvoiceIds,
    int? amount,
    Uint8List? signaturePngBytes,
    bool clearSignature = false,
    String? paperReceiptFilePath,
    bool clearPaperReceipt = false,
    bool? isSubmitting,
    String? errorMessage,
    bool clearError = false,
    CashReceiptResult? result,
  }) {
    return EncaissementState(
      leaseInvoices: leaseInvoices ?? this.leaseInvoices,
      selectedInvoiceIds: selectedInvoiceIds ?? this.selectedInvoiceIds,
      amount: amount ?? this.amount,
      clientRef: clientRef,
      signaturePngBytes: clearSignature
          ? null
          : (signaturePngBytes ?? this.signaturePngBytes),
      paperReceiptFilePath: clearPaperReceipt
          ? null
          : (paperReceiptFilePath ?? this.paperReceiptFilePath),
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      result: result ?? this.result,
    );
  }
}

/// Un contrôleur par facture d'origine (`invoiceId` = facture depuis
/// laquelle l'écran a été ouvert, dans « Ma tournée »).
@riverpod
class EncaissementController extends _$EncaissementController {
  @override
  Future<EncaissementState> build(String invoiceId) async {
    final bool isOffline = await ref
        .watch(connectivityServiceProvider)
        .isOffline();
    if (isOffline) {
      return EncaissementState(
        leaseInvoices: const [],
        selectedInvoiceIds: const {},
        amount: 0,
        clientRef: Ulid.generate(),
        isOfflineBlocked: true,
      );
    }

    // `.future` (et non `.value`) : suspend proprement `build()` jusqu'à la
    // résolution de l'organisation courante plutôt que de lire une valeur
    // encore nulle pendant son chargement initial.
    final String? organizationId = await ref.watch(
      selectedOrganizationControllerProvider.future,
    );
    List<InvoiceSummary> allDue = const [];
    bool servedFromCache = false;
    if (organizationId != null) {
      final result = await ref
          .watch(collectionRepositoryProvider)
          .fetchDueInvoices(organizationId);
      allDue = result.data;
      servedFromCache = result.isFromCache;
    }

    // Le réseau a échoué pendant l'appel malgré la vérification initiale
    // (`isOffline`) : le dépôt s'est replié sur le cache local, qui ne
    // doit jamais servir à encaisser (lecture seule).
    if (servedFromCache) {
      return EncaissementState(
        leaseInvoices: const [],
        selectedInvoiceIds: const {},
        amount: 0,
        clientRef: Ulid.generate(),
        isOfflineBlocked: true,
      );
    }

    final InvoiceSummary origin = allDue.firstWhere(
      (invoice) => invoice.id == invoiceId,
      orElse: () => throw const ApiException(
        code: 'BILLING.INVOICE_NOT_FOUND',
        message: 'Facture introuvable.',
      ),
    );
    final List<InvoiceSummary> leaseInvoices =
        allDue.where((invoice) => invoice.lease.id == origin.lease.id).toList()
          ..sort((a, b) => a.dueDate.compareTo(b.dueDate));

    return EncaissementState(
      leaseInvoices: leaseInvoices,
      selectedInvoiceIds: {origin.id},
      amount: origin.balanceAmount,
      clientRef: Ulid.generate(),
    );
  }

  void toggleInvoice(String targetInvoiceId) {
    final EncaissementState? current = state.value;
    if (current == null) return;
    final Set<String> updated = {...current.selectedInvoiceIds};
    if (!updated.add(targetInvoiceId)) {
      updated.remove(targetInvoiceId);
    }
    state = AsyncData(current.copyWith(selectedInvoiceIds: updated));
  }

  void setAmount(int amount) {
    final EncaissementState? current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(amount: amount < 0 ? 0 : amount, clearError: true),
    );
  }

  void setSignature(Uint8List pngBytes) {
    final EncaissementState? current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        signaturePngBytes: pngBytes,
        clearPaperReceipt: true,
        clearError: true,
      ),
    );
  }

  void setPaperReceiptPhoto(String filePath) {
    final EncaissementState? current = state.value;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(
        paperReceiptFilePath: filePath,
        clearSignature: true,
        clearError: true,
      ),
    );
  }

  /// Soumet l'encaissement. Verrouillé dès le premier appui : un double
  /// appui pendant l'envoi n'a aucun effet (un seul appel réseau).
  Future<void> submit() async {
    final EncaissementState? current = state.value;
    if (current == null ||
        current.isSubmitting ||
        current.isOfflineBlocked ||
        current.leaseInvoices.isEmpty) {
      return;
    }
    state = AsyncData(current.copyWith(isSubmitting: true, clearError: true));

    final String? organizationId = ref
        .read(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) {
      state = AsyncData(
        current.copyWith(
          isSubmitting: false,
          errorMessage: 'Organisation introuvable.',
        ),
      );
      return;
    }

    try {
      String? paperReceiptDocumentId;
      if (current.paperReceiptFilePath != null) {
        paperReceiptDocumentId = await _uploadPaperReceiptPhoto(
          organizationId,
          current.paperReceiptFilePath!,
        );
      }

      // Imputation demandée en `autoAllocate` (côté serveur, plus ancienne
      // facture d'abord) : la sélection locale ne sert qu'à l'aperçu
      // affiché à l'écran (`previewAllocation`), la facture d'origine
      // porte la relation `leaseId`/`tenantId` de l'encaissement.
      final result = await ref
          .read(collectionRepositoryProvider)
          .createCashReceipt(
            organizationId: organizationId,
            tenantId: current.primaryInvoice.tenant.id,
            leaseId: current.primaryInvoice.lease.id,
            amount: current.amount,
            allocations: null,
            signatureDataUrl: current.signaturePngBytes == null
                ? null
                : 'data:image/png;base64,${base64Encode(current.signaturePngBytes!)}',
            paperReceiptDocumentId: paperReceiptDocumentId,
            clientRef: current.clientRef,
          );
      state = AsyncData(current.copyWith(isSubmitting: false, result: result));
    } on ApiException catch (e) {
      state = AsyncData(
        current.copyWith(isSubmitting: false, errorMessage: e.message),
      );
    }
  }

  Future<String> _uploadPaperReceiptPhoto(
    String organizationId,
    String filePath,
  ) async {
    final repository = ref.read(documentsRepositoryProvider);
    final File file = File(filePath);
    final int sizeBytes = await file.length();
    final upload = await repository.requestUploadUrl(
      organizationId: organizationId,
      fileName: 'recu_papier_${Ulid.generate()}.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: DocumentKind.other,
    );
    await repository.putFile(
      uploadUrl: upload.uploadUrl,
      file: file,
      mimeType: 'image/jpeg',
    );
    final Document document = await repository.registerDocument(
      organizationId: organizationId,
      objectKey: upload.objectKey,
      fileName: 'recu_papier.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: sizeBytes,
      kind: DocumentKind.other,
    );
    return document.id;
  }
}
