import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../data/landlord_portal_providers.dart';
import '../../domain/entities/portal_profile.dart';

part 'landlord_portal_profile_controller.g.dart';

/// Profil du portail bailleur (`GET /v1/portal/me`), gardé en vie pour toute
/// la session : sert à la fois de source d'affichage (accueil, bandeau
/// diaspora) et de test d'aiguillage post-connexion (`SplashScreen`,
/// `OtpVerificationScreen`) — `null` si le compte connecté n'a pas de
/// bailleur rattaché (403/404 côté API), jamais une exception dans ce cas
/// précis afin de laisser l'appelant retomber sur le parcours agence.
@Riverpod(keepAlive: true)
class LandlordPortalProfileController
    extends _$LandlordPortalProfileController {
  @override
  Future<PortalProfile?> build() async {
    try {
      return await ref.read(landlordPortalRepositoryProvider).fetchMe();
    } on ApiException catch (e) {
      if (e.statusCode == 403 || e.statusCode == 404) return null;
      rethrow;
    }
  }
}
