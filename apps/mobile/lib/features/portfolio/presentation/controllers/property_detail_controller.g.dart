// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'property_detail_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Détail d'un immeuble (lots + statuts), avec repli hors ligne.

@ProviderFor(PropertyDetailController)
final propertyDetailControllerProvider = PropertyDetailControllerFamily._();

/// Détail d'un immeuble (lots + statuts), avec repli hors ligne.
final class PropertyDetailControllerProvider
    extends
        $AsyncNotifierProvider<PropertyDetailController, PropertyDetailState> {
  /// Détail d'un immeuble (lots + statuts), avec repli hors ligne.
  PropertyDetailControllerProvider._({
    required PropertyDetailControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'propertyDetailControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$propertyDetailControllerHash();

  @override
  String toString() {
    return r'propertyDetailControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  PropertyDetailController create() => PropertyDetailController();

  @override
  bool operator ==(Object other) {
    return other is PropertyDetailControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$propertyDetailControllerHash() =>
    r'cdca1e2892dd2e68fa8cb112af726c7379e1158d';

/// Détail d'un immeuble (lots + statuts), avec repli hors ligne.

final class PropertyDetailControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          PropertyDetailController,
          AsyncValue<PropertyDetailState>,
          PropertyDetailState,
          FutureOr<PropertyDetailState>,
          String
        > {
  PropertyDetailControllerFamily._()
    : super(
        retry: null,
        name: r'propertyDetailControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Détail d'un immeuble (lots + statuts), avec repli hors ligne.

  PropertyDetailControllerProvider call(String propertyId) =>
      PropertyDetailControllerProvider._(argument: propertyId, from: this);

  @override
  String toString() => r'propertyDetailControllerProvider';
}

/// Détail d'un immeuble (lots + statuts), avec repli hors ligne.

abstract class _$PropertyDetailController
    extends $AsyncNotifier<PropertyDetailState> {
  late final _$args = ref.$arg as String;
  String get propertyId => _$args;

  FutureOr<PropertyDetailState> build(String propertyId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<PropertyDetailState>, PropertyDetailState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<PropertyDetailState>, PropertyDetailState>,
              AsyncValue<PropertyDetailState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
