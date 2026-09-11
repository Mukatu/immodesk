import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/lease_document.dart';
import '../controllers/lease_document_action_controller.dart';
import '../controllers/lease_documents_controller.dart';

/// Section « Documents » de la fiche bail : liste des versions (contrat
/// généré, contrat signé...) avec actions d'ouverture et de partage.
class LeaseDocumentsSection extends ConsumerWidget {
  const LeaseDocumentsSection({super.key, required this.leaseId});

  final String leaseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<LeaseDocumentsState> stateAsync = ref.watch(
      leaseDocumentsControllerProvider(leaseId),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Documents', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        stateAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(),
          ),
          error: (error, _) => Text('Documents indisponibles : $error'),
          data: (state) {
            if (state.errorMessage != null) {
              return Text(state.errorMessage!);
            }
            if (state.items.isEmpty) {
              return const Text('Aucun document disponible pour ce bail.');
            }
            return Column(
              key: const ValueKey('lease-documents-list'),
              children: [
                for (final LeaseDocument document in state.items)
                  _LeaseDocumentTile(document: document),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _LeaseDocumentTile extends ConsumerWidget {
  const _LeaseDocumentTile({required this.document});

  final LeaseDocument document;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final LeaseDocumentActionState actionState = ref.watch(
      leaseDocumentActionControllerProvider(document.id),
    );
    final LeaseDocumentActionController notifier = ref.read(
      leaseDocumentActionControllerProvider(document.id).notifier,
    );
    final bool isBusy =
        actionState.status == LeaseDocumentActionStatus.downloading ||
        actionState.status == LeaseDocumentActionStatus.sharing;

    return Card(
      key: ValueKey('lease-document-${document.id}'),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(document.versionLabel)),
                StatusBadge(
                  label: document.isSigned ? 'Signé' : 'Non signé',
                  tone: document.isSigned
                      ? StatusBadgeTone.success
                      : StatusBadgeTone.neutral,
                ),
              ],
            ),
            Text(document.title, style: Theme.of(context).textTheme.bodySmall),
            if (actionState.status == LeaseDocumentActionStatus.downloading)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: LinearProgressIndicator(value: actionState.progress),
              ),
            if (actionState.status == LeaseDocumentActionStatus.error)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  actionState.errorMessage ?? 'Une erreur est survenue.',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            Row(
              children: [
                TextButton.icon(
                  key: ValueKey('lease-document-open-${document.id}'),
                  onPressed: isBusy ? null : () => notifier.open(document),
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('Ouvrir'),
                ),
                TextButton.icon(
                  key: ValueKey('lease-document-share-${document.id}'),
                  onPressed: isBusy ? null : () => notifier.share(document),
                  icon: const Icon(Icons.share_outlined),
                  label: const Text('Partager'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
