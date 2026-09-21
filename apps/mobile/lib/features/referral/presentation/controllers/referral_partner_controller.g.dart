// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'referral_partner_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(ReferralPartnerController)
final referralPartnerControllerProvider = ReferralPartnerControllerProvider._();

final class ReferralPartnerControllerProvider
    extends
        $AsyncNotifierProvider<
          ReferralPartnerController,
          ReferralPartnerState
        > {
  ReferralPartnerControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'referralPartnerControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$referralPartnerControllerHash();

  @$internal
  @override
  ReferralPartnerController create() => ReferralPartnerController();
}

String _$referralPartnerControllerHash() =>
    r'874a0083b187b9445fb07142f365671012b3cf6f';

abstract class _$ReferralPartnerController
    extends $AsyncNotifier<ReferralPartnerState> {
  FutureOr<ReferralPartnerState> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<ReferralPartnerState>, ReferralPartnerState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<ReferralPartnerState>,
                ReferralPartnerState
              >,
              AsyncValue<ReferralPartnerState>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
