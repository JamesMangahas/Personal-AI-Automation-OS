import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "../components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal AI Automation OS",
  description: "Personal command center for tasks, notes, projects, and automations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <NavBar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}