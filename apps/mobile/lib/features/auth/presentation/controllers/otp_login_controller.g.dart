// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'otp_login_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Contrôleur du parcours « connexion OTP » : demande de code, décompte de
/// renvoi (60 s), vérification. Délègue les transitions à
/// [OtpStateMachine] (testée isolément) et déclenche la mise à jour de la
/// session globale via [AuthSessionController] une fois le code vérifié.

@ProviderFor(OtpLoginController)
final otpLoginControllerProvider = OtpLoginControllerProvider._();

/// Contrôleur du parcours « connexion OTP » : demande de code, décompte de
/// renvoi (60 s), vérification. Délègue les transitions à
/// [OtpStateMachine] (testée isolément) et déclenche la mise à jour de la
/// session globale via [AuthSessionController] une fois le code vérifié.
final class OtpLoginControllerProvider
    extends $NotifierProvider<OtpLoginController, OtpLoginState> {
  /// Contrôleur du parcours « connexion OTP » : demande de code, décompte de
  /// renvoi (60 s), vérification. Délègue les transitions à
  /// [OtpStateMachine] (testée isolément) et déclenche la mise à jour de la
  /// session globale via [AuthSessionController] une fois le code vérifié.
  OtpLoginControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'otpLoginControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$otpLoginControllerHash();

  @$internal
  @override
  OtpLoginController create() => OtpLoginController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OtpLoginState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OtpLoginState>(value),
    );
  }
}

String _$otpLoginControllerHash() =>
    r'6d9a50a8544a2b7d22439d89fd906a5d9e058bd5';

/// Contrôleur du parcours « connexion OTP » : demande de code, décompte de
/// renvoi (60 s), vérification. Délègue les transitions à
/// [OtpStateMachine] (testée isolément) et déclenche la mise à jour de la
/// session globale via [AuthSessionController] une fois le code vérifié.

abstract class _$OtpLoginController extends $Notifier<OtpLoginState> {
  OtpLoginState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<OtpLoginState, OtpLoginState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<OtpLoginState, OtpLoginState>,
              OtpLoginState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
