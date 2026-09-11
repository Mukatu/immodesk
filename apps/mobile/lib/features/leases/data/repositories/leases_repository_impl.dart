import '../../../../core/db/app_database.dart';
import '../../../../core/network/api_exception.dart';
import '../../../portfolio/domain/entities/cached_result.dart';
import '../../domain/entities/lease_detail.dart';
import '../../domain/entities/lease_document.dart';
import '../../domain/entities/lease_status.dart';
import '../../domain/entities/lease_summary.dart';
import '../../domain/repositories/leases_repository.dart';
import '../datasources/leases_remote_data_source.dart';
import '../leases_cache_mapper.dart';

/// Lecture réseau des baux avec écriture du cache local en cas de succès,
/// et repli sur la dernière copie en cache si le réseau échoue (même
/// principe que `PortfolioRepositoryImpl`).
class LeasesRepositoryImpl implements LeasesRepository {
  LeasesRepositoryImpl(this._remote, this._db);

  final LeasesRemoteDataSource _remote;
  final AppDatabase _db;

  bool _isNetworkError(ApiException e) => e.code.startsWith('NETWORK.');

  @override
  Future<CachedResult<List<LeaseSummary>>> fetchLeases(
    String organizationId, {
    LeaseStatus? status,
  }) async {
    try {
      final List<LeaseSummary> items = await _remote.fetchLeases(
        organizationId,
        status: status,
      );
      for (final LeaseSummary lease in items) {
        await _db.upsertCachedLease(
          LeasesCacheMapper.toRowFromSummary(organizationId, lease),
        );
      }
      return CachedResult(data: items, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final List<CachedLeaseRow> rows = await _db
          .getCachedLeasesForOrganization(organizationId);
      final List<CachedLeaseRow> filtered = status == null
          ? rows
          : rows
                .where((r) => r.status == leaseStatusToApiValue(status))
                .toList();
      if (filtered.isEmpty) rethrow;
      return CachedResult(
        data: filtered.map(LeasesCacheMapper.summaryFromRow).toList(),
        isFromCache: true,
        cachedAt: _latest(filtered.map((r) => r.cachedAt)),
      );
    }
  }

  @override
  Future<CachedResult<LeaseDetail?>> fetchActiveLeaseForUnit(
    String organizationId,
    String unitId,
  ) async {
    try {
      final List<LeaseSummary> leases = await _remote.fetchLeases(
        organizationId,
        unitId: unitId,
      );
      final LeaseSummary? active = _mostRecentActive(leases);
      if (active == null) {
        return const CachedResult(data: null, isFromCache: false);
      }
      final LeaseDetail detail = await _remote.fetchLeaseDetail(
        organizationId,
        active.id,
      );
      await _db.upsertCachedLease(
        LeasesCacheMapper.toRowFromDetail(organizationId, detail),
      );
      return CachedResult(data: detail, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final CachedLeaseRow? row = await _db.getCachedLeaseForUnit(unitId);
      if (row == null) rethrow;
      return CachedResult(
        data: LeasesCacheMapper.detailFromRow(row),
        isFromCache: true,
        cachedAt: row.cachedAt,
      );
    }
  }

  @override
  Future<CachedResult<LeaseDetail?>> fetchActiveLeaseForTenant(
    String organizationId,
    String tenantId,
  ) async {
    try {
      final List<LeaseSummary> leases = await _remote.fetchLeases(
        organizationId,
        tenantId: tenantId,
      );
      final LeaseSummary? active = _mostRecentActive(leases);
      if (active == null) {
        return const CachedResult(data: null, isFromCache: false);
      }
      final LeaseDetail detail = await _remote.fetchLeaseDetail(
        organizationId,
        active.id,
      );
      await _db.upsertCachedLease(
        LeasesCacheMapper.toRowFromDetail(organizationId, detail),
      );
      return CachedResult(data: detail, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final CachedLeaseRow? row = await _db.getCachedLeaseForTenant(tenantId);
      if (row == null) rethrow;
      return CachedResult(
        data: LeasesCacheMapper.detailFromRow(row),
        isFromCache: true,
        cachedAt: row.cachedAt,
      );
    }
  }

  @override
  Future<CachedResult<LeaseDetail>> fetchLeaseDetail(
    String organizationId,
    String leaseId,
  ) async {
    try {
      final LeaseDetail detail = await _remote.fetchLeaseDetail(
        organizationId,
        leaseId,
      );
      await _db.upsertCachedLease(
        LeasesCacheMapper.toRowFromDetail(organizationId, detail),
      );
      return CachedResult(data: detail, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final CachedLeaseRow? row = await _db.getCachedLeaseById(leaseId);
      if (row == null) rethrow;
      return CachedResult(
        data: LeasesCacheMapper.detailFromRow(row),
        isFromCache: true,
        cachedAt: row.cachedAt,
      );
    }
  }

  @override
  Future<List<LeaseDocument>> fetchLeaseDocuments(
    String organizationId,
    String leaseId,
  ) {
    // Toujours en ligne : pas de repli sur un cache local (les documents
    // se téléchargent à la demande, l'appelant affiche un message hors
    // ligne clair en cas d'échec réseau).
    return _remote.fetchLeaseDocuments(organizationId, leaseId);
  }

  LeaseSummary? _mostRecentActive(List<LeaseSummary> leases) {
    final List<LeaseSummary> active = leases
        .where((l) => l.status.isActive)
        .toList();
    if (active.isEmpty) return null;
    active.sort((a, b) => b.startDate.compareTo(a.startDate));
    return active.first;
  }

  DateTime _latest(Iterable<DateTime> dates) {
    return dates.reduce((a, b) => a.isAfter(b) ? a : b);
  }
}
