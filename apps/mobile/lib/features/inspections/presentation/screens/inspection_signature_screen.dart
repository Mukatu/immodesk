import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:signature/signature.dart';

import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/inspection_condition.dart';
import '../controllers/inspection_flow_controller.dart';

/// Récapitulatif des postes puis double signature (locataire + représentant
/// de l'agence). La signature est refusée avec un message clair si une
/// photo obligatoire manque (`docs/api/phase8-contract.md`, arbitrage 6) ou
/// si l'une des signatures requises n'a pas été tracée.
class InspectionSignatureScreen extends ConsumerStatefulWidget {
  const InspectionSignatureScreen({super.key});

  @override
  ConsumerState<InspectionSignatureScreen> createState() =>
      _InspectionSignatureScreenState();
}

class _InspectionSignatureScreenState
    extends ConsumerState<InspectionSignatureScreen> {
  late final SignatureController _tenantController = SignatureController(
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
    onDrawEnd: () => _onDrawEnd(tenant: true),
  );
  late final SignatureController _agentController = SignatureController(
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
    onDrawEnd: () => _onDrawEnd(tenant: false),
  );

  @override
  void dispose() {
    _tenantController.dispose();
    _agentController.dispose();
    super.dispose();
  }

  Future<void> _onDrawEnd({required bool tenant}) async {
    final Uint8List? bytes =
        await (tenant ? _tenantController : _agentController).toPngBytes();
    if (bytes == null) return;
    final notifier = ref.read(inspectionFlowControllerProvider.notifier);
    if (tenant) {
      notifier.setTenantSignature(bytes);
    } else {
      notifier.setAgentSignature(bytes);
    }
  }

  Future<void> _sign() async {
    final state = ref.read(inspectionFlowControllerProvider);
    if (state == null) return;
    if (!state.readiness.canSign) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(state.readiness.message ?? '')));
      return;
    }
    if (!state.hasRequiredSignatures) {
      final String missing = state.agentSignaturePngBytes == null
          ? 'Signature de l\'agence obligatoire.'
          : 'Signature du locataire obligatoire.';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(missing)));
      return;
    }

    await ref.read(inspectionFlowControllerProvider.notifier).submit();
    final after = ref.read(inspectionFlowControllerProvider);
    if (after == null || !mounted) return;
    if (after.result != null || after.queuedOffline) {
      final String message = after.queuedOffline
          ? 'État des lieux enregistré. Il sera transmis à la synchronisation.'
          : 'État des lieux signé (${after.result!.reference}).';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
      ref.read(inspectionFlowControllerProvider.notifier).clear();
      context.go('/more');
    } else if (after.errorMessage != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(after.errorMessage!)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(inspectionFlowControllerProvider);
    if (state == null) {
      return const Scaffold(
        body: Center(child: Text('Aucun état des lieux en cours.')),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Récapitulatif et signature')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final item in state.draft.items)
            ListTile(
              title: Text('${item.roomLabel} — ${item.elementLabel}'),
              trailing: StatusBadge(
                label: item.condition.label,
                tone: item.condition.tone,
              ),
            ),
          if (!state.readiness.canSign)
            Container(
              key: const ValueKey('inspection-readiness-banner'),
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.symmetric(vertical: 8),
              color: Theme.of(context).colorScheme.errorContainer,
              child: Text(state.readiness.message ?? ''),
            ),
          const SizedBox(height: 16),
          if (state.draft.tenantPresent) ...[
            const Text('Signature du locataire'),
            _SignaturePad(controller: _tenantController, tag: 'tenant'),
          ],
          const SizedBox(height: 16),
          const Text('Signature du représentant de l\'agence'),
          _SignaturePad(controller: _agentController, tag: 'agent'),
          const SizedBox(height: 24),
          FilledButton(
            key: const ValueKey('inspection-sign-button'),
            onPressed: state.isSubmitting ? null : _sign,
            child: Text(state.isSubmitting ? 'Envoi…' : 'Signer'),
          ),
        ],
      ),
    );
  }
}

class _SignaturePad extends StatelessWidget {
  const _SignaturePad({required this.controller, required this.tag});

  final SignatureController controller;
  final String tag;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: ValueKey('signature-pad-$tag'),
      height: 140,
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outline),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Signature(controller: controller, backgroundColor: Colors.white),
    );
  }
}
