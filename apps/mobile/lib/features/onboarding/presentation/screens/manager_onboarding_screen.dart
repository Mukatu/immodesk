import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/phone_number.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/router/route_paths.dart';
import '../../../mandates/domain/entities/commission_basis.dart';
import '../../domain/entities/independent_manager_onboarding_result.dart';
import '../controllers/manager_onboarding_controller.dart';
import '../widgets/onboarding_step_landlord.dart';
import '../widgets/onboarding_step_mandate.dart';
import '../widgets/onboarding_step_organization.dart';
import '../widgets/onboarding_step_property.dart';

/// Parcours d'onboarding du gestionnaire indépendant en quatre écrans
/// brefs (organisation, bailleur, immeuble, mandat), conçu pour tenir en
/// moins de dix minutes (`docs/04_plan_de_phases.md` §7.3, épic 7.F).
class ManagerOnboardingScreen extends ConsumerStatefulWidget {
  const ManagerOnboardingScreen({super.key});

  static const String path = RoutePaths.managerOnboarding;

  @override
  ConsumerState<ManagerOnboardingScreen> createState() =>
      _ManagerOnboardingScreenState();
}

class _ManagerOnboardingScreenState
    extends ConsumerState<ManagerOnboardingScreen> {
  final PageController _pageController = PageController();
  int _step = 0;

  final _orgName = TextEditingController();
  final _orgCity = TextEditingController();
  final _orgPhone = TextEditingController(text: '+242');
  final _landlordFirstName = TextEditingController();
  final _landlordLastName = TextEditingController();
  final _landlordPhone = TextEditingController(text: '+242');
  final _landlordCity = TextEditingController();
  final _landlordCountry = TextEditingController(text: 'CG');
  final _propertyName = TextEditingController();
  final _propertyAddress = TextEditingController();
  final _propertyDistrict = TextEditingController();
  final _propertyCity = TextEditingController();
  final _commissionPercent = TextEditingController(
    text: (defaultIndependentManagerCommissionRateBps / 100).toString(),
  );

  static const int _lastStep = 3;

  @override
  void dispose() {
    _pageController.dispose();
    for (final c in [
      _orgName,
      _orgCity,
      _orgPhone,
      _landlordFirstName,
      _landlordLastName,
      _landlordPhone,
      _landlordCity,
      _landlordCountry,
      _propertyName,
      _propertyAddress,
      _propertyDistrict,
      _propertyCity,
      _commissionPercent,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<void> submitState = ref.watch(
      managerOnboardingControllerProvider,
    );

    ref.listen<AsyncValue<void>>(managerOnboardingControllerProvider, (
      previous,
      next,
    ) {
      next.whenOrNull(
        error: (error, _) {
          final String message = error is ApiException
              ? error.message
              : 'Une erreur est survenue.';
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        },
      );
    });

    final bool isLoading = submitState.isLoading;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Démarrer en tant que gestionnaire'),
        leading: _step == 0
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => _goTo(_step - 1),
              ),
      ),
      body: Column(
        children: [
          LinearProgressIndicator(value: (_step + 1) / (_lastStep + 1)),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                OnboardingStepOrganization(
                  legalName: _orgName,
                  city: _orgCity,
                  phone: _orgPhone,
                ),
                OnboardingStepLandlord(
                  firstName: _landlordFirstName,
                  lastName: _landlordLastName,
                  phone: _landlordPhone,
                  city: _landlordCity,
                  countryCode: _landlordCountry,
                ),
                OnboardingStepProperty(
                  name: _propertyName,
                  addressLine: _propertyAddress,
                  district: _propertyDistrict,
                  city: _propertyCity,
                ),
                OnboardingStepMandate(commissionPercent: _commissionPercent),
              ],
            ),
          ),
          SafeArea(
            minimum: const EdgeInsets.all(24),
            child: FilledButton(
              key: ValueKey(
                _step == _lastStep
                    ? 'onboarding-submit-button'
                    : 'onboarding-next-button',
              ),
              onPressed: isLoading
                  ? null
                  : (_step == _lastStep ? _submit : () => _goTo(_step + 1)),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_step == _lastStep ? 'Créer' : 'Continuer'),
            ),
          ),
        ],
      ),
    );
  }

  void _goTo(int step) {
    setState(() => _step = step);
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _submit() async {
    final String? orgPhone = normalizeCongoPhone(_orgPhone.text);
    final String? landlordPhone = normalizeCongoPhone(_landlordPhone.text);
    if (orgPhone == null || landlordPhone == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vérifiez les numéros de téléphone.')),
      );
      return;
    }
    final double percent =
        double.tryParse(_commissionPercent.text.replaceAll(',', '.')) ?? 10;
    final int commissionRateBps = (percent * 100).round();

    final IndependentManagerOnboardingResult? result = await ref
        .read(managerOnboardingControllerProvider.notifier)
        .submit(
          organizationLegalName: _orgName.text.trim(),
          organizationCity: _orgCity.text.trim(),
          organizationContactPhone: orgPhone,
          landlordFirstName: _landlordFirstName.text.trim(),
          landlordLastName: _landlordLastName.text.trim(),
          landlordPrimaryPhone: landlordPhone,
          landlordCity: _landlordCity.text.trim(),
          landlordCountryCode: _landlordCountry.text.trim().toUpperCase(),
          propertyName: _propertyName.text.trim(),
          propertyAddressLine: _propertyAddress.text.trim(),
          propertyDistrict: _propertyDistrict.text.trim(),
          propertyCity: _propertyCity.text.trim(),
          startDate: DateTime.now().toIso8601String().split('T').first,
          commissionRateBps: commissionRateBps,
        );
    if (result != null && mounted) {
      context.go(RoutePaths.mandateDetail(result.mandate.id));
    }
  }
}
