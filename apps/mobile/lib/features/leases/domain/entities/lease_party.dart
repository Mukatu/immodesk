import 'package:freezed_annotation/freezed_annotation.dart';

import 'lease_party_role.dart';

part 'lease_party.freezed.dart';
part 'lease_party.g.dart';

/// `LeaseParty` du contrat de phase 2 : une partie signataire du bail
/// (locataire principal, colocataire, garant ou occupant déclaré).
@freezed
abstract class LeaseParty with _$LeaseParty {
  const factory LeaseParty({
    required String id,
    required String leaseId,
    required LeasePartyRole role,
    required String displayName,
    String? tenantId,
    String? guarantorId,
    @Default(10000) int shareBps,
    @Default(true) bool isSolidary,
    String? signedAt,
  }) = _LeaseParty;

  factory LeaseParty.fromJson(Map<String, dynamic> json) =>
      _$LeasePartyFromJson(json);
}

extension LeasePartyDisplay on LeaseParty {
  /// Quote-part du loyer en pourcentage entier, ex. `50 %`.
  String get sharePercentLabel => '${(shareBps / 100).round()} %';
}
