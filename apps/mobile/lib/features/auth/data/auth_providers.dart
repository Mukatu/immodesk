import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/auth_repository.dart';
import 'datasources/auth_remote_data_source.dart';
import 'repositories/auth_repository_impl.dart';

part 'auth_providers.g.dart';

@riverpod
AuthRemoteDataSource authRemoteDataSource(Ref ref) {
  return AuthRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
AuthRepository authRepository(Ref ref) {
  return AuthRepositoryImpl(
    ref.watch(authRemoteDataSourceProvider),
    ref.watch(authTokenStoreProvider),
  );
}
