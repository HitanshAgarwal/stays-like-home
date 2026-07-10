import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, themeInitScript } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stays Like Home",
  description: "Find and book stays that feel like home.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* set the theme class before paint to avoid a flash of the wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink antialiased">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <WishlistProvider>
                <Navbar />
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </WishlistProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-muted">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-ink-soft sm:flex-row sm:px-6 lg:px-10">
        <p>© {new Date().getFullYear()} Stays Like Home</p>
        <p className="text-ink-faint">A demo project · not a real booking service</p>
      </div>
    </footer>
  );
}
