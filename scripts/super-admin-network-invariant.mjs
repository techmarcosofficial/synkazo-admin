// Browser-level guard for the platform shell. Run after a build whose API base
// is http://127.0.0.1:3001/api. Chrome DevTools records and fulfills requests
// without a backend or test account.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const chromeBin = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const userDataDir = await mkdtemp(join(tmpdir(), 'synkazo-platform-network-'));
const requests = [];
const organisationQueries = [];
let historicalMeSeen = false;
let browser;
let server;
let socket;

const overview = {
  generatedAt: new Date().toISOString(),
  organisations: {
    total: 0,
    byStatus: {},
    bySubscriptionStatus: {},
    pastDueCount: 0,
    suspendedCount: 0,
  },
  jobs: {
    queue: {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      workerOnline: true,
    },
  },
  recentAlerts: [],
  systemHealth: {
    processUptimeSeconds: 1,
    memoryHeapUsedMb: 1,
    memoryHeapTotalMb: 2,
    redisPingMs: 1,
  },
};

function analyticsFixture(url) {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const currency = url.searchParams.get('currency') || 'USD';
  const quality = {
    status: 'provisional',
    source: 'payment_results',
    message: 'Payment totals and dates are awaiting provider reconciliation.',
    verifiedFrom: null,
    verifiedThrough: null,
    reconciliationReference: null,
  };
  const totals = {
    completed: 8,
    failed: 1,
    partial: 1,
    terminalRuns: 10,
    running: 0,
    recordsWritten: 100,
    recordsFetched: 120,
    durationMs: 3600000,
    missingDurationRuns: 2,
    unattributedRuns: 0,
    successRate: 0.8,
  };
  if (url.pathname.endsWith('/organisations'))
    return {
      generatedAt: new Date().toISOString(),
      currency,
      quality,
      total: 1,
      page: 1,
      limit: 10,
      data: [
        {
          organisationId: 'org-1',
          name: 'Test Organisation',
          status: 'active',
          archived: false,
          planName: 'Pro',
          collectedMinor: null,
          runs: 10,
          recordsWritten: 100,
          durationMs: 3600000,
          missingDurationRuns: 2,
          failedRuns: 1,
          partialRuns: 1,
          successRate: 0.8,
        },
      ],
    };
  return {
    generatedAt: new Date().toISOString(),
    definitionVersion: 'platform-analytics-v1',
    cohortBasis: 'current-plan',
    currency,
    range: {
      from,
      to,
      granularity: url.searchParams.get('granularity') || 'day',
      timezone: 'UTC',
    },
    sections: {
      revenue: {
        collectedMinor: null,
        recordedPayments: 2,
        unattributedPayments: 0,
        currencies: ['USD'],
        series: [{ bucket: from, collectedMinor: null, payments: 2 }],
        quality,
      },
      processing: {
        totals,
        series: [{ ...totals, bucket: from }],
        quality: { ...quality, source: 'sync_run_logs', status: 'partial' },
      },
      customers: {
        asOf: new Date().toISOString(),
        total: 1,
        byStatus: [{ status: 'active', count: 1 }],
        bySubscriptionStatus: [{ status: 'past_due', count: 1 }],
        byPlan: [{ planId: null, name: 'Unassigned', count: 1 }],
      },
    },
    errors: {},
    unavailableMetrics: [
      {
        metric: 'MRR, ARR and churn',
        reason: 'Effective recurring terms are not yet verified.',
      },
    ],
  };
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const mime = (file) =>
  ({
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  })[extname(file)] || 'application/octet-stream';

async function startStaticServer() {
  server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    const file = join(dist, path === '/' ? 'index.html' : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': mime(file) });
      res.end(body);
    } catch {
      const body = await readFile(join(dist, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(body);
    }
  });
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  return server.address().port;
}

async function chromePort() {
  const portFile = join(userDataDir, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    if (browser.exitCode !== null)
      throw new Error(`Chrome exited: ${browser.exitCode}`);
    try {
      return Number((await readFile(portFile, 'utf8')).split('\n')[0]);
    } catch {
      await wait(100);
    }
  }
  throw new Error('Chrome did not expose a debugging port');
}

function connectCdp(url) {
  socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;
  const ready = new Promise((done, reject) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      message.error
        ? task.reject(new Error(message.error.message))
        : task.resolve(message.result);
    } else if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      requests.push(`${request.method} ${url.pathname}`);
      if (
        request.method === 'GET' &&
        url.pathname === '/api/super-admin/organisations'
      )
        organisationQueries.push(url.search);
      const historicalSession = request.headers.Authorization?.includes(
        'historical-test-token',
      );
      if (url.pathname === '/api/auth/me' && historicalSession)
        historicalMeSeen = true;
      const responseHeaders = [
        {
          name: 'Access-Control-Allow-Origin',
          value: `http://127.0.0.1:${appPort}`,
        },
        { name: 'Access-Control-Allow-Credentials', value: 'true' },
        {
          name: 'Access-Control-Allow-Headers',
          value: 'authorization,content-type',
        },
        {
          name: 'Access-Control-Allow-Methods',
          value: 'GET,POST,PATCH,OPTIONS',
        },
        { name: 'Content-Type', value: 'application/json' },
      ];
      let data =
        url.pathname === '/api/auth/me'
          ? {
              data: {
                id: 'platform-operator',
                email: 'admin@example.test',
                fullName: 'Platform Operator',
                role: 'super_admin',
                organisationId: historicalSession ? 'legacy-org' : null,
              },
            }
          : url.pathname === '/api/super-admin/platform/overview'
            ? { data: overview }
            : url.pathname === '/api/users'
              ? {
                  data: [
                    {
                      id: 'tenant-user-1',
                      email: 'tenant@example.test',
                      fullName: 'Tenant User',
                      role: 'editor',
                      organisationId: 'org-1',
                      isActive: true,
                      createdAt: '2026-01-01T00:00:00.000Z',
                    },
                    {
                      id: 'platform-operator',
                      email: 'admin@example.test',
                      fullName: 'Platform Operator',
                      role: 'super_admin',
                      organisationId: 'legacy-org',
                      isActive: true,
                      createdAt: '2026-01-01T00:00:00.000Z',
                    },
                  ],
                }
              : url.pathname === '/api/super-admin/platform/super-admins'
                ? {
                    data: [
                      {
                        id: 'platform-operator',
                        email: 'admin@example.test',
                        fullName: 'Platform Operator',
                        role: 'super_admin',
                        isActive: true,
                        createdAt: '2026-01-01T00:00:00.000Z',
                        updatedAt: '2026-01-01T00:00:00.000Z',
                      },
                    ],
                  }
                : url.pathname === '/api/super-admin/organisations'
                  ? {
                      data: [
                        {
                          id: 'org-1',
                          name: 'Test Organisation',
                          slug: 'test-org',
                          status: 'active',
                          subscriptionStatus: 'active',
                          owner: {
                            id: 'owner-1',
                            email: 'owner@example.test',
                            fullName: 'Test Owner',
                            isActive: true,
                          },
                          plan: { id: 'plan-1', name: 'Test Plan' },
                          memberCount: 3,
                          projectCount: 2,
                          createdAt: '2026-01-01T00:00:00.000Z',
                        },
                      ],
                      total: 1,
                      page: 1,
                      limit: 10,
                    }
                  : url.pathname === '/api/super-admin/organisations/org-1'
                    ? {
                        data: {
                          id: 'org-1',
                          name: 'Test Organisation',
                          slug: 'test-org',
                          description:
                            'A customer workspace connecting sales and service teams.',
                          logoUrl: null,
                          status: 'active',
                          owner: {
                            id: 'owner-1',
                            email: 'owner@example.test',
                            fullName: 'Test Owner',
                            isActive: true,
                          },
                          settings: { defaultCurrency: 'USD' },
                          plan: {
                            id: 'plan-1',
                            name: 'Test Plan',
                            subscriptionStatus: 'active',
                          },
                          paymentHoldActive: false,
                          paymentHoldSince: null,
                          manualHoldReason: null,
                          usage: {
                            members: { total: 3, active: 3, limit: 10 },
                            projects: { count: 1, limit: 5, over: false },
                            jobs: { count: 1, limit: 20, over: false },
                            records: {
                              used: 1260,
                              limit: 10000,
                              remaining: 8740,
                              periodStart: '2026-10-01T00:00:00.000Z',
                            },
                          },
                          createdAt: '2026-01-01T00:00:00.000Z',
                          updatedAt: '2026-10-01T00:00:00.000Z',
                        },
                      }
                    : url.pathname ===
                        '/api/super-admin/organisations/org-1/billing/overview'
                      ? {
                          data: {
                            plan: {
                              planId: 'plan-1',
                              planName: 'Test Plan',
                              subscriptionStatus: 'active',
                              billingInterval: 'month',
                              trialEndsAt: null,
                              trialPendingStart: false,
                              currentPeriodEnd: '2026-11-01T00:00:00.000Z',
                              cancelAtPeriodEnd: false,
                              overLimit: {
                                projects: {
                                  count: 1,
                                  limit: 5,
                                  over: false,
                                },
                                jobs: { count: 1, limit: 20, over: false },
                                teamMembers: {
                                  count: 3,
                                  limit: 10,
                                  over: false,
                                },
                                records: {
                                  count: 1260,
                                  limit: 10000,
                                  over: false,
                                },
                                isOverLimit: false,
                              },
                            },
                            usage: {
                              recordsSynced: 1260,
                              maxRecordsPerMonth: 10000,
                              periodStart: '2026-10-01T00:00:00.000Z',
                              remaining: 8740,
                            },
                          },
                        }
                      : url.pathname ===
                          '/api/super-admin/organisations/org-1/projects'
                        ? {
                            data: [
                              {
                                id: 'project-1',
                                organisationId: 'org-1',
                                name: 'Scoped project',
                                description: null,
                                status: 'active',
                                sourcePlatformId: 'hubspot',
                                destPlatformId: 'salesforce',
                                syncMode: 'one_way',
                                jobCount: 1,
                                enabledJobCount: 1,
                                lastSyncedAt: null,
                              },
                            ],
                            total: 1,
                            page: 1,
                            limit: 10,
                          }
                        : url.pathname ===
                            '/api/super-admin/organisations/org-1/projects/project-1'
                          ? {
                              data: {
                                id: 'project-1',
                                organisationId: 'org-1',
                                name: 'Scoped project',
                                description: null,
                                status: 'active',
                                sourcePlatformId: 'hubspot',
                                destPlatformId: 'salesforce',
                                syncMode: 'one_way',
                                jobCount: 1,
                                enabledJobCount: 1,
                                lastSyncedAt: null,
                                schedulerMode: 'interval',
                                activeEnvironment: 'production',
                                totalRecordsSynced: 12,
                                totalErrorCount: 0,
                              },
                            }
                          : url.pathname ===
                              '/api/super-admin/organisations/org-1/projects/project-1/jobs'
                            ? {
                                data: [
                                  {
                                    id: 'job-1',
                                    projectId: 'project-1',
                                    organisationId: 'org-1',
                                    name: 'Scoped job',
                                    status: 'active',
                                    isEnabled: true,
                                    syncEnabled: true,
                                    isRunning: false,
                                    scheduleState: 'active',
                                    syncDirection: 'one_way',
                                    sourceObject: 'contacts',
                                    destObject: 'contacts',
                                    lastSyncedAt: null,
                                    nextRunAt: null,
                                    checkpointPage: null,
                                    checkpointSince: null,
                                    checkpointRunId: null,
                                    syncAllPage: null,
                                  },
                                ],
                              }
                            : url.pathname ===
                                '/api/super-admin/organisations/org-1/projects/project-1/jobs/job-1'
                              ? {
                                  data: {
                                    id: 'job-1',
                                    projectId: 'project-1',
                                    organisationId: 'org-1',
                                    name: 'Scoped job',
                                    status: 'active',
                                    isEnabled: true,
                                    syncEnabled: true,
                                    isRunning: false,
                                    scheduleState: 'active',
                                    syncDirection: 'one_way',
                                    sourceObject: 'contacts',
                                    destObject: 'contacts',
                                    lastSyncedAt: null,
                                    nextRunAt: null,
                                    checkpointPage: null,
                                    checkpointSince: null,
                                    checkpointRunId: null,
                                    syncAllPage: null,
                                    scheduleMode: 'interval',
                                    intervalMinutes: 30,
                                    fieldMappings: [],
                                    dependsOnJobId: null,
                                    recentFailures: [],
                                  },
                                }
                              : url.pathname ===
                                  '/api/super-admin/organisations/org-1/projects/project-1/jobs/job-1/sync-logs'
                                ? { data: [], total: 0, page: 1, limit: 20 }
                                : url.pathname ===
                                    '/api/super-admin/organisations/org-1/projects/project-1/discovery/hubspot/contacts/properties'
                                  ? {
                                      data: {
                                        properties: [
                                          {
                                            name: 'email',
                                            label: 'Email',
                                            type: 'string',
                                          },
                                        ],
                                      },
                                    }
                                  : url.pathname ===
                                      '/api/super-admin/organisations/org-1/projects/project-1/discovery/salesforce/contacts/properties'
                                    ? {
                                        data: {
                                          properties: [
                                            {
                                              name: 'Email',
                                              label: 'Email',
                                              type: 'string',
                                            },
                                          ],
                                        },
                                      }
                                    : url.pathname ===
                                        '/api/super-admin/organisations/org-1/projects/project-1/discovery/hubspot/objects'
                                      ? {
                                          data: [
                                            {
                                              id: 'contacts',
                                              label: 'Contacts',
                                              tier: 'core',
                                            },
                                          ],
                                        }
                                      : url.pathname ===
                                          '/api/super-admin/organisations/org-1/projects/project-1/discovery/salesforce/objects'
                                        ? {
                                            data: [
                                              {
                                                id: 'contacts',
                                                label: 'Contacts',
                                                tier: 'core',
                                              },
                                            ],
                                          }
                                        : url.pathname ===
                                            '/api/super-admin/organisations/org-1/projects/project-1/connections'
                                          ? { data: [] }
                                          : url.pathname ===
                                              '/api/super-admin/organisations/org-1/activity'
                                            ? {
                                                data: [
                                                  {
                                                    id: 'event-1',
                                                    action: 'project.created',
                                                    resource: 'project',
                                                    resourceId: 'project-1',
                                                    severity: 'INFO',
                                                    actor: {
                                                      id: 'user-1',
                                                      email:
                                                        'operator@example.test',
                                                    },
                                                    details: null,
                                                    createdAt:
                                                      new Date().toISOString(),
                                                  },
                                                ],
                                                total: 1,
                                                page: 1,
                                                limit: 20,
                                              }
                                            : url.pathname ===
                                                '/api/super-admin/organisations/org-1/notes'
                                              ? { data: [] }
                                              : { data: {} };
      if (url.pathname.startsWith('/api/super-admin/platform/analytics'))
        data = { data: analyticsFixture(url) };
      const body = Buffer.from(JSON.stringify(data)).toString('base64');
      send('Fetch.fulfillRequest', {
        requestId,
        responseCode: request.method === 'OPTIONS' ? 204 : 200,
        responseHeaders,
        body,
      }).catch((error) => {
        throw error;
      });
    }
  });
  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  return { ready, send };
}

let appPort;
try {
  appPort = await startStaticServer();
  browser = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--window-size=1440,900',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const port = await chromePort();
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No Chrome page target');
  const cdp = connectCdp(page.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Fetch.enable', {
    patterns: [
      { urlPattern: '*://127.0.0.1:3001/api/*', requestStage: 'Request' },
    ],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source:
      "try { if (!localStorage.getItem('accessToken')) localStorage.setItem('accessToken', 'browser-test-token'); } catch {}",
  });

  const tenantRoutes = [
    '/dashboard',
    '/settings',
    '/organization',
    '/checkout',
    '/welcome',
  ];
  for (const route of [
    '/super-admin/overview',
    '/super-admin/profile',
    '/super-admin/organisations',
    '/super-admin/projects',
    '/super-admin/organisations?status=suspended',
    '/super-admin/organisations/org-1/overview',
    '/super-admin/organisations/org-1/projects',
    '/super-admin/organisations/org-1/projects/project-1',
    '/super-admin/organisations/org-1/projects/project-1?tab=settings',
    '/super-admin/organisations/org-1/projects/project-1/jobs/job-1',
    '/super-admin/organisations/org-1/projects/project-1/jobs/job-1?tab=field-mapping',
    '/super-admin/organisations/org-1/projects/project-1/jobs/job-1?tab=run-history',
    '/super-admin/organisations/org-1/activity',
    '/super-admin/organisations/org-1/support',
    '/super-admin/users',
    '/super-admin/users?tab=super-admins',
    '/super-admin/super-admins',
    ...tenantRoutes,
  ]) {
    const requestStart = requests.length;
    await cdp.send('Page.navigate', {
      url: `http://127.0.0.1:${appPort}${route}`,
    });
    let state;
    const expectedContent = new Map([
      ['/super-admin/overview', 'This graph shows payment counts, not money.'],
      ['/super-admin/organisations/org-1/projects', 'Scoped project'],
      ['/super-admin/organisations', 'Test Organisation'],
      ['/super-admin/projects', 'Test Organisation'],
      ['/super-admin/organisations?status=suspended', 'Test Organisation'],
      ['/super-admin/organisations/org-1/overview', 'Scoped project'],
      ['/super-admin/organisations/org-1/projects/project-1', 'Scoped job'],
      [
        '/super-admin/organisations/org-1/projects/project-1?tab=settings',
        'Support operations',
      ],
      [
        '/super-admin/organisations/org-1/projects/project-1/jobs/job-1',
        'Sync overview',
      ],
      [
        '/super-admin/organisations/org-1/projects/project-1/jobs/job-1?tab=field-mapping',
        'Field Mappings',
      ],
      [
        '/super-admin/organisations/org-1/projects/project-1/jobs/job-1?tab=run-history',
        'Sync History',
      ],
      ['/super-admin/organisations/org-1/activity', 'project.created'],
      ['/super-admin/organisations/org-1/support', 'Support notes'],
      ['/super-admin/users', 'tenant@example.test'],
      ['/super-admin/users?tab=super-admins', 'admin@example.test'],
      ['/super-admin/super-admins', 'admin@example.test'],
    ]).get(route);
    for (let i = 0; i < 100; i++) {
      try {
        state = (
          await cdp.send('Runtime.evaluate', {
            expression:
              '({ path: location.pathname, search: location.search, text: document.body.innerText, mainText: document.querySelector("main")?.innerText ?? "" })',
            returnByValue: true,
          })
        ).result.value;
      } catch {
        /* navigation replaces the execution context */
      }
      const expectedPath = tenantRoutes.includes(route)
        ? '/super-admin/overview'
        : route === '/super-admin/super-admins'
          ? '/super-admin/users'
          : route === '/super-admin/projects'
            ? '/super-admin/organisations'
            : new URL(route, 'http://example.test').pathname;
      if (
        state?.path === expectedPath &&
        (route !== '/super-admin/super-admins' ||
          state.search === '?tab=super-admins') &&
        state?.text?.includes('Platform Operator') &&
        (route !== '/super-admin/overview' ||
          state.text.includes('Platform overview')) &&
        (!route.includes('/organisations/org-1/') ||
          state.text.includes('Test Organisation')) &&
        (!expectedContent || state.mainText.includes(expectedContent))
      )
        break;
      await wait(100);
    }
    if (tenantRoutes.includes(route) && state?.path !== '/super-admin/overview')
      throw new Error(`Tenant route did not redirect: ${state?.path}`);
    const expectedPath =
      route === '/super-admin/super-admins'
        ? '/super-admin/users'
        : route === '/super-admin/projects'
          ? '/super-admin/organisations'
          : new URL(route, 'http://example.test').pathname;
    if (!tenantRoutes.includes(route) && state?.path !== expectedPath)
      throw new Error(
        `Wrong route for ${route}: ${state?.path}; recent requests: ${requests.slice(-8).join(', ')}`,
      );
    if (
      (route === '/super-admin/users?tab=super-admins' ||
        route === '/super-admin/super-admins') &&
      state?.search !== '?tab=super-admins'
    )
      throw new Error(`Super Admins tab URL missing at ${route}`);
    if (
      !state?.text?.includes('Organisations') ||
      !state?.text?.includes('Audit log')
    )
      throw new Error(`Platform shell missing at ${route}`);
    if (expectedContent && !state?.mainText?.includes(expectedContent))
      throw new Error(
        `Scoped page content missing at ${route}: ${expectedContent}`,
      );
    if (route === '/super-admin/overview') {
      if (
        !state.mainText.includes('Processing demand') ||
        !state.mainText.includes('Organisation economics')
      )
        throw new Error('Platform analytics sections are missing');
      for (const width of [375, 768, 1440]) {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 900,
          deviceScaleFactor: 1,
          mobile: width < 768,
        });
        await wait(100);
        const overflow = await cdp.send('Runtime.evaluate', {
          expression:
            'document.documentElement.scrollWidth > window.innerWidth',
          returnByValue: true,
        });
        if (overflow.result.value)
          throw new Error(`Platform analytics overflows at ${width}px`);
      }
      await cdp.send('Emulation.clearDeviceMetricsOverride');
    }
    if (
      process.env.SUPER_ADMIN_SCREENSHOT_DIR &&
      (route === '/super-admin/organisations/org-1/overview' ||
        route === '/super-admin/organisations/org-1/projects/project-1' ||
        route ===
          '/super-admin/organisations/org-1/projects/project-1/jobs/job-1')
    ) {
      const name = route.endsWith('/overview')
        ? 'organisation-overview'
        : route.endsWith('job-1')
          ? 'job'
          : 'project';
      for (const [viewport, width, height] of [
        ['desktop', 1440, 900],
        ['mobile', 390, 844],
      ]) {
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: viewport === 'mobile',
        });
        await wait(150);
        const screenshot = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await writeFile(
          join(
            process.env.SUPER_ADMIN_SCREENSHOT_DIR,
            `${name}-${viewport}.png`,
          ),
          Buffer.from(screenshot.data, 'base64'),
        );
        if (name === 'organisation-overview' && viewport === 'mobile') {
          await cdp.send('Runtime.evaluate', {
            expression: 'window.scrollTo(0, 600)',
          });
          await wait(150);
          const lowerScreenshot = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          });
          await writeFile(
            join(
              process.env.SUPER_ADMIN_SCREENSHOT_DIR,
              'organisation-overview-mobile-lower.png',
            ),
            Buffer.from(lowerScreenshot.data, 'base64'),
          );
          await cdp.send('Runtime.evaluate', {
            expression: 'window.scrollTo(0, 0)',
          });
        }
        if (name === 'job' && viewport === 'mobile') {
          await cdp.send('Runtime.evaluate', {
            expression: 'window.scrollTo(0, 500)',
          });
          await wait(200);
          const sticky = (
            await cdp.send('Runtime.evaluate', {
              expression:
                '({ stuck: document.querySelector("[data-slot=sticky-detail-header]")?.dataset.stuck, top: document.querySelector("[data-slot=sticky-detail-header]")?.getBoundingClientRect().top, scrollY: window.scrollY })',
              returnByValue: true,
            })
          ).result.value;
          if (sticky.scrollY < 100 || sticky.stuck !== 'true' || sticky.top < 0)
            throw new Error(
              `Context card did not stay sticky on mobile: ${JSON.stringify(sticky)}`,
            );
          await cdp.send('Runtime.evaluate', {
            expression: 'window.scrollTo(0, 0)',
          });
        }
      }
      await cdp.send('Emulation.clearDeviceMetricsOverride');
    }
    if (
      route.startsWith('/super-admin/organisations/org-1/projects/project-1')
    ) {
      const mutations = requests
        .slice(requestStart)
        .filter((request) => /^(POST|PATCH|PUT|DELETE) \/api\//.test(request));
      if (mutations.length)
        throw new Error(
          `Project detail mutated on load: ${mutations.join(', ')}`,
        );
    }
    if (route === '/super-admin/organisations/org-1/projects/project-1') {
      await cdp.send('Runtime.evaluate', {
        expression:
          'Array.from(document.querySelectorAll("main button")).find((button) => button.textContent?.includes("Create Sync Flow"))?.click()',
      });
      let popupOpen = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        popupOpen = Boolean(
          (
            await cdp.send('Runtime.evaluate', {
              expression:
                'document.body.innerText.includes("Create New Sync Job")',
              returnByValue: true,
            })
          ).result.value,
        );
        if (popupOpen) break;
        await wait(100);
      }
      if (!popupOpen)
        throw new Error('Create Sync Flow did not open the existing job popup');
      if (
        !requests
          .slice(requestStart)
          .some((request) =>
            request.includes(
              '/api/super-admin/organisations/org-1/projects/project-1/discovery/hubspot/objects',
            ),
          )
      )
        throw new Error('Create popup did not use scoped object discovery');
    }
    if (
      route ===
      '/super-admin/organisations/org-1/projects/project-1?tab=settings'
    ) {
      const settingsCards = (
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const region = document.querySelector('main [aria-label="Project settings"]');
            const cards = Array.from(region?.children ?? []).map((section) => section.querySelector('[data-slot="card"]'));
            const buttons = cards.map((card) => card?.querySelector('[data-slot="collapsible-trigger"]'));
            return cards.length === 4 && cards.every((card) => card?.dataset.layoutSurface === 'outer') && buttons.every((button) => button?.getBoundingClientRect().width > 900);
          })()`,
          returnByValue: true,
        })
      ).result.value;
      if (!settingsCards)
        throw new Error(
          'Project Settings does not have four separate full-width cards',
        );
      await cdp.send('Runtime.evaluate', {
        expression:
          'document.querySelector("main [aria-label=\\"Project settings\\"] [data-slot=\\"collapsible-trigger\\"]")?.click()',
      });
      await wait(100);
    }
    if (
      process.env.SCREENSHOT_DIR &&
      (route === '/super-admin/organisations/org-1/projects/project-1' ||
        route ===
          '/super-admin/organisations/org-1/projects/project-1?tab=settings')
    ) {
      const screenshotName = route.includes('tab=settings')
        ? 'project-settings'
        : 'project-detail';
      const desktop = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      await writeFile(
        `${process.env.SCREENSHOT_DIR}/${screenshotName}-desktop.png`,
        Buffer.from(desktop.data, 'base64'),
      );
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await wait(150);
      const mobile = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      await writeFile(
        `${process.env.SCREENSHOT_DIR}/${screenshotName}-mobile.png`,
        Buffer.from(mobile.data, 'base64'),
      );
      await cdp.send('Emulation.clearDeviceMetricsOverride');
    }
    if (route === '/super-admin/organisations/org-1/projects') {
      const hasDetailLink = (
        await cdp.send('Runtime.evaluate', {
          expression:
            'Boolean(document.querySelector("main a[href=\\"/super-admin/organisations/org-1/projects/project-1\\"]"))',
          returnByValue: true,
        })
      ).result.value;
      if (!hasDetailLink)
        throw new Error('Project directory has no detail entry link');
      if (
        !state.mainText.includes('Association rules') ||
        !state.mainText.includes('Migration')
      )
        throw new Error('Project support tools are missing from the directory');
    }
    if (
      route === '/super-admin/users' &&
      state.mainText.includes('admin@example.test')
    )
      throw new Error('Super Admin appeared in the tenant Users tab');
    if (
      route.includes('super-admins') &&
      state.mainText.includes('tenant@example.test')
    )
      throw new Error('Tenant user appeared in the Super Admins tab');
    if (
      (route === '/super-admin/users' || route.includes('super-admins')) &&
      state.mainText.includes('Cards')
    )
      throw new Error('People directory still offers card view');
    if (
      process.env.SCREENSHOT_DIR &&
      (route === '/super-admin/users' ||
        route === '/super-admin/users?tab=super-admins')
    ) {
      await wait(500);
      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const filename =
        route === '/super-admin/users' ? 'users.png' : 'super-admins.png';
      await writeFile(
        `${process.env.SCREENSHOT_DIR}/${filename}`,
        Buffer.from(data, 'base64'),
      );
    }
    if (route === '/super-admin/organisations') {
      if (!state.mainText.includes('View organisation'))
        throw new Error('Organisation card view was not shown by default');
      if (process.env.SCREENSHOT_DIR) {
        const { data } = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await writeFile(
          `${process.env.SCREENSHOT_DIR}/organisations-card.png`,
          Buffer.from(data, 'base64'),
        );
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          mobile: true,
        });
        await wait(150);
        const mobile = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await writeFile(
          `${process.env.SCREENSHOT_DIR}/organisations-card-mobile.png`,
          Buffer.from(mobile.data, 'base64'),
        );
        const mobileOverflow = await cdp.send('Runtime.evaluate', {
          expression:
            'document.documentElement.scrollWidth > window.innerWidth',
          returnByValue: true,
        });
        if (mobileOverflow.result.value)
          throw new Error(
            'Organisation directory overflows the mobile viewport',
          );
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: 768,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await wait(150);
        const tablet = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await writeFile(
          `${process.env.SCREENSHOT_DIR}/organisations-card-tablet.png`,
          Buffer.from(tablet.data, 'base64'),
        );
        const tabletOverflow = await cdp.send('Runtime.evaluate', {
          expression:
            'document.documentElement.scrollWidth > window.innerWidth',
          returnByValue: true,
        });
        if (tabletOverflow.result.value)
          throw new Error(
            'Organisation directory overflows the tablet viewport',
          );
        await cdp.send('Emulation.clearDeviceMetricsOverride');
        await wait(150);
      }
      await cdp.send('Runtime.evaluate', {
        expression:
          'document.querySelector("main [aria-label=\\"List view\\"]")?.click()',
      });
      let listVisible = false;
      for (let i = 0; i < 50; i++) {
        const result = await cdp.send('Runtime.evaluate', {
          expression:
            'Boolean(document.querySelector("main table") && document.querySelector("main table")?.innerText.includes("Test Organisation"))',
          returnByValue: true,
        });
        listVisible = result.result.value === true;
        if (listVisible) break;
        await wait(100);
      }
      if (!listVisible)
        throw new Error('Organisation list view did not render after toggle');
      await cdp.send('Runtime.evaluate', {
        expression:
          'Array.from(document.querySelectorAll("main table thead button")).find((button) => button.textContent?.includes("Organisation"))?.click()',
      });
      for (let i = 0; i < 50; i++) {
        if (
          organisationQueries.some((search) => search.includes('sortBy=name'))
        )
          break;
        await wait(100);
      }
      if (!organisationQueries.some((search) => search.includes('sortBy=name')))
        throw new Error('Organisation name sort did not reach the API');
      if (process.env.SCREENSHOT_DIR) {
        const { data } = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
        });
        await writeFile(
          `${process.env.SCREENSHOT_DIR}/organisations-list.png`,
          Buffer.from(data, 'base64'),
        );
      }
    }
  }

  // The historical seeded operator still carries an organisation ID. It must
  // remain in the platform workspace until the separate identity migration.
  await cdp.send('Runtime.evaluate', {
    expression: "localStorage.setItem('accessToken', 'historical-test-token')",
  });
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${appPort}/super-admin/overview`,
  });
  let historicalShellVisible = false;
  for (let i = 0; i < 100; i++) {
    try {
      const state = (
        await cdp.send('Runtime.evaluate', {
          expression:
            '({ path: location.pathname, text: document.body.innerText })',
          returnByValue: true,
        })
      ).result.value;
      historicalShellVisible =
        state?.path === '/super-admin/overview' &&
        state.text.includes('Platform overview') &&
        state.text.includes('Audit log');
    } catch {
      /* navigation replaces the execution context */
    }
    if (historicalShellVisible && historicalMeSeen) break;
    await wait(100);
  }
  if (!historicalShellVisible || !historicalMeSeen)
    throw new Error(
      'Historical Super Admin fixture did not remain in the platform workspace',
    );

  const blocked = requests.filter((request) =>
    /^\w+ \/api\/(?:billing|notifications|organisations\/me|projects(?:\/|$)|jobs(?:\/|$)|events\/stream)/.test(
      request,
    ),
  );
  if (blocked.length)
    throw new Error(
      `Tenant requests from platform workspace: ${blocked.join(', ')}`,
    );
  const unclassified = requests.filter(
    (request) =>
      !/^\w+ \/api\/(?:auth\/|users(?:\/me)?$|super-admin\/)/.test(request),
  );
  if (unclassified.length)
    throw new Error(
      `Unclassified platform API requests: ${unclassified.join(', ')}`,
    );
  if (!requests.some((request) => request.includes('/api/auth/me')))
    throw new Error('No /auth/me request observed');
  if (
    !requests.some((request) =>
      request.includes('/api/super-admin/platform/overview'),
    )
  )
    throw new Error('No platform overview request observed');
  if (
    !organisationQueries.some((search) => search.includes('status=suspended'))
  )
    throw new Error('Organisation status deep link did not reach the API');
  if (
    !requests.some((request) =>
      request.includes('/api/super-admin/organisations/org-1/projects'),
    )
  )
    throw new Error(
      'No explicitly scoped organisation projects request observed',
    );
  for (const path of [
    '/api/users',
    '/api/super-admin/platform/super-admins',
    '/api/super-admin/organisations/org-1/projects/project-1/jobs/job-1',
    '/api/super-admin/organisations/org-1/activity',
    '/api/super-admin/organisations/org-1/billing/overview',
    '/api/super-admin/organisations/org-1/notes',
  ]) {
    if (!requests.some((request) => request.includes(path)))
      throw new Error(`Scoped workspace request missing: ${path}`);
  }
  console.log(
    `Platform network invariant passed (${requests.length} API requests, no tenant shell requests).`,
  );
} finally {
  socket?.close();
  if (browser?.exitCode === null) {
    await new Promise((done) => {
      browser.once('exit', done);
      browser.kill();
    });
  }
  await new Promise((done) => server?.close(done) ?? done());
  await rm(userDataDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}
