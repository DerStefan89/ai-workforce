# F13 — Entscheiden und Wiederaufnehmen im Leitstand

## ID

F13

## Titel

Entscheiden und Wiederaufnehmen im Leitstand

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Stefan entscheidet bei Rückfragen und Fehlschlägen im Leitstand und nimmt
kontrolliert wieder auf — ohne JSON, ohne Terminal, ohne eine Datei unter
`kontrollzustand/` von Hand zu öffnen (§13.3 Zielsatz und Messgrößen).

F12 hat den geführten Start gebaut und die Detailansicht ehrlich gemacht.
Zwei Lücken sind real geblieben (Challenge 07.09.2026, Repo-Stand
`47059cc`):

1. Die Wiederaufnahme ist weiterhin ein rohes JSON-Textfeld
   (`public/leitstand/index.html:49–58`). `baueWiederaufnahmeVorlage`
   (`public/leitstand/app.js:174`) belegt nur `laufId` und
   `vorgaengerLaufId` vor und liefert `rolle:''`, `anfragen:[]`,
   `budget:{}`, `aufrufEingaben:{}`, `werkzeugsatz:''`, `auftragId:''` —
   sechs Felder werden von Hand in JSON getippt. Der §13.3-Fall
   „fehlgeschlagener Lauf mit Wiederaufnahme" ist damit real nicht ohne
   JSON bedienbar (F-157).
2. Es gibt keinen einzigen Schreibpfad für eine menschliche Entscheidung.
   `scripts/leitstand-server.mjs` kennt genau zwei POSTs
   (`/api/auftraege`, `/api/laeufe`). Der Zielsatz „entscheidet bei
   Rückfragen und Fehlschlägen im Leitstand" hat heute keinen Endpunkt
   (F-158).

Alle benötigten Kernverben existieren bereits und sind getestet:
`importiereAntwort` und `entscheideStale` (F9), `haltFestStaleEntscheidung`
(F2), `schreibeWirkungsmarke(art:'terminal')` (F1B — von
`stelleLaufstatusFest` selbst als `aufloesungsbedingung` benannt). F13 baut
deshalb **keinen neuen Kernmechanismus**, sondern Bedienung darüber.

Entschieden (Stefan, 07.09.2026):

- **E-M2-6** — die echte Rückfrage ist ein Klärzyklus zwischen zwei
  Läufen, nicht eine Frage im laufenden Prozess. Das Gateway bleibt
  One-Shot.

## Scope

- Geführte Wiederaufnahme statt Roh-JSON, vorbelegt aus dem
  Vorgängerlauf (AK1).
- Klärzustand verständlich und unverfälscht sichtbar (AK2).
- Ein Entscheidungs-Schreibpfad über ausschließlich bestehende
  Kernverben (AK3, AK4).
- Die Entscheidung wirkt nachweislich im Folgelauf (AK5).
- Gate und realer Nachweis (AK7, AK8, AK9).

## Nicht-Ziele

- **Kein interaktiver Gateway-Modus.** Kein offener stdin, keine
  Session-ID, kein `--resume`/`--continue` (E-M2-6). Der Kindprozess
  bleibt One-Shot.
- **Kein neuer Checkpoint-Typ, kein neues Schema, kein neuer
  Terminalzustand.** Jede Entscheidung wird über ein vorhandenes Verb
  festgehalten (D5).
- **Keine Zustandsautomaten.** Die Ansicht zeigt Zustand, sie leitet
  keinen ab (E-192/F-090 bleiben offen und unberührt).
- **Keine automatische Wiederaufnahme.** Welcher Lauf startet, wählt
  ausschließlich der Mensch (Orchestrierungs-Grundsatz Stufe 1, D2).
- **Keine dynamische Rollen-, Modell- oder Werkzeugwahl** im
  Wiederaufnahme-Formular (§13.3-Nicht-Ziel; feste Client-Werte wie in
  F12).
- **Kein Timeout- und Abbruchpfad** — das ist F14.
- **Keine Findings-Ansicht, keine History-Ansicht, keine Analytics**
  (§13.3-Nicht-Ziele).

## Akzeptanzkriterien

1. **AK1 Wiederaufnahme ohne JSON.** Der Wiederaufnahme-Knopf öffnet
   dasselbe geführte Startformular wie ein Neustart, vorbelegt aus dem
   Vorgängerlauf: `auftragId`, `werkzeugsatz` und die Evidenz-Anfragen aus
   dessen Kontextpaket-Projektion (`GET /api/laeufe/<laufId>`).
   `vorgaengerLaufId` ist fest gesetzt und nicht editierbar, `laufId` ein
   überschreibbarer Vorschlagswert. Das rohe JSON-Textfeld ist nicht mehr
   der Normalweg. `darfWiederaufnehmen` bietet die Wiederaufnahme
   zusätzlich bei `ABGESCHLOSSEN/VERWEIGERT` an — der heute häufigste
   reale Klärfall hat keinen Knopf.
2. **AK2 Klärzustand unverfälscht sichtbar.** Bei
   `KLAERUNG_ERFORDERLICH` zeigt die Detailansicht `blockerId`, `grund`,
   `aufloesungsbedingung`, `resumeZiel` und die offenen
   `run_prepared`-Sequenzen genau so, wie `stelleLaufstatusFest` sie
   liefert — unverändert übernommen, nicht neu formuliert, kein
   abgeleiteter Zustand. Bei `VERWEIGERT` zusätzlich
   `bypass_verdacht_anzahl`, `is_error` und `non_execution_kind` aus der
   Laufakte.
3. **AK3 Entscheidungs-Schreibpfad über bestehende Verben.** Ein
   POST-Endpunkt nimmt genau drei Entscheidungsarten entgegen und ruft
   ausschließlich vorhandene Kernfunktionen:
   (a) Antwort auf eine E-186-Eskalation → F9 `importiereAntwort`;
   (b) STALE-Entscheidung → F9 `entscheideStale`;
   (c) Auflösung von `KLAERUNG_ERFORDERLICH` → F1B
   `schreibeWirkungsmarke(art:'terminal')`, exakt der von
   `stelleLaufstatusFest` benannte Weg.
   Kein neuer Speicher, keine eigene Datei, keine Zweitvalidierung des
   Payloads (D5). Unbekannte Entscheidungsart → 400, bevor irgendetwas
   geschrieben wird.
4. **AK4 Entscheidung ist menschlich bezeugt.** Jede über AK3
   geschriebene Entscheidung trägt `erzeuger: 'mensch'` und einen im
   Leitstand eingegebenen Entscheidungstext. Es existiert kein Codepfad,
   der eine Entscheidung ohne HTTP-Request aus der Oberfläche erzeugt
   (P2/E-177, Gate-Grep gegen die Produktionsdateien).
5. **AK5 Die Entscheidung wirkt im Folgelauf.** Eine über AK3
   festgehaltene Antwort geht als Evidenzelement in den Folgelauf: die
   Anfragenliste bekommt einen `notwendig: true`-Verweis auf das
   Entscheidungs-/Transportartefakt, nach demselben Muster wie
   `vorgaengerLaufId` (F8 WS-2b) und `auftragId` (F12 WS-2). Nie über den
   Auftragstext, nie am Kontextpaket vorbei (F-124).
6. **AK6 D13 unberührt.** Der Entscheidungs-POST ist kein Laufstart und
   wird von der D13-Sperre nicht blockiert; der Start des Folgelaufs
   bleibt ihr unterworfen. Genau ein aktiver Arbeitsstrang bleibt
   durchgesetzt.
7. **AK7 Gate.** `scripts/check-f13-entscheiden.mjs`, eingehängt in
   `npm run check` und `npm run check:template`. Prüft mindestens: AK3
   ruft keine selbstgebaute Schreibfunktion, AK4s Grep-Bedingung, AK5s
   Anfragen-Voranstellung.
8. **AK8 Realer Rückfragefall.** Mindestens ein realer, über den
   Leitstand gestarteter Lauf endet in einem Klärzustand
   (`VERWEIGERT` durch Werkzeuggrenze ist der geplante, zuverlässig
   provozierbare Fall — **nicht** die E-186-Eskalation, die
   `bypass_verdacht_anzahl > 0` und damit einen Bypass-Versuch des
   Modells voraussetzt, `src/result-evaluator/index.ts:115–122`), wird im
   Leitstand verständlich angezeigt, dort entschieden, und ein Folgelauf
   trägt die Entscheidung nachweislich als Evidenzelement. Beleg über
   Rohereignisstrom und Kontrollzustand, nicht über die Behauptung des
   Kindprozesses.
9. **AK9 Realer Fehlschlag mit Wiederaufnahme.** Mindestens ein real
   fehlgeschlagener Lauf wird über AK1 ohne JSON und ohne Terminalwechsel
   wiederaufgenommen. Messgrößen nach der in F12 WS-4 festgelegten
   Phasentrennung zwischen Bedien- und Verifikationsphase (F-152):
   Terminalwechsel im Zählfenster = 0, von Hand geöffnete Dateien unter
   `kontrollzustand/` = 0, Fehldarstellungen = 0. Protokoll in
   `features/F13/nachweis-ws3.md`.

## Zuordnung

Meilenstein 2 (§13.3), Deliverable „Bedienbarer Leitstand". Drittes von
vier M2-Features (F11 → F12 → **F13** → F14).

## Dependencies

- **hard: F12** (abgeschlossen) — Startformular, Detailendpunkt
  `GET /api/laeufe/<laufId>`, Kontextpaket- und Laufakte-Projektion sind
  die Vorbelegungsquelle für AK1 und die Anzeigequelle für AK2.
- **hard: F11** (abgeschlossen) — Startpfad, D13-Sperre,
  Werkzeugsatz-Auflösung über die Startvorlage.
- **hard: F9** (abgeschlossen) — `importiereAntwort`, `entscheideStale`,
  Transportpaket-Kette für AK3 (a) und (b).
- **hard: F1B** (abgeschlossen) — `stelleLaufstatusFest`,
  `schreibeWirkungsmarke` für AK2 und AK3 (c).
- **hard: F8** (abgeschlossen) — `fuehreAufgabeDurch`, Anfragen-Voranstellung
  für AK5.
- **soft: F-153** — die einzige Startvorlage ist
  `startvorlagen/beispielprojekt.json`. Für AK8/AK9 ausreichend; erst für
  die Dogfooding-Phase am realen Projekt ein Blocker.
- **kein** Bezug zu F14 (Timeout/Abbruch) — bewusst getrennt.

## Workstream-Liste

Randnotiz (F-165, nachträglich, keine rückwirkende Umnummerierung): AK5 kam
real nicht über WS-2 (PR #99), sondern über einen eigenen, als „WS-3"
betitelten PR (#100, Commit `c7fc435`) — WS-2 deckte real nur AK3/AK4/AK6/AK7
ab. Die Liste unten bleibt trotzdem in der ursprünglich geplanten Zuordnung
stehen, der reale Verlauf ist hier dokumentiert.

- **WS-1** — AK1, AK2: geführte Wiederaufnahme statt Roh-JSON,
  Klärzustand unverfälscht sichtbar. Server-Projektion plus UI, kein
  Eingriff in `src/`.
- **WS-2** — AK3, AK4, AK5, AK6, AK7: Entscheidungs-Schreibpfad,
  menschliche Bezeugung, Wirkung im Folgelauf, Gate. Einziger Workstream
  mit Kerneingriff (F8s Anfragenkonstruktion, AK5).
- **WS-3** — AK8, AK9: der reale Nachweis über die Oberfläche.
- **WS-4** (Nachtrag, branch `feat/f13-ws4-entscheidbarkeit`) — der in AK8
  geplante Klärfall (VERWEIGERT durch Werkzeuggrenze) war mit dem WS-1/WS-2/
  WS-3-Bau real nicht entscheidbar: art:'terminal' wurde nur bei
  KLAERUNG_ERFORDERLICH angeboten (praktisch unerreichbar), art:'antwort'
  bei VERWEIGERT ohne Bypass lief garantiert in ein 400 (F-166). Vierte
  Entscheidungsart `kenntnisnahme` (kein neues Schema, keine zweite
  Wirkungsmarke, D5) plus eine bisher fehlende Vorbedingungsprüfung für
  art:'terminal' (F-167). Kein Eingriff in AK8/AK9 selbst — deren realer
  Nachweis bleibt WS-3 zugeordnet, WS-4 macht ihn erst durchführbar.

Reihenfolge zwingend WS-1 → WS-2 → WS-3 → WS-4.

## Entscheidungs-Referenzen

- **E-M2-6** (Stefan, 07.09.2026) — echte Rückfrage = Klärzyklus zwischen
  zwei Läufen; Gateway bleibt One-Shot.
- **E-M2-2** — ein Auftrag hält N Läufe ohne Automat; welcher Lauf als
  Nächstes startet, wählt der Mensch. AK1 und AK5 bleiben daran gebunden.
- **E-186** — die Eskalation bleibt der Weg für Bypass-Verdacht, ist aber
  wegen `bypass_verdacht_anzahl > 0` kein planbarer Nachweisfall (AK8).
- **E-192 / F-090** — keine Zustandsautomaten; AK2 zeigt Zustand, leitet
  keinen ab.
- **D2** — kein automatischer Neustart; jede Wiederaufnahme ist ein
  bewusst gestarteter Lauf mit eigener `lauf_id` (AC6).
- **D5** — kein zweiter, selbstgebauter Regelsatz: AK3 ruft ausschließlich
  bestehende Kernverben.
- **D13** — genau ein aktiver Arbeitsstrang; AK6 hält die Sperre für
  Läufe, nicht für Entscheidungen.
- **P2 / E-177** — Entscheidungen entstehen ausschließlich aus direkter
  menschlicher Eingabe (AK4).
- **F-124** — der Evidenzteil des Prompts bleibt an F5s akzeptierte
  Elemente gebunden; AK5 ändert daran nichts.
- **F-152, F-157, F-158, F-159** — die real belegten Befunde;
  AK1/AK3/AK8/AK9 lösen sie.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill, falls WS-2
ihn braucht.
