import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/unit_photo_capture_controller.dart';
import '../controllers/unit_photo_gallery_controller.dart';

/// Galerie des photos d'un lot + bouton de prise de photo (caméra). Affiche
/// les photos déjà envoyées et celles encore en attente d'envoi (hors
/// ligne), avec un badge « en attente » sur ces dernières.
class UnitPhotosGallery extends ConsumerWidget {
  const UnitPhotosGallery({super.key, required this.unitId});

  final String unitId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final galleryAsync = ref.watch(unitPhotoGalleryControllerProvider(unitId));
    final captureState = ref.watch(unitPhotoCaptureControllerProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Photos', style: Theme.of(context).textTheme.titleMedium),
            FilledButton.icon(
              key: const ValueKey('take-photo-button'),
              onPressed: captureState.isBusy
                  ? null
                  : () => _capture(context, ref),
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text('Prendre une photo'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        galleryAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => Text('Erreur : $error'),
          data: (state) {
            if (state.items.isEmpty) {
              return const Text('Aucune photo pour ce lot pour le moment.');
            }
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in state.items) _PhotoTile(item: item),
              ],
            );
          },
        ),
      ],
    );
  }

  Future<void> _capture(BuildContext context, WidgetRef ref) async {
    final result = await ref
        .read(unitPhotoCaptureControllerProvider.notifier)
        .capture(unitId);
    ref.invalidate(unitPhotoGalleryControllerProvider(unitId));
    if (!context.mounted) return;
    final String message = switch (result) {
      PhotoCaptureResult.sentOnline => 'Photo envoyée.',
      PhotoCaptureResult.queuedOffline =>
        'Photo enregistrée hors ligne, elle sera envoyée automatiquement.',
      PhotoCaptureResult.cancelled => '',
      PhotoCaptureResult.failed => 'Échec de la prise de photo.',
    };
    if (message.isNotEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile({required this.item});

  final UnitPhotoItem item;

  @override
  Widget build(BuildContext context) {
    final Widget image = item.isPending && item.localFilePath != null
        ? Image.file(File(item.localFilePath!), fit: BoxFit.cover)
        : (item.downloadUrl != null
              ? Image.network(item.downloadUrl!, fit: BoxFit.cover)
              : const Icon(Icons.broken_image_outlined));

    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(width: 96, height: 96, child: image),
        ),
        if (item.isPending)
          Positioned(
            right: 4,
            bottom: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.tertiaryContainer,
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text('en attente', style: TextStyle(fontSize: 10)),
            ),
          ),
      ],
    );
  }
}
