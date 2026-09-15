import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../auth/presentation/controllers/auth_session_controller.dart';
import '../../../mandates/domain/entities/commission_basis.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/onboarding_providers.dart';
import '../../domain/entities/independent_manager_onboarding_result.dart';

part 'manager_onboarding_controller.g.dart';

/// Contrôleur du parcours d'onboarding du gestionnaire indépendant, conçu
/// pour tenir en moins de dix minutes (`docs/04_plan_de_phases.md` §7.3,
/// épic 7.F) : organisation, premier bailleur, premier immeuble, premier
/// mandat avec la commission par défaut de 10 % — un seul appel réseau à
/// la fin du parcours (transaction unique côté API).
@riverpod
class ManagerOnboardingController extends _$ManagerOnboardingController {
  @override
  FutureOr<void> build() {}

  Future<IndependentManagerOnboardingResult?> submit({
    required String organizationLegalName,
    required String organizationCity,
    required String organizationContactPhone,
    required String landlordFirstName,
    required String landlordLastName,
    required String landlordPrimaryPhone,
    required String landlordCity,
    required String landlordCountryCode,
    required String propertyName,
    required String propertyAddressLine,
    required String propertyDistrict,
    required String propertyCity,
    required String startDate,
    int commissionRateBps = defaultIndependentManagerCommissionRateBps,
    int vatRateBps = defaultCommissionVatRateBps,
    int payoutDay = 10,
  }) async {
    state = const AsyncLoading<void>();
    try {
      final IndependentManagerOnboardingResult result = await ref
          .read(onboardingRepositoryProvider)
          .onboardIndependentManager(
            organizationLegalName: organizationLegalName,
            organizationCity: organizationCity,
            organizationContactPhone: organizationContactPhone,
            landlordFirstName: landlordFirstName,
            landlordLastName: landlordLastName,
            landlordPrimaryPhone: landlordPrimaryPhone,
            landlordCity: landlordCity,
            landlordCountryCode: landlordCountryCode,
            propertyName: propertyName,
            propertyAddressLine: propertyAddressLine,
            propertyDistrict: propertyDistrict,
            propertyCity: propertyCity,
            commissionRateBps: commissionRateBps,
            vatRateBps: vatRateBps,
            startDate: startDate,
            payoutDay: payoutDay,
          );
      await ref
          .read(authSessionControllerProvider.notifier)
          .refreshOrganizations();
      await ref
          .read(selectedOrganizationControllerProvider.notifier)
          .select(result.organization.id);
      state = const AsyncData<void>(null);
      return result;
    } on Object catch (e, st) {
      state = AsyncError<void>(e, st);
      return null;
    }
  }
}
