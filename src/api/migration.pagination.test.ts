import { describe, expect, it, vi } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./apiClient', () => ({ default: { get } }));

import { migrationApi } from './migration';

describe('migration item pagination', () => {
  it('collects bounded pages without hiding later items', async () => {
    get.mockReset();
    get.mockResolvedValueOnce({ data: { data: [{ id: 'first' }], total: 2 } });
    get.mockResolvedValueOnce({ data: { data: [{ id: 'second' }], total: 2 } });
    const items = await migrationApi.getRunItems('project', 'run');
    expect(items.map((item) => item.id)).toEqual(['first', 'second']);
    expect(get).toHaveBeenNthCalledWith(1, '/projects/project/migration/runs/run/items', { params: { page: 1, limit: 100 } });
    expect(get).toHaveBeenNthCalledWith(2, '/projects/project/migration/runs/run/items', { params: { page: 2, limit: 100 } });
  });
});
