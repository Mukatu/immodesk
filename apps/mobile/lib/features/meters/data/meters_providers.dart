import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/meters_repository.dart';
import 'datasources/meters_remote_data_source.dart';
import 'repositories/meters_repository_impl.dart';

part 'meters_providers.g.dart';

@riverpod
MetersRemoteDataSource metersRemoteDataSource(Ref ref) {
  return MetersRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
MetersRepository metersRepository(Ref ref) {
  return MetersRepositoryImpl(ref.watch(metersRemoteDataSourceProvider));
}
