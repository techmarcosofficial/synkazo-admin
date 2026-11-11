import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobDetailContext } from './context';
import JobTabs from './JobTabs';

import { Tabs } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('./context', () => ({ useJobDetailContext: vi.fn() }));

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'field-mapping', label: 'Field Mapping' },
  { id: 'run-sync', label: 'Run Sync' },
  { id: 'settings', label: 'Settings' },
  { id: 'pipeline', label: 'Pipeline' },
] as never;

const mapped = [
  { id: 'm1', sourceField: 'email', destFieldKey: 'email', matchDestKey: true },
];

function renderTabs(overrides: Record<string, unknown>) {
  vi.mocked(useJobDetailContext).mockReturnValue({
    job: { id: 'job-1', lastSyncedAt: null },
    jobFieldMappings: [],
    pipelineRequired: true,
    pipelineConfigured: false,
    runLogs: [],
    activeTab: 'overview',
    handleTabChange: vi.fn(),
    ...overrides,
  } as never);
  render(
    <TooltipProvider>
      <Tabs value="overview">
        <JobTabs tabs={tabs} />
      </Tabs>
    </TooltipProvider>,
  );
}

const tab = (name: string) =>
  screen.getByRole('tab', { name: new RegExp(name) });

describe('JobTabs locks', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('locks Run Sync and Pipeline until fields are mapped', () => {
    renderTabs({});

    expect(tab('Run Sync')).toBeDisabled();
    expect(tab('Pipeline')).toBeDisabled();
    expect(tab('Overview')).toBeEnabled();
    expect(tab('Field Mapping')).toBeEnabled();
    expect(tab('Settings')).toBeEnabled();
  });

  it('keeps Run Sync locked until a required pipeline is chosen', () => {
    renderTabs({ jobFieldMappings: mapped });

    expect(tab('Pipeline')).toBeEnabled();
    expect(tab('Run Sync')).toBeDisabled();
  });

  it('unlocks Run Sync once setup is ready', () => {
    renderTabs({ jobFieldMappings: mapped, pipelineConfigured: true });

    expect(tab('Run Sync')).toBeEnabled();
  });
});
