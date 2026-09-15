import { cookies } from 'next/headers';

/**
 * Cookie httpOnly du refresh token du portail bailleur — distinct de
 * `REFRESH_COOKIE_NAME` (agence) : les deux sessions coexistent sans jamais se
 * confondre (rôle dérivé LANDLORD_PORTAL, aucune appartenance à une organisation).
 */
export const PORTAL_REFRESH_COOKIE_NAME = 'immodesk_portal_refresh_token';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export async function setPortalRefreshCookie(refreshToken: string): Promise<void> {
  const store = await cookies();
  store.set(PORTAL_REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.E2E_MOCK !== '1',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

export async function getPortalRefreshCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(PORTAL_REFRESH_COOKIE_NAME)?.value;
}

export async function clearPortalRefreshCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PORTAL_REFRESH_COOKIE_NAME);
}
