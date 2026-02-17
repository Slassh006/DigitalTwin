import { SystemLog } from "@/types/logs";

/**
 * Simulation Engine for EndoTwin
 * Generates realistic medical data where backend endpoints are missing.
 */

// Generate a realistic longitudinal trend for a patient
export const generateLongitudinalData = (months = 12) => {
    const data = [];
    const monthsList = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Base values
    let stiffness = 20 + Math.random() * 5; // Base stiffness ~20-25 kPa
    let prob = 0.1; // Base probability

    for (let i = 0; i < months; i++) {
        // Simple progression model: Disease worsens over time slightly
        stiffness += (Math.random() - 0.2) * 5; // Drift
        stiffness = Math.max(15, stiffness); // Clamp

        prob += (stiffness - 20) * 0.02; // Prob linked to stiffness
        prob = Math.max(0, Math.min(1, prob));

        data.push({
            month: monthsList[i % 12],
            prob: parseFloat(prob.toFixed(2)),
            stiffness: parseFloat(stiffness.toFixed(1))
        });
    }
    return data;
};

// Generate population cohort data
export const generatePopulationData = (count = 50) => {
    return Array.from({ length: count }, () => {
        const age = 20 + Math.random() * 50; // Age 20-70
        // Severity correlates somewhat with age
        const severity = (age / 100) * 50 + Math.random() * 50;
        const symptomIndex = severity * 0.8 + Math.random() * 20;

        return {
            x: parseFloat(age.toFixed(0)), // Age
            y: parseFloat(symptomIndex.toFixed(0)), // Symptom Index
            z: parseFloat(severity.toFixed(0)), // Severity (Size)
        };
    });
};

// Generate error distribution
export const generateErrorDistribution = () => {
    return [
        { bin: '0.001', count: 5 + Math.floor(Math.random() * 10), color: '#7311d4', opacity: 0.2 },
        { bin: '0.005', count: 15 + Math.floor(Math.random() * 15), color: '#7311d4', opacity: 0.3 },
        { bin: '0.010', count: 40 + Math.floor(Math.random() * 20), color: '#7311d4', opacity: 0.4 },
        { bin: '0.015', count: 70 + Math.floor(Math.random() * 30), color: '#7311d4', opacity: 0.6, label: 'Mean' },
        { bin: '0.020', count: 45 + Math.floor(Math.random() * 15), color: '#7311d4', opacity: 0.4 },
        { bin: '0.025', count: 20 + Math.floor(Math.random() * 10), color: '#7311d4', opacity: 0.3 },
        { bin: '0.050', count: 5 + Math.floor(Math.random() * 10), color: '#ff0055', opacity: 0.6, alert: true },
    ];
};
