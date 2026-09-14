import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:intl/intl.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/config/env.dart';
import '../../../../core/db/app_database.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/network/dio_provider.dart';
import '../../../../core/storage/secret_key_store.dart';
import '../../../../core/sync/pull_service.dart';
import '../../../organizations/presentation/controllers/selected_organization_controller.dart';

part 'diagnostics_controller.g.dart';

class DiagnosticsInfo {
  const DiagnosticsInfo({
    required this.appVersion,
    required this.buildNumber,
    required this.apiBaseUrl,
    required this.connectivityLabel,
    this.lastSyncLabel = 'Jamais',
    this.healthCheckResult,
    this.syncMessage,
  });

  final String appVersion;
  final String buildNumber;
  final String apiBaseUrl;
  final String connectivityLabel;

  /// Date de la dernière copie locale du périmètre du démarcheur
  /// (`GET /v1/sync/pull` réussi), ou « Jamais ».
  final String lastSyncLabel;
  final String? healthCheckResult;
  final String? syncMessage;

  DiagnosticsInfo copyWith({
    String? healthCheckResult,
    String? lastSyncLabel,
    String? syncMessage,
  }) {
    return DiagnosticsInfo(
      appVersion: appVersion,
      buildNumber: buildNumber,
      apiBaseUrl: apiBaseUrl,
      connectivityLabel: connectivityLabel,
      lastSyncLabel: lastSyncLabel ?? this.lastSyncLabel,
      healthCheckResult: healthCheckResult ?? this.healthCheckResult,
      syncMessage: syncMessage ?? this.syncMessage,
    );
  }
}

/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5 :
/// préchargement manuel de la tournée, réinitialisation de la base locale
/// chiffrée en cas de perte de clé — `docs/04_plan_de_phases.md` §5.10).
@riverpod
class DiagnosticsController extends _$DiagnosticsController {
  @override
  Future<DiagnosticsInfo> build() async {
    final PackageInfo packageInfo = await PackageInfo.fromPlatform();
    final List<ConnectivityResult> connectivity = await Connectivity()
        .checkConnectivity();
    final DateTime? lastPulledAt = await ref
        .watch(pullServiceProvider)
        .lastPulledAt();
    return DiagnosticsInfo(
      appVersion: packageInfo.version,
      buildNumber: packageInfo.buildNumber,
      apiBaseUrl: Env.apiBaseUrl,
      connectivityLabel: _connectivityLabel(connectivity),
      lastSyncLabel: lastPulledAt == null
          ? 'Jamais'
          : DateFormat('dd/MM/yyyy à HH:mm').format(lastPulledAt),
    );
  }

  String _connectivityLabel(List<ConnectivityResult> results) {
    if (results.isEmpty || results.contains(ConnectivityResult.none)) {
      return 'Hors ligne';
    }
    if (results.contains(ConnectivityResult.wifi)) return 'Wi-Fi';
    if (results.contains(ConnectivityResult.mobile)) {
      return 'Données mobiles';
    }
    return 'Connecté';
  }

  Future<void> testHealth() async {
    final DiagnosticsInfo? current = state.value;
    if (current == null) return;
    state = AsyncData<DiagnosticsInfo>(
      current.copyWith(healthCheckResult: 'Vérification en cours…'),
    );
    try {
      final Dio dio = ref.read(dioProvider);
      final Response<dynamic> response = await dio.get<dynamic>('/health');
      final Object? status =
          (response.data as Map<String, dynamic>?)?['status'];
      state = AsyncData<DiagnosticsInfo>(
        current.copyWith(
          healthCheckResult: 'API disponible (statut : ${status ?? 'ok'})',
        ),
      );
    } on DioException catch (e) {
      final ApiException apiError = ApiException.fromDioException(e);
      state = AsyncData<DiagnosticsInfo>(
        current.copyWith(healthCheckResult: 'Échec : ${apiError.message}'),
      );
    }
  }

  /// Préchargement manuel (`GET /v1/sync/pull`) : utile avant de partir en
  /// tournée sans réseau, ou pour rafraîchir un périmètre déjà chargé.
  Future<void> preloadNow() async {
    final DiagnosticsInfo? current = state.value;
    if (current == null) return;
    final String? organizationId = ref
        .read(selectedOrganizationControllerProvider)
        .value;
    if (organizationId == null) return;
    state = AsyncData<DiagnosticsInfo>(
      current.copyWith(syncMessage: 'Préchargement en cours…'),
    );
    try {
      final result = await ref
          .read(pullServiceProvider)
          .pullAndStore(organizationId);
      state = AsyncData<DiagnosticsInfo>(
        current.copyWith(
          lastSyncLabel: DateFormat(
            'dd/MM/yyyy à HH:mm',
          ).format(DateTime.now()),
          syncMessage:
              'Tournée à jour (${result.changed.invoices.length} facture(s)).',
        ),
      );
    } on ApiException catch (e) {
      state = AsyncData<DiagnosticsInfo>(
        current.copyWith(syncMessage: 'Échec du préchargement : ${e.message}'),
      );
    }
  }

  /// Réinitialisation de la base locale chiffrée (perte de la clé de
  /// chiffrement, ou support technique) : supprime le fichier et la clé,
  /// puis force la recréation d'une base vide avec une nouvelle clé au
  /// prochain accès. Un nouveau préchargement complet est nécessaire
  /// ensuite (`docs/04_plan_de_phases.md` §5.10, README « Réinitialisation
  /// de la base locale »).
  Future<void> resetLocalDatabase() async {
    final DiagnosticsInfo? current = state.value;
    if (current == null) return;
    await ref.read(appDatabaseProvider).close();
    final SecretKeyStore keyStore = FlutterSecureSecretKeyStore(
      ref.read(secureStorageProvider),
    );
    await DbEncryption.resetDatabaseAndKey(
      keyStore,
      await resolveDatabaseFile(),
    );
    ref.invalidate(appDatabaseProvider);
    state = AsyncData<DiagnosticsInfo>(
      current.copyWith(
        lastSyncLabel: 'Jamais',
        syncMessage:
            'Base locale réinitialisée. Relancez un préchargement complet.',
      ),
    );
  }
}
