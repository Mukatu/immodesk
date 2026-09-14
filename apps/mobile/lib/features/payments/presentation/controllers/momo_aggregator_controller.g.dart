// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'momo_aggregator_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Mobile Money par agrégateur : numéro payeur avec opérateur détecté,
/// devis avant validation, attente avec interrogation périodique du statut,
/// résultat succès/échec/expiration (nouvelle tentative = nouveau
/// `clientRef`).

@ProviderFor(MomoAggregatorController)
final momoAggregatorControllerProvider = MomoAggregatorControllerFamily._();

/// Mobile Money par agrégateur : numéro payeur avec opérateur détecté,
/// devis avant validation, attente avec interrogation périodique du statut,
/// résultat succès/échec/expiration (nouvelle tentative = nouveau
/// `clientRef`).
final class MomoAggregatorControllerProvider
    extends
        $AsyncNotifierProvider<MomoAggregatorController, MomoAggregatorState> {
  /// Mobile Money par agrégateur : numéro payeur avec opérateur détecté,
  /// devis avant validation, attente avec interrogation périodique du statut,
  /// résultat succès/échec/expiration (nouvelle tentative = nouveau
  /// `clientRef`).
  MomoAggregatorControllerProvider._({
    required MomoAggregatorControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'momoAggregatorControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$momoAggregatorControllerHash();

  @override
  String toString() {
    return r'momoAggregatorControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  MomoAggregatorController create() => MomoAggregatorController();

  @override
  bool operator ==(Object other) {
    return other is MomoAggregatorControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$momoAggregatorControllerHash() =>
    r'b646afd7025ae2464d4318789bbf375e0230f87b';

/// Mobile Money par agrégateur : numéro payeur avec opérateur détecté,
/// devis avant validation, attente avec interrogation périodique du statut,
/// résultat succès/échec/expiration (nouvelle tentative = nouveau
/// `clientRef`).

final class MomoAggregatorControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          MomoAggregatorController,
          AsyncValue<MomoAggregatorState>,
          MomoAggregatorState,
          FutureOr<MomoAggregatorState>,
          String
        > {
  MomoAggregatorControllerFamily._()
    : super(
        retry: null,
        name: r'momoAggregatorControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Mobile Money par agrégateur : numéro payeur avec opérateur détecté,
  /// devis avant validation, attente avec interrogation périodique du statut,
  /// résultat succès/échec/expiration (nouvelle tentative = nouveau
  /// `clientRef`).

  MomoAggregatorControllerProvider call(String invoiceId) =>
      MomoAggregatorControllerProvider._(argument: invoiceId, from: this);

  @override
  String toString() => r'momoAggregatorControllerProvider';
}

/// Mobile Money par agrégateur : numéro payeur avec opérateur détecté,
/// devis avant validation, attente avec interrogation périodique du statut,
/// résultat succès/échec/expiration (nouvelle tentative = nouveau
/// `clientRef`).

abstract class _$MomoAggregatorController
    extends $AsyncNotifier<MomoAggregatorState> {
  late final _$args = ref.$arg as String;
  String get invoiceId => _$args;

  FutureOr<MomoAggregatorState> build(String invoiceId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<MomoAggregatorState>, MomoAggregatorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<MomoAggregatorState>, MomoAggregatorState>,
              AsyncValue<MomoAggregatorState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
