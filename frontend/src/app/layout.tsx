import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "환경팀 휴무관리",
  description: "환경팀 팀원을 위한 모바일 중심 휴무 관리 시스템",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user')?.value;
  let initialUser = null;
  
  if (userCookie) {
    try {
      initialUser = JSON.parse(userCookie);
    } catch (e) {
      console.error('Failed to parse user cookie', e);
    }
  }

  return (
    <html lang="ko" className="h-screen">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <AuthProvider initialUser={initialUser}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

