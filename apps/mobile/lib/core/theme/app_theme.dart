import 'package:flutter/material.dart';

/// Thème Material 3 sobre d'Immodesk : vert principal, ocre en accent,
/// cohérent avec le design system du web (dashboard Next.js).
abstract final class AppTheme {
  static const Color _seedGreen = Color(0xFF2F6B3C);
  static const Color _ocre = Color(0xFFC97F1F);

  static ThemeData light() {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: _seedGreen,
      brightness: Brightness.light,
    ).copyWith(secondary: _ocre, onSecondary: Colors.white);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorScheme.surface,
      appBarTheme: AppBarTheme(
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
        filled: true,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: colorScheme.outlineVariant),
        ),
      ),
    );
  }
}
