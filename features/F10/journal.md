# Journal — F10

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-06 — F10 abgeschlossen (WS-1 #76, WS-2 #77)

`features/F10/feature.md` Status von `READY_FOR_TECH` auf `ABGESCHLOSSEN`
gezogen — alle zehn Akzeptanzkriterien sind real umgesetzt und getestet:

- WS-1 (PR #76): AK1 (reales Minimalprofil unter `profiles/`), AK2
  (Startendpunkt `POST /api/laeufe`), AK3 (Options-Sperre), AK4
  (Loopback-Bindung, löst F-120), AK5 (laufId-Eindeutigkeit mit
  synchroner Reservierung), AK6 (Pflicht-`.catch()`, flüchtige
  `GET /api/startfehler`-Projektion), AK8 (echter `LaufStatus` aus F1Bs
  `stelleLaufstatusFest` in der `/api/laeufe`-Projektion), AK10 (Gate
  `scripts/check-f10-leitstand.mjs`, eingehängt in `npm run check`).
- WS-2 (PR #77): AK7 (Wiederaufnahme-Bedienung — Button für Läufe in
  `KLAERUNG_ERFORDERLICH` oder `ABGESCHLOSSEN`/`FEHLGESCHLAGEN`, erzeugt
  neuen Startauftrag mit neuer `laufId` und `vorgaengerLaufId`), AK9
  (periodisches Neuladen von `/api/laeufe` und `/api/startfehler` in der
  UI).

`npm run check` grün nach beiden Baudurchgängen. Journal-Datei mit
diesem Abschlusseintrag neu angelegt (bestand bisher nicht, anders als
bei F8/F9) — kein Bauauftrag dieser Akte hatte bislang einen
Journal-Nachtrag verlangt.

Nachtrag `docs/STATUS.md` (Erledigt-Abschnitt) im selben Commit.
