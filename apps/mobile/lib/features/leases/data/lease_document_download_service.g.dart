// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lease_document_download_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Client `Dio` nu dédié au téléchargement direct depuis une URL signée
/// (pas de base URL, pas d'intercepteur d'authentification).

@ProviderFor(downloadDio)
final downloadDioProvider = DownloadDioProvider._();

/// Client `Dio` nu dédié au téléchargement direct depuis une URL signée
/// (pas de base URL, pas d'intercepteur d'authentification).

final class DownloadDioProvider extends $FunctionalProvider<Dio, Dio, Dio>
    with $Provider<Dio> {
  /// Client `Dio` nu dédié au téléchargement direct depuis une URL signée
  /// (pas de base URL, pas d'intercepteur d'authentification).
  DownloadDioProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'downloadDioProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$downloadDioHash();

  @$internal
  @override
  $ProviderElement<Dio> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  Dio create(Ref ref) {
    return downloadDio(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Dio value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Dio>(value),
    );
  }
}

String _$downloadDioHash() => r'0d8874d02e666b680c6a42e36ced59e8be247f95';

@ProviderFor(leaseDocumentDownloadService)
final leaseDocumentDownloadServiceProvider =
    LeaseDocumentDownloadServiceProvider._();

final class LeaseDocumentDownloadServiceProvider
    extends
        $FunctionalProvider<
          LeaseDocumentDownloadService,
          LeaseDocumentDownloadService,
          LeaseDocumentDownloadService
        >
    with $Provider<LeaseDocumentDownloadService> {
  LeaseDocumentDownloadServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'leaseDocumentDownloadServiceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$leaseDocumentDownloadServiceHash();

  @$internal
  @override
  $ProviderElement<LeaseDocumentDownloadService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  LeaseDocumentDownloadService create(Ref ref) {
    return leaseDocumentDownloadService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LeaseDocumentDownloadService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LeaseDocumentDownloadService>(value),
    );
  }
}

String _$leaseDocumentDownloadServiceHash() =>
    r'db7b9b513fec483334333b91dfd80f0c1b3f046a';
