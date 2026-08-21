from __future__ import annotations

import asyncio
import json
import os
import shlex
import shutil
import subprocess
import uuid
import urllib.parse
from typing import Any

from aiohttp import web

import folder_paths
import server

from .comfy_adapter import ComfyPromptAdapter
from .persistence import TimelinePersistence
from .service import TimelineService

_BASE_DIR = os.path.dirname(__file__)
_WEB_DIR = os.path.join(_BASE_DIR, "web")
_ASSETS_DIR = os.path.join(_WEB_DIR, "assets")
_INDEX_HTML = os.path.join(_WEB_DIR, "index.html")

# Initialised lazily inside register_routes() so ComfyUI internals (folder_paths,
# PromptServer) are fully ready before we touch them.
_service: TimelineService | None = None
_render_jobs: dict[str, dict[str, Any]] = {}
_RENDER_JOBS_MAX = 60


def _json_error(message: str, status: int = 400) -> web.Response:
    return web.json_response({"error": message}, status=status)


async def _read_json(request: web.Request) -> dict[str, Any] | None:
    """Parse JSON body. Returns None on malformed JSON so callers can return a proper 400."""
    try:
        payload = await request.json()
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


async def _read_json_required(request: web.Request) -> tuple[dict[str, Any] | None, web.Response | None]:
    """Parse JSON body. Returns (payload, None) on success or (None, 400 response) on failure."""
    payload = await _read_json(request)
    if payload is None:
        return None, _json_error("Invalid or missing JSON body.", status=400)
    return payload, None


def _safe_join(root: str, rel_path: str) -> str | None:
    target = os.path.abspath(os.path.join(root, rel_path))
    root_abs = os.path.abspath(root)
    if os.path.commonpath([root_abs, target]) != root_abs:
        return None
    return target


def _serve_file(path: str, extra_headers: dict[str, str] | None = None) -> web.Response:
    if not os.path.isfile(path):
        return web.Response(status=404)
    # Use FileResponse for streaming — avoids loading large files (e.g. 2MB openvideo bundle) into RAM
    response = web.FileResponse(path)
    if extra_headers:
        response.headers.update(extra_headers)
    return response


def _probe_media_duration_seconds(path: str) -> float | None:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return None
    try:
        proc = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                path,
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=10,
        )
        if proc.returncode != 0 or not proc.stdout:
            return None
        payload = json.loads(proc.stdout)
        duration_raw = payload.get("format", {}).get("duration")
        if duration_raw is None:
            return None
        duration = float(duration_raw)
        if duration <= 0:
            return None
        return duration
    except Exception:
        return None


def _probe_streams(path: str) -> dict[str, Any]:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        return {"has_video": True, "has_audio": False, "duration": None}
    try:
        proc = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-show_streams",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                path,
            ],
            capture_output=True,
            text=True,
            check=False,
            timeout=12,
        )
        if proc.returncode != 0 or not proc.stdout:
            return {"has_video": True, "has_audio": False, "duration": None}
        payload = json.loads(proc.stdout)
        streams = payload.get("streams") or []
        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
        has_video = video_stream is not None
        has_audio = audio_stream is not None
        duration_raw = payload.get("format", {}).get("duration")
        duration = float(duration_raw) if duration_raw is not None else None
        fps = None
        if video_stream is not None:
            rate_raw = str(video_stream.get("avg_frame_rate") or "")
            if "/" in rate_raw:
                num_raw, den_raw = rate_raw.split("/", 1)
                try:
                    num = float(num_raw)
                    den = float(den_raw)
                    if den != 0:
                        fps = num / den
                except Exception:
                    fps = None
            else:
                try:
                    fps = float(rate_raw)
                except Exception:
                    fps = None
        return {
            "has_video": has_video,
            "has_audio": has_audio,
            "duration": duration,
            "width": int(video_stream.get("width", 0)) if video_stream else None,
            "height": int(video_stream.get("height", 0)) if video_stream else None,
            "fps": fps,
            "video_codec": video_stream.get("codec_name") if video_stream else None,
            "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
        }
    except Exception:
        return {"has_video": True, "has_audio": False, "duration": None}


def _clip_media_path(clip: dict[str, Any]) -> str | None:
    meta = clip.get("meta") if isinstance(clip.get("meta"), dict) else {}
    imported_path = meta.get("imported_path")
    if isinstance(imported_path, str) and os.path.isfile(imported_path):
        return imported_path

    output_url = str(clip.get("output_url") or "")
    if not output_url:
        return None

    input_dir = folder_paths.get_input_directory()
    assets_dir = os.path.join(input_dir, "timeline_assets")

    if output_url.startswith("/rbw_timeline/media/"):
        filename = urllib.parse.unquote(output_url.split("/rbw_timeline/media/", 1)[1].split("?", 1)[0])
        path = _safe_join(assets_dir, os.path.basename(filename))
        if path and os.path.isfile(path):
            return path

    if output_url.startswith("/view?"):
        parsed = urllib.parse.urlparse(output_url)
        qs = urllib.parse.parse_qs(parsed.query)
        filename = (qs.get("filename") or [""])[0]
        subfolder = (qs.get("subfolder") or [""])[0]
        if filename and subfolder == "timeline_assets":
            path = _safe_join(assets_dir, os.path.basename(filename))
            if path and os.path.isfile(path):
                return path
    return None


async def _build_render_command(
    project: dict[str, Any],
    clips: list[dict[str, Any]],
    tracks: list[dict[str, Any]],
    opts: dict[str, Any],
    output_path: str,
) -> tuple[list[str], float]:
    timeline = project.get("timeline") if isinstance(project.get("timeline"), dict) else {}
    frame = timeline.get("frame") if isinstance(timeline.get("frame"), dict) else {}
    tw = int(opts.get("width") or frame.get("width") or 1920)
    th = int(opts.get("height") or frame.get("height") or 1080)
    fps = max(1, int(opts.get("fps") or timeline.get("fps") or 24))
    in_sec = max(0.0, float(opts.get("in_sec") or 0.0))
    out_sec_raw = opts.get("out_sec")
    timeline_dur = float(timeline.get("duration") or 60.0)
    out_sec = float(out_sec_raw) if out_sec_raw is not None else timeline_dur
    out_sec = max(in_sec + 0.05, out_sec)
    render_dur = max(0.05, out_sec - in_sec)

    include_audio = bool(opts.get("include_audio", True))
    preset = str(opts.get("preset") or "h264")
    crf = int(opts.get("crf") or 18)
    pix_fmt = str(opts.get("pix_fmt") or "yuv420p")
    preset_speed = str(opts.get("preset_speed") or "medium")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg not found in PATH")

    track_index: dict[str, int] = {}
    track_map: dict[str, dict[str, Any]] = {}
    for idx, t in enumerate(tracks):
        tid = str(t.get("id") or "")
        if not tid:
            continue
        track_index[tid] = idx
        track_map[tid] = t

    active_segments: list[dict[str, Any]] = []
    for clip in clips:
        path = _clip_media_path(clip)
        if not path:
            continue
        track_id = str(clip.get("track_id") or "")
        track = track_map.get(track_id, {})
        ctype = str(clip.get("type") or "video")
        if ctype == "video" and track.get("visible") is False:
            continue
        if ctype == "audio" and track.get("muted") is True:
            continue
        clip_start = float(clip.get("start_time") or 0.0)
        clip_duration = max(0.01, float(clip.get("duration") or 0.01))
        clip_end = clip_start + clip_duration
        vis_start = max(clip_start, in_sec)
        vis_end = min(clip_end, out_sec)
        if vis_end <= vis_start:
            continue
        trim_start = float(clip.get("trim_start") or 0.0) + (vis_start - clip_start)
        seg_dur = vis_end - vis_start
        trim_end = trim_start + seg_dur
        active_segments.append(
            {
                "clip": clip,
                "path": path,
                "ctype": ctype,
                "track_id": track_id,
                "track_idx": track_index.get(track_id, 9999),
                "start_rel": vis_start - in_sec,
                "end_rel": vis_end - in_sec,
                "trim_start": trim_start,
                "trim_end": trim_end,
                "seg_dur": seg_dur,
                "transform": clip.get("transform") if isinstance(clip.get("transform"), dict) else {},
                "stream": None,  # filled below via asyncio.to_thread to avoid blocking the event loop
            }
        )

    # Probe all media files concurrently without blocking the event loop
    probe_tasks = [asyncio.to_thread(_probe_streams, seg["path"]) for seg in active_segments]
    probe_results = await asyncio.gather(*probe_tasks)
    for seg, stream_info in zip(active_segments, probe_results):
        seg["stream"] = stream_info

    active_segments.sort(key=lambda s: (s["track_idx"], s["start_rel"]))

    cmd: list[str] = [
        ffmpeg,
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=black:s={tw}x{th}:r={fps}:d={render_dur}",
    ]
    cmd += ["-f", "lavfi", "-i", f"anullsrc=channel_layout=stereo:sample_rate=48000:d={render_dur}"]

    for seg in active_segments:
        cmd += ["-i", seg["path"]]

    fparts: list[str] = []
    v_current = "vbase"
    fparts.append(f"[0:v]format=rgba[{v_current}]")
    a_inputs: list[str] = ["[1:a]"]

    input_idx = 2
    for i, seg in enumerate(active_segments):
        has_video = bool(seg["stream"].get("has_video", True))
        has_audio = bool(seg["stream"].get("has_audio", False))
        tr = seg["transform"]
        sx = max(1.0, float(tr.get("scaleX", 100)) / 100.0)
        sy = max(1.0, float(tr.get("scaleY", 100)) / 100.0)
        px = float(tr.get("positionX", 0))
        py = float(tr.get("positionY", 0))
        opacity = max(0.0, min(1.0, float(tr.get("opacity", 100)) / 100.0))
        ts = max(0.0, float(seg["trim_start"]))
        te = max(ts + 0.001, float(seg["trim_end"]))
        start_rel = max(0.0, float(seg["start_rel"]))
        end_rel = max(start_rel + 0.001, float(seg["end_rel"]))

        if seg["ctype"] != "audio" and has_video:
            vclip = f"vclip{i}"
            fparts.append(
                f"[{input_idx}:v]trim=start={ts:.6f}:end={te:.6f},setpts=PTS-STARTPTS,"
                f"scale=trunc(iw*{sx:.6f}/2)*2:trunc(ih*{sy:.6f}/2)*2,format=rgba,colorchannelmixer=aa={opacity:.6f}[{vclip}]"
            )
            vnext = f"v{i}"
            fparts.append(
                f"[{v_current}][{vclip}]overlay=x='(W-w)/2+{px:.6f}':y='(H-h)/2+{py:.6f}':"
                f"enable='between(t,{start_rel:.6f},{end_rel:.6f})'[{vnext}]"
            )
            v_current = vnext

        if include_audio and has_audio and seg["ctype"] in {"audio", "video"}:
            audio_cfg = seg["clip"].get("audio") if isinstance(seg["clip"].get("audio"), dict) else {}
            gain_db = float(audio_cfg.get("gain_db", 0.0) or 0.0)
            fade_in = max(0.0, float(audio_cfg.get("fade_in", 0.0) or 0.0))
            fade_out = max(0.0, float(audio_cfg.get("fade_out", 0.0) or 0.0))
            fade_out_start = max(0.0, seg["seg_dur"] - fade_out)
            aclip = f"aclip{i}"
            # asetpts cannot shift audio in time for amix — use adelay instead.
            # adelay expects milliseconds and pads all channels when all=1.
            delay_ms = max(0, int(round(start_rel * 1000)))
            afilters = [
                f"atrim=start={ts:.6f}:end={te:.6f}",
                "asetpts=PTS-STARTPTS",
                f"volume={gain_db:.4f}dB",
            ]
            if fade_in > 0:
                afilters.append(f"afade=t=in:st=0:d={fade_in:.6f}")
            if fade_out > 0:
                afilters.append(f"afade=t=out:st={fade_out_start:.6f}:d={fade_out:.6f}")
            if delay_ms > 0:
                afilters.append(f"adelay={delay_ms}:all=1")
            fparts.append(
                f"[{input_idx}:a]{','.join(afilters)}[{aclip}]"
            )
            a_inputs.append(f"[{aclip}]")

        input_idx += 1

    fparts.append(f"[{v_current}]format={pix_fmt}[vout]")
    if include_audio:
        if len(a_inputs) == 1:
            fparts.append("[1:a]anull[aout]")
        else:
            fparts.append(f"{''.join(a_inputs)}amix=inputs={len(a_inputs)}:normalize=0:dropout_transition=0[aout]")

    cmd += ["-filter_complex", ";".join(fparts), "-map", "[vout]"]
    if include_audio:
        cmd += ["-map", "[aout]"]

    if preset == "h265":
        cmd += ["-c:v", "libx265", "-crf", str(crf), "-preset", preset_speed]
        if include_audio:
            cmd += ["-c:a", "aac", "-b:a", "192k"]
    elif preset == "prores":
        cmd += ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le"]
        if include_audio:
            cmd += ["-c:a", "pcm_s16le"]
    elif preset == "webm":
        cmd += ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", str(crf), "-deadline", "good", "-row-mt", "1"]
        if include_audio:
            cmd += ["-c:a", "libopus", "-b:a", "160k"]
    else:
        cmd += ["-c:v", "libx264", "-crf", str(crf), "-preset", preset_speed, "-pix_fmt", pix_fmt]
        if include_audio:
            cmd += ["-c:a", "aac", "-b:a", "192k"]

    cmd += ["-r", str(fps), "-movflags", "+faststart", output_path]
    return cmd, render_dur


def _render_job_trim() -> None:
    if len(_render_jobs) <= _RENDER_JOBS_MAX:
        return
    ordered = sorted(_render_jobs.items(), key=lambda kv: float(kv[1].get("updated_at", 0.0)))
    overflow = len(_render_jobs) - _RENDER_JOBS_MAX
    for i in range(overflow):
        _render_jobs.pop(ordered[i][0], None)


async def _run_render_job(
    job_id: str,
    project: dict[str, Any],
    clips: list[dict[str, Any]],
    tracks: list[dict[str, Any]],
    opts: dict[str, Any],
    out_name: str,
    out_path: str,
) -> None:
    job = _render_jobs.get(job_id)
    if not job:
        return
    loop = asyncio.get_running_loop()
    job["status"] = "running"
    job["updated_at"] = loop.time()
    try:
        cmd, render_dur = await _build_render_command(project, clips, tracks, opts, out_path)
        # Use create_subprocess_exec to avoid pipe deadlocks on large stderr output
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, stderr_bytes = await proc.communicate()
        stdout_str = stdout_bytes.decode("utf-8", errors="replace") if stdout_bytes else ""
        stderr_str = stderr_bytes.decode("utf-8", errors="replace") if stderr_bytes else ""
        if proc.returncode != 0 or not os.path.isfile(out_path):
            job["status"] = "error"
            job["error"] = "Render failed"
            job["returncode"] = proc.returncode
            job["stderr"] = stderr_str[-4000:]
            job["stdout"] = stdout_str[-1200:]
            job["cmd"] = " ".join(shlex.quote(part) for part in cmd)
            job["updated_at"] = loop.time()
            return
        job["status"] = "done"
        job["success"] = True
        job["filename"] = out_name
        job["file_url"] = f"/rbw_timeline/renders/{urllib.parse.quote(out_name)}"
        job["duration"] = render_dur
        job["cmd"] = " ".join(shlex.quote(part) for part in cmd)
        job["updated_at"] = loop.time()
    except Exception as exc:
        job["status"] = "error"
        job["error"] = f"Render failed: {exc}"
        job["updated_at"] = asyncio.get_running_loop().time()


def register_routes() -> None:
    global _service
    # Instantiate here so folder_paths and PromptServer are guaranteed to be ready.
    _service = TimelineService(TimelinePersistence(), ComfyPromptAdapter())

    routes = server.PromptServer.instance.routes

    # SharedArrayBuffer (required by openvideo/WebCodecs) needs these COOP/COEP headers.
    # Chrome/Edge block SharedArrayBuffer without them, making the viewer non-functional.
    _COEP_COOP_HEADERS = {
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin",
    }

    @routes.get("/rbw_timeline/ui")
    async def rbw_timeline_ui(_request: web.Request) -> web.Response:
        return _serve_file(_INDEX_HTML, extra_headers=_COEP_COOP_HEADERS)

    @routes.get("/rbw_timeline/assets/{path:.*}")
    async def rbw_timeline_assets(request: web.Request) -> web.Response:
        rel_path = request.match_info.get("path", "")
        asset_path = _safe_join(_ASSETS_DIR, rel_path)
        if asset_path is None:
            return web.Response(status=403)
        return _serve_file(asset_path, extra_headers=_COEP_COOP_HEADERS)

    @routes.get("/rbw_timeline/media/{filename:.*}")
    async def rbw_timeline_media(request: web.Request) -> web.Response:
        filename = urllib.parse.unquote(os.path.basename(request.match_info.get("filename", "")))
        if not filename:
            return _json_error("Missing filename.", status=400)
        input_dir = folder_paths.get_input_directory()
        media_path = _safe_join(os.path.join(input_dir, "timeline_assets"), filename)
        if media_path is None:
            return web.Response(status=403)
        if not os.path.exists(media_path) or not os.path.isfile(media_path):
            return web.Response(status=404)
        return web.FileResponse(media_path)

    @routes.get("/rbw_timeline/status")
    async def rbw_timeline_status(_request: web.Request) -> web.Response:
        return web.json_response(_service.status())

    @routes.get("/rbw_timeline/history")
    async def rbw_timeline_history(_request: web.Request) -> web.Response:
        return web.json_response({"success": True, "items": _service.list_history()})

    @routes.post("/rbw_timeline/history/restore")
    async def rbw_timeline_history_restore(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        history_id = str(payload.get("id", "")).strip()
        if not history_id:
            return _json_error("Missing history id.", status=400)
        try:
            project = _service.restore_history(history_id)
        except FileNotFoundError:
            return _json_error("History item not found.", status=404)
        except Exception as exc:
            return _json_error(f"Restore failed: {exc}", status=500)
        return web.json_response({"success": True, "project": project})

    @routes.get("/rbw_timeline/project")
    async def rbw_timeline_project_get(_request: web.Request) -> web.Response:
        return web.json_response(_service.get_project())

    @routes.post("/rbw_timeline/project")
    async def rbw_timeline_project_set(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        project = payload.get("project")
        if not isinstance(project, dict):
            return _json_error("Expected JSON body with object field 'project'.")
        saved = _service.set_project(project)
        return web.json_response({"success": True, "project": saved})

    @routes.post("/rbw_timeline/clips/add")
    async def rbw_timeline_add_clip(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        clip_id = _service.add_clip(payload)
        return web.json_response({"success": True, "clip_id": clip_id})

    @routes.post("/rbw_timeline/clips/update")
    async def rbw_timeline_update_clip(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        success = _service.update_clip(payload)
        return web.json_response({"success": success})

    @routes.post("/rbw_timeline/clips/delete")
    async def rbw_timeline_delete_clip(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        clip_id = str(payload.get("id", ""))
        if not clip_id:
            return _json_error("Missing clip id.")
        success = _service.delete_clip(clip_id)
        return web.json_response({"success": success})

    @routes.post("/rbw_timeline/clips/queue")
    async def rbw_timeline_queue_clip(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        clip_id = str(payload.get("id", ""))
        client_id = payload.get("client_id")
        if not clip_id:
            return _json_error("Missing clip id.")
        try:
            response = await _service.queue_clip(clip_id, client_id=client_id)
            return web.json_response({"success": True, "result": response})
        except KeyError as exc:
            return _json_error(str(exc), status=404)
        except ValueError as exc:
            details = exc.args[0] if exc.args else str(exc)
            if isinstance(details, dict):
                return web.json_response(details, status=400)
            return _json_error(str(details), status=400)
        except Exception as exc:
            return _json_error(f"Queue failed: {exc}", status=500)

    @routes.post("/rbw_timeline/clips/sync")
    async def rbw_timeline_sync_clips(_request: web.Request) -> web.Response:
        result = _service.sync_clip_statuses()
        return web.json_response({"success": True, "result": result, "clips": _service.get_clips()})

    @routes.get("/rbw_timeline/export")
    async def rbw_timeline_export(_request: web.Request) -> web.Response:
        payload = _service.export_project_package()
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        return web.Response(
            body=body,
            content_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="rbw_timeline_export.json"'},
        )

    @routes.post("/rbw_timeline/render")
    async def rbw_timeline_render(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        opts = payload.get("options") if isinstance(payload.get("options"), dict) else payload
        project = _service.get_project()
        clips = _service.get_clips()
        tracks = _service.get_tracks()

        output_dir = os.path.join(folder_paths.get_output_directory(), "timeline_renders")
        os.makedirs(output_dir, exist_ok=True)

        preset = str(opts.get("preset") or "h264")
        ext = {
            "h264": "mp4",
            "h265": "mp4",
            "prores": "mov",
            "webm": "webm",
        }.get(preset, "mp4")
        filename_base = str(opts.get("filename") or f"rbw_timeline_render_{uuid.uuid4().hex[:8]}")
        safe_base = "".join(ch for ch in filename_base if ch.isalnum() or ch in ("-", "_")).strip() or f"rbw_timeline_render_{uuid.uuid4().hex[:8]}"
        out_name = f"{safe_base}.{ext}"
        out_path = os.path.join(output_dir, out_name)

        job_id = f"render_{uuid.uuid4().hex[:12]}"
        _now = asyncio.get_running_loop().time()
        _render_jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "success": False,
            "filename": out_name,
            "file_url": None,
            "error": None,
            "stderr": "",
            "stdout": "",
            "cmd": "",
            "created_at": _now,
            "updated_at": _now,
        }
        _render_job_trim()
        asyncio.create_task(_run_render_job(job_id, project, clips, tracks, opts, out_name, out_path))
        return web.json_response({"success": True, "job_id": job_id, "status": "queued", "filename": out_name})

    @routes.post("/rbw_timeline/render/queue")
    async def rbw_timeline_render_queue(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        jobs_raw = payload.get("jobs")
        if not isinstance(jobs_raw, list) or not jobs_raw:
            return _json_error("Expected non-empty jobs array.", status=400)
        project = _service.get_project()
        clips = _service.get_clips()
        tracks = _service.get_tracks()
        output_dir = os.path.join(folder_paths.get_output_directory(), "timeline_renders")
        os.makedirs(output_dir, exist_ok=True)

        queued: list[dict[str, Any]] = []
        for item in jobs_raw:
            opts = item if isinstance(item, dict) else {}
            preset = str(opts.get("preset") or "h264")
            ext = {"h264": "mp4", "h265": "mp4", "prores": "mov", "webm": "webm"}.get(preset, "mp4")
            filename_base = str(opts.get("filename") or f"rbw_timeline_render_{uuid.uuid4().hex[:8]}")
            safe_base = "".join(ch for ch in filename_base if ch.isalnum() or ch in ("-", "_")).strip()
            if not safe_base:
                safe_base = f"rbw_timeline_render_{uuid.uuid4().hex[:8]}"
            out_name = f"{safe_base}.{ext}"
            out_path = os.path.join(output_dir, out_name)
            job_id = f"render_{uuid.uuid4().hex[:12]}"
            _now = asyncio.get_running_loop().time()
            _render_jobs[job_id] = {
                "job_id": job_id,
                "status": "queued",
                "success": False,
                "filename": out_name,
                "file_url": None,
                "error": None,
                "stderr": "",
                "stdout": "",
                "cmd": "",
                "created_at": _now,
                "updated_at": _now,
            }
            asyncio.create_task(_run_render_job(job_id, project, clips, tracks, opts, out_name, out_path))
            queued.append({"job_id": job_id, "filename": out_name, "status": "queued"})

        _render_job_trim()
        return web.json_response({"success": True, "jobs": queued})

    @routes.get("/rbw_timeline/render/status")
    async def rbw_timeline_render_status_all(_request: web.Request) -> web.Response:
        jobs = sorted(
            [dict(item) for item in _render_jobs.values()],
            key=lambda j: float(j.get("created_at", 0.0)),
            reverse=True,
        )
        return web.json_response({"success": True, "jobs": jobs})

    @routes.get("/rbw_timeline/render/status/{job_id}")
    async def rbw_timeline_render_status(request: web.Request) -> web.Response:
        job_id = str(request.match_info.get("job_id", "")).strip()
        if not job_id:
            return _json_error("Missing job id.", status=400)
        job = _render_jobs.get(job_id)
        if not job:
            return _json_error("Render job not found.", status=404)
        return web.json_response(dict(job))

    @routes.get("/rbw_timeline/renders/{filename:.*}")
    async def rbw_timeline_render_file(request: web.Request) -> web.Response:
        filename = urllib.parse.unquote(os.path.basename(request.match_info.get("filename", "")))
        if not filename:
            return _json_error("Missing filename.", status=400)
        output_dir = os.path.join(folder_paths.get_output_directory(), "timeline_renders")
        render_path = _safe_join(output_dir, filename)
        if render_path is None:
            return web.Response(status=403)
        if not os.path.isfile(render_path):
            return web.Response(status=404)
        return web.FileResponse(render_path)

    @routes.post("/rbw_timeline/import")
    async def rbw_timeline_import(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        if "payload" in payload and isinstance(payload.get("payload"), dict):
            payload = payload["payload"]
        if not isinstance(payload, dict) or len(payload) == 0:
            return _json_error("Expected import payload as JSON object.")
        project = _service.set_project(payload)
        return web.json_response({"success": True, "project": project})

    @routes.post("/rbw_timeline/assets/import")
    async def rbw_timeline_import_asset(request: web.Request) -> web.Response:
        # ?include_audio=0 lets the caller skip creating a companion audio clip for videos
        include_audio = request.rel_url.query.get("include_audio", "1") not in ("0", "false", "no")
        reader = await request.multipart()
        file_part = await reader.next()
        if file_part is None or file_part.name != "file":
            return _json_error("Expected multipart form field 'file'.")

        original_name = file_part.filename or "asset.bin"
        safe_name = os.path.basename(original_name).replace("\\", "_").replace("/", "_")
        ext = os.path.splitext(safe_name)[1].lower()
        unique_name = f"{os.path.splitext(safe_name)[0]}_{uuid.uuid4().hex[:8]}{ext}"

        input_dir = folder_paths.get_input_directory()
        subfolder = "timeline_assets"
        asset_dir = os.path.join(input_dir, subfolder)
        os.makedirs(asset_dir, exist_ok=True)

        dst = os.path.join(asset_dir, unique_name)
        written = 0
        with open(dst, "wb") as fh:
            while True:
                chunk = await file_part.read_chunk(size=1024 * 1024)
                if not chunk:
                    break
                fh.write(chunk)
                written += len(chunk)
        if written <= 0:
            try:
                os.remove(dst)
            except Exception:
                pass
            return _json_error("Imported file is empty (0 bytes).")

        content_type = file_part.headers.get("Content-Type", "") or ""
        clip_type = "video"
        if content_type.startswith("audio/"):
            clip_type = "audio"
        elif content_type.startswith("image/"):
            clip_type = "image"
        elif ext in {".mp3", ".wav", ".flac", ".ogg", ".m4a"}:
            clip_type = "audio"
        elif ext in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}:
            clip_type = "image"

        view_url = (
            f"/view?filename={urllib.parse.quote(unique_name)}"
            f"&type=input&subfolder={urllib.parse.quote(subfolder)}"
        )
        media_duration = _probe_media_duration_seconds(dst)
        stream_meta = _probe_streams(dst)
        clip_duration = 5.0
        if media_duration is not None and clip_type in {"video", "audio"}:
            clip_duration = max(0.1, float(media_duration))
        group_id = uuid.uuid4().hex[:10]
        clip_id = _service.add_clip(
            {
                "track_id": "audio-1" if clip_type == "audio" else "video-1",
                "type": clip_type,
                "asset_id": unique_name,
                "prompt": os.path.splitext(original_name)[0],
                "duration": clip_duration,
                "trim_start": 0.0,
                "trim_end": clip_duration,
                "output_url": view_url,
                "meta": {
                    "source_filename": original_name,
                    "content_type": content_type,
                    "imported_path": dst,
                    "source_duration": media_duration,
                    "media_group_id": group_id,
                    "metadata": {
                        "fps": stream_meta.get("fps"),
                        "duration": stream_meta.get("duration"),
                        "width": stream_meta.get("width"),
                        "height": stream_meta.get("height"),
                        "video_codec": stream_meta.get("video_codec"),
                        "audio_codec": stream_meta.get("audio_codec"),
                    },
                },
            }
        )
        audio_clip_id = None
        if clip_type == "video" and include_audio:
            audio_clip_id = _service.add_clip(
                {
                    "track_id": "audio-1",
                    "type": "audio",
                    "asset_id": unique_name,
                    "prompt": f"{os.path.splitext(original_name)[0]} [audio]",
                    "duration": clip_duration,
                    "trim_start": 0.0,
                    "trim_end": clip_duration,
                    "output_url": view_url,
                    "meta": {
                        "source_filename": original_name,
                        "content_type": content_type,
                        "imported_path": dst,
                        "source_duration": media_duration,
                        "media_group_id": group_id,
                        "derived_from_video": clip_id,
                        "metadata": {
                            "fps": stream_meta.get("fps"),
                            "duration": stream_meta.get("duration"),
                            "width": stream_meta.get("width"),
                            "height": stream_meta.get("height"),
                            "video_codec": stream_meta.get("video_codec"),
                            "audio_codec": stream_meta.get("audio_codec"),
                        },
                    },
                }
            )
        return web.json_response(
            {
                "success": True,
                "clip_id": clip_id,
                "audio_clip_id": audio_clip_id,
                "asset": {
                    "filename": unique_name,
                    "subfolder": subfolder,
                    "view_url": view_url,
                    "clip_type": clip_type,
                },
            }
        )

    # Legacy compatibility routes.
    @routes.get("/timeline/openvideo")
    async def legacy_openvideo(_request: web.Request) -> web.Response:
        return _serve_file(_INDEX_HTML)

    @routes.get("/timeline/panel")
    async def legacy_panel(_request: web.Request) -> web.Response:
        return _serve_file(_INDEX_HTML)

    @routes.get("/timeline/assets/{path:.*}")
    async def legacy_assets(request: web.Request) -> web.Response:
        rel_path = request.match_info.get("path", "")
        asset_path = _safe_join(_ASSETS_DIR, rel_path)
        if asset_path is None:
            return web.Response(status=403)
        return _serve_file(asset_path)

    @routes.get("/timeline/status")
    async def legacy_status(_request: web.Request) -> web.Response:
        snapshot = _service.status()
        return web.json_response(
            {
                "status": snapshot["status"],
                "clips": snapshot["clips"],
                "tracks": snapshot["tracks"],
                "storage_path": snapshot["storage_path"],
            }
        )

    @routes.post("/timeline/add_clip")
    async def legacy_add_clip(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        clip_id = _service.add_clip(payload)
        return web.json_response({"clip_id": clip_id})

    @routes.post("/timeline/update_clip")
    async def legacy_update_clip(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        success = _service.update_clip(payload)
        return web.json_response({"success": success})

    @routes.post("/timeline/delete_clip")
    async def legacy_delete_clip(request: web.Request) -> web.Response:
        payload, err = await _read_json_required(request)
        if err:
            return err
        clip_id = str(payload.get("id", ""))
        if not clip_id:
            return _json_error("Missing clip id.")
        success = _service.delete_clip(clip_id)
        return web.json_response({"success": success})

    @routes.post("/timeline/sync")
    async def legacy_sync(_request: web.Request) -> web.Response:
        result = _service.sync_clip_statuses()
        return web.json_response({"success": True, "result": result, "clips": _service.get_clips()})
