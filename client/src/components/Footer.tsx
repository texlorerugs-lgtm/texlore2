import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, Mail, Phone } from 'lucide-react';

export function Footer(): JSX.Element {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-midnight-900 text-ivory">
      <div className="container-lux py-16">
        <div className="grid gap-12 lg:grid-cols-4">
          <div>
            <p className="font-display text-3xl text-gold-500 mb-3">Texlore</p>
            <p className="text-sm text-ivory/70 leading-relaxed max-w-xs">
              Handwoven premium carpets and rugs, delivered across India and
              worldwide. Crafted by master weavers, priced with integrity.
            </p>
          </div>

          <FooterCol title="Shop">
            <FooterLink to="/shop">All rugs</FooterLink>
            <FooterLink to="/category/persian-rugs">Persian</FooterLink>
            <FooterLink to="/category/modern-rugs">Modern</FooterLink>
            <FooterLink to="/category/handmade-rugs">Handmade</FooterLink>
            <FooterLink to="/category/luxury-rugs">Luxury</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink to="/about">About Us</FooterLink>
            <FooterLink to="/#contact">Contact</FooterLink>
            <FooterLink to="/orders">My orders</FooterLink>
            <FooterLink to="/profile">Profile</FooterLink>
          </FooterCol>

          <FooterCol title="Reach us">
            <a
              href="mailto:texlorerug@gmail.com"
              className="flex items-center gap-2 text-sm text-ivory/70 hover:text-gold-500 transition-colors"
            >
              <Mail size={14} /> texlorerug@gmail.com
            </a>
            <a
              href="tel:+910000000000"
              className="flex items-center gap-2 text-sm text-ivory/70 hover:text-gold-500 transition-colors"
            >
              <Phone size={14} /> +91 00000 00000
            </a>
            <div className="flex items-center gap-3 pt-2">
              <SocialLink label="Instagram" href="#">
                <Instagram size={16} />
              </SocialLink>
              <SocialLink label="Facebook" href="#">
                <Facebook size={16} />
              </SocialLink>
              <SocialLink label="YouTube" href="#">
                <Youtube size={16} />
              </SocialLink>
            </div>
          </FooterCol>
        </div>

        <div className="mt-12 pt-6 border-t border-ivory/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ivory/50">
          <span>© {year} Texlore. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <span>Handwoven with care</span>
            <span>Secure payments by Razorpay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <p className="text-xs tracking-[0.3em] text-gold-500 mb-4">{title.toUpperCase()}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Link
      to={to}
      className="block text-sm text-ivory/70 hover:text-gold-500 transition-colors"
    >
      {children}
    </Link>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <a
      href={href}
      aria-label={label}
      className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-ivory/10 text-ivory hover:bg-gold-500 hover:text-midnight-900 transition-colors"
    >
      {children}
    </a>
  );
}
