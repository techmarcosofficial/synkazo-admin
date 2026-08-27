/**
 * Field auto-matching engine behind "Auto-map" in the field mapping canvas.
 *
 * Platform field names never line up exactly — ServiceTitan exposes nested leaves
 * ("Address › Zip", key `address.zip`) while HubSpot exposes flat, human-worded
 * labels ("Postal Code", key `zip`). Matching therefore happens on several
 * identities per field (raw key, label, and the leaf segment of each) and at
 * several levels of strictness (exact → canonicalised → token structure).
 *
 * Every candidate pair is scored, then assignment is a single global greedy pass
 * over the scores. That matters: a per-source "first match wins" loop lets an
 * early mediocre source steal a destination that a later source matches far
 * better. Scoring first, assigning second, avoids that entirely.
 */

export interface MatchableField {
  key: string;
  label?: string;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
}

export interface FieldMatch {
  source: MatchableField;
  dest: MatchableField;
  score: number;
}

/** Minimum score (after type/required modifiers) for a pair to be mapped at all. */
const MIN_SCORE = 50;

/**
 * Whole-name aliases, keyed by the normalised full name. Applied before
 * tokenisation, so multi-word platform-speak collapses to one vocabulary
 * ("Postal Code" and "Zip" both become `zip`). Values are phrases — they get
 * re-normalised/re-tokenised by the caller.
 */
const PHRASE_ALIASES: Record<string, string> = {
  // address lines
  streetaddress: 'street',
  street1: 'street',
  address1: 'street',
  addressline: 'street',
  addressline1: 'street',
  streetaddress2: 'street 2',
  street2: 'street 2',
  address2: 'street 2',
  addressline2: 'street 2',
  // region / postal
  stateregion: 'state',
  stateprovince: 'state',
  countryregion: 'country',
  postalcode: 'zip',
  postcode: 'zip',
  zipcode: 'zip',
  zippostalcode: 'zip',
  // contact details
  emailaddress: 'email',
  emailid: 'email',
  phonenumber: 'phone',
  telephonenumber: 'phone',
  mobilenumber: 'mobile',
  mobilephone: 'mobile',
  mobilephonenumber: 'mobile',
  cellphone: 'mobile',
  cellnumber: 'mobile',
  faxnumber: 'fax',
  // identifiers
  recordid: 'id',
  objectid: 'id',
  externalid: 'external id',
};

/** Single-word aliases applied to every token after splitting. */
const TOKEN_ALIASES: Record<string, string> = {
  // identifiers
  identifier: 'id',
  guid: 'id',
  uuid: 'id',
  // company
  organization: 'company',
  organisation: 'company',
  org: 'company',
  business: 'company',
  firm: 'company',
  // people
  person: 'contact',
  client: 'customer',
  // contact details
  telephone: 'phone',
  tel: 'phone',
  phones: 'phone',
  cell: 'mobile',
  cellular: 'mobile',
  mail: 'email',
  emails: 'email',
  // address
  addr: 'address',
  addresses: 'address',
  str: 'street',
  town: 'city',
  municipality: 'city',
  province: 'state',
  region: 'state',
  postal: 'zip',
  nation: 'country',
  // dates
  dt: 'date',
  create: 'created',
  creation: 'created',
  update: 'modified',
  updated: 'modified',
  modify: 'modified',
  begin: 'start',
  finish: 'end',
  // numbers
  qty: 'quantity',
  amt: 'amount',
  // text
  desc: 'description',
  notes: 'description',
  note: 'description',
  comment: 'description',
  comments: 'description',
  remarks: 'description',
  // misc
  url: 'website',
  site: 'website',
  web: 'website',
  enabled: 'active',
  isactive: 'active',
};

/**
 * Noise words dropped before comparison — they carry no matching signal and
 * only dilute token overlap ("Full Name" must still reach "Name").
 */
const STOP_TOKENS = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'for',
  'to',
  'on',
  'in',
  'at',
  'is',
  'by',
  'hs',
  'field',
  'fields',
  'info',
  'information',
  'detail',
  'details',
  'data',
  'full',
  'line',
  'main',
  'my',
  'this',
]);

/**
 * Tokens too common to carry a match on their own. When these are the *only*
 * shared word, the pair is rejected unless one side is exactly that word —
 * "Customer ID" → "ID" is a real match, "Customer ID" → "Job ID" is not.
 */
const GENERIC_TOKENS = new Set([
  'id',
  'name',
  'code',
  'number',
  'date',
  'time',
  'type',
  'status',
  'address',
  'phone',
  'email',
  'amount',
  'quantity',
  'description',
  'key',
  'value',
  'total',
  'start',
  'end',
  'first',
  'last',
  'new',
  'old',
  'website',
  'active',
]);

const DATE_TYPES = ['date', 'datetime', 'date_time'];
const TEXT_TYPES = ['string', 'text', 'phone_number', 'email'];
const NUM_TYPES = ['number', 'integer', 'float', 'decimal'];
const BOOL_TYPES = ['boolean', 'bool', 'checkbox'];
/** Its own family, deliberately: an enum destination only accepts values from a
 *  fixed option list, so text landing in one is a different (and worse) problem
 *  than a plain cast — HubSpot silently drops out-of-list values at write time. */
const ENUM_TYPES = ['enum', 'enumeration', 'picklist'];

/** Loose type compatibility — same family counts as compatible. */
export function areTypesCompatible(t1?: string, t2?: string): boolean {
  if (!t1 || !t2 || t1 === t2) return true;
  for (const group of [
    DATE_TYPES,
    TEXT_TYPES,
    NUM_TYPES,
    BOOL_TYPES,
    ENUM_TYPES,
  ]) {
    if (group.includes(t1) && group.includes(t2)) return true;
  }
  return false;
}

/**
 * How a mismatched pair can be repaired.
 *  - `ok`        — same family, nothing to do
 *  - `cast`      — a conversion rule fixes it outright (string → number etc.),
 *                  so it can be attached automatically
 *  - `value_map` — the destination is an enum: only the user knows which source
 *                  value means which option, so this always needs their input
 */
export type TypePairIssue = 'ok' | 'cast' | 'value_map';

export function classifyTypePair(
  sourceType?: string,
  destType?: string,
): TypePairIssue {
  if (areTypesCompatible(sourceType, destType)) return 'ok';
  if (destType && ENUM_TYPES.includes(destType)) return 'value_map';
  return 'cast';
}

export function normalizeFieldName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Matches one real observed value (e.g. "Active", from a synced record) to a
 * destination enum's allowed options, for auto-suggesting a Map Values rule.
 * Deliberately conservative — normalizes (via normalizeFieldName, same as
 * field-name matching) and only returns a match when it's unambiguous: an
 * exact normalized match against exactly one option's value or label. A
 * looser match risks silently mapping a value to the wrong option, which is
 * worse than leaving it for the user to fill in themselves.
 */
export function matchValueToOption(
  value: string,
  options: { value: string; label: string }[],
): string | null {
  const needle = normalizeFieldName(value);
  if (!needle) return null;
  const matches = options.filter(
    (o) =>
      normalizeFieldName(o.value) === needle ||
      normalizeFieldName(o.label) === needle,
  );
  if (matches.length !== 1) return null;
  return matches[0].value;
}

/** Last segment of a "Parent › Child" label (or a `parent.child` key). */
export function leafSegment(s: string, sep: string): string {
  const idx = s.lastIndexOf(sep);
  return idx === -1 ? s : s.slice(idx + sep.length).trim();
}

function splitWords(raw: string): string[] {
  return raw
    .replace(/›/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ACRONYMWord
    .replace(/([A-Za-z])(\d)/g, '$1 $2') // address2 → address 2
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** Normalised name with whole-name aliases resolved, for equality comparison. */
function canonicalString(raw: string): string {
  const n = normalizeFieldName(raw);
  const alias = PHRASE_ALIASES[n];
  return alias ? normalizeFieldName(alias) : n;
}

/** Canonical, de-duplicated, noise-free token list for a name. */
function canonicalTokens(raw: string): string[] {
  const alias = PHRASE_ALIASES[normalizeFieldName(raw)];
  const words = splitWords(alias ?? raw);
  const out: string[] = [];
  for (const word of words) {
    const token = TOKEN_ALIASES[word] ?? word;
    if (STOP_TOKENS.has(token)) continue;
    if (!out.includes(token)) out.push(token);
  }
  // Everything was noise (e.g. a field literally called "Info") — keep the raw
  // first word rather than matching nothing against nothing.
  return out.length > 0 ? out : words.slice(0, 1);
}

interface Prepared {
  field: MatchableField;
  key: string;
  nested: boolean;
  /** Canonical normalised forms of the full key and full label. */
  fullNorms: string[];
  /** Canonical normalised forms of the leaf key and leaf label. */
  leafNorms: string[];
  fullTokenSets: string[][];
  leafTokenSets: string[][];
}

function prepare(field: MatchableField): Prepared {
  const key = field.key;
  const label = (field.label || field.key).trim();
  const leafLabel = leafSegment(label, '›');
  const leafKey = leafSegment(key, '.');
  const nested = leafLabel !== label || leafKey !== key;

  return {
    field,
    key,
    nested,
    fullNorms: uniq([canonicalString(key), canonicalString(label)]),
    leafNorms: uniq([canonicalString(leafKey), canonicalString(leafLabel)]),
    fullTokenSets: uniqSets([canonicalTokens(key), canonicalTokens(label)]),
    leafTokenSets: uniqSets([
      canonicalTokens(leafKey),
      canonicalTokens(leafLabel),
    ]),
  };
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqSets(sets: string[][]): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const set of sets) {
    if (set.length === 0) continue;
    const id = [...set].sort().join('|');
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(set);
  }
  return out;
}

function intersects(a: string[], b: string[]): boolean {
  return a.some((v) => b.includes(v));
}

function sameTokens(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t) => b.includes(t));
}

function anySameTokens(a: string[][], b: string[][]): boolean {
  return a.some((x) => b.some((y) => sameTokens(x, y)));
}

const isDigits = (t: string) => /^\d+$/.test(t);

/**
 * Structural similarity between two canonical token lists. Covers the
 * first-word / last-word / containment / overlap cases; returns 0 when the
 * overlap isn't meaningful enough to auto-map.
 */
function tokenScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const shared = a.filter((t) => b.includes(t));
  if (shared.length === 0) return 0;

  const minLen = Math.min(a.length, b.length);
  const union = new Set([...a, ...b]).size;
  const jaccard = shared.length / union;

  // A lone generic word ("id", "name", "phone") only carries a match when one
  // side is exactly that word.
  if (shared.length === 1 && GENERIC_TOKENS.has(shared[0]) && minLen > 1)
    return 0;

  const firstEq = a[0] === b[0];
  const lastEq = a[a.length - 1] === b[b.length - 1];
  const contained = shared.length === minLen;

  let score = 0;
  if (contained && a.length === b.length) score = 88;
  else if (contained) score = 68 + Math.round(jaccard * 8);
  else if (firstEq && lastEq) score = 66;
  else if (lastEq) score = 56 + Math.round(jaccard * 6);
  else if (firstEq) score = 52 + Math.round(jaccard * 6);
  else if (jaccard >= 0.5) score = 50 + Math.round(jaccard * 8);
  if (score === 0) return 0;

  // "Street" and "Street 2" are different fields — a differing numeric suffix
  // demotes the pair without disqualifying it outright.
  const numsA = a.filter(isDigits).join(',');
  const numsB = b.filter(isDigits).join(',');
  if (numsA !== numsB) score -= 12;

  return score;
}

function structuralScore(s: Prepared, d: Prepared): number {
  let best = 0;
  const sSets = [...s.fullTokenSets, ...s.leafTokenSets];
  const dSets = [...d.fullTokenSets, ...d.leafTokenSets];
  for (const a of sSets) {
    for (const b of dSets) {
      best = Math.max(best, tokenScore(a, b));
    }
  }
  return best;
}

/**
 * Name-similarity score for one pair, highest-confidence tier first. Type and
 * requiredness are deliberately *not* considered here — they're modifiers
 * applied by the caller.
 */
function scorePair(s: Prepared, d: Prepared): number {
  // Tier 1 — identical key.
  if (s.key === d.key) return 100;

  // Tier 2 — full names match once normalised and aliased.
  if (intersects(s.fullNorms, d.fullNorms)) return 94;

  // Tier 3 — full names use the same words in any order/spelling.
  if (anySameTokens(s.fullTokenSets, d.fullTokenSets)) return 90;

  // Tier 4 — a nested leaf matches the other side's flat name
  // ("Address › Zip" → "Postal Code").
  if (
    intersects(s.leafNorms, d.fullNorms) ||
    intersects(s.fullNorms, d.leafNorms) ||
    intersects(s.leafNorms, d.leafNorms)
  ) {
    return 86;
  }
  if (
    anySameTokens(s.leafTokenSets, d.fullTokenSets) ||
    anySameTokens(s.fullTokenSets, d.leafTokenSets) ||
    anySameTokens(s.leafTokenSets, d.leafTokenSets)
  ) {
    return 82;
  }

  // Tier 5 — partial word overlap (containment, first word, last word).
  return structuralScore(s, d);
}

export interface FieldMatchReason {
  label: string;
  positive: boolean;
}

export interface FieldMatchExplanation {
  score: number;
  reasons: FieldMatchReason[];
}

/**
 * Scores one already-chosen (source, dest) pair on demand — the manual-mapping
 * dialog's live "N% match" readout. Reuses the exact same tiers/modifiers as
 * `matchFields` below (so a manually-picked pair and an auto-suggested pair
 * always agree on score), just without the cross-product assignment or the
 * `MIN_SCORE` cutoff, since here the pair is already fixed by the user.
 */
export function explainFieldPair(
  source: MatchableField,
  dest: MatchableField,
): FieldMatchExplanation {
  const s = prepare(source);
  const d = prepare(dest);
  const base = scorePair(s, d);
  const typeCompatible = areTypesCompatible(source.type, dest.type);

  let score = base;
  score += typeCompatible ? 3 : -10;
  if (dest.required) score += 2;
  if (s.nested) score -= 1;
  score = Math.max(0, Math.min(100, score));

  const nameSimilar = base >= 82;
  const structureSimilar = base >= 66;
  const nested = s.nested || d.nested;

  return {
    score,
    reasons: [
      {
        label: nameSimilar ? 'Similar field names' : 'Different naming',
        positive: nameSimilar,
      },
      {
        label: typeCompatible ? 'Same data type' : 'Different data type',
        positive: typeCompatible,
      },
      {
        label: structureSimilar
          ? nested
            ? 'Nested field match'
            : 'Same structure'
          : 'Different structure',
        positive: structureSimilar,
      },
    ],
  };
}

export interface MatchFieldsOptions {
  /** Source keys already mapped — skipped so existing work is never duplicated. */
  usedSourceKeys?: Set<string>;
  /** Destination keys already mapped — auto-map stays one-to-one. */
  usedDestKeys?: Set<string>;
}

/**
 * Best one-to-one pairing between source and destination fields.
 *
 * Container fields (`type === "object"`, e.g. ServiceTitan's synthetic
 * "address" parent) are never mapped — only their leaves are — and read-only
 * destinations are excluded because they can't be written to.
 */
export function matchFields(
  sourceFields: MatchableField[],
  destFields: MatchableField[],
  options: MatchFieldsOptions = {},
): FieldMatch[] {
  const { usedSourceKeys, usedDestKeys } = options;

  const sources = sourceFields
    .filter((f) => f.key && f.type !== 'object' && !usedSourceKeys?.has(f.key))
    .map(prepare);
  const dests = destFields
    .filter(
      (f) =>
        f.key &&
        !f.readOnly &&
        f.type !== 'object' &&
        !usedDestKeys?.has(f.key),
    )
    .map(prepare);

  const candidates: FieldMatch[] = [];
  for (const s of sources) {
    for (const d of dests) {
      const base = scorePair(s, d);
      if (base < MIN_SCORE) continue;

      let score = base;
      // A type mismatch is fixable with a transform rule, so it demotes rather
      // than disqualifies — weak matches fall below the threshold, strong ones survive.
      score += areTypesCompatible(s.field.type, d.field.type) ? 3 : -10;
      if (d.field.required) score += 2;
      // Tie-break toward the flat source field when a nested one scores the same.
      if (s.nested) score -= 1;
      if (score < MIN_SCORE) continue;

      candidates.push({ source: s.field, dest: d.field, score });
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      a.source.key.localeCompare(b.source.key) ||
      a.dest.key.localeCompare(b.dest.key),
  );

  const takenSource = new Set<string>();
  const takenDest = new Set<string>();
  const matches: FieldMatch[] = [];
  for (const c of candidates) {
    if (takenSource.has(c.source.key) || takenDest.has(c.dest.key)) continue;
    takenSource.add(c.source.key);
    takenDest.add(c.dest.key);
    matches.push(c);
  }
  return matches;
}
