"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Database, Bell, Shield, Loader2 } from "lucide-react";
import { getSettings, updateSettings, type Settings } from "../../lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const data = await getSettings();
            setSettings(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load settings",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setIsSaving(true);
        try {
            await updateSettings(settings);
            toast({
                title: "Settings Saved",
                description: "Your settings have been updated successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save settings",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        if (settings) {
            setSettings({ ...settings, [key]: value });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure application preferences and system parameters
                    </p>
                </div>
                <div className="grid gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
                </div>
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure application preferences and system parameters
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            {/* Settings Sections */}
            <div className="grid gap-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5" />
                            <CardTitle>General Settings</CardTitle>
                        </div>
                        <CardDescription>Application-wide configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <p className="font-medium">Enable Notifications</p>
                                <p className="text-sm text-muted-foreground">
                                    Receive alerts for training completion and node health
                                </p>
                            </div>
                            <Switch
                                checked={settings.notifications_enabled}
                                onCheckedChange={(checked) => updateSetting('notifications_enabled', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Model Configuration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            <CardTitle>Model Configuration</CardTitle>
                        </div>
                        <CardDescription>PINN model parameters and training settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="font-medium">Learning Rate</label>
                                <span className="text-sm text-muted-foreground">{settings.learning_rate.toFixed(4)}</span>
                            </div>
                            <Slider
                                min={0.0001}
                                max={0.01}
                                step={0.0001}
                                value={[settings.learning_rate]}
                                onValueChange={([value]) => updateSetting('learning_rate', value)}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Controls how quickly the model learns. Lower = more stable, higher = faster but less stable.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="font-medium">Batch Size</label>
                            <Select
                                value={settings.batch_size.toString()}
                                onValueChange={(value) => updateSetting('batch_size', parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="8">8</SelectItem>
                                    <SelectItem value="16">16</SelectItem>
                                    <SelectItem value="32">32</SelectItem>
                                    <SelectItem value="64">64</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Number of samples processed before model update. Larger = faster training but more memory.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="font-medium">Physics Loss Weight</label>
                                <span className="text-sm text-muted-foreground">{settings.physics_loss_weight.toFixed(2)}</span>
                            </div>
                            <Slider
                                min={0}
                                max={1}
                                step={0.01}
                                value={[settings.physics_loss_weight]}
                                onValueChange={([value]) => updateSetting('physics_loss_weight', value)}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Balance between data-driven and physics-based learning. Higher = more physics constraints.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="font-medium">Training Epochs</label>
                            <Select
                                value={settings.epochs.toString()}
                                onValueChange={(value) => updateSetting('epochs', parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Number of complete passes through the training dataset.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
