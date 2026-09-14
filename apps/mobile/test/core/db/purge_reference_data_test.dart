import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';

void main() {
  late AppDatabase db;

  setUp(() => db = AppDatabase.forTesting(NativeDatabase.memory()));
  tearDown(() => db.close());

  test(
    'purgeReferenceData efface les référentiels mais épargne l\'outbox',
    () async {
      const String orgId = 'org-1';

      await db.replaceCachedProperties(orgId, [
        CachedPropertyRow(
          id: 'p1',
          organizationId: orgId,
          name: 'Immeuble A',
          city: 'Brazzaville',
          payload: '{}',
          cachedAt: DateTime.now(),
        ),
      ]);
      await db.replaceCachedTenants(orgId, [
        CachedTenantRow(
          id: 't1',
          organizationId: orgId,
          displayName: 'Jean',
          phone: '+242060000000',
          normalizedSearchText: 'jean',
          payload: '{}',
          cachedAt: DateTime.now(),
        ),
      ]);
      await db
          .into(db.outbox)
          .insert(
            OutboxCompanion.insert(
              clientRef: 'ref-1',
              organizationId: orgId,
              operation: 'CASH_RECEIPT',
              payload: '{"amount":1000}',
            ),
          );

      await db.purgeReferenceData(orgId);

      expect(await db.getCachedProperties(orgId), isEmpty);
      expect(await db.getCachedTenants(orgId), isEmpty);

      final List<OutboxRow> outboxRows = await db.select(db.outbox).get();
      expect(outboxRows, hasLength(1));
      expect(outboxRows.single.clientRef, 'ref-1');
    },
  );
}
