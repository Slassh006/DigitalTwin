"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Brain, Layout, Activity, Settings } from "lucide-react";

const navigation = [
    {
        name: "Dashboard",
        href: "/",
        icon: Layout,
    },
    {
        name: "Simulation",
        href: "/simulation",
        icon: Brain,
    },
    {
        name: "Analytics",
        href: "/analytics",
        icon: Activity,
    },
    {
        name: "Settings",
        href: "/settings",
        icon: Settings,
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
            <div className="flex flex-col flex-grow border-r border-border bg-card overflow-y-auto">
                {/* Logo */}
                <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-border">
                    <Brain className="h-8 w-8 text-primary" />
                    <span className="ml-3 text-xl font-bold">EndoTwin AI</span>
                </div>

                {/* Navigation */}
                <div className="mt-5 flex-1 flex flex-col px-3">
                    <nav className="flex-1 space-y-1" aria-label="Main navigation">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={cn(
                                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                        isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <item.icon
                                        aria-hidden="true"
                                        className={cn(
                                            "mr-3 flex-shrink-0 h-5 w-5",
                                            isActive ? "text-primary-foreground" : "text-muted-foreground"
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex border-t border-border p-4">
                    <div className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 live-pulse mr-2"></div>
                        <p className="text-xs text-muted-foreground">
                            Backend Connected
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
