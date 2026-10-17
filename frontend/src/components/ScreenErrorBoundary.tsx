import React from 'react';

interface Props {
  children: React.ReactNode;
  onHome: () => void;
}

/**
 * Keeps one broken screen from blanking the whole app: shows a message with a way back instead.
 * App keys it by screen, so moving to another screen starts fresh.
 */
export class ScreenErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ShieldIQ] Screen failed to render', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
        <h2 className="text-2xl font-black text-foreground">This screen couldn't load</h2>
        <p className="text-sm text-muted-foreground">
          Something went wrong while showing it. Reload the page, or go back to the dashboard. If it keeps happening, the app and
          server may be on different versions.
        </p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-md border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
            Reload
          </button>
          <button type="button" onClick={this.props.onHome} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
}
