"use client"

import { useMemo } from "react";

interface DataPanelProps {
    title: string;
    data: Record<string, any>;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    accentColor?: string;
}

export function DataPanel({
    title,
    data,
    position = 'top-right',
    accentColor = '#00d9ff'
}: DataPanelProps) {
    const positionClasses = useMemo(() => {
        switch (position) {
            case 'top-left':
                return 'top-4 left-4';
            case 'top-right':
                return 'top-4 right-4';
            case 'bottom-left':
                return 'bottom-4 left-4';
            case 'bottom-right':
                return 'bottom-4 right-4';
        }
    }, [position]);

    return (
        <div
            className={`absolute ${positionClasses} z-10`}
            style={{
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(10, 14, 39, 0.8)',
                border: `1px solid ${accentColor}`,
                boxShadow: `0 0 20px ${accentColor}40`,
                borderRadius: '8px',
                padding: '16px',
                minWidth: '250px',
                fontFamily: 'monospace'
            }}
        >
            {/* Title */}
            <div
                className="text-sm font-bold mb-3 pb-2"
                style={{
                    color: accentColor,
                    borderBottom: `1px solid ${accentColor}40`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                }}
            >
                {title}
            </div>

            {/* Data rows */}
            <div className="space-y-2">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center text-xs">
                        <span style={{ color: '#a0d9ff' }}>{key}:</span>
                        <span
                            className="font-bold"
                            style={{ color: '#e0f7ff' }}
                        >
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface StiffnessBarProps {
    value: number;
    max?: number;
    label: string;
}

export function StiffnessBar({ value, max = 10, label }: StiffnessBarProps) {
    const percentage = (value / max) * 100;

    const color = value < 2
        ? '#39ff14'  // Green
        : value < 5
            ? '#ffc107'  // Yellow
            : '#ff006e'; // Magenta

    return (
        <div className="mb-2">
            <div className="flex justify-between text-xs mb-1" style={{ color: '#a0d9ff' }}>
                <span>{label}</span>
                <span className="font-bold" style={{ color: '#e0f7ff' }}>{value.toFixed(1)} kPa</span>
            </div>
            <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(0, 217, 255, 0.2)' }}
            >
                <div
                    className="h-full transition-all duration-500"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`
                    }}
                />
            </div>
        </div>
    );
}
