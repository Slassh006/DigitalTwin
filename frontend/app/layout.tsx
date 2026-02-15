import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { ToastProviderWrapper } from "@/components/ui/use-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "EndoTwin AI - Digital Twin of the Uterus",
    description: "Federated learning system for endometriosis prediction using Physics-Informed Neural Networks",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {/* Skip to main content */}
                    <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
                    >
                        Skip to content
                    </a>

                    <ToastProviderWrapper>
                        <div className="flex h-screen overflow-hidden">
                            <Sidebar />
                            <div className="flex flex-col flex-1 overflow-hidden">
                                <Header />
                                <main className="flex-1 overflow-y-auto bg-background p-6 md:ml-64">
                                    {children}
                                </main>
                            </div>
                        </div>
                    </ToastProviderWrapper>
                </ThemeProvider>
            </body>
        </html>
    );
}
