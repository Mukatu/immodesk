// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'remittance_list_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Suivi des remises du démarcheur : statut et écart constaté par
/// l'agence (`varianceAmount`, renseigné après vérification).

@ProviderFor(RemittanceListController)
final remittanceListControllerProvider = RemittanceListControllerProvider._();

/// Suivi des remises du démarcheur : statut et écart constaté par
/// l'agence (`varianceAmount`, renseigné après vérification).
final class RemittanceListControllerProvider
    extends
        $AsyncNotifierProvider<RemittanceListController, RemittanceListState> {
  /// Suivi des remises du démarcheur : statut et écart constaté par
  /// l'agence (`varianceAmount`, renseigné après vérification).
  RemittanceListControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'remittanceListControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$remittanceListControllerHash();

  @$internal
  @override
  RemittanceListController create() => RemittanceListController();
}

String _$remittanceListControllerHash() =>
    r'a7811dbe9ff8f5b785eab0bdd9811b525ac36f6e';

/// Suivi des remises du démarcheur : statut et écart constaté par
/// l'agence (`varianceAmount`, renseigné après vérification).

abstract class _$RemittanceListController
    extends $AsyncNotifier<RemittanceListState> {
  FutureOr<RemittanceListState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<RemittanceListState>, RemittanceListState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<RemittanceListState>, RemittanceListState>,
              AsyncValue<RemittanceListState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
