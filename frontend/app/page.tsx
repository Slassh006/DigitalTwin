"use client"

import { useState, useEffect } from "react";
import { NetworkStatusCard } from "@/components/dashboard/network-status-card";
import { TrainingChart } from "@/components/dashboard/training-chart";
import { MetricsOverview } from "@/components/dashboard/metrics-overview";
import { Button } from "@/components/ui/button";
import { getNodeStatus, trainFederatedNodes } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const [isTraining, setIsTraining] = useState(false);
    const [nodes, setNodes] = useState<any[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        // Fetch node status on mount
        loadNodeStatus();

        // Poll every 5 seconds
        const interval = setInterval(loadNodeStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadNodeStatus = async () => {
        try {
            const data = await getNodeStatus();
            setNodes(data.nodes);
        } catch (error) {
            console.error("Failed to load node status:", error);
        }
    };

    const handleStartTraining = async () => {
        setIsTraining(true);

        try {
            await trainFederatedNodes(10);

            toast({
                title: "Training Started",
                description: "Federated training initiated on all nodes",
            });

            // Reload node status
            setTimeout(loadNodeStatus, 1000);

        } catch (error) {
            toast({
                title: "Training Failed",
                description: "Could not start federated training",
                variant: "destructive",
            });
        } finally {
            setIsTraining(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Federated Learning Network Overview
                    </p>
                </div>

                <Button
                    onClick={handleStartTraining}
                    disabled={isTraining}
                    size="lg"
                >
                    {isTraining ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Training...
                        </>
                    ) : (
                        "Start Training"
                    )}
                </Button>
            </div>

            {/* Metrics Overview */}
            <MetricsOverview />

            {/* Federated Network Status */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Federated Network Status</h2>
                {nodes.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {nodes.map((node, index) => (
                            <NetworkStatusCard
                                key={node.name}
                                nodeName={node.name}
                                nodeType={node.name.toLowerCase()}
                                status={node.status}
                                isTraining={node.is_training}
                            />
                        ))}
                    </div>
                ) : (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">
                            Loading federated nodes... Ensure backend services are running.
                        </p>
                    </Card>
                )}
            </div>

            {/* Real-Time Training Chart */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Real-Time Training</h2>
                <TrainingChart />
            </div>
        </div>
    );
}
