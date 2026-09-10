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
}

@riverpod
ImagePickerService imagePickerService(Ref ref) => const ImagePickerService();
