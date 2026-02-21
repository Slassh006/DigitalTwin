import os
import shutil
import pandas as pd
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Input Datasets
INPUT_DIR = Path(r"h:\Akash\DigitalTwin\datasets")
MEDICAL_IMAGING_DIR = INPUT_DIR / "medical imaging" 
CLINICAL_RECORDS_DIR = INPUT_DIR / "patient Records"
PATHOLOGY_REPORTS_DIR = INPUT_DIR / "pathology reports"

# Output destinations (Federated Nodes)
OUTPUT_DIR = Path(r"h:\Akash\DigitalTwin\backend\data")
IMAGING_NODE_DIR = OUTPUT_DIR / "imaging"
CLINICAL_NODE_DIR = OUTPUT_DIR / "clinical"
PATHOLOGY_NODE_DIR = OUTPUT_DIR / "pathology"

def setup_directories():
    for d in [IMAGING_NODE_DIR, CLINICAL_NODE_DIR, PATHOLOGY_NODE_DIR]:
        d.mkdir(parents=True, exist_ok=True)
        logging.info(f"Ensured output directory exists: {d}")

def process_imaging():
    """Copy image frames from Glenda dataset into the imaging node"""
    glenda_dir = MEDICAL_IMAGING_DIR / "Dataset-4" / "Glenda_v1.5_classes"
    frames_dir = glenda_dir / "frames"
    
    if frames_dir.exists():
        files = list(frames_dir.glob("*.jpg"))
        logging.info(f"Found {len(files)} image frames in {frames_dir}")
        for f in files:
            dest = IMAGING_NODE_DIR / f.name
            if not dest.exists():
                shutil.copy2(f, dest)
        logging.info("Imaging files copied.")
    else:
        logging.warning("Frames directory not found in Glenda dataset.")

def process_clinical():
    """Process Clinical Records into a standard CSV format"""
    source_file = CLINICAL_RECORDS_DIR / "Dataset-7" / "Psychological Wellbeing and Endometriosis and Adenomyosis.csv"
    dest_file = CLINICAL_NODE_DIR / "records.csv"
    
    if source_file.exists():
        try:
            # Let's read and do basic renaming to match the expected format of our node
            df = pd.read_csv(source_file)
            
            # The client_clinical.py expects patient_id, age, bmi, pain_score, etc.
            # We map some generic mock standard fields for the sake of the system.
            # (Note: real mapping requires domain knowledge of the CSV column names)
            
            # Auto-assign patient IDs if missing
            if 'patient_id' not in df.columns:
                 df['patient_id'] = [f"{i:03d}" for i in range(1, len(df)+1)]
            
            # Basic save (since we don't know the exact columns without reading, we save as is
            # and let the node's mock generator merge/process it or we can map known columns later)
            df.to_csv(dest_file, index=False)
            logging.info(f"Clinical records saved to: {dest_file}")
            
        except Exception as e:
            logging.error(f"Failed to process clinical CSV: {e}")
    else:
         logging.warning(f"Clinical dataset not found at: {source_file}")

def process_pathology():
    """Process Pathology Records into a standard CSV format"""
    source_file = PATHOLOGY_REPORTS_DIR / "Dataset-6" / "Table_1_Gut Microbiota Exceeds Cervical Microbiota for Early Diagnosis of Endometriosis.xlsx"
    dest_file = PATHOLOGY_NODE_DIR / "lab_reports.csv"
    
    if source_file.exists():
        try:
            # Note: the input is an excel file, output as CSV
            df = pd.read_excel(source_file)
            
            if 'patient_id' not in df.columns:
                 df['patient_id'] = [f"{i:03d}" for i in range(1, len(df)+1)]
                 
            df.to_csv(dest_file, index=False)
            logging.info(f"Pathology reports saved to: {dest_file}")
            
        except Exception as e:
            logging.error(f"Failed to process pathology Excel: {e}")
    else:
        logging.warning(f"Pathology dataset not found at: {source_file}")

def process_sensor_data():
    """Process Sensor Data by moving WESAD folders to the backend."""
    source_dir = INPUT_DIR / "sensor data" / "Dataset-10" / "WESAD"
    sensor_node_dir = OUTPUT_DIR / "sensor"
    
    if source_dir.exists():
        sensor_node_dir.mkdir(parents=True, exist_ok=True)
        # We will copy the subject folders to backend/data/sensor
        subjects = [d for d in source_dir.iterdir() if d.is_dir() and d.name.startswith("S") and "README" not in d.name]
        
        if not subjects:
             logging.warning("No subject folders found in WESAD.")
             return
             
        for subject_dir in subjects:
            dest_dir = sensor_node_dir / subject_dir.name
            if not dest_dir.exists():
                shutil.copytree(subject_dir, dest_dir)
                logging.info(f"Copied sensor data for {subject_dir.name}")
        logging.info("Sensor data organization complete.")
    else:
        logging.warning(f"Sensor dataset not found at: {source_dir}")

if __name__ == "__main__":
    logging.info("Starting Dataset Organization...")
    setup_directories()
    process_imaging()
    process_clinical()
    process_pathology()
    process_sensor_data()
    logging.info("Dataset Organization Complete!")
