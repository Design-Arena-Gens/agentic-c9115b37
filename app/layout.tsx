import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agentic ML Pine Script Indicator Builder',
  description:
    'Generate a non-repainting machine learning indicator for TradingView with adjustable parameters and code exports.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
