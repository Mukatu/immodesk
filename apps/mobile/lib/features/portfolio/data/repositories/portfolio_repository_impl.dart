import '../../../../core/db/app_database.dart';
import '../../../../core/network/api_exception.dart';
import '../../domain/entities/cached_result.dart';
import '../../domain/entities/property_detail.dart';
import '../../domain/entities/property_summary.dart';
import '../../domain/entities/tenant.dart';
import '../../domain/entities/unit_detail.dart';
import '../../domain/repositories/portfolio_repository.dart';
import '../datasources/portfolio_remote_data_source.dart';
import '../portfolio_cache_mapper.dart';

/// Lecture réseau avec écriture systématique du cache local en cas de
/// succès, et repli sur la dernière copie en cache si le réseau échoue
/// (voir `docs/04_plan_de_phases.md` §1.6 — consultation hors ligne).
class PortfolioRepositoryImpl implements PortfolioRepository {
  PortfolioRepositoryImpl(this._remote, this._db);

  final PortfolioRemoteDataSource _remote;
  final AppDatabase _db;

  bool _isNetworkError(ApiException e) => e.code.startsWith('NETWORK.');

  @override
  Future<CachedResult<List<PropertySummary>>> fetchProperties(
    String organizationId,
  ) async {
    try {
      final List<PropertySummary> items = await _remote.fetchProperties(
        organizationId,
      );
      await _db.replaceCachedProperties(
        organizationId,
        items
            .map((p) => PortfolioCacheMapper.toPropertyRow(organizationId, p))
            .toList(),
      );
      return CachedResult(data: items, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final List<CachedPropertyRow> rows = await _db.getCachedProperties(
        organizationId,
      );
      if (rows.isEmpty) rethrow;
      return CachedResult(
        data: rows.map(PortfolioCacheMapper.propertyFromRow).toList(),
        isFromCache: true,
        cachedAt: _latest(rows.map((r) => r.cachedAt)),
      );
    }
  }

  @override
  Future<CachedResult<PropertyDetail>> fetchPropertyDetail(
    String organizationId,
    String propertyId,
  ) async {
    try {
      final PropertyDetail detail = await _remote.fetchPropertyDetail(
        organizationId,
        propertyId,
      );
      await _db.replaceCachedUnitsForProperty(
        organizationId,
        propertyId,
        detail.units
            .map(
              (u) =>
                  PortfolioCacheMapper.toUnitRow(organizationId, propertyId, u),
            )
            .toList(),
      );
      return CachedResult(data: detail, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      return _degradedPropertyDetail(organizationId, propertyId, e);
    }
  }

  Future<CachedResult<PropertyDetail>> _degradedPropertyDetail(
    String organizationId,
    String propertyId,
    ApiException original,
  ) async {
    final List<CachedPropertyRow> propertyRows = await _db.getCachedProperties(
      organizationId,
    );
    CachedPropertyRow? propertyRow;
    for (final row in propertyRows) {
      if (row.id == propertyId) {
        propertyRow = row;
        break;
      }
    }
    final List<CachedUnitRow> unitRows = await _db.getCachedUnitsForProperty(
      organizationId,
      propertyId,
    );
    if (propertyRow == null) throw original;

    final PropertySummary summary = PortfolioCacheMapper.propertyFromRow(
      propertyRow,
    );
    final PropertyDetail degraded = PropertyDetail(
      id: summary.id,
      code: summary.code,
      name: summary.name,
      propertyType: summary.propertyType,
      addressLine: '',
      district: summary.district,
      city: summary.city,
      landlord: summary.landlord,
      units: unitRows.map(PortfolioCacheMapper.unitFromRow).toList(),
      occupancy: summary.occupancy,
    );
    final DateTime cachedAt = _latest([
      propertyRow.cachedAt,
      ...unitRows.map((r) => r.cachedAt),
    ]);
    return CachedResult(data: degraded, isFromCache: true, cachedAt: cachedAt);
  }

  @override
  Future<CachedResult<UnitDetail>> fetchUnitDetail(
    String organizationId,
    String unitId,
  ) async {
    try {
      final UnitDetail detail = await _remote.fetchUnitDetail(
        organizationId,
        unitId,
      );
      final List<CachedUnitRow> siblings = await _db.getCachedUnitsForProperty(
        organizationId,
        detail.unit.propertyId,
      );
      siblings.removeWhere((r) => r.id == unitId);
      siblings.add(
        PortfolioCacheMapper.toUnitRow(
          organizationId,
          detail.unit.propertyId,
          detail.unit,
        ),
      );
      await _db.replaceCachedUnitsForProperty(
        organizationId,
        detail.unit.propertyId,
        siblings,
      );
      return CachedResult(data: detail, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final CachedUnitRow? row = await _db.getCachedUnit(unitId);
      if (row == null) rethrow;
      final List<CachedPropertyRow> propertyRows = await _db
          .getCachedProperties(organizationId);
      CachedPropertyRow? propertyRow;
      for (final p in propertyRows) {
        if (p.id == row.propertyId) {
          propertyRow = p;
          break;
        }
      }
      if (propertyRow == null) rethrow;
      final UnitDetail degraded = UnitDetail(
        unit: PortfolioCacheMapper.unitFromRow(row),
        property: PortfolioCacheMapper.propertyFromRow(propertyRow),
        documents: const [],
      );
      return CachedResult(
        data: degraded,
        isFromCache: true,
        cachedAt: row.cachedAt,
      );
    }
  }

  @override
  Future<CachedResult<List<Tenant>>> fetchTenants(String organizationId) async {
    try {
      final List<Tenant> items = await _remote.fetchTenants(organizationId);
      await _db.replaceCachedTenants(
        organizationId,
        items
            .map((t) => PortfolioCacheMapper.toTenantRow(organizationId, t))
            .toList(),
      );
      return CachedResult(data: items, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final List<CachedTenantRow> rows = await _db.getCachedTenants(
        organizationId,
      );
      if (rows.isEmpty) rethrow;
      return CachedResult(
        data: rows.map(PortfolioCacheMapper.tenantFromRow).toList(),
        isFromCache: true,
        cachedAt: _latest(rows.map((r) => r.cachedAt)),
      );
    }
  }

  DateTime _latest(Iterable<DateTime> dates) {
    return dates.reduce((a, b) => a.isAfter(b) ? a : b);
  }
}
