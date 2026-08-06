import {
  readBody,
  requireSession,
  createSession,
  cookieHeader,
  countRows,
  listEntityRows,
  getItemById,
  createPasswordRecord,
  verifyPassword,
  getSettingsObject,
  upsertDefaultSettings,
  insertHistory,
  serializeHistory,
  normalizeItemPayload,
  normalizeSettings,
  computeItemScore,
  collectMissingData,
  string,
  optionalString,
  clampInt,
  round,
  timingSafeEqual,
  randomHex,
  bytesToHex,
  base64UrlEncode,
  base64UrlEncodeBytes,
  atobUrl,
  safeJsonObject,
  safeJsonArray,
  splitTags,
  nowIso,
  type Item,
  type DoctrineNote,
  type SessionData
} from './helpers';

type EntityKind =
  | 'missions'
  | 'projects'
  | 'campaigns'
  | 'objectives'
  | 'tasks'
  | 'resources'
  | 'decisions'
  | 'scenarios';

type DecisionWeights = {
  impact: number;
  urgency: number;
  feasibility: number;
  flexibility: number;
  resilience: number;
  risk: number;
  cost: number;
};

type AppSettings = {
  decisionWeights: DecisionWeights;
  ui: {
    accent: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose';
    density: 'compact' | 'comfortable' | 'spacious';
  };
  ai: {
    honorifics: boolean;
    tone: 'military' | 'cold' | 'balanced' | 'concise';
  };
};

const APP_NAME = 'État-Major Personnel';

const ENTITY_TABLES: Record<EntityKind, string> = {
  missions: 'missions',
  projects: 'projects',
  campaigns: 'campaigns',
  objectives: 'objectives',
  tasks: 'tasks',
  resources: 'resources',
  decisions: 'decisions',
  scenarios: 'scenarios'
};

const ENTITY_KINDS = Object.keys(ENTITY_TABLES) as EntityKind[];

const DEFAULT_SETTINGS: AppSettings = {
  decisionWeights: {
    impact: 0.3,
    urgency: 0.2,
    feasibility: 0.2,
    flexibility: 0.1,
    resilience: 0.1,
    risk: 0.07,
    cost: 0.03
  },
  ui: {
    accent: 'emerald',
    density: 'comfortable'
  },
  ai: {
    honorifics: true,
    tone: 'military'
  }
};

const ITEM_COLUMNS = [
  'id',
  'workspace_id',
  'title',
  'description',
  'status',
  'priority',
  'urgency',
  'risk',
  'feasibility',
  'cost',
  'impact',
  'flexibility',
  'resilience',
  'horizon',
  'due_at',
  'parent_type',
  'parent_id',
  'tags_json',
  'meta_json',
  'score',
  'created_by',
  'created_at',
  'updated_at'
].join(', ');

interface Env {
  DB: any;
  ASSETS: any;
  ACCESS_CODE: string;
  AUTH_SECRET: string;
  APP_NAME?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      if (pathname.startsWith('/api/')) {
        if (request.method === 'OPTIONS') {
          return json({ ok: true }, 204);
        }

        if (pathname === '/api/bootstrap/status') {
          return await bootstrapStatus(env);
        }

        if (pathname === '/api/auth/me') {
          return await authMe(request, env);
        }

        if (pathname === '/api/bootstrap' && request.method === 'POST') {
          return await bootstrap(request, env);
        }

        if (pathname === '/api/auth/login' && request.method === 'POST') {
          return await login(request, env);
        }

        if (pathname === '/api/auth/logout' && request.method === 'POST') {
          return await logout(request, env);
        }

        if (pathname === '/api/dashboard') {
          const session = await requireSession(request, env);
          if (!session) return unauthorized();
          return await dashboard(env, session);
        }

        if (pathname === '/api/history') {
          const session = await requireSession(request, env);
          if (!session) return unauthorized();
          return await historyList(url, env, session);
        }

        if (pathname === '/api/settings') {
          const session = await requireSession(request, env);
          if (!session) return unauthorized();
          if (request.method === 'GET') return await getSettings(env, session);
          if (request.method === 'PUT') return await putSettings(request, env, session);
        }

        const itemMatch = pathname.match(/^\/api\/items\/([^/]+)(?:\/([^/]+))?\/?$/);
        if (itemMatch) {
          const kind = itemMatch[1];
          const id = itemMatch[2];
          const session = await requireSession(request, env);
          if (!session) return unauthorized();
          if (!isEntityKind(kind)) return notFound('Type non reconnu.');

          if (request.method === 'GET' && !id) {
            return await listItems(request, env, session, kind);
          }
          if (request.method === 'POST' && !id) {
            return await createItem(request, env, session, kind);
          }
          if (request.method === 'PUT' && id) {
            return await updateItem(request, env, session, kind, id);
          }
          if (request.method === 'DELETE' && id) {
            return await deleteItem(env, session, kind, id);
          }
        }

        if (pathname === '/api/decision/analyze' && request.method === 'POST') {
          const session = await requireSession(request, env);
          if (!session) return unauthorized();
          return await analyzeDecision(request, env, session);
        }

        return notFound('Route API introuvable.');
      }

      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;

      if (request.method === 'GET') {
        const indexUrl = new URL('/index.html', request.url);
        return await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }

      return assetResponse;
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : 'Erreur serveur.'
        },
        500
      );
    }
  }
};

async function bootstrapStatus(env: Env) {
  const totalUsers = await countRows(env.DB, 'users');
  return json({
    needsBootstrap: totalUsers === 0,
    appName: env.APP_NAME || APP_NAME
  });
}

async function bootstrap(request: Request, env: Env) {
  ensureSecrets(env);

  const body = await readBody(request);
  const accessCode = string(body.accessCode);
  if (!timingSafeEqual(accessCode.trim(), env.ACCESS_CODE.trim())) {
    return unauthorized("Code d'accès invalide.");
  }

  const existingUsers = await countRows(env.DB, 'users');
  if (existingUsers > 0) {
    return json({ error: 'Le bootstrap a déjà été effectué.' }, 409);
  }

  const email = string(body.email).toLowerCase().trim();
  const password = string(body.password);
  const workspaceName = string(body.workspaceName).trim() || 'Quartier général';
  const displayName = string(body.displayName).trim() || 'Commandant';

  if (!email || !password) {
    return badRequest('E-mail et mot de passe obligatoires.');
  }

  const workspaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const now = nowIso();

  await env.DB.batch([
    env.DB
      .prepare(
        `INSERT INTO workspaces (id, title, access_tier, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(workspaceId, workspaceName, 'personal', now, now),
    env.DB
      .prepare(
        `INSERT INTO users (id, workspace_id, email, display_name, password_salt, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        workspaceId,
        email,
        displayName,
        ...(await createPasswordRecord(password)),
        'owner',
        now,
        now
      )
  ]);

  await upsertDefaultSettings(env.DB, workspaceId, DEFAULT_SETTINGS);

  await insertHistory(env.DB, {
    workspaceId,
    actorId: userId,
    kind: 'bootstrap',
    action: 'created',
    entityType: 'workspace',
    entityId: workspaceId,
    message: `Workspace initialisé : ${workspaceName}`,
    details: { displayName, email }
  });

  const session = await createSession(env, {
    user: { id: userId, email, displayName, role: 'owner' },
    workspace: { id: workspaceId, title: workspaceName }
  });

  const settings = await getSettingsObject(env.DB, workspaceId);

  return json(
    {
      session: {
        user: { id: userId, email, displayName, role: 'owner' },
        workspace: { id: workspaceId, title: workspaceName }
      },
      settings,
      message: 'Workspace initialisé. Poste de commandement ouvert.'
    },
    200,
    session.cookieHeaders
  );
}

async function login(request: Request, env: Env) {
  ensureSecrets(env);

  const body = await readBody(request);
  const accessCode = string(body.accessCode);
  if (!timingSafeEqual(accessCode.trim(), env.ACCESS_CODE.trim())) {
    return unauthorized('Code d\'accès invalide.');
  }

  const email = string(body.email).toLowerCase().trim();
  const password = string(body.password);
  if (!email || !password) {
    return badRequest('E-mail et mot de passe obligatoires.');
  }

  const user = await env.DB
    .prepare(
      `SELECT id, workspace_id, email, display_name, password_salt, password_hash, role
       FROM users
       WHERE email = ?`
    )
    .bind(email)
    .first();

  if (!user) return unauthorized('Identifiants invalides.');

  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) return unauthorized('Identifiants invalides.');

  const workspace = await env.DB
    .prepare(`SELECT id, title FROM workspaces WHERE id = ?`)
    .bind(user.workspace_id)
    .first();

  if (!workspace) return unauthorized('Workspace introuvable.');

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role
    },
    workspace: {
      id: workspace.id,
      title: workspace.title
    }
  };

  const session = await createSession(env, sessionData);

  await insertHistory(env.DB, {
    workspaceId: workspace.id,
    actorId: user.id,
    kind: 'auth',
    action: 'login',
    entityType: 'user',
    entityId: user.id,
    message: `Connexion validée : ${user.display_name}`,
    details: { email: user.email }
  });

  const settings = await getSettingsObject(env.DB, workspace.id);

  return json(
    {
      session: sessionData,
      settings,
      message: 'Connexion validée. Poste opérationnel.'
    },
    200,
    session.cookieHeaders
  );
}

async function logout(request: Request, env: Env) {
  const cookie = cookieHeader(env, '', 0);
  return json(
    { ok: true },
    200,
    {
      'Set-Cookie': cookie
    }
  );
}

async function authMe(request: Request, env: Env) {
  const session = await requireSession(request, env);
  if (!session) return unauthorized();
  const settings = await getSettingsObject(env.DB, session.workspace.id);

  return json({
    session: {
      user: session.user,
      workspace: session.workspace
    },
    settings
  });
}

async function dashboard(env: Env, session: SessionData) {
  const counts: Record<string, number> = {};
  const allItems: Array<Item & { kind: EntityKind }> = [];
  const recentBuckets: Array<Item & { kind: EntityKind }> = [];

  for (const kind of ENTITY_KINDS) {
    const rows = await listEntityRows(env.DB, session.workspace.id, kind);
    counts[kind] = rows.length;
    allItems.push(...rows);
    recentBuckets.push(...rows.slice(0, 2));
  }

  const total = allItems.length;
  const active = allItems.filter((item) => ['planned', 'active', 'generated', 'draft'].includes(item.status)).length;
  const blocked = allItems.filter((item) => item.status === 'blocked').length;
  const avgScore = total ? round(allItems.reduce((sum, item) => sum + item.score, 0) / total) : 0;

  const recent = recentBuckets
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 12);

  const history = await env.DB
    .prepare(
      `SELECT id, workspace_id, actor_id, kind, action, entity_type, entity_id, message, details_json, created_at
       FROM history
       WHERE workspace_id = ?
       ORDER BY created_at DESC
       LIMIT 8`
    )
    .bind(session.workspace.id)
    .all();

  const historyRecent = (history.results || []).map(serializeHistory);

  const signals: string[] = [];
  if (total === 0) signals.push('Aucun actif');
  if (blocked > 0) signals.push('Blocages présents');
  if (avgScore >= 60) signals.push('Posture favorable');
  else if (avgScore >= 35) signals.push('Posture mixte');
  else signals.push('Posture fragile');
  if (active > 0) signals.push('Tempo opérationnel');
  if (recent.length) signals.push('Mémoire active');

  const settings = await getSettingsObject(env.DB, session.workspace.id);

  return json({
    session: {
      user: session.user,
      workspace: session.workspace
    },
    settings,
    counts,
    stats: {
      total,
      active,
      blocked,
      avgScore
    },
    signals,
    recent,
    historyRecent
  });
}

async function historyList(url: URL, env: Env, session: SessionData) {
  const limit = clampInt(url.searchParams.get('limit') ?? '100', 1, 500, 100);

  const result = await env.DB
    .prepare(
      `SELECT id, workspace_id, actor_id, kind, action, entity_type, entity_id, message, details_json, created_at
       FROM history
       WHERE workspace_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(session.workspace.id, limit)
    .all();

  return json({
    history: (result.results || []).map(serializeHistory)
  });
}

async function getSettings(env: Env, session: SessionData) {
  const settings = await getSettingsObject(env.DB, session.workspace.id);
  return json({ settings });
}

async function putSettings(request: Request, env: Env, session: SessionData) {
  const body = await readBody(request);
  const incoming = normalizeSettings(body);
  await upsertDefaultSettings(env.DB, session.workspace.id, incoming);
  const settings = await getSettingsObject(env.DB, session.workspace.id);
  return json({ settings });
}

async function listItems(request: Request, env: Env, session: SessionData, kind: EntityKind) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const items = await listEntityRows(env.DB, session.workspace.id, kind, q);
  return json({ items });
}

async function createItem(request: Request, env: Env, session: SessionData, kind: EntityKind) {
  const body = await readBody(request);
  const payload = normalizeItemPayload(body, kind);
  const id = crypto.randomUUID();
  const now = nowIso();
  const score = computeItemScore(payload, DEFAULT_SETTINGS.decisionWeights);
  const priority = payload.priority ?? Math.max(0, Math.min(100, Math.round(score)));

  await env.DB
    .prepare(
      `INSERT INTO ${ENTITY_TABLES[kind]} (${ITEM_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      session.workspace.id,
      payload.title,
      payload.description,
      payload.status,
      priority,
      payload.urgency,
      payload.risk,
      payload.feasibility,
      payload.cost,
      payload.impact,
      payload.flexibility,
      payload.resilience,
      payload.horizon,
      payload.dueAt,
      payload.parentType,
      payload.parentId,
      JSON.stringify(payload.tags),
      JSON.stringify(payload.meta),
      score,
      session.user.id,
      now,
      now
    )
    .run();

  const item = await getItemById(env.DB, session.workspace.id, kind, id);

  if (item) {
    await insertHistory(env.DB, {
      workspaceId: session.workspace.id,
      actorId: session.user.id,
      kind: 'item',
      action: 'created',
      entityType: kind,
      entityId: id,
      message: `${label(kind)} créée : ${item.title}`,
      details: { score: item.score, status: item.status, title: item.title }
    });
  }

  return json({ item });
}

async function updateItem(request: Request, env: Env, session: SessionData, kind: EntityKind, id: string) {
  const existing = await getItemById(env.DB, session.workspace.id, kind, id);
  if (!existing) return notFound('Élément introuvable.');

  const body = await readBody(request);
  const payload = normalizeItemPayload(body, kind);
  const now = nowIso();
  const score = computeItemScore(payload, DEFAULT_SETTINGS.decisionWeights);
  const priority = payload.priority ?? Math.max(0, Math.min(100, Math.round(score)));

  await env.DB
    .prepare(
      `UPDATE ${ENTITY_TABLES[kind]}
       SET title = ?, description = ?, status = ?, priority = ?, urgency = ?, risk = ?, feasibility = ?, cost = ?, impact = ?, flexibility = ?, resilience = ?, horizon = ?, due_at = ?, parent_type = ?, parent_id = ?, tags_json = ?, meta_json = ?, score = ?, updated_at = ?
       WHERE id = ? AND workspace_id = ?`
    )
    .bind(
      payload.title,
      payload.description,
      payload.status,
      priority,
      payload.urgency,
      payload.risk,
      payload.feasibility,
      payload.cost,
      payload.impact,
      payload.flexibility,
      payload.resilience,
      payload.horizon,
      payload.dueAt,
      payload.parentType,
      payload.parentId,
      JSON.stringify(payload.tags),
      JSON.stringify(payload.meta),
      score,
      now,
      id,
      session.workspace.id
    )
    .run();

  const item = await getItemById(env.DB, session.workspace.id, kind, id);

  await insertHistory(env.DB, {
    workspaceId: session.workspace.id,
    actorId: session.user.id,
    kind: 'item',
    action: 'updated',
    entityType: kind,
    entityId: id,
    message: `${label(kind)} mise à jour : ${payload.title}`,
    details: { score, status: payload.status }
  });

  return json({ item });
}

async function deleteItem(env: Env, session: SessionData, kind: EntityKind, id: string) {
  const existing = await getItemById(env.DB, session.workspace.id, kind, id);
  if (!existing) return notFound('Élément introuvable.');

  await env.DB
    .prepare(`DELETE FROM ${ENTITY_TABLES[kind]} WHERE id = ? AND workspace_id = ?`)
    .bind(id, session.workspace.id)
    .run();

  await insertHistory(env.DB, {
    workspaceId: session.workspace.id,
    actorId: session.user.id,
    kind: 'item',
    action: 'deleted',
    entityType: kind,
    entityId: id,
    message: `${label(kind)} supprimée : ${existing.title}`,
    details: { title: existing.title, score: existing.score }
  });

  return json({ ok: true });
}

async function analyzeDecision(request: Request, env: Env, session: SessionData) {
  const body = await readBody(request);
  const settings = await getSettingsObject(env.DB, session.workspace.id);
  const weights = settings.decisionWeights;

  const title = string(body.title).trim() || 'Rapport stratégique';
  const context = string(body.context).trim();
  const notes = string(body.notes).trim();

  const input = {
    title,
    context,
    impact: clampInt(body.impact, 0, 100, 50),
    cost: clampInt(body.cost, 0, 100, 50),
    urgency: clampInt(body.urgency, 0, 100, 50),
    time: clampInt(body.time, 0, 100, 50),
    risk: clampInt(body.risk, 0, 100, 50),
    feasibility: clampInt(body.feasibility, 0, 100, 50),
    flexibility: clampInt(body.flexibility, 0, 100, 50),
    resilience: clampInt(body.resilience, 0, 100, 50),
    dependencies: clampInt(body.dependencies, 0, 100, 50),
    horizon: string(body.horizon).trim() || 'medium',
    notes
  };

  const score = round(
    input.impact * weights.impact +
      input.urgency * weights.urgency +
      input.feasibility * weights.feasibility +
      input.flexibility * weights.flexibility +
      input.resilience * weights.resilience -
      input.risk * weights.risk -
      input.cost * weights.cost
  );

  const missingData = collectMissingData(body);
  const completeness = Math.max(0, 100 - missingData.length * 12);
  const confidence = Math.max(
    10,
    Math.min(100, completeness - Math.round(input.dependencies * 0.2) - Math.round(input.time * 0.05))
  );

  const riskNotes: string[] = [];
  if (input.risk >= 70) riskNotes.push('Risque principal élevé');
  if (input.dependencies >= 60) riskNotes.push('Dépendances externes fortes');
  if (input.feasibility <= 40) riskNotes.push('Faisabilité fragile');
  if (input.time >= 70) riskNotes.push('Pression temporelle élevée');
  if (!context) riskNotes.push('Contexte insuffisant');

  function buildDoctrines(
    input: {
      risk: number;
      feasibility: number;
      dependencies: number;
      flexibility: number;
      resilience: number;
      time: number;
    },
    missingData: string[]
  ) {
    const notes: DoctrineNote[] = [];

    if (input.risk >= 60) {
      notes.push({
        doctrine: 'Sun Tzu',
        note: 'Éviter la bataille inutile. Préférer la manoeuvre, la désescalade ou l\'isolement des points de friction.'
      });
    }

    if (input.dependencies >= 50) {
      notes.push({
        doctrine: 'Clausewitz',
        note: 'Attention à la friction. Chaque dépendance externe augmente l\'incertitude réelle du plan.'
      });
    }

    if (input.feasibility >= 60 && input.risk < 55) {
      notes.push({
        doctrine: 'Napoléon',
        note: 'Concentrer les forces sur le point décisif pour obtenir un effet supérieur à l\'effort.'
      });
    }

    if (input.time >= 60 && input.feasibility >= 50) {
      notes.push({
        doctrine: 'César',
        note: 'La vitesse peut compenser une partie des faiblesses si l\'exécution reste nette et contrôlée.'
      });
    }

    if (input.flexibility >= 60) {
      notes.push({
        doctrine: 'Rommel',
        note: 'La mobilité et l\'adaptation rapide offrent un avantage si la ligne d\'action reste légère.'
      });
    }

    if (input.resilience >= 60) {
      notes.push({
        doctrine: 'Gracián',
        note: 'La prudence renforce la position. Préserver les options avant de chercher l\'éclat.'
      });
    }

    if (missingData.length > 0) {
      notes.push({
        doctrine: 'Le Bon',
        note: 'Les perceptions changent vite quand l\'information est incomplète. Rester attentif aux réactions collectives.'
      });
    }

    return notes.length
      ? notes
      : [
          {
            doctrine: 'Machiavel',
            note: 'Lecture froide : conserver l\'avantage, réduire les angles morts et protéger l\'intérêt principal.'
          }
        ];
  }

  const doctrines = buildDoctrines(input, missingData);

  return json({
    score,
    confidence,
    completeness,
    input,
    riskNotes,
    doctrines
  });
}

function ensureSecrets(env: Env) {
  if (!env.ACCESS_CODE || !env.AUTH_SECRET) {
    throw new Error('Variables secrètes manquantes.');
  }
}

function unauthorized(message = 'Non autorisé.') {
  return json({ error: message }, 401);
}

function badRequest(message: string) {
  return json({ error: message }, 400);
}

function notFound(message = 'Introuvable.') {
  return json({ error: message }, 404);
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function label(kind: EntityKind) {
  switch (kind) {
    case 'missions':
      return 'Mission';
    case 'projects':
      return 'Projet';
    case 'campaigns':
      return 'Campagne';
    case 'objectives':
      return 'Objectif';
    case 'tasks':
      return 'Tâche';
    case 'resources':
      return 'Ressource';
    case 'decisions':
      return 'Décision';
    case 'scenarios':
      return 'Scénario';
  }
}

function isEntityKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as string[]).includes(value);
}
