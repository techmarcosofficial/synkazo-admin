/**
 * ServiceTitan Connection Test Script
 * Run: deno run --allow-net tests/testServiceTitanConnection.ts
 *
 * Set env vars before running:
 *   ST_CLIENT_ID=your_client_id
 *   ST_CLIENT_SECRET=your_client_secret
 *   ST_TENANT_ID=your_tenant_id
 */

// ── Config ────────────────────────────────────────────────────────────────────
const CLIENT_ID = Deno.env.get('ST_CLIENT_ID') ?? 'test_client_id';
const CLIENT_SECRET = Deno.env.get('ST_CLIENT_SECRET') ?? 'test_client_secret';
const TENANT_ID = Deno.env.get('ST_TENANT_ID') ?? '0000000';

const AUTH_URL = 'https://auth.servicetitan.io/connect/token';
const API_BASE = `https://api.servicetitan.io`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function pass(label: string, detail?: string) {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}
function section(title: string) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ── Step 1 & 2 & 3: Authenticate ─────────────────────────────────────────────
section('Step 1–3: Authenticate with ServiceTitan');

let accessToken: string | null = null;

async function authenticate(): Promise<string> {
  console.log('  → Requesting access token...');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    fail(
      'Authentication',
      `HTTP ${res.status} — ${data.error ?? JSON.stringify(data)}`,
    );
    throw new Error('Authentication failed');
  }

  pass('Authentication', `token received (expires in ${data.expires_in}s)`);
  return data.access_token as string;
}

// ── Step 4: getCustomers ──────────────────────────────────────────────────────
async function getCustomers(token: string, limit = 5) {
  section('Step 4: getCustomers({ limit: 5 })');
  console.log(
    `  → GET /crm/v2/tenant/${TENANT_ID}/customers?pageSize=${limit}`,
  );

  const res = await fetch(
    `${API_BASE}/crm/v2/tenant/${TENANT_ID}/customers?pageSize=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = await res.json();

  if (!res.ok) {
    fail('getCustomers', `HTTP ${res.status} — ${JSON.stringify(data)}`);
    return null;
  }

  pass('getCustomers', `HTTP ${res.status}`);
  console.log(
    `  → Returned ${data.data?.length ?? 0} customers (total: ${data.totalCount ?? '?'})`,
  );

  // Verify data structure
  if (!Array.isArray(data.data)) {
    fail('Structure check', 'Expected data.data to be an array');
  } else {
    pass('Structure check', 'data.data is an array');
    const sample = data.data[0];
    if (sample) {
      const expectedKeys = ['id', 'name', 'type'];
      const missing = expectedKeys.filter((k) => !(k in sample));
      if (missing.length) {
        fail('Field check', `Missing keys: ${missing.join(', ')}`);
      } else {
        pass('Field check', `id, name, type all present`);
      }
    }
    console.log('\n  Sample customer:');
    console.log(
      JSON.stringify(data.data[0] ?? {}, null, 4).replace(/^/gm, '    '),
    );
  }

  return data;
}

// ── Step 5: listObjects ───────────────────────────────────────────────────────
async function listObjects(token: string) {
  section('Step 5: listObjects()');

  // ServiceTitan exposes standard resource paths — we test a few
  const OBJECTS = [
    {
      name: 'customers',
      path: `/crm/v2/tenant/${TENANT_ID}/customers?pageSize=1`,
    },
    { name: 'jobs', path: `/jpm/v2/tenant/${TENANT_ID}/jobs?pageSize=1` },
    {
      name: 'invoices',
      path: `/accounting/v2/tenant/${TENANT_ID}/invoices?pageSize=1`,
    },
    {
      name: 'technicians',
      path: `/settings/v2/tenant/${TENANT_ID}/technicians?pageSize=1`,
    },
  ];

  const results: { name: string; status: string; count?: number }[] = [];

  for (const obj of OBJECTS) {
    const res = await fetch(`${API_BASE}${obj.path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const ok = res.ok;
    if (ok) {
      pass(
        obj.name,
        `HTTP ${res.status}, totalCount=${data.totalCount ?? '?'}`,
      );
      results.push({ name: obj.name, status: 'ok', count: data.totalCount });
    } else {
      fail(
        obj.name,
        `HTTP ${res.status} — ${data.type ?? JSON.stringify(data)}`,
      );
      results.push({ name: obj.name, status: `error ${res.status}` });
    }
  }

  section('Object Discovery Summary');
  for (const r of results) {
    console.log(
      `  ${r.status === 'ok' ? '✅' : '❌'}  ${r.name.padEnd(16)} ${r.status === 'ok' ? `${r.count} records` : r.status}`,
    );
  }

  return results;
}

// ── Step 6 & 7: Run all steps ─────────────────────────────────────────────────
async function runTests() {
  console.log('\n🔧  ServiceTitan Connection Test');
  console.log(`   clientId  : ${CLIENT_ID}`);
  console.log(`   tenantId  : ${TENANT_ID}`);

  try {
    accessToken = await authenticate();
    await getCustomers(accessToken, 5);
    await listObjects(accessToken);

    section('Result');
    console.log('  ✅  All steps completed successfully.\n');
  } catch (err) {
    section('Result');
    console.error(`  ❌  Test failed: ${(err as Error).message}\n`);
    Deno.exit(1);
  }
}

await runTests();
