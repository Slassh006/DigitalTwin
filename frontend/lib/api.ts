/**
 * API client for communicating with the PINN backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8004';

export interface PredictionResponse {
    prediction: number;
    stiffness: number;
    confidence: number;
    risk_level: string;
    timestamp: string;
}

export interface TrainingHistoryItem {
    epoch: number;
    loss: number;
    data_loss?: number;
    physics_loss?: number;
    timestamp: string;
}

export interface NodeStatus {
    name: string;
    url: string;
    status: string;
    is_training: boolean;
}

export interface FederatedNodesStatus {
    nodes: NodeStatus[];
}

export interface PatientPredictInput {
    patient_id?: string
    imaging_features?: number[]
    clinical_features?: number[]
    pathology_features?: number[]
}

export async function predict(input?: PatientPredictInput): Promise<PredictionResponse> {
    const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input ?? {}),
    });

    if (!response.ok) {
        throw new Error('Prediction failed');
    }

    return response.json();
}

export async function trainFederatedNodes(epochs: number = 10): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/train`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ epochs }),
    });

    if (!response.ok) {
        throw new Error('Training failed');
    }

    return response.json();
}


export async function getNodeStatus(): Promise<FederatedNodesStatus> {
    const response = await fetch(`${API_BASE_URL}/status/nodes`);

    if (!response.ok) {
        throw new Error('Failed to fetch node status');
    }

    return response.json();
}

export async function getMeshUrl(stiffness: number): Promise<string> {
    return `${API_BASE_URL}/mesh/${stiffness}`;
}

export interface StatsResponse {
    active_nodes: string;
    active_nodes_count: number;
    total_nodes: number;
    predictions_made: number;
    model_accuracy: number | null;
    total_epochs_trained: number;
    model_loaded: boolean;
    is_training: boolean;
}

export async function getStats(): Promise<StatsResponse> {
    const response = await fetch(`${API_BASE_URL}/stats`);

    if (!response.ok) {
        throw new Error('Failed to fetch stats');
    }

    return response.json();
}

// ==================== Patient Management ====================

import type { Patient, CreatePatientRequest, PatientsListResponse } from '@/types/patient';

export async function createPatient(data: CreatePatientRequest): Promise<Patient> {
    const response = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Failed to create patient');
    }

    return response.json();
}

export async function getPatients(): Promise<PatientsListResponse> {
    const response = await fetch(`${API_BASE_URL}/patients`);

    if (!response.ok) {
        throw new Error('Failed to fetch patients');
    }

    return response.json();
}

export async function getPatient(id: string): Promise<Patient> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`);

    if (!response.ok) {
        throw new Error('Failed to fetch patient');
    }

    return response.json();
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Failed to update patient');
    }

    return response.json();
}

export async function deletePatient(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete patient');
    }
}

// ==================== Settings Management ====================

import type { Settings, UpdateSettingsRequest } from '@/types/settings';
export type { Settings, UpdateSettingsRequest };

export async function getSettings(): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/config`);

    if (!response.ok) {
        throw new Error('Failed to fetch settings');
    }

    return response.json();
}

export async function updateSettings(data: UpdateSettingsRequest): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        throw new Error('Failed to update settings');
    }

    return response.json();
}

export async function getDefaultSettings(): Promise<Settings> {
    const response = await fetch(`${API_BASE_URL}/config/defaults`);

    if (!response.ok) {
        throw new Error('Failed to fetch default settings');
    }

    return response.json();
}

// ==================== Analytics & Training History ====================

export interface TrainingRun {
    run_id: number;
    timestamp: string;
    epochs: Array<{
        epoch: number;
        loss: number;
        data_loss?: number;
        physics_loss?: number;
        timestamp: string;
    }>;
    final_loss: number;
}

export interface ModelMetrics {
    accuracy: number | null;
    precision: number | null;
    recall: number | null;
    f1_score: number | null;
}

export interface AnalyticsMetrics {
    model_metrics: ModelMetrics;
    latest_run: TrainingRun | null;
    node_performance: {
        imaging: { contribution: number; accuracy: number };
        clinical: { contribution: number; accuracy: number };
        pathology: { contribution: number; accuracy: number };
    };
    total_predictions: number;
    total_epochs_trained: number;
}

export async function getTrainingHistory(): Promise<{ training_runs: TrainingRun[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/training/history`);

    if (!response.ok) {
        throw new Error('Failed to fetch training history');
    }

    return response.json();
}

export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
    const response = await fetch(`${API_BASE_URL}/analytics/metrics`);

    if (!response.ok) {
        throw new Error('Failed to fetch analytics metrics');
    }

    return response.json();
}

// ==================== Real-time Log Streaming ====================

export interface LogEntry {
    id: string;
    timestamp: string;
    type: 'INFO' | 'WARN' | 'ERROR' | 'TRAIN' | 'SUCCESS' | 'DEBUG';
    message: string;
}

export async function getLogs(since?: string, limit = 100): Promise<{ logs: LogEntry[]; count: number }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (since) params.set('since', since);
    const response = await fetch(`${API_BASE_URL}/logs?${params}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
}
