import { cookies } from 'next/headers';

/** Nom du cookie httpOnly portant le refresh token. Jamais lu depuis le client. */
export const REFRESH_COOKIE_NAME = 'immodesk_refresh_token';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export async function setRefreshCookie(refreshToken: string): Promise<void> {
  const store = await cookies();
  store.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    // Toujours en clair sur localhost/e2e : le flag Secure exigerait HTTPS, absent en test.
    secure: process.env.NODE_ENV === 'production' && process.env.E2E_MOCK !== '1',
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS_SECONDS,
  });
}

export async function getRefreshCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE_NAME)?.value;
}

export async function clearRefreshCookie(): Promise<void> {
  const store = await cookies();
  store.delete(REFRESH_COOKIE_NAME);
}
