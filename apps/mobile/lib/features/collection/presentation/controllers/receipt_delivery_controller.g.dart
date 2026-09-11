// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'receipt_delivery_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Téléchargement/partage du PDF d'un reçu de caisse (`downloadUrl` signée)
/// et renvoi WhatsApp/SMS au locataire (`POST /cash-receipts/{id}/send`).
/// Un contrôleur par reçu (`cashReceiptId`).

@ProviderFor(ReceiptDeliveryController)
final receiptDeliveryControllerProvider = ReceiptDeliveryControllerFamily._();

/// Téléchargement/partage du PDF d'un reçu de caisse (`downloadUrl` signée)
/// et renvoi WhatsApp/SMS au locataire (`POST /cash-receipts/{id}/send`).
/// Un contrôleur par reçu (`cashReceiptId`).
final class ReceiptDeliveryControllerProvider
    extends $NotifierProvider<ReceiptDeliveryController, ReceiptDeliveryState> {
  /// Téléchargement/partage du PDF d'un reçu de caisse (`downloadUrl` signée)
  /// et renvoi WhatsApp/SMS au locataire (`POST /cash-receipts/{id}/send`).
  /// Un contrôleur par reçu (`cashReceiptId`).
  ReceiptDeliveryControllerProvider._({
    required ReceiptDeliveryControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'receiptDeliveryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$receiptDeliveryControllerHash();

  @override
  String toString() {
    return r'receiptDeliveryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  ReceiptDeliveryController create() => ReceiptDeliveryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ReceiptDeliveryState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ReceiptDeliveryState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ReceiptDeliveryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$receiptDeliveryControllerHash() =>
    r'da51ac32fa2d17e35b52cc267b7a23f3e51c8b53';

/// Téléchargement/partage du PDF d'un reçu de caisse (`downloadUrl` signée)
/// et renvoi WhatsApp/SMS au locataire (`POST /cash-receipts/{id}/send`).
/// Un contrôleur par reçu (`cashReceiptId`).

final class ReceiptDeliveryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          ReceiptDeliveryController,
          ReceiptDeliveryState,
          ReceiptDeliveryState,
          ReceiptDeliveryState,
          String
        > {
  ReceiptDeliveryControllerFamily._()
    : super(
        retry: null,
        name: r'receiptDeliveryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Téléchargement/partage du PDF d'un reçu de caisse (`downloadUrl` signée)
  /// et renvoi WhatsApp/SMS au locataire (`POST /cash-receipts/{id}/send`).
  /// Un contrôleur par reçu (`cashReceiptId`).

  ReceiptDeliveryControllerProvider call(String cashReceiptId) =>
      ReceiptDeliveryControllerProvider._(argument: cashReceiptId, from: this);

  @override
  String toString() => r'receiptDeliveryControllerProvider';
}

/// Téléchargement/partage du PDF d'un reçu de caisse (`downloadUrl` signée)
/// et renvoi WhatsApp/SMS au locataire (`POST /cash-receipts/{id}/send`).
/// Un contrôleur par reçu (`cashReceiptId`).

abstract class _$ReceiptDeliveryController
    extends $Notifier<ReceiptDeliveryState> {
  late final _$args = ref.$arg as String;
  String get cashReceiptId => _$args;

  ReceiptDeliveryState build(String cashReceiptId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<ReceiptDeliveryState, ReceiptDeliveryState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ReceiptDeliveryState, ReceiptDeliveryState>,
              ReceiptDeliveryState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
