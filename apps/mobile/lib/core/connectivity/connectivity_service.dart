import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'connectivity_service.g.dart';

/// Enveloppe autour de `connectivity_plus`, injectable par Riverpod afin
/// d'être simulée dans les tests (aucun canal de plateforme réel).
class ConnectivityService {
  const ConnectivityService();

  Future<bool> isOffline() async {
    final List<ConnectivityResult> results = await Connectivity()
        .checkConnectivity();
    return results.isEmpty || results.contains(ConnectivityResult.none);
  }
}

@riverpod
ConnectivityService connectivityService(Ref ref) => const ConnectivityService();
