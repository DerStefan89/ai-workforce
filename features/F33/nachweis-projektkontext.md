# F33 WS-1 — Nachweis: Realer Jarvis-Chat-Turn über den Leitstand

Versuch eines realen Nachweises (Korrekturrunde nach Challenger-Verifikation,
21.09.2026): ein echter Jarvis-Chat-Turn über den Leitstand
(`POST /api/chat`, Projekt `ai-workforce`, Frage "Wo stehen wir gerade in der
Roadmap?"), um zu belegen, dass F33s Projektkontext real bei einem laufenden
Server ankommt, und um die Turn-Dauer mit/ohne Projektkontext zu vergleichen.

## Aufbau

- Arbeitsverzeichnis: `C:\Users\stefa\claude-worktrees\ai-workforce-f33`
  (Worktree, Branch `feat/f33-projektkontext`) — der Leitstand-Prozess wurde
  MIT diesem Verzeichnis als `process.cwd()` gestartet (der in der
  Korrekturrunde benannte Workaround "process.chdir() auf die
  Worktree-Wurzel" ist damit bereits angewandt, nicht umgangen).
- Start: `LEITSTAND_PORT=4174 node scripts/leitstand-server.mjs` (eigener
  Port, um eine etwaige reale Instanz auf dem Standardport 4173 nicht zu
  stören).
- Aufruf: `POST http://127.0.0.1:4174/api/chat`,
  Body `{"nachricht":"Wo stehen wir gerade in der Roadmap?"}`.

## Ergebnis: Context-Builder-Einspeisung real bestätigt

Der Lauf (`jarvis-jarvis-chat-f9d013df-930a-451e-aa68-e2f29c17819b`) hat den
Kontextpaket-Bau real durchlaufen. Der echte, unter
`kontrollzustand/lineage-kontextpaket-jarvis-jarvis-chat-f9d013df-930a-451e-aa68-e2f29c17819b/`
geschriebene Checkpoint trägt genau vier Elemente:

```json
"elemente": [
  { "pfad": "artefakt:auftrag-jarvis-chat-f9d013df-930a-451e-aa68-e2f29c17819b" },
  { "pfad": "docs/projekt/kontext/beschreibung.md" },
  { "pfad": "docs/projekt/kontext/anweisungen.md" },
  { "pfad": "docs/projekt/roadmap.json" }
]
```

— die Auftragsreferenz plus alle drei F33-Projektkontext-Elemente, real über
`baueProjektkontextAnfragen`/`filtereExistierendeAnfragen` eingespeist und
über F5s `baueKontextpaket` akzeptiert (`ereignis: "kontextpaket_gebaut"`,
Server-Log unten). Damit ist die WS-1-Kernmechanik gegen einen echten,
laufenden Leitstand-Prozess bestätigt — nicht nur gegen das Gate-Skript.

## Blocker: kein Antworttext, keine Turn-Dauer messbar (E-188)

Der Lauf wurde VOR dem Start des eigentlichen `claude`-Kindprozesses
abgelehnt:

```
{"ereignis":"kontextpaket_gebaut", ..., "rolle":"jarvis", "versionSequenz":1}
{"ereignis":"startfreigabe_abgelehnt", "grund":"Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)"}
[leitstand] Lauf 'jarvis-jarvis-chat-f9d013df-930a-451e-aa68-e2f29c17819b' abgelehnt: F6a-Ablehnung: Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)
```

Ursache (`src/invocation-policy/index.ts:481-483`): die Invocation Policy
vergleicht den ECHTEN `arbeitsverzeichnis_pfad` des laufenden Prozesses
(hier: die Worktree-Wurzel) gegen den in einem extern bezeugten
Wirksamkeitsnachweis (`ARCHITECTURE.md` §3, Authorization Boundary) fest
hinterlegten Pfad. Dieser Nachweis ist offenbar auf den Hauptrepo-Pfad
(`C:\Users\stefa\Projekte\ai-workforce`) ausgestellt, nicht auf die
Worktree-Wurzel — der bekannte `process.chdir()`-Workaround ändert daran
nichts, weil er den ECHTEN Pfad des laufenden Prozesses korrekt auf die
Worktree-Wurzel setzt (das ist ja der real gemessene `arbeitsverzeichnis_pfad`
oben), aber genau DAS weicht vom im Nachweis fest hinterlegten Hauptrepo-Pfad
ab. Ein neuer, auf die Worktree-Wurzel ausgestellter Wirksamkeitsnachweis ist
ausschließlich eine menschliche Handlung (`ARCHITECTURE.md` §3: "Der Kern
erzeugt niemals ein Freigabeartefakt") — kein Codepfad, den diese Korrektur
umgehen darf oder kann.

**Konsequenz:** kein Antworttext, keine "M5/F33 korrekt genannt?"-Prüfung,
keine reale Turn-Dauer messbar — der `claude`-Kindprozess wurde nie
gestartet. Der geplante Vergleichslauf mit leeren `anfragen` wurde NICHT
zusätzlich ausgeführt: derselbe `E-188`-Block träfe ihn an exakt derselben
Stelle (vor jeder Anfragen-Verarbeitung, unabhängig von deren Inhalt), ein
zweiter Lauf hätte also keine neue Information geliefert, nur denselben
Blocker ein zweites Mal reproduziert.

## Blocker (gemeldet statt umgangen)

E-188 blockiert jeden realen Lauf aus diesem Worktree, weil der vorhandene
Wirksamkeitsnachweis auf den Hauptrepo-Pfad ausgestellt ist. Auflösung
braucht einen von Stefan neu ausgestellten Wirksamkeitsnachweis für die
Worktree-Wurzel (oder einen realen Lauf aus dem Hauptrepo statt dem
Worktree) — beides außerhalb des Scopes dieser Korrekturrunde.

## Aufräumen

Der reale (abgelehnte) Lauf hinterlässt reguläre, append-only
Kontrollzustand-Einträge unter `kontrollzustand/` (Checkpoint-Kette,
Lineage) — unangetastet gelassen (kein Löschen von Kontrollzustand,
`ARCHITECTURE.md` §2/§7). Der Test-Leitstand-Prozess (Port 4174) wurde
beendet, dessen `.leitstand.lock` entfernt.
