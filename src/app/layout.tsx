// import type { Metadata } from "next";
import Footer from "@/app/components/Footer";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "W4VKU Radio Tools",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            style={{ backgroundColor: "var(--background)" }}
        >
        <div className="flex flex-col justify-between min-h-screen">
            <div className="flex-grow flex flex-col justify-center items-center pt-8 lg:pt-0">
                {children}
            </div>
            <Footer />
        </div>
        </body>
        </html>
    );
}

