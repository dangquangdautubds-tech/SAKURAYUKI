import { useI18n } from '@/lib/i18n';
import { branchName, useSite, yen } from '@/lib/site';
import { fmtDate, StatusBadge } from './common';

export type CustomerOrder = { id: string; name: string; date: string; time: string; guests: number; detail?: string; product: string | any; productId?: string; productName?: any; branchId: string; branchName?: any; hair: boolean; deposit: number; status: string };

export function OrderCard({ o, children }: { o: CustomerOrder; children?: React.ReactNode }) {
  const { t, L, lang } = useI18n(); const { site } = useSite();
  const prod = site?.products.find(p => p.id === o.productId);
  const product = prod ? L(prod.name) : typeof o.product === 'object' ? L(o.product) : o.productName ? L(o.productName) : o.product;
  const rows: [string, React.ReactNode][] = [
    [t('c.branch'), branchName(site, o.branchId, lang)], [t('c.datetime'), fmtDate(o.date, lang) + ' · ' + o.time], [t('c.package'), product],
    [t('c.guests'), String(o.guests)], [t('c.hair'), o.hair ? t('c.yes') : t('c.no')], [t('bk.deposit'), yen(o.deposit)]
  ];
  return (
    <div className="rounded-md border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <p className="text-sm"><span className="text-muted-foreground">{t('ok.code')}</span> <span className="font-mono font-semibold tracking-wide">{o.id}</span></p>
        <StatusBadge status={o.status} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-5 py-4 text-sm">
        {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium sm:text-left">{v}</dd></div>)}
      </dl>
      {children && <div className="border-t px-5 py-4">{children}</div>}
    </div>
  );
}
