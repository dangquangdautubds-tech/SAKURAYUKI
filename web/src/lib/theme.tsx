import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
const KEY = 'sy_theme';
const read = (): ThemeMode | null => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' || v === 'auto' ? v : null; } catch { return null; } };
const isDark = (m: ThemeMode) => m === 'dark' || (m === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);

type Ctx = { mode: ThemeMode; dark: boolean; toggle: () => void; applyDefault: (m: ThemeMode, allowToggle: boolean) => void; allowToggle: boolean };
const ThemeContext = createContext<Ctx>(null as any);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => read() || 'light');
  const [allowToggle, setAllow] = useState(true);
  const [dark, setDark] = useState(() => isDark(mode));
  useEffect(() => {
    const apply = () => { const d = isDark(mode); setDark(d); document.documentElement.classList.toggle('dark', d); document.querySelector('meta[name="theme-color"]')?.setAttribute('content', d ? '#1B1817' : '#FFFFFF'); };
    apply();
    if (mode !== 'auto') return;
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
  const toggle = useCallback(() => { const next: ThemeMode = isDark(mode) ? 'light' : 'dark'; try { localStorage.setItem(KEY, next); } catch { /* */ } setMode(next); }, [mode]);
  /** Cài đặt từ trang quản trị: chế độ mặc định (khi khách chưa tự chọn) & có cho đổi không */
  const applyDefault = useCallback((m: ThemeMode, allow: boolean) => {
    setAllow(allow);
    if (!allow) setMode(m); else if (!read()) setMode(m);
  }, []);
  return <ThemeContext.Provider value={{ mode, dark, toggle, applyDefault, allowToggle }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
