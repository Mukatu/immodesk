import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/db/app_database.dart';
import '../../../core/network/dio_provider.dart';
import '../domain/repositories/leases_repository.dart';
import 'datasources/leases_remote_data_source.dart';
import 'repositories/leases_repository_impl.dart';

part 'leases_providers.g.dart';

@riverpod
LeasesRemoteDataSource leasesRemoteDataSource(Ref ref) {
  return LeasesRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
LeasesRepository leasesRepository(Ref ref) {
  return LeasesRepositoryImpl(
    ref.watch(leasesRemoteDataSourceProvider),
    ref.watch(appDatabaseProvider),
  );
}
