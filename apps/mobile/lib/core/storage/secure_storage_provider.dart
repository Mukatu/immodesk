import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Instance unique de `flutter_secure_storage`, partagée par le jeton de
/// rafraîchissement (`AuthTokenStore`) et par la clé de chiffrement de la
/// base locale (`AppDatabase`, phase 5).
final Provider<FlutterSecureStorage> secureStorageProvider =
    Provider<FlutterSecureStorage>((ref) {
      return const FlutterSecureStorage(
        aOptions: AndroidOptions(),
        iOptions: IOSOptions(
          accessibility: KeychainAccessibility.first_unlock_this_device,
        ),
      );
    });
