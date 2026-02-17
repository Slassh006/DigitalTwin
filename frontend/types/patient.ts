/**
 * Patient data types for managing patient records
 */

export interface Patient {
    id: string;
    name: string;
    age: number;
    bmi: number;
    pain_score: number;
    ca125_level: number;
    mri_findings?: string;
    diagnosis?: 'positive' | 'negative' | 'unknown';
    created_at: string;
}

export interface CreatePatientRequest {
    name: string;
    age: number;
    bmi: number;
    pain_score: number;
    ca125_level: number;
    mri_findings?: string;
    diagnosis?: 'positive' | 'negative' | 'unknown';
}

export interface PatientsListResponse {
    patients: Patient[];
    count: number;
}
