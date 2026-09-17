# F25 WS-1 — Realer Nachweis (AK8)

Datum: 17.09.2026. Zwei echte, lokale Repos gegen einen realen
Leitstand-Serverprozess (`npm run leitstand`), reale Claude-Code-Kindprozesse,
kein Mock.

## Aufbau

- **ai-workforce** — dieses Repo, Starteintrag im Register.
- **f25-testprojekt-b** — neues, echtes Repo unter
  `C:\Users\stefa\Projekte\f25-testprojekt-b\` (`git init`), mit einer von
  Hand vorbereiteten Mini-Baseline: `.claude/settings.json` und die
  referenzierten Hook-Skripte (`.claude/hooks/*.js`/`*.cjs`) sind eine
  byte-identische Kopie aus ai-workforce, ebenso
  `state/aktuelle-autorisierung.json` und `startvorlagen/ai-workforce.json`.
  Das ist möglich, ohne eine neue Autorisierung zu fabrizieren (ARCHITECTURE.md
  §3 verbietet dem Kern das Erzeugen eines Freigabeartefakts): F4s
  Gültigkeitsschlüssel (`werkzeug_konfiguration_hash`, `schutzskript_hashes`,
  `werkzeug_version_deklariert`, `berechtigungskontext`,
  `arbeitsverzeichnis_pfad`, `startziel_pfad`) ist rein inhaltsbasiert, ohne
  Pfadbindung (`src/invocation-policy/index.ts`, Kopfkommentar Zeile 106) —
  eine byte-identische Kopie der bereits real freigegebenen Dateien validiert
  gegen dieselbe, bereits existierende Autorisierung, ohne dass ein neues
  Freigabeartefakt entsteht. Der `.claude/settings.json`-Kopiervorgang wurde
  bewusst NICHT vom Modell ausgeführt — `guard-settings.js`/`commit-guard.cjs`
  blockieren jeden automatisierten Schreibzugriff auf eine Datei namens
  `.claude/settings.json`, auch außerhalb dieses Repos. Stefan hat die Datei
  selbst in seinem Editor angelegt bzw. per Explorer kopiert.
  Marker-Datei `nur-in-projekt-b.txt` existiert ausschließlich in diesem Repo.
- Ein nicht committeter, lokaler Registerauszug `projekte-test-f25-ak8.json`
  (per `LEITSTAND_PROJEKTE_PFAD` übergeben) enthielt beide Projekte — die
  committete `projekte.json` im Repo-Root trägt weiterhin nur den
  `ai-workforce`-Starteintrag (AK1).

## Ablauf und Ergebnis

1. `LEITSTAND_PROJEKTE_PFAD=projekte-test-f25-ak8.json npm run leitstand` —
   Server startet, Log bestätigt beide Registereinträge: `Projekte:
   ai-workforce, projekt-b`.
2. `GET /api/projekte/projekt-b/laeufe` → `[]` — eigene, leere Laufliste,
   getrennt von ai-workforces echter (langer) Historie unter `/api/laeufe`.
3. Erster realer Lauf gegen Projekt B (`rolle: ausfuehrung`, `werkzeugsatz:
   lesend`, Auftrag: "Lies nur-in-projekt-b.txt ... und gib den Inhalt
   wörtlich aus") schlug zunächst an F4 fehl: `"Hash der
   Werkzeugkonfiguration weicht von der Baseline ab (E-183)"` — die erste
   von Hand kopierte `.claude/settings.json` war nicht byte-identisch
   (vermutlich Editor-bedingte Zeilenenden-/Encoding-Abweichung beim
   Retyping). Nach einer erneuten 1:1-Dateikopie (Explorer, keine
   Neueingabe) verschwand der Fehler — real belegter Beweis, dass der
   Gültigkeitsschlüssel-Vergleich tatsächlich auf Byte-Ebene wirkt (E-183
   ist kein Kosmetik-Check).
4. Zweiter realer Lauf: F4 bestanden (`RUN_PREPARED` geschrieben), aber das
   Ergebnis war fachlich falsch — der Kindprozess meldete, im
   Arbeitsverzeichnis `C:\Users\stefa\Projekte\ai-workforce` zu laufen (nicht
   im registrierten `f25-testprojekt-b`), fand die Datei folglich nicht.
   **Realer Fund**: `starteProzess` (`src/claude-code-gateway/
   prozessstart.ts`) baute `starterOptionen` über eine benannte Feldliste
   (`{ zeitgrenzeMs, abbruchSignal, stdinLeer }`) statt eines Spreads — `cwd`
   erreichte dadurch nie `echterStarter`, obwohl jede vorgelagerte Schicht
   (Registereintrag → `erzeugeRequestHandler` → `execution-controller` →
   `starteGateway`) es korrekt bis in `starteProzess`s eigenes
   `optionen`-Objekt trug. Kein bis dahin gelaufenes gemocktes Gate
   (`check-f25-projekte.mjs`, Abschnitt 2b) hatte diese Ebene erreicht — der
   Mock dort ersetzt `fuehreAufgabeDurchFn` eine Schicht VOR diesem Bug.
   Festgehalten als `state/findings.md` F-415. Behoben (eine Zeile:
   `cwd: optionen.cwd` in der `starterOptionen`-Konstruktion) und mit einem
   neuen Gate-Abschnitt (2c) direkt an dieser Stelle kalibriert
   (Rot-Fall vor der Korrektur real reproduziert).
5. Server neu gestartet (Node lädt keine geänderten Dateien nach; beide
   verwaisten Locks — `ai-workforce` und `projekt-b` — wurden beim Neustart
   korrekt als "kein lebender Vorbesitzer" übernommen, real bestätigt AK5s
   Instanz-Lock je `basisverzeichnis` für ZWEI verschiedene Verzeichnisse in
   einem Prozess).
6. Dritter realer Lauf: `ABGESCHLOSSEN` / `ERFOLGREICH`. Der rohe
   Ereignisstrom (`kontrollzustand-roh/<laufId>/rohstrom.json`) enthält
   wörtlich:
   ```
   Der vollständige Inhalt der Datei `nur-in-projekt-b.txt`:

   Diese Datei existiert NUR in Projekt B (F25 AK8 Realtest).
   ```
   — der Kindprozess lief real im registrierten Projektverzeichnis und las
   die dort exklusiv vorhandene Datei korrekt (AK8, cwd-Threading AK3
   Ende-zu-Ende bestätigt).
7. D13 projektübergreifend (AK5): während der zweite Lauf gegen Projekt B
   noch aktiv war (Status `KLAERUNG_ERFORDERLICH`, `RUN_PREPARED` ohne
   Terminalartefakt, laufender Kindprozess), lehnte ein paralleler
   `POST /api/laeufe`-Versuch gegen **ai-workforce** (den unpräfigierten,
   bestehenden Pfad) real mit HTTP 409 ab:
   `"ein anderer, projektübergreifend gestarteter Lauf
   ('f25-ak8-realtest2-1789632033') ist noch aktiv (D13) — genau ein
   aktiver Arbeitsstrang je Workforce-Instanz"` — der geteilte
   `globalerLaufZustand` sperrt tatsächlich über Projektgrenzen hinweg,
   nicht nur instanzlokal.

## Bekannte, real gefundene und dokumentierte Lücken

- F-415 (`BUG`, gelöst) — siehe oben.
- F-416 (`TECH_DEBT`, offen, P3) — `rohBasisVerzeichnis` ist nicht
  projektspezifisch; der Rohereignisstrom eines Fremdprojekt-Laufs landet in
  ai-workforces eigenem `kontrollzustand-roh/`. Kein Kontrollzustand
  (gitignoriert, rein diagnostisch), deshalb bewusst nicht in WS-1 behoben.

## Aufräumen nach dem Test

Testserver gestoppt, lokale Registerkopie (`projekte-test-f25-ak8.json`,
nie committet) entfernt, Diagnose-Rohströme unter `kontrollzustand-roh/
f25-ak8-*` gelöscht. `f25-testprojekt-b` bleibt als reales, wiederverwendbares
Testprojekt außerhalb dieses Repos bestehen.
