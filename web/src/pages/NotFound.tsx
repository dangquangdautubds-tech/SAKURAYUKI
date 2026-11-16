import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useTitle } from '@/components/common';
export default function NotFound() {
  const { t } = useI18n(); useTitle(t('nf.title'));
  return (
    <div className="container-x flex min-h-[55vh] flex-col items-start justify-center py-16">
      <p className="font-serif text-6xl text-primary/30">404</p>
      <h1 className="mt-4 text-3xl">{t('nf.title')}</h1>
      <Button asChild className="mt-8"><Link to="/">{t('nf.back')}</Link></Button>
    </div>
  );
}
