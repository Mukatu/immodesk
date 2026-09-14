// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_method_choice_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Un contrôleur par facture (`invoiceId`), comme `EncaissementController`.

@ProviderFor(PaymentMethodChoiceController)
final paymentMethodChoiceControllerProvider =
    PaymentMethodChoiceControllerFamily._();

/// Un contrôleur par facture (`invoiceId`), comme `EncaissementController`.
final class PaymentMethodChoiceControllerProvider
    extends
        $AsyncNotifierProvider<
          PaymentMethodChoiceController,
          PaymentMethodChoiceState
        > {
  /// Un contrôleur par facture (`invoiceId`), comme `EncaissementController`.
  PaymentMethodChoiceControllerProvider._({
    required PaymentMethodChoiceControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'paymentMethodChoiceControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$paymentMethodChoiceControllerHash();

  @override
  String toString() {
    return r'paymentMethodChoiceControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  PaymentMethodChoiceController create() => PaymentMethodChoiceController();

  @override
  bool operator ==(Object other) {
    return other is PaymentMethodChoiceControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$paymentMethodChoiceControllerHash() =>
    r'ace9e251e8a97fd0cbe3bd74c40e6d4375611f60';

/// Un contrôleur par facture (`invoiceId`), comme `EncaissementController`.

final class PaymentMethodChoiceControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          PaymentMethodChoiceController,
          AsyncValue<PaymentMethodChoiceState>,
          PaymentMethodChoiceState,
          FutureOr<PaymentMethodChoiceState>,
          String
        > {
  PaymentMethodChoiceControllerFamily._()
    : super(
        retry: null,
        name: r'paymentMethodChoiceControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Un contrôleur par facture (`invoiceId`), comme `EncaissementController`.

  PaymentMethodChoiceControllerProvider call(String invoiceId) =>
      PaymentMethodChoiceControllerProvider._(argument: invoiceId, from: this);

  @override
  String toString() => r'paymentMethodChoiceControllerProvider';
}

/// Un contrôleur par facture (`invoiceId`), comme `EncaissementController`.

abstract class _$PaymentMethodChoiceController
    extends $AsyncNotifier<PaymentMethodChoiceState> {
  late final _$args = ref.$arg as String;
  String get invoiceId => _$args;

  FutureOr<PaymentMethodChoiceState> build(String invoiceId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<PaymentMethodChoiceState>,
              PaymentMethodChoiceState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<PaymentMethodChoiceState>,
                PaymentMethodChoiceState
              >,
              AsyncValue<PaymentMethodChoiceState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
