import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/network/api_exception.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/mandates_providers.dart';
import 'mandate_detail_controller.dart';

part 'landlord_invitation_controller.g.dart';

/// Envoi de l'invitation WhatsApp du bailleur depuis la fiche du mandat
/// (`POST /v1/management-mandates/{id}/landlord-invitation`). Le message
/// est envoyé par l'API (canal WhatsApp), le mobile ne fait qu'exposer le
/// bouton et le statut résultant.
@riverpod
class LandlordInvitationController extends _$LandlordInvitationController {
  @override
  FutureOr<void> build(String mandateId) {}

  Future<bool> send() async {
    state = const AsyncLoading<void>();
    try {
      final String organizationId =
          await ref.read(selectedOrganizationControllerProvider.future) ?? '';
      await ref
          .read(mandatesRepositoryProvider)
          .sendLandlordInvitation(
            organizationId: organizationId,
            mandateId: mandateId,
          );
      // Rafraîchit la fiche mandat pour refléter le nouveau statut
      // d'invitation (`landlordPortal.invited`/`invitedAt`).
      ref.invalidate(mandateDetailControllerProvider(mandateId));
      state = const AsyncData<void>(null);
      return true;
    } on ApiException catch (e, st) {
      state = AsyncError<void>(e, st);
      return false;
    }
  }
}
