import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const font = Montserrat({
  variable: "--font",
  subsets: ["latin"],
});

const myFont = localFont({
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
    <html lang="en" className={`${myFont.className} h-full antialiased`}>
      <body>{children}</body>
    </html>
  );
}
