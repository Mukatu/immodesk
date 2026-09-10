import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/router/route_paths.dart';
import '../controllers/diagnostics_controller.dart';

/// Écran « à propos / diagnostic » : version de l'app, état réseau, URL de
/// l'API, dernière synchronisation (coquille phase 0, enrichie en phase 5).
class DiagnosticsScreen extends ConsumerWidget {
  const DiagnosticsScreen({super.key});

  static const String path = RoutePaths.diagnostics;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<DiagnosticsInfo> infoAsync = ref.watch(
      diagnosticsControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('À propos / diagnostic')),
      body: infoAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (info) => ListView(
          padding: const EdgeInsets.all(24),
          children: [
            _InfoTile(
              label: "Version de l'application",
              value: '${info.appVersion} (${info.buildNumber})',
            ),
            _InfoTile(label: 'État réseau', value: info.connectivityLabel),
            _InfoTile(label: "URL de l'API", value: info.apiBaseUrl),
            _InfoTile(
              label: 'Dernière synchronisation',
              value: info.lastSyncLabel,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              key: const ValueKey('test-health-button'),
              onPressed: () =>
                  ref.read(diagnosticsControllerProvider.notifier).testHealth(),
              icon: const Icon(Icons.wifi_tethering),
              label: const Text('Tester /v1/health'),
            ),
            if (info.healthCheckResult != null) ...[
              const SizedBox(height: 16),
              Text(info.healthCheckResult!, textAlign: TextAlign.center),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(width: 16),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
