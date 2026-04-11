import type { Metadata } from "next";
import { Kanit, Montserrat } from "next/font/google";
import "./globals.css";

const font = Montserrat({
  variable: "--font",
  subsets: ["latin"],
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
      className={`${font.variable} ${font.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
