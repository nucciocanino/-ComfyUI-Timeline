from __future__ import annotations

import copy
import os
import time
from typing import Any, Dict, List

import server

from .comfy_adapter import ComfyPromptAdapter
from .models import Clip, default_project, default_shortcuts, default_snap_settings, now_ms
from .persistence import TimelinePersistence


class TimelineService:
    def __init__(self, persistence: TimelinePersistence, comfy_adapter: ComfyPromptAdapter) -> None:
        self._persistence = persistence
        self._comfy = comfy_adapter
        self._project = self._normalize_project(self._persistence.load_project())
        # Seed demo clips only when no project file exists yet (first run on a new installation).
        # Using os.path.exists avoids re-adding demos every time the user clears all clips.
        # Also batches both clips into a single _save() instead of two separate disk writes.
        if not self._persistence.project_path or not os.path.exists(self._persistence.project_path):
            if not self._project["clips"]:
                self._project["clips"].append(
                    Clip.from_dict(
                        {
                            "track_id": "video-1",
                            "start_time": 0,
                            "duration": 5,
                            "prompt": "Opening shot - wide view",
                            "type": "video",
                        }
                    ).to_dict()
                )
                self._project["clips"].append(
                    Clip.from_dict(
                        {
                            "track_id": "video-1",
                            "start_time": 5,
                            "duration": 3,
                            "prompt": "Medium shot - character enters",
                            "type": "video",
                        }
                    ).to_dict()
                )
                self._save()  # single write instead of two

    @property
    def storage_path(self) -> str:
        return self._persistence.project_path

    def _normalize_project(self, project: Dict[str, Any] | None) -> Dict[str, Any]:
        base = default_project()
        if not isinstance(project, dict):
            return base

        timeline = project.get("timeline") if isinstance(project.get("timeline"), dict) else {}
        frame = timeline.get("frame") if isinstance(timeline.get("frame"), dict) else {}
        loop_range = timeline.get("loop_range") if isinstance(timeline.get("loop_range"), dict) else {}
        snap = timeline.get("snap") if isinstance(timeline.get("snap"), dict) else {}
        snap_enabled = snap.get("enabled") if isinstance(snap.get("enabled"), dict) else {}
        shortcuts = timeline.get("shortcuts") if isinstance(timeline.get("shortcuts"), dict) else {}
        base_frame = base["timeline"]["frame"]
        base_loop = base["timeline"]["loop_range"]
        base_snap = default_snap_settings()
        base_shortcuts = default_shortcuts()
        bin_data = project.get("bin") if isinstance(project.get("bin"), dict) else {}
        base_bin = base["bin"]
        normalized = {
            "version": int(project.get("version", 1)),
            "updated_at": int(project.get("updated_at", now_ms())),
            "timeline": {
                "duration": float(timeline.get("duration", base["timeline"]["duration"])),
                "fps": int(timeline.get("fps", base["timeline"]["fps"])),
                "playhead_position": float(
                    timeline.get("playhead_position", base["timeline"]["playhead_position"])
                ),
                "is_playing": bool(timeline.get("is_playing", base["timeline"]["is_playing"])),
                "markers": list(timeline.get("markers", base["timeline"].get("markers", []))),
                "loop_range": {
                    "in": float(loop_range.get("in", base_loop["in"])),
                    "out": (
                        float(loop_range.get("out"))
                        if loop_range.get("out") is not None
                        else base_loop["out"]
                    ),
                    "enabled": bool(loop_range.get("enabled", base_loop["enabled"])),
                },
                "snap": {
                    "enabled": {
                        "edge": bool(snap_enabled.get("edge", base_snap["enabled"]["edge"])),
                        "marker": bool(snap_enabled.get("marker", base_snap["enabled"]["marker"])),
                        "playhead": bool(
                            snap_enabled.get("playhead", base_snap["enabled"]["playhead"])
                        ),
                        "grid": bool(snap_enabled.get("grid", base_snap["enabled"]["grid"])),
                    },
                    "grid_step": float(snap.get("grid_step", base_snap["grid_step"])),
                },
                "shortcuts": {
                    key: str(shortcuts.get(key, default_value))
                    for key, default_value in base_shortcuts.items()
                },
                "proxy_quality": str(timeline.get("proxy_quality", "full")),
                "frame": {
                    "name": str(frame.get("name", base_frame["name"])),
                    "width": int(frame.get("width", base_frame["width"])),
                    "height": int(frame.get("height", base_frame["height"])),
                },
            },
            "tracks": list(project.get("tracks", base["tracks"])),
            "clips": [Clip.from_dict(item).to_dict() for item in project.get("clips", [])],
            "bin": {
                "view_mode": str(bin_data.get("view_mode", base_bin["view_mode"])),
                "folders": list(bin_data.get("folders", base_bin["folders"])),
                "assets": list(bin_data.get("assets", base_bin["assets"])),
                "selected_folder_id": str(
                    bin_data.get("selected_folder_id", base_bin["selected_folder_id"])
                ),
            },
        }
        if not normalized["bin"]["folders"]:
            normalized["bin"]["folders"] = list(base_bin["folders"])
        if normalized["bin"]["view_mode"] not in {"grid", "list"}:
            normalized["bin"]["view_mode"] = "grid"
        if normalized["timeline"]["proxy_quality"] not in {"full", "half", "quarter"}:
            normalized["timeline"]["proxy_quality"] = "full"
        if normalized["timeline"]["snap"]["grid_step"] <= 0:
            normalized["timeline"]["snap"]["grid_step"] = base_snap["grid_step"]
        return normalized

    def _migrate_project_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Import payload supports:
        - raw project object
        - wrapped object: { schema_version, exported_at, project }
        """
        if "project" in payload and isinstance(payload.get("project"), dict):
            project = copy.deepcopy(payload["project"])
        else:
            project = copy.deepcopy(payload)

        version = project.get("version")
        if version is None:
            project["version"] = 1

        if "timeline" not in project or not isinstance(project.get("timeline"), dict):
            project["timeline"] = default_project()["timeline"]

        if "tracks" not in project or not isinstance(project.get("tracks"), list):
            project["tracks"] = default_project()["tracks"]

        if "clips" not in project or not isinstance(project.get("clips"), list):
            project["clips"] = []

        if "bin" not in project or not isinstance(project.get("bin"), dict):
            project["bin"] = default_project()["bin"]

        return project

    def _save(self) -> None:
        self._project["updated_at"] = now_ms()
        self._persistence.save_project(self._project)

    def get_project(self) -> Dict[str, Any]:
        # Deep-copy nested dicts (timeline, bin) so callers cannot accidentally
        # mutate internal state via the returned object.
        return {
            "version": self._project["version"],
            "updated_at": self._project["updated_at"],
            "timeline": copy.deepcopy(self._project["timeline"]),
            "tracks": copy.deepcopy(self._project["tracks"]),
            "clips": copy.deepcopy(self._project["clips"]),
            "bin": copy.deepcopy(self._project.get("bin", {})),
        }

    def set_project(self, project: Dict[str, Any]) -> Dict[str, Any]:
        migrated = self._migrate_project_payload(project)
        self._project = self._normalize_project(migrated)
        self._save()
        return self.get_project()

    def export_project_package(self) -> Dict[str, Any]:
        return {
            "schema_version": 1,
            "exported_at": int(time.time() * 1000),
            "project": self.get_project(),
        }

    def get_tracks(self) -> List[Dict[str, Any]]:
        return [dict(track) for track in self._project["tracks"]]

    def get_clips(self) -> List[Dict[str, Any]]:
        return [dict(clip) for clip in self._project["clips"]]

    def status(self) -> Dict[str, Any]:
        return {
            "status": "active",
            "storage_path": self.storage_path,
            "project": self.get_project(),
            "clips": self.get_clips(),
            "tracks": self.get_tracks(),
            "counts": {"clips": len(self._project["clips"]), "tracks": len(self._project["tracks"])},
        }

    def list_history(self) -> list[dict[str, Any]]:
        return self._persistence.list_history()

    def restore_history(self, history_id: str) -> Dict[str, Any]:
        payload = self._persistence.load_history_item(history_id)
        migrated = self._migrate_project_payload(payload)
        self._project = self._normalize_project(migrated)
        self._save()
        return self.get_project()

    def add_clip(self, clip_data: Dict[str, Any]) -> str:
        clip = Clip.from_dict(clip_data)
        self._project["clips"].append(clip.to_dict())
        self._save()
        return clip.id

    def update_clip(self, clip_data: Dict[str, Any]) -> bool:
        clip_id = clip_data.get("id")
        if not clip_id:
            return False
        for idx, clip in enumerate(self._project["clips"]):
            if clip.get("id") != clip_id:
                continue
            updated = dict(clip)
            updated.update(clip_data)
            self._project["clips"][idx] = Clip.from_dict(updated).to_dict()
            self._save()
            return True
        return False

    def delete_clip(self, clip_id: str) -> bool:
        before = len(self._project["clips"])
        self._project["clips"] = [clip for clip in self._project["clips"] if clip.get("id") != clip_id]
        deleted = len(self._project["clips"]) != before
        if deleted:
            self._save()
        return deleted

    async def queue_clip(self, clip_id: str, client_id: str | None = None) -> Dict[str, Any]:
        clip = next((item for item in self._project["clips"] if item.get("id") == clip_id), None)
        if clip is None:
            raise KeyError(f"Clip '{clip_id}' not found")

        workflow = clip.get("workflow")
        if not isinstance(workflow, dict):
            raise ValueError("Clip has no workflow payload. Set clip.workflow before queueing.")

        response = await self._comfy.queue_prompt(
            workflow,
            client_id=client_id,
            extra_data={"rbw_timeline": {"clip_id": clip_id}},
        )
        clip["status"] = "queued"
        clip["comfy_prompt_id"] = response["prompt_id"]
        self._save()
        return response

    def sync_clip_statuses(self) -> Dict[str, Any]:
        prompt_server = server.PromptServer.instance
        if prompt_server is None or getattr(prompt_server, "prompt_queue", None) is None:
            return {"updated": 0, "reason": "Prompt queue not available"}

        running, queued = prompt_server.prompt_queue.get_current_queue_volatile()
        history = prompt_server.prompt_queue.get_history()

        running_prompt_ids = {item[1] for item in running}
        queued_prompt_ids = {item[1] for item in queued}
        history_map = history if isinstance(history, dict) else {}

        updated = 0
        for clip in self._project["clips"]:
            prompt_id = clip.get("comfy_prompt_id")
            if not prompt_id:
                continue

            prev_status = clip.get("status", "idle")
            next_status = prev_status

            if prompt_id in running_prompt_ids:
                next_status = "generating"
            elif prompt_id in queued_prompt_ids:
                next_status = "queued"
            elif prompt_id in history_map:
                entry = history_map.get(prompt_id, {})
                status_obj = entry.get("status") or {}
                status_str = status_obj.get("status_str")
                completed = bool(status_obj.get("completed", False))
                if completed:
                    next_status = "done" if status_str == "success" else "error"

                clip_meta = clip.get("meta") or {}
                clip_meta["comfy_history_status"] = {
                    "status_str": status_str,
                    "completed": completed,
                    "messages": status_obj.get("messages", []),
                }
                clip["meta"] = clip_meta

            if next_status != prev_status:
                clip["status"] = next_status
                updated += 1

        if updated > 0:
            self._save()

        return {"updated": updated, "clips": len(self._project["clips"])}
