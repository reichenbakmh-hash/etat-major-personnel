import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type EntityKind =
  | 'missions'
  | 'projects'
  | 'campaigns'
  | 'objectives'
  | 'tasks'
  | 'resources'
  | 'decisions'
  | 'scenarios';

type TabId = EntityKind | 'dashboard' | 'history' | 'ia' | 'settings';

interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

interface SessionWorkspace {
  id: string;
  title: string;
}

interface SessionPayload {
  session: {
    user: SessionUser;
    workspace: SessionWorkspace;
  };
  settings?: AppSettings;
  message?: string;
}

interface BootstrapStatus {
  needsBootstrap: boolean;
  appName: string;
}

interface DecisionWeights {
  impact: number;
  urgency: number;
  feasibility: number;
  flexibility: number;
  resilience: number;
  risk: number;
  cost: number;
}

interface UiSettings {
  accent: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose';
  density: 'compact' | 'comfortable' | 'spacious';
}

interface AiSettings {
  honorifics: boolean;
  tone: 'military' | 'cold' | 'balanced' | 'concise';
}

interface AppSettings {
  decisionWeights: DecisionWeights;
  ui: UiSettings;
  ai: AiSettings;
}

interface Item {
  id: string;
  kind: EntityKind;
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

interface HistoryEntry {
  id: string;
  kind: string;
  action: string;
  entityType: string;
  entityId: string | null;
  message: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface DashboardResponse {
  session: {
    user: SessionUser;
    workspace: SessionWorkspace;
  };
  settings: AppSettings;
  counts: Record<string, number>;
  stats: {
    total: number;
    active: number;
    blocked: number;
    avgScore: number;
  };
  signals: string[];
  recent: Item[];
  historyRecent: HistoryEntry[];
}

interface AnalysisPlan {
  name: string;
  score: number;
  rationale: string;
}

interface AnalysisScenario {
  name: string;
  score: number;
  note: string;
}

interface DoctrineNote {
  doctrine: string;
  note: string;
}

interface AnalysisResult {
  voice: 'Azhell Zettour';
  salutation: string;
  title: string;
  summary: string;
  score: number;
  confidence: number;
  completeness: number;
  recommendation: string;
  risks: string[];
  opportunities: string[];
  missingData: string[];
  scenarios: AnalysisScenario[];
  plans: AnalysisPlan[];
  doctrineNotes: DoctrineNote[];
  footer: string;
  decisionId?: string;
  scenarioIds?: string[];
}

interface AuthFormState {
  accessCode: string;
  email: string;
  password: string;
  workspaceName: string;
  displayName: string;
}

interface ItemFormState {
  title: string;
  description: string;
  status: string;
  priority: string;
  urgency: string;
  risk: string;
  feasibility: string;
  cost: string;
  impact: string;
  flexibility: string;
  resilience: string;
  horizon: string;
  dueAt: string;
  parentType: string;
  parentId: string;
  tags: string;
  metaJson: string;
}

interface AnalysisFormState {
  title: string;
  context: string;
  impact: string;
  cost: string;
  urgency: string;
  time: string;
  risk: string;
  feasibility: string;
  flexibility: string;
  resilience: string;
  dependencies: string;
  horizon: string;
  notes: string;
}

const ENTITY_KINDS: EntityKind[] = [
  'missions',
  'projects',
  'campaigns',
  'objectives',
  'tasks',
  'resources',
  'decisions',
  'scenarios'
];

const TAB_ITEMS: Array<{ id: TabId; label: string; kind?: EntityKind }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'missions', label: 'Missions', kind: 'missions' },
  { id: 'projects', label: 'Projets', kind: 'projects' },
  { id: 'campaigns', label: 'Campagnes', kind: 'campaigns' },
  { id: 'objectives', label: 'Objectifs', kind: 'objectives' },
  { id: 'tasks', label: 'Tâches', kind: 'tasks' },
  { id: 'resources', label: 'Ressources', kind: 'resources' },
  { id: 'decisions', label: 'Décisions', kind: 'decisions' },
  { id: 'scenarios', label: 'Scénarios', kind: 'scenarios' },
  { id: 'history', label: 'Historique' },
  { id: 'ia', label: 'IA' },
  { id: 'settings', label: 'Paramètres' }
];

const ENTITY_LABELS: Record<EntityKind, string> = {
  missions: 'Mission',
  projects: 'Projet',
  campaigns: 'Campagne',
  objectives: 'Objectif',
  tasks: 'Tâche',
  resources: 'Ressource',
  decisions: 'Décision',
  scenarios: 'Scénario'
};

const APP_TITLE = 'État-Major Personnel';

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

const ACCENT_MAP: Record<UiSettings['accent'], string> = {
  emerald: '#22c55e',
  sky: '#38bdf8',
  amber: '#f59e0b',
  violet: '#a78bfa',
  rose: '#fb7185'
};

const STATUS_OPTIONS = ['planned', 'active', 'blocked', 'done', 'archived'];
const HORIZON_OPTIONS = ['short', 'medium', 'long'];

const EMPTY_AUTH: AuthFormState = {
  accessCode: '',
  email: '',
  password: '',
  workspaceName: 'Quartier général',
  displayName: 'Commandant'
};

const EMPTY_ITEM_FORM: ItemFormState = {
  title: '',
  description: '',
  status: 'planned',
  priority: '50',
  urgency: '50',
  risk: '50',
  feasibility: '50',
  cost: '50',
  impact: '50',
  flexibility: '50',
  resilience: '50',
  horizon: 'medium',
  dueAt: '',
  parentType: '',
  parentId: '',
  tags: '',
  metaJson: '{}'
};

const EMPTY_ANALYSIS_FORM: AnalysisFormState = {
  title: '',
  context: '',
  impact: '50',
  cost: '50',
  urgency: '50',
  time: '50',
  risk: '50',
  feasibility: '50',
  flexibility: '50',
  resilience: '50',
  dependencies: '50',
  horizon: 'medium',
  notes: ''
};

function App() {
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);
  const [session, setSession] = useState<SessionPayload['session'] | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const stored = localStorage.getItem('emp.activeTab');
    return stored && TAB_ITEMS.some((t) => t.id === stored) ? (stored as TabId) : 'dashboard';
  });
  const [selectedKind, setSelectedKind] = useState<EntityKind>(() => {
    const stored = localStorage.getItem('emp.selectedKind');
    return stored && ENTITY_KINDS.includes(stored as EntityKind) ? (stored as EntityKind) : 'missions';
  });
  const [authForm, setAuthForm] = useState<AuthFormState>(EMPTY_AUTH);
  const [itemForm, setItemForm] = useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [analysisForm, setAnalysisForm] = useState<AnalysisFormState>(EMPTY_ANALYSIS_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [search, setSearch] = useState('');

  const currentEntityKind = ENTITY_KINDS.includes(activeTab as EntityKind)
    ? (activeTab as EntityKind)
    : selectedKind;

  const itemPreviewScore = useMemo(
    () => computeScoreFromItemForm(itemForm, settings.decisionWeights),
    [itemForm, settings.decisionWeights]
  );

  const analysisPreviewScore = useMemo(
    () => computeScoreFromAnalysisForm(analysisForm, settings.decisionWeights),
    [analysisForm, settings.decisionWeights]
  );

  useEffect(() => {
    document.title = session
      ? `${APP_TITLE} — ${tabTitle(activeTab)}`
      : `${APP_TITLE} — Accès`;
  }, [session, activeTab]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', ACCENT_MAP[settings.ui.accent]);
    document.body.dataset.density = settings.ui.density;
  }, [settings.ui.accent, settings.ui.density]);

  useEffect(() => {
    localStorage.setItem('emp.activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('emp.selectedKind', selectedKind);
  }, [selectedKind]);

  useEffect(() => {
    const timer = setTimeout(() => setBanner(null), 4200);
    return () => clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadSection(activeTab);
  }, [session, activeTab, selectedKind]);

  async function initialize() {
    setInitializing(true);
    try {
      const status = await api<BootstrapStatus>('/api/bootstrap/status');
      setBootstrap(status);

      try {
        const me = await api<SessionPayload>('/api/auth/me');
        setSession(me.session);
        if (me.settings) setSettings(normalizeSettings(me.settings));
        await loadSection(activeTab, true);
      } catch {
        setSession(null);
      }
    } catch (error) {
      setBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Impossible de vérifier le poste.'
      });
    } finally {
      setInitializing(false);
    }
  }

  async function loadSection(tab: TabId, silent = false) {
    if (!session) return;
    if (!silent) setBusy(true);
    try {
      if (tab === 'dashboard') {
        const data = await api<DashboardResponse>('/api/dashboard');
        setDashboard(data);
        setSettings(normalizeSettings(data.settings));
      } else if (tab === 'history') {
        const data = await api<{ history: HistoryEntry[] }>('/api/history?limit=200');
        setHistory(data.history);
      } else if (tab === 'settings') {
        const data = await api<{ settings: AppSettings }>('/api/settings');
        setSettings(normalizeSettings(data.settings));
      } else if (ENTITY_KINDS.includes(tab as EntityKind)) {
        const kind = tab as EntityKind;
        const data = await api<{ items: Item[] }>(`/api/items/${kind}`);
        setItems(data.items);
        setSearch('');
      } else if (tab === 'ia') {
        const data = await api<{ history: HistoryEntry[] }>('/api/history?limit=20');
        setHistory(data.history);
      }
    } catch (error) {
      setBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Erreur de chargement.'
      });
    } finally {
      if (!silent) setBusy(false);
    }
  }

  function setField<T extends Record<string, string>>(setter: React.Dispatch<React.SetStateAction<T>>) {
    return (field: string, value: string) => {
      setter((prev) => ({ ...prev, [field]: value } as T));
    };
  }

  const updateAuthField = setField(setAuthForm);
  const updateItemField = setField(setItemForm);
  const updateAnalysisField = setField(setAnalysisForm);

  function setSettingsWeight(field: keyof DecisionWeights, value: string) {
    setSettings((prev) => ({
      ...prev,
      decisionWeights: {
        ...prev.decisionWeights,
        [field]: safeNumber(value, prev.decisionWeights[field], 0, 1)
      }
    }));
  }

  function setSettingsUi(field: keyof UiSettings, value: string) {
    setSettings((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        [field]: value as UiSettings[typeof field]
      }
    }));
  }

  function setSettingsAi(field: keyof AiSettings, value: string) {
    setSettings((prev) => ({
      ...prev,
      ai: {
        ...prev.ai,
        [field]: field === 'honorifics' ? value === 'true' : (value as AiSettings[typeof field])
      }
    }));
  }

  async function handleAuthSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const endpoint = bootstrap?.needsBootstrap ? '/api/bootstrap' : '/api/auth/login';
      const payload = bootstrap?.needsBootstrap
        ? {
            accessCode: authForm.accessCode,
            email: authForm.email,
            password: authForm.password,
            workspaceName: authForm.workspaceName,
            displayName: authForm.displayName
          }
        : {
            accessCode: authForm.accessCode,
            email: authForm.email,
            password: authForm.password
          };

      const response = await api<SessionPayload>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSession(response.session);
      setSettings(normalizeSettings(response.settings ?? DEFAULT_SETTINGS));
      setBanner({
        kind: 'success',
        text: response.message ?? 'Accès validé. Poste opérationnel.'
      });
      setAuthForm(EMPTY_AUTH);
      setActiveTab('dashboard');
      await loadSection('dashboard', true);
    } catch (error) {
      setBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Accès refusé.'
      });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch {
      // silencieux
    } finally {
      setBusy(false);
      setSession(null);
      setDashboard(null);
      setItems([]);
      setHistory([]);
      setAnalysisResult(null);
      setItemForm(EMPTY_ITEM_FORM);
      setAnalysisForm(EMPTY_ANALYSIS_FORM);
      setEditingItemId(null);
      setBanner({ kind: 'info', text: 'Déconnexion effectuée.' });
    }
  }

  function openTab(tab: TabId) {
    if (ENTITY_KINDS.includes(tab as EntityKind)) {
      setSelectedKind(tab as EntityKind);
      setEditingItemId(null);
      setItemForm(EMPTY_ITEM_FORM);
    }
    setActiveTab(tab);
  }

  function openEntityForItem(item: Item) {
    setSelectedKind(item.kind);
    setActiveTab(item.kind);
    setEditingItemId(item.id);
    setItemForm({
      title: item.title,
      description: item.description,
      status: item.status,
      priority: String(item.priority),
      urgency: String(item.urgency),
      risk: String(item.risk),
      feasibility: String(item.feasibility),
      cost: String(item.cost),
      impact: String(item.impact),
      flexibility: String(item.flexibility),
      resilience: String(item.resilience),
      horizon: item.horizon,
      dueAt: item.dueAt ?? '',
      parentType: item.parentType ?? '',
      parentId: item.parentId ?? '',
      tags: item.tags.join(', '),
      metaJson: prettyJson(item.meta)
    });
  }

  function resetItemForm(kind: EntityKind = currentEntityKind) {
    setSelectedKind(kind);
    setItemForm(EMPTY_ITEM_FORM);
    setEditingItemId(null);
    setSearch('');
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    const kind = currentEntityKind;
    const title = itemForm.title.trim();
    if (!title) {
      setBanner({ kind: 'error', text: 'Le titre est obligatoire.' });
      return;
    }

    const meta = safeJsonParse(itemForm.metaJson, null);
    if (meta === null) {
      setBanner({ kind: 'error', text: 'Le JSON des métadonnées est invalide.' });
      return;
    }

    const payload = {
      title,
      description: itemForm.description.trim(),
      status: itemForm.status.trim() || 'planned',
      priority: safeInt(itemForm.priority, 50),
      urgency: safeInt(itemForm.urgency, 50),
      risk: safeInt(itemForm.risk, 50),
      feasibility: safeInt(itemForm.feasibility, 50),
      cost: safeInt(itemForm.cost, 50),
      impact: safeInt(itemForm.impact, 50),
      flexibility: safeInt(itemForm.flexibility, 50),
      resilience: safeInt(itemForm.resilience, 50),
      horizon: itemForm.horizon.trim() || 'medium',
      dueAt: itemForm.dueAt.trim(),
      parentType: itemForm.parentType.trim(),
      parentId: itemForm.parentId.trim(),
      tags: splitTags(itemForm.tags),
      meta
    };

    setBusy(true);
    try {
      const endpoint = editingItemId
        ? `/api/items/${kind}/${editingItemId}`
        : `/api/items/${kind}`;
      const method = editingItemId ? 'PUT' : 'POST';
      const data = await api<{ item: Item }>(endpoint, {
        method,
        body: JSON.stringify(payload)
      });

      setBanner({
        kind: 'success',
        text: editingItemId ? 'Élément mis à jour.' : `${ENTITY_LABELS[kind]} créé(e).`
      });

      if (activeTab === kind) {
        setItems((prev) => {
          const next = editingItemId
            ? prev.map((entry) => (entry.id === editingItemId ? data.item : entry))
            : [data.item, ...prev];
          return next;
        });
      }

      if (activeTab === 'dashboard') {
        await loadSection('dashboard', true);
      }

      setItemForm(EMPTY_ITEM_FORM);
      setEditingItemId(null);
    } catch (error) {
      setBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Impossible d’enregistrer.'
      });
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(item: Item) {
    if (!session) return;
    const confirmed = window.confirm(`Supprimer définitivement "${item.title}" ?`);
    if (!confirmed) return;

    setBusy(true);
    try {
      await api<{ ok: boolean }>(`/api/items/${item.kind}/${item.id}`, {
        method: 'DELETE'
      });
      setBanner({ kind: 'success', text: 'Élément supprimé.' });
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      if (editingItemId === item.id) {
        setEditingItemId(null);
        setItemForm(EMPTY_ITEM_FORM);
      }
      if (activeTab === 'dashboard') {
        await loadSection('dashboard', true);
      }
    } catch (error) {
      setBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Suppression impossible.'
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!session) return;
    setBusy(true);
    try {
      const data = await api<{ settings: AppSettings }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSettings(normalizeSettings(data.settings));
      setBanner({ kind: 'success', text: 'Paramètres enregistrés.' });
      if (activeTab === 'dashboard') {
        await loadSection('dashboard', true);
      }
    } catch (error) {
      setBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Échec de sauvegarde.'
      });
    } finally {
      setBusy(false);
    }
  }

    async function runAnalysis(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;
    const payload = {
      title: analysisForm.title.trim(),
      context: analysisForm.context.trim(),
      impact: safeInt(analysisForm.impact, 50),
      cost: safeInt(analysisForm.cost, 50),
      urgency: safeInt(analysisForm.urgency, 50),
      time: safeInt(analysisForm.time, 50),
      risk: safeInt(analysisForm.risk, 50),
      feasibility: safeInt(analysisForm.feasibility, 50),
      flexibility: safeInt(analysisForm.flexibility, 50),
      resilience: safeInt(analysisForm.resilience, 50),
      dependencies: safeInt(analysisForm.dependencies, 50),
      horizon: analysisForm.horizon.trim() || 'medium',
      notes: analysisForm.notes.trim()
    };

    setBusy(true);
    try {
      const result = await api<AnalysisResult>('/api/decision/analyze', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAnalysisResult(result);
      setActiveTab('ia');
      setBanner({ kind: 'success', text: 'Rapport stratégique généré.' });
      await loadSection('dashboard', true);
    } catch (error) {
      setBanner({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Analyse impossible.'
      });
    } finally {
      setBusy(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.status,
        item.horizon,
        item.tags.join(' '),
        item.parentType ?? '',
        item.parentId ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  if (initializing) {
    return (
      <div className="auth-shell">
        <div className="panel auth-card">
          <p className="eyebrow">Azhell Zettour</p>
          <h1>État-Major Personnel</h1>
          <p>Vérification du poste de commandement…</p>
          <div className="loader-row">
            <span className="loader" />
            <span>Synchronisation du théâtre d’opérations</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthGate
        boot={bootstrap}
        form={authForm}
        onFieldChange={updateAuthField}
        onSubmit={handleAuthSubmit}
        busy={busy}
        banner={banner}
      />
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">EM</div>
          <div>
            <p className="eyebrow">Azhell Zettour</p>
            <h1>État-Major</h1>
          </div>
        </div>

        <div className="workspace-card">
          <span className="badge info">Poste actif</span>
          <h2>{session.workspace.title}</h2>
          <p>{session.user.displayName}</p>
          <small>{session.user.email}</small>
        </div>

        <nav className="nav">
          {TAB_ITEMS.map((tab) => {
            const active = activeTab === tab.id;
            const count =
              tab.kind && dashboard?.counts?.[tab.kind]
                ? dashboard.counts[tab.kind]
                : undefined;

            return (
              <button
                key={tab.id}
                type="button"
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => openTab(tab.id)}
              >
                <span>{tab.label}</span>
                {typeof count === 'number' ? <span className="nav-count">{count}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="btn ghost" onClick={logout} disabled={busy}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar panel">
          <div>
            <p className="eyebrow">Poste de commandement</p>
            <h2>{tabTitle(activeTab)}</h2>
            <p className="subtitle">
              {busy
                ? 'Synchronisation en cours…'
                : 'Toujours avec plusieurs coups d’avance, sans bloquer si une donnée manque.'}
            </p>
          </div>
          <div className="topbar-actions">
            <span className="badge neutral">{session.role}</span>
            <span className="badge info">{dashboard?.stats.total ?? 0} éléments</span>
          </div>
        </header>

        <div className="content">
          {banner ? <Banner kind={banner.kind} text={banner.text} /> : null}

          {activeTab === 'dashboard' ? (
            <DashboardPanel
              dashboard={dashboard}
              onOpenTab={openTab}
              onOpenItem={openEntityForItem}
            />
          ) : ENTITY_KINDS.includes(activeTab as EntityKind) ? (
            <EntityPanel
              kind={currentEntityKind}
              items={filteredItems}
              search={search}
              onSearchChange={setSearch}
              form={itemForm}
              onFormChange={updateItemField}
              onSave={saveItem}
              onReset={() => resetItemForm(currentEntityKind)}
              onEdit={openEntityForItem}
              onDelete={deleteItem}
              editingId={editingItemId}
              busy={busy}
              previewScore={itemPreviewScore}
            />
          ) : activeTab === 'history' ? (
            <HistoryPanel history={history} />
          ) : activeTab === 'ia' ? (
            <AnalysisPanel
              form={analysisForm}
              onFormChange={updateAnalysisField}
              onSubmit={runAnalysis}
              result={analysisResult}
              previewScore={analysisPreviewScore}
              honorifics={settings.ai.honorifics}
            />
          ) : (
            <SettingsPanel
              settings={settings}
              onWeightChange={setSettingsWeight}
              onUiChange={setSettingsUi}
              onAiChange={setSettingsAi}
              onSave={saveSettings}
              busy={busy}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function AuthGate({
  boot,
  form,
  onFieldChange,
  onSubmit,
  busy,
  banner
}: {
  boot: BootstrapStatus | null;
  form: AuthFormState;
  onFieldChange: (field: string, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  busy: boolean;
  banner: { kind: 'success' | 'error' | 'info'; text: string } | null;
}) {
  const needsBootstrap = boot?.needsBootstrap ?? false;

  return (
    <div className="auth-shell">
      <div className="panel auth-card">
        <div className="auth-hero">
          <p className="eyebrow">Azhell Zettour</p>
          <h1>État-Major Personnel</h1>
          <p>
            Cockpit mobile d’aide à la décision. Accès préalable obligatoire, puis login protégé.
          </p>
          <div className="chips">
            <span className="badge info">
              {needsBootstrap ? 'Initialisation requise' : 'Accès préalable + login'}
            </span>
            <span className="badge neutral">PWA</span>
            <span className="badge neutral">Cloudflare Workers</span>
          </div>
        </div>

        {banner ? <Banner kind={banner.kind} text={banner.text} /> : null}

        <form className="auth-form" onSubmit={onSubmit}>
          <Field label="Code d'accès préalable" hint="Obligatoire avant toute connexion.">
            <input
              className="input"
              value={form.accessCode}
              onChange={(e) => onFieldChange('accessCode', e.target.value)}
              placeholder="Code d'accès"
              type="password"
              autoComplete="off"
              required
            />
          </Field>

          <Field label="E-mail">
            <input
              className="input"
              value={form.email}
              onChange={(e) => onFieldChange('email', e.target.value)}
              placeholder="commandant@exemple.com"
              type="email"
              autoComplete="username"
              required
            />
          </Field>

          <Field label="Mot de passe">
            <input
              className="input"
              value={form.password}
              onChange={(e) => onFieldChange('password', e.target.value)}
              placeholder="Mot de passe"
              type="password"
              autoComplete={needsBootstrap ? 'new-password' : 'current-password'}
              required
            />
          </Field>

          {needsBootstrap ? (
            <>
              <Field label="Nom du workspace">
                <input
                  className="input"
                  value={form.workspaceName}
                  onChange={(e) => onFieldChange('workspaceName', e.target.value)}
                  placeholder="Quartier général"
                  type="text"
                  required
                />
              </Field>

              <Field label="Nom affiché">
                <input
                  className="input"
                  value={form.displayName}
                  onChange={(e) => onFieldChange('displayName', e.target.value)}
                  placeholder="Commandant"
                  type="text"
                  required
                />
              </Field>
            </>
          ) : null}

          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Traitement…' : needsBootstrap ? 'Créer le poste initial' : 'Entrer au poste'}
          </button>
        </form>
      </div>
    </div>
  );
}
