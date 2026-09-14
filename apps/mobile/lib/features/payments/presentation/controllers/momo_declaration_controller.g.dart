// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'momo_declaration_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(MomoDeclarationController)
final momoDeclarationControllerProvider = MomoDeclarationControllerFamily._();

final class MomoDeclarationControllerProvider
    extends
        $AsyncNotifierProvider<
          MomoDeclarationController,
          MomoDeclarationState
        > {
  MomoDeclarationControllerProvider._({
    required MomoDeclarationControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'momoDeclarationControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$momoDeclarationControllerHash();

  @override
  String toString() {
    return r'momoDeclarationControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  MomoDeclarationController create() => MomoDeclarationController();

  @override
  bool operator ==(Object other) {
    return other is MomoDeclarationControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$momoDeclarationControllerHash() =>
    r'798f5c036cdbbc9aaeef11fedf3584eda616418f';

final class MomoDeclarationControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          MomoDeclarationController,
          AsyncValue<MomoDeclarationState>,
          MomoDeclarationState,
          FutureOr<MomoDeclarationState>,
          String
        > {
  MomoDeclarationControllerFamily._()
    : super(
        retry: null,
        name: r'momoDeclarationControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  MomoDeclarationControllerProvider call(String invoiceId) =>
      MomoDeclarationControllerProvider._(argument: invoiceId, from: this);

  @override
  String toString() => r'momoDeclarationControllerProvider';
}

abstract class _$MomoDeclarationController
    extends $AsyncNotifier<MomoDeclarationState> {
  late final _$args = ref.$arg as String;
  String get invoiceId => _$args;

  FutureOr<MomoDeclarationState> build(String invoiceId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<MomoDeclarationState>, MomoDeclarationState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<MomoDeclarationState>,
                MomoDeclarationState
              >,
              AsyncValue<MomoDeclarationState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
