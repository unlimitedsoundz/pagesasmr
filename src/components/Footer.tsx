import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[#130E14] !text-white pt-16 pb-12 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-3.5">
            <Link href="/" className="inline-block">
              <span className="font-serif text-2xl sm:text-3xl font-medium !text-[#FCD4E5] tracking-tight hover:opacity-90 transition-opacity">
                The Pink Room
              </span>
            </Link>
            <p className="text-xs sm:text-sm leading-relaxed !text-white/80 max-w-sm">
              An independent platform for original, faceless ASMR creators.
            </p>
          </div>

          {/* Platform Col */}
          <div className="md:col-span-2 space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider !text-white">
              PLATFORM
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm !text-white/80">
              <li>
                <Link href="/guidelines" className="hover:!text-white transition-colors">
                  Recording guidelines
                </Link>
              </li>
              <li>
                <Link href="/earnings-and-payments" className="hover:!text-white transition-colors">
                  Earnings & payments
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:!text-white transition-colors">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:!text-white transition-colors">
                  Terms of service
                </Link>
              </li>
            </ul>
          </div>

          {/* Creator Support Col */}
          <div className="md:col-span-3 space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider !text-white">
              CREATOR SUPPORT
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm !text-white/80">
              <li>
                <a
                  href="mailto:notifications@pinkroom.online"
                  className="hover:!text-white transition-colors break-all"
                >
                  notifications@pinkroom.online
                </a>
              </li>
              <li>
                <Link href="/" className="hover:!text-white transition-colors inline-flex items-center gap-1">
                  <span>Visit The Pink Room</span>
                  <span className="text-xs">↗</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Payout Partners Col */}
          <div className="md:col-span-2 space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider !text-white leading-tight">
              PAYOUT<br className="hidden sm:inline" /> PARTNERS
            </h4>
            <div className="flex items-center gap-4 !text-white pt-1">
              {/* PayPal Logo */}
              <svg
                aria-label="PayPal"
                className="h-5 w-5 fill-current !text-white"
                viewBox="0 0 24 24"
              >
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.784.784 0 0 1 .773-.655h7.02c3.483 0 5.86 1.488 5.614 4.887-.291 4.02-3.123 6.068-6.666 6.068h-2.14l-1.4 7.024a.641.641 0 0 1-.633.535l-.436-.242zm2.93-9.524h1.724c2.25 0 3.73-1.037 3.916-3.606.155-2.138-1.125-3.08-3.327-3.08H8.38l-1.927 9.87.525.045 1.028-3.23z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.12] my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs !text-white/70">
          <div>
            © {new Date().getFullYear()} The Pink Room. All rights reserved.
          </div>
          <div>
            Ethical. Non-explicit. Creator-owned.
          </div>
        </div>
      </div>
    </footer>
  );
}
