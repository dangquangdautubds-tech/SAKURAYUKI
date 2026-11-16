/**
 * Các khối lặp lại ở mọi trang con, để cả website có cùng một nhịp:
 *   PageHero  → nội dung riêng của trang →  PageTail (mini hỏi đáp + cẩm nang + CTA cuối)
 * Mọi chữ đều lấy từ Cài đặt (txt_*) nếu quản trị đã điền, không thì dùng câu mặc định.
 */
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { useTx } from '@/lib/tx';
import { Button } from '@/components/ui/button';
import { useTitle } from '@/components/common';
import { cn } from '@/lib/utils';

export const outlineBtn = 'border-rose text-primary hover:bg-accent hover:text-primary';

/** Tách ô cài đặt nhiều dòng thành danh sách; dòng có dấu | tách thành [tiêu đề, nội dung] */
export const lines = (s: string) => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
export const pairs = (s: string) => lines(s).map(l => {
  const i = l.indexOf('|');
  return i < 0 ? { t: l, d: '' } : { t: l.slice(0, i).trim(), d: l.slice(i + 1).trim() };
});

/* ------------------------------- ĐẦU TRANG ------------------------------- */

type Cta = { to?: string; href?: string; label: string };

/** Đầu trang: dòng chữ nhỏ + tiêu đề + mô tả + tối đa 2 nút */
export function PageHero({ kicker, title, sub, primary, secondary, children }: {
  kicker?: string; title: string; sub?: string; primary?: Cta; secondary?: Cta; children?: ReactNode;
}) {
  useTitle(title);
  const btn = (c: Cta, variant: 'primary' | 'outline') => {
    const cls = variant === 'outline' ? outlineBtn : '';
    const inner = <>{c.label}{variant === 'primary' && <ArrowRight className="h-4 w-4" />}</>;
    return (
      <Button asChild variant={variant === 'outline' ? 'outline' : 'default'} className={cls}>
        {c.to ? <Link to={c.to}>{inner}</Link> : <a href={c.href} target="_blank" rel="noopener noreferrer">{inner}</a>}
      </Button>
    );
  };
  return (
    <header className="border-b bg-secondary/60">
      <div className="container-x py-12 text-center md:py-16">
        {kicker && <p className="kicker mb-3">{kicker}</p>}
        <h1 className="text-3xl text-rose md:text-[2.5rem] md:leading-tight">{title}</h1>
        <div className="rule mx-auto mt-5" />
        {sub && <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">{sub}</p>}
        {(primary || secondary) && (
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {secondary && btn(secondary, 'outline')}
            {primary && btn(primary, 'primary')}
          </div>
        )}
        {children}
      </div>
    </header>
  );
}

/** Đoạn giới thiệu đầu trang: một đoạn văn + vài link liên quan */
export function IntroBlock({ text, links }: { text: string; links?: [string, string][] }) {
  if (!text && !links?.length) return null;
  return (
    <section className="container-x max-w-3xl pt-10 md:pt-14">
      {text && <p className="whitespace-pre-line text-center leading-relaxed text-foreground/85">{text}</p>}
      {links && links.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          {links.map(([to, label]) => (
            <Link key={to} to={to} className="border-b border-rose pb-0.5 text-primary hover:text-rose">{label} →</Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** Dãy link nhảy tới từng mục trong trang */
export function JumpLinks({ items, label }: { items: { id: string; label: string }[]; label: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={label} className="container-x pt-8 md:pt-12">
      <p className="kicker mb-3 text-center">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {items.map(i => (
          <a key={i.id} href={'#' + i.id}
            className="rounded-full border bg-card px-4 py-1.5 text-sm transition-colors hover:border-primary hover:text-primary">{i.label}</a>
        ))}
      </div>
    </nav>
  );
}

/** Dải "giá đã gồm": các ý ngắn có dấu tích */
export function ValueStrip({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="border-y bg-secondary/40">
      <ul className="container-x grid gap-3 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {items.map(x => (
          <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-rose" /><span>{x}</span></li>
        ))}
      </ul>
    </div>
  );
}

/** Danh sách "tiêu đề + nội dung": dùng cho cách chọn kimono, chính sách, quy trình */
export function TitleTextList({ items, columns = 2, numbered, className }: {
  items: { t: string; d: string }[]; columns?: 1 | 2 | 3; numbered?: boolean; className?: string;
}) {
  if (!items.length) return null;
  const grid = columns === 1 ? '' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
  const Tag = numbered ? 'ol' : 'ul';
  return (
    <Tag className={cn('grid gap-x-8 gap-y-6', grid, className)}>
      {items.map((x, i) => (
        <li key={x.t + i} className={numbered ? 'border-t border-gold pt-4' : ''}>
          {numbered && <span className="font-serif text-2xl text-rose">0{i + 1}</span>}
          <h3 className={cn('text-lg', numbered && 'mt-2')}>{x.t}</h3>
          {x.d && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{x.d}</p>}
        </li>
      ))}
    </Tag>
  );
}

/** Lưới ô chính sách có viền */
export function PolicyPanels({ items }: { items: { t: string; d: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((x, i) => (
        <section key={x.t + i} className="rounded-2xl border bg-card p-5">
          <h3 className="text-base text-rose">{x.t}</h3>
          {x.d && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{x.d}</p>}
        </section>
      ))}
    </div>
  );
}

/* ------------------------------- CUỐI TRANG ------------------------------ */

/** Vài câu hỏi hay gặp + link sang trang Hỏi đáp đầy đủ */
export function MiniFaq({ limit = 3, group }: { limit?: number; group?: string }) {
  const { t, L } = useI18n(); const { site } = useSite();
  const all = site?.faqs || [];
  const list = (group ? all.filter(f => L(f.group) === group || f.group.vi === group) : all).slice(0, limit);
  if (!list.length) return null;
  return (
    <section className="section bg-secondary/60">
      <div className="container-x max-w-3xl">
        <h2 className="text-center text-2xl text-rose">{t('faqh.title')}</h2>
        <div className="rule mx-auto mt-5" />
        <dl className="mt-8 space-y-6">
          {list.map(f => (
            <div key={f.id} className="border-t pt-5 first:border-0 first:pt-0">
              <dt className="font-serif text-base">{L(f.q)}</dt>
              <dd className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{L(f.a)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-center text-sm">
          <Link to="/hoi-dap" className="border-b border-rose pb-0.5 text-primary">{t('faqh.all')} →</Link>
        </p>
      </div>
    </section>
  );
}

/** Danh sách bài cẩm nang */
export function GuideLinks({ limit = 4 }: { limit?: number }) {
  const { t } = useI18n(); const { site } = useSite();
  const posts = (site?.posts || []).slice(0, limit);
  if (!posts.length) return null;
  return (
    <section className="section">
      <div className="container-x">
        <h2 className="text-2xl text-rose">{t('guide.title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('guide.sub')}</p>
        <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map(p => (
            <Link key={p.id} to={'/blog/' + p.slug} className="border-t-2 border-gold pt-4 font-medium leading-snug hover:text-primary">{p.title}</Link>
          ))}
        </div>
        <p className="mt-8 text-sm"><Link to="/blog" className="border-b border-rose pb-0.5 text-primary">{t('guide.all')} →</Link></p>
      </div>
    </section>
  );
}

/** Băng kêu gọi đặt lịch cuối trang */
export function ClosingCta() {
  const { t } = useI18n(); const tx = useTx();
  return (
    <section className="border-t py-16 text-center md:py-20">
      <div className="container-x">
        <h2 className="text-[1.625rem] text-rose md:text-[2rem]">{tx('cta_title', 'cta.title')}</h2>
        <p className="mt-4 font-serif text-muted-foreground">{tx('cta_sub', 'cta.sub')}</p>
        <Button asChild size="lg" className="mt-7 h-14 px-9 font-serif text-base shadow-soft">
          <Link to="/dat-lich">{t('cta.final')}</Link>
        </Button>
      </div>
    </section>
  );
}

/** Ba khối cuối trang dùng chung cho mọi trang con */
export function PageTail({ faqLimit, faqGroup, noFaq }: { faqLimit?: number; faqGroup?: string; noFaq?: boolean }) {
  return (
    <>
      {!noFaq && <MiniFaq limit={faqLimit} group={faqGroup} />}
      <GuideLinks />
      <ClosingCta />
    </>
  );
}
