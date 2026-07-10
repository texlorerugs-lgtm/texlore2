import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ProductCardData } from '@/types/catalog';
import { PriceDisplay } from './PriceDisplay';

interface Props {
  product: ProductCardData;
  index?: number;
}

export function ProductCard({ product, index = 0 }: Props): JSX.Element {
  const original = product.discountPercent > 0 ? product.price : undefined;
  const outOfStock = product.status === 'out_of_stock' || product.totalStock <= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link
        to={`/product/${product.slug}`}
        className="block card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-luxury"
      >
        <div className="relative aspect-square overflow-hidden bg-ivory">
          {product.primaryImage ? (
            <img
              src={product.primaryImage}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-out-luxury group-hover:scale-[1.06]"
            />
          ) : (
            <div className="skeleton w-full h-full" />
          )}
          {/* Badges */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3 pointer-events-none">
            <div className="flex flex-col gap-1.5">
              {product.discountPercent > 0 && (
                <span className="rounded-full bg-gold-500 text-midnight-900 text-[10px] font-semibold px-2.5 py-1">
                  −{product.discountPercent}%
                </span>
              )}
              {product.newArrival && (
                <span className="rounded-full bg-emerald-500 text-ivory text-[10px] font-semibold px-2.5 py-1">
                  NEW
                </span>
              )}
            </div>
            {product.bestSeller && (
              <span className="rounded-full bg-midnight-900 text-ivory text-[10px] tracking-widest px-2.5 py-1">
                BESTSELLER
              </span>
            )}
          </div>
          {outOfStock && (
            <div className="absolute inset-0 bg-midnight-900/50 flex items-center justify-center">
              <span className="text-ivory text-xs tracking-widest px-3 py-1 rounded-full bg-midnight-900/70">
                OUT OF STOCK
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg text-midnight-900 leading-tight line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-charcoal-400 mt-1">{product.primarySize}</p>
          <div className="mt-2">
            <PriceDisplay amount={product.netPrice} original={original} size="md" />
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
