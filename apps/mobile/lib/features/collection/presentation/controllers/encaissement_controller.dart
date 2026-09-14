import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/sync/outbox_repository.dart';
import '../../../../core/sync/outbox_types.dart';
import '../../../../core/sync/sync_providers.dart';
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
    this.isOffline = false,
    this.queuedOffline = false,
  });

  /// Message affiché en bandeau (non bloquant) quand l'appareil est hors
  /// ligne : depuis la phase 5, l'encaissement en espèces fonctionne hors
  /// ligne (mise en attente dans l'outbox généralisée), contrairement aux
  /// paiements numériques qui restent en ligne
  /// (`docs/api/phase5-contract.md`, arbitrage 3).
  static const String offlineMessage =
      'Hors ligne : cet encaissement sera synchronisé au retour du réseau.';

  /// Message affiché juste après la mise en attente d'un encaissement créé
  /// hors ligne (voir `queuedOffline`).
  static const String queuedOfflineMessage =
      'Encaissement enregistré. Il sera transmis dès que la synchronisation aboutira.';

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

  /// Bandeau non bloquant : les factures affichées proviennent du cache
  /// local (dernière tournée préchargée), pas d'un appel réseau frais.
  final bool isOffline;

  /// `true` juste après la mise en attente hors ligne d'un encaissement
  /// (outbox). L'écran affiche alors `queuedOfflineMessage` puis revient à
  /// la tournée (aucun `CashReceiptResult` serveur n'existe encore).
  final bool queuedOffline;

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
    bool? queuedOffline,
  }) {
    return EncaissementState(
      leaseInvoices: leaseInvoices ?? this.leaseInvoices,
      selectedInvoiceIds: selectedInvoiceIds ?? this.selectedInvoiceIds,
      amount: amount ?? this.amount,
      clientRef: clientRef,
      isOffline: isOffline,
      queuedOffline: queuedOffline ?? this.queuedOffline,
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
    // `.future` (et non `.value`) : suspend proprement `build()` jusqu'à la
    // résolution de l'organisation courante plutôt que de lire une valeur
    // encore nulle pendant son chargement initial.
    final String? organizationId = await ref.watch(
      selectedOrganizationControllerProvider.future,
    );
    List<InvoiceSummary> allDue = const [];
    // Depuis la phase 5, l'encaissement en espèces fonctionne hors ligne :
    // une tournée sans réseau se replie sur le cache local (`CachedInvoices`,
    // préchargé) au lieu de bloquer l'écran. `isFromCache` ne fait
    // qu'afficher un bandeau informatif, il n'empêche plus de saisir.
    bool isOffline = false;
    if (organizationId != null) {
      final result = await ref
          .watch(collectionRepositoryProvider)
          .fetchDueInvoices(organizationId);
      allDue = result.data;
      isOffline = result.isFromCache;
    }

    final InvoiceSummary origin = allDue.firstWhere(
      (invoice) => invoice.id == invoiceId,
      orElse: () => throw const ApiException(
        code: 'BILLING.INVOICE_NOT_FOUND',
        message: 'Facture introuvable (hors du périmètre préchargé).',
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
      isOffline: isOffline,
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
  /// appui pendant l'envoi n'a aucun effet (un seul appel réseau, ou une
  /// seule mise en attente hors ligne).
  Future<void> submit() async {
    final EncaissementState? current = state.value;
    if (current == null ||
        current.isSubmitting ||
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

    final bool offline = await ref
        .read(connectivityServiceProvider)
        .isOffline();
    if (offline) {
      await _submitOffline(organizationId, current);
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

  /// Met l'encaissement en attente dans l'outbox généralisée (mode avion,
  /// ou réseau simplement indisponible). Contrairement aux paiements
  /// numériques (Mobile Money, virement), l'encaissement en espèces
  /// fonctionne hors ligne depuis la phase 5 (`docs/api/phase5-contract.md`,
  /// arbitrage 3). La signature (petite, PNG) est encodée en base64 dans le
  /// payload comme en ligne ; une photo de reçu papier passe par une
  /// opération `DOCUMENT` séparée, téléversée à la synchronisation puis
  /// rattachée par `dependsOn` (voir `SyncEngine`).
  Future<void> _submitOffline(
    String organizationId,
    EncaissementState current,
  ) async {
    final OutboxRepository outboxRepository = ref.read(
      outboxRepositoryProvider,
    );
    List<String> dependsOn = const [];
    String? signatureDataUrl;
    if (current.signaturePngBytes != null) {
      signatureDataUrl =
          'data:image/png;base64,${base64Encode(current.signaturePngBytes!)}';
    } else if (current.paperReceiptFilePath != null) {
      final File file = File(current.paperReceiptFilePath!);
      final int sizeBytes = await file.length();
      final String documentClientRef = await outboxRepository.enqueue(
        organizationId: organizationId,
        type: OutboxOperationType.document,
        payload: <String, dynamic>{
          'filePath': current.paperReceiptFilePath,
          'fileName': 'recu_papier_${current.clientRef}.jpg',
          'mimeType': 'image/jpeg',
          'sizeBytes': sizeBytes,
        },
      );
      dependsOn = [documentClientRef];
    }

    await outboxRepository.enqueue(
      organizationId: organizationId,
      type: OutboxOperationType.cashReceipt,
      clientRef: current.clientRef,
      dependsOn: dependsOn,
      payload: <String, dynamic>{
        'tenantId': current.primaryInvoice.tenant.id,
        'leaseId': current.primaryInvoice.lease.id,
        'amount': current.amount,
        'allocations': null,
        'autoAllocate': true,
        'signatureDataUrl': signatureDataUrl,
        'paperReceiptDocumentId': null,
        'clientRef': current.clientRef,
      },
    );
    state = AsyncData(
      current.copyWith(isSubmitting: false, queuedOffline: true),
    );
    ref.read(syncCoordinatorProvider.notifier).triggerSync();
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
