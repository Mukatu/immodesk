import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/config/env.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/network/dio_provider.dart';

part 'diagnostics_controller.g.dart';

class DiagnosticsInfo {
  const DiagnosticsInfo({
    required this.appVersion,
    required this.buildNumber,
    required this.apiBaseUrl,
    required this.connectivityLabel,
    this.lastSyncLabel = 'Jamais',
    this.healthCheckResult,
  });

  final String appVersion;
  final String buildNumber;
  final String apiBaseUrl;
  final String connectivityLabel;

  /// Toujours « Jamais » en phase 0 : la synchronisation réelle arrive en
  /// phase 5 (voir `docs/02_architecture_technique.md` §10).
  final String lastSyncLabel;
  final String? healthCheckResult;

  DiagnosticsInfo copyWith({String? healthCheckResult}) {
    return DiagnosticsInfo(
      appVersion: appVersion,
      buildNumber: buildNumber,
      apiBaseUrl: apiBaseUrl,
      connectivityLabel: connectivityLabel,
      lastSyncLabel: lastSyncLabel,
      healthCheckResult: healthCheckResult ?? this.healthCheckResult,
    );
  }
}

/// Écran « à propos / diagnostic » (coquille phase 0, enrichie en phase 5).
@riverpod
class DiagnosticsController extends _$DiagnosticsController {
  @override
  Future<DiagnosticsInfo> build() async {
    final PackageInfo packageInfo = await PackageInfo.fromPlatform();
    final List<ConnectivityResult> connectivity = await Connectivity()
        .checkConnectivity();
    return DiagnosticsInfo(
      appVersion: packageInfo.version,
      buildNumber: packageInfo.buildNumber,
      apiBaseUrl: Env.apiBaseUrl,
      connectivityLabel: _connectivityLabel(connectivity),
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
      final Object? status = (response.data as Map<String, dynamic>?)?['status'];
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
}
