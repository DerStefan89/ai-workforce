# F41 WS-1 — Realnachweis (AK6)

Lokaler Realnachweis gegen die ECHTE Autorisierung (kein Attrappen-Baseline
wie im Gate `scripts/check-f41-projekt-anlegen.mjs`) — ein Wegwerf-Projekt
über den realen `erzeugeRequestHandler`/`erzeugeMultiProjektDispatcher`
(`scripts/leitstand-server.mjs`) real angelegt, gegen die echte
`state/aktuelle-autorisierung.json` und das echte externe
Autorisierungs-Repo geprüft.

Datum: 24.09.2026, 17:38-17:45 Uhr. Repo: `C:\Users\stefa\Projekte\ai-workforce`
(`repoWurzel`, unverändert die Quelle). Zielordner:
`C:\Users\stefa\Projekte\f41-wegwerf-nachweis` (id `f41-wegwerf-nachweis`,
nach dem Nachweis vollständig gelöscht — keine Spur im Dateisystem oder in
`projekte.lokal.json`, siehe Abschluss unten).

## Ablauf

Ein kurzes Node-Skript (nicht Teil des Repos, ausgeführt aus dem
Scratchpad) startet `erzeugeRequestHandler({ repoWurzel: 'C:\Users\stefa\
Projekte\ai-workforce', ... })` — dieselbe Funktion, denselben
Konstruktionspfad wie `npm run leitstand` — hinter einem echten
`erzeugeMultiProjektDispatcher`, auf einem ephemeren lokalen Port.

### Schritt 1 — POST /api/projekte

```
HTTP-Status: 201
{
  "projekt": {
    "id": "f41-wegwerf-nachweis",
    "name": "F41 Wegwerf-Nachweis",
    "repo_pfad": "../f41-wegwerf-nachweis",
    "startvorlage_pfad": "startvorlagen/f41-wegwerf-nachweis.json",
    "profil_pfad": "profiles/f41-wegwerf-nachweis.json",
    "basisverzeichnis": "kontrollzustand",
    "status": "IDEE"
  },
  "naechste_schritte": {
    "git": ["git init -b main", "git add -A", "git commit -m \"Initiale Kopie der Harness-Baseline (F41 WS-1)\"", "git checkout -b arbeit/start"],
    "hinweis": "Git-Befehle im neuen Ordner ('C:\\Users\\stefa\\Projekte\\f41-wegwerf-nachweis') ausführen — der Kern legt kein Git-Repo an (Linie E-F39-1). Danach im Coach-Interview-Modus 'projekt' fortfahren (WS-2)."
  }
}
```

Startbedingung 1 (E-183) der Quelle (ai-workforce selbst) real grün geprüft
— sonst wäre hier bereits 409 zurückgekommen, ohne dass irgendetwas angelegt
wird (kein Testlauf dafür nötig: die reale `state/aktuelle-autorisierung.
json` dieses Repos ist die tagtäglich genutzte, jeder andere reale Lauf in
diesem Repo setzt exakt dieselbe Grünprüfung voraus).

### Schritt 2 — GET /api/projekte enthält den neuen Eintrag

```
Eintrag gefunden: true
{"id":"f41-wegwerf-nachweis","name":"F41 Wegwerf-Nachweis","repo_pfad":"../f41-wegwerf-nachweis","startvorlage_pfad":"startvorlagen/f41-wegwerf-nachweis.json","profil_pfad":"profiles/f41-wegwerf-nachweis.json","basisverzeichnis":"kontrollzustand","status":"IDEE","laufAktiv":false}
```

### Schritt 3 — /api/projekte/<id>/... live erreichbar, KEIN Serverneustart

```
HTTP-Status GET /api/projekte/f41-wegwerf-nachweis/laeufe: 200
```

Derselbe Serverprozess, derselbe Request-Zyklus wie Schritt 1/2 — die
Live-Registrierung in `projektHandlerMap` (AK4e) funktioniert ohne
Neustart.

### Schritt 4 — Byte-Identität (Node `Buffer.equals`, gegen die echte Baseline)

```
.claude/settings.json byte-identisch: true
state/aktuelle-autorisierung.json byte-identisch: true
```

(Die referenzierte Hook-Datei ist bereits über den Gate-Check
`scripts/check-f41-projekt-anlegen.mjs` Abschnitt (2) byte-genau kalibriert
— hier zusätzlich gegen die beiden Dateien geprüft, deren Hash die
Startbedingung direkt vergleicht.)

### Schritt 5 — echte Startprüfung (Startbedingung 1, E-183) direkt gegen das Ziel wiederholt

```
pruefeStartbedingung1FuerRepo(zielordner) gegen die ECHTE externe Baseline: {"ok":true}
```

Ohne Überschreibung von `startfreigabeRepoWurzel` — läuft gegen
`C:\Users\stefa\ai-workforce-autorisierung`, das echte externe
Autorisierungs-Repo. Bestätigt das Kernmuster von E-F41-1: die
byte-identische Kopie validiert gegen dieselbe, bereits bestehende
Autorisierung — kein neues Freigabeartefakt entstand (in keinem Schritt
wurde `C:\Users\stefa\ai-workforce-autorisierung` beschrieben).

### Schritt 6 — startvorlagen/<id>.json ohne pruefbefehl, profilPfad korrekt absolut

```
pruefbefehl vorhanden: false
profilPfad: C:\Users\stefa\Projekte\f41-wegwerf-nachweis\profiles\f41-wegwerf-nachweis.json
```

Belegt den in "Bekannte Grenzen" (features/F41/feature.md) dokumentierten
Fix: `profilPfad` zeigt absolut auf das NEUE Profil, nicht mehr relativ auf
`profiles/ai-workforce.json` (das hätte sich sonst still an ai-workforce's
eigenes Profil gebunden, siehe F-668).

### Schritt 7 — projekte.json (committet) unverändert, projekte.lokal.json additiv

`projekte.json` (Arbeitsbaum nach dem Request, ungerührt):

```json
{
  "projekte_schema": "v0",
  "projekte": [
    { "id": "ai-workforce", "name": "AI Workforce", "repo_pfad": ".", "startvorlage_pfad": "startvorlagen/ai-workforce.json", "profil_pfad": "profiles/ai-workforce.json", "basisverzeichnis": "kontrollzustand", "status": "IN_ENTWICKLUNG" }
  ]
}
```

`projekte.lokal.json` (gitignoriert, neu entstanden):

```json
{
  "projekte_schema": "v0",
  "projekte": [
    { "id": "f41-wegwerf-nachweis", "name": "F41 Wegwerf-Nachweis", "repo_pfad": "../f41-wegwerf-nachweis", "startvorlage_pfad": "startvorlagen/f41-wegwerf-nachweis.json", "profil_pfad": "profiles/f41-wegwerf-nachweis.json", "basisverzeichnis": "kontrollzustand", "status": "IDEE" }
  ]
}
```

### Zusätzlich geprüft — kein Git durch den Kern (Linie E-F39-1)

`Test-Path 'C:\Users\stefa\Projekte\f41-wegwerf-nachweis\.git'` → `False`.
Der Ordner trägt `.claude/`, `.gitignore`, `profiles/`, `startvorlagen/`,
`state/` — kein `.git`. Der Kern hat, wie vorgesehen, ausschließlich Dateien
kopiert/geschrieben, nie `git init` aufgerufen.

## Abschluss

`f41-wegwerf-nachweis/` (Dateisystem) und `projekte.lokal.json`
(Arbeitsbaum) wurden nach dem Nachweis vollständig gelöscht — kein
Kontrollzustand, kein Registereintrag bleibt zurück. `git status` in
`ai-workforce` danach unverändert gegenüber vor dem Nachweis (nur die für
F41 WS-1 selbst geänderten/neuen Dateien, kein Rest des Wegwerf-Laufs).

---

# Zweite Runde — echter Lauf gegen das neue Projekt (Challenger-Korrektur)

Anlass: Eine vorherige Fassung dieser Akte behauptete, Startbedingung 2
(E-188) lehne ein neues Projektverzeichnis "strukturell IMMER" ab, weil
`gueltigkeitsschluessel.arbeitsverzeichnis_pfad` an den Pfad des
ursprünglichen Repos gebunden sei. Ein Challenger-Befund widersprach dem:
`starteGateway` (`src/claude-code-gateway/index.ts:452`) setzt
`arbeitsverzeichnis_pfad = process.cwd()` — das `cwd` des Leitstand-
SERVERPROZESSES, ohne jedes `process.chdir()`, also für jedes Projekt
derselbe, konstante Wert. `features/F25/nachweis-ws1.md` (AK8) hatte mit
genau dieser byte-identischen Kopie bereits real Läufe in einem zweiten
Projekt gestartet — dieser Realbeleg war beim Schreiben der ursprünglichen
Behauptung nicht gegengeprüft worden (`state/findings.md` F-671).

Datum: 24.09.2026, 18:10 Uhr. Repo: `C:\Users\stefa\Projekte\ai-workforce`
(Quelle, unverändert). Zielordner: `C:\Users\stefa\Projekte\f41-e188-nachweis`
(id `f41-e188-nachweis`, nach dem Nachweis vollständig gelöscht).

## Ablauf

1. `POST /api/projekte` (echter `erzeugeRequestHandler`/Dispatcher, echte
   Autorisierung) → `201`, Projekt real angelegt (byte-identische Kopie,
   Startprüfung — nach der Korrektur unten die VOLLE Startfreigabe — real
   grün).
2. Marker-Datei `nur-in-f41-e188-nachweis.txt` NUR im neuen Projektordner
   angelegt (Muster F25 AK8).
3. Ein Auftrag gegen das neue Projekts Kontrollzustand registriert
   (`registriereAuftrag`, `basisVerzeichnis =
   C:\Users\stefa\Projekte\f41-e188-nachweis\kontrollzustand`).
4. `POST /api/projekte/f41-e188-nachweis/laeufe` — echter Startauftrag:
   `rolle: 'ausfuehrung'`, `werkzeugsatz: 'lesend'`, `anfragen: [{pfad:
   'nur-in-f41-e188-nachweis.txt'}]`, `aufrufEingaben: {modell:
   'claude-sonnet-5'}`. `laufId`:
   `f41-e188-realtest-1790266213879`. Antwort `202`.
5. Serverlog (echter Rundlauf, kein Mock):
   ```
   {"ereignis":"startfreigabe_geprueft","zeitstempel":"2026-09-24T16:10:14.141Z"}
   {"ereignis":"wirkungsmarke_geschrieben", ... "sequenz":1, ...}  ← RUN_PREPARED
   ```
   `startfreigabe_geprueft` (kein `startfreigabe_abgelehnt`) — `pruefeStartfreigabe`
   innerhalb `starteGateway` hat BEIDE Bedingungen (E-183 UND E-188) real
   bestanden, sonst hätte `verweigereStart` eine `VERWEIGERT`-Wirkungsmarke
   geschrieben und keine `RUN_PREPARED`.
6. Direkt über den Checkpoint Store des neuen Projekts gepollt
   (`stelleLaufstatusFest`, `basisVerzeichnis` des neuen Projekts):
   ```
   {"status":"ABGESCHLOSSEN","ergebnis":"ERFOLGREICH","terminalSequenz":2,"runPreparedSequenz":1,"terminaleOhneRunPrepared":[]}
   ```
   **Startfreigabe-Urteil: FREIGEGEBEN** (nicht abgelehnt) — der reale
   Kindprozess lief bis zu einem erfolgreichen Terminalergebnis durch.
7. Laufakte (`ladeArtefaktVersion('laufakte-f41-e188-realtest-...', ...)`)
   bestätigt zusätzlich real, WAS geprüft wurde:
   ```json
   { "arbeitsverzeichnis_pfad": "C:\\Users\\stefa\\Projekte\\ai-workforce", "modell_beobachtet": "claude-sonnet-5", "verbrauch": { "turns": 2, "output_tokens": 215, ... } }
   ```
   `arbeitsverzeichnis_pfad` ist real ai-workforce's eigener Pfad (der
   Server-`cwd`), NICHT `f41-e188-nachweis` — bestätigt exakt den
   Challenger-Befund: der Gültigkeitsschlüssel bindet nicht an das reale
   Projektverzeichnis, sondern immer an den Server-`cwd`.
8. Rohstrom (`kontrollzustand-roh\f41-e188-realtest-...\rohstrom.json`,
   real gelesen, nicht gemockt) — der Kindprozess las die Markerdatei real
   und gab sie wörtlich zurück:
   ```json
   "result":"Diese Datei existiert NUR in Projekt f41-e188-nachweis (F41 E-188 Realtest, Muster F25 AK8)."
   ```
   Wortgleich mit dem geschriebenen Markerinhalt — der reale Kindprozess
   lief tatsächlich mit `cwd = f41-e188-nachweis` (F-415-Fix aus F25 WS-1
   greift unverändert), unabhängig davon, dass der E-188-Gültigkeitsschlüssel
   selbst nicht projektbezogen ist (F-670).

## Ergebnis

Startbedingung 2 (E-188) lehnt ein neues Projektverzeichnis NICHT ab —
Startfreigabe wurde real erteilt, ein echter lesender Lauf lief real bis
zum Ende durch. Die ursprüngliche Behauptung dieser Akte war falsch und ist
korrigiert (`features/F41/feature.md`, `src/projekt-anlegen/index.ts`
Kopfkommentar). Die POST-Route prüft am Ziel jetzt die VOLLE Startfreigabe
(`pruefeVolleStartfreigabeFuerRepo`, Bedingung 1 UND 2, dieselben Eingaben
wie `starteGateway`), ohne Wirkungsmarke/Log-Schreiben.

## Abschluss

`f41-e188-nachweis/` (Dateisystem), der Rohereignisstrom unter
`kontrollzustand-roh\f41-e188-realtest-...\` (ai-workforce, nicht
projektspezifisch, F-416/F-670) und `projekte.lokal.json` wurden nach dem
Nachweis vollständig gelöscht.
