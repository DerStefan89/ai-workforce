# F8 — Execution Controller

## ID

F8

## Titel

Execution Controller

## Status

Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Ein Auftrag durchläuft die Kette Startfreigabe (F4) → Kontextpaket (F5) →
Werkzeuglauf (F6a/F6b) → Klassifikation (F7) in einem einzigen, von außen
aufrufbaren Ablauf, dessen Zwischenzustände über den Checkpoint Store
(F1B) nachvollziehbar sind — ohne die Regeln der orchestrierten Module
nachzubauen (D5) und ohne selbst einen Werkzeugprozess zu starten.

## Scope

- Neues, eigenständiges Modul `src/execution-controller/`, das F1B, F2,
  F4, F5, F6a, F7 und F9 ausschließlich von außen aufruft.
- Eine Einstiegsfunktion, die einen Lauf vollständig durchführt:
  Kontextpaket bauen (F5), Aufruf konstruieren (F6as `baueAufruf`), Lauf
  starten (F6as `starteGateway` — das Autorisierungsgate liegt dort,
  E-193), Laufakte an F7 übergeben (`klassifiziereLauf`), Terminalzustand
  über `stelleLaufstatusFest` feststellen.
- **Reale Eskalation von E-186:** ist `bypass_verdacht_anzahl > 0` im
  `VERWEIGERT`-Ergebnis von F7, erzeugt der Controller über F9
  (`erfasseBedarf` → `erzeugeTransportpaket` → `haendigeAus`) eine
  Vorlage an den Menschen. Damit bekommt E-186 erstmals den Adressaten,
  den F7 ausdrücklich nicht hatte.
- **Wiederaufnahme im Rahmen der bestehenden Invariante:** ein erneuter
  Anlauf nach `KLAERUNG_ERFORDERLICH` oder `FEHLGESCHLAGEN` erzeugt immer
  eine neue `laufId` und verweist über die Lineage (F2) auf den
  Vorgängerlauf. Kein Fortsetzen einer bestehenden `laufId`.
- Gate-Skript `scripts/check-f8-execution-controller.mjs`, eingehängt in
  `npm run check` und `npm run check:template`.

## Nicht-Ziele

- **Workstream- und Execution-Automat (A4).** Ausdrücklich nicht Teil
  von Fassung 1 (E-192, F-090). Der Controller arbeitet auf `laufId`.
- **Autorisierungs-/Startfreigabeprüfung.** Liegt im Gateway (E-193).
  Der Controller ruft `starteGateway` und wertet dessen Verweigerung
  aus, prüft aber nichts selbst nach.
- **Prozessstart.** F6a bleibt die einzige Komponente, die einen
  Werkzeugprozess startet.
- **Klassifikation.** F7 bleibt die einzige Komponente, die einen
  Terminalausgang bestimmt.
- **Kontextpaket-Regeln, Budget, Rollen-Ausschlussmuster.** Gehören F5.
- **Konsolentext-Deutung in irgendeiner Form** (ARCHITECTURE §7,
  verbotenes Pattern).
- **Automatischer Neustart nach Abbruch** (ARCHITECTURE §4) — jeder
  erneute Anlauf ist eine bewusste, angestoßene Handlung.
- **Leitstand-Bedienung.** `scripts/leitstand-server.mjs` bleibt rein
  lesend; die Stufe-1-Bedienung („nächsten Schritt starten") gehört zu
  Feature #10, nicht hierher.

## Akzeptanzkriterien

1. Ein vollständiger Durchlauf ruft F5, F6a und F7 je genau einmal auf;
   es existiert kein Codepfad, der eine ihrer Prüfungen oder
   Klassifikationsregeln im Controller nachbildet — mechanisch per Grep
   im Gate geprüft (Muster F6a AK12).
2. Verweigert `starteGateway` den Start (Aufrufparameter, Startziel,
   Autorisierung, Ist-Zustand), endet der Durchlauf ohne Prozessstart,
   ohne Klassifikation und mit dem unveränderten Verweigerungsgrund des
   Gateways — kein eigener Grundtext.
3. Der Controller prüft an keiner Stelle selbst Baseline,
   Wirksamkeitsnachweis oder Ist-Zustand (E-193) — mechanisch per Grep
   gegen `pruefeStartfreigabe`, `ermittleIstZustand` und
   `aktuelle-autorisierung` im Controller-Code.
4. Liefert F7 `VERWEIGERT` mit `bypass_verdacht_anzahl > 0`, wird real
   eine F9-Aushändigung erzeugt; bei `bypass_verdacht_anzahl === 0`
   nicht. Beide Fälle sind getestet.
5. Nach einem Durchlauf liefert `stelleLaufstatusFest` für die `laufId`
   den Status `ABGESCHLOSSEN` mit demselben `ergebnis`, das F7
   zurückgegeben hat.
6. Eine E-186-Eskalation läuft unter einer **eigenen** `laufId`; der
   Status des auslösenden Laufs bleibt danach `ABGESCHLOSSEN` und kippt
   nicht auf `KLAERUNG_ERFORDERLICH` — real getestet (F-091).
7. Ein erneuter Anlauf nach `KLAERUNG_ERFORDERLICH` erzeugt eine neue
   `laufId` und einen Lineage-Verweis auf den Vorgängerlauf; es
   existiert kein Codepfad, der eine bestehende `laufId` fortsetzt
   (`resumeZiel`-Invariante, `src/checkpoint-store/index.ts:739`).
8. `npm run check` startet keinen echten Claude-Code-Prozess und braucht
   kein Netz; Tests laufen gegen das einsetzbare Prozessstart-Primitiv
   aus F6a.
9. `npm run check` → Exit 0.

## Zuordnung

Deliverable 3, Feature #8 — Ausführungspfad
(`docs/projekt/umsetzungsplan-fassung-1.md` Zeile 75, Tabellenzeile 8
„Orchestriert 4–7 sowie Checkpoint Store (1)"). Reihenfolge 6a → 7 → 6b
→ 8 — F8 baut zuletzt in dieser Gruppe, weil abhängig von allen anderen.

## Dependencies

- Hard, erfüllt: **F1B** (`schreibeWirkungsmarke`, `stelleLaufstatusFest`),
  **F2** (Lineage), **F5** (`baueKontextpaket`), **F6a/F6b**
  (`baueAufruf`, `starteGateway`), **F7** (`klassifiziereLauf`).
- Hard, erfüllt: **F9** (`erfasseBedarf`, `erzeugeTransportpaket`,
  `haendigeAus`) — Adressat der E-186-Eskalation.
- Weich: **F4** — nur mittelbar über `starteGateway` (E-193), kein
  direkter Vertrag.
- Offene Vorfrage für plan-v1: F-091 (Wirkungsmarken-Kollision bei
  Eskalation) muss vor WS-2 entschieden sein.
- Bekannte, nicht blockierende Erblasten: F-065, F-066, F-067 (Adapter-
  und Paarungsgrenzen), F-074 (Werkzeugversion aus Messung, nie aus
  Dokumentation).

## Workstream-Liste

Vermutlich **zwei** Workstreams — in plan-v1 zu bestätigen oder zu
widerlegen:

- **WS-1 Kette:** Durchlauf F5 → F6a → F7 → `stelleLaufstatusFest`,
  AK1–3, AK5, AK8, AK9.
- **WS-2 Eskalation und erneuter Anlauf:** E-186-Eskalation über F9 mit
  eigener `laufId`, erneuter Anlauf mit Lineage-Verweis, AK4, AK6, AK7.

Begründung des Schnitts: WS-2 hängt an einer offenen Semantikfrage
(F-091) und an F9, WS-1 nicht. WS-1 liefert für sich genommen bereits
die erste real orchestrierte Kette.

## Entscheidungs-Referenzen

- `docs/projekt/zielfassung.md` §9.4 E-192, E-193 (Challenge F8,
  04.09.2026) — Scope-Schnitt (kein A4-Automatenmodell in Fassung 1) und
  Platzierung des Autorisierungsgates (Gateway, nicht Controller).
- `docs/projekt/zielfassung.md` §9.4 E-189 (präzisiert E-193), §16.2
  Zeile 332 (Modultabelle Execution Controller), §16.8 Punkt 6
  (Automaten in Fassung 1 nicht implementiert).
- `state/findings.md` — F-090 (Drei-Ebenen-Zustandsmodell nicht gebaut,
  TECH_DEBT P1), F-091 (Wirkungsmarken-Kollision bei Eskalation),
  F-067/F-065/F-066 (bekannte, nicht blockierende Erblasten).
- `src/checkpoint-store/index.ts:739` — `resumeZiel`-Invariante: kein
  automatischer Neustart derselben `laufId` (AC5/AC6, §16.6).
- `src/human-transport/index.ts:147` (`haendigeAus`) — Ursache der in
  F-091 beschriebenen Wirkungsmarken-Kollision.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den Skill `spec-schreiben`, falls
die Ausführungsrolle das für den Umfang für nötig hält.
