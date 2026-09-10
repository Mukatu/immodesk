import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/otp_field.dart';
import '../../domain/otp_state_machine.dart';
import '../controllers/otp_login_controller.dart';

/// Deuxième écran du parcours de connexion : saisie du code à 6 chiffres,
/// avec renvoi possible après un compte à rebours de 60 s.
class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key});

  static const String path = RoutePaths.loginOtp;

  @override
  ConsumerState<OtpVerificationScreen> createState() =>
      _OtpVerificationScreenState();
}

class _OtpVerificationScreenState
    extends ConsumerState<OtpVerificationScreen> {
  String _code = '';

  @override
  Widget build(BuildContext context) {
    final OtpLoginState state = ref.watch(otpLoginControllerProvider);

    ref.listen<OtpLoginState>(otpLoginControllerProvider, (previous, next) {
      final bool justVerified =
          next.phase == OtpPhase.verified &&
          previous?.phase != OtpPhase.verified;
      if (justVerified) {
        context.go(RoutePaths.organizationSelect);
      }
    });

    final bool isVerifying = state.phase == OtpPhase.verifyingCode;
    final bool isLocked =
        state.phase == OtpPhase.locked || state.phase == OtpPhase.rateLimited;

    return Scaffold(
      appBar: AppBar(title: const Text('Code de vérification')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Entrez le code reçu au ${state.phone ?? ''}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 24),
              OtpField(
                enabled: !isLocked && !isVerifying,
                onChanged: (value) => _code = value,
                onCompleted: (value) => _verify(value),
                errorText: state.errorOrigin == OtpErrorOrigin.verify
                    ? state.errorMessage
                    : null,
              ),
              const SizedBox(height: 24),
              FilledButton(
                key: const ValueKey('verify-code-button'),
                onPressed: isVerifying || isLocked
                    ? null
                    : () => _verify(_code),
                child: isVerifying
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Vérifier'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: state.canResend && !isVerifying
                    ? () => ref
                          .read(otpLoginControllerProvider.notifier)
                          .requestCode(state.phone ?? '')
                    : null,
                child: Text(
                  state.canResend
                      ? 'Renvoyer le code'
                      : 'Renvoyer le code (${state.secondsUntilResend}s)',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _verify(String code) {
    if (code.length == 6) {
      ref.read(otpLoginControllerProvider.notifier).verifyCode(code);
    }
  }
}
