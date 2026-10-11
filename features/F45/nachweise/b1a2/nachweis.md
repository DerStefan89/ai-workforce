# F45 B1a-2 — Nachweise

Stand 11.10.2026, Branch `feat/f45-b1a2-skelett` (Basis `fde3b06`), Node 24 lokal, Windows 11. Alle Läufe in
Wegwerfordnern unter dem Scratchpad der Sitzung (`<scratchpad>`), nichts im Projektordner eines Fremdprojekts.
Lokale Werkzeuge: **gitleaks nicht im PATH, Docker nicht installiert.**

## 1 Neues Projekt über den Anlegeweg

Weg: dieselben Funktionen wie `POST /api/projekte` in derselben Reihenfolge — `kopiereBaseline`,
`kopiereSkelett`, `schreibeStartvorlageUndProfil` (die Route selbst prüft zusätzlich die Startfreigabe gegen
das externe Autorisierungs-Repo; die Kopierschritte sind identisch).

- **Dateiliste** (`neues-projekt-dateiliste.txt`): 56 Dateien = 7 Baseline (`.claude/settings.json`,
  `commit-guard.cjs`, `guard-settings.js`, `session-reminder.cjs`, `zwischenstand-laden.cjs`,
  `zwischenstand-pruefen.cjs`, `state/aktuelle-autorisierung.json`) + 46 Skelett + 3 aus der Startvorlage
  (`startvorlagen/nachweis-b1a2.json`, `profiles/nachweis-b1a2.json`, `.gitignore`). Die Hook-Gruppe des Skeletts
  (Template-`settings.json` und fünf `.js`-Hooks) wurde **ganz übersprungen** (0 kopiert) — keine toten Hook-Kopien,
  E-183 des neuen Projekts unverändert (Baseline byte-gleich).
- **`npm run check` rot mit klarer Platzhalter-Meldung** (`neues-projekt-check-rot.log`, Exit 1):
  `✗ (a) Platzhalter: Platzhalter statt Gate: lint, typecheck, test — Gate-Vorlage anwenden:
  docs/harness/gate-vorlage-node.md`; (b) Hinweis „keine package-lock.json“; (c) Hinweis „Secret-Scan NICHT
  gelaufen“; (d) alle 5 Baseline-Hooks starten (✓).
- **`npm run check:template` grün** (`neues-projekt-check-template.log`, Exit 0) — der echte Prüfbefehl neuer
  Projekte (Startvorlage `pruefbefehl … run check:template`); Doku-Gate ohne Befund (lessons.md, neuer
  CLAUDE.md-Absatz mit Pfaden lösen auf).

## 2 Gate-Vorlage auf ein Mini-Beispiel angewendet → grün

Kopie des neuen Projekts, dazu `src/rechne.ts` (eine Funktion), `test/rechne.test.ts` (ein Test), Schritte 1–4 aus
`docs/harness/gate-vorlage-node.md` (eslint + typescript-eslint + globals, `tsconfig.json`, Skripte, Lock-Datei
durch `npm install`). `npm run check` **Exit 0** (`mini-check-gruen.log`): (a) ✓, (b) `npm audit` ✓ (0 high/critical),
(c) Hinweis, (d) ✓; `eslint .` ✓; `tsc --noEmit` ✓; Doku/Regeln/Vertrag ✓; `✓ Test-Gate: 1 Test(s) bestanden
(Untergrenze 1)`.

**Fund beim ersten Versuch, behoben:** `eslint .` prüfte die Hooks unter `.claude/hooks/` (15 Fehler,
`no-require-imports`, `no-empty`). Die Vorlage nimmt `.claude/**` jetzt aus (Hooks sind Regelwerk des Menschen,
kein Produktcode); danach grün.

## 3 Secret-Scan mit Attrappe

Lokal **nicht real belegbar** (gitleaks/Docker fehlen): `check-gates` (c) und `npm run check` von ai-workforce
(`scripts/check-secrets.mjs`) zeigen den sichtbaren Hinweis „Secret-Scan NICHT gelaufen: weder gitleaks noch Docker im
PATH — Funde zeigt erst die CI“ (Exit 0, nie still; die Logs unter 1/2 stammen aus dem Lauf vor der Korrekturrunde und
tragen noch den älteren Wortlaut). Der echte Rotfall steht als Test
`scripts/check-secrets.test.mjs` bereit: Attrappe zur Laufzeit zusammengesetzt, in `os.tmpdir()` geschrieben, echter
Scan → rot; lokal sichtbar übersprungen („weder gitleaks noch Docker vorhanden — echter Rotfall läuft in der CI“),
in der CI (Docker vorhanden) läuft er. Verdrahtung (Argumente wie in der CI, Treffer rot, sauber grün, Docker-Weg,
Hinweis) belegt `scripts/skelett-check-gates.test.mjs` mit injiziertem Ausführer.

## 4 Nachrüsten gegen den alten Skelett-Stand `387f1a3`

Kopie: `git archive 387f1a3:vorlagen/projekt-skelett` (ohne HERKUNFT.md, 37 Dateien, durch `core.autocrlf=true`
mit CRLF), als eigenes Git-Repo. Aufgerufen über dieselben Funktionen wie die CLI, Basis = Scratchpad (die CLI erlaubt
nur Projekte neben der Installation; die Ablehnung des Scratchpad-Pfads zeigt `nachruesten-cli-ausserhalb.txt`, Exit 2).

- **Probelauf** (`nachruesten-probelauf.txt`, Stand nach der Korrekturrunde): 15 fehlen (u. a. settings.json + 5 Hooks,
  lessons.md, ci.yml, SETUP.md, check-gates.mjs), 3 weichen ab (`ARCHITECTURE.md`, `CLAUDE.md`, `package.json` — die
  lokalen Änderungen), 34 gleich; Zeile „.claude/settings.json würde neu → nach --anwenden Startfreigabe für dieses
  Projekt neu erteilen“; Hinweis „'check' ruft scripts/check-gates.mjs nicht auf“. **Dateien vorher 37, nachher 37,
  keine verändert.**
- **`--anwenden`** (`nachruesten-anwenden.txt`): `Kopiert: 15`, keine Fehler; Pflichtzeile „.claude/settings.json neu →
  Startfreigabe für dieses Projekt neu erteilen“; **vorhandene Dateien verändert: keine** (SHA-256 aller 37 vorher/nachher
  gleich, auch die 3 abweichenden); danach 52 Dateien.
- **Fund beim ersten Versuch, behoben:** der Vergleich war bytegenau und meldete 36 Dateien als „weicht ab“, die nur
  CRLF statt LF trugen. Jetzt gelten Zeilenenden nicht als Abweichung (nur Meldung, geschrieben wird ohnehin nichts).
- Zusätzlich nur lesend über die echte CLI: Probelauf gegen `../haushaltsbuch2`
  (`nachruesten-haushaltsbuch2-probelauf.txt`, kein `--anwenden`): 9 fehlen, 7 weichen ab, 4 Hook-Dateien übersprungen
  (Baseline-settings.json vorhanden → Gruppe „vorhanden“), 32 gleich, keine Startfreigabe-Zeile. Anwenden macht Stefan.
- PowerShell (`nachruesten-powershell-argumente.txt`): Optionen hinter `--` und Pfade mit Leerzeichen kommen beim Skript
  an. `--anwenden` über die echte CLI ist nicht gelaufen (dafür müsste eine Wegwerfkopie neben ai-workforce in
  `C:\Users\stefa\Projekte` liegen); abgedeckt über dieselben Funktionen. Der CLI-Test belegt Exit 2 (falscher Aufruf,
  abgelehntes Ziel), das hb2-Log Exit 0; Exit 1 (Kopierfehler) ist nur über den Funktionstest (`bericht.fehler`) belegt.

## 5 Leitstand ohne Umgebungsvariable

`LEITSTAND_PORT=4197 node scripts/leitstand-server.mjs` ohne `LEITSTAND_STARTVORLAGE_PFAD` (`leitstand-start.log`):
`Leitstand läuft auf http://127.0.0.1:4197 (Startvorlage: startvorlagen/ai-workforce.json — aus dem Projektregister
(Eintrag 'ai-workforce'), Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`. Keine F-391-Warnung (Codex
verfügbar). `GET /api/code` → `startvorlage.pfad = startvorlagen/ai-workforce.json`, `pruefbefehl = npm run check`,
Worker `claude-code, codex` (das zeigt „Womit gearbeitet wird“); `GET /api/ressourcen` → `startvorlagePfad =
startvorlagen/ai-workforce.json` (Capability Library); `GET /api/zustand` → `startHinweis: null` (Startbedingung 2
unverändert grün — `beispielprojekt.json` und `ai-workforce.json` tragen dieselben E-188-Felder).
