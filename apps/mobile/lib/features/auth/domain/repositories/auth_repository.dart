import '../../data/models/me_result.dart';
import '../../data/models/otp_request_result.dart';
import '../../data/models/verify_otp_result.dart';

/// Port du domaine `auth` vers l'API (implémenté par
/// `AuthRepositoryImpl`, couche `data`).
abstract interface class AuthRepository {
  Future<OtpRequestResult> requestOtp({
    required String phone,
    String channel = 'SMS',
  });

  Future<VerifyOtpResult> verifyOtp({
    required String phone,
    required String code,
    String? deviceName,
  });

  Future<MeResult> fetchMe();

  Future<void> logout();
}
