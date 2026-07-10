/**
 * Small SEO helper hook. Updates `<title>`, description meta, canonical link,
 * Open Graph and Twitter card tags whenever the caller's inputs change.
 *
 * Also toggles `<meta name="robots" content="noindex">` for auth / admin /
 * checkout / order routes so private paths are never listed by crawlers.
 *
 * No dependency on react-helmet — this is a plain DOM mutation inside an
 * effect, which is safe in an SPA context.
 */
import { useEffect } from 'react';

export interface HeadOptions {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'product';
  productPrice?: number;
  productCurrency?: string;
}

const BRAND = 'Texlore';
const DEFAULT_TITLE = 'Texlore — Luxury Carpets & Rugs';
const DEFAULT_DESC =
  'Handwoven luxury carpets and rugs, delivered across India and worldwide.';

function upsertMeta(attr: 'name' | 'property', key: string, value?: string | null): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!value) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function upsertLink(rel: string, href?: string | null): void {
  const selector = `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useDocumentHead(opts: HeadOptions): void {
  useEffect(() => {
    const title = opts.title
      ? `${opts.title} · ${BRAND}`
      : DEFAULT_TITLE;
    const desc = opts.description ?? DEFAULT_DESC;
    document.title = title;

    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'robots', opts.noindex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', opts.canonical ?? window.location.href);

    // Open Graph
    upsertMeta('property', 'og:type', opts.type ?? 'website');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:url', opts.canonical ?? window.location.href);
    upsertMeta('property', 'og:image', opts.image ?? '');
    upsertMeta('property', 'og:site_name', BRAND);

    // Twitter
    upsertMeta('name', 'twitter:card', opts.image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', opts.image ?? '');

    // Product-specific OG
    if (opts.type === 'product' && typeof opts.productPrice === 'number') {
      upsertMeta('property', 'product:price:amount', String(opts.productPrice));
      upsertMeta('property', 'product:price:currency', opts.productCurrency ?? 'INR');
    } else {
      upsertMeta('property', 'product:price:amount', '');
      upsertMeta('property', 'product:price:currency', '');
    }
  }, [
    opts.title,
    opts.description,
    opts.canonical,
    opts.image,
    opts.noindex,
    opts.type,
    opts.productPrice,
    opts.productCurrency,
  ]);
}
