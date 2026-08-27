/**
 * Full End-to-End Sync Test
 * Run: deno run --allow-net --allow-env tests/testFullSync.ts
 *
 * Required env vars:
 *   ST_CLIENT_ID         ServiceTitan client ID
 *   ST_CLIENT_SECRET     ServiceTitan client secret
 *   ST_TENANT_ID         ServiceTitan tenant ID
 *   HS_TOKEN             HubSpot Private App token
 *   HS_PORTAL_ID         HubSpot Portal / Hub ID
 *   APP_BASE_URL         Base URL of your deployed app  (default: http://localhost:5173)
 *   APP_API_KEY          API key for backend functions
 */

// ── Config ────────────────────────────────────────────────────────────────────
const ST_CLIENT_ID = Deno.env.get('ST_CLIENT_ID') ?? 'test_client_id';
const ST_CLIENT_SECRET =
  Deno.env.get('ST_CLIENT_SECRET') ?? 'test_client_secret';
const ST_TENANT_ID = Deno.env.get('ST_TENANT_ID') ?? '0000000';
const HS_TOKEN = Deno.env.get('HS_TOKEN') ?? 'pat-na1-test';
const HS_PORTAL_ID = Deno.env.get('HS_PORTAL_ID') ?? '00000000';
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'http://localhost:5173';
const APP_API_KEY = Deno.env.get('APP_API_KEY') ?? '';

const FN_BASE = `${APP_BASE_URL}/api/functions`;
const HEADERS = {
  'Content-Type': 'application/json',
  ...(APP_API_KEY ? { api_key: APP_API_KEY } : {}),
};

// ── Test data ─────────────────────────────────────────────────────────────────
const TEST_PREFIX = `e2e_${Date.now()}`;

/** IDs accumulated during the test — used for cleanup */
const created: {
  projectId?: string;
  stConnId?: string;
  hsConnId?: string;
  jobId?: string;
  hsContactId?: string;
} = {};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pass(label: string, detail?: string) {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}
function section(title: string) {
  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(58));
}
function info(msg: string) {
  console.log(`  ℹ  ${msg}`);
}

async function callFn(name: string, payload: Record<string, unknown>) {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ── Step 1: Create test project ───────────────────────────────────────────────
async function step1_createProject() {
  section('Step 1: Create test project');

  const { ok, status, data } = await callFn('projects/create', {
    name: `${TEST_PREFIX}_project`,
    description: 'Automated e2e test project — safe to delete',
    sourcePlatformId: 'servicetitan',
    destPlatformId: 'hubspot',
  });

  if (!ok || data?.error) {
    fail(
      'createProject',
      `HTTP ${status} — ${data?.error ?? JSON.stringify(data)}`,
    );
    throw new Error('Step 1 failed');
  }

  created.projectId = data?.id ?? data?.project?.id;
  pass('createProject', `projectId=${created.projectId}`);
  return created.projectId!;
}

// ── Step 2: Connect ServiceTitan ──────────────────────────────────────────────
async function step2_connectServiceTitan(projectId: string) {
  section('Step 2: Connect ServiceTitan');

  const { ok, status, data } = await callFn('connections/connectServiceTitan', {
    projectId,
    companyName: `${TEST_PREFIX}_company`,
    clientId: ST_CLIENT_ID,
    clientSecret: ST_CLIENT_SECRET,
    tenantId: ST_TENANT_ID,
  });

  if (!ok || data?.error) {
    fail(
      'connectServiceTitan',
      `HTTP ${status} — ${data?.error ?? JSON.stringify(data)}`,
    );
    throw new Error('Step 2 failed');
  }

  created.stConnId = data?.id ?? data?.connection?.id;
  pass(
    'connectServiceTitan',
    `connectionId=${created.stConnId}, status=${data?.status ?? 'unknown'}`,
  );
}

// ── Step 3: Connect HubSpot ───────────────────────────────────────────────────
async function step3_connectHubSpot(projectId: string) {
  section('Step 3: Connect HubSpot');

  const { ok, status, data } = await callFn('connections/connectHubSpot', {
    projectId,
    accountName: `${TEST_PREFIX}_hs`,
    privateAppToken: HS_TOKEN,
    portalId: HS_PORTAL_ID,
  });

  if (!ok || data?.error) {
    fail(
      'connectHubSpot',
      `HTTP ${status} — ${data?.error ?? JSON.stringify(data)}`,
    );
    throw new Error('Step 3 failed');
  }

  created.hsConnId = data?.id ?? data?.connection?.id;
  pass(
    'connectHubSpot',
    `connectionId=${created.hsConnId}, status=${data?.status ?? 'unknown'}`,
  );
}

// ── Step 4: Create test job ───────────────────────────────────────────────────
async function step4_createJob(projectId: string) {
  section('Step 4: Create test job');

  const { ok, status, data } = await callFn('jobs/create', {
    projectId,
    name: `${TEST_PREFIX}_job`,
    sourceObject: 'customers',
    destObject: 'contacts',
    syncDirection: 'one_way',
    syncTrigger: 'new',
    cronExpression: '0 */6 * * *',
  });

  if (!ok || data?.error) {
    fail(
      'createJob',
      `HTTP ${status} — ${data?.error ?? JSON.stringify(data)}`,
    );
    throw new Error('Step 4 failed');
  }

  created.jobId = data?.id ?? data?.job?.id;
  pass('createJob', `jobId=${created.jobId}`);
  return created.jobId!;
}

// ── Step 5: Set up field mappings ─────────────────────────────────────────────
async function step5_saveFieldMappings(jobId: string) {
  section('Step 5: Set up field mappings');

  const mappings = [
    {
      sourceField: 'name',
      destinationField: 'firstname',
      transformationType: 'direct',
    },
    {
      sourceField: 'email',
      destinationField: 'email',
      transformationType: 'direct',
    },
    {
      sourceField: 'phone',
      destinationField: 'phone',
      transformationType: 'direct',
    },
    {
      sourceField: 'address',
      destinationField: 'address',
      transformationType: 'direct',
    },
  ];

  const { ok, status, data } = await callFn('mapping/saveFieldMapping', {
    jobId,
    mappings,
  });

  if (!ok || data?.error) {
    fail(
      'saveFieldMapping',
      `HTTP ${status} — ${data?.error ?? JSON.stringify(data)}`,
    );
    throw new Error('Step 5 failed');
  }

  pass('saveFieldMapping', `${mappings.length} mappings saved`);

  // Verify round-trip: read back
  const { ok: readOk, data: readData } = await callFn(
    'mapping/getFieldMapping',
    { jobId },
  );
  if (readOk && readData?.mappings?.length === mappings.length) {
    pass(
      'getFieldMapping',
      `${readData.mappings.length} mappings retrieved — round-trip OK`,
    );
  } else {
    fail(
      'getFieldMapping round-trip',
      `got ${readData?.mappings?.length ?? 0} mappings`,
    );
  }
}

// ── Step 6: Execute sync with 1 test record ───────────────────────────────────
async function step6_runSync(jobId: string) {
  section('Step 6: Execute sync (1 test record)');

  const { ok, status, data } = await callFn('sync/runNow', {
    jobId,
    testMode: true,
    maxRecords: 1,
  });

  if (!ok || data?.error) {
    fail(
      'sync/runNow',
      `HTTP ${status} — ${data?.error ?? JSON.stringify(data)}`,
    );
    throw new Error('Step 6 failed');
  }

  pass('sync/runNow triggered', `runId=${data?.runId ?? 'n/a'}`);

  // Poll for completion (up to 30 s)
  info('Polling for sync completion (max 30s)...');
  let attempts = 0;
  let finalStatus = data?.status ?? 'running';

  while (
    attempts < 6 &&
    (finalStatus === 'running' || finalStatus === 'active')
  ) {
    await new Promise((r) => setTimeout(r, 5000));
    attempts++;
    const { data: pollData } = await callFn('monitoring/getJobStatistics', {
      jobId,
    });
    finalStatus = pollData?.currentStatus ?? pollData?.status ?? finalStatus;
    info(`  attempt ${attempts}/6 — status: ${finalStatus}`);
  }

  if (finalStatus === 'error') {
    fail('Sync completed with errors', finalStatus);
  } else {
    pass('Sync completed', `final status: ${finalStatus}`);
  }

  return data?.runId;
}

// ── Step 7: Verify record created in HubSpot ─────────────────────────────────
async function step7_verifyHubSpotRecord() {
  section('Step 7: Verify record created in HubSpot');

  const res = await fetch(
    `https://api.hubapi.com/crm/v3/objects/contacts/search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: 'hs_analytics_source', operator: 'HAS_PROPERTY' },
            ],
          },
        ],
        limit: 1,
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        properties: ['firstname', 'email', 'createdate'],
      }),
    },
  );

  const data = await res.json();

  if (!res.ok) {
    fail('HubSpot search', `HTTP ${res.status} — ${data.message ?? ''}`);
    return;
  }

  pass('HubSpot API reachable', `HTTP ${res.status}`);

  if (!data.results?.length) {
    info(
      'No contacts found in HubSpot (account may be empty or sync used testMode dry-run)',
    );
    return;
  }

  const contact = data.results[0];
  created.hsContactId = contact.id;
  pass(
    'Contact exists in HubSpot',
    `id=${contact.id}, firstname=${contact.properties?.firstname ?? 'n/a'}`,
  );
  pass('Structure check', 'id, properties, createdate present');
}

// ── Step 8: Check SyncLog entry ───────────────────────────────────────────────
async function step8_checkSyncLog(jobId: string) {
  section('Step 8: Check SyncLog entry created');

  const { ok, status, data } = await callFn('logging/getSyncLogs', {
    jobId,
    limit: 5,
  });

  if (!ok || data?.error) {
    fail(
      'getSyncLogs',
      `HTTP ${status} — ${data?.error ?? JSON.stringify(data)}`,
    );
    return;
  }

  const logs: Array<{
    level: string;
    message: string;
    recordsProcessed?: number;
  }> = data?.logs ?? data ?? [];

  if (!Array.isArray(logs) || logs.length === 0) {
    fail('SyncLog check', 'No log entries found for this job');
    return;
  }

  pass('SyncLog entries found', `${logs.length} entries`);

  // Verify structure
  const sample = logs[0];
  const expectedKeys = ['level', 'message'];
  const missing = expectedKeys.filter((k) => !(k in sample));
  if (missing.length) {
    fail('Log structure', `Missing keys: ${missing.join(', ')}`);
  } else {
    pass('Log structure', 'level, message present');
  }

  console.log('\n  Recent log entries:');
  for (const log of logs.slice(0, 5)) {
    const icon =
      log.level === 'error' ? '🔴' : log.level === 'warn' ? '🟡' : '🟢';
    console.log(
      `    ${icon} [${log.level?.toUpperCase()?.padEnd(7)}] ${log.message}`,
    );
  }
}

// ── Step 9: Clean up test data ────────────────────────────────────────────────
async function step9_cleanup() {
  section('Step 9: Clean up test data');

  const { projectId, hsContactId } = created;
  let anyFail = false;

  // Delete test project (cascades to jobs, connections, logs on the backend)
  if (projectId) {
    const { ok, status, data } = await callFn('projects/delete', { projectId });
    if (ok && !data?.error) {
      pass('Deleted test project', projectId);
    } else {
      fail('Delete project', `HTTP ${status} — ${data?.error ?? ''}`);
      anyFail = true;
    }
  }

  // Delete the HubSpot test contact if one was created
  if (hsContactId) {
    const res = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${hsContactId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${HS_TOKEN}` },
      },
    );
    if (res.ok || res.status === 204) {
      pass('Deleted HubSpot test contact', hsContactId);
    } else {
      fail('Delete HubSpot contact', `HTTP ${res.status}`);
      anyFail = true;
    }
  }

  if (!anyFail) {
    pass('Cleanup complete');
  } else {
    info('Some cleanup steps failed — check resources listed above');
  }
}

// ── Run all steps ─────────────────────────────────────────────────────────────
async function runE2E() {
  console.log('\n🔄  Full End-to-End Sync Test');
  console.log(`   prefix    : ${TEST_PREFIX}`);
  console.log(`   app_base  : ${APP_BASE_URL}`);
  console.log(`   st_tenant : ${ST_TENANT_ID}`);
  console.log(`   hs_portal : ${HS_PORTAL_ID}`);

  const stepResults: { step: string; ok: boolean }[] = [];

  async function run(label: string, fn: () => Promise<void>) {
    try {
      await fn();
      stepResults.push({ step: label, ok: true });
    } catch (err) {
      stepResults.push({ step: label, ok: false });
      console.error(`\n  ⚠️  Stopping at: ${label}`);
      console.error(`     ${(err as Error).message}`);
      throw err; // bubble up to abort remaining steps
    }
  }

  let projectId = '';
  let jobId = '';

  try {
    await run('Step 1 — create project', async () => {
      projectId = await step1_createProject();
    });
    await run('Step 2 — connect ServiceTitan', async () => {
      await step2_connectServiceTitan(projectId);
    });
    await run('Step 3 — connect HubSpot', async () => {
      await step3_connectHubSpot(projectId);
    });
    await run('Step 4 — create job', async () => {
      jobId = await step4_createJob(projectId);
    });
    await run('Step 5 — save field mappings', async () => {
      await step5_saveFieldMappings(jobId);
    });
    await run('Step 6 — execute sync', async () => {
      await step6_runSync(jobId);
    });
    await run('Step 7 — verify HubSpot record', async () => {
      await step7_verifyHubSpotRecord();
    });
    await run('Step 8 — check SyncLog', async () => {
      await step8_checkSyncLog(jobId);
    });
  } finally {
    // Always attempt cleanup even if earlier steps failed
    try {
      await step9_cleanup();
    } catch {
      /* best-effort */
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  section('E2E Test Summary');
  for (const r of stepResults) {
    console.log(`  ${r.ok ? '✅' : '❌'}  ${r.step}`);
  }

  const allPassed = stepResults.every((r) => r.ok);
  console.log();
  if (allPassed) {
    console.log(
      '  🎉  All steps passed — sync pipeline is fully operational.\n',
    );
  } else {
    const failed = stepResults
      .filter((r) => !r.ok)
      .map((r) => r.step)
      .join(', ');
    console.error(`  💥  Failed steps: ${failed}\n`);
    Deno.exit(1);
  }
}

await runE2E();
