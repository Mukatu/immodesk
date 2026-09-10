import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/portfolio/domain/entities/tenant.dart';
import 'package:immodesk_mobile/features/portfolio/presentation/controllers/tenants_list_controller.dart';

const Tenant _alice = Tenant(
  id: 't-1',
  displayName: 'Alice Ndongô',
  primaryPhone: '+242066000001',
);
const Tenant _jean = Tenant(
  id: 't-2',
  displayName: 'Jean-Éric Malonga',
  primaryPhone: '+242055123456',
);

void main() {
  group('TenantsListState.filteredTenants (recherche locale)', () {
    const TenantsListState state = TenantsListState(
      allTenants: [_alice, _jean],
    );

    test('sans recherche, tous les locataires sont affichés', () {
      expect(state.filteredTenants, hasLength(2));
    });

    test('recherche par nom sans accent trouve un nom accentué', () {
      final result = state.copyWith(query: 'ndongo').filteredTenants;
      expect(result, [_alice]);
    });

    test('recherche insensible à la casse et aux tirets', () {
      final result = state.copyWith(query: 'jean eric').filteredTenants;
      expect(result, [_jean]);
    });

    test('recherche par numéro de téléphone', () {
      final result = state.copyWith(query: '055123456').filteredTenants;
      expect(result, [_jean]);
    });

    test('aucun résultat pour une recherche sans correspondance', () {
      final result = state.copyWith(query: 'inexistant').filteredTenants;
      expect(result, isEmpty);
    });
  });
}
