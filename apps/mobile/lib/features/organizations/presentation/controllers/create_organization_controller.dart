import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../auth/presentation/controllers/auth_session_controller.dart';
import '../../data/organizations_providers.dart';
import '../../domain/entities/organization.dart';
import 'selected_organization_controller.dart';

part 'create_organization_controller.g.dart';

/// Assistant de création minimale d'organisation (Epic 0.D). Le créateur
/// devient automatiquement OWNER côté API.
@riverpod
class CreateOrganizationController extends _$CreateOrganizationController {
  @override
  FutureOr<void> build() {}

  Future<Organization?> submit({
    required OrganizationType type,
    required String legalName,
    String? tradeName,
    required String city,
    String? district,
    required String contactPhone,
    String? contactEmail,
  }) async {
    state = const AsyncLoading<void>();
    try {
      final Organization org = await ref
          .read(organizationsRepositoryProvider)
          .createOrganization(
            type: type,
            legalName: legalName,
            tradeName: tradeName,
            city: city,
            district: district,
            contactPhone: contactPhone,
            contactEmail: contactEmail,
          );
      await ref
          .read(authSessionControllerProvider.notifier)
          .refreshOrganizations();
      await ref
          .read(selectedOrganizationControllerProvider.notifier)
          .select(org.id);
      state = const AsyncData<void>(null);
      return org;
    } on Object catch (e, st) {
      state = AsyncError<void>(e, st);
      return null;
    }
  }
}
