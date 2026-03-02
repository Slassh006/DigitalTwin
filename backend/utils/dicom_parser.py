import pydicom
import numpy as np
import logging
import io

logger = logging.getLogger(__name__)

class DicomParser:
    """
    Parser for MedTech DICOM files using pydicom.
    Extracts volumetric pixel arrays, voxel spacing, and patient metadata.
    """
    
    def __init__(self):
        pass

    def parse_dcm(self, file_bytes: bytes) -> dict:
        """
        Parses a single DICOM file.
        In a clinical setting, this extracts the 2D slice or block and 
        prepares it for PINN Volume Inference.
        
        Args:
            file_bytes: Raw bytes of the uploaded .dcm file
            
        Returns:
            Dictionary containing metadata and the numpy pixel array
        """
        try:
            # Read from byte stream
            dicom_dataset = pydicom.dcmread(io.BytesIO(file_bytes))
            
            # Extract Metadata
            patient_id = getattr(dicom_dataset, "PatientID", "Unknown")
            modality = getattr(dicom_dataset, "Modality", "Unknown")
            
            # Pixel Spacing (X, Y)
            spacing = getattr(dicom_dataset, "PixelSpacing", [1.0, 1.0])
            slice_thickness = getattr(dicom_dataset, "SliceThickness", 1.0)
            
            # Voxel Array
            if hasattr(dicom_dataset, "pixel_array"):
                pixel_array = dicom_dataset.pixel_array
                shape = pixel_array.shape
            else:
                pixel_array = np.zeros((256, 256))
                shape = pixel_array.shape
                logger.warning(f"No pixel array found in DICOM. Generated empty {shape} grid.")
                
            logger.info(f"DICOM Parsed: Patient: {patient_id} | Modality: {modality} | Shape: {shape}")
                
            return {
                "metadata": {
                    "patient_id": patient_id,
                    "modality": modality,
                    "spacing": [float(s) for s in spacing],
                    "slice_thickness": float(slice_thickness)
                },
                "array_shape": shape,
                # In a real pipeline, you'd serialize the volume array for inference
            }
            
        except pydicom.errors.InvalidDicomError as e:
            logger.error(f"Invalid DICOM file: {e}")
            raise ValueError(f"Failed to parse DICOM: Not a valid DICOM format.")
        except Exception as e:
            logger.error(f"Unexpected error parsing DICOM: {e}")
            raise Exception(f"Failed to process Medical Imaging File.")
