import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

// Runs before paint to apply the saved theme and avoid a flash of dark UI.
const themeInitScript = `(function(){try{var t=localStorage.getItem('ht_theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}else{document.documentElement.style.colorScheme='dark';}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "HeliumTrader — AI-Powered Algorithmic Crypto Trading",
  description:
    "Democratizing algorithmic crypto trading. Parameter-tuned strategies, backtesting simulation, paper trading on Sui DeepBook, and AI-powered insights — all on-chain, transparent, and accessible.",
  keywords: [
    "algorithmic trading",
    "crypto trading",
    "DeFi",
    "Sui blockchain",
    "DeepBook",
    "trading bot",
    "backtesting",
    "paper trading",
    "AI trading",
  ],
  openGraph: {
    title: "HeliumTrader — AI-Powered Algorithmic Crypto Trading",
    description:
      "Parameter-tuned trading strategies with simulation, paper trading on Sui, and AI reports.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <div id="app-root">{children}</div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
