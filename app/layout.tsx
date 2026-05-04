// input: Next metadata and React children; output: root HTML layout; pos: app shell, update this header and app/README.md when changed.
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "DraftRecall",
  description: "草稿唤醒：闹钟质询式知识内化 PWA",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DraftRecall",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#f7f6f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeProvider />
        {children}
        <div className="fixed right-4 top-4 z-40">
          <PwaRegister />
        </div>
      </body>
    </html>
  );
}
