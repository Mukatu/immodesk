// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'current_role_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Rôle de l'utilisateur dans l'organisation courante — dérivé de la liste
/// des appartenances (`GET /v1/me`) et de l'organisation sélectionnée
/// localement. `null` tant que l'un des deux n'est pas encore résolu.

@ProviderFor(currentRole)
final currentRoleProvider = CurrentRoleProvider._();

/// Rôle de l'utilisateur dans l'organisation courante — dérivé de la liste
/// des appartenances (`GET /v1/me`) et de l'organisation sélectionnée
/// localement. `null` tant que l'un des deux n'est pas encore résolu.

final class CurrentRoleProvider
    extends $FunctionalProvider<AsyncValue<Role?>, Role?, FutureOr<Role?>>
    with $FutureModifier<Role?>, $FutureProvider<Role?> {
  /// Rôle de l'utilisateur dans l'organisation courante — dérivé de la liste
  /// des appartenances (`GET /v1/me`) et de l'organisation sélectionnée
  /// localement. `null` tant que l'un des deux n'est pas encore résolu.
  CurrentRoleProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'currentRoleProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$currentRoleHash();

  @$internal
  @override
  $FutureProviderElement<Role?> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<Role?> create(Ref ref) {
    return currentRole(ref);
  }
}

String _$currentRoleHash() => r'69934885d807002ea833eb581a5fae22e582df9d';

/// Mode démarcheur restreint (`docs/04_plan_de_phases.md` §5.3, épic 5.D) :
/// un `COLLECTOR` ne voit que sa tournée, ses reçus et sa caisse, jamais le
/// portefeuille complet de l'organisation (onglets Immeubles/Locataires,
/// liste de tous les baux).

@ProviderFor(isCollectorMode)
final isCollectorModeProvider = IsCollectorModeProvider._();

/// Mode démarcheur restreint (`docs/04_plan_de_phases.md` §5.3, épic 5.D) :
/// un `COLLECTOR` ne voit que sa tournée, ses reçus et sa caisse, jamais le
/// portefeuille complet de l'organisation (onglets Immeubles/Locataires,
/// liste de tous les baux).

final class IsCollectorModeProvider
    extends $FunctionalProvider<AsyncValue<bool>, bool, FutureOr<bool>>
    with $FutureModifier<bool>, $FutureProvider<bool> {
  /// Mode démarcheur restreint (`docs/04_plan_de_phases.md` §5.3, épic 5.D) :
  /// un `COLLECTOR` ne voit que sa tournée, ses reçus et sa caisse, jamais le
  /// portefeuille complet de l'organisation (onglets Immeubles/Locataires,
  /// liste de tous les baux).
  IsCollectorModeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'isCollectorModeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$isCollectorModeHash();

  @$internal
  @override
  $FutureProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<bool> create(Ref ref) {
    return isCollectorMode(ref);
  }
}

String _$isCollectorModeHash() => r'e50c0a7814e13cf5774fa01a337d6bebe9c78b91';
