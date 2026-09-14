import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../db/app_database.dart';
import '../network/dio_provider.dart';
import '../storage/app_settings_keys.dart';

part 'mobile_config.g.dart';

/// `MobileConfig` du contrat de phase 5 (`GET /v1/mobile/config`) :
/// paramètres appliqués sans recompilation. Les valeurs par défaut ci-dessous
/// sont celles du contrat, utilisées tant qu'aucune réponse serveur n'a été
/// mise en cache (première ouverture hors ligne).
class MobileConfig {
  const MobileConfig({
    this.maxPhotoBytes = 1500000,
    this.photoMaxDimension = 1600,
    this.photoQuality = 80,
    this.maxSignatureBytes = 200000,
    this.retentionHours = 72,
    this.syncIntervalSeconds = 300,
    this.maxOperationsPerBatch = 50,
    this.offlineWritesEnabled = true,
  });

  final int maxPhotoBytes;
  final int photoMaxDimension;
  final int photoQuality;
  final int maxSignatureBytes;
  final int retentionHours;
  final int syncIntervalSeconds;
  final int maxOperationsPerBatch;
  final bool offlineWritesEnabled;

  factory MobileConfig.fromJson(Map<String, dynamic> json) {
    const MobileConfig defaults = MobileConfig();
    return MobileConfig(
      maxPhotoBytes: json['maxPhotoBytes'] as int? ?? defaults.maxPhotoBytes,
      photoMaxDimension:
          json['photoMaxDimension'] as int? ?? defaults.photoMaxDimension,
      photoQuality: json['photoQuality'] as int? ?? defaults.photoQuality,
      maxSignatureBytes:
          json['maxSignatureBytes'] as int? ?? defaults.maxSignatureBytes,
      retentionHours: json['retentionHours'] as int? ?? defaults.retentionHours,
      syncIntervalSeconds:
          json['syncIntervalSeconds'] as int? ?? defaults.syncIntervalSeconds,
      maxOperationsPerBatch:
          json['maxOperationsPerBatch'] as int? ??
          defaults.maxOperationsPerBatch,
      offlineWritesEnabled:
          json['offlineWritesEnabled'] as bool? ??
          defaults.offlineWritesEnabled,
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
    'maxPhotoBytes': maxPhotoBytes,
    'photoMaxDimension': photoMaxDimension,
    'photoQuality': photoQuality,
    'maxSignatureBytes': maxSignatureBytes,
    'retentionHours': retentionHours,
    'syncIntervalSeconds': syncIntervalSeconds,
    'maxOperationsPerBatch': maxOperationsPerBatch,
    'offlineWritesEnabled': offlineWritesEnabled,
  };
}

/// Charge `GET /v1/mobile/config`, avec repli sur la dernière valeur connue
/// (`AppSettings`) puis sur les valeurs par défaut du contrat si l'appareil
/// n'a jamais synchronisé.
@riverpod
Future<MobileConfig> mobileConfig(Ref ref) async {
  final AppDatabase db = ref.watch(appDatabaseProvider);
  final Dio dio = ref.watch(dioProvider);
  try {
    final Response<dynamic> response = await dio.get<dynamic>('/mobile/config');
    final Map<String, dynamic> data = response.data as Map<String, dynamic>;
    await db.setSetting(AppSettingsKeys.mobileConfigCache, jsonEncode(data));
    return MobileConfig.fromJson(data);
  } on DioException {
    final String? cached = await db.getSetting(
      AppSettingsKeys.mobileConfigCache,
    );
    if (cached == null) return const MobileConfig();
    return MobileConfig.fromJson(jsonDecode(cached) as Map<String, dynamic>);
  }
}
