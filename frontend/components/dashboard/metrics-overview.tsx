"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Target } from "lucide-react";
import { getStats, StatsResponse } from "@/lib/api";

export function MetricsOverview() {
    const [stats, setStats] = useState<StatsResponse | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load stats:", error);
            }
        };

        loadStats();
        // Poll every 5 seconds
        const interval = setInterval(loadStats, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Active Nodes */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats?.active_nodes || "Loading..."}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stats && stats.active_nodes_count === stats.total_nodes
                            ? "All federated nodes online"
                            : "Some nodes offline"}
                    </p>
                </CardContent>
            </Card>

            {/* Predictions Made */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Predictions Made</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats?.predictions_made !== undefined ? stats.predictions_made : "--"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stats?.predictions_made === 0
                            ? "Run simulation to start"
                            : `Total predictions since startup`}
                    </p>
                </CardContent>
            </Card>

            {/* Model Accuracy */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats?.model_accuracy !== null && stats?.model_accuracy !== undefined
                            ? `${stats.model_accuracy}%`
                            : "--"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stats?.model_loaded
                            ? `Trained for ${stats.total_epochs_trained} epochs`
                            : "Train model first"}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
