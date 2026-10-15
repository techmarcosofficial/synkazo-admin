import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import OrganisationProjectScheduler from './OrganisationProjectScheduler';
import { superAdminOperationsApi } from '@/api/superAdminOperations';
import { superAdminPriorityQueueApi } from '@/api/superAdminPriorityQueue';

vi.mock('@/api/superAdminOperations', () => ({
  superAdminOperationsApi: {
    updateJob: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@/api/superAdminPriorityQueue', () => ({
  superAdminPriorityQueueApi: {
    setMode: vi.fn().mockResolvedValue({ schedulerMode: 'priority' }),
  },
}));
vi.mock('@/features/jobs/components/schedule/JobScheduleModal', () => ({
  default: ({
    jobId,
    saveSchedule,
    onOpenChange,
  }: {
    jobId: string;
    saveSchedule: (payload: object) => Promise<unknown>;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div role="dialog">
      Schedule editor for {jobId}
      <button
        onClick={async () => {
          await saveSchedule({
            scheduleMode: 'daily_time',
            scheduleTimes: ['10:00'],
            scheduleDays: null,
            intervalMinutes: null,
            timezone: 'UTC',
            cronExpression: null,
          });
          onOpenChange(false);
        }}
      >
        Save schedule
      </button>
    </div>
  ),
}));

const queryData = vi.hoisted(() => ({
  config: {
    schedulerMode: 'priority' as 'priority' | 'individual',
    queue: null,
    queueJobs: [],
    associationQueueItems: [],
    displayStatus: 'Waiting',
    activeCycle: null,
    currentQueueJob: null,
    nextQueueJob: null,
  },
  rules: [],
  jobs: [
    {
      id: 'job-1',
      name: 'Customers',
      sourceObject: 'customers',
      destObject: 'contacts',
      scheduleState: 'active',
      scheduleMode: 'daily_time',
      scheduleTimes: ['09:00'],
      syncDirection: 'one_way',
      syncEnabled: true,
      isEnabled: true,
      isRunning: false,
      nextRunAt: null,
    },
  ],
}));
const initialJob = { ...queryData.jobs[0] };

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey.includes('association-rule-options')
      ? queryData.rules
      : queryData.config,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/queries/useSuperAdmin', () => ({
  useSuperAdminJobsQuery: () => ({
    data: queryData.jobs,
    isLoading: false,
    isError: false,
    refetch: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('./lifecycle/LifecycleConfirmDialog', () => ({
  default: ({
    open,
    onSubmit,
  }: {
    open: boolean;
    onSubmit: (values: { reason: string }) => void;
  }) =>
    open ? (
      <button
        onClick={() => onSubmit({ reason: 'Customer requested this change' })}
      >
        Confirm scheduler action
      </button>
    ) : null,
}));

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

beforeEach(() => {
  vi.clearAllMocks();
  queryData.jobs.splice(0, queryData.jobs.length, { ...initialJob });
});
afterEach(cleanup);
afterAll(() => {
  delete (Element.prototype as { scrollIntoView?: () => void }).scrollIntoView;
  vi.unstubAllGlobals();
});

function renderScheduler() {
  render(
    <MemoryRouter>
      <OrganisationProjectScheduler
        organisationId="org-1"
        projectId="project-1"
        organisationName="Northwind"
      />
    </MemoryRouter>,
  );
}

describe('OrganisationProjectScheduler', () => {
  it('shows both queue stages and an inline job add control in priority mode', () => {
    queryData.config.schedulerMode = 'priority';
    renderScheduler();

    expect(screen.getByText('Priority scheduler')).toBeInTheDocument();
    expect(screen.getByText('Step 1 · Priority Queue')).toBeInTheDocument();
    expect(screen.getByText('Step 2 · Association Queue')).toBeInTheDocument();
    expect(screen.getByText('Cycle start')).toBeInTheDocument();
    expect(screen.getByText('Current cycle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add job' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add job' }));
    expect(
      within(
        screen.getByRole('table', { name: 'Priority queue jobs' }),
      ).getByText('Add queue jobs'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('combobox', { name: 'Select job in row 1' }),
    );
    fireEvent.click(screen.getByText('Customers'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply (1)' }));
    expect(screen.getByText('Pending save')).toBeInTheDocument();
    expect(screen.getByText('1 configured job')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Project schedule controls'),
    ).not.toBeInTheDocument();
  });

  it('opens configuration here and saves through the selected organisation route', async () => {
    queryData.config.schedulerMode = 'individual';
    renderScheduler();

    expect(screen.getByText('Project job schedules')).toBeInTheDocument();
    expect(screen.getByText('Daily at 09:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Schedule editor for job-1',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }));
    expect(superAdminOperationsApi.updateJob).not.toHaveBeenCalled();
    expect(await screen.findByText('Pending save')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(superAdminOperationsApi.updateJob).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm scheduler action' }),
    );
    await waitFor(() =>
      expect(superAdminOperationsApi.updateJob).toHaveBeenCalledWith(
        'org-1',
        'project-1',
        'job-1',
        expect.objectContaining({ scheduleTimes: ['10:00'] }),
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Pause all' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Schedule summary card')).not.toBeInTheDocument();
  });

  it('disables Add job when every job is already in the queue', () => {
    queryData.config.schedulerMode = 'priority';
    queryData.jobs.length = 0;
    renderScheduler();
    expect(screen.getByRole('button', { name: 'Add job' })).toBeDisabled();
  });

  it('offers Resume all when a configured schedule is off', () => {
    queryData.config.schedulerMode = 'individual';
    queryData.jobs[0].syncEnabled = false;
    renderScheduler();

    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resume all' })).toBeEnabled();
  });

  it('keeps a mode change local until the footer Save is confirmed', async () => {
    queryData.config.schedulerMode = 'individual';
    renderScheduler();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Enable priority scheduler' }),
    );
    expect(superAdminPriorityQueueApi.setMode).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(superAdminPriorityQueueApi.setMode).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm scheduler action' }),
    );
    await waitFor(() =>
      expect(superAdminPriorityQueueApi.setMode).toHaveBeenCalledWith(
        'org-1',
        'project-1',
        true,
        'Customer requested this change',
      ),
    );
  });
});
