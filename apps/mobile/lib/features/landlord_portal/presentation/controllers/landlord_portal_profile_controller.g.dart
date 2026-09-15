// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'landlord_portal_profile_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Profil du portail bailleur (`GET /v1/portal/me`), gardé en vie pour toute
/// la session : sert à la fois de source d'affichage (accueil, bandeau
/// diaspora) et de test d'aiguillage post-connexion (`SplashScreen`,
/// `OtpVerificationScreen`) — `null` si le compte connecté n'a pas de
/// bailleur rattaché (403/404 côté API), jamais une exception dans ce cas
/// précis afin de laisser l'appelant retomber sur le parcours agence.

@ProviderFor(LandlordPortalProfileController)
final landlordPortalProfileControllerProvider =
    LandlordPortalProfileControllerProvider._();

/// Profil du portail bailleur (`GET /v1/portal/me`), gardé en vie pour toute
/// la session : sert à la fois de source d'affichage (accueil, bandeau
/// diaspora) et de test d'aiguillage post-connexion (`SplashScreen`,
/// `OtpVerificationScreen`) — `null` si le compte connecté n'a pas de
/// bailleur rattaché (403/404 côté API), jamais une exception dans ce cas
/// précis afin de laisser l'appelant retomber sur le parcours agence.
final class LandlordPortalProfileControllerProvider
    extends
        $AsyncNotifierProvider<
          LandlordPortalProfileController,
          PortalProfile?
        > {
  /// Profil du portail bailleur (`GET /v1/portal/me`), gardé en vie pour toute
  /// la session : sert à la fois de source d'affichage (accueil, bandeau
  /// diaspora) et de test d'aiguillage post-connexion (`SplashScreen`,
  /// `OtpVerificationScreen`) — `null` si le compte connecté n'a pas de
  /// bailleur rattaché (403/404 côté API), jamais une exception dans ce cas
  /// précis afin de laisser l'appelant retomber sur le parcours agence.
  LandlordPortalProfileControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'landlordPortalProfileControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$landlordPortalProfileControllerHash();

  @$internal
  @override
  LandlordPortalProfileController create() => LandlordPortalProfileController();
}

String _$landlordPortalProfileControllerHash() =>
    r'bc3c20f9168b693608b9811cc1b57611a4666d4a';

/// Profil du portail bailleur (`GET /v1/portal/me`), gardé en vie pour toute
/// la session : sert à la fois de source d'affichage (accueil, bandeau
/// diaspora) et de test d'aiguillage post-connexion (`SplashScreen`,
/// `OtpVerificationScreen`) — `null` si le compte connecté n'a pas de
/// bailleur rattaché (403/404 côté API), jamais une exception dans ce cas
/// précis afin de laisser l'appelant retomber sur le parcours agence.

abstract class _$LandlordPortalProfileController
    extends $AsyncNotifier<PortalProfile?> {
  FutureOr<PortalProfile?> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<PortalProfile?>, PortalProfile?>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<PortalProfile?>, PortalProfile?>,
              AsyncValue<PortalProfile?>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, build);
  }
}
