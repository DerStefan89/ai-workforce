# F10 — Leitstand-Schreibpfad

## ID

F10

## Titel

Leitstand-Schreibpfad

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`. Ein fehlendes `Status:`-Feld oder ein Wert
außerhalb dieser Menge gilt als Fehler.

## Ziel

Der Leitstand löst reale Läufe des Execution Controllers (F8) aus, ohne
eigene Wahrheit und ohne versteckte Übergänge (`docs/projekt/
zielfassung.md` §16.2). Umsetzungsplan Deliverable 4 (`docs/projekt/
umsetzungsplan-fassung-1.md`) und ADR-0003 (Execution Controller) bilden
den Rahmen; der bislang wegwerfbare, vertragsfreie Leitstand-Prototyp
(`scripts/leitstand-server.mjs`, `public/leitstand/`, siehe F9-Akte
Dependencies) bekommt mit dieser Akte für den Schreibpfad erstmals einen
Vertrag.

Zwei bereits getroffene Entscheidungen (Stefan, 04.09.2026):

- **D-F10-1:** Umsetzungsplan Zeile 81 („nächsten Schritt starten")
  bleibt UNVERÄNDERT. „Nächster Schritt" bedeutet ausschließlich die
  Wiederaufnahme eines Laufs in `KLAERUNG_ERFORDERLICH` oder
  `ABGESCHLOSSEN`/`FEHLGESCHLAGEN` über F8s `vorgaengerLaufId` (AK7,
  WS-2b) — allein aus dem persistierten Zustand ableitbar, kein A4-
  Automat, der selbst einen nächsten Schritt vorschlägt oder auswählt
  (E-192/F-090 bleiben davon unberührt).
- **D-F10-2:** Der Schreibpfad bekommt diese Feature-Akte und ein
  eigenes Gate (`scripts/check-f10-leitstand.mjs`, AK10). Der bestehende
  Leseteil bleibt vertragsfrei und wegwerfbar, wie in der F9-Akte
  dokumentiert — diese Akte baut ihn nicht formal nach.

## Scope

- Reales Minimalprofil unter `profiles/` (AK1).
- Startendpunkt `POST /api/laeufe` (AK2).
- Server-seitige Sperre gegen `AusfuehrungsOptionen`-Felder und
  unbekannte Body-Felder im Startauftrag (AK3).
- Loopback-Bindung des Leitstand-Servers (AK4, löst F-120).
- laufId-Eindeutigkeit mit synchroner Reservierung vor dem
  `fuehreAufgabeDurch`-Aufruf (AK5).
- Pflicht-`.catch()` um den Fire-and-forget-Aufruf, flüchtige
  In-Memory-Projektion `GET /api/startfehler` (AK6).
- Wiederaufnahme-Button für Läufe in `KLAERUNG_ERFORDERLICH` oder
  `ABGESCHLOSSEN`/`FEHLGESCHLAGEN`, erzeugt neuen Startauftrag mit neuer
  laufId und `vorgaengerLaufId` (AK7).
- Echter `LaufStatus` aus F1Bs `stelleLaufstatusFest` in der
  `/api/laeufe`-Projektion (AK8).
- Periodisches Neuladen von `/api/laeufe` in der UI (AK9).
- Gate `scripts/check-f10-leitstand.mjs`, eingehängt in `npm run check`,
  das AK3, AK4, AK5 und AK6 mechanisch prüft (AK10).

## Nicht-Ziele

- Jede Form von „nächster Schritt wird vorgeschlagen" jenseits der
  Wiederaufnahme über `vorgaengerLaufId` — A4-Territorium, bereits mit
  E-192/F-090 entschieden (YAGNI).
- Formular-UI für `anfragen`/`aufrufEingaben`/`budget` — der Startauftrag
  kommt als JSON, keine geführte Eingabemaske.
- Eigener Zustand im Leitstand-Server; eigener direkter Schreibzugriff
  des Servers nach `kontrollzustand/` — nur mittelbar über die
  Controller-Kette (F8 → F4/F5/F6a/F7/F1B) erlaubt, nie direkt.
- Mehrbenutzer-Zugriffskontrolle, Sitzungen, Anmeldung.

## Akzeptanzkriterien

1. **AK1 Reales Profil.** Unter `profiles/` existiert mindestens ein
   reales Minimalprofil, das gegen `schemas/profile.schema.json`
   validiert. Eine `ProfilReferenz{pfad,hash,version}` zeigt real darauf;
   der Hash wird gegen den Dateiinhalt geprüft, nicht behauptet.
2. **AK2 Startendpunkt.** `POST /api/laeufe` nimmt einen Startauftrag
   entgegen: `laufId`, `profilReferenz` und die sieben Felder von
   `AusfuehrungsEingaben` (plus optional `vorgaengerLaufId`). Antwort 202
   mit der angenommenen `laufId`. Kein `:laufId`-Pfadsegment — vor dem
   Start existiert die Ressource nicht.
3. **AK3 Options-Sperre.** `AusfuehrungsOptionen` wird nicht aus dem
   Body gelesen. Enthält der Body eines der Felder `schreiber`,
   `basisVerzeichnis`, `rohBasisVerzeichnis`, `starter`, `settingsPfad`,
   `aktuelleAutorisierungPfad`, `startfreigabeRepoWurzel`, wird der
   Auftrag mit 400 ABGELEHNT — nicht still ignoriert. Ebenso jedes
   unbekannte Feld.
4. **AK4 Loopback-Bindung.** Der Server bindet ausschließlich auf
   `127.0.0.1` (F-120).
5. **AK5 laufId-Eindeutigkeit.** Ablehnung mit 409, wenn die `laufId`
   (a) bereits ein Verzeichnis unter `kontrollzustand/` hat oder (b) in
   dieser Serverinstanz bereits angenommen wurde. Reservierung SYNCHRON
   VOR dem `fuehreAufgabeDurch`-Aufruf — der Dateisystem-Check allein
   genügt nicht, weil bis zur ersten `run_prepared` (nach F5 und F4)
   Sekunden vergehen. Nachweis: zwei unmittelbar aufeinanderfolgende
   POSTs mit derselben `laufId` erzeugen genau EINE `run_prepared`.
6. **AK6 Kein Prozesstod durch einen Lauf.** Der Fire-and-forget-Aufruf
   hat ein Pflicht-`.catch()`. Ein Wurf aus `fuehreAufgabeDurch` beendet
   den Server nicht; der Fehlschlag geht nach `stderr` und in eine
   FLÜCHTIGE In-Memory-Liste unter `GET /api/startfehler` — ausdrücklich
   als vergängliche Projektion dokumentiert, kein Zustand, keine Datei
   unter `kontrollzustand/`. Nachweis über eine werfende Attrappe.
7. **AK7 Wiederaufnahme-Bedienung.** Läufe mit
   `LaufStatus.status === 'KLAERUNG_ERFORDERLICH'` oder `ABGESCHLOSSEN`
   mit `ergebnis` `'FEHLGESCHLAGEN'` bekommen einen Button
   „Wiederaufnahme starten". Er erzeugt einen Startauftrag mit NEUER
   `laufId` und `vorgaengerLaufId = laufId` der Zeile. Nie dieselbe
   `laufId` (AC5/AC6, `resumeZiel`).
8. **AK8 Echter LaufStatus in der Projektion.** `/api/laeufe` liefert
   je Lauf zusätzlich das Ergebnis von F1Bs `stelleLaufstatusFest` — aus
   der echten Funktion, keine zweite selbstgebaute Ableitung.
   Voraussetzung für AK7.
9. **AK9 Fortschritt sichtbar.** Die UI aktualisiert `/api/laeufe`
   periodisch. (`public/leitstand/app.js:71` ruft `laden()` aktuell genau
   einmal — Polling existiert NICHT, ist neuer Scope.)
10. **AK10 Gate.** `scripts/check-f10-leitstand.mjs`, eingehängt in
    `npm run check`, prüft AK3, AK4, AK5 und AK6 mechanisch.

## Zuordnung

Meilenstein 1, Deliverable 4 — Mensch-Schnittstelle
(`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2), Feature #10
„Leitstand". Löst mit dem Schreibpfad zugleich ADR-0003 (Execution
Controller) für den einzigen bisher fehlenden Auslösepfad realer Läufe.

## Dependencies

- Hard: F8 (`fuehreAufgabeDurch`, Execution Controller) — Läufe werden
  über F8 ausgelöst, nicht durch eine eigene Orchestrierung dieser Akte.
- Hard: F1 (`ladeGueltigeCheckpoints`, `stelleLaufstatusFest`) — AK8
  liest den Laufstatus ausschließlich über diese Funktion.
- Hard: F2 (`pruefeStale`) — mittelbar über die von F8 aufgerufene Kette.
- Hard: F4 (Invocation Policy) — mittelbar über F6a, prüft den
  tatsächlichen Werkzeugstart.
- Blockierend: **F-119 muss vor WS-1 geschlossen sein** —
  `werkzeugStartziel[1..n]` passiert weder den E-188-Gültigkeitsschlüssel
  noch die E-182-Parameterprüfung; mit einem HTTP-Einstiegspunkt wird
  ungeprüftes argv aus einem Request sonst zum Prozessargument.

## Workstream-Liste

- **WS-0** — F-119 schließen (`slice(1)` durch `pruefeAufrufparameter`
  führen). Blockiert F10 WS-1, nicht F8.
- **WS-1** — AK1, AK2, AK3, AK4, AK5, AK6, AK8, AK10 (Startendpunkt,
  Sperren, Eindeutigkeit, Fehlerpfad, echter Laufstatus, Gate).
- **WS-2** — AK7, AK9 (Wiederaufnahme-Bedienung, Polling). Baut auf der
  in WS-1 gelieferten echten Laufstatus-Projektion (AK8) auf.

Reihenfolge zwingend WS-0 → WS-1 → WS-2.

## Entscheidungs-Referenzen

- `docs/projekt/umsetzungsplan-fassung-1.md` Zeile 81 — „nächsten
  Schritt starten", D-F10-1 legt die Auslegung für diese Akte fest.
- `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2, Deliverable 4.
- `docs/adr/` ADR-0003 (Execution Controller) — Zielrahmen des
  Schreibpfads.
- **E-192/F-090** — kein A4-Automat; AK7 bleibt Wiederaufnahme aus dem
  persistierten Zustand, kein Vorschlagsmechanismus.
- `features/F9/feature.md` Dependencies — dokumentiert den bisherigen
  wegwerfbaren, vertragsfreien Status von `scripts/leitstand-server.mjs`
  und `public/leitstand/`, den diese Akte für den Schreibpfad beendet.
- `state/findings.md` **F-119** — Blocker für WS-1.
- `state/findings.md` **F-120** — löst AK4 (Loopback-Bindung).

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
