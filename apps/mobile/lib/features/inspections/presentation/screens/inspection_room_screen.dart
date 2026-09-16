import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/inspection_condition.dart';
import '../../domain/entities/inspection_item_draft.dart';
import '../controllers/inspection_flow_controller.dart';
import '../widgets/inspection_item_editor_sheet.dart';

/// Suggestions de pièces courantes (le démarcheur peut en ajouter d'autres) —
/// décision produit simple prise faute d'écran de paramétrage dédié
/// (`docs/04_plan_de_phases.md` §8.2 : « liste des postes standard … à
/// figer avant le premier état des lieux terrain »).
const List<String> _roomSuggestions = [
  'Salon',
  'Chambre 1',
  'Chambre 2',
  'Cuisine',
  'Salle de bain',
  'Toilettes',
];

/// Navigation pièce par pièce : ajoute des pièces, puis des postes (élément,
/// état constaté, photo) pour la pièce active.
class InspectionRoomScreen extends ConsumerStatefulWidget {
  const InspectionRoomScreen({super.key});

  @override
  ConsumerState<InspectionRoomScreen> createState() =>
      _InspectionRoomScreenState();
}

class _InspectionRoomScreenState extends ConsumerState<InspectionRoomScreen> {
  String? _activeRoom;

  Future<void> _addRoom() async {
    final String? chosen = await showDialog<String>(
      context: context,
      builder: (context) {
        final TextEditingController controller = TextEditingController();
        return AlertDialog(
          title: const Text('Ajouter une pièce'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Wrap(
                spacing: 8,
                children: _roomSuggestions
                    .map(
                      (r) => ActionChip(
                        label: Text(r),
                        onPressed: () => Navigator.of(context).pop(r),
                      ),
                    )
                    .toList(),
              ),
              TextField(
                key: const ValueKey('inspection-new-room-field'),
                controller: controller,
                decoration: const InputDecoration(labelText: 'Autre pièce'),
                onSubmitted: (v) => Navigator.of(context).pop(v),
              ),
            ],
          ),
        );
      },
    );
    if (chosen != null && chosen.trim().isNotEmpty) {
      setState(() => _activeRoom = chosen.trim());
    }
  }

  Future<void> _editItem(
    String roomLabel, [
    InspectionItemDraft? existing,
  ]) async {
    final InspectionItemDraft? result = await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) =>
          InspectionItemEditorSheet(roomLabel: roomLabel, initial: existing),
    );
    if (result == null) return;
    final controller = ref.read(inspectionFlowControllerProvider.notifier);
    if (existing == null) {
      controller.addItem(result);
    } else {
      controller.updateItem(existing.localId, result);
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
    final List<String> rooms = state.draft.roomLabels;
    final String? active =
        _activeRoom ?? (rooms.isNotEmpty ? rooms.first : null);
    final List<InspectionItemDraft> items = active == null
        ? const []
        : state.draft.itemsForRoom(active);

    return Scaffold(
      appBar: AppBar(title: const Text('Pièces')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: Wrap(
              spacing: 8,
              children: [
                ...rooms.map(
                  (r) => ChoiceChip(
                    key: ValueKey('room-chip-$r'),
                    label: Text(r),
                    selected: active == r,
                    onSelected: (_) => setState(() => _activeRoom = r),
                  ),
                ),
                ActionChip(
                  key: const ValueKey('inspection-add-room-chip'),
                  avatar: const Icon(Icons.add, size: 18),
                  label: const Text('Pièce'),
                  onPressed: _addRoom,
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: active == null
                ? const Center(child: Text('Ajoutez une pièce pour commencer.'))
                : ListView(
                    children: [
                      for (final item in items)
                        ListTile(
                          key: ValueKey('inspection-item-${item.localId}'),
                          title: Text(item.elementLabel),
                          subtitle: item.damageDescription != null
                              ? Text(item.damageDescription!)
                              : null,
                          trailing: StatusBadge(
                            label: item.condition.label,
                            tone: item.condition.tone,
                          ),
                          leading: item.requiresPhoto && item.photoPaths.isEmpty
                              ? const Icon(Icons.warning_amber_outlined)
                              : null,
                          onTap: () => _editItem(active, item),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: OutlinedButton.icon(
                          key: const ValueKey('inspection-add-item-button'),
                          onPressed: () => _editItem(active),
                          icon: const Icon(Icons.add),
                          label: const Text('Ajouter un poste'),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            key: const ValueKey('inspection-go-to-recap-button'),
            onPressed: state.draft.items.isEmpty
                ? null
                : () => context.push(RoutePaths.inspectionSignature),
            child: const Text('Récapitulatif et signature'),
          ),
        ),
      ),
    );
  }
}
