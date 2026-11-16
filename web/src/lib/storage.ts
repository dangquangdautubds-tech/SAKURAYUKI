/** localStorage/sessionStorage an toàn (có thể bị chặn trong một số trình duyệt) */
const wrap = (get: () => Storage) => ({
  get<T = any>(k: string, d: T): T { try { const v = get().getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k: string, v: any) { try { get().setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
  del(k: string) { try { get().removeItem(k); } catch { /* bỏ qua */ } }
});
export const local = wrap(() => localStorage);
export const session = wrap(() => sessionStorage);
