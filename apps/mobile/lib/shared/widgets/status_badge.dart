import 'package:flutter/material.dart';

enum StatusBadgeTone { success, warning, danger, neutral, info }

/// Badge de statut : la couleur n'est jamais le seul porteur d'information
/// (libellé toujours présent), conformément à la règle d'accessibilité du
/// design system.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.tone = StatusBadgeTone.neutral,
  });

  final String label;
  final StatusBadgeTone tone;

  Color _background(ColorScheme scheme) => switch (tone) {
    StatusBadgeTone.success => scheme.primaryContainer,
    StatusBadgeTone.warning => scheme.tertiaryContainer,
    StatusBadgeTone.danger => scheme.errorContainer,
    StatusBadgeTone.info => scheme.secondaryContainer,
    StatusBadgeTone.neutral => scheme.surfaceContainerHighest,
  };

  Color _foreground(ColorScheme scheme) => switch (tone) {
    StatusBadgeTone.success => scheme.onPrimaryContainer,
    StatusBadgeTone.warning => scheme.onTertiaryContainer,
    StatusBadgeTone.danger => scheme.onErrorContainer,
    StatusBadgeTone.info => scheme.onSecondaryContainer,
    StatusBadgeTone.neutral => scheme.onSurfaceVariant,
  };

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: _background(scheme),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _foreground(scheme),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
