import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/organizations_repository.dart';
import 'datasources/organizations_remote_data_source.dart';
import 'repositories/organizations_repository_impl.dart';

part 'organizations_providers.g.dart';

@riverpod
OrganizationsRemoteDataSource organizationsRemoteDataSource(Ref ref) {
  return OrganizationsRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
OrganizationsRepository organizationsRepository(Ref ref) {
  return OrganizationsRepositoryImpl(
    ref.watch(organizationsRemoteDataSourceProvider),
  );
}
