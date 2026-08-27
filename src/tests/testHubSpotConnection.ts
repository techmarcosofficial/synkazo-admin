/**
 * HubSpot Connection Test Script
 * Run: deno run --allow-net tests/testHubSpotConnection.ts
 *
 * Set env var before running:
 *   HS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN = Deno.env.get('HS_TOKEN') ?? 'your-private-app-token';
const API_BASE = 'https://api.hubapi.com';

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pass(label: string, detail?: string) {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}
function section(title: string) {
  console.log(`\n${'─'.repeat(54)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(54));
}

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: HEADERS });
  const data = await res.json();
  return { res, data };
}

// ── Step 3: getContacts ───────────────────────────────────────────────────────
async function getContacts(limit = 5) {
  section('Step 3: getContacts({ limit: 5 })');
  console.log(`  → GET /crm/v3/objects/contacts?limit=${limit}`);

  const { res, data } = await apiGet(
    `/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,company`,
  );

  if (!res.ok) {
    fail(
      'getContacts',
      `HTTP ${res.status} — ${data.message ?? JSON.stringify(data)}`,
    );
    return null;
  }

  pass('getContacts', `HTTP ${res.status}`);
  console.log(
    `  → Returned ${data.results?.length ?? 0} contacts (total: ${data.total ?? '?'})`,
  );

  // Verify structure
  if (!Array.isArray(data.results)) {
    fail('Structure check', 'Expected data.results to be an array');
  } else {
    pass('Structure check', 'data.results is an array');
    const sample = data.results[0];
    if (sample) {
      const expectedKeys = ['id', 'properties', 'createdAt', 'updatedAt'];
      const missing = expectedKeys.filter((k) => !(k in sample));
      if (missing.length) {
        fail('Field check', `Missing keys: ${missing.join(', ')}`);
      } else {
        pass('Field check', `id, properties, createdAt, updatedAt all present`);
      }

      const propKeys = ['firstname', 'lastname', 'email'];
      const missingProps = propKeys.filter(
        (k) => !(k in (sample.properties ?? {})),
      );
      if (missingProps.length) {
        fail(
          'Property check',
          `Missing properties: ${missingProps.join(', ')}`,
        );
      } else {
        pass('Property check', 'firstname, lastname, email present');
      }

      console.log('\n  Sample contact:');
      console.log(JSON.stringify(sample, null, 4).replace(/^/gm, '    '));
    } else {
      console.log(
        '  (no contacts in account — structure could not be verified)',
      );
    }
  }

  return data;
}

// ── Step 4: listObjects ───────────────────────────────────────────────────────
async function listObjects() {
  section('Step 4: listObjects()');

  // HubSpot CRM object types
  const OBJECTS = [
    'contacts',
    'companies',
    'deals',
    'tickets',
    'products',
    'quotes',
  ];

  const results: { name: string; status: string; count?: number }[] = [];

  for (const obj of OBJECTS) {
    console.log(`  → GET /crm/v3/objects/${obj}?limit=1`);
    const { res, data } = await apiGet(`/crm/v3/objects/${obj}?limit=1`);

    if (res.ok) {
      pass(obj, `HTTP ${res.status}, total=${data.total ?? '?'}`);
      results.push({ name: obj, status: 'ok', count: data.total });
    } else {
      fail(obj, `HTTP ${res.status} — ${data.message ?? ''}`);
      results.push({ name: obj, status: `error ${res.status}` });
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

// ── Step 5: getObjectProperties ───────────────────────────────────────────────
async function getObjectProperties(objectType = 'contacts') {
  section(`Step 5: getObjectProperties("${objectType}")`);
  console.log(`  → GET /crm/v3/properties/${objectType}`);

  const { res, data } = await apiGet(`/crm/v3/properties/${objectType}`);

  if (!res.ok) {
    fail(
      'getObjectProperties',
      `HTTP ${res.status} — ${data.message ?? JSON.stringify(data)}`,
    );
    return null;
  }

  pass('getObjectProperties', `HTTP ${res.status}`);

  const props: Array<{
    name: string;
    label: string;
    type: string;
    fieldType: string;
  }> = data.results ?? [];
  console.log(`  → ${props.length} properties found`);

  // Verify structure
  if (!Array.isArray(props)) {
    fail('Structure check', 'Expected results to be an array');
  } else {
    pass('Structure check', 'results is an array');
    const sample = props[0];
    if (sample) {
      const expectedKeys = ['name', 'label', 'type', 'fieldType'];
      const missing = expectedKeys.filter((k) => !(k in sample));
      if (missing.length) {
        fail('Field check', `Missing keys: ${missing.join(', ')}`);
      } else {
        pass('Field check', 'name, label, type, fieldType all present');
      }
    }
  }

  // Group by type for a useful summary
  const byType: Record<string, number> = {};
  for (const p of props) {
    byType[p.type] = (byType[p.type] ?? 0) + 1;
  }
  console.log('\n  Property types breakdown:');
  for (const [type, count] of Object.entries(byType).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${type.padEnd(20)} ${count}`);
  }

  // Print first 5 properties as sample
  console.log('\n  First 5 properties:');
  for (const p of props.slice(0, 5)) {
    console.log(
      `    ${p.name.padEnd(30)} type=${p.type.padEnd(12)} fieldType=${p.fieldType}`,
    );
  }

  return props;
}

// ── Run all steps ─────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n🟠  HubSpot Connection Test');
  console.log(`   token     : ${TOKEN.slice(0, 12)}…`);
  console.log(`   api_base  : ${API_BASE}`);

  // Step 2: verify token works with a lightweight whoami call
  section('Step 2: Verify Private App Token');
  const { res: authRes, data: authData } = await apiGet(
    '/oauth/v1/access-tokens/' + TOKEN,
  );
  if (authRes.ok) {
    pass(
      'Token valid',
      `hub_id=${authData.hub_id}, scopes=${authData.scopes?.length ?? '?'}`,
    );
  } else {
    // Token validation endpoint needs special scopes; 401 = invalid, 403 = valid but no scope
    if (authRes.status === 403) {
      pass(
        'Token reachable',
        'HTTP 403 — token is valid but lacks token-introspection scope (normal)',
      );
    } else {
      fail(
        'Token check',
        `HTTP ${authRes.status} — ${authData.message ?? 'unknown error'}`,
      );
      console.error('\n  Aborting — check HS_TOKEN.\n');
      Deno.exit(1);
    }
  }

  await getContacts(5);
  await listObjects();
  await getObjectProperties('contacts');

  section('Result');
  console.log('  ✅  All steps completed.\n');
}

await runTests();
