// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'documents_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(documentsRemoteDataSource)
final documentsRemoteDataSourceProvider = DocumentsRemoteDataSourceProvider._();

final class DocumentsRemoteDataSourceProvider
    extends
        $FunctionalProvider<
          DocumentsRemoteDataSource,
          DocumentsRemoteDataSource,
          DocumentsRemoteDataSource
        >
    with $Provider<DocumentsRemoteDataSource> {
  DocumentsRemoteDataSourceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'documentsRemoteDataSourceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$documentsRemoteDataSourceHash();

  @$internal
  @override
  $ProviderElement<DocumentsRemoteDataSource> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DocumentsRemoteDataSource create(Ref ref) {
    return documentsRemoteDataSource(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DocumentsRemoteDataSource value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DocumentsRemoteDataSource>(value),
    );
  }
}

String _$documentsRemoteDataSourceHash() =>
    r'5786bd362deceaadd8d8769b264f614d88e3d3cc';

@ProviderFor(documentsRepository)
final documentsRepositoryProvider = DocumentsRepositoryProvider._();

final class DocumentsRepositoryProvider
    extends
        $FunctionalProvider<
          DocumentsRepository,
          DocumentsRepository,
          DocumentsRepository
        >
    with $Provider<DocumentsRepository> {
  DocumentsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'documentsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$documentsRepositoryHash();

  @$internal
  @override
  $ProviderElement<DocumentsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  DocumentsRepository create(Ref ref) {
    return documentsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DocumentsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DocumentsRepository>(value),
    );
  }
}

String _$documentsRepositoryHash() =>
    r'f8549c5727643549277de44d8ff9b3a51f199d4e';
