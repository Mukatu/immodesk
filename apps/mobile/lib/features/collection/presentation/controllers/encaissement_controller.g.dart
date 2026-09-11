// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'encaissement_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Un contrôleur par facture d'origine (`invoiceId` = facture depuis
/// laquelle l'écran a été ouvert, dans « Ma tournée »).

@ProviderFor(EncaissementController)
final encaissementControllerProvider = EncaissementControllerFamily._();

/// Un contrôleur par facture d'origine (`invoiceId` = facture depuis
/// laquelle l'écran a été ouvert, dans « Ma tournée »).
final class EncaissementControllerProvider
    extends $AsyncNotifierProvider<EncaissementController, EncaissementState> {
  /// Un contrôleur par facture d'origine (`invoiceId` = facture depuis
  /// laquelle l'écran a été ouvert, dans « Ma tournée »).
  EncaissementControllerProvider._({
    required EncaissementControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'encaissementControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$encaissementControllerHash();

  @override
  String toString() {
    return r'encaissementControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EncaissementController create() => EncaissementController();

  @override
  bool operator ==(Object other) {
    return other is EncaissementControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$encaissementControllerHash() =>
    r'5c2724437f727d0b2c89269196a96666a27a2ea4';

/// Un contrôleur par facture d'origine (`invoiceId` = facture depuis
/// laquelle l'écran a été ouvert, dans « Ma tournée »).

final class EncaissementControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EncaissementController,
          AsyncValue<EncaissementState>,
          EncaissementState,
          FutureOr<EncaissementState>,
          String
        > {
  EncaissementControllerFamily._()
    : super(
        retry: null,
        name: r'encaissementControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Un contrôleur par facture d'origine (`invoiceId` = facture depuis
  /// laquelle l'écran a été ouvert, dans « Ma tournée »).

  EncaissementControllerProvider call(String invoiceId) =>
      EncaissementControllerProvider._(argument: invoiceId, from: this);

  @override
  String toString() => r'encaissementControllerProvider';
}

/// Un contrôleur par facture d'origine (`invoiceId` = facture depuis
/// laquelle l'écran a été ouvert, dans « Ma tournée »).

abstract class _$EncaissementController
    extends $AsyncNotifier<EncaissementState> {
  late final _$args = ref.$arg as String;
  String get invoiceId => _$args;

  FutureOr<EncaissementState> build(String invoiceId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<EncaissementState>, EncaissementState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<EncaissementState>, EncaissementState>,
              AsyncValue<EncaissementState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
