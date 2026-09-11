import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/phone_number.dart';
import '../../../../core/launcher/url_launcher_service.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/offline_data_banner.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../leases/domain/entities/lease_detail.dart';
import '../../../leases/domain/entities/lease_status.dart';
import '../../../leases/presentation/controllers/tenant_active_lease_controller.dart';
import '../../domain/entities/tenant.dart';
import '../controllers/tenants_list_controller.dart';

/// Fiche locataire : nom, numéro(s), bail actif et boutons d'action rapide
/// pour une tournée de terrain (Appeler / WhatsApp).
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
        const SizedBox(height: 16),
        _TenantActiveLeaseSection(tenantId: tenant.id),
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

/// Résumé du bail actif dont ce locataire est le locataire principal, avec
/// accès à la fiche complète du bail.
class _TenantActiveLeaseSection extends ConsumerWidget {
  const _TenantActiveLeaseSection({required this.tenantId});

  final String tenantId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<TenantActiveLeaseState> stateAsync = ref.watch(
      tenantActiveLeaseControllerProvider(tenantId),
    );
    return stateAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (error, _) => Text('Bail : erreur ($error)'),
      data: (state) {
        final LeaseDetail? lease = state.lease;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bail actif', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (state.isFromCache) OfflineDataBanner(cachedAt: state.cachedAt),
            if (lease == null)
              const Text('Aucun bail actif pour ce locataire.')
            else
              Card(
                key: const ValueKey('tenant-active-lease-card'),
                child: ListTile(
                  title: Text(lease.reference ?? lease.id),
                  subtitle: Text(
                    'Lot ${lease.unit.code}\n'
                    'Échéance le ${lease.paymentDueDay}',
                  ),
                  isThreeLine: true,
                  trailing: StatusBadge(
                    label: lease.status.label,
                    tone: lease.status.tone,
                  ),
                  onTap: () => context.push(RoutePaths.leaseDetail(lease.id)),
                ),
              ),
          ],
        );
      },
    );
  }
}
