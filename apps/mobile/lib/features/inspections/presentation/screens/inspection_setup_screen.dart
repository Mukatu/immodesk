import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../leases/domain/entities/lease_summary.dart';
import '../../domain/entities/inspection_type.dart';
import '../controllers/inspection_flow_controller.dart';

/// Première étape : type d'état des lieux et présence du locataire, pour le
/// lot choisi dans la tournée mise en cache (`LeasePickerScreen`).
class InspectionSetupScreen extends ConsumerStatefulWidget {
  const InspectionSetupScreen({super.key, required this.lease});

  final LeaseSummary lease;

  @override
  ConsumerState<InspectionSetupScreen> createState() =>
      _InspectionSetupScreenState();
}

class _InspectionSetupScreenState extends ConsumerState<InspectionSetupScreen> {
  InspectionType _type = InspectionType.moveIn;
  bool _tenantPresent = true;
  final TextEditingController _absenceReasonController =
      TextEditingController();

  @override
  void dispose() {
    _absenceReasonController.dispose();
    super.dispose();
  }

  void _start() {
    if (!_tenantPresent && _absenceReasonController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Indiquez le motif d\'absence du locataire.'),
        ),
      );
      return;
    }
    final controller = ref.read(inspectionFlowControllerProvider.notifier);
    controller.start(
      unitId: widget.lease.unit.id,
      leaseId: widget.lease.id,
      tenantId: widget.lease.tenant.id,
      inspectionType: _type,
    );
    controller.setTenantPresent(_tenantPresent);
    if (!_tenantPresent) {
      controller.setAbsenceReason(_absenceReasonController.text.trim());
    }
    context.push(RoutePaths.inspectionRooms);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.lease.unit.label ?? widget.lease.unit.code),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${widget.lease.property.name} — ${widget.lease.tenant.displayName}',
            ),
            const SizedBox(height: 16),
            const Text('Type d\'état des lieux'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: InspectionType.values
                  .map(
                    (t) => ChoiceChip(
                      key: ValueKey('inspection-type-${t.apiValue}'),
                      label: Text(t.label),
                      selected: _type == t,
                      onSelected: (_) => setState(() => _type = t),
                    ),
                  )
                  .toList(),
            ),
            SwitchListTile(
              key: const ValueKey('inspection-tenant-present-switch'),
              title: const Text('Locataire présent'),
              value: _tenantPresent,
              onChanged: (v) => setState(() => _tenantPresent = v),
            ),
            if (!_tenantPresent)
              TextField(
                key: const ValueKey('inspection-absence-reason-field'),
                controller: _absenceReasonController,
                decoration: const InputDecoration(
                  labelText: 'Motif de l\'absence',
                ),
              ),
            const Spacer(),
            FilledButton(
              key: const ValueKey('inspection-start-button'),
              onPressed: _start,
              child: const Text('Commencer'),
            ),
          ],
        ),
      ),
    );
  }
}
