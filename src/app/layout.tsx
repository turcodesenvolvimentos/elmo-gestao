import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import "../../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elmo Gestao",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable}  antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
