import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../../core/media/image_compressor.dart';
import '../../../../core/media/image_picker_service.dart';
import '../../../../core/sync/ulid.dart';
import '../../domain/entities/charged_to.dart';
import '../../domain/entities/inspection_condition.dart';
import '../../domain/entities/inspection_item_draft.dart';

/// Feuille de saisie d'un poste : élément, état constaté (six niveaux),
/// description de la dégradation, montant de réparation estimé, partie qui
/// en supporte le coût, et photos (une par appui, compressées comme les
/// autres photos de l'application).
class InspectionItemEditorSheet extends ConsumerStatefulWidget {
  const InspectionItemEditorSheet({
    super.key,
    required this.roomLabel,
    this.initial,
  });

  final String roomLabel;
  final InspectionItemDraft? initial;

  @override
  ConsumerState<InspectionItemEditorSheet> createState() =>
      _InspectionItemEditorSheetState();
}

class _InspectionItemEditorSheetState
    extends ConsumerState<InspectionItemEditorSheet> {
  late final TextEditingController _elementController = TextEditingController(
    text: widget.initial?.elementLabel ?? '',
  );
  late final TextEditingController _damageController = TextEditingController(
    text: widget.initial?.damageDescription ?? '',
  );
  late final TextEditingController _repairController = TextEditingController(
    text: widget.initial?.repairAmount?.toString() ?? '',
  );
  late InspectionCondition _condition =
      widget.initial?.condition ?? InspectionCondition.good;
  late ChargedTo? _chargedTo = widget.initial?.chargedTo;
  late List<String> _photoPaths = List.of(widget.initial?.photoPaths ?? []);

  Future<void> _capturePhoto() async {
    final picker = ref.read(imagePickerServiceProvider);
    final photo = await picker.takePhoto();
    if (photo == null) return;
    final compressor = ref.read(imageCompressorProvider);
    final Directory docsDir = await getApplicationDocumentsDirectory();
    final String destinationPath = p.join(
      docsDir.path,
      'inspection_photos',
      '${Ulid.generate()}.jpg',
    );
    final File compressed = await compressor.compressFile(
      File(photo.path),
      destinationPath,
    );
    setState(() => _photoPaths = [..._photoPaths, compressed.path]);
  }

  void _save() {
    if (_elementController.text.trim().isEmpty) return;
    final int? repairAmount = int.tryParse(_repairController.text.trim());
    Navigator.of(context).pop(
      InspectionItemDraft(
        localId: widget.initial?.localId ?? Ulid.generate(),
        roomLabel: widget.roomLabel,
        elementLabel: _elementController.text.trim(),
        condition: _condition,
        damageDescription: _damageController.text.trim().isEmpty
            ? null
            : _damageController.text.trim(),
        repairAmount: repairAmount,
        chargedTo: _chargedTo,
        photoPaths: _photoPaths,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool needsPhoto = _condition.requiresPhoto;
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.roomLabel,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('inspection-item-element-field'),
              controller: _elementController,
              decoration: const InputDecoration(labelText: 'Élément'),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: inspectionConditionDisplayOrder
                  .map(
                    (c) => ChoiceChip(
                      key: ValueKey('condition-chip-${c.apiValue}'),
                      label: Text(c.label),
                      selected: _condition == c,
                      onSelected: (_) => setState(() => _condition = c),
                    ),
                  )
                  .toList(),
            ),
            if (needsPhoto) ...[
              const SizedBox(height: 8),
              TextField(
                controller: _damageController,
                decoration: const InputDecoration(
                  labelText: 'Description de la dégradation',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _repairController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Montant de réparation estimé (XAF)',
                ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<ChargedTo>(
                initialValue: _chargedTo,
                decoration: const InputDecoration(labelText: 'Coût à charge'),
                items: ChargedTo.values
                    .map(
                      (c) => DropdownMenuItem(value: c, child: Text(c.label)),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _chargedTo = value),
              ),
              const SizedBox(height: 8),
              Text(
                'Photo obligatoire pour cet état.',
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final path in _photoPaths)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Image.file(
                      File(path),
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                    ),
                  ),
                OutlinedButton.icon(
                  key: const ValueKey('inspection-item-capture-photo-button'),
                  onPressed: _capturePhoto,
                  icon: const Icon(Icons.camera_alt_outlined),
                  label: const Text('Photo'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FilledButton(
              key: const ValueKey('inspection-item-save-button'),
              onPressed: _save,
              child: const Text('Enregistrer le poste'),
            ),
          ],
        ),
      ),
    );
  }
}
