import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "C.RCH - Research Paper Citation Network Explorer",
  description: "Discover connections between academic papers, explore citation networks, and track research trends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F5F1E8] font-sans">
        <AuthProvider>
          <Navigation />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
