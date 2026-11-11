import { Link } from 'react-router';
import { PublicShell } from '../components/Layout';
import { buttonCls, cx } from '../components/ui';

export default function NotFound() {
  return (
    <PublicShell>
      <main id="main" className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="tabular font-display text-5xl font-semibold text-brand-500">404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">This room doesn’t exist</h1>
        <p className="mt-2 text-muted">The page you followed may have moved. Head back and try again.</p>
        <Link to="/" className={cx(buttonCls(), 'mt-6')}>
          Back to home
        </Link>
      </main>
    </PublicShell>
  );
}
