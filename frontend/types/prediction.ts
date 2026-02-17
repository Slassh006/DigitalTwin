// Type definitions for enhanced 3D visualization
export interface LesionData {
    id: string;
    position: [number, number, number];
    stiffness: number;
    confidence: number;
    severity: 'low' | 'moderate' | 'high';
    label?: string;
    contributing_factors?: string[];
}

export interface RegionalAnalysis {
    region: string;
    stiffness: number;
    confidence: number;
    risk_level: 'low' | 'moderate' | 'high';
}

export interface PredictionResponse {
    prediction: number;
    overall_stiffness: number;
    confidence: number;
    risk_level: 'low' | 'moderate' | 'high';
    regional_analysis?: {
        fundus?: RegionalAnalysis;
        left_ovary?: RegionalAnalysis;
        right_ovary?: RegionalAnalysis;
        left_tube?: RegionalAnalysis;
        right_tube?: RegionalAnalysis;
        cervix?: RegionalAnalysis;
    };
    lesions?: LesionData[];
    node_contributions?: {
        imaging: number;
        clinical: number;
        pathology: number;
    };
}
