// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referrals_list_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ReferralsListController)
final referralsListControllerProvider = ReferralsListControllerProvider._();

final class ReferralsListControllerProvider
    extends
        $AsyncNotifierProvider<ReferralsListController, ReferralsListState> {
  ReferralsListControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'referralsListControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$referralsListControllerHash();

  @$internal
  @override
  ReferralsListController create() => ReferralsListController();
}

String _$referralsListControllerHash() =>
    r'd565b343bcc47a3c49e6f7790f6fa80d435016dd';

abstract class _$ReferralsListController
    extends $AsyncNotifier<ReferralsListState> {
  FutureOr<ReferralsListState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<AsyncValue<ReferralsListState>, ReferralsListState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<ReferralsListState>, ReferralsListState>,
              AsyncValue<ReferralsListState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
