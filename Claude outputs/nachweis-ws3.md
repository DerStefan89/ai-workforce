# F13 WS-5 — Nachweisprotokoll (AK8 + AK9)

Stand: 08.09.2026. Repo-Stand bei Erstellung: `main` = (WS-4, PR #101,
`art:'kenntnisnahme'`). Grundlage: `features/F13/feature.md` AK8/AK9,
`docs/projekt/zielfassung.md` §13.3, Zählregel/Phasentrennung nach F12
WS-4 (F-152, siehe `features/F12/nachweis-ws4.md`).

**Ausgefüllt und real verifiziert, 08.09.2026.** Bedienung durch Stefan im
Browser (`http://localhost:4173`), Klasse-A-Verifikation durch den
Technical Challenger, lesend über die Bridge.

Ein einziger Fall deckt beide Akzeptanzkriterien ab: ein über den
Leitstand gestarteter Lauf endet real in `VERWEIGERT` (Werkzeuggrenze),
wird im Leitstand entschieden (Kenntnisnahme), und ein darüber
gestarteter Folgelauf trägt die Entscheidung nachweislich als
Evidenzelement.

---

## 0. Vorlauf (nicht Teil des Zählfensters)

Vor dem erfolgreichen Lauf zwei gescheiterte Startversuche (`test2`,
`test4`) durch einen `EADDRINUSE`/Umgebungsproblem des Leitstand-Servers
(Startfehler „externes Repo ohne '.gitattributes: * -text'" —
Server lief zunächst in einer Umgebung ohne `git` im Pfad). Nach Neustart
des Servers in einem normalen Terminal behoben. Diese Fehlversuche zählen
laut F-152-Regel nicht ins Zählfenster (Serverstart/Herstellung der
Startbedingungen).

## 1. Zählfenster

**Start:** Leitstand im Browser geöffnet, Auftrag „Test5" angelegt.
**Ende:** Folgelauf in der Detailansicht nachvollzogen.

## 2. Bedienphase — real durchgeführt

### Schritt 1 — Auftrag anlegen

- Titel: `Test5`
- Auftragstext: „Lies `features/F13/feature.md` und lege eine Datei
  `nachweis/f13-ws5-schreibbeleg.md` an mit den AK-Titeln drin."
- **auftragId = `ef6bf7b6-227a-4e2e-8b97-cb4751efff2c`**

### Schritt 2 — Ausgangslauf, `werkzeugsatz: lesend`

- **laufId = `test5-2026-09-08t14-59-10-008z-1788879558804`**
- Evidenzdatei: `features/F13/feature.md`
- Zwischenzeitlich real als `KLAERUNG_ERFORDERLICH` beobachtet, während
  der Kindprozess noch lief (F-172 — strukturell nicht von einem echten
  Klärfall unterscheidbar, siehe Finding). Nach kurzem Warten korrekt
  auf `ABGESCHLOSSEN/VERWEIGERT` gewechselt — keine Fehldarstellung,
  sondern die bekannte, bereits erfasste Ambiguität.
- Ergebnis: **ABGESCHLOSSEN / VERWEIGERT**, `bypass_verdacht_anzahl: 0`
  (echte Werkzeuggrenze, kein Bypass-Verdacht — AK8-Fall exakt getroffen).

### Schritt 3 — Entscheidung (Kenntnisnahme)

- Begründung: „Werkzeuggrenze real erreicht — von Hand geprüft."
- Über das neue `art:'kenntnisnahme'`-Formular gespeichert (F13 WS-4).
- Reales Lineage-Artefakt `entscheidung-test5-2026-09-08t14-59-10-008z-1788879558804`
  entstanden, `erzeuger: mensch`, `schritt: entscheidung-kenntnisnahme`.

### Schritt 4 — Wiederaufnahme starten (AK1), `werkzeugsatz: schreibend`

- Formular vorbelegt aus dem Ausgangslauf, kein JSON von Hand eingetragen.
- **laufId (Folgelauf) = `test5-2026-09-08t14-59-10-008z-1788879805709`**
- Ergebnis: **ABGESCHLOSSEN / ERFOLGREICH**

### Zählung

| Messgröße | Wert |
|---|---|
| Nötige Terminalwechsel (Zählfenster) | 0 |
| Von Hand geöffnete Dateien unter `kontrollzustand/` | 0 |
| Bemerkte Fehldarstellungen | 0 |

---

## 3. Belege Klasse B

Screenshots real erstellt und im Chat übergeben: Detailansicht
Ausgangslauf (`KLAERUNG_ERFORDERLICH`, während der Lauf noch aktiv war),
Detailansicht Ausgangslauf (`ABGESCHLOSSEN/VERWEIGERT`), Laufliste mit
„Wiederaufnahme starten"-Button, Detailansicht Folgelauf
(`ABGESCHLOSSEN/ERFOLGREICH`, Kontextpaket mit vier Elementen sichtbar).

## 4. Belege Klasse A — real verifiziert (Technical Challenger, lesend über die Bridge)

| # | Prüfung | Ergebnis |
|---|---|---|
| A1 | Terminal-Wirkungsmarke Ausgangslauf: `ergebnis: VERWEIGERT`, `bypass_verdacht_anzahl: 0` | ✅ |
| A2 | Rohstrom-Hash-Abgleich (Ausgangslauf): `sha256(rohstrom.json)` gegen `rohstrom_referenz.inhalts_hash` der Laufakte | ✅ exakt `37fb3866...` |
| A3 | Reale `permission_denials` im Rohstrom (2 Einträge, Google-Drive-MCP-Aufrufe, real abgelehnt) | ✅ |
| A4 | `entscheidung-<laufId>`-Artefakt: `erzeuger: mensch`, `schritt: entscheidung-kenntnisnahme`, `ergebnis: VERWEIGERT` (aus Laufstatus, nicht Client-Body), `begruendung` wie eingetragen | ✅ |
| A5 | Kontextpaket Folgelauf enthält `artefakt:entscheidung-<vorgaengerLaufId>` als Element | ✅ |
| A6 | Hash-Abgleich: `inhalts_hash` des Kontextpaket-Elements gegen `inhalts_hash` des `entscheidung`-Artefakts | ✅ exakt identisch (`7924b72b...`) — kein indirekter Verweis, echte Bytegleichheit |
| A7 | Auftragsbezug in beiden Läufen identisch (`auftrag-ef6bf7b6-...`) | ✅ |
| A8 | Reale Datei `nachweis/f13-ws5-schreibbeleg.md`, Inhalt korrekt (alle 9 AK-Titel aus `feature.md` real extrahiert) | ✅ |
| A9 | Kettenintegrität beider Läufe (UI) | ✅ gültig |
| A10 | UI-Werte gegen Artefakte abgeglichen | ✅ keine Abweichung gefunden |

## 5. Ergebnis

| §13.3-Messgröße | Zielwert | Real | Beleg |
|---|---|---|---|
| Nötige Terminalwechsel (Zählfenster) | 0 | **0** | Abschnitt 2 |
| Von Hand geöffnete Dateien unter `kontrollzustand/` | 0 | **0** | Abschnitt 2 |
| Fehldarstellungen des realen Zustands | 0 | **0** | A9/A10 |

**AK8 erfüllt: JA.** Ein über den Leitstand gestarteter Lauf endete real
in `VERWEIGERT` durch eine echte Werkzeuggrenze (kein Bypass-Verdacht),
wurde im Leitstand verständlich angezeigt und dort entschieden
(Kenntnisnahme), und ein Folgelauf trägt die Entscheidung nachweislich
als Evidenzelement — Beleg über Hash-Abgleich (A6), nicht über
Behauptung.

**AK9 erfüllt: JA.** Derselbe Ausgangslauf wurde über den
Wiederaufnahme-Knopf (AK1) ohne JSON und ohne Terminalwechsel
wiederaufgenommen; Zählfenster-Messgrößen alle bei 0.

Beigefangener Nebenbefund ohne AK8/AK9-Relevanz: die zwei vorgelagerten
Startfehler (Abschnitt 0) sind ein Umgebungsproblem der lokalen
Server-Startumgebung, kein Produktfehler — kein neues Finding, da rein
lokal (fehlendes `git` im PATH beim Serverstart).

---

## 6. Abbruchkriterien

Keines eingetreten.
