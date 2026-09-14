// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'bank_transfer_declaration_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(BankTransferDeclarationController)
final bankTransferDeclarationControllerProvider =
    BankTransferDeclarationControllerFamily._();

final class BankTransferDeclarationControllerProvider
    extends
        $AsyncNotifierProvider<
          BankTransferDeclarationController,
          BankTransferDeclarationState
        > {
  BankTransferDeclarationControllerProvider._({
    required BankTransferDeclarationControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'bankTransferDeclarationControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$bankTransferDeclarationControllerHash();

  @override
  String toString() {
    return r'bankTransferDeclarationControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  BankTransferDeclarationController create() =>
      BankTransferDeclarationController();

  @override
  bool operator ==(Object other) {
    return other is BankTransferDeclarationControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$bankTransferDeclarationControllerHash() =>
    r'dcb5b8f58f04dc50a2feb496a24f07fa761ae8ea';

final class BankTransferDeclarationControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          BankTransferDeclarationController,
          AsyncValue<BankTransferDeclarationState>,
          BankTransferDeclarationState,
          FutureOr<BankTransferDeclarationState>,
          String
        > {
  BankTransferDeclarationControllerFamily._()
    : super(
        retry: null,
        name: r'bankTransferDeclarationControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  BankTransferDeclarationControllerProvider call(String invoiceId) =>
      BankTransferDeclarationControllerProvider._(
        argument: invoiceId,
        from: this,
      );

  @override
  String toString() => r'bankTransferDeclarationControllerProvider';
}

abstract class _$BankTransferDeclarationController
    extends $AsyncNotifier<BankTransferDeclarationState> {
  late final _$args = ref.$arg as String;
  String get invoiceId => _$args;

  FutureOr<BankTransferDeclarationState> build(String invoiceId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<BankTransferDeclarationState>,
              BankTransferDeclarationState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<BankTransferDeclarationState>,
                BankTransferDeclarationState
              >,
              AsyncValue<BankTransferDeclarationState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
