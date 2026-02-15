"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getTrainingHistory } from "@/lib/api";

export function TrainingChart() {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const history = await getTrainingHistory();

                // Group by epoch and aggregate losses
                const epochData = history.reduce((acc: any, item: any) => {
                    const epoch = item.epoch;
                    if (!acc[epoch]) {
                        acc[epoch] = {
                            epoch,
                            loss: item.loss,
                            count: 1
                        };
                    } else {
                        acc[epoch].loss += item.loss;
                        acc[epoch].count += 1;
                    }
                    return acc;
                }, {});

                // Calculate averages
                const chartData = Object.values(epochData).map((item: any) => ({
                    epoch: item.epoch,
                    loss: item.loss / item.count
                }));

                setData(chartData);
            } catch (error) {
                console.error("Failed to load training history:", error);
            }
        };

        loadHistory();
        const interval = setInterval(loadHistory, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Loss Function Over Time</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="epoch" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="loss"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
