# Plan v2 — F45 B2b-3b-2b-2b-1 „Rückfrage-Kanal: Vorbereitung echter Nachweislauf“

Stand 17.10.2026. Nach Advisor-Pass `features/F45/advisor-b2b3b2b2b1.md` („Freigegeben mit Hinweisen“). Plan v1 (`plan-b2b3b2b2b1.md`) bleibt
stehen; hier nur die Änderungen. Kein neuer Advisor-Pass (O1 entfällt, Advisor: dann nicht nötig).

## Entscheidungen zu den offenen Punkten
- **O1 entfällt (V3):** keine Prozesszeile, kein Parser, kein PowerShell-Schritt dafür, damit auch kein Token in einer Datei (O2). P8 wird
  „Argv indirekt“ (unten). `FRIST_MS`/`timeout` stehen im Bericht als „im Code festgelegt (`ergaenzeRueckfrageAufruf`), getestet — Wirkung
  in der CLI DEKLARIERT“; optional wartet Stefan bei (a) einige Minuten (Wirkung über die 90 s des Spikes hinaus, Wartezeit im Protokoll).
- **O3 = ja (M6):** `zaehleProtokollEintraege(eintraege)` in `rueckfrage-vermittlung.mjs`, `zaehlungVon` nutzt sie.
- **O4 = Fast-Lane** (E10).
- **O5 = zwei Läufe (V2):** Lauf A (a) erlauben, (b) ablehnen, (d) Frage ⇒ Soll ERFOLGREICH, `abgelehnt_durch_stefan = 1`, Löschliste
  ausgesetzt; Lauf B nur (c) ⇒ Soll VERWEIGERT, `rueckfrage_abgleich.grund = nicht_von_stefan`, F-760-Sichtung (ohne R3 ein Klick).

## V1 Projekt
Anleitung für `haushaltsbuch2` (Werkzeugsatz `schreibend` mit Bash). Schritt 0: Block vergleicht `claude --version` mit
`werkzeugVersionDeklariert` der Projekt-Startvorlage; bei Abweichung zuerst die Startfreigabe des Projekts nach
`docs/harness/startfreigabe-erneuern.md` erneuern (heute 2.1.258 gegen 2.1.300 ⇒ nötig). Bash im Werkzeugsatz als Vorbedingung.

## Prüfpunkte (ersetzt §2 der Liste in v1)
Je Punkt erfüllt / nicht erfüllt / nicht belegbar mit Fundstelle; ohne Mindestbasis immer „nicht belegbar“ (fail closed).
- **P1 F-1128 (4) Eingabe** — Basis: ≥ 1 Ablehnung mit Protokolleintrag gleicher ID.
- **P2 F-1128 (4) doppelte IDs** — Basis: Ergebnisobjekt mit ≥ 1 Ablehnung.
- **P3 F-1128 (4) `--resume`** — immer „nicht belegbar: im Produkt nicht erreichbar (kein --resume in src)“, dazu Zahl der init-Zeilen
  und `session_id` (mehr als eine init-Zeile ⇒ nicht erfüllt).
- **P4 O6 Ablehnungstext** (über `ermittleToolErgebnisse`) — Basis: ≥ 1 `stefan_abgelehnt` mit ID. **P4b** Subagent-Zeilen
  (`parent_tool_use_id`) — ohne solche Zeile nicht belegbar.
- **P5 F-1126 (6) unbekannte Bash-Felder** — Basis: ≥ 1 Bash-Anfrage, die an Stefan ging.
- **P6 F-1132 (2) API-Basis** — indirekt: ≥ 1 Protokolleintrag im Kontrollzustand dieser Instanz; dazu im Bericht der erwartete url-Pfad
  (`/api` bei repoWurzel = Installation, M3, sonst `/api/projekte/<id>`).
- **P7 F-1132 (9) init** — erste `system/init`-Zeile: `rueckfrage` `connected`, `FRAGE_WERKZEUG` in `tools`, `RECHTE_WERKZEUG` nicht.
- **P8 Argv indirekt** — `--permission-prompt-tool` (≥ 1 Rechte-Eintrag), `FRAGE_WERKZEUG` erlaubt (Frage-Eintrag und kein Rechte-Eintrag
  mit diesem tool_name), `--strict-mcp-config` (`init.mcp_servers` ohne fremde Server außer Katalog-MCPs des Laufs — gemeldet als Liste).
  Basis: Rohstrom mit init-Zeile und Protokoll.
- **P9 F-1132 (6) Zählung Ende zu Ende** — alle sieben Felder, Basis ≥ 1 Protokolleintrag; Hinweise nach M7.
- **P10 F-1132 (9) Startfreigabe mit Kanal-Argv** — `run_prepared` in der Kette und init-Zeile im Rohstrom.
- **P11 Pfadgrenze (c)** — je Write/Edit-Ablehnung genau ein `auto_deny` mit Grund „Pfad …“ und tool_result `is_error`; ohne Eintrag
  nicht belegbar (statisch gesperrt).
- **P12 F-1132 (6) R3 im echten Pfad** — ERFOLGREICH mit `abgelehnt_durch_stefan` oder `rueckfrage_abgleich.art === 'abgleich'`, ohne
  `rueckfrage_abweichung`; Grenze: positiver R3-Fall im echten Lauf nicht erzeugbar.
- **P13 E-B7 Herkunft** — Basis ≥ 1 Antwort; erfüllt ⇔ alle `herkunft: 'browser'` und `nicht_browser = 0`.
- Kopf: Projekt, Lauf, Status/Ergebnis, Abgleich, Abweichung, `abgelehnt_durch_stefan`, Rohstrom-Hash, Protokoll zusammensetzbar,
  `FRIST_MS`/`timeout` laut Code (DEKLARIERT).

## Werkzeug (Ergänzungen zu v1 §2)
- Aufruf `--lauf <laufId> [--projekt <id>] [--aus <md>]` (kein `--prozesszeile`). Installationswurzel aus `import.meta.url` (M2), im Kern
  per Parameter (Gate).
- M1 stille Schreiber; M2 Rohstrom nur `kontrollzustand-roh{/|\}<laufId>{/|\}rohstrom.json`, Hash vor dem Parsen; M4 `--aus` per
  `liegtImArbeitsordner` gegen Kontrollzustand und `kontrollzustand-roh` (ok oder „nicht prüfbar“ ⇒ ablehnen); M8 Neutralisierung
  zweimal (Arbeitsordner aus `init.cwd`, dann Installation, Temp, Home).
- M9: Lauf ohne Laufakte/Kette ⇒ Exit 1 mit Grund; Lauf nicht terminal ⇒ Bericht, Terminal-Punkte nicht belegbar, Exit 0.
- Exit 0 bei Bericht (auch mit „nicht erfüllt“), Exit 1 bei Aufruf-/Lesefehler.

## §1 Korrekturen (M12)
- Kommt R3 nach dem Öffnen dazu, ändert sich das Kennzeichen über `abgleich` ⇒ der Dialog schließt („Stand geändert“, Begründung
  gerettet) — kein Neuaufbau. `abweichung` kommt trotzdem ins Kennzeichen (harmlos, belegt die Absicht).
- R3-Meldung in Schritt 2 mit `tabindex="-1"` (Fokus), Knopf in `.dialog-actions`, „ansehen“ doppelt wirkt einmal (Knopf entfernt).
- Test: Schritt 2 bleibt ohne Lageänderung (Dialog-Inhalt nur in `oeffneDialog`), Render-Fixture eigener Workflow auf `lauf-kanal-r3`.

## Gate (ändert v1)
(b) Fixture ohne Prozesszeile; je P ein Rot-Fall, wo sinnvoll (P1, P2, P4, P5, P7, P9, P11, P13), Mindestbasis-Fälle (leer ⇒ nicht
belegbar), Rohstrom-Hash falsch. (d) Token entfällt aus der Ausgabe-Prüfung, stattdessen: keine absoluten Pfade (Fixture-Temp, Home) in der
Ausgabe. M13 im Nachweis.

## Doku (V5)
ARCHITECTURE §3 (Sichtung zwei Schritte statt „ein Klick“, DEKLARIERT; Satz Nachweis-Werkzeug), §4 Satz zur Voraussetzung F-1128 (4)
„wird mit dem Nachweislauf belegt“; `docs/projekt/fixpaket-f45.md` 2b-2b geteilt (2b-2b-1 / Lauf / 2b-2b-2); Findings-Nachträge F-1126,
F-1128, F-1132, F-1133, F-1135; Nachweis `features/F45/nachweise/b2b3b2b2b1/nachweis.md`.

## Status
- [x] Freigegeben mit Hinweisen (Advisor)

## Nächster sinnvoller Schritt
Bauen; danach code-reviewer, qa, design-guardian (§1).

## Nachtrag Bau (17.10.2026) — Abweichungen und Korrekturrunde
- Rauchprobe gegen einen Bestandslauf ohne Kanal: P10 stand fälschlich auf „erfüllt“ ⇒ P10 verlangt jetzt den Server `rueckfrage` in der
  init-Zeile (sonst „nicht belegbar“).
- `SCHREIB_WERKZEUGE` ist in `src/rueckfrage/index.ts` exportiert (eine Quelle für P11, code-reviewer 12) — nur `export`, keine Logik.
- Korrekturrunde nach code-reviewer, qa, design-guardian (alle „Freigegeben mit Hinweisen“): P8 `--strict-mcp-config` nur mit Server-Liste,
  die `rueckfrage` enthält (fail closed); P11 nur „Pfad außerhalb“; P1 nennt Ablehnungen ohne Protokolleintrag; Kopf mit CLI-Version und
  „Lauf nicht abgeschlossen“ (+ Warnung auf stderr); alle Fehler mit Grund und Exit 1; `<`/`>` im Markdown als Entität; Tests für nicht
  terminal, zwei Sitzungen, P4b negativ, kaputtes Protokoll, Pfad-Schreibweisen; Gate mit voller Soll-Tabelle für Lauf B, nicht-terminalem
  Lauf, unbekanntem Projekt, `--aus` im Rohstrom-Ordner und auf einem Ordner. Sichtung: Hinweis vor dem Pflichtfeld und in
  `aria-describedby`, Schritt 2 als benannte Gruppe, Überschrift ohne Nummer, Hinweis aus Schritt 1 in Schritt 2 entfernt, Maske im Dialog
  rot hervorgehoben (CSS-Selektor, keine neue Farbe); **Kanal-Stand nicht ladbar ⇒ Bestätigung gesperrt** (qa 7, sonst wäre die
  zweistufige Hürde 30 s lang mit einem Klick umgehbar). Anleitung: auf der Ablaufseite bleiben bis der Lauf läuft, unerwartete Karte
  ablehnen, nicht neu starten, höchstens 5 min warten, FEHLGESCHLAGEN-Fall, keine Katalog-Empfehlung, Sichtung in Lauf B nur ansehen,
  Variable am Ende entfernen; Startfreigabe-Anleitung §8 mit `$BELEG`-Ausdruck und den zwei Grenzen (alte Freigabe, Projekt statt
  Workforce).
- **V1 korrigiert (Entscheidung offen):** Plan v2 sagte „bei Abweichung zuerst die Startfreigabe des Projekts erneuern“. Der Weg dafür ist
  für Projekte nicht beschrieben (`startfreigabe-erneuern.md` gilt der Workforce-Installation). Die Anleitung hält in Schritt 0 an; Stefan
  entscheidet: Projekt-Startfreigabe erneuern (Weg zuerst beschreiben) oder bewusst mit abweichender Version fahren (F-1136 (1)).
- Nicht wie geplant: „Begründung gerettet“, wenn R3 nach dem Öffnen dazukommt — sie wird verworfen (F-1136 (2)). Restpunkte F-1136.
- **Nachtrag 17.10.2026 — E-F-1136 (1) = B (Stefan):** der Nachweislauf fährt bewusst mit der installierten CLI; die Startfreigabe für
  Projekte kommt in 2b-2b-2. Das Werkzeug meldet CLI-abhängige Punkte (P1, P2, P4, P4b, P5, P7, P8, P10, P11) bei abweichender Version
  „erfüllt mit Abweichung“ (beide Versionen mit Quelle), ohne ermittelbare Version „nicht belegbar“; Schritt 0 der Anleitung hält nicht mehr
  an. Neu offen: soll die Startfreigabe für Projekte bei abweichender CLI sperren (F-1136 (10), 2b-2b-2)?
