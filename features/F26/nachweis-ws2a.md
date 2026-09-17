# F26 WS-2a — Nachweisprotokoll (automatischer Lineage-Write, ohne Glue-Skript)

Stand: 17.09.2026. Bedienung über `curl` gegen den echten Leitstand-Prozess
(`127.0.0.1:4173`, `node scripts/leitstand-server.mjs`, unpräfigierter Pfad
für `ai-workforce`), echte Claude-Code-/Codex-Kindprozesse. Anders als
`features/F26/nachweis-ws1.md` (WS-1) läuft hier **kein**
`scripts/jarvis-chat-nachweis.mjs` mehr — der Lineage-Eintrag entsteht
ausschließlich aus dem `nachLauf`-Callback in `POST /api/chat`
(`scripts/leitstand-server.mjs`, `verarbeiteJarvisChatErgebnis`).

**Rohstrom-Belege sind nicht committet** (`.gitignore`, E-190, Muster
nachweis-ws1.md) — die `kontrollzustand/`-Verzeichnisse aller drei Läufe
sind reale, committete Evidenz.

---

## A — Rotfall (real): Codex-Worker scheitert strukturell (neuer Fund, F-423)

`[Fakt]` Server gestartet mit `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
(konfigurierter, real verfügbarer Codex-Worker). `POST /api/chat` mit
`{"nachricht":"Status?"}` → `202
{"laufId":"jarvis-jarvis-chat-319988f0-29d4-4895-97ff-f32a4afc8150", …}`.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`FEHLGESCHLAGEN` (`exitCode 1`, worker
`codex`). Rohstrom-Fehler: `{"type":"error","error":{"code":"invalid_json_schema","message":"Invalid
schema for response_format 'codex_output_schema': In context=(), 'allOf'
is not permitted."}}` — als eigenständiger Fund **F-423** in
`state/findings.md` festgehalten (Ursache: die WS-1-Schemaerweiterung
`allOf`/`if`/`then` in `schemas/ergebnis-jarvis.schema.json`, real nie
gegen Codex getestet, weil WS-1 ausschließlich mit `claude-code` lief).

`[Fakt]` `GET /api/chat` zeigt danach unverändert die zwei WS-1-Einträge
(`versionSequenz` 1/2) — **kein** dritter Eintrag. Der `nachLauf`-Callback
schreibt korrekt NICHTS, weil `laufStatus.ergebnis !== 'ERFOLGREICH'` war.

`[Schlussfolgerung]` Der automatische Lineage-Write prüft die
Erfolgsbedingung real korrekt, auch wenn der zugrunde liegende Jarvis-Lauf
aus einem unabhängigen, hier neu gefundenen Grund scheitert.

---

## B — Rotfall (real): claude-code-Lauf real VERWEIGERT

`[Fakt]` Server neu gestartet mit dem Server-Default
(`startvorlagen/beispielprojekt.json`, kein Codex-Block → garantierter
`claude-code`-Fallback). `POST /api/chat` mit
`{"nachricht":"Was braucht F26 WS-2a noch, um FEATURE_GATE zu sein?"}` →
`202 {"laufId":"jarvis-jarvis-chat-82ad4054-e50c-4d15-943e-19e4bb99c354", …}`.

`[Fakt]` Während der Lauf noch aktiv war, meldete `GET
/api/laeufe/<laufId>` mehrfach `laufStatus.status:
"KLAERUNG_ERFORDERLICH"` bei gleichzeitig `aktiv: true` — das ist die
normale Zwischenlage eines noch laufenden Laufs (`RUN_PREPARED` ohne
Terminalartefakt), **keine** echte Klärungslage. `views/chat.js`s
Poll-Callback (`pruefeAusstehendenLauf`) prüfte das anfangs NICHT und hätte
einen real noch laufenden Lauf fälschlich als beendet/fehlgeschlagen
gemeldet — real an diesem Lauf gefunden und sofort behoben: die Prüfung
wartet jetzt zusätzlich auf `detail.aktiv === false`, bevor sie
`laufStatus` als verlässlich terminal behandelt.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`VERWEIGERT` (`aktiv: false`,
`bypassVerdachtAnzahl: 0`, `nonExecutionKind: "unbekannt"`). Der Rohstrom
zeigt, dass das Modell zunächst einen nicht erlaubten Werkzeugaufruf
versuchte (`lesend`-Werkzeugsatz), sich selbst korrigierte ("Das war ein
Fehlgriff meinerseits …") und danach ein inhaltlich zutreffendes, valides
JSON lieferte — die Verweigerung bezieht sich auf den Zwischenschritt, das
Endergebnis selbst wäre schemakonform gewesen.

`[Fakt]` `GET /api/chat` zeigt weiterhin nur zwei Einträge — kein
Lineage-Write bei `ABGESCHLOSSEN`/`VERWEIGERT`.

---

## C — Grünfall (real): automatischer Lineage-Write, KEIN Glue-Skript

`[Fakt]` Gleicher Server (Default-Startvorlage, `claude-code`-Fallback).
`POST /api/chat` mit `{"nachricht":"Wie viele Tests hat das Projekt laut
letztem npm run check Lauf ungefaehr? Antworte kurz."}` → `202
{"laufId":"jarvis-jarvis-chat-2895f7cf-b2e8-43f0-b002-3269e243cd24", …}`.

`[Fakt]` Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` nach 14 Polls (`aktiv`
wechselte dabei zuverlässig von `true` auf `false`, Muster Abschnitt B).

`[Fakt]` `GET /api/chat` (derselbe, unveränderte Endpunkt, keine manuelle
Aktion dazwischen) zeigt jetzt **drei** Einträge — der dritte real
automatisch vom `nachLauf`-Callback geschrieben:

```json
{
  "laufId": "jarvis-jarvis-chat-2895f7cf-b2e8-43f0-b002-3269e243cd24",
  "erstelltAm": "2026-09-17T17:25:03.127Z",
  "nachricht": "Wie viele Tests hat das Projekt laut letztem npm run check Lauf ungefaehr? Antworte kurz.",
  "jarvisAntwort": {
    "antwort": "Keinen exakten letzten Laufbericht mit Testzahl gefunden — die letzte dokumentierte Zahl in state/gates.md bzw. Feature-Journalen ist veraltet (143, aus F11). Direktes Zählen der test()/it()-Aufrufe in src/ und scripts/ ergibt aktuell ca. 460 Testfälle.",
    "art": "antwort"
  }
}
```

`[Fakt]` Direkt gegen `src/lineage-registry/index.ts` geprüft
(`ladeGueltigeCheckpoints('lineage-chat-ai-workforce')` +
`validiereLineageEintrag`): 3 Einträge, **0 Verstöße**, `versionSequenz: 3`
— akkumuliert korrekt an die zwei WS-1-Einträge (`versionSequenz` 1/2,
`nachweis-ws1.md`) an.

`[Schlussfolgerung]` Der in `features/F26/feature.md` "Bekannte Grenzen"
dokumentierte Punkt ist real geschlossen: `POST /api/chat` kennt seine
Projekt-id (`optionen.projektId`, Default `'ai-workforce'`,
`baueProjektHandlerMap` reicht `projekt.id` je Registereintrag durch) und
schreibt den `lineage-chat-<projektId>`-Eintrag automatisch, ohne
`scripts/jarvis-chat-nachweis.mjs`. `GET /api/chat` projiziert denselben
Verlauf für die View — ein Reload verliert nichts (AK4).

---

## D — Vorfilter (lokal geprüft, kein Netzwerkzugriff für die Muster selbst)

`[Fakt]` `erkenneVorfilterMuster` (`public/leitstand/jarvis-vorfilter.js`)
direkt mit Node ausgeführt: erkennt `"was braucht mich"` /
`"Was braucht mich?"` / Großschreibung als `'braucht_mich'`, `"Status"` /
`"status?"` / `"Status ai-workforce"` als `'status'`, und lässt
`"Behebe F-123"` / `"Was blockiert mich gerade?"` unerkannt (→ `null`,
geht an `POST /api/chat`) — alle acht Fälle wie erwartet.

`[Fakt]` `loeseVorfilterAuf('Status', zustand)` mit einem synthetischen
Zustands-Aggregat (`{laeufe: 2 Einträge, startfehler: 0, workflows: 1
Eintrag mit haltFreigabe}`) liefert real `{"art":"antwort","antwort":"Läufe:
2 · Startfehler: 0 · Workflows: 1 · Braucht Aufmerksamkeit
(Workflows/Läufe): 2","quelle":"vorfilter"}` — rechnerisch korrekt (1
Workflow + 1 nicht kenntnisgenommener fehlgeschlagener Lauf = 2).

`[Bekannte Grenze dieses Nachweises]` Keine vollständige Browser-/DOM-Probe
der Chat-View selbst (Eingabe tippen, Senden klicken, Screenshot) — dieses
Repo hat keinen projekteigenen `run`-Skill für den Leitstand und in dieser
Umgebung ist kein Browser-Automatisierungswerkzeug (Playwright o. ä.)
installiert; eine Installation dafür hätte `werkzeug-auswahl`
durchlaufen müssen und wäre für einen einmaligen Sichttest
unverhältnismäßig gewesen. Die Vorfilter-LOGIK (Mustererkennung,
deterministische Textbildung) ist oben real geprüft; die DOM-Verdrahtung
(`views/chat.js`) folgt unverändert den bereits produktiv laufenden
Mustern aus `views/attention.js`/`views/workflows.js`. Empfehlung: einmal
manuell `npm run leitstand` starten und `#/chat` im Browser öffnen, bevor
WS-2a endgültig als geprüft gilt — oder `/run-skill-generator` für einen
projekteigenen Leitstand-`run`-Skill.

---

## E — Reale Belege (Repo-Pfade)

- `kontrollzustand/lineage-auftrag-jarvis-chat-319988f0-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-319988f0-…/`,
  `kontrollzustand/jarvis-jarvis-chat-319988f0-…/` (Rotfall Codex/F-423,
  Abschnitt A).
- `kontrollzustand/lineage-auftrag-jarvis-chat-82ad4054-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-82ad4054-…/`,
  `kontrollzustand/jarvis-jarvis-chat-82ad4054-…/` (Rotfall VERWEIGERT,
  Abschnitt B).
- `kontrollzustand/lineage-auftrag-jarvis-chat-2895f7cf-…/`,
  `kontrollzustand/lineage-laufakte-jarvis-jarvis-chat-2895f7cf-…/`,
  `kontrollzustand/jarvis-jarvis-chat-2895f7cf-…/` (Grünfall, Abschnitt C).
- `kontrollzustand/lineage-chat-ai-workforce/checkpoints/3-…json` (der neue,
  automatisch geschriebene Eintrag, `versionSequenz: 3`, an die zwei
  WS-1-Einträge angeschlossen).
- `state/findings.md` F-423 (neuer, realer Fund: Codex + `allOf` im
  Jarvis-Ergebnisschema).

---

## F — Nachtrag: Reviewer-/QA-Pass-Befunde behoben, GET /api/chat erneut real geprüft

`[Fakt]` Nach den Läufen A-C fand ein Reviewer-/QA-Pass mit frischem
Kontext (F-046) vier reale, reproduzierte QA-Befunde (Projektwechsel bei
ausstehendem Chat-Lauf bricht die View dauerhaft; lokale Vorfilter-/
Fehleinträge lecken projektübergreifend; `"Status"`-Vorfilter verschluckt
echte Fragen; ein transienter `GET /api/chat`-Fehlschlag lässt eine fertige
Antwort verschwinden) sowie zwei Reviewer-Hinweise (`GET /api/chat` sollte
`listeVersionen` statt eines rohen `ladeGueltigeCheckpoints`-Aufrufs
nutzen; `baueProjektHandlerMap`s Selbst-Kollaps als Bekannte Grenze
nachtragen). Details siehe `features/F26/feature.md` Abschnitt "Feature
Review" (WS-2a).

`[Fakt]` Alle vier QA-Befunde und der `listeVersionen`-Reviewer-Hinweis
sind behoben (`public/leitstand/views/chat.js`, `jarvis-vorfilter.js`,
`projekt-kontext.js`, `scripts/leitstand-server.mjs`); `npm run check`
danach erneut grün (554 Tests, inkl. Gate-Abschnitt (f)).

`[Fakt]` `GET /api/chat` (jetzt über `listeVersionen` statt der rohen
Checkpoint-Kette) erneut real gegen den echten Leitstand-Prozess geprüft:
liefert unverändert alle drei real committeten Einträge (`versionSequenz`
1-3, Abschnitte B/C dieses Dokuments plus die zwei WS-1-Einträge) in
korrekter Reihenfolge.

`[Bekannte Grenze, unverändert]` Der `baueProjektHandlerMap`-Selbst-Kollaps
(Reviewer-Hinweis) ist NICHT behoben, nur dokumentiert (`feature.md`,
"Bekannte Grenzen") — aktuell rein hypothetisch (kein zweiter
Registereintrag mit identischem `repoWurzel` existiert). Ebenso
unverändert: kein Browser-/DOM-Test der View (Abschnitt D oben), Reload
während eines ausstehenden Laufs verliert die Pending-Anzeige (jetzt
explizit als Grenze benannt statt implizit vorausgesetzt).
