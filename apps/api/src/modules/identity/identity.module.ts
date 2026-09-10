import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ACCESS_TOKEN_VERIFIER } from '../../shared/auth/auth.contracts';
import { AppThrottlerModule } from '../../shared/throttler/throttler.module';
import { OtpAuthService } from './application/otp-auth.service';
import { ProfileService } from './application/profile.service';
import { SessionService } from './application/session.service';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { MeController } from './presentation/me.controller';

/**
 * Module `identity` : utilisateurs, identifiants, codes OTP, sessions
 * (refresh tokens) et clés d'API.
 *
 * Global car il fournit `ACCESS_TOKEN_VERIFIER`, dont dépend la garde
 * d'authentification enregistrée au niveau de l'application.
 */
@Global()
@Module({
  imports: [JwtModule.register({}), AppThrottlerModule],
  controllers: [AuthController, MeController],
  providers: [
    JwtTokenService,
    SessionService,
    OtpAuthService,
    ProfileService,
    { provide: ACCESS_TOKEN_VERIFIER, useExisting: JwtTokenService },
  ],
  exports: [ACCESS_TOKEN_VERIFIER, JwtTokenService, SessionService, ProfileService, OtpAuthService],
})
export class IdentityModule {}
