"""
Training history utility for tracking model training metrics over time.
"""

import json
import os
from typing import List, Dict, Any
from datetime import datetime

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "../data/training_history.json")


class TrainingHistoryManager:
    def __init__(self):
        self.history_file = HISTORY_FILE
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create training_history.json if it doesn't exist"""
        os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
        if not os.path.exists(self.history_file):
            with open(self.history_file, 'w') as f:
                json.dump({
                    "training_runs": [],
                    "model_metrics": {
                        "accuracy": None,
                        "precision": None,
                        "recall": None,
                        "f1_score": None
                    }
                }, f)

    def _read_history(self) -> Dict[str, Any]:
        """Read training history from file"""
        try:
            with open(self.history_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {
                "training_runs": [],
                "model_metrics": {
                    "accuracy": None,
                    "precision": None,
                    "recall": None,
                    "f1_score": None
                }
            }

    def _write_history(self, history: Dict[str, Any]):
        """Write training history to file"""
        with open(self.history_file, 'w') as f:
            json.dump(history, f, indent=2)

    def add_training_run(self, epochs_data: List[Dict[str, Any]]):
        """Add a new training run with epoch-by-epoch data"""
        history = self._read_history()
        
        run = {
            "run_id": len(history["training_runs"]) + 1,
            "timestamp": datetime.utcnow().isoformat(),
            "epochs": epochs_data,
            "final_loss": epochs_data[-1]["loss"] if epochs_data else None
        }
        
        history["training_runs"].append(run)
        self._write_history(history)
        return run

    def update_metrics(self, metrics: Dict[str, float]):
        """Update model performance metrics"""
        history = self._read_history()
        history["model_metrics"].update(metrics)
        self._write_history(history)
        return history["model_metrics"]

    def get_all_runs(self) -> List[Dict[str, Any]]:
        """Get all training runs"""
        history = self._read_history()
        return history.get("training_runs", [])

    def get_latest_run(self) -> Dict[str, Any]:
        """Get the most recent training run"""
        runs = self.get_all_runs()
        return runs[-1] if runs else None

    def get_metrics(self) -> Dict[str, Any]:
        """Get current model metrics"""
        history = self._read_history()
        return history.get("model_metrics", {})


# Global instance
training_history_manager = TrainingHistoryManager()
