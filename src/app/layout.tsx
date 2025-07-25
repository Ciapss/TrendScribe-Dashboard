import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/components/auth/auth-provider"
import { RouteGuard } from "@/components/auth/route-guard"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrendScribe Dashboard",
  description: "AI-powered blog post generation dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <RouteGuard>
            <AuthenticatedLayout>
              {children}
            </AuthenticatedLayout>
          </RouteGuard>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
