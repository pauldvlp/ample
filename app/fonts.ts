import {
  Fraunces,
  Geist,
  Geist_Mono,
  Onest,
  Outfit,
  Inter,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from 'next/font/google';

/** Signature editorial serif — carries hero figures and headings. */
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

/** Default UI / body font. */
export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

/** Ledger figures — transaction amounts, tickers, tabular columns. */
export const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

/* ---- selectable UI fonts (Settings → Appearance) ---- */
export const onest = Onest({ subsets: ['latin'], variable: '--font-onest', display: 'swap' });
export const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

export const fontVariables = [
  fraunces.variable,
  geist.variable,
  geistMono.variable,
  onest.variable,
  outfit.variable,
  inter.variable,
  jakarta.variable,
  spaceGrotesk.variable,
].join(' ');
