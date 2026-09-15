import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/landlord_portal_repository.dart';
import 'datasources/landlord_portal_remote_data_source.dart';
import 'repositories/landlord_portal_repository_impl.dart';

part 'landlord_portal_providers.g.dart';

@riverpod
LandlordPortalRemoteDataSource landlordPortalRemoteDataSource(Ref ref) {
  return LandlordPortalRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
LandlordPortalRepository landlordPortalRepository(Ref ref) {
  return LandlordPortalRepositoryImpl(
    ref.watch(landlordPortalRemoteDataSourceProvider),
  );
}
