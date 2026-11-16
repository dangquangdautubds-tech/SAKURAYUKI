import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useSite } from '@/lib/site';
import { Img } from '@/components/Img';
import { Empty, fmtDate, NeedSite, PageHeader } from '@/components/common';

function Inner() {
  const { t, lang } = useI18n(); const { site } = useSite();
  const posts = site!.posts;
  if (!posts.length) return <div className="container-x section"><Empty /></div>;
  const [first, ...rest] = posts;
  return (
    <div className="container-x section pt-10 md:pt-12">
      <Link to={'/blog/' + first.slug} className="group grid gap-6 border-b pb-12 md:grid-cols-[1.3fr_1fr] md:items-center md:gap-10">
        <Img src={first.cover} scene fallbackKey={first.slug} alt={first.title} className="aspect-[16/10] w-full rounded-md" loading="eager" />
        <div>
          <p className="text-xs text-muted-foreground">{fmtDate(first.date, lang)}</p>
          <h2 className="mt-2 text-2xl leading-snug group-hover:text-primary md:text-3xl">{first.title}</h2>
          <p className="mt-4 text-muted-foreground">{first.summary}</p>
          <p className="mt-5 text-sm font-medium text-primary">{t('blog.read')} →</p>
        </div>
      </Link>
      {rest.length > 0 && (
        <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map(p => (
            <Link key={p.id} to={'/blog/' + p.slug} className="group">
              <Img src={p.cover} scene fallbackKey={p.slug} alt={p.title} className="aspect-[4/3] w-full rounded-md" />
              <p className="mt-4 text-xs text-muted-foreground">{fmtDate(p.date, lang)}</p>
              <h3 className="mt-1 font-serif text-lg leading-snug group-hover:text-primary">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
export default function Blog() { const { t } = useI18n(); return <><PageHeader kicker="Journal" title={t('blog.title')} sub={t('blog.sub')} /><NeedSite><Inner /></NeedSite></>; }
