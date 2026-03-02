import re
import math
import logging
from typing import Dict, List, Any
import fitz  # PyMuPDF
import cv2  # OpenCV (if available) or pytesseract (will try import later)

try:
    import pytesseract
    from PIL import Image
    import io
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

logger = logging.getLogger(__name__)

def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract raw text from PDF or image content."""
    text = ""
    lower_filename = filename.lower()
    
    try:
        if lower_filename.endswith('.pdf'):
            doc = fitz.open(stream=file_content, filetype="pdf")
            for page in doc:
                text += page.get_text() + "\n"
        elif lower_filename.endswith(('.png', '.jpg', '.jpeg', '.tiff')) and HAS_TESSERACT:
            image = Image.open(io.BytesIO(file_content))
            text = pytesseract.image_to_string(image)
        else:
            # Fallback for plain text or unsupported types
            try:
                text = file_content.decode('utf-8')
            except:
                logger.warning(f"Unsupported document format or missing tesseract for {filename}")
                text = ""
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
        
    return text

def parse_clinical_features(text: str) -> Dict[str, Any]:
    """Parse out clinical variables using regex from unstructured text."""
    report_data = {
        "lesion_count": 0,
        "max_lesion_size_mm": 0,
        "adhesion_score": 0,
        "ovarian_cyst": False,
        "uterine_distortion": False,
        "doppler_flow_index": 0.2,
        "endometrial_thickness_mm": 8,
        "myometrial_involvement": 0,
        "age": 32,
        "bmi": 23,
        "pain_vas": 0,
        "dysmenorrhea_severity": 0,
        "dyspareunia": False,
        "infertility": False,
        "ca125_u_ml": 10,
        "amh_ng_ml": 2,
        "cycle_length_days": 28,
        "symptom_duration_months": 0,
        "crp_mg_l": 2,
        "il6_pg_ml": 2,
        "neutrophil_count": 4500,
        "lymphocyte_ratio": 0.3,
        "biopsy_endo_score": 0,
        "estradiol_pg_ml": 80,
        "progesterone_ng_ml": 5,
        "fibrinogen_mg_dl": 300,
    }
    
    text_lower = text.lower()
    
    # Simple regex extractions (can be expanded)
    age_match = re.search(r'age:\s*(\d+)', text_lower)
    if age_match: report_data["age"] = int(age_match.group(1))
        
    bmi_match = re.search(r'bmi:\s*([\d\.]+)', text_lower)
    if bmi_match: report_data["bmi"] = float(bmi_match.group(1))
        
    ca125_match = re.search(r'ca-?125.*?:?\s*([\d\.]+)', text_lower)
    if ca125_match: report_data["ca125_u_ml"] = float(ca125_match.group(1))

    pain_match = re.search(r'pain.*?(\d+)\s*/\s*10', text_lower)
    if pain_match: report_data["pain_vas"] = float(pain_match.group(1))
        
    lesion_size_match = re.search(r'size.*?:?\s*([\d\.]+)\s*(mm|cm)', text_lower)
    if lesion_size_match:
        val = float(lesion_size_match.group(1))
        unit = lesion_size_match.group(2)
        if unit == 'cm': val *= 10
        report_data["max_lesion_size_mm"] = val
        
    if 'cyst' in text_lower or 'endometrioma' in text_lower:
        report_data["ovarian_cyst"] = True
        
    # Defaulting lesion count if mentions of lesions
    lesion_count = len(re.findall(r'lesion|nodule|implant', text_lower))
    if lesion_count > 0:
        report_data["lesion_count"] = min(20, lesion_count)
        
    return report_data


def get_patient_features_from_document(file_content: bytes, filename: str) -> Dict[str, List[float]]:
    """Master function: extract text, parse values, and encode to PINN features."""
    text = extract_text_from_file(file_content, filename)
    report = parse_clinical_features(text)
    
    return encode_patient_report(report)


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))

def norm(v: float, min_val: float, max_val: float) -> float:
    return clamp01((v - min_val) / (max_val - min_val))

def tile(values: List[float], target_len: int) -> List[float]:
    out = []
    while len(out) < target_len:
        for i in range(len(values)):
            if len(out) >= target_len: break
            noise = (len(out) / target_len) * 0.05
            out.append(clamp01(values[i] + noise))
    return out

def encode_patient_report(report: Dict[str, Any]) -> Dict[str, List[float]]:
    """Python translation of frontend's patient-encoder.ts"""
    
    imaging_seeds = [
        norm(report.get("lesion_count", 0), 0, 20),
        norm(report.get("max_lesion_size_mm", 0), 0, 80),
        norm(report.get("adhesion_score", 0), 0, 4),
        1.0 if report.get("ovarian_cyst") else 0.0,
        1.0 if report.get("uterine_distortion") else 0.0,
        clamp01(report.get("doppler_flow_index", 0.2)),
        norm(report.get("endometrial_thickness_mm", 8), 2, 20),
        clamp01(report.get("myometrial_involvement", 0))
    ]
    
    clinical_seeds = [
        norm(report.get("age", 32), 15, 65),
        norm(report.get("bmi", 23), 14, 45),
        norm(report.get("pain_vas", 0), 0, 10),
        norm(report.get("dysmenorrhea_severity", 0), 0, 3),
        1.0 if report.get("dyspareunia") else 0.0,
        1.0 if report.get("infertility") else 0.0,
        norm(report.get("ca125_u_ml", 10), 0, 500),
        norm(report.get("amh_ng_ml", 2), 0, 10),
        norm(report.get("cycle_length_days", 28), 21, 42),
        norm(report.get("symptom_duration_months", 0), 0, 120)
    ]
    
    pathology_seeds = [
        norm(report.get("crp_mg_l", 2), 0, 150),
        norm(report.get("il6_pg_ml", 2), 0, 100),
        norm(report.get("neutrophil_count", 4500), 1500, 8000),
        clamp01(report.get("lymphocyte_ratio", 0.3)),
        norm(report.get("biopsy_endo_score", 0), 0, 4),
        norm(report.get("estradiol_pg_ml", 80), 0, 800),
        norm(report.get("progesterone_ng_ml", 5), 0, 30),
        norm(report.get("fibrinogen_mg_dl", 300), 100, 600)
    ]
    
    return {
        "imaging_features": tile(imaging_seeds, 128),
        "clinical_features": tile(clinical_seeds, 64),
        "pathology_features": tile(pathology_seeds, 64),
        "parsed_report": report
    }
