import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/db/app_database.dart';
import '../../../core/network/dio_provider.dart';
import '../domain/repositories/dunning_repository.dart';
import 'datasources/dunning_remote_data_source.dart';
import 'repositories/dunning_repository_impl.dart';

part 'dunning_providers.g.dart';

@riverpod
DunningRemoteDataSource dunningRemoteDataSource(Ref ref) {
  return DunningRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
DunningRepository dunningRepository(Ref ref) {
  return DunningRepositoryImpl(
    ref.watch(dunningRemoteDataSourceProvider),
    ref.watch(appDatabaseProvider),
  );
}
