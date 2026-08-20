import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import RegisterSW from "@/components/RegisterSW";
import InstallPWA from "@/components/InstallPWA";

const fontSans = FontSans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "JarBees",
  description: "Asistente conversacional con IA",
  manifest: `${BASE_PATH}/manifest.json`,
  icons: {
    icon: `${BASE_PATH}/JarBees_logo.png`,
    apple: `${BASE_PATH}/JarBees_logo.png`,
  },
  themeColor: '#06b6d4',
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JarBees",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        {children}
        <RegisterSW />
        <InstallPWA />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var swPath = '${BASE_PATH}/sw.js';
                  navigator.serviceWorker.register(swPath, { 
                    scope: '${BASE_PATH}/' 
                  }).catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
