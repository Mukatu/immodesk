import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;
import 'package:immodesk_mobile/core/media/image_compressor.dart';

void main() {
  group('ImageCompressor', () {
    final ImageCompressor compressor = const ImageCompressor();

    test('redimensionne au plus grand côté à 1600 px (photo en paysage)', () {
      final img.Image source = img.Image(width: 3200, height: 2000);
      img.fill(source, color: img.ColorRgb8(120, 80, 40));
      final sourceBytes = img.encodePng(source);

      final CompressedImage result = compressor.compressBytes(sourceBytes);

      expect(result.width, 1600);
      expect(result.height, 1000);
    });

    test('redimensionne au plus grand côté à 1600 px (photo en portrait)', () {
      final img.Image source = img.Image(width: 1200, height: 2400);
      img.fill(source, color: img.ColorRgb8(10, 200, 30));
      final sourceBytes = img.encodePng(source);

      final CompressedImage result = compressor.compressBytes(sourceBytes);

      expect(result.height, 1600);
      expect(result.width, 800);
    });

    test('ne grandit pas une image déjà plus petite que la cible', () {
      final img.Image source = img.Image(width: 400, height: 300);
      img.fill(source, color: img.ColorRgb8(0, 0, 0));
      final sourceBytes = img.encodePng(source);

      final CompressedImage result = compressor.compressBytes(sourceBytes);

      expect(result.width, 400);
      expect(result.height, 300);
    });

    test('encode le résultat en JPEG valide', () {
      final img.Image source = img.Image(width: 2000, height: 1000);
      img.fill(source, color: img.ColorRgb8(255, 255, 255));
      final sourceBytes = img.encodePng(source);

      final CompressedImage result = compressor.compressBytes(
        sourceBytes,
        quality: 80,
      );

      final img.Image? decoded = img.decodeJpg(result.bytes);
      expect(decoded, isNotNull);
      expect(decoded!.width, 1600);
    });
  });
}
