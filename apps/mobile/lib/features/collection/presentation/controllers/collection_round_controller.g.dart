// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'collection_round_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Tournée du démarcheur : factures dues des lots qui lui sont affectés,
/// regroupées par immeuble. Toujours en ligne en phase 3 (voir
/// `CollectionRepositoryImpl` ; le cache local ne sert qu'à la lecture
/// hors ligne, jamais à l'encaissement).

@ProviderFor(CollectionRoundController)
final collectionRoundControllerProvider = CollectionRoundControllerProvider._();

/// Tournée du démarcheur : factures dues des lots qui lui sont affectés,
/// regroupées par immeuble. Toujours en ligne en phase 3 (voir
/// `CollectionRepositoryImpl` ; le cache local ne sert qu'à la lecture
/// hors ligne, jamais à l'encaissement).
final class CollectionRoundControllerProvider
    extends
        $AsyncNotifierProvider<
          CollectionRoundController,
          CollectionRoundState
        > {
  /// Tournée du démarcheur : factures dues des lots qui lui sont affectés,
  /// regroupées par immeuble. Toujours en ligne en phase 3 (voir
  /// `CollectionRepositoryImpl` ; le cache local ne sert qu'à la lecture
  /// hors ligne, jamais à l'encaissement).
  CollectionRoundControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'collectionRoundControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$collectionRoundControllerHash();

  @$internal
  @override
  CollectionRoundController create() => CollectionRoundController();
}

String _$collectionRoundControllerHash() =>
    r'b41029b3e4171907338821b5e401970a20eec906';

/// Tournée du démarcheur : factures dues des lots qui lui sont affectés,
/// regroupées par immeuble. Toujours en ligne en phase 3 (voir
/// `CollectionRepositoryImpl` ; le cache local ne sert qu'à la lecture
/// hors ligne, jamais à l'encaissement).

abstract class _$CollectionRoundController
    extends $AsyncNotifier<CollectionRoundState> {
  FutureOr<CollectionRoundState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<CollectionRoundState>, CollectionRoundState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<CollectionRoundState>,
                CollectionRoundState
              >,
              AsyncValue<CollectionRoundState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
