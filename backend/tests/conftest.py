"""
pytest conftest: adds the backend/ directory to sys.path so that
'from utils.xxx import ...' works regardless of where pytest is invoked from.
"""
import sys
import pathlib

# backend/ directory
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
