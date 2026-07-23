import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpliitUp — Trip Budget Splitting",
  description:
    "Split trip expenses, track handovers, and settle up smartly. SpliitUp keeps every paisa accounted for.",
  keywords: ["SpliitUp", "trip", "budget", "split", "expenses", "settlement", "handover"],
  authors: [{ name: "SpliitUp" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
