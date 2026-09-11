# Übergabe an Fable 5.1: F16 vorplanen (Spike S-M3-01 bereits real gelaufen)

Stand: 10.09.2026. Diese Übergabe ist für eine SEPARATE Sitzung geschrieben,
die diesen Chat-Verlauf nicht kennt. Alles Nötige steht hier oder unter
einem committeten Repo-Pfad (docs/, state/, features/, src/ — per
Projektregel „Repo-Erreichbarkeit von Handoffs" direkt lesbar).

## 0. Rolle und harte Leitplanken

Du planst — du baust nicht. Produktcode schreibt ausschließlich eine
Claude-Code-Sitzung gegen das reale Repo, nie diese Planungssitzung direkt.

Falls du über eine Bridge Lesezugriff auf das reale Repo hast: nur lesende
Befehle (`log`, `ls-tree`, `ls-remote`, `rev-parse`, `cat`, `diff`, `grep`,
`show`). Keine mutierenden Git-Befehle — fünf dokumentierte Vorfälle
(`state/findings.md` F-100, F-118, F-122, F-123, F-126) haben real
Arbeitsausfall verursacht. Jede Änderung am Repo-Zustand geht als
Terminal-Befehl an Stefan zurück, nie selbst ausgeführt.

Kennzeichne jede nicht-triviale Aussage mit Beleglage: `[Fakt]` ·
`[Schlussfolgerung]` · `[Annahme]` · `[offene Unsicherheit]` ·
`[Fakt, entlastend]`.

Erkannte Probleme sofort als Finding formulieren (Typ, Titel, Priorität,
Fundstelle, Auswirkung, empfohlene Maßnahme). Register aktuell bei F-272
(`state/findings.md`).

Reversible, kleine Entscheidungen selbst treffen und als `[EMPFEHLUNG]`
kennzeichnen. Nur bei echten Abzweigungen eine `❓ ENTSCHEIDUNG MENSCH`
formulieren.

Stefan legt dir zusätzlich eine von ChatGPT erstellte .md mit einem
Lösungsvorschlag vor. Behandle sie wie jeden externen Vorschlag: prüfen,
nicht übernehmen. Wo sie mit den realen Spike-Befunden unten oder mit den
bereits getroffenen Entscheidungen (E-M3-1/2/3) kollidiert, gilt das reale
Repo, nicht der Vorschlag — als Konfliktpunkt benennen, nicht stillschweigend
auflösen.

**Ergebnis kommt zurück in die Technical-Challenger-Sitzung**, bevor
irgendein Bauauftrag an Claude Code geht.

## 1. Repo-Stand (aktualisiert)

`main` enthält F0–F15 vollständig (Meilenstein 1+2 abgeschlossen, F15
AK1–AK10 real nachgewiesen, PR #124 gemergt; Findings-Registerpflege PR
#125 gemergt). Für F16 relevant: das `WORKFLOW_V0`-Schema, der
Schritt-Automat (`ermittleNaechstenSchritt`) und der Leitstand sind fertig
und real erprobt (`features/F15/nachweis-ak10.md`) — F16 baut auf einer
laufenden, nicht mehr nur geplanten Automatik auf.

## 2. Spike S-M3-01 — bereits real gelaufen, nicht mehr zu planen

Ergebnis: `state/tp-m3-01-codex.md`, **BESTANDEN mit Hinweisen**. Lies die
Datei vollständig — sie ist deine wichtigste Eingabe. Drei reale Befunde,
die deine F16-Planung direkt einschränken:

1. **Default-Sandbox blockiert auch Lesebefehle**, nicht nur Schreiben
   (F-188, P2, offen). E-M3-2 sagt „Codex nur lesend" — aber mit
   Standardeinstellungen kann Codex CLI nicht einmal lesen. Deine Planung
   muss klären, welche Sandbox-/Approval-Flags lesende Rollen tatsächlich
   lesefähig machen, ohne Schreibzugriff zu öffnen — das ist jetzt die
   zentrale offene Frage von Auftrag B Punkt 4 unten, nicht mehr hypothetisch.
2. **`--output-schema` braucht `additionalProperties: false`**, sonst
   lehnt die Modell-API das Schema mit HTTP 400 ab — kein Codex-CLI-Fehler,
   eine API-Vorgabe. Jedes künftige Schema für Codex-Aufträge (WS-2) muss
   das setzen.
3. **Keine Modellidentität im JSONL-Strom.** Alle vier Läufe geprüft
   (`grep -i "model"`), kein Treffer, auch keine `~/.codex/config.toml`.
   Der in `claude/153`/der alten Fassung vorgesehene Mechanismus
   „`modell_beobachtet` aus dem JSONL-Strom lesen" (Muster: Claude-Code-
   Gateway) hat für Codex **keine Datenquelle**. Klären, ob `modell_beobachtet`
   für Codex-Läufe grundsätzlich `null`/„nicht ermittelbar" bleibt (additiv,
   kein Blocker) oder ob es einen anderen Weg gibt (z. B. explizit aus der
   Startvorlage übernehmen statt zu beobachten — dann aber ehrlich als
   „deklariert", nicht „beobachtet" kennzeichnen).

Zusätzlich, nicht blockierend, aber für WS-2 relevant: Codex CLI verweigert
den Start in einem Verzeichnis, das kein Git-Repository ist
(„Not inside a trusted directory"). Für reale F16-Läufe gegen den
ai-workforce-Arbeitsbaum ist das irrelevant (der ist ein Git-Repo), aber
für jeden isolierten Testlauf (Wegwerf-Repo-Muster wie bei den Gates)
gehört das als Vorbedingung in die Testkonstruktion.

## 3. Auftrag — F16 vorplanen

**Zweck:** ein Vorabdesign im Stil von `claude/155` (Muster: belegte
Entwurfszwänge → Zuständigkeitsschnitt → Vertrag → Entscheidungen mit
`[EMPFEHLUNG]` → Workstream-Schnitt), das die Technical-Challenger-Sitzung
danach gegenchallengen kann, bevor ein Bauauftrag entsteht.

**Bereits entschiedene Randbedingungen (nicht neu aufrollen):**
- E-M3-1: Auto-Start nur innerhalb eines freigegebenen `WORKFLOW_V0` und
  nur für Schritte mit `freigabe ≠ ZWINGEND` — D13 bleibt.
- E-M3-2: Codex **nur lesend**. Kein schreibender Codex-Lauf — für Claude
  Code existieren die Schutzschichten E-183/E-188, für Codex nicht. Der
  Spike zeigt zusätzlich: die Default-Sandbox verweigert Schreiben real
  (Lauf 2), das ist also nicht nur eine Policy-Zusage, sondern technisch
  geprüft belastbar.
- E-M3-3: feste Besetzung (`rolle → {worker, modell}` in der Startvorlage),
  keine automatische Modellwahl, kein `claude-code-router`-Muster.

**Roadmap-Rahmen aus `claude/153` (Ausgangspunkt, keine Vorgabe für
Details):**
- WS-1: Startvorlage v1 additiv — `worker: { "claude-code": {...}, "codex":
  {startziel, version, sandbox:"read-only"} }`, `besetzung: { rolle →
  {worker, modell} }`, `startvorlage_schema: "v1"`.
- WS-2: `src/codex-gateway/` nach dem Muster von `src/claude-code-gateway/`
  (lies diese Datei real): `baueAufruf` mit Argv (nie String), Verbotsliste
  (`--sandbox danger-full-access`, `workspace-write` in v1 verboten),
  `LAUFAKTE_V0` bekommt additiv ein `worker`-Feld, Rohstrom-Hash (E-190).
  **Das `modell_beobachtet`-Feld braucht jetzt eine reale Antwort statt der
  alten Annahme „aus dem JSONL-Strom" — siehe Spike-Befund 3 oben.**
- WS-3: Result Evaluator um Codex-Ergebnishülle erweitern (Exit-Code,
  Sandbox-Denials) — Lauf 2 des Spikes (Text-Verweigerung als Stderr-Zeile,
  kein strukturiertes Feld) wird der Regressionstest-Ausgangspunkt.
- AK-Kern (Zielbild): ein Schritt `code-reviewer` läuft real auf Codex,
  `modell_beobachtet ≠ Claude` (oder explizit als nicht ermittelbar markiert
  — Entscheidung dazu ist Teil deiner Planung), Kontextpaket trägt
  `extern`-Ausschlüsse (F-185, prüfen ob für F16 schon nötig).

**Was dein Vorabdesign konkret klären muss:**
1. `[Fakt]` `src/claude-code-gateway/index.ts` real lesen, `baueAufruf` als
   Vertrag beschreiben (Eingaben, Ausgaben, was NICHT übersetzt wird).
   Codex-Gateway soll denselben Zuständigkeitsschnitt spiegeln — markiere
   wo Codex strukturell abweicht (Sandbox-Flags statt `--allowedTools`,
   `--output-schema`-Datei mit Pflicht-`additionalProperties: false` statt
   inline-Prompt für Struktur, ChatGPT-Login statt API-Key).
2. Wie unterscheidet der Result Evaluator „Codex hat verweigert, weil
   Sandbox" von „Codex ist inhaltlich gescheitert"? Real beobachtet: die
   Verweigerung steht als Stderr-Zeile des Routers, nicht als eigenes
   JSON-Feld, und wird vom Modell selbst als Klartext wiederholt. Reicht
   ein Text-Pattern auf `stderr`, oder ist das zu brüchig für eine
   Sicherheitsklassifikation (Vergleich: `permission_denials` bei Claude
   Code, F-061-Muster)?
3. **Sandbox-/Approval-Konfiguration für lesende Rollen real festlegen**
   (nicht mehr offen lassen wie in der alten Fassung) — mit welchen Flags
   liest Codex CLI tatsächlich, ohne Schreibzugriff zu bekommen? Das ist
   jetzt lösbar, weil der Spike das Symptom (Default blockiert auch Lesen)
   real belegt hat, aber die Lösung noch nicht geprüft ist.
4. Migrationspfad für `LAUFAKTE_V0`: additiv, aber was passiert mit
   bestehenden Laufakten ohne `worker`-Feld beim Lesen? (Default
   `"claude-code"`, oder Pflichtfeld ab Schema-Version?)
5. Wie wird „lesend" technisch erzwungen, nicht nur behauptet? Verbotsliste
   als Textvergleich gegen Argv — robust genug, oder zusätzlich eine
   Sandbox-Flag-Prüfung VOR dem Prozessstart (Muster: Invocation Policy,
   `src/invocation-policy/`)?
6. `modell_beobachtet` für Codex: `null`/nicht ermittelbar lassen (additiv,
   ehrlich) oder aus der Startvorlage deklariert übernehmen (dann als
   `modell_deklariert` statt `_beobachtet` benennen, um die Wortbedeutung
   nicht zu verwässern) — Empfehlung mit Verwerfungsbedingung.
7. Workstream-Schnitt: wo die Grenze für einen ersten, klein
   verifizierbaren Bauauftrag liegt (Fast-Prototyping-Prinzip) — begründen,
   nicht übernehmen.

**Explizit NICHT Teil dieses Auftrags:** F17 (Router), F18
(Capability-Register), Besetzung über F16 hinaus, alles was `claude/153`
Abschnitt 4 als `STOP`/„später" markiert (Provider-Adapter, automatische
Modellwahl, Kosten als Kriterium).

## 4. Format der Rückgabe

Wie `claude/155`: „Belegte Entwurfszwänge" (mit Beleglage-Tags),
„Zuständigkeitsschnitt" (Tabelle Ort/Verantwortung), „Vertrag"
(Ein-/Ausgabe der neuen Funktionen), „Entscheidungen" (`[EMPFEHLUNG]` mit
Verwerfungsbedingung), „Workstream-Schnitt", „Nächster Schritt".

Kein Bauauftrag an Claude Code aus dieser Sitzung — das entscheidet die
Technical-Challenger-Sitzung nach Gegenprüfung.
