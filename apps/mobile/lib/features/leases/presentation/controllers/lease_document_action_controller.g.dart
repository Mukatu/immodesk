// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lease_document_action_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Téléchargement (dans le répertoire temporaire), partage (`share_plus`)
/// et ouverture (`open_filex`) d'un document de bail précis. Un contrôleur
/// par document (`documentAssociationId` = `LeaseDocument.id`).

@ProviderFor(LeaseDocumentActionController)
final leaseDocumentActionControllerProvider =
    LeaseDocumentActionControllerFamily._();

/// Téléchargement (dans le répertoire temporaire), partage (`share_plus`)
/// et ouverture (`open_filex`) d'un document de bail précis. Un contrôleur
/// par document (`documentAssociationId` = `LeaseDocument.id`).
final class LeaseDocumentActionControllerProvider
    extends
        $NotifierProvider<
          LeaseDocumentActionController,
          LeaseDocumentActionState
        > {
  /// Téléchargement (dans le répertoire temporaire), partage (`share_plus`)
  /// et ouverture (`open_filex`) d'un document de bail précis. Un contrôleur
  /// par document (`documentAssociationId` = `LeaseDocument.id`).
  LeaseDocumentActionControllerProvider._({
    required LeaseDocumentActionControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'leaseDocumentActionControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$leaseDocumentActionControllerHash();

  @override
  String toString() {
    return r'leaseDocumentActionControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  LeaseDocumentActionController create() => LeaseDocumentActionController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LeaseDocumentActionState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LeaseDocumentActionState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is LeaseDocumentActionControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$leaseDocumentActionControllerHash() =>
    r'8ae13631e331a039df99b1a8154052efba232a93';

/// Téléchargement (dans le répertoire temporaire), partage (`share_plus`)
/// et ouverture (`open_filex`) d'un document de bail précis. Un contrôleur
/// par document (`documentAssociationId` = `LeaseDocument.id`).

final class LeaseDocumentActionControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          LeaseDocumentActionController,
          LeaseDocumentActionState,
          LeaseDocumentActionState,
          LeaseDocumentActionState,
          String
        > {
  LeaseDocumentActionControllerFamily._()
    : super(
        retry: null,
        name: r'leaseDocumentActionControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Téléchargement (dans le répertoire temporaire), partage (`share_plus`)
  /// et ouverture (`open_filex`) d'un document de bail précis. Un contrôleur
  /// par document (`documentAssociationId` = `LeaseDocument.id`).

  LeaseDocumentActionControllerProvider call(String documentAssociationId) =>
      LeaseDocumentActionControllerProvider._(
        argument: documentAssociationId,
        from: this,
      );

  @override
  String toString() => r'leaseDocumentActionControllerProvider';
}

/// Téléchargement (dans le répertoire temporaire), partage (`share_plus`)
/// et ouverture (`open_filex`) d'un document de bail précis. Un contrôleur
/// par document (`documentAssociationId` = `LeaseDocument.id`).

abstract class _$LeaseDocumentActionController
    extends $Notifier<LeaseDocumentActionState> {
  late final _$args = ref.$arg as String;
  String get documentAssociationId => _$args;

  LeaseDocumentActionState build(String documentAssociationId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref =
        this.ref as $Ref<LeaseDocumentActionState, LeaseDocumentActionState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<LeaseDocumentActionState, LeaseDocumentActionState>,
              LeaseDocumentActionState,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
