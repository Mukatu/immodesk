// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'unit_active_lease_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, affiché dans
/// la fiche du lot (`UnitDetailScreen`).

@ProviderFor(UnitActiveLeaseController)
final unitActiveLeaseControllerProvider = UnitActiveLeaseControllerFamily._();

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, affiché dans
/// la fiche du lot (`UnitDetailScreen`).
final class UnitActiveLeaseControllerProvider
    extends
        $AsyncNotifierProvider<
          UnitActiveLeaseController,
          UnitActiveLeaseState
        > {
  /// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, affiché dans
  /// la fiche du lot (`UnitDetailScreen`).
  UnitActiveLeaseControllerProvider._({
    required UnitActiveLeaseControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'unitActiveLeaseControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$unitActiveLeaseControllerHash();

  @override
  String toString() {
    return r'unitActiveLeaseControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  UnitActiveLeaseController create() => UnitActiveLeaseController();

  @override
  bool operator ==(Object other) {
    return other is UnitActiveLeaseControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$unitActiveLeaseControllerHash() =>
    r'6ba544c42c5acb2d3ef32664bfd31f098fee082b';

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, affiché dans
/// la fiche du lot (`UnitDetailScreen`).

final class UnitActiveLeaseControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          UnitActiveLeaseController,
          AsyncValue<UnitActiveLeaseState>,
          UnitActiveLeaseState,
          FutureOr<UnitActiveLeaseState>,
          String
        > {
  UnitActiveLeaseControllerFamily._()
    : super(
        retry: null,
        name: r'unitActiveLeaseControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, affiché dans
  /// la fiche du lot (`UnitDetailScreen`).

  UnitActiveLeaseControllerProvider call(String unitId) =>
      UnitActiveLeaseControllerProvider._(argument: unitId, from: this);

  @override
  String toString() => r'unitActiveLeaseControllerProvider';
}

/// Bail actif (`ACTIVE` ou `NOTICE_GIVEN`) rattaché à un lot, affiché dans
/// la fiche du lot (`UnitDetailScreen`).

abstract class _$UnitActiveLeaseController
    extends $AsyncNotifier<UnitActiveLeaseState> {
  late final _$args = ref.$arg as String;
  String get unitId => _$args;

  FutureOr<UnitActiveLeaseState> build(String unitId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<UnitActiveLeaseState>, UnitActiveLeaseState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<UnitActiveLeaseState>,
                UnitActiveLeaseState
              >,
              AsyncValue<UnitActiveLeaseState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
