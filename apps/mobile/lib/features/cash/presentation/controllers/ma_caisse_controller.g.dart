// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ma_caisse_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// « Ma caisse » : encours détenu par le démarcheur courant (calculé côté
/// serveur, `GET /cash/collectors/{userId}/balance`) et liste de ses reçus
/// non remis, triés du plus ancien au plus récent.

@ProviderFor(MaCaisseController)
final maCaisseControllerProvider = MaCaisseControllerProvider._();

/// « Ma caisse » : encours détenu par le démarcheur courant (calculé côté
/// serveur, `GET /cash/collectors/{userId}/balance`) et liste de ses reçus
/// non remis, triés du plus ancien au plus récent.
final class MaCaisseControllerProvider
    extends $AsyncNotifierProvider<MaCaisseController, MaCaisseState> {
  /// « Ma caisse » : encours détenu par le démarcheur courant (calculé côté
  /// serveur, `GET /cash/collectors/{userId}/balance`) et liste de ses reçus
  /// non remis, triés du plus ancien au plus récent.
  MaCaisseControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'maCaisseControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$maCaisseControllerHash();

  @$internal
  @override
  MaCaisseController create() => MaCaisseController();
}

String _$maCaisseControllerHash() =>
    r'959087cf249088a7642da30cf63be2c7a0076997';

/// « Ma caisse » : encours détenu par le démarcheur courant (calculé côté
/// serveur, `GET /cash/collectors/{userId}/balance`) et liste de ses reçus
/// non remis, triés du plus ancien au plus récent.

abstract class _$MaCaisseController extends $AsyncNotifier<MaCaisseState> {
  FutureOr<MaCaisseState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<MaCaisseState>, MaCaisseState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<MaCaisseState>, MaCaisseState>,
              AsyncValue<MaCaisseState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
