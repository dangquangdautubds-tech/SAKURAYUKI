import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { apiPost } from '@/lib/api';
import { session } from '@/lib/storage';

type Ctx = { token: string; call: <T = any>(action: string, extra?: Record<string, any>) => Promise<{ ok: boolean; error?: string } & T>; login: (pw: string) => Promise<string>; logout: () => void };
const AdminContext = createContext<Ctx>(null as any);
const KEY = 'sy_admin_token';

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string>(() => session.get(KEY, ''));
  const logout = useCallback(() => { const tk = session.get(KEY, ''); if (tk) apiPost({ action: 'adminLogout', token: tk }); session.del(KEY); setToken(''); }, []);
  const call = useCallback(async (action: string, extra: Record<string, any> = {}) => {
    const r: any = await apiPost({ action, token: session.get(KEY, ''), ...extra }, action === 'uploadImage' ? 90000 : 45000);
    if (r.unauthorized) { session.del(KEY); setToken(''); }
    return r;
  }, []);
  const login = useCallback(async (password: string) => {
    const r: any = await apiPost({ action: 'adminLogin', password });
    if (!r.ok) return r.error || 'Đăng nhập thất bại';
    session.set(KEY, r.token); setToken(r.token); return '';
  }, []);
  return <AdminContext.Provider value={{ token, call, login, logout }}>{children}</AdminContext.Provider>;
}
export const useAdmin = () => useContext(AdminContext);

/** Tải danh sách 1 loại dữ liệu */
export function useList<T = any>(collection: string) {
  const { call } = useAdmin();
  const [items, setItems] = useState<T[] | null>(null); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    const r = await call<{ items: T[] }>('list', { collection });
    if (r.ok) setItems(r.items); else setError(r.error || 'Lỗi tải dữ liệu');
  }, [call, collection]);
  return { items, setItems, error, load };
}
