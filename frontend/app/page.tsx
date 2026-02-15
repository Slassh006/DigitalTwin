"use client"

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NetworkStatusCard } from "@/components/dashboard/network-status-card";
import { TrainingChart } from "@/components/dashboard/training-chart";
import { MetricsOverview } from "@/components/dashboard/metrics-overview";
import { Button } from "@/components/ui/button";
import { getNodeStatus, trainFederatedNodes } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";

export default function DashboardPage() {
    const [isTraining, setIsTraining] = useState(false);
    const [nodes, setNodes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            setIsLoading(false);
        } catch (error) {
            console.error("Failed to load node status:", error);
            setIsLoading(false);
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
            <motion.div
                className="flex justify-between items-center"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
            >
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
                    className="transition-all duration-200 hover:scale-105"
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
            </motion.div>

            {/* Metrics Overview */}
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.1 }}
            >
                <MetricsOverview />
            </motion.div>

            {/* Federated Network Status */}
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-xl font-semibold mb-4">Federated Network Status</h2>
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="p-6">
                                <Skeleton className="h-6 w-32 mb-4" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-24" />
                            </Card>
                        ))}
                    </div>
                ) : nodes.length > 0 ? (
                    <motion.div
                        className="grid gap-4 md:grid-cols-3"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                    >
                        {nodes.map((node, index) => (
                            <motion.div key={node.name} variants={staggerItem}>
                                <NetworkStatusCard
                                    nodeName={node.name}
                                    nodeType={node.name.toLowerCase()}
                                    status={node.status}
                                    isTraining={node.is_training}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">
                            Loading federated nodes... Ensure backend services are running.
                        </p>
                    </Card>
                )}
            </motion.div>

            {/* Real-Time Training Chart */}
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
            >
                <h2 className="text-xl font-semibold mb-4">Real-Time Training</h2>
                <TrainingChart />
            </motion.div>
        </div>
    );
}
