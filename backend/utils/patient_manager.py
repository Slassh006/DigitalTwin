"""
Patient management utility for storing and retrieving patient data.
Uses JSON file storage for simplicity (no database required).
"""

import json
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

PATIENTS_FILE = os.path.join(os.path.dirname(__file__), "../data/patients.json")


class PatientManager:
    def __init__(self):
        self.patients_file = PATIENTS_FILE
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create patients.json if it doesn't exist"""
        os.makedirs(os.path.dirname(self.patients_file), exist_ok=True)
        if not os.path.exists(self.patients_file):
            with open(self.patients_file, 'w') as f:
                json.dump([], f)

    def _read_patients(self) -> List[Dict[str, Any]]:
        """Read all patients from file"""
        try:
            with open(self.patients_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _write_patients(self, patients: List[Dict[str, Any]]):
        """Write patients to file"""
        with open(self.patients_file, 'w') as f:
            json.dump(patients, f, indent=2)

    def create_patient(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new patient record"""
        patients = self._read_patients()
        
        patient = {
            "id": str(uuid.uuid4()),
            "name": data.get("name", "Unknown"),
            "age": data.get("age", 0),
            "bmi": data.get("bmi", 0.0),
            "pain_score": data.get("pain_score", 0),
            "ca125_level": data.get("ca125_level", 0.0),
            "mri_findings": data.get("mri_findings", ""),
            "diagnosis": data.get("diagnosis", "unknown"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        patients.append(patient)
        self._write_patients(patients)
        return patient

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get a patient by ID"""
        patients = self._read_patients()
        for patient in patients:
            if patient["id"] == patient_id:
                return patient
        return None

    def list_patients(self) -> List[Dict[str, Any]]:
        """Get all patients"""
        return self._read_patients()

    def update_patient(self, patient_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a patient record"""
        patients = self._read_patients()
        
        for i, patient in enumerate(patients):
            if patient["id"] == patient_id:
                # Update fields
                patient.update({
                    k: v for k, v in data.items() 
                    if k not in ["id", "created_at"]
                })
                patients[i] = patient
                self._write_patients(patients)
                return patient
        
        return None

    def delete_patient(self, patient_id: str) -> bool:
        """Delete a patient record"""
        patients = self._read_patients()
        original_length = len(patients)
        
        patients = [p for p in patients if p["id"] != patient_id]
        
        if len(patients) < original_length:
            self._write_patients(patients)
            return True
        
        return False


# Global instance
patient_manager = PatientManager()
