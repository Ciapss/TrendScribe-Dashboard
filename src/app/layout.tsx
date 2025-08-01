import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/components/auth/auth-provider"
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
          <AuthenticatedLayout>
            {children}
          </AuthenticatedLayout>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
