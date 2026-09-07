# Journal — F12

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-06 — Akte angelegt (Status READY_FOR_TECH)

`features/F12/feature.md` neu angelegt auf Grundlage der F12-Challenge
(06.09.2026, Repo-Stand `650451d`) und der beiden Stefan-Entscheidungen
vom selben Tag:

- **E-M2-3** — der geführte Start (Startformular im Leitstand) gehört
  in F12, nicht in einen Nachzügler-Workstream von F11. F11 bleibt
  abgeschlossen; F12 heißt „Bedienbarer Lauf: Auftrag, Liste, Detail".
- **E-M2-4** — ein Lauf wird seinem Auftrag über eine
  Lineage-Eingabe-Referenz `artefakt:auftrag-<auftragId>` zugeordnet,
  nach dem in F8 WS-2b real verwendeten `vorgaengerLaufId`-Muster. Der
  Auftrag ist ein `AUFTRAG_V0`-Kernartefakt; der Leitstand hält keine
  eigene Zuordnungswahrheit (§16.2). Löst F-134.

Zehn Akzeptanzkriterien (AK1–AK10), vier Workstreams
(WS-1 → WS-2 → WS-3 → WS-4), Blocker gegen den Doku-PR, der Meilenstein
2 um E-M2-3/E-M2-4 erweitert (analog F-129 bei F11). Fünf neue Findings
aus der Challenge ins Register aufgenommen (F-137 bis F-141), F-134 um
einen Nachtrag zur Auflösung durch E-M2-4/AK5 ergänzt.

## 2026-09-07 — WS-2 gebaut (AK4/AK5/AK6), Reviewer-/QA-Pass durchlaufen

`state/plan-v1-f12-ws2.md` umgesetzt, inklusive der Bauauftrags-Korrektur
(auftragId-Existenzprüfung nach D13/laufIdBelegt, nicht davor — F11
WS-2-Prinzip: D13 ist unbedingt) und der zehn Stefan-Entscheidungen zu
den offenen Fragen (Statuscode 201/200, Sortierung neueste-zuerst,
Kopfdaten-only-Liste, keine `art` in der Werkzeugsatz-Antwort, laufId
bleibt manuelles Textfeld mit Vorschlag, rolle/budget/modell serverseitig
fest).

- `scripts/leitstand-server.mjs`: `POST`/`GET /api/auftraege`,
  `GET /api/startvorlage/werkzeugsaetze`; `pruefeStartauftrag` verlangt
  `auftragId` statt `auftragstext` (`VERBOTENE_AUFTRAG_FELDER`).
- `src/execution-controller/`: `AusfuehrungsEingaben.auftragId`
  (Pflichtfeld); `fuehreAufgabeDurch` stellt unbedingt einen
  `artefakt:auftrag-<auftragId>`-Verweis voran (Reihenfolge
  `[auftragRef, vorgaengerRef, …]`).
- `public/leitstand/`: neuer Abschnitt „Auftrag & Start" (Auftrag
  anlegen/wählen, Werkzeugsatz wählen, Evidenzdateien-Zeilenliste,
  laufId-Vorschlag); `#wiederaufnahme` bleibt als gekennzeichneter
  Notweg bestehen.
- Testbrüche aus Plan-Abschnitt 0 (17/18 Aufrufstellen
  `gueltigerStartauftrag` in `check-f10-leitstand.mjs`, ein Grundkörper
  in `check-f11-auftrag.mjs`) sowie ein bei der Umsetzung neu
  entstandener Bruch in `execution-controller.test.ts` (mandatory
  `auftragId`, Prompt-/Index-Verschiebung durch den unbedingt
  vorangestellten auftragRef, ein zu enges `maxElemente`-Testbudget) im
  selben Zug behoben.

Reviewer-Pass (`code-reviewer`, frischer Kontext) fand einen echten
Befund: `registriereAuftrag` in `POST /api/auftraege` lief ohne
try/catch — ein Schreibfehler hätte als unhandled promise rejection den
gesamten Serverprozess beendet (Node 24-Default). Behoben (try/catch,
500 + Logging, Muster des bestehenden JSON-Parse-Guards). QA-Pass fand
eine dokumentationswürdige Entkopplung: das Startformular setzt
`aufrufEingaben.modell` clientseitig fest (`'sonnet'`), unabhängig vom
`modell`-Feld der Startvorlage (das an keiner Stelle serverseitig
gelesen wird — vorbestehende Lücke, nicht WS-2-Scope) — als bewusste
Entscheidung im Code dokumentiert statt stillschweigend verknüpft,
registriert als **F-144** (TECH_DEBT, P3, offen).

Bei einem echten HTTP-Smoke-Test (Server gegen ein Scratch-Verzeichnis,
`erzeugeRequestHandler({basisVerzeichnis: …})`) real entdeckt, NICHT
Teil dieser Änderung, als Blocker für einen künftigen Workstream
vorgemerkt: der Fire-and-Forget-Aufruf
`fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben)` in
`scripts/leitstand-server.mjs` reicht kein `optionen`-Objekt durch —
ein `basisVerzeichnis`-Override des Servers gilt dadurch für alle
synchronen Prüfungen, aber NICHT für den eigentlichen
`fuehreAufgabeDurch`-Lauf, der intern auf den Default `'kontrollzustand'`
zurückfällt. In der echten Produktionskonfiguration unsichtbar (Default
= Default), bestätigt per `git show HEAD:…` bereits vor dieser Änderung
vorhanden (`10a60ef`, F12 WS-1).

`npm run check` und `npm run check:template` je Exit 0 (146/146 Tests).
`state/gates.md`/`docs/STATUS.md` bewusst NICHT in diesem Durchgang
aktualisiert (keine formalen Rot-/Grün-Kalibrierläufe für die neuen
Gate-Ergänzungen erzeugt) — als offener Nachtrag markiert, kein
stillschweigendes Auslassen.

## 2026-09-07 — WS-3 gebaut (AK7/AK8/AK10), K1-Korrektur, F-149 im selben Zug behoben

`state/plan-v1-f12-ws3.md` umgesetzt, mit der verbindlichen Korrektur K1
(Abschnitt 2.1/2.2 des Plans überschrieben) und den acht Q1–Q8-
Entscheidungen aus dem Bauauftrag.

**K1** — der Plan nahm an, `leseErgebnisobjekt(rohstrom.stdout)` liefere
bei `rohstrom.status: 'ok'` immer ein Objekt. Real falsch: die
Bestands-Laufakte `lineage-laufakte-e2e-referenzfeature-2026-09-06`
trägt `beobachtungsbasis_vollstaendig: false`, ihr Rohstrom (leeres
`stdout`) liefert `null`. `rohstrom` bekam deshalb ein eigenes
`ergebnisobjekt`-Unterfeld (`status: 'ok' | 'kein_ergebnisobjekt'`) statt
`permissionDenials.anzahl: 0` fälschlich als „keine Verweigerungen" zu
zeigen, wenn real „unbekannt" gilt.

- `scripts/leitstand-server.mjs`: `GET /api/laeufe/<laufId>` um vier
  Felder erweitert (`kontextpaket`, `auftrag`, `laufakte`, `rohstrom`,
  jedes mit eigenem `status`), neue Funktionen
  `ladeKontextpaketVersion`/`baueKontextpaketProjektion`/
  `baueAuftragsbezug`/`baueLaufakteProjektion`/`baueRohstromProjektion`.
  `baueAuftragsbezug` wird von `sammleLaufKopfdaten` mitgenutzt
  (**F-147 gelöst**) — Request-lokales Memo je `auftragId` in
  `sammleLaeufe` (Q2), kein serverübergreifender Cache. Rohstrom-
  Auflösung ausschließlich über `laufakte.rohstrom_referenz.pfad`, Hash
  zuerst/dann projizieren (D2), `tool_input` nie ausgeliefert, nur
  dedupliziertes `tool_name` (D3/Q7).
- `public/leitstand/index.html`/`app.js`: `#lauf-detail`-Panel außerhalb
  von `#laeufe` (überlebt den 2-Sekunden-Poll), „Details"-Button je
  Laufzeile, `ladeLaufDetail` nur auf Anforderung (nicht Teil von
  `laden()`). `checkpointZeile`/`statusZelle`/`staleZelle` (seit WS-1
  unbenutzt, D6) reaktiviert für die Checkpoint-Kette der Detailansicht.
- `scripts/check-f12-leitstand-ansicht.mjs` (neu, AK10): vier Fälle
  (AK1/AK2 Regressionsschutz, AK5 isolierter Beleg, AK8 Grün-/Rotfall
  gegen einen realen, in einem Temp-`repoWurzel` geschriebenen
  Rohstrom), in `package.json` `check`/`check:template` eingehängt. Alle
  vier Fälle real kalibriert (Rotfall injiziert, Gate fällt mit Exit 1,
  Fund passend, danach zurückgesetzt) — kein reiner Grünlauf-Nachweis.
- **F-149** im selben Zug behoben: `LAUFID_UNZULAESSIGE_ZEICHEN` trug das
  Intervall U+0000–U+001F als rohe Kontrollbytes statt als Escape,
  wodurch `grep` die Datei als Binärdatei einstufte. Auf `[U+0000-U+001F]`
  (Escape-Schreibweise) umgestellt, real verifiziert:
  `grep -n "pathname" scripts/leitstand-server.mjs` liefert seither echte
  Zeilentreffer.
- **F-148** neu erfasst (Q8): der Detailendpunkt prüft `istLaufkette`
  nicht — bewusst nicht in WS-3 behoben (nicht im AK7/AK8-Wortlaut, über
  die UI nicht erreichbar, D5-Konflikt bei einer sauberen Behebung).

Auflage aus Befund 9 eingehalten: kein Gate-Fall startet einen
erfolgreichen Lauf über `POST /api/laeufe` — alle Fixtures bauen direkt
über `schreibeWirkungsmarke`/`registriereKernArtefakt`/
`registriereAuftrag`.

Realer Beleg für K1 gegen den echten `kontrollzustand/`
(`e2e-referenzfeature-2026-09-06`, dieselbe Maschine, `kontrollzustand-
roh/` noch vorhanden): `auftrag: {"status":"kein_auftragsbezug"}`,
`laufakte: {"status":"ok", ..., "beobachtungsbasisVollstaendig":false}`,
`rohstrom: {"status":"ok", "exitCode":1, ..., "ergebnisobjekt":
{"status":"kein_ergebnisobjekt"}}` — deckungsgleich mit der im
Bauauftrag erwarteten Ausprägung.

Während der eigenen Kalibrierung ein reales Umgebungsproblem gefunden
und im neuen Gate-Skript behoben (kein Produktcode-Fund, reines
Testinfrastruktur-Detail): `process.exit(0/1)` löste auf diesem
Windows-Rechner nach mehreren Server-open/close-Zyklen reproduzierbar
einen libuv-Assertionsabsturz aus (`UV_HANDLE_CLOSING`,
`src/win/async.c`) — `scripts/check-f12-leitstand-ansicht.mjs` setzt
stattdessen `process.exitCode` und lässt Node natürlich beenden, Vertrag
(0 sauber, 1 Befund) unverändert.

`npm run check` → Exit 0 (146/146 Tests, alle Gates inkl. des neuen).
UI-Smoke-Test nur über echte HTTP-Requests gegen den laufenden Server
und den ausgelieferten HTML/JS-Quelltext geprüft (curl) — **kein
Browser-Test durchgeführt**, dieser Sitzung stand kein
Browser-Automatisierungswerkzeug zur Verfügung. Offener Nachtrag für
AK9/WS-4 oder eine manuelle Prüfung durch Stefan.

**F-150 nachgetragen** (Korrektur eines Auftragsfehlers): der vorige
Bauauftrag nannte die ID ohne Volltext — auf Rückfrage inzwischen mit
vollständigem Text nachgeliefert und ins Register aufgenommen (verwaiste
Remote-Branches, ein aus einem Challenger-Fehler entstandener
Duplikat-Branch `docs/f12-ws3-tech-plan`). **F-151** (neu, Selbstbefund
des Challenger-Chats): `git status`/`git branch` erneut über die
Remote-Devices-Bridge ausgeführt trotz F-100 und der dokumentierten
Bridge-Regel — `.git/index.lock` blieb stehen, manuell entfernt.
