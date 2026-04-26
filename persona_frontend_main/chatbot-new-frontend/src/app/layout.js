import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BotProvider } from "@/support/BotContext";
import { UserProvider } from "@/support/UserContext";
import { TraitsProvider } from "@/support/TraitsContext";
import Script from "next/script";
import React from "react";
import GlobalErrorListener from "@/components/GlobalErrorListener";
import ThemeToggleWrapper from "@/components/ThemeToggleWrapper";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Veliora presents VELIORA AI",
  description:
    "Always here to understand you as you are. Always on your side. Join the millions who are growing with AI friends.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 transition-colors duration-200`}
      >
        <ThemeProvider>
          <BotProvider>
            <TraitsProvider>
              <UserProvider>
                <GlobalErrorListener />
                {children}
                <ThemeToggleWrapper />
                <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop={false}
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="colored"
                />
              </UserProvider>
            </TraitsProvider>
          </BotProvider>
        </ThemeProvider>
      </body>
      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=1P8TNHE2QZ"
      ></Script>
      <Script id="gtag">
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-1P8TNHE2QZ');`}
      </Script>
    </html>
  );
}
