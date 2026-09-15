// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'landlord_invitation_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Envoi de l'invitation WhatsApp du bailleur depuis la fiche du mandat
/// (`POST /v1/management-mandates/{id}/landlord-invitation`). Le message
/// est envoyé par l'API (canal WhatsApp), le mobile ne fait qu'exposer le
/// bouton et le statut résultant.

@ProviderFor(LandlordInvitationController)
final landlordInvitationControllerProvider =
    LandlordInvitationControllerFamily._();

/// Envoi de l'invitation WhatsApp du bailleur depuis la fiche du mandat
/// (`POST /v1/management-mandates/{id}/landlord-invitation`). Le message
/// est envoyé par l'API (canal WhatsApp), le mobile ne fait qu'exposer le
/// bouton et le statut résultant.
final class LandlordInvitationControllerProvider
    extends $AsyncNotifierProvider<LandlordInvitationController, void> {
  /// Envoi de l'invitation WhatsApp du bailleur depuis la fiche du mandat
  /// (`POST /v1/management-mandates/{id}/landlord-invitation`). Le message
  /// est envoyé par l'API (canal WhatsApp), le mobile ne fait qu'exposer le
  /// bouton et le statut résultant.
  LandlordInvitationControllerProvider._({
    required LandlordInvitationControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'landlordInvitationControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$landlordInvitationControllerHash();

  @override
  String toString() {
    return r'landlordInvitationControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  LandlordInvitationController create() => LandlordInvitationController();

  @override
  bool operator ==(Object other) {
    return other is LandlordInvitationControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$landlordInvitationControllerHash() =>
    r'cdfc0d9f1f1dbabeef946231390231744a129f64';

/// Envoi de l'invitation WhatsApp du bailleur depuis la fiche du mandat
/// (`POST /v1/management-mandates/{id}/landlord-invitation`). Le message
/// est envoyé par l'API (canal WhatsApp), le mobile ne fait qu'exposer le
/// bouton et le statut résultant.

final class LandlordInvitationControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          LandlordInvitationController,
          AsyncValue<void>,
          void,
          FutureOr<void>,
          String
        > {
  LandlordInvitationControllerFamily._()
    : super(
        retry: null,
        name: r'landlordInvitationControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Envoi de l'invitation WhatsApp du bailleur depuis la fiche du mandat
  /// (`POST /v1/management-mandates/{id}/landlord-invitation`). Le message
  /// est envoyé par l'API (canal WhatsApp), le mobile ne fait qu'exposer le
  /// bouton et le statut résultant.

  LandlordInvitationControllerProvider call(String mandateId) =>
      LandlordInvitationControllerProvider._(argument: mandateId, from: this);

  @override
  String toString() => r'landlordInvitationControllerProvider';
}

/// Envoi de l'invitation WhatsApp du bailleur depuis la fiche du mandat
/// (`POST /v1/management-mandates/{id}/landlord-invitation`). Le message
/// est envoyé par l'API (canal WhatsApp), le mobile ne fait qu'exposer le
/// bouton et le statut résultant.

abstract class _$LandlordInvitationController extends $AsyncNotifier<void> {
  late final _$args = ref.$arg as String;
  String get mandateId => _$args;

  FutureOr<void> build(String mandateId);
  @$mustCallSuper
  @override
  void runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, void>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    element.handleCreate(ref, () => build(_$args));
  }
}
