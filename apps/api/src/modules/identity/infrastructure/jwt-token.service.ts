import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { DomainError } from '../../../shared/errors/domain-error';
import type { AccessTokenPayload, AccessTokenVerifier } from '../../../shared/auth/auth.contracts';

/**
 * Émission et vérification des jetons d'accès.
 *
 * L'algorithme est piloté par la configuration : HS256 (secret partagé) en
 * développement, RS256 (paire de clés) en déploiement réel, sans changement
 * de code appelant.
 */
@Injectable()
export class JwtTokenService implements AccessTokenVerifier {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async signAccessToken(userId: string, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, sid: sessionId, typ: 'access' };
    return this.jwt.signAsync(payload, {
      algorithm: this.config.JWT_ALGORITHM,
      expiresIn: this.config.JWT_ACCESS_TTL_SECONDS,
      issuer: this.config.JWT_ISSUER,
      audience: this.config.JWT_AUDIENCE,
      ...(this.config.JWT_ALGORITHM === 'RS256'
        ? { privateKey: this.config.JWT_ACCESS_PRIVATE_KEY }
        : { secret: this.config.JWT_ACCESS_SECRET }),
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        algorithms: [this.config.JWT_ALGORITHM],
        issuer: this.config.JWT_ISSUER,
        audience: this.config.JWT_AUDIENCE,
        ...(this.config.JWT_ALGORITHM === 'RS256'
          ? { publicKey: this.config.JWT_ACCESS_PUBLIC_KEY }
          : { secret: this.config.JWT_ACCESS_SECRET }),
      });
    } catch {
      throw new DomainError('IAM.TOKEN_INVALID');
    }
    // Un refresh token ne doit jamais servir de jeton d'accès.
    if (payload.typ !== 'access' || !payload.sub || !payload.sid) {
      throw new DomainError('IAM.TOKEN_INVALID');
    }
    return payload;
  }

  get accessTtlSeconds(): number {
    return this.config.JWT_ACCESS_TTL_SECONDS;
  }
}
