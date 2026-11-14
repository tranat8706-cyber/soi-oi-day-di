import type { Metadata, Viewport } from "next";
import { Anton, Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin", "vietnamese"],
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  weight: ["400", "500", "700"],
  subsets: ["latin", "vietnamese"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Sói Ơi Dậy Đi!",
  description: "Trợ lý quản trò Ma Sói — chơi offline, một điện thoại cho cả bàn.",
  appleWebApp: { capable: true, title: "Sói Ơi", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${anton.variable} ${beVietnam.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="film-grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
