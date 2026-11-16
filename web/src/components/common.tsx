import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, Star } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Đặt tiêu đề tab trình duyệt (Worker đã chèn SEO cho bot ở bản thật) */
export function useTitle(title?: string) {
  const { site } = useSite();
  const shop = site?.settings.shop_name || 'Sakura Yuki Kimono Rental';
  useEffect(() => { document.title = title ? `${title} | ${shop}` : shop; }, [title, shop]);
}

export function PageHeader({ kicker, title, sub, children }: { kicker?: string; title: string; sub?: string; children?: ReactNode }) {
  useTitle(title);
  return (
    <header className="border-b bg-secondary/60">
      <div className="container-x py-12 text-center md:py-16">
        {kicker && <p className="kicker mb-3">{kicker}</p>}
        <h1 className="text-3xl text-rose md:text-[2.5rem] md:leading-tight">{title}</h1>
        <div className="rule mx-auto mt-5" />
        {sub && <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">{sub}</p>}
        {children}
      </div>
    </header>
  );
}

/** Tiêu đề mục căn giữa, màu hồng đất */
export function SectionTitle({ kicker, title, sub, action, className }: { kicker?: string; title: string; sub?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto mb-10 max-w-2xl text-center md:mb-12', className)}>
      {kicker && <p className="kicker mb-3">{kicker}</p>}
      <h2 className="text-[1.625rem] leading-snug text-rose md:text-[2rem]">{title}</h2>
      <div className="rule mx-auto mt-5" />
      {sub && <p className="mt-5 text-muted-foreground">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ label, className }: { label?: string; className?: string }) {
  const { t } = useI18n();
  return <div role="status" className={cn('flex items-center justify-center gap-2 py-16 text-muted-foreground', className)}><Loader2 className="h-5 w-5 animate-spin" />{label || t('state.loading')}</div>;
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="mx-auto my-12 max-w-md rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertCircle className="mx-auto mb-3 h-6 w-6 text-destructive" />
      <p className="text-sm">{message || t('state.error')}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>{t('state.retry')}</Button>}
    </div>
  );
}

export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return <p className="rounded-md border border-dashed py-12 text-center text-muted-foreground">{children || t('state.empty')}</p>;
}

/** Bọc trang cần dữ liệu website */
export function NeedSite({ children }: { children: ReactNode }) {
  const { site, error, loading, reload } = useSite();
  if (site) return <>{children}</>;
  if (loading) return <Loading />;
  return <ErrorState message={error ? undefined : undefined} onRetry={reload} />;
}

export function Stars({ n }: { n: number }) {
  return <span className="inline-flex gap-0.5 text-gold" aria-label={`${n}/5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn('h-3.5 w-3.5', i < n ? 'fill-current' : 'opacity-30')} />)}</span>;
}

const STATUS_STYLE: Record<string, string> = {
  'Chờ thanh toán': 'bg-warning/10 text-warning border-warning/30',
  'Chờ xác nhận': 'bg-warning/10 text-warning border-warning/30',
  'Đã nhận cọc': 'bg-success/10 text-success border-success/30',
  'Đang phục vụ': 'bg-primary/10 text-primary border-primary/30',
  'Đã hoàn thành': 'bg-muted text-muted-foreground border-border',
  'Đã huỷ': 'bg-destructive/10 text-destructive border-destructive/30'
};
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const { t } = useI18n();
  return <span className={cn('inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium', STATUS_STYLE[status] || 'bg-muted')}>{label || t('st.' + status)}</span>;
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="font-medium text-primary underline-offset-4 hover:underline">{children}</Link>;
}

export const fmtDate = (d: string, lang: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return d || '';
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};
