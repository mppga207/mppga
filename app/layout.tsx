import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maine Professional Pet Groomers Association",
  description:
    "The professional home for pet groomers across Maine — membership, education, and a statewide directory.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${newsreader.variable} bg-mppga-page text-mppga-ink font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
