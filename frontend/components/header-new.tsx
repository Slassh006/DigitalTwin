"use client"

import { Bell, Settings, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Header() {
    const pathname = usePathname()
    return (
        <header className="flex-none flex items-center justify-between border-b border-[#362348] bg-[#1a1122]/90 backdrop-blur-md px-6 py-3 z-50">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
                <div className="size-8 text-accent-cyan animate-pulse">
                    {/* Icon */}
                    <svg className="w-full h-full" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    </svg>
                </div>
                <div className="flex flex-col">
                    <h2 className="text-white text-lg font-display tracking-wider font-bold leading-tight">
                        ENDOTWIN <span className="text-primary font-light">CONSOLE v2.0</span>
                    </h2>
                    <span className="text-[10px] text-gray-400 tracking-[0.2em] uppercase">
                        Physics-Informed Neural Network
                    </span>
                </div>
            </div>

            {/* Navigation */}
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-full border border-white/5">
                {[
                    { name: 'Simulation', path: '/' },
                    { name: 'Training', path: '/training' },
                    { name: 'Analytics', path: '/analytics' },
                    { name: 'Settings', path: '/settings' }
                ].map((item) => {
                    const isActive = pathname === item.path
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                                ? 'bg-primary/20 text-white shadow-neon-primary border border-primary/50'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-3">
                {/* TLS Status */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-success/30 bg-success/10">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-mono text-success uppercase tracking-wider">
                        TLS 1.3 Active
                    </span>
                </div>

                <button className="flex items-center justify-center size-9 rounded-lg hover:bg-[#362348] text-gray-400 hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                </button>

                <button className="flex items-center justify-center size-9 rounded-lg hover:bg-[#362348] text-gray-400 hover:text-white transition-colors">
                    <Settings className="w-5 h-5" />
                </button>

                <div className="h-6 w-px bg-[#362348] mx-1" />

                {/* User Profile */}
                <button className="flex items-center gap-2 pl-2">
                    <div className="size-8 rounded-full bg-gradient-to-tr from-primary to-accent-cyan p-[1px]">
                        <div className="w-full h-full rounded-full bg-[#1a1122] flex items-center justify-center">
                            <User className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                        <span className="text-xs font-bold leading-none">Dr. A. Vance</span>
                        <span className="text-[10px] text-gray-500 leading-none mt-1">Lead Researcher</span>
                    </div>
                </button>
            </div>
        </header>
    )
}
