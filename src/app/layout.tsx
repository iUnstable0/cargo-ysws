import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

const milker = localFont({
  src: "./Milker.otf",
  weight: "800",
});

export const metadata: Metadata = {
  title: "Cargo YSWS",
  description: "Cargo YSWS Proposal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${milker.className} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
