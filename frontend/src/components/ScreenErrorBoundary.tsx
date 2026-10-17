import React from 'react';
import { useI18n } from '@/lib/i18n';

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
    return <ScreenFailed onHome={this.props.onHome} />;
  }
}

/** The fallback itself is a function component so it can use the language hook. */
export const ScreenFailed: React.FC<{ onHome: () => void }> = ({ onHome }) => {
  const { t } = useI18n();
  return (
      <div role="alert" className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
        <h2 className="text-2xl font-black text-foreground">{t('error.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('error.body')}
        </p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-md border border-border px-4 py-2 text-sm font-bold hover:bg-muted">
            {t('error.reload')}
          </button>
          <button type="button" onClick={onHome} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            {t('error.home')}
          </button>
        </div>
      </div>
  );
};
