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

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const mime = (file) =>
  ({
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
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
      const data =
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
                          status: 'active',
                          plan: { name: 'Test', subscriptionStatus: 'active' },
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
                                  lastSyncedAt: null,
                                  nextRunAt: null,
                                  checkpointPage: null,
                                  checkpointSince: null,
                                  checkpointRunId: null,
                                  syncAllPage: null,
                                  scheduleMode: 'interval',
                                  intervalMinutes: 30,
                                  sourceObjectId: 'contacts',
                                  destObjectId: 'contacts',
                                  dependsOnJobId: null,
                                  recentFailures: [],
                                },
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
                                          email: 'operator@example.test',
                                        },
                                        details: null,
                                        createdAt: new Date().toISOString(),
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
    '/super-admin/organisations/org-1/projects',
    '/super-admin/organisations/org-1/projects/project-1',
    '/super-admin/organisations/org-1/projects/project-1/jobs/job-1',
    '/super-admin/organisations/org-1/activity',
    '/super-admin/organisations/org-1/support',
    '/super-admin/users',
    '/super-admin/users?tab=super-admins',
    '/super-admin/super-admins',
    ...tenantRoutes,
  ]) {
    await cdp.send('Page.navigate', {
      url: `http://127.0.0.1:${appPort}${route}`,
    });
    let state;
    const expectedContent = new Map([
      ['/super-admin/organisations/org-1/projects', 'Scoped project'],
      ['/super-admin/organisations', 'Test Organisation'],
      ['/super-admin/projects', 'Test Organisation'],
      ['/super-admin/organisations?status=suspended', 'Test Organisation'],
      ['/super-admin/organisations/org-1/projects/project-1', 'Scoped project'],
      [
        '/super-admin/organisations/org-1/projects/project-1/jobs/job-1',
        'Resume checkpoint',
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
            : route === '/super-admin/organisations/org-1/projects/project-1'
              ? '/super-admin/organisations/org-1/projects'
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
          : route === '/super-admin/organisations/org-1/projects/project-1'
            ? '/super-admin/organisations/org-1/projects'
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
    if (!state?.text?.includes('Synkazo platform admin'))
      throw new Error(`Platform shell missing at ${route}`);
    if (expectedContent && !state?.mainText?.includes(expectedContent))
      throw new Error(
        `Scoped page content missing at ${route}: ${expectedContent}`,
      );
    if (route === '/super-admin/organisations/org-1/projects') {
      const hasRemovedDetailLink = (
        await cdp.send('Runtime.evaluate', {
          expression:
            'Boolean(document.querySelector("main a[href=\\"/super-admin/organisations/org-1/projects/project-1\\"]"))',
          returnByValue: true,
        })
      ).result.value;
      if (hasRemovedDetailLink)
        throw new Error(
          'Project directory still links to the removed detail screen',
        );
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
        state.text.includes('Synkazo platform admin');
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
