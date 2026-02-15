"use client"

import * as React from "react"

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "@/components/ui/toast"

const ToastContext = React.createContext<{
    toast: (props: any) => void;
    toasts: any[];
} | null>(null);

export function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<any[]>([]);

    const toast = React.useCallback(({ title, description, variant }: any) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { title, description, variant, id }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = React.useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast, toasts }}>
            <ToastProvider>
                {children}
                <ToastViewport>
                    {toasts.map(({ id, title, description, variant, ...props }: any) => (
                        <Toast key={id} variant={variant} {...props}>
                            <div className="grid gap-1">
                                {title && <ToastTitle>{title}</ToastTitle>}
                                {description && <ToastDescription>{description}</ToastDescription>}
                            </div>
                            <ToastClose onClick={() => removeToast(id)} />
                        </Toast>
                    ))}
                </ToastViewport>
            </ToastProvider>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProviderWrapper');
    }
    return context;
};

