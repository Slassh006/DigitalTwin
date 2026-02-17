"""
Data Inspector - Deep Analysis Tool
Inspects pickle files, CSV schemas, and creates unified data mapping.
"""

import os
import json
import pickle
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict


class DataInspector:
    """
    Inspects specific datasets to understand their structure.
    """
    
    def __init__(self, catalog_path: str = None):
        if catalog_path is None:
            # Default to backend/data/dataset_catalog.json relative to this script
            script_dir = Path(__file__).parent
            catalog_path = script_dir.parent / "data" / "dataset_catalog.json"
        
        with open(catalog_path, 'r') as f:
            self.catalog = json.load(f)
        
        self.report = {
            "pickle_files": {},
            "csv_schemas": {},
            "dataset_mapping": {}
        }
    
    def inspect_pickle_files(self):
        """Inspect the large pickle files to understand their structure."""
        print("\n" + "=" * 80)
        print("🔍 INSPECTING PICKLE FILES (1.7 GB)")
        print("=" * 80)
        
        pickle_files = self.catalog['file_types'].get('.pkl', {}).get('files', [])
        
        for pkl_path in pickle_files:
            print(f"\n📦 Loading: {Path(pkl_path).name}")
            print(f"   Size: {Path(pkl_path).stat().st_size / (1024**2):.2f} MB")
            
            try:
                # Try to load the pickle file
                print("   Loading...")
                with open(pkl_path, 'rb') as f:
                    data = pickle.load(f)
                
                # Analyze structure
                pkl_info = self._analyze_pickle_structure(data)
                pkl_info['filepath'] = pkl_path
                
                self.report['pickle_files'][Path(pkl_path).name] = pkl_info
                
                # Print summary
                print(f"   ✅ Type: {pkl_info['type']}")
                print(f"   ✅ Shape: {pkl_info['shape']}")
                if 'keys' in pkl_info:
                    print(f"   ✅ Keys: {', '.join(list(pkl_info['keys'])[:5])}")
                
            except Exception as e:
                print(f"   ❌ Error: {e}")
                self.report['pickle_files'][Path(pkl_path).name] = {
                    'error': str(e),
                    'filepath': pkl_path
                }
    
    def _analyze_pickle_structure(self, data: Any) -> Dict:
        """Analyze the structure of pickled data."""
        import numpy as np
        
        info = {
            'type': type(data).__name__,
            'shape': None,
            'sample': None
        }
        
        if isinstance(data, dict):
            info['shape'] = f"dict with {len(data)} keys"
            info['keys'] = list(data.keys())[:20]  # First 20 keys
            
            # Sample first value
            first_key = list(data.keys())[0]
            info['sample_key'] = first_key
            info['sample_value_type'] = type(data[first_key]).__name__
            
            if isinstance(data[first_key], np.ndarray):
                info['sample_value_shape'] = data[first_key].shape
        
        elif isinstance(data, (list, tuple)):
            info['shape'] = f"{len(data)} items"
            if len(data) > 0:
                info['item_type'] = type(data[0]).__name__
                if hasattr(data[0], 'shape'):
                    info['item_shape'] = data[0].shape
        
        elif isinstance(data, np.ndarray):
            info['shape'] = data.shape
            info['dtype'] = str(data.dtype)
        
        return info
    
    def sample_csv_schemas(self, num_samples: int = 20):
        """Sample multiple CSV files to identify common schemas."""
        print("\n" + "=" * 80)
        print(f"📊 SAMPLING CSV SCHEMAS (First {num_samples} files)")
        print("=" * 80)
        
        csv_files = self.catalog['file_types'].get('.csv', {}).get('files', [])
        
        # Try importing pandas
        try:
            import pandas as pd
            has_pandas = True
        except ImportError:
            print("⚠️  Pandas not available, using basic CSV parsing")
            has_pandas = False
        
        schemas = defaultdict(list)  # Group files by schema
        
        for i, csv_path in enumerate(csv_files[:num_samples]):
            print(f"\n[{i+1}/{min(num_samples, len(csv_files))}] {Path(csv_path).name}")
            
            try:
                if has_pandas:
                    # Use pandas
                    df = pd.read_csv(csv_path, nrows=3)
                    columns = df.columns.tolist()
                    dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
                    
                    schema_key = tuple(sorted(columns))
                    schemas[schema_key].append({
                        'file': csv_path,
                        'columns': columns,
                        'dtypes': dtypes,
                        'num_rows': len(df)
                    })
                    
                    print(f"   Columns ({len(columns)}): {', '.join(columns[:5])}...")
                
                else:
                    # Basic CSV parsing
                    with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
                        header = f.readline().strip().split(',')
                        schema_key = tuple(sorted(header))
                        schemas[schema_key].append({
                            'file': csv_path,
                            'columns': header
                        })
                        print(f"   Columns ({len(header)}): {', '.join(header[:5])}...")
            
            except Exception as e:
                print(f"   ❌ Error: {e}")
        
        # Summarize schemas
        print("\n" + "=" * 80)
        print(f"📋 SCHEMA SUMMARY: Found {len(schemas)} unique schemas")
        print("=" * 80)
        
        for i, (schema_key, files) in enumerate(schemas.items(), 1):
            print(f"\nSchema #{i}: {len(files)} files")
            print(f"  Columns: {', '.join(list(schema_key)[:10])}")
            print(f"  Example: {Path(files[0]['file']).name}")
        
        self.report['csv_schemas'] = {
            f"schema_{i}": {
                'columns': list(schema_key),
                'num_files': len(files),
                'examples': [Path(f['file']).name for f in files[:3]]
            }
            for i, (schema_key, files) in enumerate(schemas.items(), 1)
        }
    
    def create_data_mapping(self):
        """Create a mapping of data files to their usage in the system."""
        print("\n" + "=" * 80)
        print("🗺️  CREATING DATA USAGE MAPPING")
        print("=" * 80)
        
        mapping = {
            "imaging": {
                "files": [],
                "description": "Medical images for lesion detection",
                "formats": [".jpg", ".png"],
                "total_files": 0
            },
            "clinical": {
                "files": [],
                "description": "Patient clinical records",
                "formats": [".csv", ".xlsx"],
                "total_files": 0
            },
            "pathology": {
                "files": [],
                "description": "Pathology and biomarker data",
                "formats": [".csv", ".xlsx"],
                "total_files": 0
            },
            "sensors": {
                "files": [],
                "description": "Physiological sensor data (WESAD)",
                "formats": [".pkl", ".csv", ".txt"],
                "total_files": 0
            },
            "preprocessed": {
                "files": [],
                "description": "Pre-processed feature embeddings",
                "formats": [".pkl"],
                "total_files": 0
            }
        }
        
        # Classify based on file paths and names
        for dataset_type, file_list in self.catalog['datasets_by_type'].items():
            for file_info in file_list[:100]:  # Sample first 100
                filepath = file_info['filepath']
                path_lower = filepath.lower()
                name_lower = file_info['filename'].lower()
                
                # Classify
                if 'imaging' in path_lower or 'endotect' in path_lower or 'uterus' in path_lower:
                    mapping['imaging']['files'].append(filepath)
                elif 'patient' in path_lower or 'characteristics' in path_lower:
                    mapping['clinical']['files'].append(filepath)
                elif 'pathology' in path_lower or 'microbiota' in path_lower or 'gut' in path_lower:
                    mapping['pathology']['files'].append(filepath)
                elif 'wesad' in path_lower or 'sensor' in path_lower:
                    mapping['sensors']['files'].append(filepath)
                elif file_info['extension'] == '.pkl':
                    mapping['preprocessed']['files'].append(filepath)
        
        for category, info in mapping.items():
            info['total_files'] = len(info['files'])
            print(f"\n{category.upper():15} {info['total_files']:>6} files")
        
        self.report['dataset_mapping'] = mapping
    
    def save_report(self):
        """Save the inspection report."""
        output_path = Path(__file__).parent.parent / "data" / "data_inspection_report.json"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, indent=2)
        
        print(f"\n💾 Report saved to: {output_path}")
        
        return output_path


def main():
    """Run the data inspector."""
    print("=" * 80)
    print(" " * 25 + "🔬 DATA INSPECTOR")
    print("=" * 80)
    
    inspector = DataInspector()  # Uses default path
    
    # 1. Inspect pickle files
    inspector.inspect_pickle_files()
    
    # 2. Sample CSV schemas
    inspector.sample_csv_schemas(num_samples=30)
    
    # 3. Create data mapping
    inspector.create_data_mapping()
    
    # 4. Save report
    output_path = inspector.save_report()
    
    print("\n" + "=" * 80)
    print("✅ INSPECTION COMPLETE!")
    print("=" * 80)
    print(f"\nReports generated:")
    print(f"  • Dataset catalog: backend/data/dataset_catalog.json")
    print(f"  • Inspection report: {output_path}")
    print(f"\nNext: Use this data to configure the MultiFormatDataset class!")


if __name__ == "__main__":
    main()
