"use client"

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/mobile-menu";

export function Header() {
    const { theme, setTheme } = useTheme();

    return (
        <header className="h-16 border-b border-border bg-card md:ml-64">
            <div className="h-full px-6 flex items-center justify-between">
                {/* Mobile Menu */}
                <MobileMenu />

                <div className="flex-1"></div>

                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        aria-label="Toggle dark mode"
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
