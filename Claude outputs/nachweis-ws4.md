# F12 WS-4 — Nachweisprotokoll (AK9)

Stand: 07.09.2026. Repo-Stand bei Erstellung: `main` = `4d8b726`
(letzter Sach-Commit `ecc6802`). Grundlage: `features/F12/feature.md`
AK9, `docs/projekt/zielfassung.md` §13.3.

**Ausgefüllt und real verifiziert, 07.09.2026.** Bedienung durch Stefan
im Browser (`http://localhost:4173`), Klasse-A-Verifikation durch den
Technical Challenger, lesend über die Bridge.

---

## 0. Zählregel (verbindlich für WS-4 und die Dogfooding-Phase)

§13.3 im Wortlaut: „Messgrößen: nötige Terminalwechsel **im Normalfall**
= 0 (Git-Commits zählen nicht, sie bleiben laut D3/§9.1 beim Menschen),
manuell geöffnete Dateien unter `kontrollzustand/` = 0,
Fehldarstellungen des realen Zustands = 0."

**Entschieden (Stefan, 07.09.2026, Option B):** Gezählt wird ein
begrenztes Fenster, nicht die gesamte Sitzung.

**Zählfenster:** ab „Leitstand im Browser geöffnet" bis „beide Läufe in
der Detailansicht nachvollzogen".

**Außerhalb des Fensters (zählt nicht):** Serverstart, Git-Operationen,
Herstellung der §16.4-Startbedingungen.

**Phasentrennung (F-152).** Messgröße 1 und 2 wurden ausschließlich in
der Bedienphase (Abschnitt 2) erhoben. Die Kreuzprüfung gegen die
Artefakte (Abschnitt 4) war ein **getrennter** Verifikationsschritt nach
Schluss des Zählfensters und zählt nicht in Messgröße 2.

---

## 1. Vorbedingungen

| # | Vorbedingung | ok |
|---|---|---|
| V1 | Arbeitsbaum sauber, Branch `nachweis/f12-ws4` | ✅ |
| V2 | `npm run check` grün | angenommen, nicht erneut geprüft in dieser Runde |
| V3 | §16.4 Bedingung 1 (E-183) | ✅ (Läufe sind gestartet) |
| V4 | §16.4 Bedingung 2, Wirksamkeitsnachweis (E-188) | ✅ (Läufe sind gestartet) |
| V5 | `claude.exe` erreichbar, Version `2.1.258` | ✅ (`werkzeug_version_deklariert` in beiden Laufakten bestätigt) |
| V6 | Leitstand läuft, Browser offen | ✅ |

---

## 2. Bedienphase — real durchgeführt

### Schritt 1 — Auftrag anlegen (AK4)

- Titel: `F12 WS-4 Nachweis`
- Auftragstext: Auftrag, aus `features/F12/feature.md` die AK-Liste zu
  ermitteln und — bei schreibendem Werkzeugsatz — unter
  `nachweis/f12-ws4-schreibbeleg.md` neu abzulegen.
- **auftragId = `124628ec-973f-4f4a-8950-b5f146afaed6`**
- ✅ Auftrag erschien ohne Neuladen in „Auftrag wählen".

### Schritt 2 — Lauf A, lesend (AK6)

- Auftrag: derselbe
- Werkzeugsatz: `lesend`
- Evidenzdatei: `features/F12/feature.md`
- laufId (automatisch vergeben, nicht manuell gesetzt):
  `f12-ws-4-nachweis-2026-09-07t15-34-53-63-1788795293720`
- ✅ gestartet, Startfehlerliste leer

Randnotiz: durch Mehrfachklick sind zusätzlich zwei weitere lesende
Läufe (`...354221`, `...906618`) entstanden — real, valide, aber
redundant. Als `F-155` erfasst, kein Blocker.

### Schritt 3 — Lauf A, Detailansicht (AK7, AK8)

| Feld | Angezeigter Wert |
|---|---|
| `laufStatus` / Ergebnis | ABGESCHLOSSEN / ERFOLGREICH |
| Auftragstext | vollständig angezeigt, identisch zum Auftragsartefakt |
| Kontextpaket-Elemente | 2 (Auftragsbezug + `features/F12/feature.md`) |
| Kettenintegrität | gültig |
| Modell | claude-sonnet-5 |
| Beobachtungsbasis vollständig | Ja |
| Exit-Code | 0 |
| Permission Denials | 0 |
| stdout-Länge / stderr-Länge | 2412 / 157 |

### Schritt 4 — Lauf B, schreibend

- Auftrag: derselbe
- Werkzeugsatz: `schreibend`
- Evidenzdatei: `features/F12/feature.md`
- laufId (automatisch vergeben):
  `f12-ws-4-nachweis-2026-09-07t15-34-53-63-1788796466949`
- ✅ gestartet, Startfehlerliste leer

Randnotiz: auch hier ein zusätzlicher, redundanter schreibender Lauf
(`...285614`) durch Mehrfachklick — real, valide, überflüssig.

### Schritt 5 — Lauf B, Detailansicht

| Feld | Angezeigter Wert |
|---|---|
| `laufStatus` / Ergebnis | ABGESCHLOSSEN / ERFOLGREICH |
| Auftragstext | vollständig angezeigt |
| Kontextpaket-Elemente | 1 (nur Auftragsbezug — Evidenzdatei wurde für diesen Lauf nicht separat deklariert, per Werkzeugzugriff trotzdem real gelesen) |
| Kettenintegrität | gültig |
| Modell | claude-sonnet-5 |
| Beobachtungsbasis vollständig | Ja |
| Exit-Code | 0 |
| Permission Denials | 0 |
| stdout-Länge / stderr-Länge | 1956 / 157 |

### Zählung

| Messgröße | Wert |
|---|---|
| Nötige Terminalwechsel (Zählfenster) | 0 |
| Von Hand geöffnete Dateien unter `kontrollzustand/` | 0 |
| Bemerkte Fehldarstellungen | 0 |

---

## 3. Belege Klasse B

Sieben Screenshots real erstellt und im Chat übergeben: Startformular
Auftrag, Startformular Lauf A, Detailansicht Lauf A (mehrfach, wegen
Rückfragen zur Bedienung), Detailansicht Lauf B. Alle Screenshots
zeigen reale, im Browser bediente Zustände — keine curl-Simulation.

## 4. Belege Klasse A — real verifiziert (Technical Challenger, lesend über die Bridge)

| # | Prüfung | Ergebnis |
|---|---|---|
| A1 | Auftragsartefakt trägt `titel`+`auftragstext` | ✅ |
| A2 | Beide Laufketten: gültige Kette, Wirkungsmarke, terminales Artefakt | ✅ |
| A3 | Beide Kontextpakete referenzieren denselben Auftrag | ✅ (E-M2-2/AK5 real bewiesen) |
| A4 | Hash-Abgleich `rohstrom_referenz.inhalts_hash` gegen realen Dateiinhalt | ✅ beide exakt (`bc3f0c40...`, `85b6379f...`) |
| A5 | `exitCode` real aus Rohstrom | ✅ beide `0` |
| A6 | `beobachtungsbasis_vollstaendig` | ✅ beide `true` — „Permission Denials: 0" ist real 0, nicht „unbekannt" |
| A7 | Dateiinhalt `nachweis/f12-ws4-schreibbeleg.md` | ✅ real, korrekt (alle 10 AK richtig extrahiert) |
| A8 | UI-Werte gegen Artefakte abgeglichen | ✅ keine Abweichung gefunden |

## 5. Ergebnis

| §13.3-Messgröße | Zielwert | Real | Beleg |
|---|---|---|---|
| Nötige Terminalwechsel (Zählfenster) | 0 | **0** | Abschnitt 2 |
| Von Hand geöffnete Dateien unter `kontrollzustand/` | 0 | **0** | Abschnitt 2 |
| Fehldarstellungen des realen Zustands | 0 | **0** | A8 |

**AK9 erfüllt: JA.**

Begründung: Ein Auftrag wurde real im Browser angelegt und zwei reale
Läufe (lesend, schreibend) mit echtem Claude-Code-Kindprozess daraus
gestartet, beide aus demselben Auftrag, beide in der neuen
Detailansicht ohne Terminal und ohne manuelles Öffnen von
`kontrollzustand/`-Dateien nachvollzogen. Der Beleg stützt sich auf
Rohereignisstrom (`exitCode`, `permission_denials` über eine reale,
vollständige Beobachtungsbasis) und realen Dateiinhalt
(`nachweis/f12-ws4-schreibbeleg.md`), nicht auf Selbstauskunft des
Kindprozesses. Alle acht Klasse-A-Prüfpunkte bestanden.

Beigefangene Nebenbefunde ohne AK9-Relevanz: `F-154` (Bridge-Regel
erneut verletzt, P1) und `F-155` (Mehrfachklick erzeugt redundante,
aber valide Läufe, P3).

---

## 6. Abbruchkriterien

Keines eingetreten.
