/**
 * Messagerie réelle exigée en production (les fournisseurs simulés y sont refusés) :
 * à fusionner dans tout jeu de configuration de production qui doit démarrer.
 */
export const PRODUCTION_MESSAGING = {
  WHATSAPP_PROVIDER: 'meta',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
  WHATSAPP_ACCESS_TOKEN: 'jeton-meta-de-test',
  SMS_PROVIDER: 'android_gateway',
  SMS_GATEWAY_URL: 'https://sms-gateway.example.org',
  SMS_GATEWAY_USERNAME: 'passerelle',
  SMS_GATEWAY_PASSWORD: 'mot-de-passe-passerelle',
} as const;
