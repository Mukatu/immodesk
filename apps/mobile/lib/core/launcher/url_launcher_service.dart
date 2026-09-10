import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:url_launcher/url_launcher.dart' as launcher;

part 'url_launcher_service.g.dart';

/// Enveloppe fine autour de `url_launcher`, injectable par Riverpod afin
/// d'être remplacée par un faux objet dans les tests de widget (appel /
/// WhatsApp ne doivent pas réellement ouvrir d'application pendant les
/// tests).
class UrlLauncherService {
  const UrlLauncherService();

  /// Ouvre le composeur d'appel du téléphone (`tel:`).
  Future<bool> call(String e164Phone) {
    final Uri uri = Uri(scheme: 'tel', path: e164Phone);
    return launcher.launchUrl(uri);
  }

  /// Ouvre une conversation WhatsApp (`https://wa.me/<numero>`), sans `+`
  /// ni espace dans le numéro.
  Future<bool> openWhatsapp(String e164Phone) {
    final String digitsOnly = e164Phone.replaceAll(RegExp(r'[^0-9]'), '');
    final Uri uri = Uri.parse('https://wa.me/$digitsOnly');
    return launcher.launchUrl(
      uri,
      mode: launcher.LaunchMode.externalApplication,
    );
  }
}

@riverpod
UrlLauncherService urlLauncherService(Ref ref) => const UrlLauncherService();
