import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../../core/db/app_database.dart';
import '../../../../core/storage/app_settings_keys.dart';

part 'selected_organization_controller.g.dart';

/// Organisation courante, persistée localement (table Drift `app_settings`)
/// afin de survivre au redémarrage de l'application.
@riverpod
class SelectedOrganizationController extends _$SelectedOrganizationController {
  @override
  Future<String?> build() async {
    final AppDatabase db = ref.watch(appDatabaseProvider);
    return db.getSetting(AppSettingsKeys.selectedOrganizationId);
  }

  Future<void> select(String organizationId) async {
    final AppDatabase db = ref.read(appDatabaseProvider);
    await db.setSetting(
      AppSettingsKeys.selectedOrganizationId,
      organizationId,
    );
    state = AsyncData<String?>(organizationId);
  }

  Future<void> clear() async {
    final AppDatabase db = ref.read(appDatabaseProvider);
    await db.deleteSetting(AppSettingsKeys.selectedOrganizationId);
    state = const AsyncData<String?>(null);
  }
}
