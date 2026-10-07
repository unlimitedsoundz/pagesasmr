import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Testimonials & Proof of Payout | The Pink Room',
  description:
    'Authentic creator testimonials and verified proof of payout receipts. Read real experiences from active page-turning ASMR creators and see verified earnings.',
  alternates: {
    canonical: '/testimonials',
  },
};

export default function TestimonialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
