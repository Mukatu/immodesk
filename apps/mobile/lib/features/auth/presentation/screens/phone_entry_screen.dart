import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../shared/widgets/phone_field.dart';
import '../../domain/otp_state_machine.dart';
import '../controllers/otp_login_controller.dart';

/// Premier écran du parcours de connexion : saisie du numéro de téléphone.
class PhoneEntryScreen extends ConsumerStatefulWidget {
  const PhoneEntryScreen({super.key});

  static const String path = RoutePaths.loginPhone;

  @override
  ConsumerState<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends ConsumerState<PhoneEntryScreen> {
  final TextEditingController _controller = TextEditingController(
    text: '+242',
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final OtpLoginState state = ref.watch(otpLoginControllerProvider);

    ref.listen<OtpLoginState>(otpLoginControllerProvider, (previous, next) {
      final bool justSent =
          next.phase == OtpPhase.codeSent &&
          previous?.phase != OtpPhase.codeSent;
      if (justSent) {
        context.push(RoutePaths.loginOtp);
      }
    });

    final bool isLoading = state.phase == OtpPhase.requestingCode;

    return Scaffold(
      appBar: AppBar(title: const Text('Connexion')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Bienvenue sur Immodesk',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                'Saisissez votre numéro de téléphone pour recevoir un '
                'code de connexion.',
              ),
              const SizedBox(height: 24),
              PhoneField(
                controller: _controller,
                enabled: !isLoading,
                autofocus: true,
                errorText: state.errorCode == 'PHONE.INVALID'
                    ? state.errorMessage
                    : null,
                onSubmitted: (_) => _submit(),
              ),
              if (state.errorMessage != null &&
                  state.errorCode != 'PHONE.INVALID' &&
                  state.errorOrigin == OtpErrorOrigin.request) ...[
                const SizedBox(height: 12),
                Text(
                  state.errorMessage!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
              const SizedBox(height: 24),
              FilledButton(
                key: const ValueKey('send-code-button'),
                onPressed: isLoading ? null : _submit,
                child: isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Envoyer le code'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _submit() {
    ref.read(otpLoginControllerProvider.notifier).requestCode(_controller.text);
  }
}
