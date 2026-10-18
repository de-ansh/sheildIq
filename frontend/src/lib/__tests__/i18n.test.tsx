import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { en } from '@/locales/en';
import { hi } from '@/locales/hi';
import { LanguageProvider } from '../i18n';
import { localizeInsight, LOCALIZED_INSIGHT_CODES } from '../insights';
import { AppContextProvider } from '../AppContext';
import { LoginView } from '@/screens/LoginView';
import { mockApi } from '@/test/mockApi';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('Hindi dictionary', () => {
  it('keeps every {placeholder} of the English text, and nothing is left empty', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(hi[key].trim(), key).not.toBe('');
      expect(placeholders(hi[key]), key).toEqual(placeholders(en[key]));
    }
  });

  it('is actually Hindi (Devanagari) for ordinary sentences', () => {
    const latinOnly = (Object.keys(en) as (keyof typeof en)[])
      .filter(k => en[k].split(' ').length > 3 && !/[ऀ-ॿ]/.test(hi[k]));
    expect(latinOnly).toEqual([]);
  });
});

describe('Key Findings in Hindi', () => {
  it('renders each finding from its values and falls back to English for unknown codes', () => {
    const life = localizeInsight(
      { code: 'life_gap', params: { gap: '₹2.58 Cr', need: '₹4.08 Cr', incomeReplacement: '₹3.43 Cr', partner: 0, loans: '₹50.0L', education: '₹25.0L', savings: '', held: '₹1.50 Cr', premium: '₹47,800' }, title: 'Life cover gap of ₹2.58 Cr', detail: 'x' },
      'hi'
    );
    expect(life.title).toBe('जीवन बीमा में ₹2.58 Cr की कमी');
    expect(life.detail).toContain('₹47,800');
    expect(life.detail).not.toContain('बचत घटाकर'); // no savings, so no savings clause
    expect(localizeInsight({ code: 'something_new', title: 'English title', detail: 'English detail' }, 'hi')).toEqual({ title: 'English title', detail: 'English detail' });
    expect(localizeInsight({ code: 'life_gap', title: 'English title', detail: 'English detail' }, 'en').title).toBe('English title');
    expect(LOCALIZED_INSIGHT_CODES).toHaveLength(17);
  });
});

describe('switching language', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('shows the sign-in screen in Hindi, sets lang="hi", remembers the choice and translates server errors', async () => {
    mockApi({
      '/health': { status: 'UP' },
      '/auth/login': () => new Response(JSON.stringify({ success: false, error: 'Invalid email or password' }), { status: 401 }),
    });
    render(<LanguageProvider><AppContextProvider><LoginView /></AppContextProvider></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'हिंदी' }));

    expect(screen.getByRole('button', { name: 'साइन इन' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('hi');
    expect(localStorage.getItem('shieldiq-lang')).toBe('hi');

    fireEvent.change(screen.getByLabelText('ईमेल पता'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('पासवर्ड'), { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'साइन इन' }));
    expect(await screen.findByText('ईमेल या पासवर्ड गलत है')).toBeInTheDocument();
  });
});
