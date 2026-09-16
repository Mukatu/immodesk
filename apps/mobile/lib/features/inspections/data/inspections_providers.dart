import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../../documents/data/documents_providers.dart';
import '../domain/repositories/inspections_repository.dart';
import 'datasources/inspections_remote_data_source.dart';
import 'repositories/inspections_repository_impl.dart';

part 'inspections_providers.g.dart';

@riverpod
InspectionsRemoteDataSource inspectionsRemoteDataSource(Ref ref) {
  return InspectionsRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
InspectionsRepository inspectionsRepository(Ref ref) {
  return InspectionsRepositoryImpl(
    ref.watch(inspectionsRemoteDataSourceProvider),
    ref.watch(documentsRepositoryProvider),
  );
}
