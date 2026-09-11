// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lease_detail_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Détail complet d'un bail (fiche bail), accessible depuis la liste des
/// baux ou depuis les fiches lot/locataire.

@ProviderFor(LeaseDetailController)
final leaseDetailControllerProvider = LeaseDetailControllerFamily._();

/// Détail complet d'un bail (fiche bail), accessible depuis la liste des
/// baux ou depuis les fiches lot/locataire.
final class LeaseDetailControllerProvider
    extends $AsyncNotifierProvider<LeaseDetailController, LeaseDetailState> {
  /// Détail complet d'un bail (fiche bail), accessible depuis la liste des
  /// baux ou depuis les fiches lot/locataire.
  LeaseDetailControllerProvider._({
    required LeaseDetailControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'leaseDetailControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$leaseDetailControllerHash();

  @override
  String toString() {
    return r'leaseDetailControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  LeaseDetailController create() => LeaseDetailController();

  @override
  bool operator ==(Object other) {
    return other is LeaseDetailControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$leaseDetailControllerHash() =>
    r'd86b8432a48f8d60029480731cd00561baf85051';

/// Détail complet d'un bail (fiche bail), accessible depuis la liste des
/// baux ou depuis les fiches lot/locataire.

final class LeaseDetailControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          LeaseDetailController,
          AsyncValue<LeaseDetailState>,
          LeaseDetailState,
          FutureOr<LeaseDetailState>,
          String
        > {
  LeaseDetailControllerFamily._()
    : super(
        retry: null,
        name: r'leaseDetailControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Détail complet d'un bail (fiche bail), accessible depuis la liste des
  /// baux ou depuis les fiches lot/locataire.

  LeaseDetailControllerProvider call(String leaseId) =>
      LeaseDetailControllerProvider._(argument: leaseId, from: this);

  @override
  String toString() => r'leaseDetailControllerProvider';
}

/// Détail complet d'un bail (fiche bail), accessible depuis la liste des
/// baux ou depuis les fiches lot/locataire.

abstract class _$LeaseDetailController
    extends $AsyncNotifier<LeaseDetailState> {
  late final _$args = ref.$arg as String;
  String get leaseId => _$args;

  FutureOr<LeaseDetailState> build(String leaseId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<LeaseDetailState>, LeaseDetailState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<LeaseDetailState>, LeaseDetailState>,
              AsyncValue<LeaseDetailState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
