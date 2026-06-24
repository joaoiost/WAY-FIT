import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-page)', gap: 16, padding: 24, textAlign: 'center',
      }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={30} color="var(--red)" />
        </div>
        <div>
          <h2 style={{ color: 'var(--gray-900)', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Algo deu errado</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: 14, margin: '0 0 24px', maxWidth: 320 }}>
            Ocorreu um erro inesperado. Tente recarregar a página — seus dados estão salvos.
          </p>
        </div>
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
        >
          <RefreshCw size={16} /> Recarregar
        </button>
        {import.meta.env.DEV && this.state.error && (
          <pre style={{ marginTop: 16, fontSize: 11, color: 'var(--gray-400)', background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 8, maxWidth: 480, overflow: 'auto', textAlign: 'left' }}>
            {this.state.error.toString()}
          </pre>
        )}
      </div>
    );
  }
}
