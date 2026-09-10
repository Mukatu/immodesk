import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_user.freezed.dart';
part 'app_user.g.dart';

/// Utilisateur global (référentiel commun : `users` est global, les rôles
/// sont portés par `organization_members`).
@freezed
abstract class AppUser with _$AppUser {
  const factory AppUser({
    required String id,
    required String phone,
    required String fullName,
    String? email,
    required String locale,
    required String timezone,
    required DateTime createdAt,
  }) = _AppUser;

  factory AppUser.fromJson(Map<String, dynamic> json) =>
      _$AppUserFromJson(json);
}
