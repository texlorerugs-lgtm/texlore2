import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Award, Ruler, ShieldCheck } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

export default function AboutPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-ivory">
      <div className="container-lux py-10">
        <div className="mb-8">
          <BackButton />
        </div>
      </div>

      <section className="relative overflow-hidden bg-midnight-gradient text-ivory">
        <div className="container-lux py-24 relative">
          <p className="text-xs tracking-[0.3em] text-gold-500 mb-4">ABOUT TEXLORE</p>
          <h1 className="font-display text-4xl sm:text-6xl leading-tight max-w-3xl">
            Rugs made by hand,
            <br />
            sold with integrity.
          </h1>
          <p className="mt-6 max-w-2xl text-ivory/75 text-lg leading-relaxed">
            We founded Texlore to shorten the distance between master weavers in
            India and the homes that love their work — without the tenfold
            markups typical of the retail rug industry.
          </p>
        </div>
      </section>

      <section className="container-lux py-20 grid lg:grid-cols-2 gap-12 items-center">
        <motion.img
          src="https://images.unsplash.com/photo-1618220179428-22790b461013?w=1200&q=80"
          alt="Loom detail"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl shadow-luxury aspect-[4/3] object-cover"
          loading="lazy"
        />
        <div>
          <p className="text-xs tracking-[0.3em] text-gold-600 mb-3">OUR APPROACH</p>
          <h2 className="font-display text-3xl sm:text-4xl text-midnight-900 mb-4">
            One rug at a time.
          </h2>
          <p className="text-charcoal-500 leading-relaxed mb-4">
            Every piece is inspected in person by a member of the Texlore team.
            We reject anything short of our standard — uneven pile, colour
            bleeding, or knot inconsistencies — because our name is on the label.
          </p>
          <p className="text-charcoal-500 leading-relaxed">
            We are a small team. That\u2019s a feature, not a limitation: it means
            you can email us and get a real answer, custom sizes and colours are
            welcome, and commissions get the attention they deserve.
          </p>
        </div>
      </section>

      <section className="bg-pearl border-y border-line">
        <div className="container-lux py-20 grid sm:grid-cols-3 gap-6">
          <Stat
            icon={<Award size={22} />}
            n="30+"
            label="Master weavers we partner with"
          />
          <Stat icon={<Ruler size={22} />} n="120+" label="Custom sizes made this year" />
          <Stat icon={<ShieldCheck size={22} />} n="10 yr" label="Warranty on our luxury silks" />
        </div>
      </section>

      <section className="container-lux py-20 text-center">
        <p className="text-xs tracking-[0.3em] text-gold-600 mb-3">READY WHEN YOU ARE</p>
        <h2 className="font-display text-3xl sm:text-4xl text-midnight-900 mb-6">
          Browse the current collection.
        </h2>
        <Link to="/shop" className="btn-primary">
          Shop all rugs
        </Link>
      </section>
    </main>
  );
}

function Stat({
  icon,
  n,
  label,
}: {
  icon: React.ReactNode;
  n: string;
  label: string;
}): JSX.Element {
  return (
    <div className="card p-8 text-center">
      <div className="w-11 h-11 rounded-full bg-gold-gradient text-midnight-900 inline-flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="font-display text-4xl text-midnight-900">{n}</p>
      <p className="text-sm text-charcoal-400 mt-1">{label}</p>
    </div>
  );
}
