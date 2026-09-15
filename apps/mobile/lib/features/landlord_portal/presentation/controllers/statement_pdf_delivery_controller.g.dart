// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'statement_pdf_delivery_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Téléchargement puis partage du PDF d'un relevé de gérance
/// (`GET /v1/portal/statements/{id}/pdf`), un contrôleur par relevé.
/// Réutilise le client `downloadDioProvider` déjà injectable en test (voir
/// `LeaseDocumentDownloadService`), sans dépendre du module `documents`
/// (le portail bailleur n'y a pas accès).

@ProviderFor(StatementPdfDeliveryController)
final statementPdfDeliveryControllerProvider =
    StatementPdfDeliveryControllerFamily._();

/// Téléchargement puis partage du PDF d'un relevé de gérance
/// (`GET /v1/portal/statements/{id}/pdf`), un contrôleur par relevé.
/// Réutilise le client `downloadDioProvider` déjà injectable en test (voir
/// `LeaseDocumentDownloadService`), sans dépendre du module `documents`
/// (le portail bailleur n'y a pas accès).
final class StatementPdfDeliveryControllerProvider
    extends
        $NotifierProvider<StatementPdfDeliveryController, StatementPdfState> {
  /// Téléchargement puis partage du PDF d'un relevé de gérance
  /// (`GET /v1/portal/statements/{id}/pdf`), un contrôleur par relevé.
  /// Réutilise le client `downloadDioProvider` déjà injectable en test (voir
  /// `LeaseDocumentDownloadService`), sans dépendre du module `documents`
  /// (le portail bailleur n'y a pas accès).
  StatementPdfDeliveryControllerProvider._({
    required StatementPdfDeliveryControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'statementPdfDeliveryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$statementPdfDeliveryControllerHash();

  @override
  String toString() {
    return r'statementPdfDeliveryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  StatementPdfDeliveryController create() => StatementPdfDeliveryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(StatementPdfState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<StatementPdfState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is StatementPdfDeliveryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$statementPdfDeliveryControllerHash() =>
    r'258c44b8308b4b9346906b594d1fed2c278426c5';

/// Téléchargement puis partage du PDF d'un relevé de gérance
/// (`GET /v1/portal/statements/{id}/pdf`), un contrôleur par relevé.
/// Réutilise le client `downloadDioProvider` déjà injectable en test (voir
/// `LeaseDocumentDownloadService`), sans dépendre du module `documents`
/// (le portail bailleur n'y a pas accès).

final class StatementPdfDeliveryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          StatementPdfDeliveryController,
          StatementPdfState,
          StatementPdfState,
          StatementPdfState,
          String
        > {
  StatementPdfDeliveryControllerFamily._()
    : super(
        retry: null,
        name: r'statementPdfDeliveryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Téléchargement puis partage du PDF d'un relevé de gérance
  /// (`GET /v1/portal/statements/{id}/pdf`), un contrôleur par relevé.
  /// Réutilise le client `downloadDioProvider` déjà injectable en test (voir
  /// `LeaseDocumentDownloadService`), sans dépendre du module `documents`
  /// (le portail bailleur n'y a pas accès).

  StatementPdfDeliveryControllerProvider call(String statementId) =>
      StatementPdfDeliveryControllerProvider._(
        argument: statementId,
        from: this,
      );

  @override
  String toString() => r'statementPdfDeliveryControllerProvider';
}

/// Téléchargement puis partage du PDF d'un relevé de gérance
/// (`GET /v1/portal/statements/{id}/pdf`), un contrôleur par relevé.
/// Réutilise le client `downloadDioProvider` déjà injectable en test (voir
/// `LeaseDocumentDownloadService`), sans dépendre du module `documents`
/// (le portail bailleur n'y a pas accès).

abstract class _$StatementPdfDeliveryController
    extends $Notifier<StatementPdfState> {
  late final _$args = ref.$arg as String;
  String get statementId => _$args;

  StatementPdfState build(String statementId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<StatementPdfState, StatementPdfState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<StatementPdfState, StatementPdfState>,
              StatementPdfState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
