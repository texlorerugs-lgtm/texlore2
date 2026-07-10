import { Link } from 'react-router-dom';

export default function NotFoundPage(): JSX.Element {
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-ivory">
      <div className="text-center px-6">
        <p className="text-xs tracking-[0.3em] text-gold-600 mb-3">ERROR 404</p>
        <h1 className="font-display text-6xl sm:text-8xl text-midnight-900 mb-4">
          Lost the thread.
        </h1>
        <p className="text-charcoal-400 max-w-md mx-auto mb-8">
          We can\u2019t find the page you\u2019re looking for. It may have moved
          or never existed.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="btn-primary">
            Return home
          </Link>
          <Link to="/shop" className="btn-ghost">
            Shop the collection
          </Link>
        </div>
      </div>
    </main>
  );
}
