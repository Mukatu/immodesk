import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../collection/data/collection_providers.dart';
import '../../../collection/domain/entities/invoice_summary.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';

/// Facture d'origine et organisation courante, une fois la connectivité et
/// la disponibilité réseau vérifiées.
class InvoiceContext {
  const InvoiceContext({required this.organizationId, required this.invoice});

  final String organizationId;
  final InvoiceSummary invoice;
}

/// Résultat du chargement du contexte : soit prêt, soit bloqué hors ligne.
/// Même stratégie que `EncaissementController.build()` : les modes de
/// paiement de la phase 4 sont en ligne uniquement, jamais servis depuis le
/// cache de la tournée (lecture seule).
class InvoiceContextResult {
  const InvoiceContextResult.ready(this.context) : isOffline = false;

  const InvoiceContextResult.offline() : context = null, isOffline = true;

  final InvoiceContext? context;
  final bool isOffline;
}

/// Charge la facture [invoiceId] depuis la tournée du démarcheur
/// (`CollectionRepository.fetchDueInvoices`), après vérification de la
/// connectivité. Fonction partagée par tous les contrôleurs de paiement de
/// la phase 4 pour éviter de dupliquer cette logique quatre fois.
Future<InvoiceContextResult> loadInvoiceContext(
  Ref ref,
  String invoiceId,
) async {
  final bool isOffline = await ref
      .watch(connectivityServiceProvider)
      .isOffline();
  if (isOffline) return const InvoiceContextResult.offline();

  final String? organizationId = await ref.watch(
    selectedOrganizationControllerProvider.future,
  );
  if (organizationId == null) return const InvoiceContextResult.offline();

  final result = await ref
      .watch(collectionRepositoryProvider)
      .fetchDueInvoices(organizationId);
  if (result.isFromCache) return const InvoiceContextResult.offline();

  final InvoiceSummary invoice = result.data.firstWhere(
    (i) => i.id == invoiceId,
    orElse: () => throw const ApiException(
      code: 'BILLING.INVOICE_NOT_FOUND',
      message: 'Facture introuvable.',
    ),
  );
  return InvoiceContextResult.ready(
    InvoiceContext(organizationId: organizationId, invoice: invoice),
  );
}
