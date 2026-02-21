/**
 * patient-encoder.ts
 * Maps human-readable patient report fields → float32 feature vectors
 * expected by the PINN model (imaging=128, clinical=64, pathology=64 dims).
 *
 * Normalisation: each field → 0-1 using physiological min/max, then the
 * normalised scalars are tiled/interpolated to fill the required vector length.
 */

export interface PatientReport {
    // ─── Imaging (MRI) ───────────────────────────────────────────────────────
    lesion_count: number           // 0–20 (integer)
    max_lesion_size_mm: number     // 0–80 mm
    adhesion_score: number         // 0–4  (rASRM)
    ovarian_cyst: boolean          // chocolate cyst present
    uterine_distortion: boolean    // uterine cavity distorted
    doppler_flow_index: number     // 0–1
    endometrial_thickness_mm: number // 2–20 mm
    myometrial_involvement: number // 0–1 (infiltration fraction)

    // ─── Clinical ────────────────────────────────────────────────────────────
    age: number                    // 15–65
    bmi: number                    // 14–45
    pain_vas: number               // 0–10 (Visual Analogue Scale)
    dysmenorrhea_severity: number  // 0–3
    dyspareunia: boolean
    infertility: boolean
    ca125_u_ml: number             // 0–500 U/mL
    amh_ng_ml: number              // 0–10 ng/mL
    cycle_length_days: number      // 21–42 days
    symptom_duration_months: number // 0–120 months

    // ─── Pathology / Lab ──────────────────────────────────────────────────────
    crp_mg_l: number               // 0–150 mg/L
    il6_pg_ml: number              // 0–100 pg/mL
    neutrophil_count: number       // 1500–8000 cells/µL
    lymphocyte_ratio: number       // 0–1
    biopsy_endo_score: number      // 0–4
    estradiol_pg_ml: number        // 0–800 pg/mL
    progesterone_ng_ml: number     // 0–30 ng/mL
    fibrinogen_mg_dl: number       // 100–600 mg/dL
}

/** Clamp a value to [0, 1] */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Normalise a value between [min, max] → [0, 1] */
const norm = (v: number, min: number, max: number) => clamp01((v - min) / (max - min))

/** Tile a short array to fill targetLen by repeating + partial tail */
function tile(values: number[], targetLen: number): number[] {
    const out: number[] = []
    while (out.length < targetLen) {
        for (let i = 0; i < values.length && out.length < targetLen; i++) {
            // add slight per-position variation to avoid identical repeated blocks
            const noise = (out.length / targetLen) * 0.05
            out.push(clamp01(values[i] + noise))
        }
    }
    return out
}

/**
 * Encode a PatientReport into the three feature vectors required by EndoPINN.
 * Returns { imaging_features, clinical_features, pathology_features }
 */
export function encodePatientReport(report: PatientReport): {
    imaging_features: number[]
    clinical_features: number[]
    pathology_features: number[]
} {
    /** ── Imaging seed (8 values → tiled to 128) ── */
    const imagingSeeds = [
        norm(report.lesion_count, 0, 20),
        norm(report.max_lesion_size_mm, 0, 80),
        norm(report.adhesion_score, 0, 4),
        report.ovarian_cyst ? 1 : 0,
        report.uterine_distortion ? 1 : 0,
        clamp01(report.doppler_flow_index),
        norm(report.endometrial_thickness_mm, 2, 20),
        clamp01(report.myometrial_involvement),
    ]

    /** ── Clinical seed (10 values → tiled to 64) ── */
    const clinicalSeeds = [
        norm(report.age, 15, 65),
        norm(report.bmi, 14, 45),
        norm(report.pain_vas, 0, 10),
        norm(report.dysmenorrhea_severity, 0, 3),
        report.dyspareunia ? 1 : 0,
        report.infertility ? 1 : 0,
        norm(report.ca125_u_ml, 0, 500),
        norm(report.amh_ng_ml, 0, 10),
        norm(report.cycle_length_days, 21, 42),
        norm(report.symptom_duration_months, 0, 120),
    ]

    /** ── Pathology seed (8 values → tiled to 64) ── */
    const pathologySeeds = [
        norm(report.crp_mg_l, 0, 150),
        norm(report.il6_pg_ml, 0, 100),
        norm(report.neutrophil_count, 1500, 8000),
        clamp01(report.lymphocyte_ratio),
        norm(report.biopsy_endo_score, 0, 4),
        norm(report.estradiol_pg_ml, 0, 800),
        norm(report.progesterone_ng_ml, 0, 30),
        norm(report.fibrinogen_mg_dl, 100, 600),
    ]

    return {
        imaging_features: tile(imagingSeeds, 128),
        clinical_features: tile(clinicalSeeds, 64),
        pathology_features: tile(pathologySeeds, 64),
    }
}

/** Default blank report (safe mid-range values) */
export const defaultPatientReport = (): PatientReport => ({
    lesion_count: 0,
    max_lesion_size_mm: 0,
    adhesion_score: 0,
    ovarian_cyst: false,
    uterine_distortion: false,
    doppler_flow_index: 0.2,
    endometrial_thickness_mm: 8,
    myometrial_involvement: 0,

    age: 32,
    bmi: 23,
    pain_vas: 0,
    dysmenorrhea_severity: 0,
    dyspareunia: false,
    infertility: false,
    ca125_u_ml: 10,
    amh_ng_ml: 2,
    cycle_length_days: 28,
    symptom_duration_months: 0,

    crp_mg_l: 2,
    il6_pg_ml: 2,
    neutrophil_count: 4500,
    lymphocyte_ratio: 0.3,
    biopsy_endo_score: 0,
    estradiol_pg_ml: 80,
    progesterone_ng_ml: 5,
    fibrinogen_mg_dl: 300,
})
