// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mandate_detail_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(MandateDetailController)
final mandateDetailControllerProvider = MandateDetailControllerFamily._();

final class MandateDetailControllerProvider
    extends $AsyncNotifierProvider<MandateDetailController, MandateDetail> {
  MandateDetailControllerProvider._({
    required MandateDetailControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'mandateDetailControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$mandateDetailControllerHash();

  @override
  String toString() {
    return r'mandateDetailControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  MandateDetailController create() => MandateDetailController();

  @override
  bool operator ==(Object other) {
    return other is MandateDetailControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$mandateDetailControllerHash() =>
    r'a01e174208277ad847ed40791d9445011b6606a2';

final class MandateDetailControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          MandateDetailController,
          AsyncValue<MandateDetail>,
          MandateDetail,
          FutureOr<MandateDetail>,
          String
        > {
  MandateDetailControllerFamily._()
    : super(
        retry: null,
        name: r'mandateDetailControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  MandateDetailControllerProvider call(String mandateId) =>
      MandateDetailControllerProvider._(argument: mandateId, from: this);

  @override
  String toString() => r'mandateDetailControllerProvider';
}

abstract class _$MandateDetailController extends $AsyncNotifier<MandateDetail> {
  late final _$args = ref.$arg as String;
  String get mandateId => _$args;

  FutureOr<MandateDetail> build(String mandateId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<MandateDetail>, MandateDetail>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<MandateDetail>, MandateDetail>,
              AsyncValue<MandateDetail>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
