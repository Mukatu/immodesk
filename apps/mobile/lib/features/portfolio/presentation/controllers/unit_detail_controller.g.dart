// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'unit_detail_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Détail d'un lot (caractéristiques, loyer de référence, photos), avec
/// repli hors ligne si ce lot a déjà été consulté en ligne.

@ProviderFor(UnitDetailController)
final unitDetailControllerProvider = UnitDetailControllerFamily._();

/// Détail d'un lot (caractéristiques, loyer de référence, photos), avec
/// repli hors ligne si ce lot a déjà été consulté en ligne.
final class UnitDetailControllerProvider
    extends $AsyncNotifierProvider<UnitDetailController, UnitDetailState> {
  /// Détail d'un lot (caractéristiques, loyer de référence, photos), avec
  /// repli hors ligne si ce lot a déjà été consulté en ligne.
  UnitDetailControllerProvider._({
    required UnitDetailControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'unitDetailControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$unitDetailControllerHash();

  @override
  String toString() {
    return r'unitDetailControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  UnitDetailController create() => UnitDetailController();

  @override
  bool operator ==(Object other) {
    return other is UnitDetailControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$unitDetailControllerHash() =>
    r'11825cc360d8165c9e86a3217c6d5198d6702d39';

/// Détail d'un lot (caractéristiques, loyer de référence, photos), avec
/// repli hors ligne si ce lot a déjà été consulté en ligne.

final class UnitDetailControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          UnitDetailController,
          AsyncValue<UnitDetailState>,
          UnitDetailState,
          FutureOr<UnitDetailState>,
          String
        > {
  UnitDetailControllerFamily._()
    : super(
        retry: null,
        name: r'unitDetailControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Détail d'un lot (caractéristiques, loyer de référence, photos), avec
  /// repli hors ligne si ce lot a déjà été consulté en ligne.

  UnitDetailControllerProvider call(String unitId) =>
      UnitDetailControllerProvider._(argument: unitId, from: this);

  @override
  String toString() => r'unitDetailControllerProvider';
}

/// Détail d'un lot (caractéristiques, loyer de référence, photos), avec
/// repli hors ligne si ce lot a déjà été consulté en ligne.

abstract class _$UnitDetailController extends $AsyncNotifier<UnitDetailState> {
  late final _$args = ref.$arg as String;
  String get unitId => _$args;

  FutureOr<UnitDetailState> build(String unitId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<UnitDetailState>, UnitDetailState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<UnitDetailState>, UnitDetailState>,
              AsyncValue<UnitDetailState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
