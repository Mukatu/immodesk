import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../../core/media/image_compressor.dart';
import '../../../../core/media/image_picker_service.dart';
import '../../../../core/sync/ulid.dart';

/// Capture d'une preuve de paiement — photo (caméra) ou fichier déjà
/// enregistré (galerie), compressée comme les autres photos de
/// l'application (`image_compressor`). Utilisée pour la capture d'écran
/// Mobile Money (facultative) et l'avis d'opération de virement
/// (obligatoire).
class PaymentProofCapture extends ConsumerStatefulWidget {
  const PaymentProofCapture({
    super.key,
    required this.label,
    required this.onCaptured,
    this.filePath,
    this.onCleared,
    this.folderName = 'payment_proofs',
  });

  final String label;
  final ValueChanged<String> onCaptured;
  final String? filePath;
  final VoidCallback? onCleared;
  final String folderName;

  @override
  ConsumerState<PaymentProofCapture> createState() =>
      _PaymentProofCaptureState();
}

class _PaymentProofCaptureState extends ConsumerState<PaymentProofCapture> {
  Future<void> _capture(bool fromGallery) async {
    final picker = ref.read(imagePickerServiceProvider);
    final photo = fromGallery
        ? await picker.pickFromGallery()
        : await picker.takePhoto();
    if (photo == null) return;
    final compressor = ref.read(imageCompressorProvider);
    final Directory docsDir = await getApplicationDocumentsDirectory();
    final String destinationPath = p.join(
      docsDir.path,
      widget.folderName,
      '${Ulid.generate()}.jpg',
    );
    final File compressed = await compressor.compressFile(
      File(photo.path),
      destinationPath,
    );
    widget.onCaptured(compressed.path);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(
          children: [
            OutlinedButton.icon(
              key: const ValueKey('payment-proof-camera-button'),
              onPressed: () => _capture(false),
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text('Photographier'),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              key: const ValueKey('payment-proof-gallery-button'),
              onPressed: () => _capture(true),
              icon: const Icon(Icons.attach_file),
              label: const Text('Choisir un fichier'),
            ),
          ],
        ),
        if (widget.filePath != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 18),
              const SizedBox(width: 4),
              const Expanded(child: Text('Preuve jointe')),
              if (widget.onCleared != null)
                TextButton(
                  onPressed: widget.onCleared,
                  child: const Text('Retirer'),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
