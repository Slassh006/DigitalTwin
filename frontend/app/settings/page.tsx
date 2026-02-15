"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Database, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Configure application preferences and system parameters
                </p>
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
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Theme</p>
                                <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
                            </div>
                            <Button variant="outline" size="sm">Configure</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Language</p>
                                <p className="text-sm text-muted-foreground">Select display language</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>English</Button>
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
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Learning Rate</p>
                                <p className="text-sm text-muted-foreground">Adjust gradient descent step size</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Default: 0.001</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Batch Size</p>
                                <p className="text-sm text-muted-foreground">Number of samples per training batch</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Default: 32</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Physics Loss Weight</p>
                                <p className="text-sm text-muted-foreground">Balance between data and physics constraints</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Default: 0.1</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            <CardTitle>Notifications</CardTitle>
                        </div>
                        <CardDescription>Manage alerts and notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Training Completion Alerts</p>
                                <p className="text-sm text-muted-foreground">Notify when training completes</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Disabled</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Node Health Warnings</p>
                                <p className="text-sm text-muted-foreground">Alert on node failures</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Disabled</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            <CardTitle>Security & Privacy</CardTitle>
                        </div>
                        <CardDescription>Data protection and access control</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Data Encryption</p>
                                <p className="text-sm text-muted-foreground">Configure end-to-end encryption</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>Active</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Access Logs</p>
                                <p className="text-sm text-muted-foreground">View system access history</p>
                            </div>
                            <Button variant="outline" size="sm" disabled>View Logs</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Note */}
            <Card className="border-blue-500/50 bg-blue-500/5">
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> This is a placeholder settings page. In a production environment,
                        these settings would connect to backend configuration APIs and allow real-time adjustment
                        of model parameters, notification preferences, and security policies.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
