import { describe, expect, it } from 'vitest';

import { hasBothConnections } from './projectConnections';

import type { ConnectionExt } from '@/features/projects/hooks';

function connection(
  connectionType: 'source' | 'destination',
  environment: 'sandbox' | 'production' = 'production',
): ConnectionExt {
  return {
    id: `${environment}-${connectionType}`,
    projectId: 'project-1',
    platformId: connectionType === 'source' ? 'servicetitan' : 'hubspot',
    connectionType,
    environment,
    status: 'connected',
  } as ConnectionExt;
}

describe('hasBothConnections', () => {
  it('requires a connected source and destination in the same environment', () => {
    expect(hasBothConnections([])).toBe(false);
    expect(hasBothConnections([connection('source')])).toBe(false);
    expect(
      hasBothConnections([
        connection('source', 'production'),
        connection('destination', 'sandbox'),
      ]),
    ).toBe(false);
    expect(
      hasBothConnections([connection('source'), connection('destination')]),
    ).toBe(true);
  });
});
