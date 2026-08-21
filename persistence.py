from __future__ import annotations

import json
import os
import threading
import time
from typing import Any, Dict

import folder_paths

from .models import default_project


class TimelinePersistence:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.base_dir = folder_paths.get_system_user_directory("timeline_bridge")
        self.project_path = os.path.join(self.base_dir, "timeline_project.json")
        self.history_dir = os.path.join(self.base_dir, "history")
        self.history_limit = 100
        os.makedirs(self.base_dir, exist_ok=True)
        os.makedirs(self.history_dir, exist_ok=True)

    def load_project(self) -> Dict[str, Any]:
        with self._lock:
            if not os.path.exists(self.project_path):
                return default_project()

            try:
                with open(self.project_path, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                if not isinstance(data, dict):
                    return default_project()
                return data
            except Exception:
                return default_project()

    def save_project(self, project: Dict[str, Any]) -> None:
        with self._lock:
            os.makedirs(self.base_dir, exist_ok=True)
            os.makedirs(self.history_dir, exist_ok=True)
            temp_path = f"{self.project_path}.tmp"
            with open(temp_path, "w", encoding="utf-8") as fh:
                json.dump(project, fh, ensure_ascii=False, indent=2)
            os.replace(temp_path, self.project_path)
        # History snapshot and pruning happen outside the main lock so that
        # slow file I/O does not block concurrent reads.
        self._save_history_snapshot(project)

    def _save_history_snapshot(self, project: Dict[str, Any]) -> None:
        ts = int(time.time() * 1000)
        path = os.path.join(self.history_dir, f"timeline_project_{ts}.json")
        tmp = f"{path}.tmp"
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(project, fh, ensure_ascii=False, indent=2)
            os.replace(tmp, path)
        except Exception:
            try:
                if os.path.exists(tmp):
                    os.remove(tmp)
            except Exception:
                pass
            return

        # Collect files to prune BEFORE releasing the lock; delete them AFTER.
        # This keeps the lock held only for fast in-memory work, not for disk I/O.
        files = sorted(
            os.path.join(self.history_dir, name)
            for name in os.listdir(self.history_dir)
            if name.startswith("timeline_project_") and name.endswith(".json")
        )
        to_delete = files[: max(0, len(files) - self.history_limit)]

        # Delete old snapshots outside the lock — slow I/O, no shared state modified.
        for old_path in to_delete:
            try:
                os.remove(old_path)
            except Exception:
                continue

    def list_history(self) -> list[dict[str, Any]]:
        with self._lock:
            if not os.path.isdir(self.history_dir):
                return []
            out = []
            for name in os.listdir(self.history_dir):
                if not name.startswith("timeline_project_") or not name.endswith(".json"):
                    continue
                path = os.path.join(self.history_dir, name)
                try:
                    st = os.stat(path)
                    out.append(
                        {
                            "id": name,
                            "path": path,
                            "size": int(st.st_size),
                            "mtime_ms": int(st.st_mtime * 1000),
                        }
                    )
                except Exception:
                    continue
            out.sort(key=lambda item: item["mtime_ms"], reverse=True)
            return out

    def load_history_item(self, history_id: str) -> Dict[str, Any]:
        with self._lock:
            filename = os.path.basename(history_id)
            path = os.path.join(self.history_dir, filename)
            if not os.path.isfile(path):
                raise FileNotFoundError(history_id)
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if not isinstance(data, dict):
                raise ValueError("Invalid history snapshot")
            return data
