import React from 'react';

class ReactErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#e5eefc' }}>
          <h1>État‑Major Personnel — Erreur</h1>
          <p>Une erreur est survenue lors du rendu de l'application. Voir la console pour les détails.</p>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#fda4af' }}>{String(this.state.error)}</pre>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default function App(): JSX.Element {
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    document.title = 'État‑Major Personnel';
  }, []);

  async function checkApi() {
    try {
      const res = await fetch('/api/bootstrap/status');
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setStatus(JSON.stringify(json, null, 2));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <React.StrictMode>
      <ReactErrorBoundary>
        <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif', color: '#e5eefc' }}>
          <h1>État‑Major Personnel</h1>
          <p>Interface minimale pour vérifier que l'application s'affiche correctement.</p>
          <div style={{ marginTop: 16 }}>
            <button onClick={checkApi} style={{ padding: '8px 12px', borderRadius: 8 }}>
              Vérifier l'API
            </button>
          </div>

          {status ? (
            <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', color: '#94a3b8' }}>{status}</pre>
          ) : null}

          <p style={{ marginTop: 20, color: '#94a3b8' }}>
            Si cette page apparaît, le client React est correctement servi. Je peux aussi simplifier le
            worker ou d'autres parties si tu veux que je continue.
          </p>
        </div>
      </ReactErrorBoundary>
    </React.StrictMode>
  );
}
