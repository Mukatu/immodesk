import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/cash_repository.dart';
import 'datasources/cash_remote_data_source.dart';
import 'repositories/cash_repository_impl.dart';

part 'cash_providers.g.dart';

@riverpod
CashRemoteDataSource cashRemoteDataSource(Ref ref) {
  return CashRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
CashRepository cashRepository(Ref ref) {
  return CashRepositoryImpl(ref.watch(cashRemoteDataSourceProvider));
}
