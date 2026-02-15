"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, FileText, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStatusCardProps {
    nodeName: string;
    nodeType: string;
    status: string;
    isTraining: boolean;
}

export function NetworkStatusCard({ nodeName, nodeType, status, isTraining }: NetworkStatusCardProps) {
    const getIcon = () => {
        switch (nodeType) {
            case "imaging":
                return Brain;
            case "clinical":
                return FileText;
            case "pathology":
                return FlaskConical;
            default:
                return Brain;
        }
    };

    const Icon = getIcon();

    const getStatusColor = () => {
        if (status === "healthy") return "text-green-500";
        if (status === "unhealthy") return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{nodeName}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", isTraining ? "bg-blue-500 live-pulse" : getStatusColor())}></div>
                        <span className="text-xs text-muted-foreground">
                            {isTraining ? "Training..." : status}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Type: {nodeType}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
