// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'property_lead_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(PropertyLeadController)
final propertyLeadControllerProvider = PropertyLeadControllerProvider._();

final class PropertyLeadControllerProvider
    extends $NotifierProvider<PropertyLeadController, PropertyLeadFormState> {
  PropertyLeadControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'propertyLeadControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$propertyLeadControllerHash();

  @$internal
  @override
  PropertyLeadController create() => PropertyLeadController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PropertyLeadFormState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PropertyLeadFormState>(value),
    );
  }
}

String _$propertyLeadControllerHash() =>
    r'84e3d58b46e5ddb30737ab9f1cf1514bbb39983b';

abstract class _$PropertyLeadController
    extends $Notifier<PropertyLeadFormState> {
  PropertyLeadFormState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<PropertyLeadFormState, PropertyLeadFormState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<PropertyLeadFormState, PropertyLeadFormState>,
              PropertyLeadFormState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
