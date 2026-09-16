import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../../core/media/image_compressor.dart';
import '../../../../core/media/image_picker_service.dart';
import '../../../../core/sync/ulid.dart';
import '../../domain/entities/maintenance_status.dart';
import '../controllers/maintenance_update_controller.dart';

/// Ajout d'une mise à jour terrain à une demande de maintenance : photo,
/// commentaire, changement de statut (`docs/api/phase8-contract.md`).
class MaintenanceUpdateScreen extends ConsumerWidget {
  const MaintenanceUpdateScreen({super.key, required this.requestId});

  final String requestId;

  Future<void> _capturePhoto(WidgetRef ref) async {
    final picker = ref.read(imagePickerServiceProvider);
    final photo = await picker.takePhoto();
    if (photo == null) return;
    final compressor = ref.read(imageCompressorProvider);
    final Directory docsDir = await getApplicationDocumentsDirectory();
    final String destinationPath = p.join(
      docsDir.path,
      'maintenance_photos',
      '${Ulid.generate()}.jpg',
    );
    final File compressed = await compressor.compressFile(
      File(photo.path),
      destinationPath,
    );
    ref
        .read(maintenanceUpdateControllerProvider(requestId).notifier)
        .setPhotoPath(compressed.path);
  }

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final controller = ref.read(
      maintenanceUpdateControllerProvider(requestId).notifier,
    );
    await controller.submit();
    final after = ref.read(maintenanceUpdateControllerProvider(requestId));
    if (!context.mounted) return;
    if (after.success || after.queuedOffline) {
      final String message = after.queuedOffline
          ? 'Mise à jour enregistrée. Elle sera transmise à la synchronisation.'
          : 'Mise à jour enregistrée.';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
      context.pop();
    } else if (after.errorMessage != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(after.errorMessage!)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(maintenanceUpdateControllerProvider(requestId));
    final controller = ref.read(
      maintenanceUpdateControllerProvider(requestId).notifier,
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Mise à jour')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            key: const ValueKey('maintenance-update-message-field'),
            decoration: const InputDecoration(labelText: 'Commentaire'),
            maxLines: 3,
            onChanged: controller.setMessage,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<MaintenanceStatus?>(
            key: const ValueKey('maintenance-update-status-field'),
            initialValue: state.newStatus,
            decoration: const InputDecoration(labelText: 'Nouveau statut'),
            items: [
              const DropdownMenuItem(value: null, child: Text('(inchangé)')),
              ...MaintenanceStatusLabel.collectorSelectable.map(
                (s) => DropdownMenuItem(value: s, child: Text(s.label)),
              ),
            ],
            onChanged: controller.setStatus,
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            key: const ValueKey('maintenance-update-capture-photo-button'),
            onPressed: () => _capturePhoto(ref),
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(
              state.photoPath == null ? 'Ajouter une photo' : 'Photo ajoutée',
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            key: const ValueKey('maintenance-update-submit-button'),
            onPressed: state.canSubmit ? () => _submit(context, ref) : null,
            child: Text(state.isSubmitting ? 'Envoi…' : 'Enregistrer'),
          ),
        ],
      ),
    );
  }
}
