import 'package:freezed_annotation/freezed_annotation.dart';

part 'tenant.freezed.dart';
part 'tenant.g.dart';

/// `Tenant` du contrat de phase 1. Le champ `displayName` est calculé
/// côté serveur (personne physique ou morale) : l'application ne
/// recompose jamais de nom à partir de `firstName`/`lastName`.
///
/// Remarque : en phase 1, aucun bail n'existe encore côté API (voir
/// `docs/api/phase1-contract.md`, règles transverses) — un locataire n'est
/// donc pas rattaché à un lot pour l'instant. Le rattachement arrivera
/// avec la gestion des baux (phase ultérieure).
@freezed
abstract class Tenant with _$Tenant {
  const factory Tenant({
    required String id,
    required String displayName,
    required String primaryPhone,
    String? secondaryPhone,
    String? whatsappPhone,
    String? email,
    String? addressLine,
    String? district,
    String? city,
  }) = _Tenant;

  factory Tenant.fromJson(Map<String, dynamic> json) => _$TenantFromJson(json);
}
