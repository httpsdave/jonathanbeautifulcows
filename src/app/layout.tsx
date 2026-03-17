import type { Metadata } from "next";
import { Bungee, Caveat_Brush, Saira_Semi_Condensed } from "next/font/google";
import "./globals.css";

const bungee = Bungee({
  variable: "--font-jbc-display",
  weight: "400",
  subsets: ["latin"],
});

const saira = Saira_Semi_Condensed({
  variable: "--font-jbc-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const caveat = Caveat_Brush({
  variable: "--font-jbc-script",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JBC",
  description:
    "JonathanBeautifulCows is a visual archive celebrating cow beauty, personality, symbolism, and field moments.",
  icons: {
    icon: "/milk-box.svg",
    shortcut: "/milk-box.svg",
    apple: "/milk-box.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bungee.variable} ${saira.variable} ${caveat.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
