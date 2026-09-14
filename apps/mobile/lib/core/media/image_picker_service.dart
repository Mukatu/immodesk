import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'image_picker_service.g.dart';

/// Enveloppe autour de `image_picker`, injectable par Riverpod pour être
/// remplacée dans les tests (aucun appareil photo réel en test).
class ImagePickerService {
  const ImagePickerService();

  Future<XFile?> takePhoto() {
    return ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 100,
    );
  }

  /// Sélection d'un fichier image existant (galerie), utilisée pour les
  /// preuves de paiement de la phase 4 (« photo ou fichier ») : l'avis
  /// d'opération bancaire ou la capture d'écran Mobile Money sont souvent
  /// déjà enregistrés sur l'appareil plutôt que photographiés sur place.
  Future<XFile?> pickFromGallery() {
    return ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 100,
    );
  }
}

@riverpod
ImagePickerService imagePickerService(Ref ref) => const ImagePickerService();
