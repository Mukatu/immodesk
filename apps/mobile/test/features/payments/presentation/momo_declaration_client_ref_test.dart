import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/core/connectivity/connectivity_service.dart';
import 'package:immodesk_mobile/core/db/app_database.dart';
import 'package:immodesk_mobile/core/network/dio_provider.dart';
import 'package:immodesk_mobile/features/organizations/presentation/controllers/selected_organization_controller.dart';
import 'package:immodesk_mobile/features/payments/presentation/controllers/momo_declaration_controller.dart';
import 'package:mocktail/mocktail.dart';

class _MockDio extends Mock implements Dio {}

class _FakeSelectedOrganizationController
    extends SelectedOrganizationController {
  @override
  Future<String?> build() async => 'org-1';
}

class _OnlineConnectivityService extends ConnectivityService {
  const _OnlineConnectivityService();

  @override
  Future<bool> isOffline() async => false;
}

const Map<String, dynamic> _invoicesResponse = {
  'items': [
    {
      'id': 'inv-1',
      'invoiceNumber': 'LOY-202601-0001',
      'status': 'ISSUED',
      'lease': {'id': 'lease-1', 'reference': 'BAIL-1'},
      'tenant': {
        'id': 'tenant-1',
        'displayName': 'Alice Ndongo',
        'primaryPhone': '+242066000002',
      },
      'unit': {'id': 'unit-1', 'code': 'A01'},
      'property': {'id': 'prop-1', 'name': 'Résidence Malonga'},
      'periodStart': '2026-01-01',
      'periodEnd': '2026-01-31',
      'dueDate': '2026-01-05',
      'totalAmount': 50000,
      'paidAmount': 0,
      'balanceAmount': 50000,
    },
  ],
  'pageInfo': {'nextCursor': null, 'hasNextPage': false, 'limit': 200},
};

const Map<String, dynamic> _paymentInstructionsResponse = {
  'transferReference': 'LOY-202601-0001',
  'bankAccounts': [],
  'mobileMoneyNumbers': [
    {
      'bankAccountId': 'bank-1',
      'provider': 'MTN_MOMO',
      'msisdn': '+242066111111',
      'holderName': 'Agence Malonga',
    },
  ],
  'aggregatorAvailable': false,
};

Map<String, dynamic> _declarationResponse(String clientRef) => {
  'id': 'momo-1',
  'channel': 'DECLARED',
  'status': 'DECLARED',
  'provider': 'MTN_MOMO',
  'payerMsisdn': '+242066222222',
  'payeeMsisdn': '+242066111111',
  'amount': 50000,
  'clientRef': clientRef,
};

void main() {
  test(
    'conserve le même clientRef entre deux tentatives après un échec',
    () async {
      final mockDio = _MockDio();
      final database = AppDatabase.forTesting(NativeDatabase.memory());
      addTearDown(database.close);

      when(
        () => mockDio.get<dynamic>(
          '/invoices',
          queryParameters: any(named: 'queryParameters'),
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => Response<dynamic>(
          requestOptions: RequestOptions(path: '/invoices'),
          statusCode: 200,
          data: _invoicesResponse,
        ),
      );
      when(
        () => mockDio.get<dynamic>(
          '/invoices/inv-1/payment-instructions',
          options: any(named: 'options'),
        ),
      ).thenAnswer(
        (_) async => Response<dynamic>(
          requestOptions: RequestOptions(
            path: '/invoices/inv-1/payment-instructions',
          ),
          statusCode: 200,
          data: _paymentInstructionsResponse,
        ),
      );

      int callCount = 0;
      final List<String> capturedClientRefs = [];
      when(
        () => mockDio.post<dynamic>(
          '/payments/mobile-money/declarations',
          data: any(named: 'data'),
          options: any(named: 'options'),
        ),
      ).thenAnswer((invocation) async {
        final Map<String, dynamic> body =
            invocation.namedArguments[#data] as Map<String, dynamic>;
        capturedClientRefs.add(body['clientRef'] as String);
        callCount += 1;
        if (callCount == 1) {
          throw DioException(
            requestOptions: RequestOptions(
              path: '/payments/mobile-money/declarations',
            ),
            type: DioExceptionType.connectionError,
          );
        }
        return Response<dynamic>(
          requestOptions: RequestOptions(
            path: '/payments/mobile-money/declarations',
          ),
          statusCode: 201,
          data: _declarationResponse(body['clientRef'] as String),
        );
      });

      final container = ProviderContainer(
        overrides: [
          dioProvider.overrideWithValue(mockDio),
          appDatabaseProvider.overrideWithValue(database),
          selectedOrganizationControllerProvider.overrideWith(
            _FakeSelectedOrganizationController.new,
          ),
          connectivityServiceProvider.overrideWithValue(
            const _OnlineConnectivityService(),
          ),
        ],
      );
      addTearDown(container.dispose);

      final provider = momoDeclarationControllerProvider('inv-1');
      final initial = await container.read(provider.future);
      final String initialClientRef = initial.clientRef;
      expect(initialClientRef, isNotEmpty);

      final notifier = container.read(provider.notifier);
      notifier.setPayerMsisdn('+242066222222');
      notifier.setOperatorReference('mp240101.1234.a56789');
      notifier.setAmount(50000);

      await notifier.submit();
      expect(container.read(provider).value!.clientRef, initialClientRef);
      expect(container.read(provider).value!.errorMessage, isNotNull);

      await notifier.submit();

      expect(capturedClientRefs, hasLength(2));
      expect(capturedClientRefs[0], initialClientRef);
      expect(capturedClientRefs[1], initialClientRef);
      expect(container.read(provider).value!.result, isNotNull);
    },
  );
}
