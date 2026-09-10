import '../../../../core/network/auth_token_store.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/me_result.dart';
import '../models/otp_request_result.dart';
import '../models/verify_otp_result.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._remote, this._tokenStore);

  final AuthRemoteDataSource _remote;
  final AuthTokenStore _tokenStore;

  @override
  Future<OtpRequestResult> requestOtp({
    required String phone,
    String channel = 'SMS',
  }) {
    return _remote.requestOtp(phone: phone, channel: channel);
  }

  @override
  Future<VerifyOtpResult> verifyOtp({
    required String phone,
    required String code,
    String? deviceName,
  }) async {
    final VerifyOtpResult result = await _remote.verifyOtp(
      phone: phone,
      code: code,
      deviceName: deviceName,
    );
    _tokenStore.setAccessToken(result.accessToken);
    await _tokenStore.saveRefreshToken(result.refreshToken);
    return result;
  }

  @override
  Future<MeResult> fetchMe() => _remote.fetchMe();

  @override
  Future<void> logout() async {
    final String? refreshToken = await _tokenStore.readRefreshToken();
    if (refreshToken != null) {
      try {
        await _remote.logout(refreshToken);
      } catch (_) {
        // Deconnexion best-effort : la session locale est effacee meme si
        // l'appel serveur echoue (hors ligne, jeton deja revoque...).
      }
    }
    await _tokenStore.clear();
  }
}
