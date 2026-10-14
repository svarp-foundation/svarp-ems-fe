import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ef4444' }}>
                Unexpected Examination Portal Error
              </h2>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              An interface error occurred. Your examination progress and answers are saved automatically on the server.
            </p>
            {this.state.error && (
              <pre style={{
                backgroundColor: '#090d16',
                border: '1px solid #1e293b',
                color: '#fca5a5',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                overflowX: 'auto',
                marginBottom: '1.5rem'
              }}>
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  backgroundColor: '#334155',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Try to Recover
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
