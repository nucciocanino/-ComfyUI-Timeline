let StudioCtor = null;
let VideoCtor = null;

const API = {
  status: "/rbw_timeline/status",
  addClip: "/rbw_timeline/clips/add",
  updateClip: "/rbw_timeline/clips/update",
  queueClip: "/rbw_timeline/clips/queue",
  sync: "/rbw_timeline/clips/sync",
  export: "/rbw_timeline/export",
  import: "/rbw_timeline/import",
};

async function apiGet(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return await res.json();
}

async function apiPost(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `${url} -> ${res.status}`);
  return json;
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusBadge = document.getElementById("status-badge");
  const clipListEl = document.getElementById("clip-list");
  const workflowEl = document.getElementById("workflow-json");
  const importInput = document.getElementById("import-file");

  const state = {
    project: null,
    clips: [],
    selectedClipId: null,
    studio: null,
    isPlaying: false,
  };

  function setStatus(text, color = "#8f8f8f") {
    statusBadge.textContent = text;
    statusBadge.style.color = color;
  }

  function selectedClip() {
    return state.clips.find((clip) => clip.id === state.selectedClipId) || null;
  }

  function renderClipList() {
    clipListEl.innerHTML = "";
    for (const clip of state.clips) {
      const li = document.createElement("li");
      if (clip.id === state.selectedClipId) li.classList.add("selected");
      li.innerHTML = `
        <div class="clip-title">${clip.prompt || clip.id}</div>
        <div class="clip-meta">status: ${clip.status || "idle"} | track: ${clip.track_id}</div>
        <div class="clip-meta">start ${clip.start_time}s | dur ${clip.duration}s</div>
      `;
      li.onclick = () => {
        state.selectedClipId = clip.id;
        const wf = clip.workflow || {};
        workflowEl.value = JSON.stringify(wf, null, 2);
        renderClipList();
      };
      clipListEl.appendChild(li);
    }
  }

  async function refreshStatus() {
    const data = await apiGet(API.status);
    state.project = data.project;
    state.clips = data.clips || [];
    if (!state.selectedClipId && state.clips.length > 0) {
      state.selectedClipId = state.clips[0].id;
      workflowEl.value = JSON.stringify(state.clips[0].workflow || {}, null, 2);
    }
    if (state.selectedClipId && !selectedClip()) {
      state.selectedClipId = null;
      workflowEl.value = "";
    }
    renderClipList();
    setStatus(`clips: ${state.clips.length}`, "#10b981");
  }

  async function setupOpenVideo() {
    const container = document.getElementById("player-container");
    try {
      const mod = await import("openvideo");
      StudioCtor = mod.Studio;
      VideoCtor = mod.Video;
      state.studio = new StudioCtor({
        container,
        width: 1920,
        height: 1080,
        fps: 30,
        bgColor: "#000000",
      });

      if (!window.VideoEncoder || !window.VideoDecoder) {
        setStatus("WebCodecs non disponibile", "#ef4444");
      } else {
        setStatus("WebCodecs OK", "#10b981");
      }
    } catch (err) {
      state.studio = null;
      container.innerHTML = `<div style="padding:16px;color:#bbb">Preview OpenVideo non disponibile: ${err.message}</div>`;
      setStatus("OpenVideo init error", "#ef4444");
    }
  }

  document.getElementById("btn-play").addEventListener("click", () => {
    if (!state.studio) return;
    if (state.isPlaying) state.studio.pause();
    else state.studio.play();
    state.isPlaying = !state.isPlaying;
  });

  document.getElementById("btn-add-openvideo").addEventListener("click", async () => {
    if (!state.studio || !VideoCtor) {
      setStatus("Preview OpenVideo non disponibile", "#ef4444");
      return;
    }
    try {
      const clip = new VideoCtor({
        source: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        start: 0,
        duration: 5e6,
      });
      state.studio.addClip(clip);
      state.studio.seek(0);
      setStatus("OpenVideo clip added", "#10b981");
    } catch (err) {
      setStatus(`OpenVideo error: ${err.message}`, "#ef4444");
    }
  });

  document.getElementById("btn-add-timeline").addEventListener("click", async () => {
    try {
      const payload = {
        track_id: "video-1",
        start_time: 0,
        duration: 5,
        type: "video",
        prompt: `Timeline clip ${new Date().toLocaleTimeString()}`,
        workflow: {},
      };
      await apiPost(API.addClip, payload);
      await refreshStatus();
      setStatus("Timeline clip added", "#10b981");
    } catch (err) {
      setStatus(`Add clip failed: ${err.message}`, "#ef4444");
    }
  });

  document.getElementById("btn-save-workflow").addEventListener("click", async () => {
    const clip = selectedClip();
    if (!clip) {
      setStatus("No selected clip", "#ef4444");
      return;
    }
    try {
      const parsed = workflowEl.value.trim() ? JSON.parse(workflowEl.value) : {};
      await apiPost(API.updateClip, { id: clip.id, workflow: parsed });
      await refreshStatus();
      setStatus("Workflow saved", "#10b981");
    } catch (err) {
      setStatus(`Invalid workflow JSON: ${err.message}`, "#ef4444");
    }
  });

  document.getElementById("btn-queue-clip").addEventListener("click", async () => {
    const clip = selectedClip();
    if (!clip) {
      setStatus("No selected clip", "#ef4444");
      return;
    }
    try {
      await apiPost(API.queueClip, { id: clip.id });
      await refreshStatus();
      setStatus("Clip queued", "#10b981");
    } catch (err) {
      setStatus(`Queue failed: ${err.message}`, "#ef4444");
    }
  });

  document.getElementById("btn-sync").addEventListener("click", async () => {
    try {
      const res = await apiPost(API.sync, {});
      state.clips = res.clips || state.clips;
      renderClipList();
      setStatus(`Synced (${res.result?.updated || 0} updated)`, "#10b981");
    } catch (err) {
      setStatus(`Sync failed: ${err.message}`, "#ef4444");
    }
  });

  document.getElementById("btn-export").addEventListener("click", async () => {
    try {
      const res = await fetch(API.export, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`export -> ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rbw_timeline_export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Export complete", "#10b981");
    } catch (err) {
      setStatus(`Export failed: ${err.message}`, "#ef4444");
    }
  });

  document.getElementById("btn-import").addEventListener("click", () => {
    importInput.click();
  });

  importInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await apiPost(API.import, payload);
      await refreshStatus();
      setStatus("Import complete", "#10b981");
    } catch (err) {
      setStatus(`Import failed: ${err.message}`, "#ef4444");
    } finally {
      importInput.value = "";
    }
  });

  await setupOpenVideo();
  try {
    await refreshStatus();
  } catch (err) {
    setStatus(`Errore API: ${err.message}`, "#ef4444");
  }
});
