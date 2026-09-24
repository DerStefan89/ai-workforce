# F41 — Neues Projekt anlegen

## ID
F41

## Titel
Neues Projekt anlegen (E-M5-14: direkt nach F39 gezogen, löst F-523 Greenfield-Blockade) — WS-1: Backend

## Status
Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Ein neues, leeres Projekt lässt sich über den Leitstand anlegen, ohne dass
der Kern ein neues Freigabeartefakt erzeugt (ARCHITECTURE.md §3) und ohne
dass irgendein bestehender Lauf blockiert wird. E-F41-1 = A (Stefan,
24.09.2026, docs/projekt/zielfassung.md §13.6 nachgetragen): der Kern
kopiert die Harness-Baseline (.claude/settings.json, referenzierte Hooks,
state/aktuelle-autorisierung.json) byte-identisch in ein Geschwisterverzeichnis
von ai-workforce — die Startbedingung (E-183) ist rein inhaltsbasiert
(src/invocation-policy/index.ts, ermittleIstZustand/pruefeStartbedingung1),
eine identische Kopie validiert deshalb gegen dieselbe, bereits bestehende
externe Autorisierung (belegt in features/F25/nachweis-ws1.md). WS-1 liefert
ausschließlich das Backend (POST /api/projekte, Register-Zusammenführung,
Gate) — ohne UI, ohne Git-Handling durch den Kern (Linie E-F39-1: kein
`git init`/`commit`/`branch` durch den Server), ohne neue Autorisierung.

## Nicht-Ziele
- Import bestehender Repos (F25 WS-2b bleibt F30) — dieser Auftrag legt
  ausschließlich NEUE, leere Projekte an.
- Neue Autorisierung. Der Kern erzeugt in keinem Schritt ein neues
  Freigabeartefakt (ARCHITECTURE.md §3) — die byte-identische Kopie
  validiert gegen dieselbe, bereits bestehende externe Autorisierung.
  **Korrektur 24.09.2026 (Challenger-Befund, real widerlegt):** eine
  frühere Fassung dieser Akte behauptete, Startbedingung 2 (E-188) lehne
  ein neues Verzeichnis "strukturell IMMER" ab und WS-1 könne deshalb nur
  Startbedingung 1 prüfen. Das war falsch —
  `gueltigkeitsschluessel.arbeitsverzeichnis_pfad`
  (src/claude-code-gateway/index.ts, `starteGateway`) ist `process.cwd()`
  des Leitstand-SERVERPROZESSES, nicht das Arbeitsverzeichnis des
  gestarteten Kindprozesses — der Server macht nirgends `process.chdir()`.
  Der Wert ist damit für JEDES Projekt derselbe, konstante Pfad (ai-
  workforce selbst), unabhängig vom tatsächlichen Kindprozess-Arbeits-
  verzeichnis (das steuert separat `AusfuehrungsOptionen.cwd`, F25 WS-1).
  Eine byte-identische Kopie von state/aktuelle-autorisierung.json
  validiert deshalb auch Startbedingung 2 — real belegt (AK6,
  `features/F41/nachweis-ws1.md`): ein echter, lesender Lauf gegen ein neu
  angelegtes Projekt erreichte RUN_PREPARED und lief bis ERFOLGREICH durch,
  der reale Kindprozess las dabei eine nur im neuen Projektverzeichnis
  vorhandene Markerdatei. WS-1 prüft am Ziel deshalb jetzt die VOLLE
  Startfreigabe (Bedingung 1 UND 2, `pruefeVolleStartfreigabeFuerRepo`) —
  siehe AK4d. Kein eigener, vom Menschen erzeugter Wirksamkeitsnachweis für
  WS-3 nötig (siehe "Bekannte Grenzen" für die davon unabhängige,
  vorbestehende architektonische Schwäche selbst, F-670).
- Löschen/Archivieren eines Projekts.
- UI (Knopf/Formular in der Projekte-Übersicht, Absprung ins
  Coach-Interview, Render-Nachweis) — WS-2.
- Reallauf (Architekt, architecture-advisor MIT Urteil, Regel 1c real
  ausgelöst, code-reviewer erfolgreich) — WS-3, Pflicht-AK F-666 aus F39.

## Workstreams
- WS-1 — Backend (Register-Merge, POST /api/projekte, Gate). Diese Akte.
- WS-2 — UI (Knopf/Formular in der Projekte-Übersicht, Git-Befehle für
  Stefan sichtbar machen, Absprung ins Coach-Interview Modus projekt,
  Render-Nachweis F-622).
- WS-3 — Reallauf, Pflicht-AK F-666: ein neues Projekt über den Coach, dann
  architekt mit mindestens einer `entscheidungen_mensch` (Regel 1c real
  ausgelöst und fortgesetzt), dann architecture-advisor MIT auswertbarem
  Urteil, dann ausfuehrung, dann code-reviewer erfolgreich.

## Akzeptanzkriterien
- AK1 `features/F41/feature.md` (diese Akte) — Status IN_ARBEIT,
  `npm run check` grün.
- AK2 Register-Zusammenführung: `projekte.json` bleibt ausschließlich
  handgepflegt und committet. `src/projekte/index.ts`
  (`ladeProjektregisterMitLokal`) führt es additiv mit einem gitignorierten
  `projekte.lokal.json` zusammen. Eine doppelte `id` (gegen das
  Gesamtregister, nicht nur innerhalb einer Datei) oder ein ungültiges JSON
  in `projekte.lokal.json` verwirft NUR diese Datei (fail-closed, klare
  stderr-Meldung) — `projekte.json` bleibt unberührt nutzbar.
- AK3 `POST /api/projekte` (`scripts/leitstand-server.mjs`, Formprüfung in
  `scripts/leitstand/routen-f41.mjs`), ausschließlich im unpräfigierten
  defaultHandler. Body `{ id, name, zielordner? }`. `id` gegen
  `^[a-z0-9][a-z0-9-]{1,40}$` und kollisionsfrei gegen das Gesamtregister.
  `zielordner` (Standard `<Elternverzeichnis von ai-workforce>/<id>`) über
  `src/projekt-anlegen/index.ts`s `loeseZielordner` geprüft: Containment,
  Traversal, Symlink (Basis UND jeder Zwischenschritt), darf nicht
  existieren oder muss leer sein. D13-Sperre (`pruefeGlobaleLaufSperre`) wie
  bei jeder anderen schreibenden Route — reserviert vor jeder
  Schreibwirkung, in jedem Rückkehrzweig zurückgesetzt (`laufId: null`, kein
  echter Lauf wird gestartet, aber jede reale Schreibwirkung blockiert
  gleichzeitig jeden anderen aktiven Arbeitsstrang und umgekehrt).
- AK4 Ablauf, fail-closed: (a) Quelle (ai-workforce) muss Startbedingung 1
  grün erfüllen (`pruefeStartbedingung1FuerRepo`, dieselbe Messung wie
  `starteGateway`), sonst 409 ohne jede Schreibwirkung. (b) Byte-identische
  Kopie von `.claude/settings.json`, jeder darin referenzierten Hook-Datei
  (`ermittleHookPfade`) und `state/aktuelle-autorisierung.json`
  (`kopiereBaseline`, `copyFileSync`). (c)
  `startvorlagen/<id>.json` aus `startvorlagen/ai-workforce.json` OHNE
  `pruefbefehl`/`pruefZeitgrenzeMs`, mit `profilPfad` ABSOLUT auf das neu
  geschriebene `profiles/<id>.json` umgesetzt (siehe "Bekannte Grenzen" zum
  realen Fund, der das nötig machte). `profiles/<id>.json` mit
  `projekt: <id>`. `.gitignore` mit `kontrollzustand/`
  (`schreibeStartvorlageUndProfil`). (d) Echte Startprüfung — die VOLLE
  Startfreigabe (Bedingung 1 UND 2, `pruefeVolleStartfreigabeFuerRepo`,
  dieselben Eingaben wie `starteGateway`: `arbeitsverzeichnis_pfad =
  process.cwd()` des Serverprozesses, `startziel_pfad`/`werkzeug_version_
  deklariert`/`berechtigungskontext` aus der neuen Startvorlage) — gegen
  das NEUE Repo, OHNE Wirkungsmarke/Log-Schreiben (Bedingungen direkt
  aufgerufen, nicht der Orchestrator `pruefeStartfreigabe` mit seinem
  `schreiber`, der ein Startfreigabe-Ereignis für einen nicht real
  anstehenden Lauf geloggt hätte). Rot: der von DIESEM Request angelegte
  Ordner wird zurückgebaut (`raeumeAngelegtenOrdnerZurueck`), nichts
  registriert, 422. (e) Eintrag in `projekte.lokal.json` (Status
  IDEE, `basisverzeichnis: kontrollzustand`) VOR der Live-Registrierung
  (D2). Live in `projekte`/`projektHandlerMap` registriert, OHNE
  Serverneustart (`projektHandlerMap` wird bereits im CLI-Bindeblock als
  leere, geteilte `Map` angelegt und danach befüllt, statt sie später zu
  ersetzen). (f) Antwort 201 trägt `naechste_schritte` — die Git-Befehle für
  Stefan (`git init -b main`, `git add -A`, `git commit`,
  `git checkout -b arbeit/start`) und den Hinweis auf das
  Coach-Interview — der Kern führt diese Befehle selbst NIE aus (Linie
  E-F39-1).
- AK5 Gate `scripts/check-f41-projekt-anlegen.mjs`, Teil von `npm run
  check`. Baut ein Wegwerf-"externes Autorisierungs-Repo" (Muster
  `scripts/check-f4-invocation-policy.mjs`) und ein Wegwerf-"Quellrepo" —
  CI hat kein echtes externes Autorisierungs-Repo. Rot-Fälle: ungültige
  `id`, `id`-Kollision, Traversal/außerhalb der Basis, Symlink (best
  effort — Windows verweigert `symlinkSync` ohne erhöhte Rechte/Dev-Mode
  real mit EPERM, dann kein Befund, nur eine übersprungene Teilprüfung),
  nicht leerer Zielordner, Quelle nicht grün (manipulierter Hook-Hash) →
  nichts angelegt/registriert; Startprüfung am Ziel rot (nachträglich
  manipulierter Hook, Bedingung 1) → Ordner zurückgebaut; ein
  Wirksamkeitsnachweis mit abweichendem `werkzeug_konfiguration_hash` im
  Gültigkeitsschlüssel (Bedingung 2, E-188) bei unveränderter, weiterhin
  grüner Bedingung 1 → real abgelehnt (Korrektur 24.09.2026); Duplikat/
  ungültiges JSON in `projekte.lokal.json` → nur diese Datei verworfen; D13
  blockiert während `globalerLaufZustand.aktiv`. Grün-Fall: Projekt
  angelegt (Bedingung 1 UND 2 grün), erscheint in `GET /api/projekte`,
  `/api/projekte/<id>/...` antwortet ohne Neustart, Dateien byte-identisch,
  Startvorlage ohne `pruefbefehl`.
- AK6 Lokaler Realnachweis gegen die ECHTE Autorisierung (kein
  Attrappen-Baseline): ein Wegwerf-Projekt real über den laufenden
  Leitstand angelegt, VOLLE Startprüfung real grün belegt. Ein zweiter
  Realnachweis (Korrektur 24.09.2026) ging weiter: ein echter, lesender
  Lauf gegen das neue Projekt real gestartet (Muster F25 AK8) — erreichte
  `RUN_PREPARED` und lief bis `ERFOLGREICH`, der reale Kindprozess las
  dabei eine nur im neuen Projektverzeichnis vorhandene Markerdatei.
  Protokoll in `features/F41/nachweis-ws1.md`.

## Dependencies
- F25 WS-1/WS-2a — Projektregister (`projekte.json`, `src/projekte/
  index.ts`, `baueProjektHandlerMap`/`loeseProjektPfade`/
  `erzeugeMultiProjektDispatcher`, D13 projektübergreifend), auf dessen
  Mechanik F41 WS-1 additiv aufsetzt (Register-Merge, Live-Registrierung),
  keine zweite Registerlogik.
- F4 — Invocation Policy (`src/invocation-policy/index.ts`,
  `ermittleHookPfade`/`ermittleIstZustand`/`pruefeStartbedingung1`/
  `pruefeStartbedingung2`), deren Content-Only-Prüfung (E-183) UND deren
  Gültigkeitsschlüssel-Vergleich (E-188, der `arbeitsverzeichnis_pfad`
  betreffend seit F25 an `process.cwd()` des Serverprozesses statt am
  Projektverzeichnis hängt, siehe "Bekannte Grenzen") das gesamte
  E-F41-1-Muster tragen.
- F6a — Claude-Code-Gateway (`src/claude-code-gateway/index.ts`,
  `leseAktuelleAutorisierung`, additiv exportiert für F41 WS-1), dessen
  `starteGateway` dieselbe Startbedingung-1+2-Messung (inkl. derselben
  `arbeitsverzeichnis_pfad = process.cwd()`-Eingabe) nutzt wie
  `pruefeVolleStartfreigabeFuerRepo`.
- F39 (E-F39-1) — Git im neuen Repo macht der Kern nicht; F-666 (Pflicht-AK
  eines vollständigen realen `hoch`-Laufs) ist WS-3 dieses Features.

## Betroffene Primitive
Projektregister-Schema (`schemas/projekte.schema.json`, unverändert —
`projekte.lokal.json` folgt demselben Schema), Startvorlagen-/Profil-Schema
(unverändert, additiv abgeleitete Dateien), `.gitignore` (neuer Eintrag
`projekte.lokal.json`).

## Risiken
Path-Traversal/Symlink-Escape beim Zielordner — durch `loeseZielordner`
(Containment-Präfixvergleich nach `resolve()`, Symlink-Realpath-Prüfung von
Basis UND jedem Zwischenschritt) adressiert, im Gate kalibriert. Ein
manipuliertes `.claude/settings.json`/Hook zwischen Quell-Prüfung und
Kopie — durch die Reihenfolge (Quelle grün prüfen → sofort synchron kopieren
→ Ziel erneut real prüfen, rot → zurückbauen) eng begrenzt, nicht durch eine
Transaktion; ein zwischen den beiden Prüfungen manipuliertes Ziel würde die
Ziel-Prüfung selbst fangen (siehe Gate (7)).

## Bekannte Grenzen (dokumentiert statt stillschweigend behoben — CLAUDE.md-Entscheidungsregel 5)
- Code-Review-Befund: `projekte.lokal.json` wird im POST-Handler VOR der
  Live-Registrierung (`projekte.push`/`baueProjektHandlerMap`) geschrieben
  (D2, "Speichern vor In-Memory-Zustandsänderung"). Würfe einer der beiden
  In-Memory-Schritte danach (praktisch nicht beobachtet —
  `baueProjektHandlerMap` fängt Konstruktionsfehler je Projekt bereits
  selbst ab, `Array.push` wirft nie), bliebe ein Registereintrag bestehen,
  dessen Ordner der `catch`-Block bereits zurückgebaut hat. Kein Absturz:
  ein solcher "Zombie"-Eintrag verhält sich beim nächsten Serverstart wie
  jeder andere kaputte Registereintrag (F25 QA-Befund) — `erzeugeRequestHandler`
  scheitert an der fehlenden Startvorlage, `baueProjektHandlerMap` überspringt
  ihn, `/api/projekte/<id>/...` bleibt 404. Bewusst nicht umgebaut (kein
  beobachteter Fehlerfall, YAGNI) — bei Bedarf: Register-Schreiben NACH die
  Live-Registrierung verschieben, oder den `catch`-Block um ein Zurücknehmen
  eines bereits geschriebenen Eintrags erweitern.
- **Korrektur 24.09.2026** (ersetzt eine frühere, falsche Fassung dieser
  Zeile — siehe "Nicht-Ziele" oben): Startbedingung 2 (E-188) WIRD am Ziel
  geprüft und real bestanden (AK4d/AK6) — kein eigener Wirksamkeitsnachweis
  für WS-3 nötig. Die eigentliche, davon unabhängige architektonische
  Schwäche bleibt aber bestehen und ist jetzt sichtbarer (F-670, `state/
  findings.md`): `gueltigkeitsschluessel.arbeitsverzeichnis_pfad` ist seit
  F25 immer `process.cwd()` des Serverprozesses, nicht das reale
  Arbeitsverzeichnis des gestarteten Kindprozesses (das bindet separat
  `AusfuehrungsOptionen.cwd`). Ein Wirksamkeitsnachweis bindet dadurch NIE
  an ein konkretes Projektverzeichnis — er validiert für JEDES registrierte
  Projekt gleichermaßen. Bewusste Entscheidung, ob E-188 künftig
  projektbezogen werden soll, steht noch aus (F-670, kein Umbau in F41).
- Neue Projekte haben keinen `pruefbefehl` in ihrer Startvorlage (bewusst,
  AK4c) — TECH_DEBT-Befund (siehe `state/findings.md`): kein
  deterministischer Prüfschritt, bis die Architektur des neuen Projekts
  einen eigenen `npm run check` o. Ä. festlegt.
- Realer Fund (Smoketest vor dem Gate-Bau): `src/startvorlage/index.ts`s
  `leiteProfilReferenzAb` liest `vorlage.profilPfad` über einen rohen
  `readFileSync` — relativ zum `process.cwd()` des SERVERPROZESSES, nicht
  zur `repoWurzel` des jeweiligen Projekts (anders als `settingsPfad`/
  `aktuelleAutorisierungPfad`/`startvorlagePfad`, die `loeseProjektPfade`
  bereits absolut auflöst, F25 WS-1 AK3/AK4). Eine unveränderte Kopie von
  `startvorlagen/ai-workforce.json` hätte ein neues Projekt beim echten
  Serverlauf still an ai-workforce's EIGENES Profil gebunden (die Datei
  existiert unter `process.cwd()` ja tatsächlich — kein Absturz, aber eine
  falsche Bindung). `schreibeStartvorlageUndProfil` setzt `profilPfad`
  deshalb absolut. Der zugrunde liegende Pfadstil-Bruch in
  `leiteProfilReferenzAb` selbst ist NICHT behoben (außerhalb des WS-1-
  Scopes) — siehe `state/findings.md` für den TECH_DEBT-Befund.

## Feature Review
WS-1 durchlief einen Reviewer-/QA-Pass (frischer Kontext, Subagenten
`code-reviewer` + `qa`, 24.09.2026) vor dem Stagen. Ergebnis beider Pässe:
Freigegeben mit Hinweisen — Kernmechanik (Byte-Identität, D13, Live-
Registrierung, fail-closed Register-Merge) korrekt, keine kritischen
Befunde. Vier reale Befunde daraufhin noch auf demselben Branch behoben,
bevor gestagt wurde:
- `raeumeAngelegtenOrdnerZurueck` konnte bei einem blockierten
  Datei-Handle (Windows EPERM/EBUSY/ENOTEMPTY, F-590-Fehlerklasse) im
  `catch`-Zweig selbst ein zweites Mal werfen — ungefangen, hätte als
  unhandled rejection den gesamten Serverprozess mitgerissen statt nur den
  einen Request. Jetzt `{ ok, grund? }` statt `void`, wirft nie; Rot-Fall
  real mit einem offen gehaltenen Datei-Handle erzwungen und kalibriert
  (Gate (8)).
- `loeseZielordner`s Symlink-Prüfung deckte die Basis selbst nicht ab (nur
  Segmente darunter) — real durch den ersten Gate-Lauf gefunden (Windows-
  Junction bestand fälschlich), sofort behoben.
- `loeseZielordner`s Containment-Vergleich war pauschal case-insensitiv,
  unabhängig von `process.platform` — auf einem case-sensitiven
  Dateisystem (Linux, siehe CLAUDE.md "Bekannte Fallen") zu großzügig für
  eine echte Sicherheitsgrenze. Jetzt nur auf win32/darwin.
- `POST /api/projekte` schrieb `projekte.lokal.json` immer an einen festen
  Pfad, unabhängig von einer überschriebenen `LEITSTAND_PROJEKTE_LOKAL_PFAD`
  — ein neu registriertes Projekt wäre nach einem Neustart mit aktivem
  Override unauffindbar gewesen. Jetzt über eine durchgereichte Option
  (`projekteLokalPfad`) an denselben Pfad gebunden, den der CLI-Bindeblock
  tatsächlich lädt (Gate (9)).

Ein fünfter Befund ebenfalls behoben: `ladeProjektregisterMitLokal` ließ den
Fall "valides JSON, aber falsche Form" (kein Objekt / `projekte` kein
Array) stillschweigend über den "kein Verstoß"-Pfad durchfallen, ohne die
für die beiden Schwesterfälle übliche stderr-Meldung — jetzt ein eigener,
explizit geloggter Zweig (Gate (5), neuer Rot-Fall).

Ein Befund bewusst NICHT behoben, siehe "Bekannte Grenzen": die
Schreibreihenfolge `projekte.lokal.json` vs. Live-Registrierung (kein
beobachteter Fehlerfall, YAGNI).

**Zweite Korrekturrunde (Challenger-Befund, 24.09.2026):** die Behauptung
"Startbedingung 2 lehnt ein neues Projektverzeichnis strukturell IMMER ab"
(vorherige Fassung dieser Akte, AK4/Nicht-Ziele/Bekannte Grenzen) wurde nie
gegen den bereits vorhandenen Realbeleg (`features/F25/nachweis-ws1.md`
AK8, der genau mit dieser Kopiertechnik reale Läufe in einem zweiten
Projekt startete) geprüft — real widerlegt über einen zweiten End-zu-Ende-
Realnachweis (AK6, `nachweis-ws1.md`): ein echter lesender Lauf gegen ein
neu angelegtes Projekt erreichte `RUN_PREPARED` und lief bis `ERFOLGREICH`
durch. Ursache: `gueltigkeitsschluessel.arbeitsverzeichnis_pfad`
(`starteGateway`) ist `process.cwd()` des Serverprozesses, nicht das
Arbeitsverzeichnis des Kindprozesses — für jedes Projekt derselbe,
konstante Wert. Korrigiert: `pruefeVolleStartfreigabeFuerRepo` prüft am
Ziel jetzt Bedingung 1 UND 2 (Gate (3b), Rot-Fall mit abweichendem
Gültigkeitsschlüssel real kalibriert), Akte und Modul-Kopf
(`src/projekt-anlegen/index.ts`) korrigiert, `docs/projekt/zielfassung.md`
§13.6 um E-F41-1 ergänzt (Stefan, 24.09.2026), F-670/F-671 (`state/
findings.md`) neu.

`npm run check` nach beiden Korrekturrunden erneut grün (alle Gates inkl.
`check-f41-projekt-anlegen.mjs`).

## Rollback
`POST /api/projekte`-Route, `src/projekt-anlegen/`, `scripts/leitstand/
routen-f41.mjs`, `scripts/check-f41-projekt-anlegen.mjs`, den
`projektHandlerMap`-Vorbau und `ladeProjektregisterMitLokal` entfernen;
`projekte.lokal.json` (gitignoriert) und jeden real angelegten Projektordner
von Hand löschen. `projekte.json` selbst ist nie geändert worden.
