"""
Lightweight Dataset Scanner - No external dependencies required
Scans H:\Downloads\datasets folder safely (READ-ONLY) and creates comprehensive catalog.
NO FILES WILL BE MODIFIED, DELETED, OR FORMATTED.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime


class LightweightDatasetScanner:
    """
    Safe, read-only scanner for medical datasets.
    Uses only Python standard library - no external dependencies.
    """
    
    def __init__(self, root_path: str = r"H:\Downloads\datasets"):
        self.root_path = Path(root_path)
        self.catalog = {
            "scan_date": datetime.now().isoformat(),
            "root_path": str(self.root_path),
            "total_files": 0,
            "total_size_mb": 0.0,
            "file_types": {},
            "datasets_by_type": {
                "clinical": [],
                "pathology": [],
                "imaging": [],
                "labels": [],
                "unknown": []
            },
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
        print("-" * 100)
        
        if not self.root_path.exists():
            error_msg = f"Path does not exist: {self.root_path}"
            print(f"❌ {error_msg}")
            self.catalog["errors"].append(error_msg)
            return self.catalog
        
        # Walk through directory tree
        print(f"\n📂 Scanning directory tree...")
        for root, dirs, files in os.walk(self.root_path):
            for file in files:
                self._analyze_file(Path(root) / file)
        
        # Save catalog
        self._save_catalog()
        
        # Print summary
        self._print_summary()
        
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
            
            # Track by extension
            if extension not in self.catalog["file_types"]:
                self.catalog["file_types"][extension] = {
                    "count": 0,
                    "total_size_mb": 0.0,
                    "files": []
                }
            
            self.catalog["file_types"][extension]["count"] += 1
            self.catalog["file_types"][extension]["total_size_mb"] += size_mb
            self.catalog["file_types"][extension]["files"].append(str(filepath))
            
            # Classify by medical data type
            file_type = self._classify_file_type(filepath)
            
            self.catalog["datasets_by_type"][file_type].append({
                "filepath": str(filepath),
                "filename": filepath.name,
                "extension": extension,
                "size_mb": round(size_mb, 3),
                "relative_path": str(filepath.relative_to(self.root_path))
            })
            
            # Progress indicator
            if self.catalog["total_files"] % 100 == 0:
                print(f"  Scanned {self.catalog['total_files']} files...", end='\r')
        
        except Exception as e:
            error_msg = f"Error analyzing {filepath.name}: {str(e)}"
            self.catalog["errors"].append(error_msg)
    
    def _classify_file_type(self, filepath: Path) -> str:
        """Classify file into medical data category."""
        name_lower = filepath.name.lower()
        parent_lower = filepath.parent.name.lower()
        
        # Check filename and parent directory for keywords
        if any(kw in name_lower or kw in parent_lower for kw in ['clinical', 'patient', 'record', 'demographics', 'ehr']):
            return "clinical"
        elif any(kw in name_lower or kw in parent_lower for kw in ['lab', 'pathology', 'blood', 'biomarker', 'test']):
            return "pathology"
        elif any(kw in name_lower or kw in parent_lower for kw in ['mri', 'ct', 'imaging', 'scan', 'nifti', 'dicom', 'x-ray', 'ultrasound']):
            return "imaging"
        elif any(kw in name_lower or kw in parent_lower for kw in ['label', 'ground', 'truth', 'annotation', 'diagnosis']):
            return "labels"
        else:
            return "unknown"
    
    def _save_catalog(self):
        """Save catalog to JSON file in backend/data directory."""
        # Save to backend/data directory
        backend_data_dir = Path(__file__).parent.parent / "data"
        backend_data_dir.mkdir(exist_ok=True)
        output_path = backend_data_dir / "dataset_catalog.json"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.catalog, f, indent=2)
        
        print(f"\n\n💾 Full catalog saved to: {output_path}")
    
    def _print_summary(self):
        """Print comprehensive summary."""
        print("\n" + "=" * 100)
        print("✅ SCAN COMPLETED SUCCESSFULLY!")
        print("=" * 100)
        
        print(f"\n📊 OVERALL STATISTICS:")
        print(f"  • Total files scanned: {self.catalog['total_files']:,}")
        print(f"  • Total size: {self.catalog['total_size_mb']:,.2f} MB ({self.catalog['total_size_mb']/1024:.2f} GB)")
        print(f"  • Unique file types: {len(self.catalog['file_types'])}")
        print(f"  • Errors encountered: {len(self.catalog['errors'])}")
        
        print(f"\n📁 FILES BY EXTENSION:")
        sorted_extensions = sorted(self.catalog['file_types'].items(), key=lambda x: x[1]['count'], reverse=True)
        for ext, info in sorted_extensions[:20]:  # Top 20
            ext_display = ext if ext else "(no extension)"
            print(f"  {ext_display:20} {info['count']:>8,} files  |  {info['total_size_mb']:>12,.2f} MB")
        
        if len(sorted_extensions) > 20:
            print(f"  ... and {len(sorted_extensions) - 20} more file types")
        
        print(f"\n🏥 MEDICAL DATA CATEGORIES:")
        for category, files in self.catalog["datasets_by_type"].items():
            if files:
                total_size = sum(f["size_mb"] for f in files)
                print(f"  {category.upper():15} {len(files):>8,} files  |  {total_size:>12,.2f} MB")
                
                # Show file type breakdown for this category
                type_counts = {}
                for f in files:
                    ext = f["extension"] if f["extension"] else "(no ext)"
                    type_counts[ext] = type_counts.get(ext, 0) + 1
                
                for ext, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
                    print(f"    → {ext:15} {count:>6,} files")
        
        if self.catalog["errors"]:
            print(f"\n⚠️  ERRORS (First 10):")
            for error in self.catalog["errors"][:10]:
                print(f"  • {error}")
        
        print("\n" + "=" * 100)
        print(f"📄 Detailed catalog saved to: backend/data/dataset_catalog.json")
        print(f"   You can open this JSON file to see ALL file details")
        print("=" * 100)


def main():
    """Run the dataset scanner."""
    print("=" * 100)
    print(" " * 30 + "📊 DATASET SCANNER - READ-ONLY MODE")
    print("=" * 100)
    print()
    print("This script will:")
    print("  ✅ Scan H:\\Downloads\\datasets folder recursively")
    print("  ✅ Analyze all file types and structures")
    print("  ✅ Classify files into medical categories (clinical, pathology, imaging, labels)")
    print("  ✅ Create comprehensive JSON catalog")
    print("  ❌ NOT modify, delete, or format ANY files (100% safe)")
    print()
    print("=" * 100)
    print()
    
    input("Press ENTER to start scanning... (or Ctrl+C to cancel)")
    print()
    
    scanner = LightweightDatasetScanner(root_path=r"H:\Downloads\datasets")
    catalog = scanner.safe_scan()
    
    print("\n✨ NEXT STEPS:")
    print("  1. Review the catalog: backend/data/dataset_catalog.json")
    print("  2. Check which data types you have most")
    print("  3. I'll update the DataLoader to handle ALL your data formats")
    print("  4. Your system will be ready to train on thousands of real datasets!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Scan cancelled by user.")
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
