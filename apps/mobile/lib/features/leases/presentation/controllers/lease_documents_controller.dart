import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/connectivity/connectivity_service.dart';
import '../../../../core/network/api_exception.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';
import '../../data/leases_providers.dart';
import '../../domain/entities/lease_document.dart';

part 'lease_documents_controller.g.dart';

/// État de la liste des documents d'un bail : toujours interrogée en
/// ligne (pas de cache Drift), avec un message clair si hors connexion.
class LeaseDocumentsState {
  const LeaseDocumentsState({
    this.items = const [],
    this.isOffline = false,
    this.errorMessage,
  });

  final List<LeaseDocument> items;
  final bool isOffline;
  final String? errorMessage;
}

const String offlineDocumentsMessage =
    'Documents indisponibles hors connexion.';

/// Liste des versions de documents attachés à un bail (contrat généré,
/// contrat signé...), pour la fiche bail.
@riverpod
class LeaseDocumentsController extends _$LeaseDocumentsController {
  @override
  Future<LeaseDocumentsState> build(String leaseId) async {
    // Tous les `ref.watch` sont effectués avant le premier `await` (comme
    // dans `UnitActiveLeaseController`) : un `watch` après un point de
    // suspension provoque, avec ce générateur, une reconstruction en boucle
    // du notifier (jamais de valeur stable émise).
    final ConnectivityService connectivity = ref.watch(
      connectivityServiceProvider,
    );
    final String organizationId =
        ref.watch(selectedOrganizationControllerProvider).value ?? '';
    final leasesRepository = ref.watch(leasesRepositoryProvider);

    final bool isOffline = await connectivity.isOffline();
    if (isOffline) {
      return const LeaseDocumentsState(
        isOffline: true,
        errorMessage: offlineDocumentsMessage,
      );
    }

    try {
      final List<LeaseDocument> items = await leasesRepository
          .fetchLeaseDocuments(organizationId, leaseId);
      return LeaseDocumentsState(items: items);
    } on ApiException catch (e) {
      if (e.code.startsWith('NETWORK.')) {
        return const LeaseDocumentsState(
          isOffline: true,
          errorMessage: offlineDocumentsMessage,
        );
      }
      return LeaseDocumentsState(errorMessage: e.message);
    }
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
