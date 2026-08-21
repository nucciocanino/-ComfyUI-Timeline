from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List


def now_ms() -> int:
    return int(time.time() * 1000)


def default_tracks() -> List[Dict[str, Any]]:
    return [
        {"id": "video-1", "name": "Video 1", "type": "video", "muted": False, "locked": False, "visible": True},
        {"id": "video-2", "name": "Video 2", "type": "video", "muted": False, "locked": False, "visible": True},
        {"id": "audio-1", "name": "Audio 1", "type": "audio", "muted": False, "locked": False, "visible": True},
    ]


def default_snap_settings() -> Dict[str, Any]:
    return {
        "enabled": {
            "edge": True,
            "marker": True,
            "playhead": True,
            "grid": True,
        },
        "grid_step": 0.25,
    }


def default_shortcuts() -> Dict[str, str]:
    return {
        "play_toggle": "Space",
        "undo": "Ctrl+Z",
        "redo": "Ctrl+Y",
        "step_left": "ArrowLeft",
        "step_right": "ArrowRight",
        "add_marker": "M",
        "set_loop_in": "I",
        "set_loop_out": "O",
        "trim_in_at_playhead": "Alt+I",
        "trim_out_at_playhead": "Alt+O",
        "razor_at_playhead": "C",
        "delete_selected": "Delete",
        "j_backward": "J",
        "k_stop": "K",
        "l_forward": "L",
    }


def default_project() -> Dict[str, Any]:
    return {
        "version": 1,
        "updated_at": now_ms(),
        "timeline": {
            "duration": 60.0,
            "fps": 24,
            "playhead_position": 0.0,
            "is_playing": False,
            "markers": [],
            "loop_range": {"in": 0.0, "out": None, "enabled": False},
            "snap": default_snap_settings(),
            "shortcuts": default_shortcuts(),
            "proxy_quality": "full",
            "frame": {
                "name": "16:9 HD",
                "width": 1920,
                "height": 1080,
            },
        },
        "tracks": default_tracks(),
        "clips": [],
        "bin": {
            "view_mode": "grid",
            "folders": [
                {"id": "root", "name": "Assets", "parent_id": None},
            ],
            "assets": [],
            "selected_folder_id": "root",
        },
    }


@dataclass
class Clip:
    id: str = field(default_factory=lambda: f"clip_{uuid.uuid4().hex[:12]}")
    track_id: str = "video-1"
    asset_id: str = ""
    type: str = "video"
    start_time: float = 0.0
    duration: float = 5.0
    trim_start: float = 0.0
    trim_end: float = 5.0
    prompt: str = ""
    status: str = "idle"
    output_url: str | None = None
    transform: Dict[str, Any] = field(
        default_factory=lambda: {
            "positionX": 0,
            "positionY": 0,
            "scaleX": 100,
            "scaleY": 100,
            "rotation": 0,
            "opacity": 100,
        }
    )
    keyframes: List[Dict[str, Any]] = field(default_factory=list)
    workflow: Dict[str, Any] | None = None
    comfy_prompt_id: str | None = None
    meta: Dict[str, Any] = field(default_factory=dict)
    audio: Dict[str, Any] = field(
        default_factory=lambda: {
            "gain_db": 0.0,
            "fade_in": 0.0,
            "fade_out": 0.0,
        }
    )

    _VALID_TYPES = {"video", "audio", "image"}

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> "Clip":
        duration = float(data.get("duration", 5.0))
        raw_type = str(data.get("type", "video"))
        clip_type = raw_type if raw_type in Clip._VALID_TYPES else "video"
        return Clip(
            id=data.get("id", f"clip_{uuid.uuid4().hex[:12]}"),
            track_id=data.get("track_id", "video-1"),
            asset_id=data.get("asset_id", ""),
            type=clip_type,
            start_time=float(data.get("start_time", 0.0)),
            duration=duration,
            trim_start=float(data.get("trim_start", 0.0)),
            trim_end=float(data.get("trim_end", duration)),
            prompt=data.get("prompt", ""),
            status=data.get("status", "idle"),
            output_url=data.get("output_url"),
            transform=data.get("transform")
            or {
                "positionX": 0,
                "positionY": 0,
                "scaleX": 100,
                "scaleY": 100,
                "rotation": 0,
                "opacity": 100,
            },
            keyframes=list(data.get("keyframes", [])),
            workflow=data.get("workflow"),
            comfy_prompt_id=data.get("comfy_prompt_id"),
            meta=dict(data.get("meta", {})),
            audio=dict(
                data.get("audio", {"gain_db": 0.0, "fade_in": 0.0, "fade_out": 0.0})
            ),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "track_id": self.track_id,
            "asset_id": self.asset_id,
            "type": self.type,
            "start_time": self.start_time,
            "duration": self.duration,
            "trim_start": self.trim_start,
            "trim_end": self.trim_end,
            "prompt": self.prompt,
            "status": self.status,
            "output_url": self.output_url,
            "transform": self.transform,
            "keyframes": self.keyframes,
            "workflow": self.workflow,
            "comfy_prompt_id": self.comfy_prompt_id,
            "meta": self.meta,
            "audio": self.audio,
        }
