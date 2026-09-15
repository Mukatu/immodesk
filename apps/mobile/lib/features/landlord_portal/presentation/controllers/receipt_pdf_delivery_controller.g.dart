// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'receipt_pdf_delivery_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Téléchargement puis partage du PDF d'une quittance
/// (`downloadUrl` déjà signée, embarquée dans `ReceiptSummary`).

@ProviderFor(ReceiptPdfDeliveryController)
final receiptPdfDeliveryControllerProvider =
    ReceiptPdfDeliveryControllerFamily._();

/// Téléchargement puis partage du PDF d'une quittance
/// (`downloadUrl` déjà signée, embarquée dans `ReceiptSummary`).
final class ReceiptPdfDeliveryControllerProvider
    extends $NotifierProvider<ReceiptPdfDeliveryController, StatementPdfState> {
  /// Téléchargement puis partage du PDF d'une quittance
  /// (`downloadUrl` déjà signée, embarquée dans `ReceiptSummary`).
  ReceiptPdfDeliveryControllerProvider._({
    required ReceiptPdfDeliveryControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'receiptPdfDeliveryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$receiptPdfDeliveryControllerHash();

  @override
  String toString() {
    return r'receiptPdfDeliveryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  ReceiptPdfDeliveryController create() => ReceiptPdfDeliveryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(StatementPdfState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<StatementPdfState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ReceiptPdfDeliveryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$receiptPdfDeliveryControllerHash() =>
    r'a607ec57ea0fdc41fd12ecbe30122e4656c7561d';

/// Téléchargement puis partage du PDF d'une quittance
/// (`downloadUrl` déjà signée, embarquée dans `ReceiptSummary`).

final class ReceiptPdfDeliveryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          ReceiptPdfDeliveryController,
          StatementPdfState,
          StatementPdfState,
          StatementPdfState,
          String
        > {
  ReceiptPdfDeliveryControllerFamily._()
    : super(
        retry: null,
        name: r'receiptPdfDeliveryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Téléchargement puis partage du PDF d'une quittance
  /// (`downloadUrl` déjà signée, embarquée dans `ReceiptSummary`).

  ReceiptPdfDeliveryControllerProvider call(String receiptId) =>
      ReceiptPdfDeliveryControllerProvider._(argument: receiptId, from: this);

  @override
  String toString() => r'receiptPdfDeliveryControllerProvider';
}

/// Téléchargement puis partage du PDF d'une quittance
/// (`downloadUrl` déjà signée, embarquée dans `ReceiptSummary`).

abstract class _$ReceiptPdfDeliveryController
    extends $Notifier<StatementPdfState> {
  late final _$args = ref.$arg as String;
  String get receiptId => _$args;

  StatementPdfState build(String receiptId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<StatementPdfState, StatementPdfState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<StatementPdfState, StatementPdfState>,
              StatementPdfState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
