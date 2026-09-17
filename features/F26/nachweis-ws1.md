# F26 WS-1 — Nachweisprotokoll (realer Jarvis-Chat-Lauf + Lineage-Chat)

Stand: 17.09.2026. Bedienung über `curl` gegen den echten Leitstand-Prozess
(`127.0.0.1:4173`, `node scripts/leitstand-server.mjs`, Startvorlage
`startvorlagen/ai-workforce.json`, echter Claude-Code-Kindprozess), Muster
`features/F18/nachweis-ws3-szenario-a.md`, `features/F27/feature.md` AK6.

**Rohstrom-Belege sind nicht committet** (`.gitignore`, E-190) — wie in
F16/F18/F27 werden Rohstrom-Zitate über den `rohstrom_referenz.inhalts_hash`
der committeten Laufakte referenziell prüfbar gehalten. Die
`kontrollzustand/`-Verzeichnisse beider Läufe (`lineage-auftrag-*`,
`lineage-laufakte-*`, `jarvis-*` Wirkungsmarken, `lineage-kontextpaket-*`)
sind reale, committete Evidenz.

---

## A — Erster Lauf: real FEHLGESCHLAGEN am Parsen (Rot-Fall, Prompt nachgebessert)

`[Fakt]` `POST /api/chat` mit `{"nachricht":"Was blockiert mich gerade im
Projekt AI Workforce?"}` → `202 {"laufId":"jarvis-jarvis-chat-
f67bc1ab-62ed-4821-b505-007a5fdf874e","auftragId":"jarvis-chat-
f67bc1ab-62ed-4821-b505-007a5fdf874e"}`.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` (echter Claude-Code-
Kindprozess, `exitCode 0`, `permission_denials: []`). Laufakte
`inhalts_hash` des Rohstroms: `b54a317b1e05c3b6989e338e92eb1c82c4a04bb2f011db6fb2bc909aff2fc85b`.

`[Fakt]` Beobachtetes `result`-Feld (wörtlich, gekürzt):

> Kein Feature trägt aktuell den Status `BLOCKIERT`. Antwort basiert auf
> `docs/STATUS.md` und `state/findings.md`.
>
> ```` ```json ````
> `{"art":"antwort","antwort":"Kein Feature steht aktuell auf Status BLOCKIERT …"}`
> ```` ``` ````

`[Fakt]` `scripts/jarvis-chat-nachweis.mjs jarvis-jarvis-chat-
f67bc1ab-62ed-4821-b505-007a5fdf874e ai-workforce "…"` scheitert real:
`leseJarvisErgebnisAusLaufakte` liefert `{ ok: false, grund: "Ergebnistext
ist kein gültiges JSON" }`. Kein Lineage-Eintrag geschrieben (das Skript
bricht vor dem Schreibpfad ab).

`[Schlussfolgerung]` Der erste Promptentwurf (`baueJarvisAuftragstext`)
verbot Codezäune und Text davor/danach, aber das Modell stellte trotzdem
einen erklärenden Satz VOR den Codezaun. `entferneCodezaun`
(`scripts/leitstand-server.mjs`) prüft nur, ob der GESAMTE getrimmte Text
mit ```` ``` ```` beginnt — ein vorangestellter Satz bricht das Fence-
Stripping strukturell, unabhängig vom Prompt-Wortlaut. Dasselbe Muster wie
F-337 (Format-Zuverlässigkeit bei `claude-code` ohne `--output-schema`),
hier zusätzlich verschärft durch das FEHLEN eines Codezauns um den
gesamten Text. `entferneCodezaun` selbst wurde NICHT geändert (gemeinsame
Infrastruktur mit router/scout, F-337 bleibt bewusst offen) — stattdessen
wurde der Prompt verschärft (Muster F18 WS-3 Szenario A: Rot-Fall →
Prompt nachgebessert → Grün-Fall).

`[Fakt]` Prompt-Korrektur in `baueJarvisAuftragstext`
(`src/jarvis/index.ts`): statt „kein Text davor oder danach" jetzt „Die
allererste Zeile deiner Antwort ist '{', die letzte Zeile ist '}'." —
explizite Positionsangabe statt reiner Verbotsformulierung.

---

## B — Zweiter Lauf (nach Prompt-Korrektur, Serverneustart): real ABGESCHLOSSEN/ERFOLGREICH, valides Ergebnis

`[Fakt]` Server neu gestartet (Prompt-Änderung lädt nur bei Prozessstart).
`POST /api/chat` mit derselben Nachricht → `202
{"laufId":"jarvis-jarvis-chat-7d786508-2ac1-404d-91dc-ff505ca1a546",
"auftragId":"jarvis-chat-7d786508-2ac1-404d-91dc-ff505ca1a546"}`.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` (`exitCode 0`,
`permission_denials: []`, `worker: claude-code`, `modell_beobachtet:
claude-sonnet-5`). Rohstrom `inhalts_hash`:
`21630c56405ff372f2fec1bb8c72384856f010e1ca99682effeaee505ee78afa`.

`[Fakt]` `scripts/jarvis-chat-nachweis.mjs jarvis-jarvis-chat-
7d786508-2ac1-404d-91dc-ff505ca1a546 ai-workforce "Was blockiert mich
gerade im Projekt AI Workforce?"` — vollständiger Ablauf real erfolgreich:

1. `leseJarvisErgebnisAusLaufakte` liefert `{ ok: true, ergebnis: { art:
   "antwort", antwort: "…" } }` — reines JSON, kein Codezaun, gültig gegen
   `schemas/ergebnis-jarvis.schema.json`.

2. Die Antwort selbst ist inhaltlich real und projektbezogen (der Lauf hatte
   nur den freien Auftragstext als Eingabekanal, keine spezielle Evidenz):
   das Modell erkannte selbstständig, dass es auf dem Branch
   `feat/f26-ws1-jarvis-rolle` läuft und dieser F26-WS-1-Bauauftrag noch
   ungecommittet ist, verwies korrekt auf `features/F26/nachweis-ws1.md`
   (zu diesem Zeitpunkt noch nicht angelegt) als noch fehlenden Nachweis,
   und schlug zwei echte, offene Findings (F-407, F-402/F-414) vor.

3. `registriereKernArtefakt('chat-ai-workforce', profilReferenz, { quelle:
   'jarvis-chat', lauf_id: '…' }, { nachricht, jarvisAntwort: { art,
   antwort } }, undefined, {})` — Checkpoint-Kette `lineage-chat-
   ai-workforce`, `versionSequenz: 1`, `inhaltsHash:
   0c04daf5a90e4796decd1aa41cc57f107c72d834f5a27042d663dbdb0443d834`.

4. `validiereLineageEintrag` gegen den geschriebenen Checkpoint-Eintrag: **0
   Verstöße.**

5. Geschriebener Eintrag (`payload.daten`, vollständig):

```json
{
  "typ": "lineage",
  "art": "artefakt_version",
  "artefakt_id": "chat-ai-workforce",
  "erzeugungsart": "kern",
  "inhalts_hash": "0c04daf5a90e4796decd1aa41cc57f107c72d834f5a27042d663dbdb0443d834",
  "herkunft": { "quelle": "jarvis-chat", "lauf_id": "jarvis-jarvis-chat-7d786508-2ac1-404d-91dc-ff505ca1a546" },
  "eingaben": [],
  "daten": {
    "nachricht": "Was blockiert mich gerade im Projekt AI Workforce?",
    "jarvisAntwort": {
      "art": "antwort",
      "antwort": "Kein harter Blocker, aber ein offener Punkt: Auf dem aktuellen Zweig 'feat/f26-ws1-jarvis-rolle' liegt F26 WS-1 (Jarvis-Rolle inkl. Schema, Gate scripts/check-f26-jarvis.mjs, Kontrollzustand-Läufe) vollständig ungecommittet vor. […] Soll ich einen der beiden offenen Findings (F-407 oder F-402) als Auftrag vorschlagen?"
    }
  }
}
```

`[Schlussfolgerung]` Die Nachricht steht im freien `daten`-Feld, `eingaben`
ist ein leeres Array — genau wie in Punkt 5 des Bauauftrags gefordert
(`eingaben` ist für Datei-Referenzen mit `inhalts_hash` reserviert, nicht
für Nachrichtentext). Der Eintrag validiert vollständig gegen
`schemas/kontrollzustand-lineage-payload.schema.json`.

---

## C — Dritter Lauf (nach Reviewer-/QA-Fixes): Reihenfolge-Tausch real bestätigt

`[Fakt]` Nach dem Reviewer-/QA-Pass wurde `POST /api/chat` umgebaut:
`registriereAuftrag` läuft jetzt ERST NACH erfolgreicher Worker-/Eingaben-
Auflösung (vorher: davor — Code-Review-Befund, Orphan-Risiko bei Scheitern
der Auflösung), die Titel-Kürzung ist codepoint-sicher, und `nachricht` ist
auf 8000 Zeichen begrenzt. Ein dritter realer Lauf gegen den Server-Default
(`startvorlagen/beispielprojekt.json`, nicht `ai-workforce.json`) bestätigt,
dass der umgebaute Pfad weiterhin real funktioniert: `POST /api/chat` mit
`{"nachricht":"Smoke-Test nach Reihenfolge-Fix."}`, Lauf `jarvis-jarvis-
chat-cecf0ccd-e9c1-45c7-b932-1b94d7c3b30c`, real `ABGESCHLOSSEN`/
`ERFOLGREICH` (`exitCode 0`, `permission_denials: []`).

`[Fakt]` `scripts/jarvis-chat-nachweis.mjs` gegen diesen dritten Lauf:
`leseJarvisErgebnisAusLaufakte` liefert ein gültiges, reines JSON-Ergebnis
— diesmal zusätzlich mit einem real vom Modell gesetzten `bezug`-Feld
(`{"auftrag_id":"jarvis-chat-cecf0ccd-…"}`, selbstreferenziell). Ein
zweiter `chat-ai-workforce`-Eintrag wurde in dieselbe Checkpoint-Kette
geschrieben (`versionSequenz: 2`, an `versionSequenz: 1` aus Abschnitt B
anschließend) und validiert erneut mit **0 Verstößen** gegen
`schemas/kontrollzustand-lineage-payload.schema.json`.

`[Schlussfolgerung]` Die Kette `lineage-chat-ai-workforce` akkumuliert
über mehrere reale Läufe korrekt (`versionSequenz` 1 → 2) — genau das
Verhalten, das WS-2 für einen "Reload verliert nichts"-Verlauf (AK4 der
Plan-Akte) braucht, hier bereits am Mechanismus selbst belegt, auch wenn
die automatische Verdrahtung erst WS-2-Scope ist.

## E — Kein neuer serverseitiger Vorfilter-Regelsatz

`[Fakt]` `POST /api/chat` enthält keinen Musterabgleich à la „Was braucht
mich" / „Status <Projekt>" — die einzige serverseitige Formprüfung ist die
Bodyprüfung (`nachricht` nicht-leerer String, ≤8000 Zeichen, keine
unbekannten Felder, gültiges JSON). Das entspricht Klärung 3 des
Bauauftrags: der deterministische Vorfilter läuft clientseitig (WS-2), es
gibt keinen `/api/attention`-Endpunkt.

---

## F — Reale Belege (Repo-Pfade)

- `kontrollzustand/lineage-auftrag-jarvis-chat-f67bc1ab-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-f67bc1ab-…/`,
  `kontrollzustand/jarvis-jarvis-chat-f67bc1ab-…/` (Rot-Fall, Abschnitt A).
- `kontrollzustand/lineage-auftrag-jarvis-chat-7d786508-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-7d786508-…/`,
  `kontrollzustand/jarvis-jarvis-chat-7d786508-…/` (Grün-Fall, Abschnitt B).
- `kontrollzustand/lineage-auftrag-jarvis-chat-cecf0ccd-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-cecf0ccd-…/`,
  `kontrollzustand/jarvis-jarvis-chat-cecf0ccd-…/` (Bestätigungslauf nach
  Fixes, Abschnitt C).
- `kontrollzustand/lineage-chat-ai-workforce/` (der reale
  `lineage-chat-<projektId>`-Eintrag, `versionSequenz` 1 aus Abschnitt B,
  `versionSequenz` 2 aus Abschnitt C).
