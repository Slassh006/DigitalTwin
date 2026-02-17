"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue'> {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, min, max, step, value, defaultValue, onValueChange, ...props }, ref) => {
        const val = Array.isArray(value) ? value[0] : (defaultValue?.[0]) || 0

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (onValueChange) {
                onValueChange([parseFloat(e.target.value)])
            }
        }

        return (
            <input
                type="range"
                className={cn(
                    "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
                    className
                )}
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={handleChange}
                ref={ref}
                {...props}
            />
        )
    })
Slider.displayName = "Slider"

export { Slider }
