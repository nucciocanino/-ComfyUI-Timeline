# Timeline Future Implementations

## Obiettivo
Rendere la timeline uno strumento di editing professionale, fluido e scalabile per workflow complessi.

## Milestone 1 - Core Pro Editing (1-2 settimane)
- Razor tool (`C`) con cut al playhead su clip selezionata o su tutte le clip sotto playhead.
- Snap engine avanzato con toggle separati:
  - edge
  - marker
  - playhead
  - grid
- Drag/trim come singola transazione Undo (1 drag = 1 undo).
- Multi-select box con move/trim di gruppo.
- Track header pro:
  - rename inline
  - resize larghezza colonna
  - colori traccia
- Playback `J K L` e loop range `I/O`.

### Done Criteria
- Editing base rapido, prevedibile e senza attriti.
- Undo/Redo affidabile su tutte le operazioni principali.

## Milestone 2 - Audio + Keyframe (2-3 settimane)
- Waveform ad alta risoluzione con cache per livello di zoom.
- Clip gain per singola clip.
- Fade in/out con drag handles.
- Separazione video/audio robusta con lane pinning.
- Keyframe su:
  - Transform
  - Opacity
  - Color
- Interpolazioni:
  - linear
  - ease-in
  - ease-out
  - bezier
- Mini graph editor nell'inspector.

### Done Criteria
- Montaggio audio/video + animazioni base interamente in timeline.

## Milestone 3 - Asset Intelligence + Export Pipeline (1-2 settimane)
- Bin professionale:
  - search
  - filter
  - sort
  - tag
  - metadata (fps, durata, risoluzione, codec)
- Folder operations complete:
  - multi-select
  - bulk move
  - delete sicura
- Marker avanzati:
  - colore
  - nome
  - range marker
- Export queue multipla con preset.
- Export per range `In/Out`.
- Autosave versionato + history panel leggibile.

### Done Criteria
- Workflow completo da import a export senza uscire dalla timeline.

## Milestone 4 - Performance + UX Polish (1 settimana)
- Virtualizzazione righe/clip per timeline lunghe.
- Throttling render durante drag e zoom.
- Proxy playback (`1/2`, `1/4`) + quality switch.
- Shortcut profile completo e personalizzabile.

### Done Criteria
- UI reattiva anche su progetti pesanti.

## Priorita consigliata (ordine reale)
1. Snap engine + Undo transaction grouping
2. Razor tool + multi-select box
3. Audio gain/fade + waveform cache
4. Keyframe base
5. Bin pro + export queue

## Backlog Tecnico Iniziale
- [x] Introdurre command stack centralizzato con `beginTransaction/endTransaction` (base nel frontend + undo stack centralizzato).
- [x] Convertire tutte le mutazioni timeline su comandi atomici (`AddClip`, `MoveClip`, `TrimClip`, `DeleteTrack`, ...).
- [x] Implementare sistema snap con flags persistenti nel project.
- [x] Aggiungere gestione shortcut centralizzata con keymap configurabile.
- [x] Definire schema metadata asset nel bin (campi minimi + parser).
- [x] Preparare export job queue con stato (`queued`, `running`, `done`, `error`).

## Nota
Roadmap viva: aggiornare milestone e priorita in base a feedback UX e benchmark di performance reali.
