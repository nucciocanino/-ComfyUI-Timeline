import { app } from "../../scripts/app.js";

const API = {
  status: "/rbw_timeline/status",
  addClip: "/rbw_timeline/clips/add",
  updateClip: "/rbw_timeline/clips/update",
  deleteClip: "/rbw_timeline/clips/delete",
  queueClip: "/rbw_timeline/clips/queue",
  sync: "/rbw_timeline/clips/sync",
  export: "/rbw_timeline/export",
  render: "/rbw_timeline/render",
  renderQueue: "/rbw_timeline/render/queue",
  renderStatus: "/rbw_timeline/render/status",
  import: "/rbw_timeline/import",
  importAsset: "/rbw_timeline/assets/import",
  project: "/rbw_timeline/project",
  history: "/rbw_timeline/history",
  restoreHistory: "/rbw_timeline/history/restore",
};

const FORMAT_PRESETS = [
  { id: "1920x1080", name: "16:9 HD", width: 1920, height: 1080 },
  { id: "1080x1080", name: "1:1 Square", width: 1080, height: 1080 },
  { id: "1080x1920", name: "9:16 Vertical", width: 1080, height: 1920 },
  { id: "2048x858", name: "2.39:1 Cinema", width: 2048, height: 858 },
  { id: "3840x2160", name: "16:9 UHD", width: 3840, height: 2160 },
  { id: "2160x3840", name: "9:16 UHD Vertical", width: 2160, height: 3840 },
  { id: "1350x1080", name: "5:4 Social", width: 1350, height: 1080 },
  { id: "1080x1350", name: "4:5 Social", width: 1080, height: 1350 },
  { id: "1440x1080", name: "4:3 Classic", width: 1440, height: 1080 },
  { id: "1080x1440", name: "3:4 Portrait", width: 1080, height: 1440 },
  { id: "2520x1080", name: "21:9 UltraWide", width: 2520, height: 1080 },
];
const PANEL_MIN_HEIGHT_PX = 220;
const PANEL_AUTO_GROW_PER_TRACK_PX = 48;
const WORKSPACE_MIN_WIDTH_PX = 640;

const css = `
#rbw-fab{position:fixed;left:50%;transform:translateX(-50%);bottom:20px;z-index:10001;padding:8px 14px;border-radius:999px;border:1px solid var(--rbw-border,#5a67a8);background:var(--rbw-accent,#2c3a68);color:var(--rbw-text,#fff)}
#rbw-panel{position:fixed;left:0;right:0;bottom:0;height:38vh;z-index:10000;background:var(--rbw-bg,#16181d);border-top:1px solid var(--rbw-border,#2e3440);display:none;grid-template-rows:auto auto auto 1fr auto;min-height:220px}
#rbw-panel.open{display:grid}
#rbw-resz{height:5px;cursor:ns-resize;background:linear-gradient(180deg,rgba(130,150,190,.25),rgba(130,150,190,.05))}
#rbw-h{display:flex;gap:6px;align-items:center;padding:7px 8px;border-bottom:1px solid var(--rbw-border,#2e3440);background:var(--rbw-surface,#1d2129);white-space:nowrap;overflow-x:auto}
#rbw-h button{font-size:12px;padding:4px 8px;background:var(--rbw-btn-bg,#2a2f39);color:var(--rbw-text,#fff);border:1px solid var(--rbw-btn-border,#3e4552);border-radius:4px}
#rbw-h button.ico{width:26px;height:24px;padding:0;display:grid;place-items:center}
#rbw-h,#rbw-tr{box-shadow:inset 0 -1px 0 rgba(255,255,255,.03)}
#rbw-tabs{display:inline-flex;align-items:center;gap:2px;margin-right:8px;padding:2px;background:#11161f;border:1px solid var(--rbw-border,#2e3440);border-radius:6px}
#rbw-tabs .tab{height:22px;padding:0 10px;border:0;border-radius:4px;background:transparent;color:var(--rbw-muted,#9da6bb);font-size:11px}
#rbw-tabs .tab.on{background:#2c3f63;color:#e9f0ff}
#rbw-h select,#rbw-h input{font-size:12px;padding:4px 6px;background:var(--rbw-btn-bg,#2a2f39);color:var(--rbw-text,#fff);border:1px solid var(--rbw-btn-border,#3e4552);border-radius:4px}
#rbw-main{display:grid;grid-template-rows:1fr;min-height:0;align-content:start}
#rbw-work{display:grid;grid-template-columns:var(--rbw-bin-w,320px) 1fr minmax(230px,300px);gap:8px;padding:8px;border-bottom:1px solid var(--rbw-border,#2e3440);min-height:0}
#rbw-work.bin-off{grid-template-columns:1fr minmax(230px,300px)}
#rbw-work.ins-off{grid-template-columns:var(--rbw-bin-w,320px) 1fr}
#rbw-work.bin-off.ins-off{grid-template-columns:1fr}
#rbw-bin,#rbw-ins{border:1px solid var(--rbw-border2,#2f3645);border-radius:8px;min-height:0;background:var(--rbw-surface2,#1c1f27);display:flex;flex-direction:column}
#rbw-bin{position:relative}
#rbw-bin-h,#rbw-ins-h{display:flex;align-items:center;gap:6px;padding:6px;border-bottom:1px solid var(--rbw-border2,#2f3645)}
#rbw-bin-h b,#rbw-ins-h b{font-size:11px;color:var(--rbw-muted,#aeb5c7)}
#rbw-bin-h button,#rbw-ins-h button{font-size:11px;padding:2px 6px}
#rbw-bin-h #bsize{width:86px}
#rbw-bin-b{display:grid;grid-template-columns:102px 1fr;min-height:0;flex:1}
#rbw-bin-tree{border-right:1px solid var(--rbw-border2,#2f3645);overflow:auto;padding:6px}
#rbw-bin-assets{overflow:auto;padding:6px}
.rbw-folder{font-size:11px;padding:3px 5px;border-radius:4px;cursor:pointer;color:var(--rbw-muted2,#9da6bb)}
.rbw-folder.s{background:var(--rbw-select-bg,#253052);color:var(--rbw-text2,#dce3f6)}
#rbw-bin-assets.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--rbw-bin-card-w,112px),1fr));gap:8px;align-content:start}
#rbw-bin-assets.grid .rbw-asset{display:flex;flex-direction:column;min-width:0;padding:6px;border:1px solid var(--rbw-border2,#2f3645);border-radius:6px;cursor:pointer}
#rbw-bin-assets.list .rbw-asset{display:flex;gap:8px;align-items:center;padding:6px;border:1px solid var(--rbw-border2,#2f3645);border-radius:6px;margin-bottom:6px;cursor:pointer}
.rbw-asset.s{border-color:var(--rbw-clip-sel-border,#8ec5ff);background:var(--rbw-select-bg,#253052)}
.rbw-asset .th{height:var(--rbw-bin-thumb,64px);border-radius:4px;background:linear-gradient(180deg,#3b455e,#1f2534);display:grid;place-items:center;font-size:10px;color:#dce3f6;overflow:hidden}
.rbw-asset .th img{width:100%;height:100%;object-fit:cover}
.rbw-asset .nm{font-size:10px;color:var(--rbw-text2,#dce3f6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:6px}
.rbw-folder.drop{outline:1px dashed var(--rbw-clip-sel-border,#8ec5ff);outline-offset:-1px}
#rbw-bin-resz{position:absolute;left:-4px;top:0;bottom:0;width:8px;cursor:ew-resize;z-index:6}
#rbw-vw{border:1px solid var(--rbw-border2,#2f3645);border-radius:8px;background:var(--rbw-preview-bg,#11151c);display:grid;grid-template-rows:1fr auto;min-height:0;position:relative}
#rbw-pb{display:grid;place-items:center;padding:6px;overflow:hidden;min-height:0}
#rbw-stage{background:#000;border:1px solid var(--rbw-border2,#2f3645);border-radius:4px;overflow:hidden;display:grid;place-items:center;max-width:100%;max-height:100%;position:relative}
#rbw-pm{width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;background:#000;display:block}
#rbw-vov{position:absolute;left:8px;right:8px;bottom:8px;display:flex;justify-content:center;opacity:0;pointer-events:none;transition:opacity .12s ease}
#rbw-vw:hover #rbw-vov,#rbw-vw.active #rbw-vov{opacity:1;pointer-events:auto}
#rbw-vbar{display:flex;align-items:center;gap:6px;background:rgba(16,20,28,.72);border:1px solid rgba(85,102,136,.55);border-radius:999px;padding:4px 8px}
#rbw-vbar button{font-size:11px;min-width:24px;height:22px;padding:0 8px;border-radius:999px}
#rbw-vbar input{width:86px}
#rbw-vbar span{font-size:11px;color:#d7e4ff}
#rbw-vmeta{display:none}
#rbw-vside-l,#rbw-vside-r{position:absolute;top:50%;transform:translateY(-50%);width:22px;height:48px;border-radius:6px;border:1px solid var(--rbw-btn-border,#3e4552);background:rgba(25,33,49,.82);color:#cfe0ff;display:grid;place-items:center;font-size:11px;cursor:pointer;z-index:4}
#rbw-vside-l{left:6px}
#rbw-vside-r{right:6px}
#rbw-ins-b{padding:8px;overflow:auto;min-height:0}
.ins-g{margin-bottom:10px}
.ins-g .t{font-size:10px;color:var(--rbw-muted,#aeb5c7);margin-bottom:4px}
.ins-row{display:grid;grid-template-columns:48px 1fr 42px 26px;gap:6px;align-items:center;margin-bottom:6px}
.ins-row label{font-size:10px;color:var(--rbw-muted2,#9da6bb)}
.ins-row input[type="range"]{width:100%}
.ins-row input[type="number"]{font-size:11px;padding:2px 4px}
.ins-row .rst{height:20px;padding:0 6px;font-size:10px;border-radius:4px;border:1px solid var(--rbw-btn-border,#3e4552);background:var(--rbw-btn-bg,#2a2f39);color:var(--rbw-text,#d9e1f5)}
#rbw-b{display:grid;grid-template-columns:var(--rbw-trackcol-w,176px) 1fr;min-height:0}
#rbw-side{overflow:auto;border-right:1px solid var(--rbw-border,#2e3440);background:var(--rbw-surface2,#1c1f27);padding:8px 6px}
#rbw-side .rbw-side-spacer{pointer-events:none}
.srow{height:40px;margin-bottom:8px;border:1px solid var(--rbw-border2,#2f3645);border-radius:6px;display:flex;align-items:center;justify-content:space-between;padding:0 6px;background:linear-gradient(180deg,var(--rbw-row-bg,#1a1f2a),#141925)}
.srow.audio-sep{margin-top:14px;position:relative}
.srow.audio-sep::before{content:"";position:absolute;left:0;right:0;top:-8px;height:1px;background:var(--rbw-border,#2e3440);opacity:.9}
.srow .n{font-size:11px;color:var(--rbw-muted2,#9da6bb)}
.srow .acts{display:flex;gap:4px}
.srow .tb{display:grid;place-items:center;width:20px;height:18px;padding:0;border-radius:3px;border:1px solid var(--rbw-btn-border,#3e4552);background:var(--rbw-btn-bg,#2a2f39);color:var(--rbw-text,#d9e1f5)}
.srow .tb.on{background:#35517a;border-color:#598ad6;color:#dfefff}
.srow .tb svg{width:11px;height:11px;display:block;pointer-events:none}
#rbw-list{display:none}
.i{padding:6px;border:1px solid var(--rbw-border2,#2f3645);border-radius:6px;margin-bottom:6px;background:var(--rbw-surface2,#1c1f27);color:var(--rbw-text2,#d7dceb);cursor:pointer}
.i.s{border-color:var(--rbw-select-border,#6b8cff);background:var(--rbw-select-bg,#253052)}
.i .mhead{display:flex;justify-content:space-between;align-items:center;gap:6px}
.i .acts{display:flex;gap:4px}
.i .tb{display:grid;place-items:center;width:20px;height:18px;padding:0;border-radius:3px;border:1px solid var(--rbw-btn-border,#3e4552);background:var(--rbw-btn-bg,#2a2f39);color:var(--rbw-text,#d9e1f5)}
.i .tb.on{background:#35517a;border-color:#598ad6;color:#dfefff}
.i .tb svg{width:11px;height:11px;display:block;pointer-events:none}
.rbw-clip-meta{margin-top:2px;font-size:11px;color:var(--rbw-muted2,#9da6bb)}
#rbw-r{padding:4px 8px;border-bottom:1px solid var(--rbw-border,#2e3440);background:linear-gradient(180deg,var(--rbw-surface3,#1a1d24),var(--rbw-bg,#16181d));font-size:11px;color:var(--rbw-muted,#aeb5c7)}
#rbw-track{position:relative;overflow:auto;background:linear-gradient(180deg,#14171c,#12161d 38%,#11151b);padding:10px 8px;height:auto}
#rbw-track .rbw-tick{position:absolute;top:0;height:10px;border-left:1px solid var(--rbw-border2,#2f3645);opacity:.75}
#rbw-track .rbw-tlbl{position:absolute;top:10px;transform:translateX(-50%);font-size:10px;color:var(--rbw-muted2,#95a0b8)}
#rbw-c{position:relative}
.row{position:relative;height:40px;margin-bottom:8px;border:1px solid var(--rbw-row-border,#2c3340);border-radius:6px;background:linear-gradient(180deg,var(--rbw-row-bg,#1a1f2a),#141925);z-index:1}
.row.audio-sep{margin-top:14px}
.row.audio-sep::before{content:"";position:absolute;left:0;right:0;top:-8px;height:1px;background:var(--rbw-border,#2e3440);opacity:.9}
.row.solo-dim{opacity:.45}
.row.drag-target{outline:1px dashed var(--rbw-clip-sel-border,#8ec5ff);outline-offset:-2px}
.clip{position:absolute;top:7px;height:24px;line-height:24px;padding:0 10px;color:var(--rbw-clip-text,#f2f5ff);border:1px solid var(--rbw-clip-border,#607bd6);border-radius:4px;cursor:grab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:linear-gradient(180deg,#4d67b8,#344c95);z-index:2}
.clip.t-video{background:linear-gradient(180deg,#4d67b8,#344c95);border-color:#607bd6}
.clip.t-audio{background:linear-gradient(180deg,#3f7f67,#2c5d4c);border-color:#5fa086}
.clip.s{background:var(--rbw-clip-sel-bg,#3f62c7);border-color:var(--rbw-clip-sel-border,#8ec5ff)}
.clip .title{position:relative;z-index:2}
.clip .vis{position:absolute;inset:0;border-radius:3px;opacity:.28;pointer-events:none;background-size:auto 100%;background-repeat:repeat-x;background-position:center}
.clip .wv{position:absolute;left:0;right:0;bottom:0;height:18px;opacity:.55;pointer-events:none}
.hnd{position:absolute;top:0;width:8px;height:100%;background:rgba(255,255,255,.18);cursor:ew-resize}
.hnd.l{left:0}.hnd.r{right:0}
.ph{position:absolute;top:0;bottom:0;width:2px;background:#ffcf66;z-index:20}
.mh{position:absolute;top:-6px;left:-5px;width:12px;height:12px;border-radius:50%;background:#ffcf66;border:1px solid #b58d2b;cursor:ew-resize}
.mk{position:absolute;top:-1px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #ff8a4b;cursor:ew-resize}
.ml{position:absolute;top:0;bottom:0;width:1px;background:#ff8a4b;opacity:.9;z-index:3}
.sg{position:absolute;top:0;bottom:0;width:1px;background:#7fd8ff;opacity:.95;box-shadow:0 0 0 1px rgba(127,216,255,.25)}
.gl{position:absolute;top:0;bottom:0;width:1px;background:rgba(122,138,170,.22);pointer-events:none;z-index:0}
#rbw-f{display:flex;justify-content:space-between;padding:6px 10px;border-top:1px solid var(--rbw-border,#2e3440);color:var(--rbw-muted,#aeb5c7);font-size:11px}
#rbw-tr{display:flex;justify-content:center;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--rbw-border,#2e3440);background:linear-gradient(180deg,#1f2430,#1a1f28)}
#rbw-tr button{font-size:11px;min-width:26px;height:24px;padding:0 8px;border-radius:999px;border:1px solid var(--rbw-btn-border,#3e4552);background:var(--rbw-btn-bg,#2a2f39);color:var(--rbw-text,#dce5ff)}
#rbw-tr #tplay{min-width:62px;background:#2b4f87;border-color:#5d8fda}
#rbw-tr #tloop{width:26px;min-width:26px;padding:0;display:grid;place-items:center}
#rbw-tr #tloop.on{background:#35517a;border-color:#6b97df;color:#e8f1ff}
#rbw-tc{min-width:90px;text-align:center;font-family:Consolas, monospace;font-size:11px;color:#cfe0ff}
#rbw-zoom{width:140px}
#rbw-main{display:grid;grid-template-rows:1fr;min-height:0;align-content:start}
#rbw-workspace{position:fixed;right:24px;top:90px;width:min(1080px,66vw);height:min(560px,56vh);min-width:640px;min-height:300px;z-index:10002;border:1px solid var(--rbw-border,#2e3440);background:var(--rbw-bg,#16181d);border-radius:8px;display:none;grid-template-rows:auto 1fr;overflow:hidden;resize:both}
#rbw-workspace.open{display:grid}
#rbw-wsh{display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--rbw-border2,#2f3645);background:var(--rbw-surface,#1d2129);cursor:move}
#rbw-wsh .sp{margin-left:auto}
#rbw-wsh button{font-size:11px;padding:3px 8px}
#rbw-work{height:100%;border-bottom:0}
`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const qstep = (v, s) => (!s || s <= 0 ? v : Math.round(v / s) * s);
const get = async (u) => { const r = await fetch(u, { credentials: "same-origin" }); if (!r.ok) throw new Error(`${u}:${r.status}`); return r.json(); };
const post = async (u, p) => { const r = await fetch(u, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p || {}) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `${u}:${r.status}`); return j; };
const postForm = async (u, form) => { const r = await fetch(u, { method: "POST", credentials: "same-origin", body: form }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `${u}:${r.status}`); return j; };

app.registerExtension({
  name: "ComfyUI.TimelineBridge",
  setup() {
    if (document.getElementById("rbw-panel")) return;
    const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);

    const panel = document.createElement("div"); panel.id = "rbw-panel";
    const formatOptions = FORMAT_PRESETS.map((f) => `<option value="${f.id}">${f.name} (${f.width}x${f.height})</option>`).join("");
    panel.innerHTML = `<div id="rbw-resz"></div><div id="rbw-h"><div id="rbw-tabs"><button class="tab on">Editor</button><button class="tab">Generate</button><button class="tab">Stock</button><button class="tab">LLM</button><button class="tab">Export</button></div><b style="color:var(--rbw-text,#e9edf6)">RBW Timeline</b><button id="a">Add Clip</button><button id="tv">+Video Track</button><button id="ta">+Audio Track</button><button id="td">Del Track</button><button id="tda">Del All Tracks</button><button id="tcw">TrackCol</button><button id="ic">Import Clip</button><button id="m">Add Marker</button><button id="rz">Razor</button><button id="ti">Trim In@PH</button><button id="to">Trim Out@PH</button><button id="q">Queue Sel</button><button id="d">Delete Sel</button><button id="y">Sync</button><button id="r">Ripple Off</button><button id="se">Snap E</button><button id="sm">Snap M</button><button id="sp">Snap P</button><button id="sg">Snap G</button><button id="km">Keymap</button><button id="hs">History</button><button id="undo">Undo</button><button id="redo">Redo</button><select id="fmt"><option value="">Format...</option>${formatOptions}<option value="custom">Custom...</option></select><button id="ex">Export</button><button id="er">Render</button><button id="erq">RenderQ</button><button id="im">Import</button><button id="vw" title="Toggle Viewer">Viewer</button><button id="tb" title="Toggle Bin">Bin</button><button id="tii" title="Toggle Inspector">Inspector</button><button id="c" style="margin-left:auto;background:#c94b4b;border-color:#d05c5c">Close</button><input id="fi" type="file" accept=".json,application/json" style="display:none"/><input id="fclip" type="file" accept="video/*,audio/*,image/*" style="display:none"/></div><div id="rbw-tr"><button id="trew">|&lt;</button><button id="tbk">&lt;</button><button id="tplay">Play</button><button id="tloop">↺</button><button id="tfd">&gt;</button><button id="tend">&gt;|</button><span id="rbw-tc">00:00.00</span><input id="rbw-zoom" type="range" min="40" max="800" step="5" value="100"/></div><div id="rbw-main"><div id="rbw-b"><div id="rbw-side"></div><div style="display:grid;grid-template-rows:auto 1fr;min-width:0;min-height:0"><div id="rbw-r"><span id="l"></span><span id="rr" style="float:right"></span><div id="ticks" style="position:relative;height:22px;margin-top:4px"></div></div><div id="rbw-track"><div id="rbw-c"></div></div></div></div></div><div id="rbw-f"><span id="st">Loading...</span><span id="in">zoom 1.00x</span></div>`;
    document.body.appendChild(panel);

    const workspace = document.createElement("div");
    workspace.id = "rbw-workspace";
    workspace.innerHTML = `<div id="rbw-wsh"><b style="color:var(--rbw-text,#e9edf6)">RBW Viewer</b><button id="wpop" title="Open on second monitor">Popout</button><button id="wclose">Hide</button><span class="sp"></span><span style="font-size:11px;color:var(--rbw-muted,#aeb5c7)">Drag this bar to move</span></div><div id="rbw-work"><div id="rbw-bin"><div id="rbw-bin-resz" title="Resize Bin"></div><div id="rbw-bin-h"><b>Bin</b><input id="bsearch" placeholder="search" style="width:92px"/><select id="bfilter"><option value="all">all</option><option value="video">video</option><option value="audio">audio</option><option value="image">image</option></select><select id="bsort"><option value="name">name</option><option value="duration">duration</option><option value="fps">fps</option></select><input id="bsize" type="range" min="48" max="140" step="2" value="64"/><button id="bf">+Folder</button><button id="bs">+Sub</button><button id="bdel">-Folder</button><button id="bv">Grid</button></div><div id="rbw-bin-b"><div id="rbw-bin-tree"></div><div id="rbw-bin-assets" class="grid"></div></div></div><div id="rbw-vw"><button id="rbw-vside-l" title="Toggle Bin">◀</button><button id="rbw-vside-r" title="Toggle Inspector">▶</button><div id="rbw-pb">No clip active</div><div id="rbw-vov"><div id="rbw-vbar"><button id="vpp">Play</button><button id="vam">Mute</button><input id="vvol" type="range" min="0" max="100" step="1" value="100"/><span id="vtc">00:00.00</span></div></div><div id="rbw-vmeta"></div></div><div id="rbw-ins"><div id="rbw-ins-h"><b>Inspector</b></div><div id="rbw-ins-b"></div></div></div>`;
    document.body.appendChild(workspace);

    const fab = document.createElement("button"); fab.id = "rbw-fab"; fab.textContent = "Timeline"; document.body.appendChild(fab);

    const st = {
      p: null, t: [], c: [], sel: new Set(), active: null,
      zoom: 1, snap: 0.25, playhead: 0, ripple: false, drag: null,
      snapFlags: { edge: true, marker: true, playhead: true, grid: true },
      keymap: {},
      tool: "select",
      shuttleDir: 0,
      loopIn: 0,
      loopOut: null,
      play: false, playTimer: null,
      loop: false,
      thumbs: new Map(), waves: new Map(), wavesInFlight: new Set(),
      previewSyncLock: false, previewClipId: null,
      snapGuide: null,
      bin: { view_mode: "grid", folders: [{ id: "root", name: "Assets", parent_id: null }], assets: [], selected_folder_id: "root", search: "", filter: "all", sort: "name", selected_assets: [] },
      selectedAsset: null,
      binOpen: true,
      insOpen: true,
      viewerOpen: true,
      viewerMuted: true,
      viewerVolume: 1,
      insSaveTimer: null,
      wsDrag: null,
      binResize: null,
      viewerWin: null,
      panelResize: null,
      panelUserHeight: null,
      panelSeenTrackCount: null,
      boxSelect: null
    };
    const history = { undo: [], redo: [], max: 80, busy: false };

    const el = {
      list: panel.querySelector("#rbw-list"), side: panel.querySelector("#rbw-side"), track: panel.querySelector("#rbw-track"), canvas: panel.querySelector("#rbw-c"),
      status: panel.querySelector("#st"), info: panel.querySelector("#in"), file: panel.querySelector("#fi"), fileClip: panel.querySelector("#fclip"),
      ticks: panel.querySelector("#ticks"), rr: panel.querySelector("#rr"), pb: workspace.querySelector("#rbw-pb"), fmt: panel.querySelector("#fmt"),
      tplay: panel.querySelector("#tplay"), tc: panel.querySelector("#rbw-tc"), z: panel.querySelector("#rbw-zoom"),
      work: workspace.querySelector("#rbw-work"), binTree: workspace.querySelector("#rbw-bin-tree"), binAssets: workspace.querySelector("#rbw-bin-assets"),
      binResz: workspace.querySelector("#rbw-bin-resz"), bsize: workspace.querySelector("#bsize"),
      bsearch: workspace.querySelector("#bsearch"), bfilter: workspace.querySelector("#bfilter"), bsort: workspace.querySelector("#bsort"),
      ins: workspace.querySelector("#rbw-ins-b"), vmeta: workspace.querySelector("#rbw-vmeta"), vpp: workspace.querySelector("#vpp"), vam: workspace.querySelector("#vam"),
      vvol: workspace.querySelector("#vvol"), vtc: workspace.querySelector("#vtc"),
      workspace, wsHead: workspace.querySelector("#rbw-wsh")
    };

    function applyTheme() {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      const body = getComputedStyle(document.body);
      const targets = [panel.style, fab.style, workspace.style];
      const setVar = (k, v) => targets.forEach((t) => t.setProperty(k, v));
      setVar("--rbw-bg", cs.getPropertyValue("--comfy-menu-bg-color")?.trim() || body.backgroundColor || "#16181d");
      setVar("--rbw-surface", cs.getPropertyValue("--comfy-input-bg")?.trim() || "#1d2129");
      setVar("--rbw-surface2", cs.getPropertyValue("--comfy-menu-bg-color")?.trim() || "#1c1f27");
      setVar("--rbw-surface3", cs.getPropertyValue("--comfy-menu-bg-color")?.trim() || "#1a1d24");
      setVar("--rbw-surface4", cs.getPropertyValue("--comfy-input-bg")?.trim() || "#1c2230");
      setVar("--rbw-track-bg", cs.getPropertyValue("--comfy-bg-color")?.trim() || "#14171c");
      setVar("--rbw-row-bg", cs.getPropertyValue("--comfy-menu-bg-color")?.trim() || "#1a1f2a");
      setVar("--rbw-border", cs.getPropertyValue("--comfy-border-color")?.trim() || "#2e3440");
      setVar("--rbw-border2", cs.getPropertyValue("--comfy-border-color")?.trim() || "#2f3645");
      setVar("--rbw-text", cs.getPropertyValue("--input-text")?.trim() || body.color || "#fff");
      setVar("--rbw-text2", cs.getPropertyValue("--input-text")?.trim() || "#d7dceb");
      setVar("--rbw-muted", cs.getPropertyValue("--descrip-text")?.trim() || "#aeb5c7");
      setVar("--rbw-muted2", cs.getPropertyValue("--descrip-text")?.trim() || "#9da6bb");
      setVar("--rbw-accent", cs.getPropertyValue("--comfy-button-bg")?.trim() || "#2c3a68");
      setVar("--rbw-preview-bg", cs.getPropertyValue("--comfy-menu-bg-color")?.trim() || "#11151c");
    }
    function setupMediaHoverControls(media) {
      if (!media) return;
      const setControls = (v) => { if (v) media.setAttribute("controls", "controls"); else media.removeAttribute("controls"); };
      setControls(false);
      const viewer = workspace.querySelector("#rbw-vw");
      if (!viewer) return;
      viewer.onmouseenter = () => setControls(true);
      viewer.onmouseleave = () => setControls(false);
    }

    const dur = () => Math.max(1, Number(st.p?.timeline?.duration || 60));
    const pps = () => 80 * st.zoom;
    const t2x = (t) => Number(t || 0) * pps();
    const x2t = (x) => x / pps();
    const srcDur = (c) => Math.max(Number(c?.meta?.source_duration || c?.duration || 0), Number(c?.duration || 0), st.snap);
    function normTrim(c) {
      const sdur = srcDur(c);
      const ts = clamp(Number(c.trim_start || 0), 0, sdur - st.snap);
      const te0 = Number(c.trim_end || ts + Number(c.duration || st.snap));
      const te = clamp(te0, ts + st.snap, sdur);
      c.trim_start = ts;
      c.trim_end = te;
      return { ts, te, sdur };
    }
    const markers = () => { if (!st.p?.timeline) st.p = { timeline: {} }; if (!Array.isArray(st.p.timeline.markers)) st.p.timeline.markers = []; return st.p.timeline.markers; };
    const frame = () => {
      if (!st.p?.timeline) st.p = { timeline: {} };
      if (!st.p.timeline.frame) st.p.timeline.frame = { name: "16:9 HD", width: 1920, height: 1080 };
      return st.p.timeline.frame;
    };
    const frameRatio = () => {
      const f = frame();
      const w = Math.max(1, Number(f.width || 1920));
      const h = Math.max(1, Number(f.height || 1080));
      return w / h;
    };
    const active = () => st.c.find((x) => x.id === st.active) || null;
    const activeAtPlayhead = () => {
      const a = active();
      if (a) return a;
      return st.c.find((x) => !!x.output_url) || null;
    };
    const selClips = () => st.c.filter((x) => st.sel.has(x.id));
    const setMsg = (m, e = false) => { el.status.textContent = m; el.status.style.color = e ? "#ff8f8f" : "#aeb5c7"; };
    const canKeys = (t) => panel.classList.contains("open") && !["INPUT", "TEXTAREA"].includes((t?.tagName || "").toUpperCase()) && !t?.isContentEditable;
    const defaultKeymap = () => ({
      play_toggle: "Space",
      undo: "Ctrl+Z",
      redo: "Ctrl+Y",
      step_left: "ArrowLeft",
      step_right: "ArrowRight",
      add_marker: "M",
      set_loop_in: "I",
      set_loop_out: "O",
      trim_in_at_playhead: "Alt+I",
      trim_out_at_playhead: "Alt+O",
      razor_at_playhead: "C",
      delete_selected: "Delete",
      j_backward: "J",
      k_stop: "K",
      l_forward: "L",
    });
    const parseCombo = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return { key: "", ctrl: false, alt: false, shift: false, meta: false };
      const parts = raw.split("+").map((x) => x.trim().toLowerCase()).filter(Boolean);
      let key = parts[parts.length - 1] || "";
      const aliases = { left: "arrowleft", right: "arrowright", del: "delete", spacebar: "space", space: "space" };
      key = aliases[key] || key;
      return {
        key,
        ctrl: parts.includes("ctrl"),
        alt: parts.includes("alt"),
        shift: parts.includes("shift"),
        meta: parts.includes("meta") || parts.includes("cmd"),
      };
    };
    const comboMatch = (ev, combo) => {
      const c = parseCombo(combo);
      if (!c.key) return false;
      const key = String(ev.key || "").toLowerCase();
      const code = String(ev.code || "").toLowerCase();
      const keyMatch = key === c.key || code === c.key || code === `key${c.key}`;
      return keyMatch && (!!ev.ctrlKey === c.ctrl) && (!!ev.altKey === c.alt) && (!!ev.shiftKey === c.shift) && (!!ev.metaKey === c.meta);
    };
    const snapStep = () => {
      const base = Math.max(0.01, Number(st.snap || 0.25));
      if (!st.snapFlags.grid) return 0.001;
      return base;
    };
    const qs = (v) => qstep(v, snapStep());
    const choose = (id, multi) => { if (!multi) st.sel.clear(); if (st.sel.has(id) && multi) st.sel.delete(id); else st.sel.add(id); st.active = id; };
    const saveProject = async () => {
      if (st.p) st.p.bin = { ...st.bin, folders: [...st.bin.folders], assets: [...st.bin.assets] };
      if (st.p?.timeline) {
        st.p.timeline.snap = { enabled: { ...st.snapFlags }, grid_step: Number(st.snap || 0.25) };
        st.p.timeline.shortcuts = { ...st.keymap };
        st.p.timeline.loop_range = { in: Number(st.loopIn || 0), out: st.loopOut == null ? null : Number(st.loopOut), enabled: !!st.loop };
      }
      return post(API.project, { project: st.p });
    };
    const captureHistoryState = () => JSON.parse(JSON.stringify({
      project: st.p,
      playhead: st.playhead,
      zoom: st.zoom,
      ripple: st.ripple,
      loop: st.loop,
      selected: [...st.sel],
      active: st.active,
      binOpen: st.binOpen,
      insOpen: st.insOpen,
      viewerOpen: st.viewerOpen
    }));
    const restoreHistoryState = async (snap) => {
      if (!snap || history.busy) return;
      history.busy = true;
      try {
        st.p = JSON.parse(JSON.stringify(snap.project || st.p || {}));
        st.playhead = Number(snap.playhead || 0);
        st.zoom = clamp(Number(snap.zoom || 1), 0.4, 8);
        st.ripple = !!snap.ripple;
        st.loop = !!snap.loop;
        st.active = snap.active || null;
        st.sel = new Set(Array.isArray(snap.selected) ? snap.selected : []);
        st.binOpen = snap.binOpen !== false;
        st.insOpen = snap.insOpen !== false;
        st.viewerOpen = snap.viewerOpen !== false;
        await post(API.project, { project: st.p });
        await refresh();
      } finally {
        history.busy = false;
      }
    };
    const pushHistory = () => {
      if (history.busy) return;
      history.undo.push(captureHistoryState());
      if (history.undo.length > history.max) history.undo.shift();
      history.redo = [];
    };
    const beginTransaction = () => pushHistory();
    const endTransaction = async (message = "") => {
      await saveProject();
      if (message) setMsg(message);
    };
    const doUndo = async () => {
      if (!history.undo.length || history.busy) return;
      const prev = history.undo.pop();
      history.redo.push(captureHistoryState());
      await restoreHistoryState(prev);
      setMsg("Undo");
    };
    const doRedo = async () => {
      if (!history.redo.length || history.busy) return;
      const next = history.redo.pop();
      history.undo.push(captureHistoryState());
      await restoreHistoryState(next);
      setMsg("Redo");
    };
    const panelCurrentHeight = () => Math.max(PANEL_MIN_HEIGHT_PX, Math.round(panel.getBoundingClientRect().height || 0) || Math.round(window.innerHeight * 0.38));
    const panelApplyHeight = (hpx) => {
      const maxH = Math.max(PANEL_MIN_HEIGHT_PX, Math.floor(window.innerHeight * 0.85));
      const next = clamp(Math.round(Number(hpx) || PANEL_MIN_HEIGHT_PX), PANEL_MIN_HEIGHT_PX, maxH);
      panel.style.height = `${next}px`;
      return next;
    };
    const panelEnsureHeightState = () => {
      if (st.panelUserHeight == null) st.panelUserHeight = panelCurrentHeight();
      if (st.panelSeenTrackCount == null) st.panelSeenTrackCount = Array.isArray(st.t) ? st.t.length : 0;
    };
    const panelAutoGrowOnTrackIncrease = () => {
      panelEnsureHeightState();
      const currentTracks = Array.isArray(st.t) ? st.t.length : 0;
      if (currentTracks > st.panelSeenTrackCount) {
        const delta = currentTracks - st.panelSeenTrackCount;
        st.panelUserHeight = panelApplyHeight((st.panelUserHeight || panelCurrentHeight()) + (delta * PANEL_AUTO_GROW_PER_TRACK_PX));
      }
      st.panelSeenTrackCount = currentTracks;
    };
    const fmtClock = (v) => { const t = Math.max(0, Number(v || 0)); const m = Math.floor(t / 60); const s = Math.floor(t % 60); const cs = Math.floor((t - Math.floor(t)) * 100); return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`; };
    const syncTracksToProject = () => { if (!st.p) return; st.p.tracks = st.t.map((t) => ({ ...t })); };
    const nextTrackNumber = (type) => {
      const t = type === "audio" ? "audio" : "video";
      let maxNum = 0;
      for (const tr of st.t) {
        if ((tr?.type || "video") !== t) continue;
        const m = String(tr?.id || "").match(new RegExp(`^${t}-(\\d+)$`));
        if (m) maxNum = Math.max(maxNum, Number(m[1]) || 0);
      }
      return maxNum + 1;
    };
    const makeTrack = (type) => {
      const t = type === "audio" ? "audio" : "video";
      const n = nextTrackNumber(t);
      return {
        id: `${t}-${n}`,
        name: `${t === "audio" ? "Audio" : "Video"} ${n}`,
        type: t,
        muted: false,
        locked: false,
        visible: true,
        solo: false
      };
    };
    const normalizeTrackType = (tr) => {
      if (tr?.type === "audio" || String(tr?.id || "").startsWith("audio-")) return "audio";
      return "video";
    };
    const orderTracksVideoThenAudio = () => {
      st.t = [...st.t].map((tr) => ({ ...tr, type: normalizeTrackType(tr) })).sort((a, b) => {
        const ta = normalizeTrackType(a);
        const tb = normalizeTrackType(b);
        if (ta === tb) return 0;
        return ta === "video" ? -1 : 1;
      });
    };
    const ensureTrackForClip = (clip) => {
      const trackId = String(clip?.track_id || "").trim();
      if (!trackId) return;
      if (st.t.some((t) => t.id === trackId)) return;
      const t = clip?.type === "audio" || trackId.startsWith("audio-") ? "audio" : "video";
      st.t.push({
        id: trackId,
        name: t === "audio" ? `Audio ${trackId.replace("audio-", "") || "1"}` : `Video ${trackId.replace("video-", "") || "1"}`,
        type: t,
        muted: false,
        locked: false,
        visible: true,
        solo: false
      });
    };
    const activeTrackId = () => {
      const c = active();
      return c?.track_id || null;
    };
    const findTrackForDelete = () => {
      const byActive = activeTrackId();
      if (byActive) {
        const t = st.t.find((x) => x.id === byActive);
        if (t) return t;
      }
      return st.t[st.t.length - 1] || null;
    };
    const deleteTrackById = async (trackId, opts = {}) => {
      const target = st.t.find((x) => x.id === trackId);
      if (!target) return;
      const clipIds = st.c.filter((c) => c.track_id === trackId).map((c) => c.id);
      if (clipIds.length) await Promise.all(clipIds.map((id) => post(API.deleteClip, { id })));
      st.t = st.t.filter((x) => x.id !== trackId);
      st.sel = new Set([...st.sel].filter((id) => !clipIds.includes(id)));
      if (st.active && clipIds.includes(st.active)) st.active = null;
      syncTracksToProject();
      if (!opts.skipProjectSave) await saveProject();
      if (!opts.skipRefresh) await refresh();
      if (!opts.skipMessage) setMsg(`Track deleted (${target.name || target.id})`);
    };
    const deleteAllTracks = async (opts = {}) => {
      if (!st.t.length) return;
      const ids = st.c.map((c) => c.id);
      if (ids.length) await Promise.all(ids.map((id) => post(API.deleteClip, { id })));
      st.t = [];
      st.sel.clear();
      st.active = null;
      syncTracksToProject();
      if (!opts.skipProjectSave) await saveProject();
      if (!opts.skipRefresh) await refresh();
      if (!opts.skipMessage) setMsg("All tracks deleted");
    };
    function scheduleTransformSave(c) {
      if (!c) return;
      if (st.insSaveTimer) window.clearTimeout(st.insSaveTimer);
      st.insSaveTimer = window.setTimeout(() => {
        run(async () => {
          await post(API.updateClip, { id: c.id, transform: c.transform, audio: c.audio, keyframes: c.keyframes });
        });
      }, 180);
    }
    const icon = (a) => {
      if (a === "mute") return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h3l3-3v10L5 10H2z"/><path d="M11 6l3 4M14 6l-3 4"/></svg>`;
      if (a === "solo") return `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.8 3.7L14 5.3l-3 2.9.7 4.2L8 10.6l-3.7 1.8.7-4.2-3-2.9 4.2-.6z"/></svg>`;
      if (a === "lock") return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 115 0v2"/></svg>`;
      if (a === "del") return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h10"/><path d="M6 4V2.7h4V4"/><path d="M5 4.5l.5 8h5l.5-8"/><path d="M7 6.2v4.8M9 6.2v4.8"/></svg>`;
      return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4z"/><circle cx="8" cy="8" r="1.8"/></svg>`;
    };
    const uid = (pfx = "id") => `${pfx}_${Math.random().toString(36).slice(2, 10)}`;
    function ensureTimelineSettings() {
      if (!st.p || !st.p.timeline) return;
      const tl = st.p.timeline;
      const snap = (tl.snap && typeof tl.snap === "object") ? tl.snap : {};
      const enabled = (snap.enabled && typeof snap.enabled === "object") ? snap.enabled : {};
      st.snapFlags = {
        edge: enabled.edge !== false,
        marker: enabled.marker !== false,
        playhead: enabled.playhead !== false,
        grid: enabled.grid !== false,
      };
      st.snap = Math.max(0.01, Number(snap.grid_step || st.snap || 0.25));
      tl.snap = { enabled: { ...st.snapFlags }, grid_step: st.snap };
      const loop = (tl.loop_range && typeof tl.loop_range === "object") ? tl.loop_range : {};
      st.loopIn = Math.max(0, Number(loop.in || 0));
      st.loopOut = loop.out == null ? null : Math.max(st.loopIn + 0.01, Number(loop.out));
      st.loop = !!loop.enabled;
      tl.loop_range = { in: st.loopIn, out: st.loopOut, enabled: !!loop.enabled };
      st.keymap = { ...defaultKeymap(), ...((tl.shortcuts && typeof tl.shortcuts === "object") ? tl.shortcuts : {}) };
      tl.shortcuts = { ...st.keymap };
      if (!["full", "half", "quarter"].includes(String(tl.proxy_quality || ""))) tl.proxy_quality = "full";
    }
    function ensureBin() {
      const b = st.p?.bin && typeof st.p.bin === "object" ? st.p.bin : {};
      const folders = Array.isArray(b.folders) && b.folders.length ? b.folders : [{ id: "root", name: "Assets", parent_id: null }];
      const assets = Array.isArray(b.assets) ? b.assets : [];
      st.bin = {
        view_mode: b.view_mode === "list" ? "list" : "grid",
        folders,
        assets,
        thumb_size: Number(b.thumb_size || 64),
        width: Number(b.width || 320),
        search: String(b.search || ""),
        filter: String(b.filter || "all"),
        sort: String(b.sort || "name"),
        selected_folder_id: folders.some((x) => x.id === b.selected_folder_id) ? b.selected_folder_id : "root",
        selected_assets: Array.isArray(b.selected_assets) ? b.selected_assets.map((x) => String(x)) : [],
      };
      if (!st.p.bin) st.p.bin = { ...st.bin };
    }
    function applyBinLayout() {
      st.bin.thumb_size = clamp(Number(st.bin.thumb_size || 64), 48, 140);
      st.bin.width = clamp(Number(st.bin.width || 320), 210, 900);
      const cardW = Math.max(112, Math.round(st.bin.thumb_size * 1.35));
      workspace.style.setProperty("--rbw-bin-thumb", `${st.bin.thumb_size}px`);
      workspace.style.setProperty("--rbw-bin-card-w", `${cardW}px`);
      workspace.style.setProperty("--rbw-bin-w", `${st.bin.width}px`);
      if (el.bsize) el.bsize.value = `${Math.round(st.bin.thumb_size)}`;
    }
    function nextFolderName(prefix) {
      let i = 1;
      const names = new Set((st.bin.folders || []).map((f) => String(f.name || "").toLowerCase()));
      while (names.has(`${prefix} ${i}`.toLowerCase())) i += 1;
      return `${prefix} ${i}`;
    }
    function folderDescendants(folderId) {
      const out = new Set([folderId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of (st.bin.folders || [])) {
          if (!f || !f.id || out.has(f.id)) continue;
          if (f.parent_id && out.has(f.parent_id)) {
            out.add(f.id);
            changed = true;
          }
        }
      }
      return out;
    }
    function clipToAsset(c) {
      const media = clipUrl(c);
      if (!media) return null;
      const meta = (c.meta && typeof c.meta === "object") ? c.meta : {};
      const md = (meta.metadata && typeof meta.metadata === "object") ? meta.metadata : {};
      return {
        id: c.id,
        folder_id: "root",
        name: c.prompt || c.id,
        clip_id: c.id,
        type: c.type || "video",
        thumb_url: media,
        media_url: media,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        meta: {
          fps: md.fps,
          duration: md.duration || meta.source_duration,
          width: md.width,
          height: md.height,
          video_codec: md.video_codec,
          audio_codec: md.audio_codec,
        },
      };
    }
    function hydrateBinFromClips() {
      const byId = new Map(st.bin.assets.map((a) => [a.id, a]));
      for (const c of st.c) {
        const a = clipToAsset(c);
        if (!a) continue;
        if (!byId.has(a.id)) {
          st.bin.assets.push(a);
          byId.set(a.id, a);
        } else {
          const prev = byId.get(a.id);
          prev.name = a.name;
          prev.type = a.type;
          prev.thumb_url = a.thumb_url;
          prev.media_url = a.media_url;
        }
      }
      st.bin.assets = st.bin.assets.filter((a) => !a.clip_id || st.c.some((c) => c.id === a.clip_id));
    }
    function clipUrl(c) {
      const raw = (c && c.output_url) ? String(c.output_url) : "";
      if (!raw) return "";
      if (raw.startsWith("/rbw_timeline/media/")) {
        try {
          const fn = decodeURIComponent(raw.slice("/rbw_timeline/media/".length).split("?")[0]);
          if (fn) return `/view?filename=${encodeURIComponent(fn)}&type=input&subfolder=timeline_assets`;
        } catch (_e) {}
      }
      return raw;
    }
    function applyFormatUI() {
      const f = frame();
      const stage = el.pb.querySelector("#rbw-stage");
      if (stage) {
        const ratio = Math.max(0.1, Math.max(1, Number(f.width || 1920)) / Math.max(1, Number(f.height || 1080)));
        const bw = Math.max(16, el.pb.clientWidth - 4);
        const bh = Math.max(16, el.pb.clientHeight - 4);
        let w = bw;
        let h = w / ratio;
        if (h > bh) {
          h = bh;
          w = h * ratio;
        }
        stage.style.width = `${Math.max(16, Math.floor(w))}px`;
        stage.style.height = `${Math.max(16, Math.floor(h))}px`;
      }
      const match = FORMAT_PRESETS.find((x) => x.width === Number(f.width) && x.height === Number(f.height));
      if (el.fmt && match) el.fmt.value = match.id;
      if (el.fmt && !match) el.fmt.value = "custom";
    }
    function syncPreviewToPlayhead() {
      const media = el.pb.querySelector("#rbw-pm");
      if (!media || st.previewSyncLock) return;
      const c = st.c.find((x) => x.id === st.previewClipId) || activeAtPlayhead();
      if (!c) return;
      const local = Number(st.playhead || 0) - Number(c.start_time || 0) + Number(c.trim_start || 0);
      const minT = Math.max(0, Number(c.trim_start || 0));
      const maxT = Math.max(minT, Number(c.trim_end || c.duration || minT));
      const target = clamp(local, minT, maxT);
      if (!Number.isFinite(target)) return;
      if (Math.abs(Number(media.currentTime || 0) - target) <= 0.04) return;
      st.previewSyncLock = true;
      try { media.currentTime = target; } catch (_e) {}
      if (el.vtc) el.vtc.textContent = fmtClock(target);
      syncExternalViewer();
      window.setTimeout(() => { st.previewSyncLock = false; }, 16);
    }
    function bindPreviewTransport(media, c) {
      if (!media || !c) return;
      const onTime = () => {
        if (st.previewSyncLock) return;
        st.previewSyncLock = true;
        st.playhead = clamp(
          Number(c.start_time || 0) + Number(media.currentTime || 0) - Number(c.trim_start || 0),
          0,
          dur()
        );
        renderTrack();
        renderRuler();
        if (el.vtc) el.vtc.textContent = fmtClock(Number(media.currentTime || 0));
        syncExternalViewer();
        window.setTimeout(() => { st.previewSyncLock = false; }, 16);
      };
      media.addEventListener("timeupdate", onTime);
      media.addEventListener("play", () => workspace.querySelector("#rbw-vw")?.classList.add("active"));
      media.addEventListener("pause", () => workspace.querySelector("#rbw-vw")?.classList.remove("active"));
      media.addEventListener("ended", () => {
        if (st.loop) {
          st.playhead = clamp(Number(st.loopIn || 0), 0, dur());
          renderTrack();
          renderRuler();
          syncOrRefreshPreview();
          const p = media.play?.();
          if (p && p.catch) p.catch(() => {});
          return;
        }
        st.play = false;
        if (st.playTimer) { clearInterval(st.playTimer); st.playTimer = null; }
        if (el.vpp) el.vpp.textContent = "Play";
      });
    }
    function syncOrRefreshPreview() {
      const c = active();
      if (!c || st.previewClipId !== c.id) previewUpdate();
      else syncPreviewToPlayhead();
    }

    async function buildVideoThumb(url) {
      if (st.thumbs.has(url)) return st.thumbs.get(url);
      const v = document.createElement("video");
      v.src = url; v.muted = true; v.playsInline = true; v.preload = "metadata"; v.crossOrigin = "anonymous";
      const dataUrl = await new Promise((resolve) => {
        let done = false;
        const fallback = () => { if (done) return; done = true; resolve(""); };
        const capture = () => {
          if (done) return;
          try {
            const w = 120, h = 68;
            const c = document.createElement("canvas"); c.width = w; c.height = h;
            const ctx = c.getContext("2d");
            ctx.drawImage(v, 0, 0, w, h);
            done = true;
            resolve(c.toDataURL("image/jpeg", 0.75));
          } catch (_e) { fallback(); }
        };
        v.onloadeddata = () => { try { v.currentTime = Math.min(0.2, Math.max(0, (v.duration || 0) * 0.05)); } catch (_e) {} };
        v.onseeked = capture;
        v.onerror = fallback;
        window.setTimeout(fallback, 1800);
      });
      st.thumbs.set(url, dataUrl || "");
      return dataUrl || "";
    }

    async function buildAudioPeaks(url, bins = 72) {
      const b = Math.max(24, Math.floor(bins));
      const key = `${url}::${b}`;
      if (st.waves.has(key)) return st.waves.get(key);
      if (st.wavesInFlight.has(key)) return null;
      st.wavesInFlight.add(key);
      try {
        const r = await fetch(url, { credentials: "same-origin" });
        if (!r.ok) throw new Error(`audio:${r.status}`);
        const ab = await r.arrayBuffer();
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const buf = await ac.decodeAudioData(ab.slice(0));
        const data = buf.getChannelData(0);
        const size = Math.max(1, Math.floor(data.length / b));
        const peaks = new Array(b).fill(0);
        for (let i = 0; i < b; i++) {
          let m = 0;
          const start = i * size;
          const end = Math.min(data.length, start + size);
          for (let j = start; j < end; j++) {
            const v = Math.abs(data[j]);
            if (v > m) m = v;
          }
          peaks[i] = m;
        }
        st.waves.set(key, peaks);
        ac.close();
        return peaks;
      } catch (_e) {
        st.waves.set(key, []);
        return [];
      } finally {
        st.wavesInFlight.delete(key);
      }
    }

    function previewUpdate() {
      const c = activeAtPlayhead();
      if (!c) {
        st.previewClipId = null;
        el.pb.innerHTML = "No clip active";
        if (el.vtc) el.vtc.textContent = "00:00.00";
        syncExternalViewer();
        return;
      }
      st.previewClipId = c.id;
      const mediaUrl = clipUrl(c);
      if (mediaUrl) {
        const src = `${mediaUrl}${mediaUrl.includes("?") ? "&" : "?"}rbw_preview=1`;
        if (c.type === "image") {
          el.pb.innerHTML = `<div id="rbw-stage"><img id="rbw-pm" src="${src}" alt="preview" /></div>`;
          applyFormatUI();
          applyClipVisual(c);
          return;
        }
        if (c.type === "audio") {
          el.pb.innerHTML = `<div id="rbw-stage"><audio id="rbw-pm" controls preload="metadata" src="${src}"></audio></div>`;
          applyFormatUI();
          const audio = el.pb.querySelector("#rbw-pm");
          audio.muted = st.viewerMuted;
          audio.volume = clamp(Number(st.viewerVolume || 1), 0, 1);
          setupMediaHoverControls(audio);
          bindPreviewTransport(audio, c);
          syncPreviewToPlayhead();
          return;
        }
        el.pb.innerHTML = `<div id="rbw-stage"><video id="rbw-pm" controls playsinline preload="metadata" src="${src}"></video></div>`;
        applyFormatUI();
        const video = el.pb.querySelector("#rbw-pm");
        video.muted = st.viewerMuted;
        video.volume = clamp(Number(st.viewerVolume || 1), 0, 1);
        setupMediaHoverControls(video);
        bindPreviewTransport(video, c);
        applyClipVisual(c);
        syncPreviewToPlayhead();
        return;
      }
      el.pb.innerHTML = "";
      syncExternalViewer();
    }
    function applyClipVisual(c) {
      if (!c) return;
      const media = el.pb.querySelector("#rbw-pm");
      if (!media) return;
      const tr = c.transform || {};
      const localT = clamp(Number(st.playhead || 0) - Number(c.start_time || 0), 0, Number(c.duration || 0));
      const kf = Array.isArray(c.keyframes) ? c.keyframes : [];
      const kValue = (prop, fallback) => {
        const list = kf.filter((k) => k && k.prop === prop).sort((a, b) => Number(a.time || 0) - Number(b.time || 0));
        if (!list.length) return Number(fallback);
        const before = [...list].reverse().find((k) => Number(k.time || 0) <= localT);
        const after = list.find((k) => Number(k.time || 0) >= localT);
        if (!before && after) return Number(after.value);
        if (!after && before) return Number(before.value);
        if (!before || !after) return Number(fallback);
        const bt = Number(before.time || 0);
        const at = Number(after.time || 0);
        if (Math.abs(at - bt) < 1e-9) return Number(after.value);
        let u = clamp((localT - bt) / (at - bt), 0, 1);
        const interp = String(after.interp || "linear");
        if (interp === "ease-in") u = u * u;
        else if (interp === "ease-out") u = 1 - ((1 - u) * (1 - u));
        else if (interp === "bezier") u = (3 * u * u) - (2 * u * u * u);
        return Number(before.value) + ((Number(after.value) - Number(before.value)) * u);
      };
      const px = kValue("positionX", Number(tr.positionX || 0));
      const py = kValue("positionY", Number(tr.positionY || 0));
      const sx = clamp(kValue("scaleX", Number(tr.scaleX || 100)), 1, 800) / 100;
      const sy = clamp(kValue("scaleY", Number(tr.scaleY || 100)), 1, 800) / 100;
      const rot = kValue("rotation", Number(tr.rotation || 0));
      const op = clamp(kValue("opacity", Number(tr.opacity || 100)), 0, 100) / 100;
      const br = clamp(kValue("brightness", Number(tr.brightness || 100)), 0, 300) / 100;
      const ct = clamp(kValue("contrast", Number(tr.contrast || 100)), 0, 300) / 100;
      const sat = clamp(kValue("saturation", Number(tr.saturation || 100)), 0, 300) / 100;
      media.style.transform = `translate(${px}px, ${py}px) scale(${sx}, ${sy}) rotate(${rot}deg)`;
      media.style.opacity = `${op}`;
      media.style.filter = `brightness(${br}) contrast(${ct}) saturate(${sat})`;
    }
    function renderWorkspaceLayout() {
      el.workspace.classList.toggle("open", st.viewerOpen);
      const vBtn = panel.querySelector("#vw");
      if (vBtn) vBtn.textContent = st.viewerOpen ? "Viewer On" : "Viewer Off";
      el.work.classList.toggle("bin-off", !st.binOpen);
      el.work.classList.toggle("ins-off", !st.insOpen);
      const bin = workspace.querySelector("#rbw-bin");
      const ins = workspace.querySelector("#rbw-ins");
      const bl = workspace.querySelector("#rbw-vside-l");
      const br = workspace.querySelector("#rbw-vside-r");
      if (bin) bin.style.display = st.binOpen ? "flex" : "none";
      if (ins) ins.style.display = st.insOpen ? "flex" : "none";
      if (bl) bl.textContent = st.binOpen ? "◀" : "▶";
      if (br) br.textContent = st.insOpen ? "▶" : "◀";
    }
    function openViewerPopout() {
      const w = window.open("", "rbw_timeline_viewer", "width=1280,height=760");
      if (!w) throw new Error("Popup blocked by browser");
      st.viewerWin = w;
      const doc = w.document;
      doc.open();
      doc.write(`<!doctype html><html><head><title>RBW Viewer</title><style>html,body{margin:0;padding:0;background:#0d1118;color:#dce3f6;font-family:Segoe UI,Arial}#root{display:grid;grid-template-rows:1fr auto;height:100vh}#stage{display:grid;place-items:center;background:#000}video,audio,img{max-width:100%;max-height:100%;object-fit:contain}.bar{display:flex;justify-content:space-between;padding:6px 10px;font-size:12px;background:#171d29;border-top:1px solid #2f3745}</style></head><body><div id="root"><div id="stage">No clip</div><div class="bar"><span id="meta">RBW Viewer</span><span id="tc">00:00.00</span></div></div></body></html>`);
      doc.close();
      syncExternalViewer();
    }
    function syncExternalViewer() {
      const w = st.viewerWin;
      if (!w || w.closed) return;
      const c = activeAtPlayhead();
      const doc = w.document;
      const stage = doc.getElementById("stage");
      const tc = doc.getElementById("tc");
      const meta = doc.getElementById("meta");
      if (!stage || !c) return;
      const url = clipUrl(c);
      if (meta) meta.textContent = c.prompt || c.id;
      if (!url) { stage.textContent = "No media"; return; }
      const src = `${url}${url.includes("?") ? "&" : "?"}rbw_preview=1`;
      const type = c.type === "audio" ? "audio" : c.type === "image" ? "img" : "video";
      let media = doc.getElementById("rbw-ext-media");
      if (!media || media.tagName.toLowerCase() !== type) {
        stage.innerHTML = "";
        media = doc.createElement(type);
        media.id = "rbw-ext-media";
        if (type !== "img") media.controls = true;
        stage.appendChild(media);
      }
      if (media.src !== src) media.src = src;
      if (type !== "img") {
        media.muted = st.viewerMuted;
        media.volume = st.viewerVolume;
        const target = clamp(Number(st.playhead || 0) - Number(c.start_time || 0) + Number(c.trim_start || 0), 0, Number(c.trim_end || c.duration || 0));
        if (Math.abs(Number(media.currentTime || 0) - target) > 0.12) {
          try { media.currentTime = target; } catch (_e) {}
        }
        if (st.play) {
          const p = media.play();
          if (p && p.catch) p.catch(() => {});
        } else media.pause();
        if (tc) tc.textContent = fmtClock(target);
      } else {
        if (tc) tc.textContent = fmtClock(st.playhead);
      }
    }
    function renderBin() {
      const fset = st.bin.folders;
      const sid = st.bin.selected_folder_id;
      el.binTree.innerHTML = "";
      for (const f of fset) {
        const d = document.createElement("div");
        d.className = "rbw-folder" + (f.id === sid ? " s" : "");
        const parent = f.parent_id ? fset.find((x) => x.id === f.parent_id) : null;
        d.style.paddingLeft = `${parent ? 16 : 5}px`;
        d.textContent = f.name || f.id;
        d.onclick = () => { st.bin.selected_folder_id = f.id; renderBin(); run(saveProject); };
        d.ondragover = (ev) => { ev.preventDefault(); d.classList.add("drop"); };
        d.ondragleave = () => d.classList.remove("drop");
        d.ondrop = (ev) => {
          ev.preventDefault();
          d.classList.remove("drop");
          const aid = ev.dataTransfer?.getData("text/rbw-asset-id");
          if (!aid && !st.bin.selected_assets.length) return;
          pushHistory();
          const targetIds = st.bin.selected_assets.length ? st.bin.selected_assets : [aid];
          for (const sid2 of targetIds) {
            const a = st.bin.assets.find((x) => x.id === sid2);
            if (a) a.folder_id = f.id;
          }
          renderBin();
          run(saveProject);
        };
        el.binTree.appendChild(d);
      }
      el.binAssets.className = st.bin.view_mode === "list" ? "list" : "grid";
      el.binAssets.innerHTML = "";
      const q = String(st.bin.search || "").trim().toLowerCase();
      let assets = st.bin.assets.filter((a) => (a.folder_id || "root") === sid);
      if (q) assets = assets.filter((a) => String(a.name || "").toLowerCase().includes(q) || String(a.id || "").toLowerCase().includes(q));
      if (st.bin.filter && st.bin.filter !== "all") assets = assets.filter((a) => String(a.type || "video") === st.bin.filter);
      assets.sort((a, b) => {
        if (st.bin.sort === "duration") return Number((a.meta || {}).duration || 0) - Number((b.meta || {}).duration || 0);
        if (st.bin.sort === "fps") return Number((a.meta || {}).fps || 0) - Number((b.meta || {}).fps || 0);
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
      for (const a of assets) {
        const d = document.createElement("div");
        const selected = st.selectedAsset === a.id || st.bin.selected_assets.includes(a.id);
        d.className = "rbw-asset" + (selected ? " s" : "");
        d.draggable = true;
        d.ondragstart = (ev) => {
          if (!ev.dataTransfer) return;
          ev.dataTransfer.setData("text/rbw-asset-id", a.id);
          ev.dataTransfer.effectAllowed = "move";
        };
        const iconType = a.type === "audio" ? "AUDIO" : a.type === "image" ? "IMG" : "VID";
        const canImg = a.type === "image" && !!a.thumb_url;
        const md = (a.meta && typeof a.meta === "object") ? a.meta : {};
        const mdTxt = [md.fps ? `${Number(md.fps).toFixed(2)}fps` : "", md.duration ? `${Number(md.duration).toFixed(2)}s` : "", md.width && md.height ? `${md.width}x${md.height}` : "", md.video_codec || md.audio_codec || ""].filter(Boolean).join(" | ");
        d.innerHTML = `<div class="th">${canImg ? `<img src="${a.thumb_url}" alt="thumb">` : iconType}</div><div class="nm">${a.name || a.id}</div>${mdTxt ? `<div class="nm" style="opacity:.7">${mdTxt}</div>` : ""}`;
        if (a.type === "video" && a.media_url) {
          const th = d.querySelector(".th");
          const tu = st.thumbs.get(a.media_url);
          if (tu) th.innerHTML = `<img src="${tu}" alt="thumb">`;
          else {
            buildVideoThumb(a.media_url).then((u) => {
              if (!u || !d.isConnected) return;
              const t2 = d.querySelector(".th");
              if (t2) t2.innerHTML = `<img src="${u}" alt="thumb">`;
            }).catch(() => {});
          }
        }
        d.onclick = (ev) => {
          if (ev.ctrlKey || ev.metaKey) {
            if (st.bin.selected_assets.includes(a.id)) st.bin.selected_assets = st.bin.selected_assets.filter((x) => x !== a.id);
            else st.bin.selected_assets.push(a.id);
          } else {
            st.bin.selected_assets = [a.id];
          }
          st.selectedAsset = a.id;
          if (a.clip_id && st.c.some((c) => c.id === a.clip_id)) {
            choose(a.clip_id, false);
            previewUpdate();
            renderList();
            renderTrack();
            renderInspector();
          }
          renderBin();
          run(saveProject);
        };
        el.binAssets.appendChild(d);
      }
    }
    function ensureTransform(c) {
      if (!c.transform || typeof c.transform !== "object") c.transform = {};
      const t = c.transform;
      if (!Array.isArray(c.keyframes)) c.keyframes = [];
      if (!c.audio || typeof c.audio !== "object") c.audio = {};
      if (!Number.isFinite(Number(t.positionX))) t.positionX = 0;
      if (!Number.isFinite(Number(t.positionY))) t.positionY = 0;
      if (!Number.isFinite(Number(t.scaleX))) t.scaleX = 100;
      if (!Number.isFinite(Number(t.scaleY))) t.scaleY = 100;
      if (!Number.isFinite(Number(t.rotation))) t.rotation = 0;
      if (!Number.isFinite(Number(t.opacity))) t.opacity = 100;
      if (!Number.isFinite(Number(t.brightness))) t.brightness = 100;
      if (!Number.isFinite(Number(t.contrast))) t.contrast = 100;
      if (!Number.isFinite(Number(t.saturation))) t.saturation = 100;
      if (!Number.isFinite(Number(c.audio.gain_db))) c.audio.gain_db = 0;
      if (!Number.isFinite(Number(c.audio.fade_in))) c.audio.fade_in = 0;
      if (!Number.isFinite(Number(c.audio.fade_out))) c.audio.fade_out = 0;
    }
    function renderInspector() {
      const c = active();
      if (!c) {
        el.ins.innerHTML = `<div class="ins-g"><div class="t">No active clip</div></div>`;
        return;
      }
      ensureTransform(c);
      const t = c.transform;
      const row = (id, label, min, max, step, val) => `<div class="ins-row"><label>${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"><input id="${id}_n" type="number" min="${min}" max="${max}" step="${step}" value="${val}"><button class="rst" id="${id}_r" title="Reset">↺</button></div>`;
      const keyframeRow = `<div style="display:flex;gap:6px;flex-wrap:wrap"><button id="kf_add_tr">+KF Transform</button><button id="kf_add_op">+KF Opacity</button><button id="kf_add_col">+KF Color</button><button id="kf_cycle" title="linear/ease-in/ease-out/bezier">Interp</button></div><div class="t" id="kf_info"></div>`;
      const audioRows = (c.type === "audio" || c.type === "video")
        ? `<div class="ins-g"><div class="t">Audio</div>${row("ag","Gain dB",-24,24,0.1,c.audio.gain_db)}${row("afi","Fade In",0,10,0.05,c.audio.fade_in)}${row("afo","Fade Out",0,10,0.05,c.audio.fade_out)}</div>`
        : "";
      el.ins.innerHTML = `<div class="ins-g"><div class="t">${c.prompt || c.id}</div></div><div class="ins-g"><div class="t">Transform</div>${row("tx","PosX",-2000,2000,1,t.positionX)}${row("ty","PosY",-2000,2000,1,t.positionY)}${row("sx","ScaleX",1,800,1,t.scaleX)}${row("sy","ScaleY",1,800,1,t.scaleY)}${row("rot","Rotate",-180,180,0.1,t.rotation)}${row("op","Opacity",0,100,1,t.opacity)}</div><div class="ins-g"><div class="t">Color</div>${row("br","Bright",0,300,1,t.brightness)}${row("ct","Contrast",0,300,1,t.contrast)}${row("sat","Saturate",0,300,1,t.saturation)}</div>${audioRows}<div class="ins-g"><div class="t">Keyframes</div>${keyframeRow}</div>`;
      const bind = (id, key, resetValue) => {
        const r = el.ins.querySelector(`#${id}`);
        const n = el.ins.querySelector(`#${id}_n`);
        const b = el.ins.querySelector(`#${id}_r`);
        if (!r || !n) return;
        const upd = (v) => {
          c.transform[key] = Number(v);
          r.value = `${v}`;
          n.value = `${v}`;
          applyClipVisual(c);
          scheduleTransformSave(c);
        };
        r.oninput = () => upd(r.value);
        n.oninput = () => upd(n.value);
        if (b) b.onclick = () => upd(resetValue);
      };
      bind("tx", "positionX", 0);
      bind("ty", "positionY", 0);
      bind("sx", "scaleX", 100);
      bind("sy", "scaleY", 100);
      bind("rot", "rotation", 0);
      bind("op", "opacity", 100);
      bind("br", "brightness", 100);
      bind("ct", "contrast", 100);
      bind("sat", "saturation", 100);
      const bindAudio = (id, key, resetValue) => {
        const r = el.ins.querySelector(`#${id}`);
        const n = el.ins.querySelector(`#${id}_n`);
        const b = el.ins.querySelector(`#${id}_r`);
        if (!r || !n) return;
        const upd = (v) => {
          c.audio[key] = Number(v);
          r.value = `${v}`;
          n.value = `${v}`;
          scheduleTransformSave(c);
        };
        r.oninput = () => upd(r.value);
        n.oninput = () => upd(n.value);
        if (b) b.onclick = () => upd(resetValue);
      };
      bindAudio("ag", "gain_db", 0);
      bindAudio("afi", "fade_in", 0);
      bindAudio("afo", "fade_out", 0);
      const addKf = (props) => {
        const local = clamp(Number(st.playhead || 0) - Number(c.start_time || 0), 0, Number(c.duration || 0));
        const interp = "linear";
        for (const prop of props) {
          const val = Number((c.transform || {})[prop] || 0);
          c.keyframes.push({ prop, time: local, value: val, interp });
        }
        post(API.updateClip, { id: c.id, keyframes: c.keyframes }).catch(() => {});
        const info = el.ins.querySelector("#kf_info");
        if (info) info.textContent = `Keyframes: ${c.keyframes.length}`;
      };
      const btnTr = el.ins.querySelector("#kf_add_tr");
      const btnOp = el.ins.querySelector("#kf_add_op");
      const btnCol = el.ins.querySelector("#kf_add_col");
      const btnInterp = el.ins.querySelector("#kf_cycle");
      if (btnTr) btnTr.onclick = () => addKf(["positionX", "positionY", "scaleX", "scaleY", "rotation"]);
      if (btnOp) btnOp.onclick = () => addKf(["opacity"]);
      if (btnCol) btnCol.onclick = () => addKf(["brightness", "contrast", "saturation"]);
      if (btnInterp) {
        btnInterp.onclick = () => {
          const list = ["linear", "ease-in", "ease-out", "bezier"];
          c.keyframes = (c.keyframes || []).map((k) => {
            const idx = list.indexOf(String(k.interp || "linear"));
            return { ...k, interp: list[(idx + 1) % list.length] };
          });
          post(API.updateClip, { id: c.id, keyframes: c.keyframes }).catch(() => {});
          const info = el.ins.querySelector("#kf_info");
          if (info) info.textContent = `Keyframes: ${c.keyframes.length} | interp cycled`;
        };
      }
      const info = el.ins.querySelector("#kf_info");
      if (info) info.textContent = `Keyframes: ${Array.isArray(c.keyframes) ? c.keyframes.length : 0}`;
    }
    function renderList() {
      if (el.list) el.list.innerHTML = "";
    }
    function renderRuler() {
      el.rr.textContent = "";
      el.ticks.innerHTML = "";
      el.ticks.style.width = `${t2x(dur())}px`;
      const major = Math.max(1, Math.round(1 / st.zoom));
      for (let t = 0; t <= dur(); t += major) {
        const x = t2x(t);
        const tick = document.createElement("div"); tick.className = "rbw-tick"; tick.style.left = `${x}px`; el.ticks.appendChild(tick);
        const lbl = document.createElement("div");
        lbl.className = "rbw-tlbl";
        lbl.style.left = `${x}px`;
        lbl.textContent = fmtClock(t);
        el.ticks.appendChild(lbl);
      }
      markers().forEach((m, i) => {
        const mk = document.createElement("div");
        mk.className = "mk";
        mk.style.left = `${t2x(Number(m.time || 0))}px`;
        mk.style.borderTopColor = String(m.color || "#ff8a4b");
        mk.title = (m.name || m.label || `M${i + 1}`);
        mk.onmousedown = (ev) => { ev.preventDefault(); ev.stopPropagation(); beginTransaction(); st.drag = { mode: "marker", i }; };
        mk.ondblclick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const name = window.prompt("Marker name", String(m.name || m.label || `M${i + 1}`));
          if (name == null) return;
          const color = window.prompt("Marker color (#hex)", String(m.color || "#ff8a4b"));
          const rangeRaw = window.prompt("Range end sec (empty = point marker)", m.range_end == null ? "" : String(m.range_end));
          m.name = String(name || "").trim() || `M${i + 1}`;
          m.color = String(color || "#ff8a4b").trim() || "#ff8a4b";
          m.range_end = rangeRaw === "" ? null : Number(rangeRaw);
          run(async () => { await saveProject(); renderRuler(); renderTrack(); });
        };
        el.ticks.appendChild(mk);
        if (Number.isFinite(Number(m.range_end)) && Number(m.range_end) > Number(m.time || 0)) {
          const rs = document.createElement("div");
          rs.className = "ml";
          rs.style.left = `${t2x(Number(m.time || 0))}px`;
          rs.style.width = `${Math.max(1, t2x(Number(m.range_end) - Number(m.time || 0)))}px`;
          rs.style.background = String(m.color || "#ff8a4b");
          rs.style.opacity = "0.18";
          el.ticks.appendChild(rs);
        }
      });
    }

    function clearDragTarget() { el.canvas.querySelectorAll(".row.drag-target").forEach((x) => x.classList.remove("drag-target")); }
    function rowTrackAtY(y) {
      for (const r of el.canvas.querySelectorAll(".row")) {
        const b = r.getBoundingClientRect();
        if (y >= b.top && y <= b.bottom) return r.getAttribute("data-track");
      }
      return null;
    }
    function edges(trackId, exceptId) {
      const arr = [0, dur()];
      if (st.snapFlags.playhead) arr.push(st.playhead);
      if (st.snapFlags.marker) {
        for (const m of markers()) {
          arr.push(Number(m.time || 0));
          if (Number.isFinite(Number(m.range_end))) arr.push(Number(m.range_end));
        }
      }
      if (st.snapFlags.edge) {
        for (const c of st.c) {
          if (c.id !== exceptId && c.track_id === trackId) {
            const s = Number(c.start_time || 0);
            arr.push(s, s + Number(c.duration || 0));
          }
        }
      }
      return arr;
    }
    function magnet(t, arr) {
      const th = 10 / pps(); let best = t; let d0 = 1e9;
      for (const e of arr) { const d = Math.abs(e - t); if (d < d0) { d0 = d; best = e; } }
      const snapped = d0 <= th;
      st.snapGuide = snapped ? best : null;
      return snapped ? best : t;
    }
    function ripple(trackId, anchor, delta, exceptId) {
      if (!st.ripple || Math.abs(delta) < 1e-9) return;
      for (const c of st.c) if (c.id !== exceptId && c.track_id === trackId && Number(c.start_time || 0) >= anchor - 1e-9) c.start_time = Math.max(0, qs(Number(c.start_time || 0) + delta));
    }

    function renderTrack() {
      el.canvas.innerHTML = "";
      if (el.side) {
        el.side.innerHTML = "";
        const ruler = panel.querySelector("#rbw-r");
        const spacer = document.createElement("div");
        spacer.className = "rbw-side-spacer";
        const rulerH = Math.ceil(ruler?.getBoundingClientRect?.().height || 0);
        spacer.style.height = `${Math.max(0, rulerH + 10)}px`;
        el.side.appendChild(spacer);
      }
      el.canvas.style.width = `${Math.max(t2x(dur()) + 120, el.track.clientWidth - 18)}px`;
      const trackH = Math.max(48, (st.t.length * 48) + 18);
      el.track.style.height = "";
      el.canvas.style.minHeight = "";
      el.canvas.style.height = `${trackH}px`;
      const viewL = Math.max(0, x2t(Number(el.track.scrollLeft || 0)) - 1);
      const viewR = Math.max(viewL, x2t(Number(el.track.scrollLeft || 0) + Number(el.track.clientWidth || 0)) + 1);
      const hasSolo = st.t.some((t) => !!t.solo);
      const firstAudioTrackId = st.t.find((t) => normalizeTrackType(t) === "audio")?.id || null;
      for (const t of st.t) {
        if (typeof t.visible !== "boolean") t.visible = true;
        if (typeof t.locked !== "boolean") t.locked = false;
        if (typeof t.muted !== "boolean") t.muted = false;
        if (typeof t.solo !== "boolean") t.solo = false;
        const row = document.createElement("div"); row.className = "row"; row.setAttribute("data-track", t.id);
        if (t.color) row.style.borderColor = String(t.color);
        if (firstAudioTrackId && t.id === firstAudioTrackId) row.classList.add("audio-sep");
        if (hasSolo && !t.solo) row.classList.add("solo-dim");
        row.innerHTML = `<div class="rbw-track-drop-target"></div>`;
        el.canvas.appendChild(row);
        if (el.side) {
          const srow = document.createElement("div");
          srow.className = "srow" + ((hasSolo && !t.solo) ? " solo-dim" : "");
          if (firstAudioTrackId && t.id === firstAudioTrackId) srow.classList.add("audio-sep");
          const tc = String(t.color || (normalizeTrackType(t) === "audio" ? "#3f7f67" : "#4d67b8"));
          srow.innerHTML = `<span class="n" title="Double click to rename">${t.name || t.id}</span><span class="acts"><input type="color" value="${tc}" data-act="color" title="Track color" style="width:20px;height:18px;padding:0;border:1px solid #3e4552;border-radius:3px;background:transparent"/><button class="tb ${t.muted ? "on" : ""}" data-act="mute" title="Mute track">${icon("mute")}</button><button class="tb ${t.solo ? "on" : ""}" data-act="solo" title="Solo track">${icon("solo")}</button><button class="tb ${t.locked ? "on" : ""}" data-act="lock" title="Lock track">${icon("lock")}</button><button class="tb ${t.visible ? "on" : ""}" data-act="vis" title="Hide/Show track">${icon("vis")}</button><button class="tb" data-act="del" title="Delete track">${icon("del")}</button></span>`;
          const tname = srow.querySelector(".n");
          if (tname) {
            tname.ondblclick = () => {
              const nm = window.prompt("Track name", String(t.name || t.id));
              if (nm == null) return;
              run(async () => {
                t.name = String(nm).trim() || t.id;
                syncTracksToProject();
                await executeTimelineCommand("UpdateTrack", {}, { message: "Track renamed" });
                renderTrack();
              });
            };
          }
          el.side.appendChild(srow);
          srow.querySelectorAll(".tb").forEach((b) => {
            b.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              const a = b.getAttribute("data-act");
              if (a === "mute") t.muted = !t.muted;
              if (a === "solo") t.solo = !t.solo;
              if (a === "lock") t.locked = !t.locked;
              if (a === "vis") t.visible = !t.visible;
              if (a === "del") { run(async () => { await executeTimelineCommand("DeleteTrack", { trackId: t.id }, { refreshUI: true, message: `Track deleted (${t.name || t.id})` }); }); return; }
              run(async () => {
                syncTracksToProject();
                await executeTimelineCommand("UpdateTrack", {}, { message: "Track updated" });
              });
              renderTrack();
            };
          });
          const cinput = srow.querySelector('input[data-act="color"]');
          if (cinput) {
            cinput.oninput = () => {
              t.color = String(cinput.value || tc);
              renderTrack();
            };
            cinput.onchange = () => {
              run(async () => {
                syncTracksToProject();
                await executeTimelineCommand("UpdateTrack", {}, { message: "Track color updated" });
              });
            };
          }
        }
        if (!t.visible) continue;
        for (const c of st.c.filter((x) => x.track_id === t.id)) {
          const cs = Number(c.start_time || 0);
          const ce = cs + Number(c.duration || 0);
          if (ce < viewL || cs > viewR) continue;
          normTrim(c);
          const b = document.createElement("div");
          b.className = `clip t-${c.type === "audio" ? "audio" : "video"}${st.sel.has(c.id) ? " s" : ""}`;
          b.setAttribute("data-id", c.id);
          b.style.left = `${t2x(Number(c.start_time || 0))}px`;
          b.style.width = `${Math.max(18, t2x(Number(c.duration || 0)))}px`;
          if (t.color) {
            b.style.borderColor = String(t.color);
            b.style.background = `linear-gradient(180deg, ${String(t.color)}, #24314e)`;
          }
          b.innerHTML = `<div class="vis"></div><span class="title">${c.prompt || c.id}</span><canvas class="wv"></canvas><span class="hnd l"></span><span class="hnd r"></span>`;
          const vis = b.querySelector(".vis");
          const mediaUrl = clipUrl(c);
          if ((c.type === "video" || c.type === "image") && mediaUrl) {
            if (c.type === "image") {
              vis.style.backgroundImage = `url("${mediaUrl}")`;
            } else if (st.thumbs.has(mediaUrl)) {
              const tu = st.thumbs.get(mediaUrl);
              if (tu) vis.style.backgroundImage = `url("${tu}")`;
            } else {
              buildVideoThumb(mediaUrl).then((tu) => {
                if (!tu || !b.isConnected) return;
                vis.style.backgroundImage = `url("${tu}")`;
              }).catch(() => {});
            }
          }
          if (c.type === "audio" && mediaUrl) {
            const wv = b.querySelector(".wv");
            wv.width = Math.max(32, Math.floor(Math.max(18, t2x(Number(c.duration || 0)))));
            wv.height = 18;
            const bins = Math.max(36, Math.floor(wv.width / 2));
            const wkey = `${mediaUrl}::${bins}`;
            const draw = (peaks) => {
              if (!wv.isConnected || !Array.isArray(peaks) || !peaks.length) return;
              const ctx = wv.getContext("2d");
              ctx.clearRect(0, 0, wv.width, wv.height);
              ctx.fillStyle = "rgba(173, 205, 255, 0.85)";
              const n = peaks.length;
              for (let i = 0; i < n; i++) {
                const x = Math.floor((i / n) * wv.width);
                const h = Math.max(1, Math.floor(peaks[i] * (wv.height - 2)));
                ctx.fillRect(x, Math.floor((wv.height - h) / 2), 1, h);
              }
            };
            if (st.waves.has(wkey)) draw(st.waves.get(wkey));
            else buildAudioPeaks(mediaUrl, bins).then((peaks) => draw(peaks || [])).catch(() => {});
          }
          b.onmousedown = (ev) => {
            ev.preventDefault(); ev.stopPropagation();
            if (t.locked) return;
            choose(c.id, ev.ctrlKey || ev.metaKey);
            const mode = ev.target.classList.contains("hnd") ? (ev.target.classList.contains("l") ? "tl" : "tr") : "mv";
            beginTransaction();
            st.drag = { mode, id: c.id, os: Number(c.start_time || 0), od: Number(c.duration || 0), ots: Number(c.trim_start || 0), ote: Number(c.trim_end || c.duration || 0), ot: c.track_id, mx: ev.clientX };
            previewUpdate(); renderList(); renderTrack(); renderInspector();
          };
          b.onclick = (ev) => { ev.stopPropagation(); choose(c.id, ev.ctrlKey || ev.metaKey); previewUpdate(); renderList(); renderTrack(); renderInspector(); };
          row.appendChild(b);
        }
      }
      const major = Math.max(1, Math.round(1 / st.zoom));
      for (let tt = 0; tt <= dur(); tt += major) {
        const gl = document.createElement("div");
        gl.className = "gl";
        gl.style.left = `${t2x(tt)}px`;
        el.canvas.appendChild(gl);
      }
      for (const m of markers()) {
        const l = document.createElement("div");
        l.className = "ml";
        l.style.left = `${t2x(Number(m.time || 0))}px`;
        l.style.background = String(m.color || "#ff8a4b");
        el.canvas.appendChild(l);
        if (Number.isFinite(Number(m.range_end)) && Number(m.range_end) > Number(m.time || 0)) {
          const ra = document.createElement("div");
          ra.className = "ml";
          ra.style.left = `${t2x(Number(m.time || 0))}px`;
          ra.style.width = `${Math.max(1, t2x(Number(m.range_end) - Number(m.time || 0)))}px`;
          ra.style.background = String(m.color || "#ff8a4b");
          ra.style.opacity = "0.14";
          el.canvas.appendChild(ra);
        }
      }
      if (st.snapGuide !== null && st.drag) {
        const sg = document.createElement("div"); sg.className = "sg"; sg.style.left = `${t2x(Number(st.snapGuide || 0))}px`; el.canvas.appendChild(sg);
      }
      const ph = document.createElement("div"); ph.className = "ph"; ph.style.left = `${t2x(st.playhead)}px`; ph.innerHTML = `<div class="mh"></div>`;
      ph.querySelector(".mh").onmousedown = (ev) => { ev.preventDefault(); ev.stopPropagation(); st.drag = { mode: "ph" }; };
      el.canvas.appendChild(ph);
      const f = frame();
      el.info.textContent = `zoom ${st.zoom.toFixed(2)}x | snap ${snapStep().toFixed(3)}s | playhead ${st.playhead.toFixed(2)}s | frame ${f.width}x${f.height} | ripple ${st.ripple ? "on" : "off"} | loop ${st.loop ? "on" : "off"} | selected ${st.sel.size}`;
      el.tc.textContent = fmtClock(st.playhead);
      el.tplay.textContent = st.play ? "Pause" : "Play";
      const loopBtn = panel.querySelector("#tloop");
      if (loopBtn) {
        loopBtn.classList.toggle("on", !!st.loop);
        loopBtn.title = st.loop ? "Loop On" : "Loop Off";
      }
      const sbEdge = panel.querySelector("#se");
      const sbMarker = panel.querySelector("#sm");
      const sbPlayhead = panel.querySelector("#sp");
      const sbGrid = panel.querySelector("#sg");
      if (sbEdge) sbEdge.style.opacity = st.snapFlags.edge ? "1" : "0.5";
      if (sbMarker) sbMarker.style.opacity = st.snapFlags.marker ? "1" : "0.5";
      if (sbPlayhead) sbPlayhead.style.opacity = st.snapFlags.playhead ? "1" : "0.5";
      if (sbGrid) sbGrid.style.opacity = st.snapFlags.grid ? "1" : "0.5";
      if (el.vpp) el.vpp.textContent = st.play ? "Pause" : "Play";
      el.z.value = `${Math.round(st.zoom * 100)}`;
    }

    function setPlayhead(clientX) {
      const r = el.canvas.getBoundingClientRect();
      const x = clamp(clientX - r.left, 0, t2x(dur()));
      st.playhead = clamp(qs(x2t(x)), 0, dur());
      renderTrack(); renderRuler();
      syncOrRefreshPreview();
    }

    async function refresh() {
      const d = await get(API.status);
      st.p = d.project || { timeline: { markers: [] } };
      st.t = d.tracks || [];
      st.c = d.clips || [];
      for (const c of st.c) ensureTrackForClip(c);
      orderTracksVideoThenAudio();
      panelAutoGrowOnTrackIncrease();
      if (!st.p.timeline) st.p.timeline = {};
      ensureTimelineSettings();
      if (!Array.isArray(st.p.timeline.markers)) st.p.timeline.markers = [];
      if (!st.p.timeline.frame) st.p.timeline.frame = { name: "16:9 HD", width: 1920, height: 1080 };
      ensureBin();
      applyBinLayout();
      hydrateBinFromClips();
      st.playhead = clamp(st.playhead, 0, dur());
      if (st.active && !st.c.some((x) => x.id === st.active)) st.active = null;
      st.sel = new Set([...st.sel].filter((id) => st.c.some((x) => x.id === id)));
      if (!st.sel.size && st.c.length) { st.sel.add(st.c[0].id); st.active = st.c[0].id; }
      renderWorkspaceLayout();
      renderBin();
      if (el.bsearch) el.bsearch.value = String(st.bin.search || "");
      if (el.bfilter) el.bfilter.value = String(st.bin.filter || "all");
      if (el.bsort) el.bsort.value = String(st.bin.sort || "name");
      renderInspector();
      if (el.vvol) el.vvol.value = `${Math.round(st.viewerVolume * 100)}`;
      if (el.vam) el.vam.textContent = st.viewerMuted ? "Unmute" : "Mute";
      previewUpdate(); applyFormatUI(); renderList(); renderRuler(); renderTrack();
      setMsg(`clips ${st.c.length} | tracks ${st.t.length}`);
    }

    const run = async (fn) => { try { await fn(); } catch (e) { setMsg(`Error: ${e.message}`, true); console.error(e); } };
    async function persistStarts(skip) { const u = []; for (const c of st.c) if (c.id !== skip) u.push(post(API.updateClip, { id: c.id, start_time: Number(c.start_time || 0) })); if (u.length) await Promise.all(u); }
    async function saveClip(c) {
      await post(API.updateClip, {
        id: c.id,
        start_time: Number(c.start_time || 0),
        duration: Number(c.duration || 0),
        trim_start: Number(c.trim_start || 0),
        trim_end: Number(c.trim_end || c.duration || 0),
        track_id: c.track_id
      });
    }
    async function trimAtPlayhead(mode) {
      const c = active();
      if (!c) throw new Error("No active clip");
      normTrim(c);
      const ph = clamp(qs(st.playhead), Number(c.start_time || 0), Number(c.start_time || 0) + Number(c.duration || 0));
      if (mode === "in") {
        const delta = qs(ph - Number(c.start_time || 0));
        if (delta < snapStep()) return;
        c.start_time = qs(Number(c.start_time || 0) + delta);
        c.duration = Math.max(snapStep(), qs(Number(c.duration || 0) - delta));
        c.trim_start = clamp(qs(Number(c.trim_start || 0) + delta), 0, srcDur(c) - snapStep());
        c.trim_end = clamp(qs(Number(c.trim_start || 0) + Number(c.duration || snapStep())), Number(c.trim_start || 0) + snapStep(), srcDur(c));
      } else {
        const nextDuration = Math.max(snapStep(), qs(ph - Number(c.start_time || 0)));
        c.duration = nextDuration;
        c.trim_end = clamp(qs(Number(c.trim_start || 0) + nextDuration), Number(c.trim_start || 0) + snapStep(), srcDur(c));
      }
      await saveClip(c);
      renderList(); renderTrack(); previewUpdate();
    }

    async function razorAtPlayhead() {
      const ph = qs(st.playhead);
      const targets = selClips().length ? selClips() : st.c.filter((clip) => {
        const s = Number(clip.start_time || 0);
        const e = s + Number(clip.duration || 0);
        return ph > s + 1e-6 && ph < e - 1e-6;
      });
      if (!targets.length) return;
      for (const c of targets) {
        const s = Number(c.start_time || 0);
        const e = s + Number(c.duration || 0);
        if (!(ph > s + 1e-6 && ph < e - 1e-6)) continue;
        const leftDur = Math.max(snapStep(), qs(ph - s));
        const rightDur = Math.max(snapStep(), qs(e - ph));
        const leftTrimStart = Number(c.trim_start || 0);
        const leftTrimEnd = clamp(qs(leftTrimStart + leftDur), leftTrimStart + snapStep(), srcDur(c));
        const rightTrimStart = clamp(qs(leftTrimStart + leftDur), 0, srcDur(c) - snapStep());
        const rightTrimEnd = clamp(qs(rightTrimStart + rightDur), rightTrimStart + snapStep(), srcDur(c));
        c.duration = leftDur;
        c.trim_end = leftTrimEnd;
        await saveClip(c);
        const rightClip = {
          ...c,
          id: undefined,
          start_time: qs(ph),
          duration: rightDur,
          trim_start: rightTrimStart,
          trim_end: rightTrimEnd,
          prompt: `${c.prompt || c.id} [cut]`,
        };
        delete rightClip.id;
        delete rightClip.comfy_prompt_id;
        await post(API.addClip, rightClip);
      }
      await refresh();
      setMsg(`Razor cut @ ${ph.toFixed(2)}s`);
    }

    const timelineCommandHandlers = {
      AddClip: async ({ clip }) => {
        await post(API.addClip, clip || {});
      },
      AddTrack: async ({ type }) => {
        st.t.push(makeTrack(type === "audio" ? "audio" : "video"));
        syncTracksToProject();
      },
      UpdateTrack: async () => {},
      DeleteTrack: async ({ trackId }) => {
        await deleteTrackById(trackId, { skipProjectSave: true, skipRefresh: true, skipMessage: true });
      },
      DeleteAllTracks: async () => {
        await deleteAllTracks({ skipProjectSave: true, skipRefresh: true, skipMessage: true });
      },
      AddMarker: async () => {
        markers().push({ time: qs(st.playhead), name: `M${markers().length + 1}`, color: "#ff8a4b", range_end: null });
      },
      MoveMarker: async () => {},
      TrimClipAtPlayhead: async ({ mode }) => {
        await trimAtPlayhead(mode);
      },
      RazorClip: async () => {
        await razorAtPlayhead();
      },
      DeleteSelectedClips: async ({ ids }) => {
        const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
        if (!list.length) return;
        await Promise.all(list.map((id) => post(API.deleteClip, { id })));
        st.sel.clear();
        st.active = null;
      },
      MoveClip: async ({ clip }) => {
        if (!clip?.id) return;
        await post(API.updateClip, {
          id: clip.id,
          start_time: Number(clip.start_time || 0),
          duration: Number(clip.duration || 0),
          trim_start: Number(clip.trim_start || 0),
          trim_end: Number(clip.trim_end || clip.duration || 0),
          track_id: clip.track_id
        });
      },
      TrimClip: async ({ clip }) => {
        if (!clip?.id) return;
        await post(API.updateClip, {
          id: clip.id,
          start_time: Number(clip.start_time || 0),
          duration: Number(clip.duration || 0),
          trim_start: Number(clip.trim_start || 0),
          trim_end: Number(clip.trim_end || clip.duration || 0),
          track_id: clip.track_id
        });
      },
      ToggleRipple: async () => {
        st.ripple = !st.ripple;
      }
    };
    const executeTimelineCommand = async (name, payload = {}, opts = {}) => {
      const handler = timelineCommandHandlers[name];
      if (!handler) throw new Error(`Unknown command: ${name}`);
      const {
        begin = true,
        save = true,
        refreshUI = false,
        message = "",
      } = opts;
      if (begin) beginTransaction();
      await handler(payload);
      if (save) await saveProject();
      if (refreshUI) await refresh();
      if (message) setMsg(message);
    };

    document.addEventListener("mousemove", (ev) => {
      if (st.panelResize) {
        const hpx = clamp(window.innerHeight - ev.clientY, PANEL_MIN_HEIGHT_PX, Math.floor(window.innerHeight * 0.85));
        st.panelUserHeight = panelApplyHeight(hpx);
      }
      if (st.binResize) {
        const dx = ev.clientX - st.binResize.x;
        let nextBinW = clamp(Number(st.binResize.w || 320) - dx, 210, 900);
        const maxByLeftEdge = Number(st.binResize.w || 320) + Number(st.binResize.wsLeft || 0);
        nextBinW = Math.min(nextBinW, maxByLeftEdge);
        let delta = nextBinW - Number(st.binResize.w || 320);
        const minDelta = WORKSPACE_MIN_WIDTH_PX - Number(st.binResize.wsW || WORKSPACE_MIN_WIDTH_PX);
        const maxDelta = Number(st.binResize.wsLeft || 0);
        delta = clamp(delta, minDelta, maxDelta);
        nextBinW = Number(st.binResize.w || 320) + delta;
        const nextLeft = Number(st.binResize.wsLeft || 0) - delta;
        const nextWsW = Number(st.binResize.wsW || WORKSPACE_MIN_WIDTH_PX) + delta;
        st.bin.width = nextBinW;
        el.workspace.style.right = "auto";
        el.workspace.style.left = `${Math.round(nextLeft)}px`;
        el.workspace.style.width = `${Math.round(nextWsW)}px`;
        applyBinLayout();
      }
      if (st.wsDrag) {
        const nx = clamp(ev.clientX - st.wsDrag.dx, 0, window.innerWidth - 220);
        const ny = clamp(ev.clientY - st.wsDrag.dy, 0, window.innerHeight - 120);
        el.workspace.style.left = `${nx}px`;
        el.workspace.style.top = `${ny}px`;
        el.workspace.style.right = "auto";
      }
      if (st.boxSelect) {
        st.boxSelect.x2 = ev.clientX;
        st.boxSelect.y2 = ev.clientY;
        const x1 = Math.min(st.boxSelect.x1, st.boxSelect.x2);
        const y1 = Math.min(st.boxSelect.y1, st.boxSelect.y2);
        const x2 = Math.max(st.boxSelect.x1, st.boxSelect.x2);
        const y2 = Math.max(st.boxSelect.y1, st.boxSelect.y2);
        let box = el.canvas.querySelector(".rbw-boxsel");
        if (!box) {
          box = document.createElement("div");
          box.className = "rbw-boxsel";
          box.style.position = "fixed";
          box.style.border = "1px dashed #8ec5ff";
          box.style.background = "rgba(64,129,255,0.15)";
          box.style.pointerEvents = "none";
          box.style.zIndex = "10050";
          document.body.appendChild(box);
        }
        box.style.left = `${x1}px`;
        box.style.top = `${y1}px`;
        box.style.width = `${Math.max(1, x2 - x1)}px`;
        box.style.height = `${Math.max(1, y2 - y1)}px`;
        return;
      }
      if (!st.drag) { st.snapGuide = null; return; }
      if (st.drag.mode === "ph") { setPlayhead(ev.clientX); return; }
      if (st.drag.mode === "marker") {
        const r = el.canvas.getBoundingClientRect();
        const x = clamp(ev.clientX - r.left, 0, t2x(dur()));
        markers()[st.drag.i].time = clamp(qs(x2t(x)), 0, dur());
        renderRuler(); renderTrack(); return;
      }
      const c = st.c.find((x) => x.id === st.drag.id); if (!c) return;
      const dx = x2t(ev.clientX - st.drag.mx);
      if (st.drag.mode === "mv") {
        c.start_time = clamp(qs(st.drag.os + dx), 0, dur());
        const ht = rowTrackAtY(ev.clientY); clearDragTarget();
        if (ht) { const row = el.canvas.querySelector(`.row[data-track=\"${ht}\"]`); if (row) row.classList.add("drag-target"); c.track_id = ht; } else c.track_id = st.drag.ot;
        const e = edges(c.track_id, c.id), s = Number(c.start_time || 0), en = s + Number(c.duration || 0);
        const ms = magnet(s, e), me = magnet(en, e);
        c.start_time = Math.abs(ms - s) <= Math.abs(me - en) ? clamp(qs(ms), 0, dur()) : clamp(qs(me - Number(c.duration || 0)), 0, dur());
      } else if (st.drag.mode === "tl") {
        const end = st.drag.os + st.drag.od;
        const raw = clamp(qs(st.drag.os + dx), 0, end - snapStep());
        c.start_time = clamp(qs(magnet(raw, edges(c.track_id, c.id))), 0, end - snapStep());
        c.duration = Math.max(snapStep(), qs(end - Number(c.start_time || 0)));
        c.trim_start = clamp(qs(st.drag.ots + (Number(c.start_time || 0) - st.drag.os)), 0, srcDur(c) - snapStep());
        c.trim_end = clamp(qs(Number(c.trim_start || 0) + Number(c.duration || snapStep())), Number(c.trim_start || 0) + snapStep(), srcDur(c));
      } else if (st.drag.mode === "tr") {
        const s = Number(c.start_time || 0);
        let end = s + Math.max(snapStep(), qs(st.drag.od + dx));
        end = magnet(end, edges(c.track_id, c.id));
        c.duration = clamp(qs(end - s), snapStep(), dur() - s);
        c.trim_start = clamp(Number(st.drag.ots || 0), 0, srcDur(c) - snapStep());
        c.trim_end = clamp(qs(Number(c.trim_start || 0) + Number(c.duration || snapStep())), Number(c.trim_start || 0) + snapStep(), srcDur(c));
      }
      renderList(); renderTrack();
    });

    document.addEventListener("mouseup", () => {
      st.panelResize = null;
      st.wsDrag = null;
      if (st.binResize) { st.binResize = null; run(saveProject); }
      if (st.boxSelect) {
        const x1 = Math.min(st.boxSelect.x1, st.boxSelect.x2 || st.boxSelect.x1);
        const y1 = Math.min(st.boxSelect.y1, st.boxSelect.y2 || st.boxSelect.y1);
        const x2 = Math.max(st.boxSelect.x1, st.boxSelect.x2 || st.boxSelect.x1);
        const y2 = Math.max(st.boxSelect.y1, st.boxSelect.y2 || st.boxSelect.y1);
        const picked = [];
        el.canvas.querySelectorAll(".clip").forEach((node) => {
          const r = node.getBoundingClientRect();
          const hit = !(r.right < x1 || r.left > x2 || r.bottom < y1 || r.top > y2);
          if (!hit) return;
          const cid = String(node.getAttribute("data-id") || "");
          if (cid) picked.push(cid);
        });
        st.sel = new Set(picked);
        st.active = picked[0] || null;
        st.boxSelect = null;
        const box = document.querySelector(".rbw-boxsel");
        if (box) box.remove();
        renderList(); renderTrack(); renderInspector(); previewUpdate();
        return;
      }
      if (!st.drag) return;
      const d = st.drag; st.drag = null; clearDragTarget();
      st.snapGuide = null;
      if (d.mode === "ph") return;
      if (d.mode === "marker") {
        run(async () => { await executeTimelineCommand("MoveMarker", {}, { message: "Marker updated" }); });
        return;
      }
      const c = st.c.find((x) => x.id === d.id); if (!c) return;
      run(async () => {
        const ps = d.os, pe = d.os + d.od, ns = Number(c.start_time || 0), ne = ns + Number(c.duration || 0);
        if (d.mode === "mv" && st.ripple) ripple(d.ot, pe, qs(ns - ps), c.id);
        if (d.mode === "tr" && st.ripple) ripple(c.track_id, pe, qs(ne - pe), c.id);
        if (d.mode === "tl" && st.ripple) ripple(c.track_id, ps, qs(ns - ps), c.id);
        await executeTimelineCommand(
          d.mode === "mv" ? "MoveClip" : "TrimClip",
          { clip: c, mode: d.mode },
          { begin: false, save: false, message: "Clip updated" }
        );
        if (st.ripple) await persistStarts(c.id);
      });
    });

    panel.querySelector("#a").onclick = () => run(async () => {
      const fallbackTrack = st.t.find((x) => (x.type || "video") === "video")?.id || st.t[0]?.id || "video-1";
      await executeTimelineCommand(
        "AddClip",
        { clip: { track_id: fallbackTrack, start_time: qs(st.playhead), duration: 5, type: "video", prompt: `Clip ${new Date().toLocaleTimeString()}`, workflow: {} } },
        { save: false, refreshUI: true, message: "Clip added" }
      );
    });
    panel.querySelector("#tv").onclick = () => run(async () => {
      await executeTimelineCommand("AddTrack", { type: "video" }, { refreshUI: true, message: "Video track added" });
    });
    panel.querySelector("#ta").onclick = () => run(async () => {
      await executeTimelineCommand("AddTrack", { type: "audio" }, { refreshUI: true, message: "Audio track added" });
    });
    panel.querySelector("#td").onclick = () => run(async () => {
      const target = findTrackForDelete();
      if (!target) return;
      await executeTimelineCommand("DeleteTrack", { trackId: target.id }, { refreshUI: true, message: `Track deleted (${target.name || target.id})` });
    });
    panel.querySelector("#tda").onclick = () => run(async () => { await executeTimelineCommand("DeleteAllTracks", {}, { refreshUI: true, message: "All tracks deleted" }); });
    panel.querySelector("#tcw").onclick = () => {
      const cur = Number(panel.style.getPropertyValue("--rbw-trackcol-w").replace("px", "") || 176);
      const raw = window.prompt("Track column width px", String(cur));
      if (!raw) return;
      const v = clamp(Number(raw), 120, 480);
      panel.style.setProperty("--rbw-trackcol-w", `${v}px`);
    };
    panel.querySelector("#ic").onclick = () => el.fileClip.click();
    panel.querySelector("#m").onclick = () => run(async () => { await executeTimelineCommand("AddMarker", {}, { message: "Marker added" }); renderRuler(); renderTrack(); });
    panel.querySelector("#rz").onclick = () => run(async () => { await executeTimelineCommand("RazorClip", {}, { begin: true, save: false }); });
    panel.querySelector("#ti").onclick = () => run(async () => { await executeTimelineCommand("TrimClipAtPlayhead", { mode: "in" }, { save: false, message: "Trim in updated" }); });
    panel.querySelector("#to").onclick = () => run(async () => { await executeTimelineCommand("TrimClipAtPlayhead", { mode: "out" }, { save: false, message: "Trim out updated" }); });
    panel.querySelector("#q").onclick = () => run(async () => { const cs = selClips(); if (!cs.length) throw new Error("No selected clips"); for (const c of cs) await post(API.queueClip, { id: c.id }); await refresh(); setMsg(`Queued ${cs.length} clip(s)`); });
    panel.querySelector("#d").onclick = () => run(async () => { const ids = [...st.sel]; if (!ids.length) return; await executeTimelineCommand("DeleteSelectedClips", { ids }, { save: false, refreshUI: true, message: `Deleted ${ids.length} clip(s)` }); });
    panel.querySelector("#y").onclick = () => run(async () => { const r = await post(API.sync, {}); st.c = r.clips || st.c; hydrateBinFromClips(); renderBin(); renderList(); renderTrack(); renderInspector(); setMsg(`Synced (${r.result?.updated || 0})`); });
    panel.querySelector("#r").onclick = () => run(async () => {
      await executeTimelineCommand("ToggleRipple", {}, { message: st.ripple ? "Ripple Off" : "Ripple On" });
      panel.querySelector("#r").textContent = st.ripple ? "Ripple On" : "Ripple Off";
      renderTrack();
    });
    const toggleSnapFlag = (k, btnId) => {
      st.snapFlags[k] = !st.snapFlags[k];
      const b = panel.querySelector(btnId);
      if (b) b.style.opacity = st.snapFlags[k] ? "1" : "0.5";
      run(saveProject);
      renderTrack();
    };
    panel.querySelector("#se").onclick = () => toggleSnapFlag("edge", "#se");
    panel.querySelector("#sm").onclick = () => toggleSnapFlag("marker", "#sm");
    panel.querySelector("#sp").onclick = () => toggleSnapFlag("playhead", "#sp");
    panel.querySelector("#sg").onclick = () => toggleSnapFlag("grid", "#sg");
    panel.querySelector("#km").onclick = () => run(async () => {
      const raw = window.prompt("Keymap JSON", JSON.stringify(st.keymap, null, 2));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      st.keymap = { ...defaultKeymap(), ...(parsed || {}) };
      await saveProject();
      setMsg("Keymap updated");
    });
    panel.querySelector("#hs").onclick = () => run(async () => {
      const hist = await get(API.history);
      const items = Array.isArray(hist.items) ? hist.items : [];
      if (!items.length) throw new Error("No history items");
      const list = items.slice(0, 10).map((x, i) => `${i + 1}. ${new Date(Number(x.mtime_ms || 0)).toLocaleString()} (${Math.round((Number(x.size || 0) / 1024) * 10) / 10}KB)`).join("\n");
      const pick = window.prompt(`History snapshots:\n${list}\n\nPick number to restore`, "1");
      if (!pick) return;
      const idx = Math.max(1, Number(pick)) - 1;
      if (!items[idx]) throw new Error("Invalid selection");
      await post(API.restoreHistory, { id: items[idx].id });
      await refresh();
      setMsg("History restored");
    });
    panel.querySelector("#undo").onclick = () => run(doUndo);
    panel.querySelector("#redo").onclick = () => run(doRedo);
    panel.querySelector("#trew").onclick = () => { st.playhead = 0; renderRuler(); renderTrack(); syncOrRefreshPreview(); };
    panel.querySelector("#tbk").onclick = () => { st.playhead = clamp(qs(st.playhead - snapStep()), 0, dur()); renderRuler(); renderTrack(); syncOrRefreshPreview(); };
    panel.querySelector("#tfd").onclick = () => { st.playhead = clamp(qs(st.playhead + snapStep()), 0, dur()); renderRuler(); renderTrack(); syncOrRefreshPreview(); };
    panel.querySelector("#tend").onclick = () => { st.playhead = dur(); renderRuler(); renderTrack(); syncOrRefreshPreview(); };
    panel.querySelector("#tplay").onclick = () => togglePlay();
    panel.querySelector("#tloop").onclick = () => {
      st.loop = !st.loop;
      if (st.loopOut == null) st.loopOut = dur();
      run(saveProject);
      renderTrack();
    };
    el.z.oninput = () => { st.zoom = clamp(Number(el.z.value) / 100, 0.4, 8); renderRuler(); renderTrack(); };
    panel.querySelector("#vw").onclick = () => { st.viewerOpen = !st.viewerOpen; renderWorkspaceLayout(); };
    panel.querySelector("#tb").onclick = () => { st.binOpen = !st.binOpen; renderWorkspaceLayout(); };
    panel.querySelector("#tii").onclick = () => { st.insOpen = !st.insOpen; renderWorkspaceLayout(); };
    workspace.querySelector("#rbw-vside-l").onclick = () => { st.binOpen = !st.binOpen; renderWorkspaceLayout(); };
    workspace.querySelector("#rbw-vside-r").onclick = () => { st.insOpen = !st.insOpen; renderWorkspaceLayout(); };
    workspace.querySelector("#wclose").onclick = () => { st.viewerOpen = false; renderWorkspaceLayout(); };
    workspace.querySelector("#wpop").onclick = () => {
      try { openViewerPopout(); } catch (e) { setMsg(`Error: ${e.message}`, true); }
    };
    workspace.querySelector("#bf").onclick = () => run(async () => {
      pushHistory();
      const name = nextFolderName("Folder");
      const id = uid("fld");
      st.bin.folders.push({ id, name, parent_id: null });
      st.bin.selected_folder_id = id;
      renderBin();
      await saveProject();
      setMsg(`Folder created: ${name}`);
    });
    workspace.querySelector("#bs").onclick = () => run(async () => {
      pushHistory();
      const name = nextFolderName("Sub");
      const id = uid("fld");
      st.bin.folders.push({ id, name, parent_id: st.bin.selected_folder_id || "root" });
      st.bin.selected_folder_id = id;
      renderBin();
      await saveProject();
      setMsg(`Subfolder created: ${name}`);
    });
    workspace.querySelector("#bdel").onclick = () => run(async () => {
      const sid = st.bin.selected_folder_id || "root";
      if (sid === "root") { setMsg("Root folder cannot be deleted", true); return; }
      const target = st.bin.folders.find((f) => f.id === sid);
      if (!target) return;
      pushHistory();
      const parentId = (target.parent_id && st.bin.folders.some((f) => f.id === target.parent_id)) ? target.parent_id : "root";
      const del = folderDescendants(sid);
      st.bin.assets.forEach((a) => {
        const fid = a.folder_id || "root";
        if (del.has(fid)) a.folder_id = parentId;
      });
      st.bin.folders = st.bin.folders.filter((f) => !del.has(f.id));
      if (!st.bin.folders.some((f) => f.id === "root")) st.bin.folders.unshift({ id: "root", name: "Assets", parent_id: null });
      st.bin.selected_folder_id = parentId;
      renderBin();
      await saveProject();
      setMsg(`Folder deleted: ${target.name || target.id}`);
    });
    workspace.querySelector("#bv").onclick = () => run(async () => {
      pushHistory();
      st.bin.view_mode = st.bin.view_mode === "grid" ? "list" : "grid";
      workspace.querySelector("#bv").textContent = st.bin.view_mode === "grid" ? "Grid" : "List";
      renderBin();
      await saveProject();
    });
    if (el.bsize) {
      el.bsize.oninput = () => {
        st.bin.thumb_size = clamp(Number(el.bsize.value || 64), 48, 140);
        applyBinLayout();
        renderBin();
      };
      el.bsize.onchange = () => run(saveProject);
    }
    if (el.bsearch) {
      el.bsearch.oninput = () => { st.bin.search = String(el.bsearch.value || ""); renderBin(); };
      el.bsearch.onchange = () => run(saveProject);
    }
    if (el.bfilter) {
      el.bfilter.onchange = () => { st.bin.filter = String(el.bfilter.value || "all"); renderBin(); run(saveProject); };
    }
    if (el.bsort) {
      el.bsort.onchange = () => { st.bin.sort = String(el.bsort.value || "name"); renderBin(); run(saveProject); };
    }
    el.vpp.onclick = () => togglePlay();
    el.vam.onclick = () => {
      st.viewerMuted = !st.viewerMuted;
      el.vam.textContent = st.viewerMuted ? "Unmute" : "Mute";
      const media = el.pb.querySelector("#rbw-pm");
      if (media) media.muted = st.viewerMuted;
      syncExternalViewer();
    };
    el.vvol.oninput = () => {
      st.viewerVolume = clamp(Number(el.vvol.value || 100) / 100, 0, 1);
      const media = el.pb.querySelector("#rbw-pm");
      if (media) media.volume = st.viewerVolume;
      syncExternalViewer();
    };
    el.fmt.onchange = () => run(async () => {
      let next = null;
      if (el.fmt.value === "custom") {
        const raw = window.prompt("Formato custom (es. 1080x1080 oppure 2.39:1)", "1080x1080");
        if (!raw) { applyFormatUI(); return; }
        const v = raw.trim().toLowerCase();
        if (v.includes("x")) {
          const [w, h] = v.split("x").map((x) => Number(x.trim()));
          if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) throw new Error("Formato custom non valido");
          next = { name: `Custom ${w}x${h}`, width: Math.round(w), height: Math.round(h) };
        } else if (v.includes(":")) {
          const [a, b] = v.split(":").map((x) => Number(x.trim()));
          if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) throw new Error("Rapporto custom non valido");
          const baseH = 1080;
          next = { name: `Custom ${a}:${b}`, width: Math.round((baseH * a) / b), height: baseH };
        } else throw new Error("Usa formato WxH o A:B");
      } else {
        const f = FORMAT_PRESETS.find((x) => x.id === el.fmt.value);
        if (!f) return;
        next = { name: f.name, width: f.width, height: f.height };
      }
      st.p.timeline.frame = next;
      await saveProject();
      applyFormatUI();
      previewUpdate();
      renderTrack();
      setMsg(`Format set: ${next.width}x${next.height}`);
    });
    panel.querySelector("#ex").onclick = () => run(async () => { const r = await fetch(API.export, { credentials: "same-origin" }); if (!r.ok) throw new Error(`export:${r.status}`); const b = await r.blob(); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "rbw_timeline_export.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); setMsg("Export complete"); });
    panel.querySelector("#er").onclick = () => run(async () => {
      const presetRaw = window.prompt("Render preset: h264 | h265 | prores | webm", "h264");
      if (!presetRaw) return;
      const preset = String(presetRaw).trim().toLowerCase();
      if (!["h264", "h265", "prores", "webm"].includes(preset)) throw new Error("Preset non valido");
      const fpsRaw = window.prompt("FPS output (vuoto = timeline fps)", "");
      const crfRaw = window.prompt("Quality CRF (h264/h265/webm, default 18)", "18");
      const inRaw = window.prompt("In sec (default 0)", "0");
      const outRaw = window.prompt("Out sec (vuoto = timeline duration)", "");
      const audioRaw = window.prompt("Include audio? yes/no", "yes");
      const fileRaw = window.prompt("Nome file output (senza estensione)", `render_${new Date().toISOString().replace(/[:.]/g, "-")}`);
      const opts = {
        preset,
        fps: fpsRaw ? Number(fpsRaw) : undefined,
        crf: crfRaw ? Number(crfRaw) : 18,
        in_sec: inRaw ? Number(inRaw) : 0,
        out_sec: outRaw ? Number(outRaw) : undefined,
        include_audio: String(audioRaw || "yes").trim().toLowerCase() !== "no",
        filename: String(fileRaw || "").trim() || undefined,
      };
      const start = await post(API.render, { options: opts });
      let res = start;
      if (start?.job_id) {
        const jobId = String(start.job_id);
        setMsg(`Render queued (${jobId})...`);
        res = await new Promise((resolve, reject) => {
          let tries = 0;
          const tick = async () => {
            tries += 1;
            try {
              const stj = await get(`${API.renderStatus}/${encodeURIComponent(jobId)}`);
              const st = String(stj?.status || "");
              if (st === "done") { resolve(stj); return; }
              if (st === "error") {
                const err = String(stj?.error || "Render failed");
                const stderr = stj?.stderr ? `\nffmpeg: ${String(stj.stderr).slice(-900)}` : "";
                reject(new Error(`${err}${stderr}`));
                return;
              }
              if (tries > 1800) { reject(new Error("Render timeout")); return; }
              setMsg(`Render ${st || "running"}...`);
              window.setTimeout(tick, 1000);
            } catch (e) { reject(e); }
          };
          tick();
        });
      }
      if (!res?.success || !res?.file_url) throw new Error(res?.error || "Render failed");
      const a = document.createElement("a");
      a.href = res.file_url;
      a.download = res.filename || "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMsg(`Render complete: ${res.filename || "file"}`);
    });
    panel.querySelector("#erq").onclick = () => run(async () => {
      const raw = window.prompt("Queue presets (comma): h264,h265,webm,prores", "h264,webm");
      if (!raw) return;
      const presets = raw.split(",").map((x) => x.trim().toLowerCase()).filter((x) => ["h264", "h265", "webm", "prores"].includes(x));
      if (!presets.length) throw new Error("No valid presets");
      const inRaw = window.prompt("In sec", `${Number(st.loopIn || 0)}`);
      const outRaw = window.prompt("Out sec (empty = loop out/timeline)", st.loopOut == null ? "" : `${Number(st.loopOut)}`);
      const jobs = presets.map((p) => ({
        preset: p,
        in_sec: Number(inRaw || 0),
        out_sec: outRaw === "" ? (st.loopOut == null ? undefined : Number(st.loopOut)) : Number(outRaw),
        filename: `render_${p}_${new Date().toISOString().replace(/[:.]/g, "-")}`,
      }));
      const res = await post(API.renderQueue, { jobs });
      setMsg(`Queued ${Array.isArray(res.jobs) ? res.jobs.length : 0} render job(s)`);
    });
    panel.querySelector("#im").onclick = () => el.file.click();
    el.file.onchange = () => run(async () => { const f = el.file.files && el.file.files[0]; if (!f) return; pushHistory(); await post(API.import, JSON.parse(await f.text())); el.file.value = ""; await refresh(); setMsg("Import complete"); });
    el.fileClip.onchange = () => run(async () => {
      const f = el.fileClip.files && el.fileClip.files[0];
      if (!f) return;
      pushHistory();
      const fd = new FormData();
      fd.append("file", f);
      fd.append("include_audio", "true");
      const res = await postForm(API.importAsset, fd);
      el.fileClip.value = "";
      await refresh();
      if (res?.clip_id) st.selectedAsset = res.clip_id;
      renderBin();
      setMsg(`Clip imported: ${f.name}`);
    });
    panel.querySelector("#c").onclick = () => panel.classList.remove("open");

    function togglePlay() {
      st.play = !st.play;
      const media = el.pb.querySelector("#rbw-pm");
      const startTimer = () => {
        if (st.playTimer) return;
        st.playTimer = window.setInterval(() => {
          const maxT = st.loop && st.loopOut != null ? Math.min(dur(), Number(st.loopOut)) : dur();
          const dir = st.shuttleDir === 0 ? 1 : st.shuttleDir;
          st.playhead = clamp(qs(st.playhead + (snapStep() * dir)), 0, dur());
          const hitEnd = dir >= 0 && st.playhead >= maxT;
          const hitStart = dir < 0 && st.playhead <= Number(st.loopIn || 0);
          if (hitEnd || hitStart) {
            if (st.loop) {
              st.playhead = clamp(
                dir >= 0 ? Number(st.loopIn || 0) : (st.loopOut == null ? dur() : Number(st.loopOut)),
                0,
                dur()
              );
            } else {
              st.play = false;
              clearInterval(st.playTimer);
              st.playTimer = null;
            }
          }
          renderTrack(); renderRuler(); syncOrRefreshPreview();
        }, 100);
      };
      if (st.play) {
        if (media && typeof media.play === "function") {
          const p = media.play();
          if (p && p.catch) p.catch(() => startTimer());
        } else startTimer();
      } else {
        if (media && typeof media.pause === "function") media.pause();
        if (st.playTimer) { clearInterval(st.playTimer); st.playTimer = null; }
      }
      syncExternalViewer();
      renderTrack(); renderRuler(); syncOrRefreshPreview();
    }

    document.addEventListener("keydown", (ev) => {
      if (!canKeys(ev.target)) return;
      if (comboMatch(ev, st.keymap.undo) || ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.code === "KeyZ" && !ev.shiftKey)) { ev.preventDefault(); run(doUndo); return; }
      if (comboMatch(ev, st.keymap.redo) || ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.code === "KeyY" || (ev.code === "KeyZ" && ev.shiftKey)))) { ev.preventDefault(); run(doRedo); return; }
      if (comboMatch(ev, st.keymap.play_toggle) || ev.code === "Space") { ev.preventDefault(); togglePlay(); return; }
      if (comboMatch(ev, st.keymap.step_right) || ev.code === "ArrowRight") { ev.preventDefault(); st.playhead = clamp(qs(st.playhead + (ev.shiftKey ? 1 : snapStep())), 0, dur()); renderTrack(); renderRuler(); syncOrRefreshPreview(); return; }
      if (comboMatch(ev, st.keymap.step_left) || ev.code === "ArrowLeft") { ev.preventDefault(); st.playhead = clamp(qs(st.playhead - (ev.shiftKey ? 1 : snapStep())), 0, dur()); renderTrack(); renderRuler(); syncOrRefreshPreview(); return; }
      if (comboMatch(ev, st.keymap.add_marker) || ev.code === "KeyM") { ev.preventDefault(); run(async () => { await executeTimelineCommand("AddMarker", {}, { message: "Marker added" }); renderRuler(); renderTrack(); }); return; }
      if (comboMatch(ev, st.keymap.set_loop_in) || ev.code === "KeyI") {
        ev.preventDefault();
        run(async () => {
          beginTransaction();
          st.loopIn = qs(st.playhead);
          if (st.loopOut != null && st.loopOut <= st.loopIn) st.loopOut = st.loopIn + snapStep();
          st.loop = true;
          await saveProject();
          renderTrack();
          renderRuler();
          setMsg(`Loop In set @ ${st.loopIn.toFixed(2)}s`);
        });
        return;
      }
      if (comboMatch(ev, st.keymap.set_loop_out) || ev.code === "KeyO") {
        ev.preventDefault();
        run(async () => {
          beginTransaction();
          st.loopOut = Math.max(st.loopIn + snapStep(), qs(st.playhead));
          st.loop = true;
          await saveProject();
          renderTrack();
          renderRuler();
          setMsg(`Loop Out set @ ${st.loopOut.toFixed(2)}s`);
        });
        return;
      }
      if (comboMatch(ev, st.keymap.trim_in_at_playhead)) { ev.preventDefault(); run(async () => { await executeTimelineCommand("TrimClipAtPlayhead", { mode: "in" }, { save: false, message: "Trim in updated" }); }); return; }
      if (comboMatch(ev, st.keymap.trim_out_at_playhead)) { ev.preventDefault(); run(async () => { await executeTimelineCommand("TrimClipAtPlayhead", { mode: "out" }, { save: false, message: "Trim out updated" }); }); return; }
      if (comboMatch(ev, st.keymap.razor_at_playhead) || ev.code === "KeyC") { ev.preventDefault(); run(async () => { await executeTimelineCommand("RazorClip", {}, { save: false }); }); return; }
      if (comboMatch(ev, st.keymap.j_backward) || ev.code === "KeyJ") { ev.preventDefault(); st.shuttleDir = -1; if (!st.play) togglePlay(); return; }
      if (comboMatch(ev, st.keymap.k_stop) || ev.code === "KeyK") { ev.preventDefault(); st.shuttleDir = 0; if (st.playTimer) { clearInterval(st.playTimer); st.playTimer = null; } st.play = false; renderTrack(); return; }
      if (comboMatch(ev, st.keymap.l_forward) || ev.code === "KeyL") { ev.preventDefault(); st.shuttleDir = 1; if (!st.play) togglePlay(); return; }
      if (comboMatch(ev, st.keymap.delete_selected) || ev.code === "Delete" || ev.code === "Backspace") { ev.preventDefault(); panel.querySelector("#d").click(); }
    });

    el.ticks.onmousedown = (ev) => { if (ev.target.classList.contains("mk")) return; setPlayhead(ev.clientX); };
    el.canvas.onmousedown = (ev) => {
      if (ev.target !== el.canvas) return;
      if (ev.shiftKey) {
        st.boxSelect = { x1: ev.clientX, y1: ev.clientY, x2: ev.clientX, y2: ev.clientY };
        return;
      }
      setPlayhead(ev.clientX);
    };
    el.track.onscroll = () => { if (el.side) el.side.scrollTop = el.track.scrollTop; };
    if (el.side) el.side.onscroll = () => { el.track.scrollTop = el.side.scrollTop; };
    panel.querySelector("#rbw-resz").onmousedown = (ev) => {
      ev.preventDefault();
      st.panelResize = { y: ev.clientY };
    };
    if (el.binResz) {
      el.binResz.onmousedown = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const r = el.workspace.getBoundingClientRect();
        el.workspace.style.right = "auto";
        el.workspace.style.left = `${Math.round(r.left)}px`;
        el.workspace.style.width = `${Math.round(r.width)}px`;
        st.binResize = { x: ev.clientX, w: Number(st.bin.width || 320), wsLeft: Number(r.left || 0), wsW: Number(r.width || WORKSPACE_MIN_WIDTH_PX) };
      };
    }
    el.wsHead.onmousedown = (ev) => {
      if ((ev.target.tagName || "").toUpperCase() === "BUTTON") return;
      const r = el.workspace.getBoundingClientRect();
      st.wsDrag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    };

    fab.onclick = () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) {
        panelEnsureHeightState();
        st.panelUserHeight = panelApplyHeight(st.panelUserHeight);
        run(refresh);
      }
      else {
        el.workspace.classList.remove("open");
        if (st.playTimer) { clearInterval(st.playTimer); st.playTimer = null; st.play = false; }
      }
    };
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => applyFormatUI());
      ro.observe(el.pb);
    }
    const tabs = [...panel.querySelectorAll("#rbw-tabs .tab")];
    tabs.forEach((tb) => {
      tb.onclick = () => {
        tabs.forEach((x) => x.classList.remove("on"));
        tb.classList.add("on");
      };
    });
    window.addEventListener("resize", applyFormatUI);
    window.addEventListener("resize", () => {
      panelEnsureHeightState();
      st.panelUserHeight = panelApplyHeight(st.panelUserHeight);
    });
    applyTheme();
    const setIco = (id, ico, tip) => { const b = panel.querySelector(id); if (!b) return; b.classList.add("ico"); b.innerHTML = ico; b.title = tip; };
    setIco("#a", "＋", "Add clip");
    setIco("#tv", "V+", "Add video track");
    setIco("#ta", "A+", "Add audio track");
    setIco("#td", "−T", "Delete active/last track");
    setIco("#tda", "✕T", "Delete all tracks");
    setIco("#tcw", "↔", "Track column width");
    setIco("#ic", "↓", "Import clip");
    setIco("#m", "◆", "Add marker");
    setIco("#rz", "✂", "Razor at playhead");
    setIco("#ti", "↤", "Trim In at playhead");
    setIco("#to", "↦", "Trim Out at playhead");
    setIco("#q", "●", "Queue selected clips");
    setIco("#d", "✕", "Delete selected clips");
    setIco("#y", "↻", "Sync statuses");
    setIco("#r", "≈", "Toggle ripple editing");
    setIco("#se", "E", "Snap edges");
    setIco("#sm", "M", "Snap markers");
    setIco("#sp", "P", "Snap playhead");
    setIco("#sg", "G", "Snap grid");
    setIco("#km", "⌨", "Edit keymap");
    setIco("#hs", "H", "Autosave history");
    setIco("#undo", "↶", "Undo");
    setIco("#redo", "↷", "Redo");
    setIco("#ex", "⇩", "Export timeline");
    setIco("#er", "▶", "Render video");
    setIco("#erq", "Q", "Render queue");
    setIco("#im", "⇧", "Import timeline JSON");
    setIco("#vw", "▣", "Toggle floating viewer workspace");
    setIco("#tb", "▤", "Toggle Bin panel");
    setIco("#tii", "☰", "Toggle Inspector panel");
    setIco("#tloop", "↺", "Toggle loop playback");
    window.setInterval(applyTheme, 1500);
    run(refresh);
  },
});


