import { setupServer } from 'msw/node';

import { handlers } from '@/mocks/handlers';

/** Intercepteur MSW côté serveur Next (route handlers /api/auth/*). E2E uniquement. */
export const mockServer = setupServer(...handlers);
