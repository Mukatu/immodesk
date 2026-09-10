import 'package:flutter_test/flutter_test.dart';
import 'package:immodesk_mobile/features/auth/domain/otp_state_machine.dart';

void main() {
  group('OtpStateMachine', () {
    test('commence en enteringPhone', () {
      final machine = OtpStateMachine();
      expect(machine.phase, OtpPhase.enteringPhone);
    });

    test('parcours nominal : demande -> envoi -> vérification -> vérifié', () {
      final machine = OtpStateMachine();

      machine.startRequest();
      expect(machine.phase, OtpPhase.requestingCode);

      machine.requestSucceeded();
      expect(machine.phase, OtpPhase.codeSent);

      machine.startVerification();
      expect(machine.phase, OtpPhase.verifyingCode);

      machine.verificationSucceeded();
      expect(machine.phase, OtpPhase.verified);
    });

    test('IAM.RATE_LIMITED lors de la demande passe en rateLimited', () {
      final machine = OtpStateMachine();
      machine.startRequest();
      machine.requestFailed('IAM.RATE_LIMITED');
      expect(machine.phase, OtpPhase.rateLimited);
    });

    test('une erreur de demande générique revient à enteringPhone', () {
      final machine = OtpStateMachine();
      machine.startRequest();
      machine.requestFailed('UNKNOWN');
      expect(machine.phase, OtpPhase.enteringPhone);
    });

    test('IAM.OTP_INVALID lors de la vérification passe en invalidCode', () {
      final machine = OtpStateMachine();
      machine.startRequest();
      machine.requestSucceeded();
      machine.startVerification();
      machine.verificationFailed('IAM.OTP_INVALID');
      expect(machine.phase, OtpPhase.invalidCode);
    });

    test('IAM.OTP_LOCKED lors de la vérification passe en locked', () {
      final machine = OtpStateMachine();
      machine.startRequest();
      machine.requestSucceeded();
      machine.startVerification();
      machine.verificationFailed('IAM.OTP_LOCKED');
      expect(machine.phase, OtpPhase.locked);
    });

    test('IAM.RATE_LIMITED lors de la vérification passe en rateLimited', () {
      final machine = OtpStateMachine();
      machine.startRequest();
      machine.requestSucceeded();
      machine.startVerification();
      machine.verificationFailed('IAM.RATE_LIMITED');
      expect(machine.phase, OtpPhase.rateLimited);
    });

    test('depuis invalidCode, une nouvelle vérification est possible', () {
      final machine = OtpStateMachine();
      machine.startRequest();
      machine.requestSucceeded();
      machine.startVerification();
      machine.verificationFailed('IAM.OTP_INVALID');

      machine.startVerification();
      expect(machine.phase, OtpPhase.verifyingCode);
      machine.verificationSucceeded();
      expect(machine.phase, OtpPhase.verified);
    });

    test('reset revient à enteringPhone depuis n\'importe quel état', () {
      final machine = OtpStateMachine();
      machine.startRequest();
      machine.requestSucceeded();
      machine.reset();
      expect(machine.phase, OtpPhase.enteringPhone);
    });

    test('une transition invalide lève une StateError', () {
      final machine = OtpStateMachine();
      // On ne peut pas verifier un code sans avoir d'abord demande et
      // recu un code.
      expect(() => machine.startVerification(), throwsStateError);
    });

    test('on ne peut pas confirmer une reception sans demande en cours', () {
      final machine = OtpStateMachine();
      expect(() => machine.requestSucceeded(), throwsStateError);
    });
  });
}
