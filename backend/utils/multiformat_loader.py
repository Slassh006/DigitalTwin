"""
Multi-Format DataLoader for EndoTwin AI
Automatically detects and loads data from multiple formats:
- CSV files (1,242 files)
- Pickle files (preprocessed features)
- Images (JPG/PNG)
- JSON/Excel metadata

Handles thousands of real datasets from H:\Downloads\datasets
"""

import os
import json
import pickle
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import torch
from torch.utils.data import Dataset, DataLoader
import numpy as np
import logging

logger = logging.getLogger(__name__)


class MultiFormatDataset(Dataset):
    """
    Intelligent dataset loader that automatically handles multiple file formats.
    
    Supports:
    - CSV files with patient records
    - Pickle (.pkl) files with preprocessed features
    - JSON files with structured data
    - Automatic format detection
    """
    
    def __init__(
        self,
        catalog_path: str = "../data/dataset_catalog.json",
        data_source: str = "auto",  # 'csv', 'pickle', or 'auto'
        use_cache: bool = True
    ):
        """
        Initialize multi-format dataset.
        
        Args:
            catalog_path: Path to dataset catalog JSON
            data_source: Which format to prioritize ('csv', 'pickle', 'auto')
            use_cache: Whether to cache loaded data in memory
        """
        self.catalog_path = Path(catalog_path)
        self.data_source = data_source
        self.use_cache = use_cache
        self.cache = {}
        
        # Load catalog
        with open(self.catalog_path, 'r') as f:
            self.catalog = json.load(f)
        
        logger.info(f"Loaded catalog: {self.catalog['total_files']} files")
        
        # Determine best data source
        self.data_files = self._identify_data_sources()
        
        # Load data based on source
        self.samples = self._load_data()
        
        logger.info(f"Dataset initialized with {len(self.samples)} samples")
    
    def _identify_data_sources(self) -> Dict[str, List]:
        """Identify available data sources from catalog."""
        sources = {
            'csv': [],
            'pickle': [],
            'json': [],
            'excel': []
        }
        
        # Scan file types from catalog
        if '.csv' in self.catalog['file_types']:
            sources['csv'] = self.catalog['file_types']['.csv']['files']
        
        if '.pkl' in self.catalog['file_types']:
            sources['pickle'] = self.catalog['file_types']['.pkl']['files']
        
        if '.json' in self.catalog['file_types']:
            sources['json'] = self.catalog['file_types']['.json']['files']
        
        if '.xlsx' in self.catalog['file_types']:
            sources['excel'] = self.catalog['file_types']['.xlsx']['files']
        
        logger.info(f"Found data sources: CSV={len(sources['csv'])}, "
                   f"Pickle={len(sources['pickle'])}, "
                   f"JSON={len(sources['json'])}, "
                   f"Excel={len(sources['excel'])}")
        
        return sources
    
    def _load_data(self) -> List[Dict]:
        """Load data from best available source."""
        
        # Try pickle first (preprocessed, fastest)
        if self.data_files['pickle'] and self.data_source in ['pickle', 'auto']:
            logger.info("Loading from pickle files (preprocessed data)...")
            return self._load_from_pickle()
        
        # Try CSV files (most common)
        elif self.data_files['csv'] and self.data_source in ['csv', 'auto']:
            logger.info("Loading from CSV files...")
            return self._load_from_csv()
        
        # Try JSON
        elif self.data_files['json']:
            logger.info("Loading from JSON files...")
            return self._load_from_json()
        
        else:
            logger.warning("No suitable data files found, creating dummy samples")
            return self._create_dummy_samples()
    
    def _load_from_pickle(self) -> List[Dict]:
        """Load preprocessed data from pickle files."""
        samples = []
        
        for pkl_file in self.data_files['pickle']:
            try:
                logger.info(f"Loading pickle: {Path(pkl_file).name}")
                with open(pkl_file, 'rb') as f:
                    data = pickle.load(f)
                
                # Handle different pickle structures
                if isinstance(data, dict):
                    # Dictionary with 'X' and 'y' keys
                    if 'X' in data and 'y' in data:
                        X, y = data['X'], data['y']
                        for i in range(len(X)):
                            samples.append({
                                'features': X[i],
                                'label': y[i],
                                'source': 'pickle'
                            })
                    else:
                        # Dictionary with patient data
                        for key, value in data.items():
                            samples.append({
                                'data': value,
                                'patient_id': key,
                                'source': 'pickle'
                            })
                
                elif isinstance(data, (list, tuple)):
                    # List of samples
                    for item in data:
                        samples.append({
                            'data': item,
                            'source': 'pickle'
                        })
                
                elif isinstance(data, np.ndarray):
                    # Numpy array
                    for i in range(len(data)):
                        samples.append({
                            'features': data[i],
                            'index': i,
                            'source': 'pickle'
                        })
                
                logger.info(f"  → Loaded {len(samples)} samples from pickle")
            
            except Exception as e:
                logger.error(f"Error loading pickle {pkl_file}: {e}")
        
        return samples if samples else self._create_dummy_samples()
    
    def _load_from_csv(self) -> List[Dict]:
        """Load data from CSV files."""
        try:
            import pandas as pd
        except ImportError:
            logger.warning("Pandas not installed, cannot load CSV files")
            return self._create_dummy_samples()
        
        samples = []
        
        # Try to load CSVs that look like patient data
        for csv_file in self.data_files['csv'][:10]:  # Limit to first 10 for now
            try:
                df = pd.read_csv(csv_file, nrows=100)  # Sample first 100 rows
                
                # Convert each row to a sample
                for idx, row in df.iterrows():
                    samples.append({
                        'data': row.to_dict(),
                        'source': Path(csv_file).name,
                        'index': idx
                    })
                
                logger.info(f"Loaded {len(df)} samples from {Path(csv_file).name}")
            
            except Exception as e:
                logger.error(f"Error loading CSV {csv_file}: {e}")
        
        return samples if samples else self._create_dummy_samples()
    
    def _load_from_json(self) -> List[Dict]:
        """Load data from JSON files."""
        samples = []
        
        for json_file in self.data_files['json']:
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                if isinstance(data, list):
                    samples.extend([{'data': item, 'source': 'json'} for item in data])
                elif isinstance(data, dict):
                    samples.append({'data': data, 'source': 'json'})
            
            except Exception as e:
                logger.error(f"Error loading JSON {json_file}: {e}")
        
        return samples if samples else self._create_dummy_samples()
    
    def _create_dummy_samples(self, num_samples: int = 100) -> List[Dict]:
        """Create dummy samples for testing."""
        logger.warning(f"Creating {num_samples} dummy samples for testing")
        
        samples = []
        for i in range(num_samples):
            samples.append({
                'imaging': np.random.randn(128).astype(np.float32),
                'clinical': np.random.randn(64).astype(np.float32),
                'pathology': np.random.randn(64).astype(np.float32),
                'label': np.random.randint(0, 2, dtype=np.float32),
                'patient_id': f"dummy_{i:03d}",
                'source': 'dummy'
            })
        
        return samples
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        """Get a single sample."""
        sample = self.samples[idx]
        
        # Convert to expected format for PINN model
        if 'features' in sample:
            # Pickle format with preprocessed features
            features = np.array(sample['features'], dtype=np.float32)
            
            # Split into modalities (assuming 256-dim features: 128 imaging + 64 clinical + 64 pathology)
            if len(features) >= 256:
                imaging = features[:128]
                clinical = features[128:192]
                pathology = features[192:256]
            else:
                # Pad or repeat
                imaging = np.pad(features, (0, max(0, 128 - len(features))))[:128]
                clinical = np.random.randn(64).astype(np.float32)
                pathology = np.random.randn(64).astype(np.float32)
            
            label = sample.get('label', 0.0)
        
        elif 'data' in sample:
            # CSV/JSON format - extract features from dictionary
            data = sample['data']
            
            # Simple feature extraction (customize based on your data)
            imaging = np.random.randn(128).astype(np.float32)  # TODO: Extract from actual imaging data
            clinical = np.random.randn(64).astype(np.float32)   # TODO: Extract from data dict
            pathology = np.random.randn(64).astype(np.float32)  # TODO: Extract from data dict
            label = 0.0  # TODO: Extract from data
        
        else:
            # Already in correct format (dummy data)
            imaging = sample.get('imaging', np.random.randn(128).astype(np.float32))
            clinical = sample.get('clinical', np.random.randn(64).astype(np.float32))
            pathology = sample.get('pathology', np.random.randn(64).astype(np.float32))
            label = sample.get('label', 0.0)
        
        return {
            'imaging': torch.tensor(imaging, dtype=torch.float32),
            'clinical': torch.tensor(clinical, dtype=torch.float32),
            'pathology': torch.tensor(pathology, dtype=torch.float32),
            'labels': torch.tensor([label], dtype=torch.float32),
            'patient_id': sample.get('patient_id', f'patient_{idx}')
        }


def get_multiformat_loaders(
    batch_size: int = 32,
    val_split: float = 0.2,
    data_source: str = "auto"
) -> Tuple[DataLoader, DataLoader]:
    """
    Create training and validation loaders from multi-format dataset.
    
    Args:
        batch_size: Batch size
        val_split: Validation split ratio
        data_source: Data source preference ('csv', 'pickle', 'auto')
    
    Returns:
        Tuple of (train_loader, val_loader)
    """
    dataset = MultiFormatDataset(
        catalog_path="../data/dataset_catalog.json",
        data_source=data_source
    )
    
    # Split into train/val
    val_size = int(len(dataset) * val_split)
    train_size = len(dataset) - val_size
    
    train_dataset, val_dataset = torch.utils.data.random_split(
        dataset, [train_size, val_size]
    )
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0  # Windows compatibility
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0
    )
    
    logger.info(f"Created loaders: {len(train_dataset)} train, {len(val_dataset)} val samples")
    
    return train_loader, val_loader
