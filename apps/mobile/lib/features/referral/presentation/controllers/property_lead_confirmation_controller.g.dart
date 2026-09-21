// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'property_lead_confirmation_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(PropertyLeadConfirmationController)
final propertyLeadConfirmationControllerProvider =
    PropertyLeadConfirmationControllerFamily._();

final class PropertyLeadConfirmationControllerProvider
    extends
        $NotifierProvider<
          PropertyLeadConfirmationController,
          PropertyLeadConfirmationState
        > {
  PropertyLeadConfirmationControllerProvider._({
    required PropertyLeadConfirmationControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'propertyLeadConfirmationControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$propertyLeadConfirmationControllerHash();

  @override
  String toString() {
    return r'propertyLeadConfirmationControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  PropertyLeadConfirmationController create() =>
      PropertyLeadConfirmationController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PropertyLeadConfirmationState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PropertyLeadConfirmationState>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is PropertyLeadConfirmationControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$propertyLeadConfirmationControllerHash() =>
    r'aa49e334d3225cb22eb4a71117de18f94955ff26';

final class PropertyLeadConfirmationControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          PropertyLeadConfirmationController,
          PropertyLeadConfirmationState,
          PropertyLeadConfirmationState,
          PropertyLeadConfirmationState,
          String
        > {
  PropertyLeadConfirmationControllerFamily._()
    : super(
        retry: null,
        name: r'propertyLeadConfirmationControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  PropertyLeadConfirmationControllerProvider call(String propertyLeadId) =>
      PropertyLeadConfirmationControllerProvider._(
        argument: propertyLeadId,
        from: this,
      );

  @override
  String toString() => r'propertyLeadConfirmationControllerProvider';
}

abstract class _$PropertyLeadConfirmationController
    extends $Notifier<PropertyLeadConfirmationState> {
  late final _$args = ref.$arg as String;
  String get propertyLeadId => _$args;

  PropertyLeadConfirmationState build(String propertyLeadId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<
              PropertyLeadConfirmationState,
              PropertyLeadConfirmationState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                PropertyLeadConfirmationState,
                PropertyLeadConfirmationState
              >,
              PropertyLeadConfirmationState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
