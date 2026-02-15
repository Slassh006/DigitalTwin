"use client"

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStatusCardProps {
    nodeName: string;
    nodeType: string;
    status: string;
    isTraining?: boolean;
}

export function NetworkStatusCard({
    nodeName,
    nodeType,
    status,
    isTraining = false
}: NetworkStatusCardProps) {
    const getNodeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'imaging':
            case 'clinical':
            case 'pathology':
                return Database;
            default:
                return Activity;
        }
    };

    const Icon = getNodeIcon(nodeType);
    const isHealthy = status === "healthy";

    return (
        <Card className="p-6 card-hover card-glow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isHealthy ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                    )}>
                        <Icon className={cn(
                            "h-5 w-5",
                            isHealthy ? "text-green-600 dark:text-green-400" : "text-gray-400"
                        )} />
                    </div>
                    <div>
                        <h3 className="font-semibold">{nodeName}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{nodeType}</p>
                    </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                    {isHealthy && (
                        <div className="relative">
                            <div className="h-2 w-2 rounded-full bg-green-500 live-pulse"></div>
                        </div>
                    )}
                    <Badge variant={isHealthy ? "success" : "secondary"} className="capitalize">
                        {status}
                    </Badge>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Training</span>
                    <Badge variant={isTraining ? "warning" : "outline"}>
                        {isTraining ? "Active" : "Idle"}
                    </Badge>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data Ready</span>
                    <span className={cn(
                        "font-medium",
                        isHealthy ? "text-green-600 dark:text-green-400" : "text-gray-400"
                    )}>
                        {isHealthy ? "Yes" : "No"}
                    </span>
                </div>
            </div>
        </Card>
    );
}
