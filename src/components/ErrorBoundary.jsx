import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--grey-light)',
        }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--white)', marginBottom: 8 }}>
            Page load nahi hua
          </p>
          <p style={{ fontSize: 13, color: 'var(--grey)', marginBottom: 20, maxWidth: 420, margin: '0 auto 20px' }}>
            Saved data corrupt ho sakta hai. Neeche button se dubara try karein.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Page Reload Karein
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
