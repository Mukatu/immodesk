import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/phone_number.dart';
import '../../../../core/launcher/url_launcher_service.dart';
import '../../domain/entities/tenant.dart';
import '../controllers/tenants_list_controller.dart';

/// Fiche locataire : nom, numéro(s), et boutons d'action rapide pour une
/// tournée de terrain (Appeler / WhatsApp).
///
/// Remarque : le contrat de phase 1 n'expose pas encore de bail, donc pas
/// de lot rattaché à afficher pour l'instant (voir `Tenant`, domaine).
class TenantDetailScreen extends ConsumerWidget {
  const TenantDetailScreen({super.key, required this.tenantId});

  final String tenantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<TenantsListState> stateAsync = ref.watch(
      tenantsListControllerProvider,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Locataire')),
      body: stateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Erreur : $error')),
        data: (state) {
          Tenant? tenant;
          for (final t in state.allTenants) {
            if (t.id == tenantId) {
              tenant = t;
              break;
            }
          }
          if (tenant == null) {
            return const Center(child: Text('Locataire introuvable.'));
          }
          return _TenantDetailBody(tenant: tenant);
        },
      ),
    );
  }
}

class _TenantDetailBody extends ConsumerWidget {
  const _TenantDetailBody({required this.tenant});

  final Tenant tenant;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final String whatsappPhone = tenant.whatsappPhone ?? tenant.primaryPhone;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tenant.displayName,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 8),
        Text(formatCongoPhoneDisplay(tenant.primaryPhone)),
        const SizedBox(height: 4),
        const Text('Lot : non renseigné (aucun bail actif)'),
        const SizedBox(height: 24),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                key: const ValueKey('call-button'),
                onPressed: () => ref
                    .read(urlLauncherServiceProvider)
                    .call(tenant.primaryPhone),
                icon: const Icon(Icons.call_outlined),
                label: const Text('Appeler'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                key: const ValueKey('whatsapp-button'),
                onPressed: () => ref
                    .read(urlLauncherServiceProvider)
                    .openWhatsapp(whatsappPhone),
                icon: const Icon(Icons.chat_outlined),
                label: const Text('WhatsApp'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
