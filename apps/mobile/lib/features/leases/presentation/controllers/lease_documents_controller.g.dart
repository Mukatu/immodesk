// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lease_documents_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Liste des versions de documents attachés à un bail (contrat généré,
/// contrat signé...), pour la fiche bail.

@ProviderFor(LeaseDocumentsController)
final leaseDocumentsControllerProvider = LeaseDocumentsControllerFamily._();

/// Liste des versions de documents attachés à un bail (contrat généré,
/// contrat signé...), pour la fiche bail.
final class LeaseDocumentsControllerProvider
    extends
        $AsyncNotifierProvider<LeaseDocumentsController, LeaseDocumentsState> {
  /// Liste des versions de documents attachés à un bail (contrat généré,
  /// contrat signé...), pour la fiche bail.
  LeaseDocumentsControllerProvider._({
    required LeaseDocumentsControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'leaseDocumentsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$leaseDocumentsControllerHash();

  @override
  String toString() {
    return r'leaseDocumentsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  LeaseDocumentsController create() => LeaseDocumentsController();

  @override
  bool operator ==(Object other) {
    return other is LeaseDocumentsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$leaseDocumentsControllerHash() =>
    r'80fdb56d863017fbb83340a43836f364457056f5';

/// Liste des versions de documents attachés à un bail (contrat généré,
/// contrat signé...), pour la fiche bail.

final class LeaseDocumentsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          LeaseDocumentsController,
          AsyncValue<LeaseDocumentsState>,
          LeaseDocumentsState,
          FutureOr<LeaseDocumentsState>,
          String
        > {
  LeaseDocumentsControllerFamily._()
    : super(
        retry: null,
        name: r'leaseDocumentsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Liste des versions de documents attachés à un bail (contrat généré,
  /// contrat signé...), pour la fiche bail.

  LeaseDocumentsControllerProvider call(String leaseId) =>
      LeaseDocumentsControllerProvider._(argument: leaseId, from: this);

  @override
  String toString() => r'leaseDocumentsControllerProvider';
}

/// Liste des versions de documents attachés à un bail (contrat généré,
/// contrat signé...), pour la fiche bail.

abstract class _$LeaseDocumentsController
    extends $AsyncNotifier<LeaseDocumentsState> {
  late final _$args = ref.$arg as String;
  String get leaseId => _$args;

  FutureOr<LeaseDocumentsState> build(String leaseId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<LeaseDocumentsState>, LeaseDocumentsState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<LeaseDocumentsState>, LeaseDocumentsState>,
              AsyncValue<LeaseDocumentsState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
