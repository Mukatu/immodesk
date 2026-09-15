import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/payment_method.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/entities/portal_profile.dart';
import 'package:immodesk_mobile/features/landlord_portal/domain/payout_delay_estimate.dart';

const Map<String, dynamic> _landlordCongoJson = {
  'id': 'landlord-1',
  'displayName': 'Jean Makosso',
  'primaryPhone': '+242066000001',
  'city': 'Brazzaville',
  'countryCode': 'CG',
  'payoutMethod': 'MOBILE_MONEY',
};

const Map<String, dynamic> _landlordDiasporaJson = {
  'id': 'landlord-2',
  'displayName': 'Alice Ndongo',
  'primaryPhone': '+33601020304',
  'city': 'Paris',
  'countryCode': 'FR',
  'payoutMethod': 'BANK_TRANSFER',
};

void main() {
  group('PortalLandlord.isDiaspora', () {
    test('faux pour un bailleur au Congo (CG)', () {
      final PortalLandlord landlord = PortalLandlord.fromJson(
        _landlordCongoJson,
      );
      expect(landlord.isDiaspora, isFalse);
    });

    test('vrai pour un bailleur hors du Congo', () {
      final PortalLandlord landlord = PortalLandlord.fromJson(
        _landlordDiasporaJson,
      );
      expect(landlord.isDiaspora, isTrue);
    });

    test('insensible à la casse du code pays', () {
      final PortalLandlord landlord = PortalLandlord.fromJson({
        ..._landlordCongoJson,
        'countryCode': 'cg',
      });
      expect(landlord.isDiaspora, isFalse);
    });
  });

  group('PortalProfile', () {
    test('fromJson combine le bailleur et les organisations', () {
      final PortalProfile profile = PortalProfile.fromJson({
        'landlord': _landlordDiasporaJson,
        'organizations': [
          {'id': 'org-1', 'name': 'Agence Malonga'},
        ],
      });
      expect(profile.landlord.displayName, 'Alice Ndongo');
      expect(profile.organizations.single.name, 'Agence Malonga');
    });
  });

  group('estimatedPayoutDelayLabel', () {
    test('un délai est proposé pour le virement et le Mobile Money', () {
      expect(
        estimatedPayoutDelayLabel(PaymentMethod.bankTransfer),
        contains('international'),
      );
      expect(
        estimatedPayoutDelayLabel(PaymentMethod.mobileMoney),
        contains('Mobile Money'),
      );
    });
  });
}
