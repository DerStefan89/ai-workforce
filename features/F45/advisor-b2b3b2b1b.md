# Advisor-Pass: Plan v1 F45 B2b-3b-2b-1b „R1: Stefan-Ablehnung nur mit eindeutigem Ablehnungstext“

Geprüfter Plan: `features/F45/plan-b2b3b2b1b.md` (17.10.2026). Subagent `architecture-advisor`, frischer Kontext, nur Read/Grep/Glob
(kein Gate-/Testlauf, kein Rot-Nachweis per git archive — Rot/Grün aus dem Quelltext abgeleitet; keine echte CLI, nur der belegte
Deny-Rohstrom; Schreibbarkeit eines fremden Prozess-stdout unter Windows ungeprüft). Inhalt sinngemäß vollständig übernommen.

Gelesene Quellen: Plan, `advisor-b2b3b2b1.md`, `plan-b2b3b2b1a-v2.md`, `nachweise/b2b3a/spike.md` + `rohstrom-deny.ndjson`,
`scripts/leitstand/rueckfrage-vermittlung.mjs`, `rueckfrage-mcp.mjs:100-180`, `rueckfrage-protokoll.mjs`, `src/rueckfrage/protokoll.ts`,
`src/result-evaluator/index.ts`, `src/execution-controller/index.ts:100-660`, `src/claude-code-gateway/index.ts:300-640, 1040-1260`,
`types.ts:120`, `scripts/leitstand-server.mjs:3280-3505, 6795-6904`, Gates 2b-1a, b2b3b1b, b2b3b2a, b2b3b1, f14, f7 (a), datenformate,
Tests `protokoll.test.ts`, `execution-controller.test.ts:1650-1705`, `rueckfrage-vermittlung.test.mjs:305-329`, Schema/Beispiele,
ARCHITECTURE §3/§4, F-1128.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit].

## Befunde
- **B1 (mitlaufend) O1-Ergebnis richtig, Begründung falsch.** [Fakt] `warte` liefert die Entscheidung samt `message` an jeden
  Token-Inhaber (`rueckfrage-vermittlung.mjs:274-277`) — wer B selbst stellt und ablehnt, kennt den Text. Was trägt: das tool_result zu
  B schreibt allein die CLI, mit festem Präfix („Permission to use … has been denied.“ / „PreToolUse:… hook error: …“, `spike.md:60-65`).
  Der Zufallsteil bindet jede Entscheidung an ihren Eintrag (bleibt). [Annahme] kein Projekt-Hook gibt modellbestimmten Text ohne Präfix
  zurück. §4-Begründung umstellen.
- **B2 (mitlaufend, Grenze dokumentieren)** Ein lokaler Prozess, der in die stdout-Pipe der CLI schreiben kann, kann eine eigene
  `result`-Zeile einschieben (`ergebnisZeileBeendet`, `claude-code-gateway/index.ts:1158`) — umgeht die ganze Klassifikation, liegt im
  Rahmen „keine Sicherheitsgrenze gegen selbst ausgeführten Code“ (ARCHITECTURE:138-140). O2 („jedes tool_result“) fängt die schwächere
  Form (zusätzliche tool_result-Zeile). [offene Unsicherheit] Windows. §4: R1 hebt die Hürde von „zwei HTTP-Aufrufen“ auf „Eingriff in
  den Prozess-stdout“.
- **B3 (mitlaufend)** R1 schließt nur das „Waschen“ statischer bzw. nicht über den Kanal gelaufener Ablehnungen; eine echte Rückfrage,
  die ein lokaler Prozess vor Stefan ablehnt, zählt weiter (DEKLARIERT, §3/§4). Wortlaut §4 und F-1128 entsprechend begrenzen.
- **B4 (entlastend)** O4 richtig und schon auf main sicher: doppelte ID ⇒ zweiter Eintrag `auto_deny` ⇒ `anzahl !== 1` ⇒
  `nicht_nur_stefan` (`vermittlung:238-241`, `protokoll.ts:196-208`).
- **B5 (entlastend, Wortlautfehler)** Hash in `VERGLEICHS_FELDER` hält gegen eine Datei mit dem Hash des statischen Texts; Spread nur an
  `stefan_abgelehnt` verträglich. „Text steht nirgends dauerhaft“ falsch — er steht in `rohstrom.json`. O3 (nur Hash) einverstanden.
- **B6 (entlastend)** Prüfung im Evaluator richtig: `inhalts_hash` aus dem Speicherinhalt (`gateway:1231`), Laufakte aus dem Speicher
  (`controller:620-623`), Tausch ⇒ `rohstrom_integritaet` (`evaluator:279`). Keine Option, Argv unverändert. `ermittleToolErgebnisse`
  neben `ermittleHintergrundAufrufe` mit `parseObjekt`/`leseToolResultBloecke`; exakter Vergleich, keine Textdeutung (§4:151, f7 (a)).
- **B7 (mitlaufend)** Pflicht-`ablehnung_hash` macht Fixtures ohne Hash ungültig ⇒ bestehende Rotfälle scheitern am Validator statt an
  ihrer Regel (zufällig grün): `protokoll.test.ts:21-23` (Rotfälle 40-64, 91-116), Gate b2b3b1b `eintrag()` `:110`. r1t-Negativfälle
  gegen main ebenso aussagelos (unbekanntes Feld). Gegenmittel: Standard-Fixtures mit gültigem Hash + passender tool_result-Zeile; jeder
  Negativfall mit Positivkontrolle im selben Fall.
- **B8 (mitlaufend, größtes Korrekturrisiko)** Nachziehliste konkret: Gate 2b-1a (g); (r3) Fälschung t3 ohne Hash (`:328`) ⇒
  „Version ungültig“ statt „Länge abweichend“ (`:358`); Gegenprobe alter Pfad (`:370-373`). Gate b2b3b2a `alterPfad`/`gleich`/`nurStefan`
  (`:150, 350`). Gate b2b3b1b (e1) `:116-119`, (p3) `:355-365` (Text aus `antwort.message` `:329`). `execution-controller.test.ts:1668-1699`.
  `result-evaluator.test.ts:1119ff`, `rueckfrage-vermittlung.test.mjs:318-321` (vier Schlüssel), `rueckfrage-protokoll.test.mjs:31`.
  Entlastend: Gate b2b3b1 (g2) prüft nur `/abgelehnt/`; `check-datenformate` kennt die Rückfrage-Beispiele nicht (nur b1b (p2)).
  Hinweis: Text über `v.warte(laufId, id)` direkt nach `beantworte` (`vermittlung:277`).
- **B9 (mitlaufend)** Fehlender/undefined 4. Parameter: wirft nie, gilt als „kein tool_result“ ⇒ `nicht_nur_stefan`. `ergebnisse` nur bei
  `rueckfragen` ≠ undefined/null bauen.
- **B10 (entlastend + Zusatzprüfungen)** r1d machbar: F4 vergleicht `arbeitsverzeichnis_pfad` mit `process.cwd()` (`gateway:1068`);
  Server setzt `settingsPfad` auf den Arbeitsordner (`server:6818`) — Hülle ersetzt; Starter async (`types.ts:120`); kein Init-Gate ohne
  Ort-B; `ermittleRueckfrageProtokoll` vor `beendeLauf`. O5: ja, „echter Controller“ (deckt alten B5). Zusatzprüfungen: kein Startfehler
  „nicht bestätigt“ für den Lauf; beide Einträge `stefan_abgelehnt` mit Hash; Hash A passt zu tool_result A; Attrappe sieht
  `--permission-prompt-tool` in den Tokens; optional A über das echte MCP-Skript.
- **B11** Rot gegen main: r1d echt rot (ERFOLGREICH/2); r1e Gegenprobe beidseitig ERFOLGREICH; r1t rot nur über fehlenden Export und
  „gefälschter Hash“ (main vergleicht das Feld nicht).
- **B12 (mitlaufend)** O2 „jedes“ einverstanden. O6: Empfehlung nur String-Form (Array zählt nicht) — spart Code und Testfall; Preis:
  Formatwechsel der CLI ⇒ keine Stefan-Ablehnung zählt (sicher, sichtbar); Stefan/Challenger entscheidet. [offene Unsicherheit]
  wörtliche Übernahme nur mit ASCII belegt ⇒ Text ASCII halten; Subagent-Zeilen weiter offen (Prüfpflicht 2b-2).
- **B13 (entlastend)** Kein Eingriff in Server/Routen/MCP; Löschlisten-Sperre zählt über `beendeLauf` auch gewaschene (sichere Richtung);
  Wachstumsbremse trivial grün.

## Zuschnitt — passt (knapp)
Kern klein; Risiko in der Nachziehliste (4 Gates, 6 Testdateien). Mit B7/B8 ein Baudurchgang + eine Korrekturrunde realistisch.

## Urteil
**Freigegeben mit Hinweisen.** Vor dem Bau einarbeiten: B1–B3 (Wortlaut §4/F-1128), B7, B8, B9, Zusatzprüfungen B10. O6 entscheiden.
Delta-Advisor nur, wenn sich bei O6 oder B2 der Ansatz ändert.
