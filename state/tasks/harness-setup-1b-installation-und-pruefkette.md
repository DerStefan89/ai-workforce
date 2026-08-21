SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.
Danach `git log --oneline -1` gegen main ausgeben und gegen den unten
genannten Commit prüfen. Bei Abweichung: anhalten, Wert nennen, nichts
ändern. Danach `git status --short` ausgeben und protokollieren — erwartet
wird ausschließlich die untrackte Datei dieses Vertrags selbst
(`harness-setup-1b-installation-und-pruefkette.md`), plus ggf. weiterhin
`harness-setup-1a-werkzeugwahl-und-nachtrag.md`, falls die Housekeeping-
Aufnahme aus SCOPE 7 noch nicht erfolgt ist.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce
Erwarteter main-Stand: eda486d

## TASK: harness-setup-1b-installation-und-pruefkette

GOAL:
`lint`, `typecheck`, `test` in `package.json` rufen echte, installierte
Werkzeuge auf und laufen nachweislich über eine nichtleere Menge (Befund 1,
Projektchat, 21.08.2026 — die alte Formulierung „läuft und liefert einen
echten Exit-Code" war mit der leeren Menge erfüllbar). `tsconfig.json`
trägt die drei in Plan v1 §10 gemessenen Konfigurationsauflagen. Genau ein
Harness-Selbsttest existiert (kein Produktcode). `state/plan-v2-harness-
setup.md`, AP 1, Prüfbar-Zeile ist auf die geschärfte Fassung nachgezogen.
Kriterium 1 aus `claude/10_CHALLENGE_2_BEFUNDE_UND_AENDERUNGSLISTE.md`,
Abschnitt 6, ist damit erfüllt — Kriterium 2 (`npm run check` einmal
vollständig grün) bleibt ausdrücklich AP 2 und wird hier nicht behauptet.

Prüfbar an: `npm run lint`, `npm run typecheck`, `npm run test` liefern
je einen echten Exit-Code UND ihre Ausgabe zeigt eine Datei-/Testanzahl
> 0 · `tsconfig.json` enthält `erasableSyntaxOnly: true`,
`allowImportingTsExtensions: true`, `types: ["node"]` · `package.json`
trägt `"type": "module"` · genau eine neue Testdatei existiert.

CONTEXT:
- [Fakt] `state/tooling.md` (nach 1a): Biome `2.5.9` exakt gepinnt,
  `typescript` `7.0.2` (native Portierung), `node:test` gebunden an Node
  `24.x`/`24.16.0`. Diese drei Versionen sind hier zu installieren — nicht
  neu zu wählen.
- [Fakt] `state/plan-v1-harness-setup.md`, Abschnitt 10 (TP-14-Messung,
  Reihe B, Linux-Container, TypeScript 7.0.2): alle drei Konfigurations-
  auflagen wurden gegen exakt diese `tsc`-Version gemessen, nicht gegen
  eine andere. `@types/node` war in der Messung installiert und nötig,
  ohne den `types`-Eintrag findet `tsc` `node:test` nicht.
- [Fakt] Reihe A (Zielmaschine, Node 24.16.0) bestätigt Strip-only-
  Verhalten und den `enum`-Abbruch; Reihe B (die restlichen vier Zeilen,
  inkl. der drei Auflagen) lief unter Node 22, nicht auf der Zielmaschine
  nachgemessen. `[offene Unsicherheit]`, laut Plan v1 §10 selbst benannt.
- [Fakt] `package.json`, aktueller Stand: kein `"type"`, `lint`/
  `typecheck`/`test` sind `node -e`-Platzhalter mit Exit 1, `check`/
  `check:template` unverändert lassen (rufen `npm run lint` etc. aus, keine
  eigene Änderung nötig).
- [Fakt] `.github/workflows/ci.yml` vermerkt selbst: `cache: 'npm'` und
  `npm ci` erst nach echten Dependencies + `package-lock.json` möglich —
  hier entstehen beide erstmals.
- [Fakt] `scripts/_mode.ts` ist die einzige vorhandene `.ts`-Datei, von
  nichts importiert, kein Produktcode (Harness-Mechanik: Dry-Run-Standard).
- [Fakt] Befund 1 (Projektchat, 21.08.2026): AP-1-Prüfbar-Zeile wird
  geschärft, weil ein Skript, das über null Dateien läuft und Exit 0
  liefert, den alten Wortlaut trivial erfüllt hätte. Die Schärfung soll in
  `state/plan-v2-harness-setup.md` nachgezogen werden.
- [Fakt] `.claudeignore`/`.gitignore` schließen `node_modules`, `dist`,
  `build`, `out`, `.next`, `coverage`, `*.tsbuildinfo`, `*.log` bereits
  aus — keine Ergänzung nötig für Standard-npm/TS-Artefakte.

SCOPE:
1. `npm install --save-dev @biomejs/biome@2.5.9 typescript@7.0.2
   @types/node@24` (oder die zu Node 24.x passende `@types/node`-Minor-
   Version, falls `@24` nicht auflöst — dann die tatsächlich installierte
   Version im OUTPUT nennen). `package-lock.json` entsteht dabei.
2. `tsconfig.json` anlegen mit mindestens: `erasableSyntaxOnly: true`,
   `allowImportingTsExtensions: true`, `types: ["node"]`, plus den
   Standardeinstellungen, die eine reine Node-24-ESM-Ausführung ohne
   Build-Schritt tragen (`module`/`moduleResolution` entsprechend `node`-
   nativ, kein `outDir`, kein `emit`). Gegen `scripts/_mode.ts` und die
   neue Testdatei aus SCOPE 4 real laufen lassen, nicht nur schreiben.
3. `package.json`: `"type": "module"` ergänzen. `lint` → echter
   Biome-Aufruf über die relevanten Quellpfade (mindestens `scripts/`).
   `typecheck` → `tsc --noEmit`. `test` → `node --test`. `check`/
   `check:template` unverändert lassen.
4. Genau eine Testdatei anlegen — Harness-Selbsttest, kein Produktcode
   (Präzedenz: AP 2 verlangt „mindestens eine echte Testdatei", hier
   vorgezogen wegen Befund 1). Sinnvoller Kandidat: ein Test gegen
   `scripts/_mode.ts` (`startScript()`), weil das die einzige vorhandene,
   bisher ungetestete `.ts`-Logik ist. `.ts`-Endung in Imports verwenden
   (Konfigurationsauflage 2).
5. Verifikation, mit Belegen: `npm run lint` (Ausgabe zeigt Anzahl
   geprüfter Dateien > 0), `npm run typecheck` (Exit 0 gegen mindestens
   zwei `.ts`-Dateien), `npm run test` (`# tests 1`, `# pass 1`, nicht
   `# tests 0`).
6. `state/plan-v2-harness-setup.md`, AP 1, Prüfbar-Zeile ersetzen durch:
   „Jedes der drei Skripte läuft über eine nachweislich nichtleere Menge —
   die Ausgabe zeigt eine Datei-/Testanzahl > 0 — und liefert einen echten
   Exit-Code." Sonst nichts an der Datei ändern.
7. Drei getrennte Commits, je eigene Freigabe:
   a) `package.json`, `package-lock.json`, `tsconfig.json`, die neue
      Testdatei, `.biome.json`/-Konfigurationsdatei (falls angelegt) —
      eine Message, die ausschließlich AP-1-Installation/-Konfiguration
      beschreibt.
   b) `state/plan-v2-harness-setup.md` — eigene Message, die ausschließ-
      lich die Prüfbar-Schärfung beschreibt.
   c) `state/tasks/harness-setup-1a-werkzeugwahl-und-nachtrag.md` und
      `state/tasks/harness-setup-1b-installation-und-pruefkette.md`
      gemeinsam — Housekeeping-Commit, Präzedenz `648c877`.
   Danach ein gemeinsamer Push für alle drei, eigene Freigabe.
8. Abschließend zeigen: `git log --oneline -4`, `git status --short`,
   vollständiger Diff von `package.json`, `tsconfig.json`,
   `state/plan-v2-harness-setup.md`, Inhalt der neuen Testdatei, die drei
   Ausgaben aus SCOPE 5.

NICHT:
- Kein `npm run check` als Nachweis für Kriterium 2 werten — das ist
  AP 2, hier nur die drei Einzel-Skripte.
- Keine Gate-Kalibrierung (`state/gates.md`), keine CI-Änderung
  (`.github/workflows/ci.yml`), kein Dokumentenpaar (AP 5), kein Prosa-
  Abgleich (AP 6), keine der AP-7-Maßnahmen.
- Kein PostToolUse-Hook wiedereinrichten (Befund 3, Option B — bleibt AP 6
  überlassen).
- Kein Eintrag in `docs/harness/werkzeug-katalog.md`.
- Mehr als eine Testdatei, oder Testdatei mit Produktcode-Charakter.
- Kein `git add -A`/`git add .` — nur explizite Pfade je Commit.

BUDGET:
Zwei Durchgänge — Installation/Konfiguration ist mechanisch, aber `tsc`
7.0.2 (native Portierung) ist neu genug, dass eine der drei
Konfigurationsauflagen abweichend reagieren könnte (Reihe B lief unter
Node 22, nicht auf der Zielmaschine). Wahrscheinlichster Korrekturfall:
`module`/`moduleResolution`-Wert in `tsconfig.json` muss an das tatsäch-
liche Verhalten von `tsc` 7.0.2 angepasst werden.

OUTPUT:
- Drei Commits + ein Push, mit den unter SCOPE 7 genannten Inhalten.
- Vollständiger Inhalt von `tsconfig.json` und der neuen Testdatei.
- Die drei Verifikationsausgaben aus SCOPE 5, vollständig, nicht gekürzt.
- Tatsächlich installierte Versionen (`npm ls @biomejs/biome typescript
  @types/node`), falls sie vom Pin abweichen, mit Begründung.

ESCALATE:
- Arbeitsverzeichnis oder Commit-Stand weichen von `eda486d` ab →
  anhalten, beide Werte nennen, nichts ändern.
- `npm install` löst eine andere Version auf als in `state/tooling.md`
  gepinnt → anhalten, nicht stillschweigend übernehmen, Abweichung zeigen.
- Eine der drei Konfigurationsauflagen verhält sich unter `tsc` 7.0.2 auf
  der Zielmaschine anders als in Plan v1 §10 (Reihe B) gemessen → das ist
  ein neuer, eigenständiger Befund (die offene Unsicherheit aus §10 wird
  damit real), nicht selbst durch Umkonfigurieren wegarbeiten — anhalten,
  Abweichung mit Original-Fehlermeldung zeigen.
- `npm run lint`/`typecheck`/`test` liefert Exit 0 über einer leeren Menge
  (0 Dateien, 0 Tests) → das ist exakt der Fehler aus Befund 1, den dieser
  Vertrag verhindern soll — anhalten, nicht als Erfolg werten.
- Ein Hook meldet sich (Commit-Guard, Settings-Guard) → anhalten, Meldung
  vollständig zeigen, keine Freigabe-Datei anlegen.
- `git status` zeigt vor SCOPE 1 mehr oder anderes als die im
  SCHRITT-0-Vermerk genannten untrackten Dateien → anhalten, Ausgabe
  zeigen, nicht selbst einordnen.

FOLGT: keins — nach diesem Vertrag ist AP 1 vollständig. Nächster Schritt
laut Plan v2 §5 ist AP 2 (erster grüner Produkt-Prüflauf), eigener Vertrag,
zu schreiben nach Vorlage dieses Outputs.
