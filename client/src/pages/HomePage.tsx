import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Award, Ruler, Truck, ShieldCheck } from 'lucide-react';
import { catalogApi } from '@/services/catalog.service';
import type { CategoryPublic, ProductCardData } from '@/types/catalog';
import { ProductCard } from '@/components/ProductCard';
import { ContactSection } from '@/components/ContactSection';
import { useDocumentHead } from '@/hooks/useDocumentHead';

/**
 * Real Home page.
 * Sections (in exact spec order, Part 2):
 *   1. Hero
 *   2. Featured Categories
 *   3. Why Choose Texlore
 *   4. Featured Products
 *   5. About Texlore
 *   6. Get In Touch (ContactSection)
 *   (7. Footer — rendered by PublicLayout)
 */
export default function HomePage(): JSX.Element {
  const [categories, setCategories] = useState<CategoryPublic[]>([]);
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentHead({
    title: 'Handwoven Luxury Rugs',
    description:
      'Premium hand-knotted Persian, modern, handmade and luxury rugs. Delivered across India and worldwide.',
    type: 'website',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ categories: cats }, page] = await Promise.all([
          catalogApi.listCategories(),
          // Use the server-side default sort (createdAt desc). We used to pass
          // a multi-field sort here but some proxy/security layers reject the
          // literal comma+colon in the query string.
          catalogApi.listProducts({ limit: 8 }),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setFeatured(page.items);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <Hero />
      <Categories loading={loading} categories={categories} />
      <WhyTexlore />
      <FeaturedProducts loading={loading} products={featured} />
      <AboutTexlore />
      <ContactSection />
    </main>
  );
}

/* ---------- HERO ---------- */
function Hero(): JSX.Element {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-midnight-gradient" />
      <img
        src="https://res.cloudinary.com/qm4luh6g/image/upload/f_auto,q_auto/v1783590963/ChatGPT_Image_Jul_9_2026_03_04_41_PM_wa5r47.png" 
        alt="Home page image" 
        loading="eager" 
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(212,175,55,0.35), transparent 40%), radial-gradient(circle at 85% 70%, rgba(31,122,77,0.28), transparent 45%)',
        }}
      />
      <div className="container-lux relative text-ivory pt-20 pb-16 sm:pt-32 sm:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="tracking-[0.35em] text-gold-500 text-xs sm:text-sm mb-6"
        >
          HANDWOVEN LUXURY • SINCE 2025
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[1.05] max-w-4xl"
        >
          Rugs that tell
          <br />
          a <span className="text-gold-500">timeless</span> story.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-xl text-ivory/80 text-lg leading-relaxed"
        >
          Hand-knotted Persian classics, contemporary minimalism, custom weaves —
          sourced from master ateliers across India, delivered worldwide.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-col sm:flex-row gap-3"
        >
          <Link to="/shop" className="btn-gold">
            Shop the collection <ArrowRight size={16} />
          </Link>
          <Link
            to="#featured-categories"
            className="btn-ghost !text-ivory !border-ivory/30 hover:!bg-ivory/10"
          >
            Explore categories
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- CATEGORIES ---------- */
function Categories({
  loading,
  categories,
}: {
  loading: boolean;
  categories: CategoryPublic[];
}): JSX.Element {
  return (
    <section id="featured-categories" className="container-lux py-24">
      <SectionHead
        eyebrow="EXPLORE"
        title="Featured Categories"
        subtitle="Browse a curated selection of styles, materials, and origins."
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-[4/5]" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-center text-charcoal-400">
          No categories yet — run <code>npm run seed</code> on the server.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((c, i) => (
            <motion.article
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: i * 0.06 }}
            >
              <Link
                to={`/category/${c.slug}`}
                className="group block card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-luxury"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
                  <img
                    src={c.image.url}
                    alt={c.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[900ms] ease-out-luxury group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight-900/70 via-midnight-900/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-ivory">
                    <p className="text-[10px] tracking-[0.3em] text-gold-300 mb-1">
                      {c.productCount} PIECES
                    </p>
                    <h3 className="font-display text-2xl">{c.name}</h3>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- WHY TEXLORE ---------- */
function WhyTexlore(): JSX.Element {
  const items = [
    {
      icon: <Award size={22} />,
      title: 'Master craftsmanship',
      copy: 'Every rug is hand-knotted or hand-tufted by trained weavers with decades of experience.',
    },
    {
      icon: <Ruler size={22} />,
      title: 'Custom sizing',
      copy: 'Almost every piece can be woven to your exact dimensions — reach out for a quote.',
    },
    {
      icon: <Truck size={22} />,
      title: 'Worldwide delivery',
      copy: 'Free shipping across India above ₹25,000. International delivery in 15–20 days.',
    },
    {
      icon: <ShieldCheck size={22} />,
      title: 'Weave warranty',
      copy: 'Up to 10 years on our luxury silk and wool-silk pieces.',
    },
  ];
  return (
    <section className="bg-pearl border-y border-line">
      <div className="container-lux py-20">
        <SectionHead
          eyebrow="WHY TEXLORE"
          title="Built for the details"
          subtitle="Small studio, high standards. What sets our rugs apart:"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="card p-6"
            >
              <div className="w-11 h-11 rounded-full bg-gold-gradient text-midnight-900 inline-flex items-center justify-center mb-4">
                {it.icon}
              </div>
              <h3 className="font-display text-xl text-midnight-900 mb-1">
                {it.title}
              </h3>
              <p className="text-sm text-charcoal-400 leading-relaxed">{it.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FEATURED PRODUCTS ---------- */
function FeaturedProducts({
  loading,
  products,
}: {
  loading: boolean;
  products: ProductCardData[];
}): JSX.Element {
  return (
    <section className="container-lux py-24">
      <SectionHead
        eyebrow="FRESH ARRIVALS"
        title="Featured Products"
        subtitle="Recently woven, ready to ship."
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-square" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-center text-charcoal-400">No products yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/shop" className="btn-primary">
              View all rugs <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- ABOUT ---------- */
function AboutTexlore(): JSX.Element {
  return (
    <section className="bg-pearl border-y border-line">
      <div className="container-lux py-24 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-luxury">
            <img
              src="https://res.cloudinary.com/qm4luh6g/image/upload/v1783593950/ChatGPT_Image_Jul_9_2026_04_15_15_PM_ankwix.png"
              alt="A weaver at work"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -right-6 rounded-2xl bg-midnight-900 text-ivory p-6 shadow-luxury hidden sm:block">
            <p className="font-display text-3xl text-gold-500">30+</p>
            <p className="text-xs tracking-widest text-ivory/70">MASTER WEAVERS</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs tracking-[0.3em] text-gold-600 mb-3">ABOUT TEXLORE</p>
          <h2 className="font-display text-4xl sm:text-5xl text-midnight-900 leading-tight mb-6">
            A small studio, obsessed with the weave.
          </h2>
          <p className="text-charcoal-500 leading-relaxed mb-4">
            Texlore was founded to bring authentic hand-knotted and hand-tufted rugs
            directly from Indian ateliers to homes worldwide — without the tenfold
            retail markup. Every piece is inspected in person, priced honestly, and
            shipped in premium packaging.
          </p>
          <p className="text-charcoal-500 leading-relaxed mb-8">
            We work with master weavers in Bhadohi, Warangal, Kashmir, and
            Rajasthan. Custom sizes, custom colours, and heirloom-grade silk
            commissions are always welcome.
          </p>
          <Link to="/about" className="btn-primary">
            Learn more about us <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- shared ---------- */
function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}): JSX.Element {
  return (
    <div className="mb-12 text-center">
      <p className="text-xs tracking-[0.3em] text-gold-600 mb-3">{eyebrow}</p>
      <h2 className="font-display text-4xl sm:text-5xl text-midnight-900">{title}</h2>
      {subtitle && (
        <p className="mt-3 text-charcoal-400 max-w-xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
}
