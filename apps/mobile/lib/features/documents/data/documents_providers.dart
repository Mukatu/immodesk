import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../core/network/dio_provider.dart';
import '../domain/repositories/documents_repository.dart';
import 'datasources/documents_remote_data_source.dart';
import 'repositories/documents_repository_impl.dart';

part 'documents_providers.g.dart';

@riverpod
DocumentsRemoteDataSource documentsRemoteDataSource(Ref ref) {
  return DocumentsRemoteDataSource(ref.watch(dioProvider));
}

@riverpod
DocumentsRepository documentsRepository(Ref ref) {
  return DocumentsRepositoryImpl(ref.watch(documentsRemoteDataSourceProvider));
}
