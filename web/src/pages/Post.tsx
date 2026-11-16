import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useSite, type Post as PostT } from '@/lib/site';
import { apiGet } from '@/lib/api';
import { renderMarkdown } from '@/lib/markdown';
import { resolveImg } from '@/lib/img';
import { Img } from '@/components/Img';
import { Button } from '@/components/ui/button';
import { ErrorState, fmtDate, Loading, useTitle } from '@/components/common';
import NotFound from './NotFound';

export default function Post() {
  const { slug = '' } = useParams(); const { t, lang } = useI18n(); const { site } = useSite();
  const [post, setPost] = useState<PostT | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const load = () => {
    setState('loading');
    apiGet<{ post: PostT }>({ action: 'post', slug }).then(r => {
      if (r.ok) { setPost(r.post); setState('ok'); } else setState(r.error === 'not_found' ? 'missing' : 'error');
    }).catch(() => setState('error'));
  };
  useEffect(load, [slug]);
  useTitle(post?.title);
  // ảnh trong bài: chuyển link xem thử (demo.local) → ảnh thật
  const html = useMemo(() => post ? renderMarkdown(post.content || '').replace(/src="(https:\/\/demo\.local\/[^"]+)"/g, (_: string, u: string) => 'src="' + resolveImg(u) + '"') : '', [post]);
  if (state === 'loading') return <Loading className="min-h-[50vh]" />;
  if (state === 'missing') return <NotFound />;
  if (state === 'error' || !post) return <ErrorState onRetry={load} />;
  const url = typeof location !== 'undefined' ? location.href : '';
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: post.title, url }); return; } catch { /* huỷ */ } }
    copy();
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success(t('blog.copied')); } catch { /* */ } };
  const related = (site?.posts || []).filter(p => p.slug !== post.slug).slice(0, 2);
  return (
    <article>
      <header className="container-x max-w-3xl pt-10 md:pt-14">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />{t('blog.back')}</Link>
        <p className="mt-6 text-sm text-muted-foreground">{fmtDate(post.date, lang)}</p>
        <h1 className="mt-2 text-3xl leading-tight md:text-[2.5rem]">{post.title}</h1>
        {post.summary && <p className="mt-4 text-lg text-muted-foreground">{post.summary}</p>}
        <div className="mt-6 flex gap-2">
          <Button variant="outline" size="sm" onClick={share}><Share2 className="h-4 w-4" />{t('blog.share')}</Button>
          <Button variant="ghost" size="sm" onClick={copy}><Copy className="h-4 w-4" />{t('blog.copy')}</Button>
        </div>
      </header>
      {(post.cover) && <div className="container-x mt-8 max-w-4xl"><Img src={post.cover} scene fallbackKey={post.slug} alt={post.title} className="aspect-[16/9] w-full rounded-md" loading="eager" /></div>}
      <div className="container-x max-w-3xl py-10 md:py-14">
        <div className="prose-sy" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-md border bg-secondary/50 p-6">
          <p className="font-serif text-xl">{t('blog.cta')}</p>
          <Button asChild><Link to="/dat-lich">{t('cta.book')}</Link></Button>
        </div>
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-xl">{t('blog.related')}</h2>
            <div className="grid gap-6 sm:grid-cols-2">{related.map(p => (
              <Link key={p.id} to={'/blog/' + p.slug} className="group flex gap-4">
                <Img src={p.cover} scene fallbackKey={p.slug} alt="" className="h-20 w-24 shrink-0 rounded-sm" />
                <div><p className="text-xs text-muted-foreground">{fmtDate(p.date, lang)}</p><p className="font-serif leading-snug group-hover:text-primary">{p.title}</p></div>
              </Link>
            ))}</div>
          </section>
        )}
      </div>
    </article>
  );
}
