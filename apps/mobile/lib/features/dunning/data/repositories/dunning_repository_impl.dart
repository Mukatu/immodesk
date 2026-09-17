import '../../../../core/db/app_database.dart';
import '../../../../core/network/api_exception.dart';
import '../../domain/entities/cached_result.dart';
import '../../domain/entities/dunning_run.dart';
import '../../domain/repositories/dunning_repository.dart';
import '../dunning_cache_mapper.dart';
import '../datasources/dunning_remote_data_source.dart';

/// Lecture réseau de l'historique des relances avec écriture systématique
/// du cache local (`CachedDunningRuns`) en cas de succès, et repli sur la
/// dernière copie connue en cas d'échec réseau — même stratégie que
/// `CollectionRepositoryImpl` (lecture seule : cet écran ne fait que lire).
class DunningRepositoryImpl implements DunningRepository {
  DunningRepositoryImpl(this._remote, this._db);

  final DunningRemoteDataSource _remote;
  final AppDatabase _db;

  /// Taille de page côté API.
  static const int _pageLimit = 100;

  bool _isNetworkError(ApiException e) => e.code.startsWith('NETWORK.');

  @override
  Future<CachedResult<List<DunningRun>>> fetchHistoryForTenant({
    required String organizationId,
    required String tenantId,
    String? invoiceId,
  }) async {
    try {
      final List<DunningRun> collected = <DunningRun>[];
      String? cursor;
      do {
        final DunningRunsPage page = await _remote.fetchRuns(
          organizationId,
          invoiceId: invoiceId,
          tenantId: invoiceId == null ? tenantId : null,
          cursor: cursor,
          limit: _pageLimit,
        );
        collected.addAll(page.items);
        cursor = page.nextCursor;
      } while (cursor != null);

      collected.sort(_byMostRecentFirst);
      await _db.replaceCachedDunningRunsForTenant(
        organizationId,
        tenantId,
        collected
            .map(
              (run) => DunningCacheMapper.toRow(organizationId, tenantId, run),
            )
            .toList(),
      );
      return CachedResult(data: collected, isFromCache: false);
    } on ApiException catch (e) {
      if (!_isNetworkError(e)) rethrow;
      final List<CachedDunningRunRow> rows = await _db
          .getCachedDunningRunsForTenant(organizationId, tenantId);
      if (rows.isEmpty) rethrow;
      final DateTime cachedAt = rows
          .map((r) => r.cachedAt)
          .reduce((a, b) => a.isAfter(b) ? a : b);
      final List<DunningRun> data =
          rows.map(DunningCacheMapper.fromRow).toList()
            ..sort(_byMostRecentFirst);
      return CachedResult(data: data, isFromCache: true, cachedAt: cachedAt);
    }
  }

  int _byMostRecentFirst(DunningRun a, DunningRun b) {
    DateTime parse(DunningRun run) =>
        DateTime.tryParse(run.executedAt ?? run.scheduledAt) ??
        DateTime.fromMillisecondsSinceEpoch(0);
    return parse(b).compareTo(parse(a));
  }
}
