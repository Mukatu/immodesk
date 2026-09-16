import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/maintenance_repository.dart';
import 'datasources/maintenance_remote_data_source.dart';
import 'repositories/maintenance_repository_impl.dart';

part 'maintenance_providers.g.dart';

@riverpod
MaintenanceRemoteDataSource maintenanceRemoteDataSource(Ref ref) {
  return MaintenanceRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
MaintenanceRepository maintenanceRepository(Ref ref) {
  return MaintenanceRepositoryImpl(
    ref.watch(maintenanceRemoteDataSourceProvider),
  );
}
