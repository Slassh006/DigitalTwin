/**
 * Patient Encoder Library
 * 
 * This utility simulates the conversion of human-readable patient data from the frontend form
 * into the mathematical vectors required by the Federated Physics-Informed Neural Network (PINN).
 * 
 * In a true production environment, this would cleanly map directly to the ML tensors.
 */

export interface PatientFormData {
    // Clinical
    age: number;
    bmi: number;
    painVas: number;
    dysmenorrhea: number;
    cycleLength: number;
    depressionScore: number;
    anxietyScore: number;
    stressScore: number;
    diagnosticExperience: number;

    // Imaging
    lesionCount: number;
    maxSizeCm: number;
    endometrialThickness: number;
    rasrmScore: number;

    // Pathology
    wbcCount: number;
    neutrophilPercent: number;
    lymphocytePercent: number;
    ca125: number;
    ca153: number;
    ca199: number;
    glucose: number;
}

export class PatientDataEncoder {

    /**
     * Normalizes a clinical feature vector to 64 dimensions for the Clinical Node
     */
    static encodeClinical(data: PatientFormData): number[] {
        // Math logic: We take the raw inputs and normalize them between 0 and 1
        // Padding to 64 length to simulate ML input tensor
        const vector = new Array(64).fill(0);

        vector[0] = data.age / 100;
        vector[1] = (data.bmi - 10) / 40;
        vector[2] = data.painVas / 10;
        vector[3] = data.dysmenorrhea / 10;
        vector[4] = data.cycleLength / 60;
        vector[5] = data.depressionScore / 30; // Assuming DASS-21 scale
        vector[6] = data.anxietyScore / 30;
        vector[7] = data.stressScore / 30;
        vector[8] = data.diagnosticExperience / 10;

        // Fill remaining with random synthesis to simulate embedding
        for (let i = 9; i < 64; i++) {
            vector[i] = Math.random() * 0.1;
        }
        return vector;
    }

    /**
     * Normalizes an imaging feature vector to 128 dimensions for the Imaging Node
     */
    static encodeImaging(data: PatientFormData): number[] {
        const vector = new Array(128).fill(0);

        vector[0] = data.lesionCount / 20;
        vector[1] = data.maxSizeCm / 15;
        vector[2] = data.endometrialThickness / 30;
        vector[3] = data.rasrmScore / 4; // R-ASRM stage 1 to 4

        for (let i = 4; i < 128; i++) {
            vector[i] = Math.random() * 0.1;
        }
        return vector;
    }

    /**
     * Normalizes a pathology feature vector to 64 dimensions for the Pathology Node
     */
    static encodePathology(data: PatientFormData): number[] {
        const vector = new Array(64).fill(0);

        vector[0] = data.wbcCount / 20; // x10^9/L
        vector[1] = data.neutrophilPercent / 100;
        vector[2] = data.lymphocytePercent / 100;
        vector[3] = data.ca125 / 200; // Unusually high cap for endo
        vector[4] = data.ca153 / 100;
        vector[5] = data.ca199 / 100;
        vector[6] = data.glucose / 10;

        for (let i = 7; i < 64; i++) {
            vector[i] = Math.random() * 0.1;
        }
        return vector;
    }

    /**
     * Combines all data into the final prediction payload
     */
    static generatePredictionPayload(data: PatientFormData) {
        return {
            clinicalVector: this.encodeClinical(data),
            imagingVector: this.encodeImaging(data),
            pathologyVector: this.encodePathology(data),
            rawFeatures: data,
            timestamp: new Date().toISOString()
        };
    }
}
