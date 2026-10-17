# Advisor-Pass: Plan v1 F45 B2b-3b-2b-2b-1 „Rückfrage-Kanal: Vorbereitung echter Nachweislauf“

Stand 17.10.2026. Geprüft: `features/F45/plan-b2b3b2b2b1.md` gegen den Code auf Branch `f45/b2b3b2b2b1-nachweis-vorbereitung` (Basis main
nach #359), ARCHITECTURE §1–§4, `state/findings.md`. Subagent `architecture-advisor`, frischer Kontext. Abgelegt durch den Autor (der
Advisor hat kein Schreibrecht), Inhalt unverändert, gekürzt um Formatierung.

**Rollengrenze:** nur Read/Grep/Glob — `tsc`, `node --test`, Gates, `wc`, PowerShell nicht ausführbar; Laufzeitaussagen (CLI, PowerShell,
Windows-Quoting) als [Schlussfolgerung]/[offene Unsicherheit]; Server-Zeilenzahl nicht nachgezählt.

Marker: [Fakt] im Code belegt · [Schlussfolgerung] abgeleitet · [Annahme] unbelegte Prämisse · [offene Unsicherheit].

## Urteil: **Freigegeben mit Hinweisen**
Architektur trägt (Server/Gateway/Controller/Evaluator unberührt, keine Route, Werkzeug nur lesend, Lesepfade stimmen, P1–P9 fachlich
richtig). V1–V5 als Plan v2. Kein neuer Advisor-Pass, sofern O1 nach V3 entfällt; mit O1 + Parser zu groß (Schnitt 2b-1a | 2b-1b).

## Vor dem Bau zu klären
**V1 – Projekt und Startfreigabe.** [Fakt] `haushaltsbuch` hat im Werkzeugsatz `schreibend` kein Bash (`haushaltsbuch/startvorlagen/
haushaltsbuch.json:37-43`), der Lauf nimmt den Werkzeugsatz der Instanz (`leitstand-server.mjs:3061`) ⇒ (a)/(b) unmöglich.
`haushaltsbuch2` hat Bash-Regeln (`:55-61`). Beide deklarieren `2.1.258 (Claude Code)`, die Workforce `2.1.300`; das Band „CLI-Version
geändert“ gilt nur für das Startprojekt (`leitstand-server.mjs:665-670`); jedes Projekt hat eigene Startfreigabe (`projekt-pfade.mjs:26-27`).
Abhilfe: Projekt namentlich (`haushaltsbuch2`), Schritt 0 als Block `claude --version` gegen `werkzeugVersionDeklariert` der
Projekt-Startvorlage, bei Abweichung zuerst Startfreigabe des Projekts erneuern; Werkzeugsatz mit Bash als Vorbedingung.

**V2 – O5: zwei Läufe.** [Fakt] `gleicheAblehnungenAb` bricht bei der ersten nicht passenden Ablehnung ab; (c) ⇒ `nicht_von_stefan`
(`protokoll.ts:248-261`) ⇒ der Pfad ERFOLGREICH mit `abgelehnt_durch_stefan` (`result-evaluator/index.ts:390-391`) — Kernaussage §4 —
liefe nie. Abhilfe: Lauf A (a) erlauben, (b) ablehnen, (d) Frage ⇒ ERFOLGREICH, `abgelehnt_durch_stefan = 1`, Löschliste ausgesetzt;
Lauf B nur (c) ⇒ VERWEIGERT `nicht_von_stefan`, F-760-Sichtung. Für Lauf A im Ergebnis „Ablehnung nennen und weitermachen“ ([offene
Unsicherheit] Modellverhalten „- [x] Blockiert“).

**V3 – O1 weglassen (Empfehlung).** [Fakt] mcp-config nirgends gespeichert (Rohstrom `claude-code-gateway/index.ts:1224-1236`, Laufakte
`:1245-1267`), JSON im Argv (`:844-846`), Prompt über stdin. [Schlussfolgerung] Fast alles aus P8 ist indirekt belegt:
`--permission-prompt-tool` ⇐ Rechte-Einträge im Protokoll; url+Token ⇐ P6b (fremdes Token 403 ohne Eintrag,
`rueckfrage-vermittlung.mjs:269`); Server geladen ⇐ P7; `FRAGE_WERKZEUG` in `--allowedTools` ⇐ Frage-Eintrag und kein Rechte-Eintrag mit
`tool_name = mcp__rueckfrage__frage_stefan`; `--strict-mcp-config` ⇐ `init.mcp_servers` nur übergebene. Offen nur `FRIST_MS`/`timeout` —
im Code gesetzt (`src/rueckfrage/index.ts:301-306`) und getestet; ob die CLI sie beachtet, zeigt die Befehlszeile nicht. Empfehlung: P8
durch „Argv indirekt“ ersetzen, Zahlen als „im Code festgelegt, getestet – Wirkung DEKLARIERT“; entfallen Parser, PowerShell-Schritt, O2.
Optional: bei (a) einige Minuten warten (Wirkung über die 90 s des Spikes hinaus). Bleibt O1: M10.

**V4 – fehlende Prüfpunkte.** P10 Startfreigabe mit Kanal-Argv (`run_prepared` nach `pruefeStartfreigabe`, `claude-code-gateway/
index.ts:1094-1116`, + init-Zeile). P11 Pfadgrenze (c): genau ein `auto_deny` zur Write-ID mit Grund „Pfad außerhalb…“
(`src/rueckfrage/index.ts:225-227`), tool_result `is_error`; ohne Eintrag ⇒ nicht belegbar (statisch gesperrt). P12 F-1132 (6) Teil R3
„Speicher = Datei im echten Pfad“: ERFOLGREICH mit `abgelehnt_durch_stefan` oder `rueckfrage_abgleich.art === 'abgleich'`, und keine
`rueckfrage_abweichung` (`result-evaluator/index.ts:387`, `:394-400`); positiver R3-Fall nicht erzeugbar (Grenze). P13 E-B7: alle
Antworten `herkunft: 'browser'`, `nicht_browser = 0`. Fail closed: P2 braucht ≥ 1 Ablehnung, P9 ≥ 1 Eintrag; P7 nicht Zeile 1 (M5).

**V5 – ARCHITECTURE/Findings.** [Fakt] ARCHITECTURE.md:162-163 („bleibt auch bei R3 … mit einem Klick“) wird falsch ⇒ §3 zwei Schritte,
DEKLARIERT als Bedien-Hürde; Satz zum Nachweis-Werkzeug; Nachträge F-1135 (7), F-1126/F-1128/F-1132/F-1133.

## Bauauflagen
- **M1** Stille Schreiber für jeden Lesezugriff (Standard-Schreiber schreiben auf stdout: `checkpoint-store/index.ts:340-342`,
  `lineage-registry/index.ts:55-57`, `:174`, `:177`, `checkpoint-store:759`).
- **M2** Installationswurzel aus `import.meta.url`, für das Gate einstellbar; Rohstrom-Pfad nur genau `kontrollzustand-roh{\|/}<laufId>{\|/}
  rohstrom.json`; Hash vor dem Parsen; Rohstrom liegt unter der Installationswurzel, nicht im Kontrollzustand der Instanz.
- **M3** Workforce-Instanz über „repoWurzel = Installationswurzel“ erkennen (Muster `selbstRepoWurzel`, `leitstand-server.mjs:13116-13118`).
- **M4** `--aus` mit `liegtImArbeitsordner` prüfen (ablehnen bei `ok` oder „nicht prüfbar“); Dateiname je Lauf.
- **M5** P4 über `ermittleToolErgebnisse`, P4b zusätzlich `parent_tool_use_id`; P7 erste `system/init`-Zeile (Spike Z3).
- **M6** O3 = ja: `zaehleProtokollEintraege(eintraege)` exportiert, `zaehlungVon` addiert `anzahlOffen`/`ohneEintrag`; `GRUND_*` bleiben;
  Bestands-Tests unverändert grün.
- **M7** P9 alle sieben Felder; Hinweis nur `automatisch` größer ⇒ Grenze ohne Eintrag, nur `lauf_ende` größer ⇒ Schreibfehler nach Lauf-Ende.
- **M8** Neutralisierung zweimal (Arbeitsordner des Laufs aus `init.cwd`, Installation), innerer/längerer Pfad zuerst; nie rohe
  Befehlszeile, nie absolute Pfade.
- **M9** Exit-Codes für „Lauf fehlt“/„nicht terminal“ festlegen und testen.
- **M10** nur mit O1 (Bindung an Lauf über CreationDate, genau ein Treffer, Kodierung, Parser argv[0], libuv-Quoting, Messung unter Windows).
- **M11** Anleitung: Wortlaut von (a)–(d) bei „Ablauf prüfen“ kontrollieren; harmlose Befehle im Arbeitsordner; Startzeile „noch nicht für
  echte Läufe nutzen“ (`rueckfrage-einschalten.mjs:57`); was tun bei Abweichung/fehlender Karte (F-1133 (1)); (c) kann vor dem Kanal gesperrt
  werden ⇒ P11 nicht belegbar.
- **M12** §1: Dialog schließt bei geändertem Kennzeichen („Stand geändert“, Begründung gerettet, `workflows.js:828`, `:846`, `:801-808`) —
  Planwortlaut korrigieren; `abweichung` im Kennzeichen redundant (bei R3 ist `abgleich` schon `{ art: 'abweichung' }`), harmlos;
  R3-Meldung Schritt 2 `tabindex="-1"`; Knopf Schritt 2 in `.dialog-actions`; „ansehen“ doppelt wirkt einmal; Test „Schritt 2 überlebt Poll
  ohne Lageänderung“; Render-Fixture neuer Workflow auf `lauf-kanal-r3`.
- **M13** Rot-Nachweis ehrlich: (a) echt rot, (b)–(e) auf main „Modul/Doku fehlt“.

## Entlastend
E1 mcp-config nicht gespeichert, Prompt über stdin. E2 Lesepfade (Laufakte, Protokoll, Terminalmarke) im `basisVerzeichnis` der Instanz.
E3 Lesefunktionen schreiben nichts außer stdout (M1). E4 O2 vertretbar, falls O1 bliebe. E5 P1 nutzt dieselbe Hash-Regel wie der Abgleich,
MCP-Skript reicht `input` unverändert durch. E6 P6b ist Ende-zu-Ende-Beleg der url. E7 kein `--resume` in `src` ⇒ F-1128 (4) Teil Resume
„im Produkt nicht erreichbar“. E8 §1 tragfähig (Dialog außerhalb der Poll-Container, einziger Weg zu `bestaetigeSichtung` ist
`data-aktion="sichtung"`, ohne R3 bitgleich, kein Gate prüft das Kennzeichen wörtlich). E9 Ablauf passt (Kanal nur `ausfuehrung` mit
Arbeitsordner, `leitstand-server.mjs:7481`; Write außerhalb geht an das Prompt-Werkzeug). E10 O4 Fast-Lane richtig. E11 Invarianten
unberührt. E12 Gate (d), Rot-Nachweis F-1127.

## Zuschnitt
Ohne Prozesszeilen-Parser knapp tragfähig für einen Baudurchgang + eine Korrekturrunde; mit Parser/M10 zu groß (2b-1a §1 | 2b-1b §2–§4).

## Status
- [x] Freigegeben mit Hinweisen

## Nächster sinnvoller Schritt
Plan v2 mit V1–V5 (O1 entfällt), übrige M als Bauauflagen; Bau ohne neuen Advisor-Pass.
