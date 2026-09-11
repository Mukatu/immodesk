import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/db/app_database.dart';
import '../../../core/network/dio_provider.dart';
import '../domain/repositories/collection_repository.dart';
import 'datasources/collection_remote_data_source.dart';
import 'repositories/collection_repository_impl.dart';

part 'collection_providers.g.dart';

@riverpod
CollectionRemoteDataSource collectionRemoteDataSource(Ref ref) {
  return CollectionRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
CollectionRepository collectionRepository(Ref ref) {
  return CollectionRepositoryImpl(
    ref.watch(collectionRemoteDataSourceProvider),
    ref.watch(appDatabaseProvider),
  );
}
