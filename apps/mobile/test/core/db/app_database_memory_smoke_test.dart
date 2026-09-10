import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';

/// Vérifie qu'une base Drift en mémoire fonctionne dans l'environnement de
/// test (utilisée pour isoler les tests du cache portefeuille du disque).
void main() {
  test('AppDatabase.forTesting fonctionne avec une base en mémoire', () async {
    final AppDatabase db = AppDatabase.forTesting(NativeDatabase.memory());
    await db.setSetting('k', 'v');
    expect(await db.getSetting('k'), 'v');
    await db.close();
  });
}
