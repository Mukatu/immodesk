import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Bandeau affiché quand un écran montre la dernière copie du cache local
/// plutôt que des données fraîches du réseau.
class OfflineDataBanner extends StatelessWidget {
  const OfflineDataBanner({super.key, required this.cachedAt});

  final DateTime? cachedAt;

  @override
  Widget build(BuildContext context) {
    final String label = cachedAt != null
        ? 'Données du ${DateFormat('dd/MM/yyyy à HH:mm').format(cachedAt!)}'
        : 'Données hors ligne';
    return Container(
      key: const ValueKey('offline-data-banner'),
      width: double.infinity,
      color: Theme.of(context).colorScheme.tertiaryContainer,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(
            Icons.cloud_off_outlined,
            size: 18,
            color: Theme.of(context).colorScheme.onTertiaryContainer,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onTertiaryContainer,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
