import 'package:freezed_annotation/freezed_annotation.dart';

part 'rent_revision.freezed.dart';
part 'rent_revision.g.dart';

/// `RentRevision` du contrat de phase 2 : historique des révisions de
/// loyer d'un bail (lecture seule côté mobile).
@freezed
abstract class RentRevision with _$RentRevision {
  const factory RentRevision({
    required String id,
    required String leaseId,
    required String effectiveDate,
    required int previousRentAmount,
    required int newRentAmount,
    required int previousChargesAmount,
    required int newChargesAmount,
    String? reason,
  }) = _RentRevision;

  factory RentRevision.fromJson(Map<String, dynamic> json) =>
      _$RentRevisionFromJson(json);
}
