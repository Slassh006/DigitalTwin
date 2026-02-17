"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

// Simple mock implementation of Select components to satisfy build
// For a real app, use @radix-ui/react-select

const SelectContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
    open?: boolean
    setOpen?: (open: boolean) => void
}>({})

const Select = ({ children, value, onValueChange, ...props }: any) => {
    const [open, setOpen] = React.useState(false)
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative" {...props}>{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, any>(
    ({ className, children, ...props }, ref) => {
        const { open, setOpen } = React.useContext(SelectContext)
        return (
            <button
                type="button"
                onClick={() => setOpen?.(!open)}
                className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
        )
    }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<HTMLSpanElement, any>(
    ({ className, ...props }, ref) => {
        const { value } = React.useContext(SelectContext)
        return (
            <span
                ref={ref}
                className={cn("block truncate", className)}
                {...props}
            >
                {value || props.placeholder}
            </span>
        )
    }
)
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<HTMLDivElement, any>(
    ({ className, children, position = "popper", ...props }, ref) => {
        const { open } = React.useContext(SelectContext)
        if (!open) return null

        return (
            <div
                ref={ref}
                className={cn(
                    "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 w-full mt-1",
                    className
                )}
                {...props}
            >
                <div className="p-1">{children}</div>
            </div>
        )
    }
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLDivElement, any>(
    ({ className, children, value, ...props }, ref) => {
        const { onValueChange, setOpen } = React.useContext(SelectContext)
        return (
            <div
                ref={ref}
                className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    className
                )}
                onClick={() => {
                    onValueChange?.(value)
                    setOpen?.(false)
                }}
                {...props}
            >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {/* Check icon could go here */}
                </span>
                <span className="truncate">{children}</span>
            </div>
        )
    }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator }

// Stub components
const SelectGroup = ({ children }: any) => <>{children}</>
const SelectLabel = ({ children }: any) => <div className="px-2 py-1.5 text-sm font-semibold">{children}</div>
const SelectSeparator = () => <div className="-mx-1 my-1 h-px bg-muted" />
