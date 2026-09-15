import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/mandates_repository.dart';
import 'datasources/mandates_remote_data_source.dart';
import 'repositories/mandates_repository_impl.dart';

part 'mandates_providers.g.dart';

@riverpod
MandatesRemoteDataSource mandatesRemoteDataSource(Ref ref) {
  return MandatesRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
MandatesRepository mandatesRepository(Ref ref) {
  return MandatesRepositoryImpl(ref.watch(mandatesRemoteDataSourceProvider));
}
