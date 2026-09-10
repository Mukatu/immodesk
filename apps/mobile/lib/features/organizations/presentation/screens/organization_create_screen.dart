import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/phone_number.dart';
import '../../../../core/network/api_exception.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/phone_field.dart';
import '../../domain/entities/organization.dart';
import '../controllers/create_organization_controller.dart';

/// Assistant de création minimale d'organisation : type, raison sociale,
/// ville, téléphone. Le créateur devient automatiquement OWNER.
class OrganizationCreateScreen extends ConsumerStatefulWidget {
  const OrganizationCreateScreen({super.key});

  static const String path = RoutePaths.organizationCreate;

  @override
  ConsumerState<OrganizationCreateScreen> createState() =>
      _OrganizationCreateScreenState();
}

class _OrganizationCreateScreenState
    extends ConsumerState<OrganizationCreateScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  OrganizationType _type = OrganizationType.agency;
  final TextEditingController _legalName = TextEditingController();
  final TextEditingController _city = TextEditingController();
  final TextEditingController _contactPhone = TextEditingController(
    text: '+242',
  );

  @override
  void dispose() {
    _legalName.dispose();
    _city.dispose();
    _contactPhone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<void> createState = ref.watch(
      createOrganizationControllerProvider,
    );

    ref.listen<AsyncValue<void>>(createOrganizationControllerProvider, (
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

    final bool isLoading = createState.isLoading;

    return Scaffold(
      appBar: AppBar(title: const Text('Nouvelle organisation')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              DropdownButtonFormField<OrganizationType>(
                initialValue: _type,
                decoration: const InputDecoration(
                  labelText: "Type d'organisation",
                ),
                items: OrganizationType.values
                    .map(
                      (type) => DropdownMenuItem<OrganizationType>(
                        value: type,
                        child: Text(type.label),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _type = value ?? _type),
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('legal-name-field'),
                controller: _legalName,
                decoration: const InputDecoration(labelText: 'Raison sociale'),
                validator: (value) =>
                    (value == null || value.trim().isEmpty)
                    ? 'Champ requis'
                    : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('city-field'),
                controller: _city,
                decoration: const InputDecoration(labelText: 'Ville'),
                validator: (value) =>
                    (value == null || value.trim().isEmpty)
                    ? 'Champ requis'
                    : null,
              ),
              const SizedBox(height: 16),
              PhoneField(controller: _contactPhone),
              const SizedBox(height: 24),
              FilledButton(
                key: const ValueKey('create-organization-button'),
                onPressed: isLoading ? null : _submit,
                child: isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Créer'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final String? phone = normalizeCongoPhone(_contactPhone.text);
    if (phone == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Numéro de téléphone invalide.')),
      );
      return;
    }
    final Organization? org = await ref
        .read(createOrganizationControllerProvider.notifier)
        .submit(
          type: _type,
          legalName: _legalName.text.trim(),
          city: _city.text.trim(),
          contactPhone: phone,
        );
    if (org != null && mounted) {
      context.go(RoutePaths.home);
    }
  }
}
