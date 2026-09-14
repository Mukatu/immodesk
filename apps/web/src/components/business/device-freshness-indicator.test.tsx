import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DeviceFreshnessIndicator } from '@/components/business/device-freshness-indicator';

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

describe('DeviceFreshnessIndicator', () => {
  it("indique « Jamais synchronisé » quand aucun lot n'a été reçu", () => {
    render(<DeviceFreshnessIndicator lastBatchAt={null} />);
    expect(screen.getByText('Jamais synchronisé')).toBeInTheDocument();
  });

  it('indique la synchronisation récente sous le seuil de 24 h', () => {
    render(<DeviceFreshnessIndicator lastBatchAt={hoursAgoIso(2)} />);
    expect(screen.getByText(/Synchronisé il y a/)).toBeInTheDocument();
  });

  it('met en évidence un appareil silencieux depuis plus de 24 h', () => {
    render(<DeviceFreshnessIndicator lastBatchAt={hoursAgoIso(72)} />);
    expect(screen.getByText(/Silencieux depuis/)).toBeInTheDocument();
  });
});
