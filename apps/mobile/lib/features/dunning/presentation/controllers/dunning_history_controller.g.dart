// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'dunning_history_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Historique des relances envoyées à un locataire (`feature dunning`,
/// phase 9), consultable depuis sa fiche ou depuis une facture de la
/// tournée. Toujours trié du plus récent au plus ancien (voir
/// `DunningRepositoryImpl`).

@ProviderFor(DunningHistoryController)
final dunningHistoryControllerProvider = DunningHistoryControllerFamily._();

/// Historique des relances envoyées à un locataire (`feature dunning`,
/// phase 9), consultable depuis sa fiche ou depuis une facture de la
/// tournée. Toujours trié du plus récent au plus ancien (voir
/// `DunningRepositoryImpl`).
final class DunningHistoryControllerProvider
    extends
        $AsyncNotifierProvider<DunningHistoryController, DunningHistoryState> {
  /// Historique des relances envoyées à un locataire (`feature dunning`,
  /// phase 9), consultable depuis sa fiche ou depuis une facture de la
  /// tournée. Toujours trié du plus récent au plus ancien (voir
  /// `DunningRepositoryImpl`).
  DunningHistoryControllerProvider._({
    required DunningHistoryControllerFamily super.from,
    required (String, String?) super.argument,
  }) : super(
         retry: null,
         name: r'dunningHistoryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$dunningHistoryControllerHash();

  @override
  String toString() {
    return r'dunningHistoryControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  DunningHistoryController create() => DunningHistoryController();

  @override
  bool operator ==(Object other) {
    return other is DunningHistoryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$dunningHistoryControllerHash() =>
    r'41d8a5e368952ae407f1f35b04c201fc9e3c060c';

/// Historique des relances envoyées à un locataire (`feature dunning`,
/// phase 9), consultable depuis sa fiche ou depuis une facture de la
/// tournée. Toujours trié du plus récent au plus ancien (voir
/// `DunningRepositoryImpl`).

final class DunningHistoryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          DunningHistoryController,
          AsyncValue<DunningHistoryState>,
          DunningHistoryState,
          FutureOr<DunningHistoryState>,
          (String, String?)
        > {
  DunningHistoryControllerFamily._()
    : super(
        retry: null,
        name: r'dunningHistoryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Historique des relances envoyées à un locataire (`feature dunning`,
  /// phase 9), consultable depuis sa fiche ou depuis une facture de la
  /// tournée. Toujours trié du plus récent au plus ancien (voir
  /// `DunningRepositoryImpl`).

  DunningHistoryControllerProvider call(String tenantId, String? invoiceId) =>
      DunningHistoryControllerProvider._(
        argument: (tenantId, invoiceId),
        from: this,
      );

  @override
  String toString() => r'dunningHistoryControllerProvider';
}

/// Historique des relances envoyées à un locataire (`feature dunning`,
/// phase 9), consultable depuis sa fiche ou depuis une facture de la
/// tournée. Toujours trié du plus récent au plus ancien (voir
/// `DunningRepositoryImpl`).

abstract class _$DunningHistoryController
    extends $AsyncNotifier<DunningHistoryState> {
  late final _$args = ref.$arg as (String, String?);
  String get tenantId => _$args.$1;
  String? get invoiceId => _$args.$2;

  FutureOr<DunningHistoryState> build(String tenantId, String? invoiceId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<DunningHistoryState>, DunningHistoryState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<DunningHistoryState>, DunningHistoryState>,
              AsyncValue<DunningHistoryState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args.$1, _$args.$2));
  }
}
