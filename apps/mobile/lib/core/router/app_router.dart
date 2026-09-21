import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/otp_verification_screen.dart';
import '../../features/auth/presentation/screens/phone_entry_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/cash/presentation/screens/ma_caisse_screen.dart';
import '../../features/cash/presentation/screens/remittance_creation_screen.dart';
import '../../features/cash/presentation/screens/remittance_list_screen.dart';
import '../../features/collection/domain/entities/cash_receipt_result.dart';
import '../../features/collection/presentation/screens/collection_round_screen.dart';
import '../../features/collection/presentation/screens/confirmation_screen.dart';
import '../../features/collection/presentation/screens/encaissement_screen.dart';
import '../../features/diagnostics/presentation/screens/diagnostics_screen.dart';
import '../../features/dunning/presentation/screens/dunning_history_screen.dart';
import '../../features/home/presentation/screens/home_screen.dart';
import '../../features/inspections/presentation/screens/inspection_room_screen.dart';
import '../../features/inspections/presentation/screens/inspection_setup_screen.dart';
import '../../features/inspections/presentation/screens/inspection_signature_screen.dart';
import '../../features/landlord_portal/presentation/screens/landlord_collections_screen.dart';
import '../../features/landlord_portal/presentation/screens/landlord_home_screen.dart';
import '../../features/landlord_portal/presentation/screens/landlord_more_screen.dart';
import '../../features/landlord_portal/presentation/screens/landlord_payouts_screen.dart';
import '../../features/landlord_portal/presentation/screens/landlord_receipts_screen.dart';
import '../../features/landlord_portal/presentation/screens/landlord_statements_screen.dart';
import '../../features/landlord_portal/presentation/widgets/landlord_bottom_nav_shell.dart';
import '../../features/leases/domain/entities/lease_summary.dart';
import '../../features/leases/presentation/screens/lease_detail_screen.dart';
import '../../features/leases/presentation/screens/leases_list_screen.dart';
import '../../features/mandates/presentation/screens/mandate_detail_screen.dart';
import '../../features/maintenance/presentation/screens/maintenance_detail_screen.dart';
import '../../features/maintenance/presentation/screens/maintenance_list_screen.dart';
import '../../features/maintenance/presentation/screens/maintenance_update_screen.dart';
import '../../features/meters/domain/entities/meter.dart';
import '../../features/meters/presentation/screens/meter_reading_screen.dart';
import '../../features/meters/presentation/screens/meter_selection_screen.dart';
import '../../features/more/presentation/screens/more_screen.dart';
import '../../features/onboarding/presentation/screens/manager_onboarding_screen.dart';
import '../../features/organizations/presentation/screens/organization_create_screen.dart';
import '../../features/organizations/presentation/screens/organization_select_screen.dart';
import '../../features/payments/presentation/screens/bank_transfer_declaration_screen.dart';
import '../../features/payments/presentation/screens/momo_aggregator_screen.dart';
import '../../features/payments/presentation/screens/momo_declaration_screen.dart';
import '../../features/payments/presentation/screens/payment_method_choice_screen.dart';
import '../../features/portfolio/presentation/screens/properties_list_screen.dart';
import '../../features/portfolio/presentation/screens/property_detail_screen.dart';
import '../../features/portfolio/presentation/screens/tenant_detail_screen.dart';
import '../../features/portfolio/presentation/screens/tenants_list_screen.dart';
import '../../features/portfolio/presentation/screens/unit_detail_screen.dart';
import '../../features/referral/presentation/screens/commissions_list_screen.dart';
import '../../features/referral/presentation/screens/property_lead_confirmation_screen.dart';
import '../../features/referral/presentation/screens/property_lead_form_screen.dart';
import '../../features/referral/presentation/screens/referral_partner_screen.dart';
import '../../features/referral/presentation/screens/referrals_list_screen.dart';
import '../../features/sync/presentation/screens/outbox_screen.dart';
import '../../shared/widgets/app_bottom_nav_shell.dart';
import '../../shared/widgets/lease_picker_screen.dart';
import 'route_paths.dart';

/// Navigation `go_router`. La logique de redirection (connecté / bon
/// organisme sélectionné) est portée par [SplashScreen] et par les
/// actions explicites de chaque écran, afin de rester prévisible et
/// testable sans dépendre d'un état global asynchrone dans `redirect`.
///
/// Les onglets bas (Accueil / Immeubles / Locataires / Plus) sont portés
/// par un `StatefulShellRoute` : chaque branche garde sa propre pile de
/// navigation (voir `AppBottomNavShell`).
final Provider<GoRouter> appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RoutePaths.splash,
    routes: [
      GoRoute(
        path: RoutePaths.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RoutePaths.loginPhone,
        builder: (context, state) => const PhoneEntryScreen(),
      ),
      GoRoute(
        path: RoutePaths.loginOtp,
        builder: (context, state) => const OtpVerificationScreen(),
      ),
      GoRoute(
        path: RoutePaths.organizationSelect,
        builder: (context, state) => const OrganizationSelectScreen(),
      ),
      GoRoute(
        path: RoutePaths.organizationCreate,
        builder: (context, state) => const OrganizationCreateScreen(),
      ),
      GoRoute(
        path: RoutePaths.diagnostics,
        builder: (context, state) => const DiagnosticsScreen(),
      ),
      GoRoute(
        path: RoutePaths.managerOnboarding,
        builder: (context, state) => const ManagerOnboardingScreen(),
      ),
      GoRoute(
        path: RoutePaths.mandateDetailPattern,
        builder: (context, state) =>
            MandateDetailScreen(mandateId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: RoutePaths.dunningHistoryPattern,
        builder: (context, state) => DunningHistoryScreen(
          tenantId: state.pathParameters['tenantId']!,
          invoiceId: state.uri.queryParameters['invoiceId'],
        ),
      ),
      GoRoute(
        path: RoutePaths.referralPartner,
        builder: (context, state) => const ReferralPartnerScreen(),
      ),
      GoRoute(
        path: RoutePaths.referralPropertyLead,
        builder: (context, state) => const PropertyLeadFormScreen(),
      ),
      GoRoute(
        path: RoutePaths.referralReferrals,
        builder: (context, state) => const ReferralsListScreen(),
      ),
      GoRoute(
        path: RoutePaths.referralCommissions,
        builder: (context, state) => const CommissionsListScreen(),
      ),
      // Route PUBLIQUE (confirmation bailleur) : pas de garde d'auth ici,
      // conformément à `docs/api/phase10-contract.md` (confirm-otp public).
      GoRoute(
        path: RoutePaths.referralConfirmationPattern,
        builder: (context, state) => PropertyLeadConfirmationScreen(
          propertyLeadId: state.pathParameters['id']!,
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            LandlordBottomNavShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.landlordHome,
                builder: (context, state) => const LandlordHomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.landlordStatements,
                builder: (context, state) => const LandlordStatementsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.landlordPayouts,
                builder: (context, state) => const LandlordPayoutsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.landlordMore,
                builder: (context, state) => const LandlordMoreScreen(),
                routes: [
                  GoRoute(
                    path: 'encaissements',
                    builder: (context, state) =>
                        const LandlordCollectionsScreen(),
                  ),
                  GoRoute(
                    path: 'quittances',
                    builder: (context, state) => const LandlordReceiptsScreen(),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppBottomNavShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.home,
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.properties,
                builder: (context, state) => const PropertiesListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => PropertyDetailScreen(
                      propertyId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
              GoRoute(
                path: RoutePaths.unitDetailPattern,
                builder: (context, state) =>
                    UnitDetailScreen(unitId: state.pathParameters['id']!),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.tenants,
                builder: (context, state) => const TenantsListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) => TenantDetailScreen(
                      tenantId: state.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.more,
                builder: (context, state) => const MoreScreen(),
              ),
              GoRoute(
                path: RoutePaths.leases,
                builder: (context, state) => const LeasesListScreen(),
                routes: [
                  GoRoute(
                    path: ':id',
                    builder: (context, state) =>
                        LeaseDetailScreen(leaseId: state.pathParameters['id']!),
                  ),
                ],
              ),
              GoRoute(
                path: RoutePaths.collectionRound,
                builder: (context, state) => const CollectionRoundScreen(),
              ),
              GoRoute(
                path: RoutePaths.collectionEncaissementPattern,
                builder: (context, state) => EncaissementScreen(
                  invoiceId: state.pathParameters['invoiceId']!,
                ),
              ),
              GoRoute(
                path: RoutePaths.collectionConfirmationPattern,
                builder: (context, state) => ConfirmationScreen(
                  result: state.extra! as CashReceiptResult,
                ),
              ),
              GoRoute(
                path: RoutePaths.paymentMethodChoicePattern,
                builder: (context, state) => PaymentMethodChoiceScreen(
                  invoiceId: state.pathParameters['invoiceId']!,
                ),
              ),
              GoRoute(
                path: RoutePaths.momoDeclarationPattern,
                builder: (context, state) => MomoDeclarationScreen(
                  invoiceId: state.pathParameters['invoiceId']!,
                ),
              ),
              GoRoute(
                path: RoutePaths.bankTransferDeclarationPattern,
                builder: (context, state) => BankTransferDeclarationScreen(
                  invoiceId: state.pathParameters['invoiceId']!,
                ),
              ),
              GoRoute(
                path: RoutePaths.momoAggregatorPattern,
                builder: (context, state) => MomoAggregatorScreen(
                  invoiceId: state.pathParameters['invoiceId']!,
                ),
              ),
              GoRoute(
                path: RoutePaths.cashHome,
                builder: (context, state) => const MaCaisseScreen(),
              ),
              GoRoute(
                path: RoutePaths.cashRemittanceNew,
                builder: (context, state) => const RemittanceCreationScreen(),
              ),
              GoRoute(
                path: RoutePaths.cashRemittances,
                builder: (context, state) => const RemittanceListScreen(),
              ),
              GoRoute(
                path: RoutePaths.outbox,
                builder: (context, state) => const OutboxScreen(),
              ),
              GoRoute(
                path: RoutePaths.inspectionLotPicker,
                builder: (context, state) => LeasePickerScreen(
                  title: 'État des lieux — choisir un lot',
                  destinationPath: (_) => RoutePaths.inspectionSetup,
                ),
              ),
              GoRoute(
                path: RoutePaths.inspectionSetup,
                builder: (context, state) =>
                    InspectionSetupScreen(lease: state.extra! as LeaseSummary),
              ),
              GoRoute(
                path: RoutePaths.inspectionRooms,
                builder: (context, state) => const InspectionRoomScreen(),
              ),
              GoRoute(
                path: RoutePaths.inspectionSignature,
                builder: (context, state) => const InspectionSignatureScreen(),
              ),
              GoRoute(
                path: RoutePaths.meterLotPicker,
                builder: (context, state) => LeasePickerScreen(
                  title: 'Relever un compteur — choisir un lot',
                  destinationPath: (_) => RoutePaths.meterSelection,
                ),
              ),
              GoRoute(
                path: RoutePaths.meterSelection,
                builder: (context, state) => MeterSelectionScreen(
                  unitId: (state.extra! as LeaseSummary).unit.id,
                ),
              ),
              GoRoute(
                path: RoutePaths.meterReading,
                builder: (context, state) =>
                    MeterReadingScreen(meter: state.extra! as Meter),
              ),
              GoRoute(
                path: RoutePaths.maintenanceList,
                builder: (context, state) => const MaintenanceListScreen(),
              ),
              GoRoute(
                path: RoutePaths.maintenanceDetailPattern,
                builder: (context, state) =>
                    MaintenanceDetailScreen(id: state.pathParameters['id']!),
              ),
              GoRoute(
                path: RoutePaths.maintenanceUpdatePattern,
                builder: (context, state) => MaintenanceUpdateScreen(
                  requestId: state.pathParameters['id']!,
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
