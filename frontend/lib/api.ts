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

export async function predict(patientId?: string): Promise<PredictionResponse> {
    const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patient_id: patientId }),
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

export async function getTrainingHistory(): Promise<TrainingHistoryItem[]> {
    const response = await fetch(`${API_BASE_URL}/training/history`);

    if (!response.ok) {
        throw new Error('Failed to fetch training history');
    }

    const data = await response.json();
    return data.history || [];
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
