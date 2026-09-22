import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('ServiceWorkerRegistration', () => {
  it('ne rend rien', () => {
    const { container } = render(<ServiceWorkerRegistration />);

    expect(container).toBeEmptyDOMElement();
  });

  it("n'enregistre rien hors production", () => {
    vi.stubEnv('NODE_ENV', 'test');
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistration />);

    expect(register).not.toHaveBeenCalled();
  });

  it('enregistre /sw.js en production quand serviceWorker est disponible', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistration />);

    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it("n'échoue pas en production si navigator.serviceWorker est absent", () => {
    vi.stubEnv('NODE_ENV', 'production');
    const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    // @ts-expect-error -- on simule un navigateur sans support du service worker
    delete navigator.serviceWorker;

    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();

    if (original) {
      Object.defineProperty(navigator, 'serviceWorker', original);
    }
  });
});
