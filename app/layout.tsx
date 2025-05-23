import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Rubik } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner-toaster";
// Import the client component wrapper for ReloadHandler

// const defaultUrl = process.env.VERCEL_URL
//   ? `https://${process.env.VERCEL_URL}`
//   : "http://localhost:3000";

export const metadata = {
  title: "SayWhat",
};

const rubikFont = Rubik({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rubik",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rubikFont.className} ${rubikFont.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground font-rubik">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
