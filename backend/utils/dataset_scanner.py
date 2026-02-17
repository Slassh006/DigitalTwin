"""
Dataset Scanner and Analyzer
Scans H:\Downloads\datasets folder safely (READ-ONLY) and creates comprehensive catalog.
NO FILES WILL BE MODIFIED, DELETED, OR FORMATTED.
"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any
import hashlib
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class DatasetScanner:
    """
    Safe, read-only scanner for medical datasets.
    Analyzes file types, structures, and creates catalog.
    """
    
    def __init__(self, root_path: str = r"H:\Downloads\datasets"):
        self.root_path = Path(root_path)
        self.catalog = {
            "scan_date": datetime.now().isoformat(),
            "root_path": str(self.root_path),
            "total_files": 0,
            "total_size_mb": 0.0,
            "file_types": {},
            "datasets": [],
            "errors": []
        }
    
    def safe_scan(self) -> Dict[str, Any]:
        """
        Main scanning function - READ ONLY, no modifications.
        
        Returns:
            Dictionary with complete dataset catalog
        """
        print(f"🔍 Starting SAFE scan of: {self.root_path}")
        print(f"⚠️  READ-ONLY MODE: No files will be modified, deleted, or formatted")
        print("-" * 80)
        
        if not self.root_path.exists():
            error_msg = f"Path does not exist: {self.root_path}"
            print(f"❌ {error_msg}")
            self.catalog["errors"].append(error_msg)
            return self.catalog
        
        # Walk through directory tree
        for root, dirs, files in os.walk(self.root_path):
            for file in files:
                self._analyze_file(Path(root) / file)
        
        # Generate summary
        self._generate_summary()
        
        # Save catalog
        self._save_catalog()
        
        print("\n" + "=" * 80)
        print("✅ Scan completed successfully!")
        print(f"📊 Total files scanned: {self.catalog['total_files']}")
        print(f"💾 Total size: {self.catalog['total_size_mb']:.2f} MB")
        print(f"📁 Datasets found: {len(self.catalog['datasets'])}")
        print(f"📄 Catalog saved to: dataset_catalog.json")
        
        return self.catalog
    
    def _analyze_file(self, filepath: Path):
        """Analyze a single file (READ ONLY)."""
        try:
            # Get file info
            size_mb = filepath.stat().st_size / (1024 * 1024)
            extension = filepath.suffix.lower()
            
            # Update counts
            self.catalog["total_files"] += 1
            self.catalog["total_size_mb"] += size_mb
            
            if extension not in self.catalog["file_types"]:
                self.catalog["file_types"][extension] = {
                    "count": 0,
                    "total_size_mb": 0.0,
                    "examples": []
                }
            
            self.catalog["file_types"][extension]["count"] += 1
            self.catalog["file_types"][extension]["total_size_mb"] += size_mb
            
            # Add example (max 3 per type)
            if len(self.catalog["file_types"][extension]["examples"]) < 3:
                self.catalog["file_types"][extension]["examples"].append(str(filepath))
            
            # Detailed analysis based on file type
            dataset_info = {
                "filepath": str(filepath),
                "filename": filepath.name,
                "extension": extension,
                "size_mb": round(size_mb, 3),
                "type": self._classify_file_type(filepath),
                "details": {}
            }
            
            # Type-specific analysis
            if extension in ['.csv', '.tsv']:
                dataset_info["details"] = self._analyze_csv(filepath)
            elif extension in ['.xlsx', '.xls']:
                dataset_info["details"] = self._analyze_excel(filepath)
            elif extension in ['.json', '.jsonl']:
                dataset_info["details"] = self._analyze_json(filepath)
            elif extension in ['.nii', '.nii.gz']:
                dataset_info["details"] = self._analyze_nifti(filepath)
            elif extension in ['.dcm', '.dicom']:
                dataset_info["details"] = {"format": "DICOM medical imaging"}
            elif extension in ['.pkl', '.pickle']:
                dataset_info["details"] = {"format": "Python pickle file"}
            elif extension in ['.h5', '.hdf5']:
                dataset_info["details"] = {"format": "HDF5 hierarchical data"}
            elif extension in ['.npy', '.npz']:
                dataset_info["details"] = self._analyze_numpy(filepath)
            elif extension in ['.txt', '.dat']:
                dataset_info["details"] = self._analyze_text(filepath)
            
            self.catalog["datasets"].append(dataset_info)
            
            # Progress indicator
            if self.catalog["total_files"] % 100 == 0:
                print(f"Scanned {self.catalog['total_files']} files...")
        
        except Exception as e:
            error_msg = f"Error analyzing {filepath}: {str(e)}"
            self.catalog["errors"].append(error_msg)
            if len(self.catalog["errors"]) <= 10:  # Only print first 10 errors
                print(f"⚠️  {error_msg}")
    
    def _classify_file_type(self, filepath: Path) -> str:
        """Classify file into medical data category."""
        name_lower = filepath.name.lower()
        
        if any(kw in name_lower for kw in ['clinical', 'patient', 'record', 'demographics']):
            return "clinical"
        elif any(kw in name_lower for kw in ['lab', 'pathology', 'blood', 'biomarker']):
            return "pathology"
        elif any(kw in name_lower for kw in ['mri', 'ct', 'imaging', 'scan', 'nifti', 'dicom']):
            return "imaging"
        elif any(kw in name_lower for kw in ['label', 'ground', 'truth', 'annotation']):
            return "labels"
        elif any(kw in name_lower for kw in ['train', 'test', 'val', 'validation']):
            return "split"
        else:
            return "unknown"
    
    def _analyze_csv(self, filepath: Path) -> Dict:
        """Analyze CSV file structure."""
        try:
            # Read first few rows only (safe, don't load entire file)
            df = pd.read_csv(filepath, nrows=5)
            
            return {
                "format": "CSV",
                "columns": list(df.columns),
                "num_columns": len(df.columns),
                "sample_dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "sample_row": df.iloc[0].to_dict() if len(df) > 0 else {}
            }
        except Exception as e:
            return {"format": "CSV", "error": str(e)}
    
    def _analyze_excel(self, filepath: Path) -> Dict:
        """Analyze Excel file structure."""
        try:
            # Read sheet names
            xl = pd.ExcelFile(filepath)
            sheets = xl.sheet_names
            
            # Read first sheet, first few rows
            df = pd.read_excel(filepath, sheet_name=sheets[0], nrows=5)
            
            return {
                "format": "Excel",
                "sheets": sheets,
                "num_sheets": len(sheets),
                "columns": list(df.columns),
                "num_columns": len(df.columns)
            }
        except Exception as e:
            return {"format": "Excel", "error": str(e)}
    
    def _analyze_json(self, filepath: Path) -> Dict:
        """Analyze JSON file structure."""
        try:
            with open(filepath, 'r') as f:
                # Read first 1000 chars to determine structure
                sample = f.read(1000)
                data = json.loads(sample if sample.endswith('}') else sample + '}')
                
                return {
                    "format": "JSON",
                    "keys": list(data.keys()) if isinstance(data, dict) else "array",
                    "structure": type(data).__name__
                }
        except Exception as e:
            return {"format": "JSON", "error": str(e)}
    
    def _analyze_nifti(self, filepath: Path) -> Dict:
        """Analyze NIfTI medical imaging file."""
        try:
            # Just get file info, don't load full image
            return {
                "format": "NIfTI",
                "medical_imaging": True,
                "note": "MRI/CT scan data - requires nibabel to load"
            }
        except Exception as e:
            return {"format": "NIfTI", "error": str(e)}
    
    def _analyze_numpy(self, filepath: Path) -> Dict:
        """Analyze NumPy file."""
        try:
            return {
                "format": "NumPy",
                "note": "Binary numpy array - requires np.load() to inspect"
            }
        except Exception as e:
            return {"format": "NumPy", "error": str(e)}
    
    def _analyze_text(self, filepath: Path) -> Dict:
        """Analyze text file."""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                first_lines = [f.readline().strip() for _ in range(3)]
            
            return {
                "format": "Text",
                "first_lines": first_lines
            }
        except Exception as e:
            return {"format": "Text", "error": str(e)}
    
    def _generate_summary(self):
        """Generate summary statistics."""
        # Group datasets by type
        by_type = {}
        for dataset in self.catalog["datasets"]:
            dtype = dataset["type"]
            if dtype not in by_type:
                by_type[dtype] = []
            by_type[dtype].append(dataset)
        
        self.catalog["summary"] = {
            "by_type": {k: len(v) for k, v in by_type.items()},
            "by_extension": {k: v["count"] for k, v in self.catalog["file_types"].items()}
        }
    
    def _save_catalog(self):
        """Save catalog to JSON file."""
        output_path = Path(__file__).parent / "dataset_catalog.json"
        
        with open(output_path, 'w') as f:
            json.dump(self.catalog, f, indent=2)
        
        print(f"\n📄 Full catalog saved to: {output_path}")


def main():
    """Run the dataset scanner."""
    print("=" * 80)
    print("📊 DATASET SCANNER - READ-ONLY MODE")
    print("=" * 80)
    print()
    print("This script will:")
    print("  ✅ Scan H:\\Downloads\\datasets folder")
    print("  ✅ Analyze all file types and structures")
    print("  ✅ Create comprehensive catalog")
    print("  ❌ NOT modify, delete, or format any files")
    print()
    print("=" * 80)
    print()
    
    scanner = DatasetScanner(root_path=r"H:\Downloads\datasets")
    catalog = scanner.safe_scan()
    
    print("\n📊 SCAN SUMMARY:")
    print(f"  • Total files: {catalog['total_files']}")
    print(f"  • Total size: {catalog['total_size_mb']:.2f} MB")
    print(f"  • File types found: {len(catalog['file_types'])}")
    print(f"  • Errors encountered: {len(catalog['errors'])}")
    
    print("\n📁 Files by type:")
    for ext, info in sorted(catalog['file_types'].items(), key=lambda x: x[1]['count'], reverse=True):
        print(f"  {ext:15} {info['count']:>6} files  ({info['total_size_mb']:>10.2f} MB)")
    
    if catalog['summary']:
        print("\n🏥 Medical data categories:")
        for dtype, count in catalog['summary']['by_type'].items():
            print(f"  {dtype:15} {count:>6} files")
    
    print("\n✅ Scan complete! Check 'dataset_catalog.json' for full details.")


if __name__ == "__main__":
    main()
