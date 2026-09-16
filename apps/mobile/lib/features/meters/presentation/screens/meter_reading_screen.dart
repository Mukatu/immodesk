import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../../core/media/image_compressor.dart';
import '../../../../core/media/image_picker_service.dart';
import '../../../../core/sync/ulid.dart';
import '../../domain/entities/meter.dart';
import '../../domain/entities/meter_type.dart';
import '../controllers/meter_reading_controller.dart';

/// Saisie de l'index d'un compteur : index précédent affiché, aperçu de
/// consommation, photo du cadran facultative, et décision explicite en cas
/// d'index inférieur au précédent (passage par zéro ou erreur de saisie).
class MeterReadingScreen extends ConsumerStatefulWidget {
  const MeterReadingScreen({super.key, required this.meter});

  final Meter meter;

  @override
  ConsumerState<MeterReadingScreen> createState() => _MeterReadingScreenState();
}

class _MeterReadingScreenState extends ConsumerState<MeterReadingScreen> {
  final TextEditingController _indexController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(
      () =>
          ref.read(meterReadingControllerProvider.notifier).start(widget.meter),
    );
  }

  @override
  void dispose() {
    _indexController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    final picker = ref.read(imagePickerServiceProvider);
    final photo = await picker.takePhoto();
    if (photo == null) return;
    final compressor = ref.read(imageCompressorProvider);
    final Directory docsDir = await getApplicationDocumentsDirectory();
    final String destinationPath = p.join(
      docsDir.path,
      'meter_photos',
      '${Ulid.generate()}.jpg',
    );
    final File compressed = await compressor.compressFile(
      File(photo.path),
      destinationPath,
    );
    ref
        .read(meterReadingControllerProvider.notifier)
        .setPhotoPath(compressed.path);
  }

  Future<void> _onSubmitPressed() async {
    final state = ref.read(meterReadingControllerProvider);
    if (state == null) return;
    if (state.hasUnconfirmedRegression) {
      await _showRegressionDialog();
      return;
    }
    await ref.read(meterReadingControllerProvider.notifier).submit();
    final after = ref.read(meterReadingControllerProvider);
    if (after == null || !mounted) return;
    if (after.result != null || after.queuedOffline) {
      final String message = after.queuedOffline
          ? 'Relevé enregistré. Il sera transmis à la synchronisation.'
          : 'Relevé enregistré (consommation : ${after.result!.consumption}).';
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
      ref.read(meterReadingControllerProvider.notifier).clear();
      context.pop();
    } else if (after.errorMessage != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(after.errorMessage!)));
    }
  }

  Future<void> _showRegressionDialog() async {
    final String? choice = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Index inférieur au précédent'),
        content: const Text(
          'Le nouvel index saisi est inférieur au dernier relevé connu. '
          'S\'agit-il d\'un passage par zéro du compteur, ou d\'une erreur '
          'de saisie ?',
        ),
        actions: [
          TextButton(
            key: const ValueKey('meter-regression-fix-button'),
            onPressed: () => Navigator.of(context).pop('fix'),
            child: const Text('Corriger la saisie'),
          ),
          FilledButton(
            key: const ValueKey('meter-regression-rollover-button'),
            onPressed: () => Navigator.of(context).pop('rollover'),
            child: const Text('Passage par zéro'),
          ),
        ],
      ),
    );
    if (choice == 'rollover') {
      ref.read(meterReadingControllerProvider.notifier).confirmRollover();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(meterReadingControllerProvider);
    if (state == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: AppBar(title: Text(state.meter.meterType.label)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Numéro de série : ${state.meter.serialNumber}'),
          Text(
            state.previousIndex != null
                ? 'Index précédent : ${state.previousIndex}'
                : 'Aucun relevé précédent',
          ),
          const SizedBox(height: 16),
          TextField(
            key: const ValueKey('meter-index-field'),
            controller: _indexController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Index courant'),
            onChanged: (value) => ref
                .read(meterReadingControllerProvider.notifier)
                .setIndexInput(int.tryParse(value.trim())),
          ),
          if (state.hasUnconfirmedRegression)
            Container(
              key: const ValueKey('meter-regression-banner'),
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.symmetric(vertical: 8),
              color: Theme.of(context).colorScheme.errorContainer,
              child: const Text(
                'Index inférieur au précédent : précisez s\'il s\'agit d\'un '
                'passage par zéro avant de valider.',
              ),
            )
          else if (state.previewConsumption != null)
            Text('Consommation estimée : ${state.previewConsumption}'),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            key: const ValueKey('meter-capture-photo-button'),
            onPressed: _capturePhoto,
            icon: const Icon(Icons.camera_alt_outlined),
            label: Text(
              state.photoPath == null
                  ? 'Photo du cadran (facultative)'
                  : 'Photo capturée',
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            key: const ValueKey('meter-submit-button'),
            onPressed: state.currentIndexInput == null || state.isSubmitting
                ? null
                : _onSubmitPressed,
            child: Text(
              state.isSubmitting ? 'Envoi…' : 'Enregistrer le relevé',
            ),
          ),
        ],
      ),
    );
  }
}
