// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'landlord_portal_lists_controllers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(landlordStatements)
final landlordStatementsProvider = LandlordStatementsProvider._();

final class LandlordStatementsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OwnerStatementSummary>>,
          List<OwnerStatementSummary>,
          FutureOr<List<OwnerStatementSummary>>
        >
    with
        $FutureModifier<List<OwnerStatementSummary>>,
        $FutureProvider<List<OwnerStatementSummary>> {
  LandlordStatementsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'landlordStatementsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$landlordStatementsHash();

  @$internal
  @override
  $FutureProviderElement<List<OwnerStatementSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<OwnerStatementSummary>> create(Ref ref) {
    return landlordStatements(ref);
  }
}

String _$landlordStatementsHash() =>
    r'cb64603a8759fd7b81f4de7d3b2c9f6cee170edd';

@ProviderFor(landlordPayouts)
final landlordPayoutsProvider = LandlordPayoutsProvider._();

final class LandlordPayoutsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OwnerPayout>>,
          List<OwnerPayout>,
          FutureOr<List<OwnerPayout>>
        >
    with
        $FutureModifier<List<OwnerPayout>>,
        $FutureProvider<List<OwnerPayout>> {
  LandlordPayoutsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'landlordPayoutsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$landlordPayoutsHash();

  @$internal
  @override
  $FutureProviderElement<List<OwnerPayout>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<OwnerPayout>> create(Ref ref) {
    return landlordPayouts(ref);
  }
}

String _$landlordPayoutsHash() => r'050b8a75c4d2bc4437b73f60971aa1e7be12624d';

@ProviderFor(landlordCollections)
final landlordCollectionsProvider = LandlordCollectionsProvider._();

final class LandlordCollectionsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<CollectionView>>,
          List<CollectionView>,
          FutureOr<List<CollectionView>>
        >
    with
        $FutureModifier<List<CollectionView>>,
        $FutureProvider<List<CollectionView>> {
  LandlordCollectionsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'landlordCollectionsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$landlordCollectionsHash();

  @$internal
  @override
  $FutureProviderElement<List<CollectionView>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<CollectionView>> create(Ref ref) {
    return landlordCollections(ref);
  }
}

String _$landlordCollectionsHash() =>
    r'ac53f62f0caa4c47501bbaa622cc5a741080496e';

@ProviderFor(landlordReceipts)
final landlordReceiptsProvider = LandlordReceiptsProvider._();

final class LandlordReceiptsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ReceiptSummary>>,
          List<ReceiptSummary>,
          FutureOr<List<ReceiptSummary>>
        >
    with
        $FutureModifier<List<ReceiptSummary>>,
        $FutureProvider<List<ReceiptSummary>> {
  LandlordReceiptsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'landlordReceiptsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$landlordReceiptsHash();

  @$internal
  @override
  $FutureProviderElement<List<ReceiptSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<ReceiptSummary>> create(Ref ref) {
    return landlordReceipts(ref);
  }
}

String _$landlordReceiptsHash() => r'6cc2926dc02238e823143f7ed26e720c06a76a4f';
