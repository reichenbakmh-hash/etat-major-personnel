import { webcrypto } from 'node:crypto';

interface Item {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  urgency: number;
  risk: number;
  feasibility: number;
  cost: number;
  impact: number;
  flexibility: number;
  resilience: number;
  horizon: string;
  dueAt: string | null;
  parentType: string | null;
  parentId: string | null;
  tags: string[];
  meta: Record<string, unknown>;
  score: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DoctrineNote {
  doctrine: string;
  note: string;
}

interface ItemPayload {
  title: string;
  description: string;
  status: string;
  priority?: number;
  urgency: number;
  risk: number;
  feasibility: number;
  cost: number;
  impact: number;
  flexibility: number;
  resilience: number;
  horizon: string;
  dueAt?: string | null;
  parentType?: string | null;
  parentId?: string | null;
  tags: string[];
  meta: Record<string, unknown>;
}

// Request/Response helpers
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// Session management
export interface SessionData {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  };
  workspace: {
    id: string;
    title: string;
  };
}

export async function requireSession(request: Request, env: any): Promise<SessionData | null> {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  try {
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;

    const sessionToken = match[1];
    const sessionData = atobUrl(sessionToken);
    const parsed = JSON.parse(sessionData);
    return parsed as SessionData;
  } catch {
    return null;
  }
}

export async function createSession(env: any, data: SessionData) {
  const token = base64UrlEncode(JSON.stringify(data));
  const cookieHeaders = {
    'Set-Cookie': cookieHeader(env, token, 7 * 24 * 60 * 60)
  };
  return { token, cookieHeaders };
}

export function cookieHeader(env: any, token: string, maxAge: number) {
  const sameSite = 'Lax';
  if (!token) {
    return `session=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0`;
  }
  return `session=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}`;
}

// Database helpers
export async function countRows(db: any, table: string): Promise<number> {
  const result = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
  return result?.count ?? 0;
}

export async function listEntityRows(db: any, workspaceId: string, kind: string, q?: string): Promise<Array<Item>> {
  const table = `${kind}`;
  let sql = `SELECT * FROM ${table} WHERE workspace_id = ? ORDER BY updated_at DESC`;
  const bindings: any[] = [workspaceId];

  if (q) {
    sql += ` AND (title LIKE ? OR description LIKE ?)`;
    bindings.push(`%${q}%`, `%${q}%`);
  }

  const result = await db.prepare(sql).bind(...bindings).all();
  return (result.results || []).map(deserializeItem);
}

export async function getItemById(db: any, workspaceId: string, kind: string, id: string): Promise<Item | null> {
  const result = await db
    .prepare(`SELECT * FROM ${kind} WHERE id = ? AND workspace_id = ?`)
    .bind(id, workspaceId)
    .first();
  return result ? deserializeItem(result) : null;
}

function deserializeItem(row: any): Item {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    urgency: row.urgency,
    risk: row.risk,
    feasibility: row.feasibility,
    cost: row.cost,
    impact: row.impact,
    flexibility: row.flexibility,
    resilience: row.resilience,
    horizon: row.horizon,
    dueAt: row.due_at,
    parentType: row.parent_type,
    parentId: row.parent_id,
    tags: safeJsonArray(row.tags_json),
    meta: safeJsonObject(row.meta_json),
    score: row.score,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Password helpers
export async function createPasswordRecord(password: string): Promise<[string, string]> {
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  return [salt, hash];
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return timingSafeEqual(computed, hash);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

// Settings helpers
export async function getSettingsObject(db: any, workspaceId: string): Promise<any> {
  const result = await db
    .prepare(`SELECT key, value FROM settings WHERE workspace_id = ?`)
    .bind(workspaceId)
    .all();

  const settings: Record<string, any> = {};
  if (result.results) {
    for (const row of result.results) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
  }
  return settings;
}

export async function upsertDefaultSettings(db: any, workspaceId: string, incoming: any): Promise<void> {
  const now = nowIso();
  const statements = Object.entries(incoming).map(([key, value]) =>
    db
      .prepare(
        `INSERT INTO settings (workspace_id, key, value, updated_at) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(workspace_id, key) DO UPDATE SET value = ?, updated_at = ?`
      )
      .bind(workspaceId, key, JSON.stringify(value), now, JSON.stringify(value), now)
  );

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

// History helpers
export async function insertHistory(db: any, entry: any): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO history (id, workspace_id, actor_id, kind, action, entity_type, entity_id, message, details_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      entry.workspaceId,
      entry.actorId,
      entry.kind,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.message,
      JSON.stringify(entry.details || {}),
      nowIso()
    )
    .run();
}

export function serializeHistory(row: any): any {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    actorId: row.actor_id,
    kind: row.kind,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    message: row.message,
    details: safeJsonObject(row.details_json),
    createdAt: row.created_at
  };
}

// Item normalization
export function normalizeItemPayload(body: any, kind: string): ItemPayload {
  return {
    title: string(body.title).trim() || 'Sans titre',
    description: string(body.description).trim(),
    status: string(body.status).trim() || 'planned',
    priority: optionalInt(body.priority),
    urgency: clampInt(body.urgency, 0, 100, 50),
    risk: clampInt(body.risk, 0, 100, 50),
    feasibility: clampInt(body.feasibility, 0, 100, 50),
    cost: clampInt(body.cost, 0, 100, 50),
    impact: clampInt(body.impact, 0, 100, 50),
    flexibility: clampInt(body.flexibility, 0, 100, 50),
    resilience: clampInt(body.resilience, 0, 100, 50),
    horizon: string(body.horizon).trim() || (kind === 'tasks' ? 'short' : 'medium'),
    dueAt: optionalString(body.dueAt),
    parentType: optionalString(body.parentType),
    parentId: optionalString(body.parentId),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : splitTags(string(body.tags)),
    meta: body.meta && typeof body.meta === 'object' ? body.meta : {}
  };
}

export function normalizeSettings(body: any): any {
  const settings: Record<string, any> = {};

  if (body.decisionWeights && typeof body.decisionWeights === 'object') {
    settings.decisionWeights = body.decisionWeights;
  }

  if (body.ui && typeof body.ui === 'object') {
    settings.ui = body.ui;
  }

  if (body.ai && typeof body.ai === 'object') {
    settings.ai = body.ai;
  }

  return settings;
}

// Scoring
export function computeItemScore(payload: ItemPayload, weights: any): number {
  const score =
    payload.impact * (weights.impact ?? 0.3) +
    payload.urgency * (weights.urgency ?? 0.2) +
    payload.feasibility * (weights.feasibility ?? 0.2) +
    payload.flexibility * (weights.flexibility ?? 0.1) +
    payload.resilience * (weights.resilience ?? 0.1) -
    payload.risk * (weights.risk ?? 0.07) -
    payload.cost * (weights.cost ?? 0.03);

  return round(score);
}

export function collectMissingData(body: any): string[] {
  const missing: string[] = [];
  if (!body.title) missing.push('title');
  if (!body.context && body.context !== '') missing.push('context');
  if (body.impact == null) missing.push('impact');
  if (body.feasibility == null) missing.push('feasibility');
  return missing;
}

// Utility helpers
export function string(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function optionalString(value: unknown): string | null {
  const s = string(value).trim();
  return s.length ? s : null;
}

export function optionalInt(value: unknown): number | undefined {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : undefined;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function safeJsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function safeJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomHex(size: number): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function base64UrlEncode(value: string): string {
  const enc = new TextEncoder();
  return base64UrlEncodeBytes(enc.encode(value));
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function atobUrl(input: string): string {
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/');
  const pad = normalized.length % 4;
  const padded = normalized + (pad ? '='.repeat(4 - pad) : '');
  return atob(padded);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export { Item, DoctrineNote, ItemPayload, SessionData };
