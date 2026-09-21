import { ApiProperty } from '@nestjs/swagger';

/**
 * État DÉRIVÉ de l'onboarding guidé (`GET /v1/onboarding/{orgId}/state`) :
 * aucun champ ici ne correspond à une colonne stockée, chacun est recalculé
 * à la lecture (`GuidedOnboardingService.state`).
 */
export class OnboardingStateDto {
  @ApiProperty({ description: 'Un premier bien existe pour cette organisation.' })
  firstPropertyDone!: boolean;

  @ApiProperty({ description: 'Un premier bail existe pour cette organisation.' })
  firstLeaseDone!: boolean;

  @ApiProperty({ description: 'Une invitation a déjà été envoyée pour cette organisation.' })
  inviteDone!: boolean;
}
