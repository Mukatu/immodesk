// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'maintenance_update_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Pilote l'ajout d'une mise à jour terrain à une demande de maintenance :
/// commentaire, changement de statut, photo — en ligne ou hors ligne
/// (`MAINTENANCE_UPDATE`, comme l'encaissement).

@ProviderFor(MaintenanceUpdateController)
final maintenanceUpdateControllerProvider =
    MaintenanceUpdateControllerFamily._();

/// Pilote l'ajout d'une mise à jour terrain à une demande de maintenance :
/// commentaire, changement de statut, photo — en ligne ou hors ligne
/// (`MAINTENANCE_UPDATE`, comme l'encaissement).
final class MaintenanceUpdateControllerProvider
    extends
        $NotifierProvider<MaintenanceUpdateController, MaintenanceUpdateState> {
  /// Pilote l'ajout d'une mise à jour terrain à une demande de maintenance :
  /// commentaire, changement de statut, photo — en ligne ou hors ligne
  /// (`MAINTENANCE_UPDATE`, comme l'encaissement).
  MaintenanceUpdateControllerProvider._({
    required MaintenanceUpdateControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'maintenanceUpdateControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$maintenanceUpdateControllerHash();

  @override
  String toString() {
    return r'maintenanceUpdateControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  MaintenanceUpdateController create() => MaintenanceUpdateController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(MaintenanceUpdateState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<MaintenanceUpdateState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is MaintenanceUpdateControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$maintenanceUpdateControllerHash() =>
    r'fb47e3ca5dea24009f6279067bc29f61e24eca36';

/// Pilote l'ajout d'une mise à jour terrain à une demande de maintenance :
/// commentaire, changement de statut, photo — en ligne ou hors ligne
/// (`MAINTENANCE_UPDATE`, comme l'encaissement).

final class MaintenanceUpdateControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          MaintenanceUpdateController,
          MaintenanceUpdateState,
          MaintenanceUpdateState,
          MaintenanceUpdateState,
          String
        > {
  MaintenanceUpdateControllerFamily._()
    : super(
        retry: null,
        name: r'maintenanceUpdateControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Pilote l'ajout d'une mise à jour terrain à une demande de maintenance :
  /// commentaire, changement de statut, photo — en ligne ou hors ligne
  /// (`MAINTENANCE_UPDATE`, comme l'encaissement).

  MaintenanceUpdateControllerProvider call(String requestId) =>
      MaintenanceUpdateControllerProvider._(argument: requestId, from: this);

  @override
  String toString() => r'maintenanceUpdateControllerProvider';
}

/// Pilote l'ajout d'une mise à jour terrain à une demande de maintenance :
/// commentaire, changement de statut, photo — en ligne ou hors ligne
/// (`MAINTENANCE_UPDATE`, comme l'encaissement).

abstract class _$MaintenanceUpdateController
    extends $Notifier<MaintenanceUpdateState> {
  late final _$args = ref.$arg as String;
  String get requestId => _$args;

  MaintenanceUpdateState build(String requestId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<MaintenanceUpdateState, MaintenanceUpdateState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<MaintenanceUpdateState, MaintenanceUpdateState>,
              MaintenanceUpdateState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
