import { useI18n } from './i18n';
import { useSite } from './site';
/** Chữ sửa được trong quản trị (Cài đặt → Nội dung trang chủ); để trống thì dùng câu mặc định */
export function useTx() {
  const { t, lang } = useI18n(); const { site } = useSite();
  return (name: string, fallbackKey: string, vars?: Record<string, string | number>) => {
    let s = String(site?.settings['txt_' + name + '_' + lang] || '').trim();
    if (!s) return t(fallbackKey, vars);
    if (vars) for (const [a, b] of Object.entries(vars)) s = s.split('{' + a + '}').join(String(b));
    return s;
  };
}
