import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'image_compressor.g.dart';

/// Résultat d'une compression : dimensions finales et octets encodés.
class CompressedImage {
  const CompressedImage({
    required this.bytes,
    required this.width,
    required this.height,
  });

  final Uint8List bytes;
  final int width;
  final int height;
}

/// Compresse une photo de bien côté appareil avant envoi : redimensionne
/// au plus grand côté à [targetMaxDimension] px et encode en JPEG à
/// [quality] (0-100). Implémentation en Dart pur (paquet `image`), donc
/// testable en test unitaire sans dépendre d'un canal de plateforme
/// (contrairement à `flutter_image_compress`).
class ImageCompressor {
  const ImageCompressor();

  static const int defaultMaxDimension = 1600;
  static const int defaultQuality = 80;

  CompressedImage compressBytes(
    Uint8List sourceBytes, {
    int targetMaxDimension = defaultMaxDimension,
    int quality = defaultQuality,
  }) {
    final img.Image? decoded = img.decodeImage(sourceBytes);
    if (decoded == null) {
      throw const FormatException('Image illisible : format non supporté.');
    }

    final int largestSide = decoded.width >= decoded.height
        ? decoded.width
        : decoded.height;

    final img.Image resized = largestSide <= targetMaxDimension
        ? decoded
        : (decoded.width >= decoded.height
              ? img.copyResize(decoded, width: targetMaxDimension)
              : img.copyResize(decoded, height: targetMaxDimension));

    final List<int> encoded = img.encodeJpg(resized, quality: quality);
    return CompressedImage(
      bytes: Uint8List.fromList(encoded),
      width: resized.width,
      height: resized.height,
    );
  }

  /// Lit [source], compresse et écrit le résultat dans [destinationPath].
  Future<File> compressFile(
    File source,
    String destinationPath, {
    int targetMaxDimension = defaultMaxDimension,
    int quality = defaultQuality,
  }) async {
    final Uint8List sourceBytes = await source.readAsBytes();
    final CompressedImage compressed = compressBytes(
      sourceBytes,
      targetMaxDimension: targetMaxDimension,
      quality: quality,
    );
    final File destination = File(destinationPath);
    await destination.create(recursive: true);
    return destination.writeAsBytes(compressed.bytes);
  }
}

@riverpod
ImageCompressor imageCompressor(Ref ref) => const ImageCompressor();
