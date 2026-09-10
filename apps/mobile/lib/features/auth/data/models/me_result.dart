import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../organizations/domain/entities/organization_membership.dart';
import '../../domain/entities/app_user.dart';

part 'me_result.freezed.dart';
part 'me_result.g.dart';

/// Réponse de `GET /v1/me`.
@freezed
abstract class MeResult with _$MeResult {
  const factory MeResult({
    required AppUser user,
    required List<OrganizationMembership> organizations,
  }) = _MeResult;

  factory MeResult.fromJson(Map<String, dynamic> json) =>
      _$MeResultFromJson(json);
}
