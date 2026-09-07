# F12 — Bedienbarer Lauf: Auftrag, Liste, Detail

## ID

F12

## Titel

Bedienbarer Lauf: Auftrag, Liste, Detail

## Status

Status: READY_FOR_TECH

Gültige Status-Werte (geprüft vom Gate, siehe A3a–e in
`features/AF-F001/feature.md`): `ENTWURF, READY_FOR_TECH,
WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN,
BLOCKIERT, ABGEBROCHEN`.

## Ziel

Stefan legt im Leitstand einen Auftrag an, startet daraus reale Läufe
ohne JSON und ohne Terminal, und sieht je Lauf verständlich, was
hineinging und was herauskam — ohne eine einzige Datei unter
`kontrollzustand/` von Hand zu öffnen (§13.3 Zielsatz und Messgrößen).

F11 hat den Startpfad serverseitig vollständig gebaut und real bewiesen,
aber keine Bedienung dafür geliefert: die einzige Startbedienung in
`public/leitstand/index.html` ist ein Textfeld für rohes Startauftrag-
JSON. F12 schließt diese Lücke und macht zugleich die Projektion ehrlich.

Vier real geprüfte Lücken (Challenge 06.09.2026, Repo-Stand `650451d`):

1. `sammleLaeufe` listet **jedes** Verzeichnis unter `kontrollzustand/`
   als Lauf. Real sind 18 von 28 keine Läufe, sondern F2-Artefaktketten
   (`lineage-*`), angezeigt mit `laufStatus: NICHT_GESTARTET` (F-137).
2. Es gibt kein Startformular; F11s Zielsatz „ohne JSON, ohne Terminal"
   ist real nicht erfüllt (F-138).
3. `grep -rl "auftragstext" kontrollzustand/` → 0 Treffer. Der
   Auftragstext existiert nur flüchtig im Prompt; `registriereAuftrag`
   (`src/auftrag/index.ts`) wird von keinem Produktionspfad aufgerufen,
   und der Startauftrag kennt kein `auftragId` (F-134).
4. Der Rohereignisstrom liegt gitignoriert unter
   `kontrollzustand-roh/<laufId>/rohstrom.json` und ist über keine API
   erreichbar; die Laufakte trägt aber bereits
   `rohstrom_referenz: { pfad, inhalts_hash }` (F-139).

Entschieden (Stefan, 06.09.2026):

- **E-M2-3 Option A:** der geführte Start gehört in F12; F11 bleibt
  abgeschlossen.
- **E-M2-4 Option A:** ein Lauf wird seinem Auftrag über eine
  Lineage-Eingabe-Referenz `artefakt:auftrag-<auftragId>` zugeordnet,
  nach dem realen `vorgaengerLaufId`-Muster aus F8 WS-2b. Kein
  Serverzustand, keine eigene Zuordnungsdatei (§16.2).

## Scope

- Ehrliche Laufliste: nur Laufketten, inhaltsbasiert erkannt (AK1).
- Trennung von Listen- und Detailprojektion, Detail nur auf Anforderung
  (AK2).
- Zeitstempel aus dem Artefakt statt aus der Datei-mtime (AK3).
- Auftrag anlegen über `registriereAuftrag` (AK4).
- Auftrag→Lauf-Zuordnung als Lineage-Eingabe-Referenz, Auftragstext aus
  dem Auftragsartefakt (AK5).
- Startformular: Auftrag anlegen und Lauf starten ohne JSON (AK6).
- Lauf-Detailansicht mit Auftragstext, Kontextpaket, Kette,
  Klassifikation und Rohstrom-Auszug (AK7).
- Sicherer, hashgeprüfter Lesepfad zum Rohereignisstrom (AK8).
- Realer Nachweis über die Oberfläche, mit protokollierten Messgrößen
  (AK9).
- Gate `scripts/check-f12-leitstand-ansicht.mjs`, eingehängt in
  `npm run check` (AK10).

## Nicht-Ziele

- Erzeugung und Rückweg echter Rückfragen sowie Entscheidungen darauf —
  F13. `KLAERUNG_ERFORDERLICH` bedeutet real „RUN_PREPARED ohne
  Terminalartefakt", nicht „das Modell fragt"; der einzige reale
  Rückweg ist heute die E-186-Eskalation bei `VERWEIGERT` mit
  `bypass_verdacht_anzahl > 0`. Was eine „echte Rückfrage" ist, wird in
  F13 entschieden, nicht hier.
- Timeout und Abbruch eines laufenden Laufs — F14, F-127.
- Findings-Ansicht im Produkt, History als eigene Ansicht, Analytics,
  Design-System (§13.3 Nicht-Ziele).
- Mehrprojektverwaltung über das eine reale Profil hinaus; vollständiges
  Rollenmodell (bleibt M3).
- Vorschlag, welcher Lauf als Nächstes zu starten ist — A4-Territorium,
  mit E-192/F-090 entschieden. Der Mensch wählt weiterhin
  (Orchestrierungs-Stufe 1).
- Zustandsautomaten auf Workstream- oder Execution-Ebene.
- Änderung des F6a-Vertrags: `AufrufEingaben.prompt` bleibt unveränderte
  Durchreichung.
- Rückwirkende Bereinigung bestehender `kontrollzustand/`-Verzeichnisse.
  AK1 filtert die Anzeige, es wird nichts gelöscht oder umgeschrieben
  (F1s Kette ist append-only).

## Akzeptanzkriterien

1. **AK1 Nur Läufe in der Laufliste.** `GET /api/laeufe` liefert
   ausschließlich Laufketten. Erkennung inhaltsbasiert: die gültige
   Kette eines Verzeichnisses enthält mindestens eine Wirkungsmarke —
   **nicht** über einen Präfixvergleich auf `lineage-`, der nur eine
   Konvention von F2s `laufId(artefaktId)` ist. Gegen den realen
   Kontrollzustand geprüft: 10 Laufketten, 18 Artefaktketten, keine
   Abweichung zwischen Inhaltsregel und Konvention.
2. **AK2 Liste schlank, Detail auf Anforderung.** `GET /api/laeufe`
   liefert je Lauf nur Kopfdaten (`laufId`, `laufStatus`, Ergebnis,
   Zeitpunkt, Auftragsbezug, Anzahl Checkpoints, Kettenintegrität als
   Ja/Nein). Vollständige Checkpoint-Listen, Lineage-Felder und die
   Live-Staleness-Prüfung wandern in einen eigenen Detailendpunkt
   `GET /api/laeufe/<laufId>`, den nur die Detailansicht aufruft. Der
   periodische Poll trifft ausschließlich die Listenprojektion.
3. **AK3 Zeitstempel aus dem Artefakt.** Angezeigte Zeitpunkte stammen
   aus dem Checkpoint-Inhalt, nicht aus `statSync(pfad).mtime`. Trägt
   ein Eintrag keine eigene Zeit, wird das als solches ausgewiesen und
   nicht durch die Dateizeit ersetzt.
4. **AK4 Auftrag anlegen.** Ein Endpunkt nimmt `titel` und
   `auftragstext` entgegen und registriert darüber einen Auftrag über
   den bestehenden `registriereAuftrag`-Pfad (`src/auftrag/index.ts`,
   F11 AK1) als `AUFTRAG_V0` unter `auftrag-<auftragId>`. Kein neuer
   Speicher, keine eigene Datei, keine Zweitvalidierung des Payloads
   (D5). Aufträge sind über einen Leseendpunkt auflistbar.
5. **AK5 Auftrag→Lauf-Zuordnung.** Der Startauftrag bekommt das
   Pflichtfeld `auftragId`. `fuehreAufgabeDurch` stellt der
   Anfragenliste vor dem `baueKontextpaket`-Aufruf einen Verweis auf
   `artefakt:auftrag-<auftragId>` voran — exakt das Muster, das WS-2b
   für `vorgaengerLaufId` real verwendet (AK7 dort). Existiert der
   Auftrag nicht, wird der Start mit 400 abgelehnt, bevor irgendetwas
   geschrieben wird. Der Auftragstext wird serverseitig über F2s
   `ladeArtefaktVersion` aus dem Auftragsartefakt geladen; ein
   `auftragstext` im Body wird mit 400 abgelehnt, nicht still ignoriert
   (Muster F11 AK5). `AusfuehrungsEingaben.auftragstext` bleibt
   unverändert Pflichtfeld — nur seine Quelle wechselt.
6. **AK6 Start ohne JSON.** Die Oberfläche bietet: einen Auftrag
   anlegen, einen bestehenden Auftrag wählen, einen benannten
   Werkzeugsatz wählen, Evidenzdateien über ihren repo-relativen Pfad
   benennen, starten. Die Werkzeugsatz-Auswahl kommt aus der
   Startvorlage; ausgeliefert werden nur Name, Modus und erlaubte
   Werkzeuge — nie `werkzeugStartziel`, `berechtigungskontext` oder
   `profilReferenz`. Das JSON-Textfeld ist nicht mehr der Normalweg; es
   darf als ausdrücklich gekennzeichneter Notweg bestehen bleiben.
   Serverseitige Ablehnungen (400/409, darunter die D13-Sperre) werden
   im Klartext angezeigt, nicht verschluckt.
7. **AK7 Lauf-Detailansicht.** Für einen gewählten Lauf zeigt der
   Leitstand ohne Öffnen einer Datei: den Auftragstext (aus dem
   Auftragsartefakt), die Elemente des Kontextpakets, die
   Checkpoint-Kette mit Kettenintegrität und Staleness, die
   F7-Klassifikation, und aus dem Rohereignisstrom mindestens
   `exitCode` und `permission_denials`.
8. **AK8 Rohstrom sicher und geprüft gelesen.** Der Rohstrom wird
   ausschließlich über die `rohstrom_referenz` der Laufakte aufgelöst,
   nie über einen aus der URL gebauten Pfad. Die Pfadprüfung nutzt
   F11s `loeseEvidenzPfadAuf` wieder (D5, keine zweite Prüfung). Der
   gelesene Inhalt wird gegen `inhalts_hash` geprüft; weicht er ab oder
   fehlt die Datei, wird das sichtbar als „nicht verfügbar" bzw.
   „Hash weicht ab" gemeldet — nie als leerer oder stillschweigend
   akzeptierter Inhalt.
9. **AK9 Realer Nachweis über die Oberfläche.** Ein Auftrag wird real
   im Browser angelegt und daraus werden zwei reale Läufe mit echtem
   Claude-Code-Kindprozess gestartet — einer lesend, einer schreibend —
   und beide in der Detailansicht nachvollzogen. Belegt über
   Rohereignisstrom (`exitCode`, `permission_denials`) und tatsächlichen
   Dateiinhalt/`git diff`, nie über die Selbstauskunft des
   Kindprozesses. Protokolliert werden die drei §13.3-Messgrößen:
   nötige Terminalwechsel, von Hand geöffnete Dateien unter
   `kontrollzustand/`, festgestellte Fehldarstellungen — Zielwert je 0.
   Keine Attrappe außerhalb des Gates.
10. **AK10 Gate.** `scripts/check-f12-leitstand-ansicht.mjs`, eingehängt
    in `npm run check`, prüft mechanisch: AK1 (Artefaktkette erscheint
    nicht in der Liste), AK2 (Listenantwort enthält keine
    Checkpoint-Vollprojektion), AK5 (Body mit `auftragstext` → 400;
    unbekannte `auftragId` → 400) und AK8 (manipulierter Rohstrom →
    sichtbare Hash-Abweichung, kein stiller Durchlauf).

## Zuordnung

Meilenstein 2, Deliverable „Bedienbarer Leitstand", zweites Feature
(`docs/projekt/zielfassung.md` §13.3,
`docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 1b).

## Dependencies

- Hard: **F11** — Startvorlage, Werkzeugsätze, serverseitiges
  Evidenzlesen, D13-Sperre, `AUFTRAG_V0` und `registriereAuftrag`
  werden benutzt und erweitert, nicht ersetzt.
- Hard: **F10** (`scripts/leitstand-server.mjs`, `public/leitstand/`) —
  Projektion und Startendpunkt werden erweitert; der Server bekommt
  weiterhin keinen eigenen Schreibzugriff auf `kontrollzustand/`.
- Hard: **F2** (`registriereKernArtefakt`, `ladeArtefaktVersion`,
  `listeVersionen`) — Auftragsartefakt und Auftragstext-Ladung.
- Hard: **F1/F1B** (`ladeGueltigeCheckpoints`, `stelleLaufstatusFest`) —
  Kettenintegrität und Laufstatus bleiben die einzige Quelle; keine
  zweite, selbstgebaute Ableitung.
- Hard: **F8** (`fuehreAufgabeDurch`) — AK5 erweitert die
  Anfragenkonstruktion nach dem bestehenden `vorgaengerLaufId`-Muster.
- Hard: **F3** (`leiteRepoRelativenPfadAb`) — mittelbar über F11s
  `loeseEvidenzPfadAuf` für AK8.
- Soft: **F6a/F7** — unverändert. Rohstrom und Klassifikation werden
  gelesen, nicht neu erzeugt.
- Blockierend: **der Doku-PR (Auftrag 1) muss gemergt sein**, bevor WS-1
  beginnt — sonst verweist diese Akte auf Entscheidungen, die
  `docs/projekt/zielfassung.md` §13.3 nicht kennt (Lektion aus F-129).

## Workstream-Liste

- **WS-1** — AK1, AK2, AK3: ehrliche, schlanke Laufliste, eigener
  Detailendpunkt, Zeitstempel aus dem Artefakt. Reine Serverprojektion
  plus minimale UI-Anpassung, kein Eingriff in `src/`.
- **WS-2** — AK4, AK5, AK6: Auftrag anlegen, Auftrag→Lauf-Zuordnung,
  Startformular. Einziger Workstream mit Kerneingriff (F8s
  Anfragenkonstruktion).
- **WS-3** — AK7, AK8, AK10: Detailansicht, sicherer Rohstrom-Lesepfad,
  Gate.
- **WS-4** — AK9: der reale Nachweis über die Oberfläche.

Reihenfolge zwingend WS-1 → WS-2 → WS-3 → WS-4.

## Entscheidungs-Referenzen

- **E-M2-3 / E-M2-4** (Stefan, 06.09.2026) — geführter Start gehört in
  F12; Auftrag→Lauf-Zuordnung als Lineage-Eingabe-Referenz.
- **E-M2-1 / E-M2-2** — Auftragstext als eigenes Feld, nie
  Kontextpaket-Element; ein Auftrag hält N Läufe ohne Automat. AK5
  verdrahtet E-M2-2 erstmals real.
- **F-124** — der Evidenzteil des Prompts bleibt an F5s akzeptierte
  Elemente gebunden; AK5 ändert daran nichts, F11 AK3 schützt es
  mechanisch.
- **§16.2** — der Leitstand ist Projektion, keine eigene Wahrheit;
  deshalb ist die Auftrag→Lauf-Zuordnung ein Lineage-Verweis und kein
  Serverzustand.
- **D5** — kein zweiter, selbstgebauter Regelsatz: Kettenintegrität aus
  F1, Laufstatus aus F1B, Pfadsicherheit aus F11/F3,
  Auftragsvalidierung aus `src/auftrag/`.
- **D13** — genau ein aktiver Arbeitsstrang; die In-Memory-Sperre aus
  F11 AK7 bleibt unverändert, AK6 macht ihre Ablehnung nur sichtbar.
- **E-192 / F-090** — keine Zustandsautomaten; die Detailansicht zeigt
  Zustand, sie leitet keinen ab.
- **F-134** — Lauf→Auftrag-Verweis, zweimal zurückgestellt; von AK5
  gelöst.
- **F-137 bis F-141** — die in der F12-Challenge real belegten Befunde;
  AK1/AK2/AK3/AK6/AK8 lösen sie.
- **E-188 / F-136** — Konfigurationsdrift ist eine reale, wiederkehrende
  Fehlerklasse; deshalb lädt AK5 den Auftragstext aus dem Artefakt statt
  ihn ein zweites Mal im Body zu führen, und AK9 verlangt einen realen
  Lauf statt eines Attrappennachweises.

## Spec-Referenz

Noch keine — `spec.md` entsteht über den bestehenden Skill
`spec-schreiben`, falls die Ausführungsrolle das für den Umfang dieses
Features für nötig hält.
