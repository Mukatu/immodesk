import 'dart:convert';

import '../../../core/db/app_database.dart';
import '../domain/entities/invoice_summary.dart';

/// Conversion entre `InvoiceSummary` (réseau) et `CachedInvoiceRow` (Drift),
/// même schéma que `PortfolioCacheMapper`/`LeasesCacheMapper` : le payload
/// JSON complet est stocké, les colonnes indexées ne servent qu'aux
/// filtres/requêtes locales.
abstract final class CollectionCacheMapper {
  static CachedInvoiceRow toInvoiceRow(
    String organizationId,
    InvoiceSummary invoice,
  ) {
    return CachedInvoiceRow(
      id: invoice.id,
      organizationId: organizationId,
      leaseId: invoice.lease.id,
      propertyId: invoice.property.id,
      dueDate: invoice.dueDate,
      payload: jsonEncode(invoice.toJson()),
      cachedAt: DateTime.now(),
    );
  }

  static InvoiceSummary invoiceFromRow(CachedInvoiceRow row) {
    return InvoiceSummary.fromJson(
      jsonDecode(row.payload) as Map<String, dynamic>,
    );
  }
}
