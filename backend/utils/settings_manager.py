"""
Settings management utility for storing and retrieving application settings.
Uses JSON file storage.
"""

import json
import os
from typing import Dict, Any

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "../data/settings.json")

DEFAULT_SETTINGS = {
    "learning_rate": 0.001,
    "batch_size": 32,
    "physics_loss_weight": 0.1,
    "epochs": 10,
    "theme": "dark",
    "notifications_enabled": False
}


class SettingsManager:
    def __init__(self):
        self.settings_file = SETTINGS_FILE
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        """Create settings.json with defaults if it doesn't exist"""
        os.makedirs(os.path.dirname(self.settings_file), exist_ok=True)
        if not os.path.exists(self.settings_file):
            self._write_settings(DEFAULT_SETTINGS)

    def _read_settings(self) -> Dict[str, Any]:
        """Read settings from file"""
        try:
            with open(self.settings_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return DEFAULT_SETTINGS.copy()

    def _write_settings(self, settings: Dict[str, Any]):
        """Write settings to file"""
        with open(self.settings_file, 'w') as f:
            json.dump(settings, f, indent=2)

    def get_settings(self) -> Dict[str, Any]:
        """Get current settings"""
        return self._read_settings()

    def update_settings(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update settings with new values"""
        settings = self._read_settings()
        settings.update(updates)
        self._write_settings(settings)
        return settings

    def get_defaults(self) -> Dict[str, Any]:
        """Get default settings"""
        return DEFAULT_SETTINGS.copy()

    def reset_to_defaults(self) -> Dict[str, Any]:
        """Reset all settings to defaults"""
        self._write_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()


# Global instance
settings_manager = SettingsManager()
