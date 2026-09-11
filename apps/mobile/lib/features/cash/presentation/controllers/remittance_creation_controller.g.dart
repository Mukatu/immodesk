// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'remittance_creation_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(RemittanceCreationController)
final remittanceCreationControllerProvider =
    RemittanceCreationControllerProvider._();

final class RemittanceCreationControllerProvider
    extends
        $AsyncNotifierProvider<
          RemittanceCreationController,
          RemittanceCreationState
        > {
  RemittanceCreationControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'remittanceCreationControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$remittanceCreationControllerHash();

  @$internal
  @override
  RemittanceCreationController create() => RemittanceCreationController();
}

String _$remittanceCreationControllerHash() =>
    r'812fd7cbb24237762ef9983a8cd0da9bfd2fe694';

abstract class _$RemittanceCreationController
    extends $AsyncNotifier<RemittanceCreationState> {
  FutureOr<RemittanceCreationState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<RemittanceCreationState>,
              RemittanceCreationState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<RemittanceCreationState>,
                RemittanceCreationState
              >,
              AsyncValue<RemittanceCreationState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
