import '../../features/cash/domain/entities/cash_receipt_summary.dart';
import '../../features/cash/domain/entities/remittance_summary.dart';
import '../../features/collection/domain/entities/invoice_summary.dart';
import '../../features/leases/domain/entities/lease_summary.dart';
import '../../features/portfolio/domain/entities/property_summary.dart';
import '../../features/portfolio/domain/entities/tenant.dart';
import '../../features/portfolio/domain/entities/unit.dart';

/// Périmètre du démarcheur renvoyé par `GET /v1/sync/pull`
/// (`docs/api/phase5-contract.md`).
class SyncPullChanged {
  const SyncPullChanged({
    this.properties = const [],
    this.units = const [],
    this.tenants = const [],
    this.leases = const [],
    this.invoices = const [],
    this.cashReceipts = const [],
    this.remittances = const [],
  });

  final List<PropertySummary> properties;
  final List<Unit> units;
  final List<Tenant> tenants;
  final List<LeaseSummary> leases;
  final List<InvoiceSummary> invoices;
  final List<CashReceiptSummary> cashReceipts;
  final List<RemittanceSummary> remittances;

  factory SyncPullChanged.fromJson(Map<String, dynamic> json) {
    List<T> parse<T>(String key, T Function(Map<String, dynamic>) fromJson) {
      final List<dynamic> raw = json[key] as List<dynamic>? ?? const [];
      return raw
          .map((dynamic e) => fromJson(e as Map<String, dynamic>))
          .toList();
    }

    return SyncPullChanged(
      properties: parse('properties', PropertySummary.fromJson),
      units: parse('units', Unit.fromJson),
      tenants: parse('tenants', Tenant.fromJson),
      leases: parse('leases', LeaseSummary.fromJson),
      invoices: parse('invoices', InvoiceSummary.fromJson),
      cashReceipts: parse('cashReceipts', CashReceiptSummary.fromJson),
      remittances: parse('remittances', RemittanceSummary.fromJson),
    );
  }
}

/// Une ligne de `deleted` : ressource sortie du périmètre ou supprimée
/// logiquement côté serveur.
class SyncDeletedRef {
  const SyncDeletedRef({required this.resourceType, required this.id});

  final String resourceType;
  final String id;

  factory SyncDeletedRef.fromJson(Map<String, dynamic> json) {
    return SyncDeletedRef(
      resourceType: json['resourceType'] as String,
      id: json['id'] as String,
    );
  }
}

/// `SyncPullResult` du contrat de phase 5.
class SyncPullResult {
  const SyncPullResult({
    required this.serverTime,
    required this.nextCursor,
    required this.hasMore,
    required this.retentionHours,
    required this.changed,
    this.deleted = const [],
  });

  final String serverTime;
  final String nextCursor;
  final bool hasMore;
  final int retentionHours;
  final SyncPullChanged changed;
  final List<SyncDeletedRef> deleted;

  factory SyncPullResult.fromJson(Map<String, dynamic> json) {
    final List<dynamic> deletedRaw = json['deleted'] as List<dynamic>? ?? [];
    return SyncPullResult(
      serverTime: json['serverTime'] as String? ?? '',
      nextCursor: json['nextCursor'] as String? ?? '',
      hasMore: json['hasMore'] as bool? ?? false,
      retentionHours: json['retentionHours'] as int? ?? 72,
      changed: SyncPullChanged.fromJson(
        json['changed'] as Map<String, dynamic>? ?? const {},
      ),
      deleted: deletedRaw
          .map(
            (dynamic e) => SyncDeletedRef.fromJson(e as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}
