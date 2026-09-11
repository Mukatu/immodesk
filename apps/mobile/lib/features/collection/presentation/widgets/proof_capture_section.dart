import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:signature/signature.dart';

import '../../../../core/media/image_compressor.dart';
import '../../../../core/media/image_picker_service.dart';
import '../../../../core/sync/ulid.dart';

/// Preuve de l'encaissement : signature tactile du locataire (par défaut)
/// ou, en alternative, une photo du reçu papier. Un seul des deux modes
/// est actif à la fois (voir `EncaissementState.hasProof`).
class ProofCaptureSection extends ConsumerStatefulWidget {
  const ProofCaptureSection({
    super.key,
    required this.onSignatureCaptured,
    required this.onPaperPhotoCaptured,
  });

  final ValueChanged<Uint8List> onSignatureCaptured;
  final ValueChanged<String> onPaperPhotoCaptured;

  @override
  ConsumerState<ProofCaptureSection> createState() =>
      _ProofCaptureSectionState();
}

class _ProofCaptureSectionState extends ConsumerState<ProofCaptureSection> {
  late final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
    onDrawEnd: _onSignatureEnd,
  );
  bool _usePhotoAlternative = false;

  @override
  void dispose() {
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> _onSignatureEnd() async {
    final Uint8List? bytes = await _signatureController.toPngBytes();
    if (bytes != null) widget.onSignatureCaptured(bytes);
  }

  Future<void> _capturePaperPhoto() async {
    final picker = ref.read(imagePickerServiceProvider);
    final photo = await picker.takePhoto();
    if (photo == null) return;
    final compressor = ref.read(imageCompressorProvider);
    final Directory docsDir = await getApplicationDocumentsDirectory();
    final String destinationPath = p.join(
      docsDir.path,
      'cash_receipt_photos',
      '${Ulid.generate()}.jpg',
    );
    final File compressed = await compressor.compressFile(
      File(photo.path),
      destinationPath,
    );
    widget.onPaperPhotoCaptured(compressed.path);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SegmentedButton<bool>(
          key: const ValueKey('proof-mode-selector'),
          segments: const [
            ButtonSegment(value: false, label: Text('Signature')),
            ButtonSegment(value: true, label: Text('Photo du reçu')),
          ],
          selected: {_usePhotoAlternative},
          onSelectionChanged: (selection) =>
              setState(() => _usePhotoAlternative = selection.first),
        ),
        const SizedBox(height: 8),
        if (_usePhotoAlternative)
          OutlinedButton.icon(
            key: const ValueKey('capture-paper-photo-button'),
            onPressed: _capturePaperPhoto,
            icon: const Icon(Icons.camera_alt_outlined),
            label: const Text('Photographier le reçu papier'),
          )
        else
          Column(
            children: [
              Container(
                key: const ValueKey('signature-pad'),
                height: 180,
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline,
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Signature(
                  controller: _signatureController,
                  backgroundColor: Colors.white,
                ),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () {
                    _signatureController.clear();
                  },
                  child: const Text('Effacer'),
                ),
              ),
            ],
          ),
      ],
    );
  }
}
