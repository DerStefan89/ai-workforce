# F45 B2b-3e-1 — Plan v2 (F-1125: keine persönlichen Pfade in Render-Screenshots)

Plan v1: `features/F45/plan-b2b3e.md` (bleibt unverändert). Advisor-Pass: `features/F45/advisor-b2b3e.md` — **Nicht
freigegeben** wegen Zuschnitt (A1) und Offenem Punkt 1 (A2). Entscheidungen Challenger (16.10.2026, reversibel, Stefan
informiert):
- **A1 angenommen:** jetzt nur **3e-1 = F-1125**. 3e-2 (Budget-Feld, eine Regel für `bereiche`, F-1123 (5)(9)–(15),
  Render-Nachweis) ist ein eigener Bauauftrag nach dem Merge von 3e-1.
- **A2 = (b) Zwilling** (Regel in TS `src/auftrag`, Kopie in `public/leitstand/arbeitspaket-felder.js`, Gate über eine
  Fall-Tabelle, Muster `check-f34`). Gilt für 3e-2 — hier nur vermerkt.
- **A5 = nein:** `npm run check` legt nichts außerhalb des Repos an; das Gate prüft die reine Funktion mit injizierter Wurzel
  und injiziertem Dateisystem. `C:\aiw-nachweis` entsteht nur beim echten Start einer Render-Instanz; ihr Laufordner wird
  danach entfernt (§2).
- Übernommen: A4 (Gate lädt jeden Fall einzeln), A6 (die alten Instanzen bleiben unangetastet, neutraler Import nur in neuen
  Instanzen, kein Import in `render-nachweis.mjs`), A7 (Probe auch über die Protokollzeilen, kein `/g`-Zustand).
  A3/A8/A9/A10 (pruefeBereich-Trim, Budget-Hinweistext usw.) gehören zu 3e-2.

Grenzen: Rückfrage-Kanal unberührt und aus; Argv bitgleich; `starteWorkflowSchritt(` in `scripts/leitstand-server.mjs`
weiter 6× (dieser Auftrag fasst die Datei nicht an); keine gesperrten Dateien; `package.json` nur die Gate-Zeile;
`kontrollzustand/` nie stagen; Historie der Screenshots nicht bereinigen; kein `public/leitstand/`-Code.

## CONTEXT

Abhängig von nichts Offenem. 3e-2 hängt von 3e-1 ab (neue Instanzen von 3e-2 nutzen §2, die Probe aus §3/§4 schützt ihre
Bilder).

## 1 Pfadprobe (rein) — neu `scripts/render-pfadprobe.mjs` + `scripts/render-pfadprobe.test.mjs`

- `findePersoenlichePfade(text)` ⇒ Liste `{ treffer, stelle }` (leer = sauber). Muster
  `Users[\\/]+[^\\/<]+|AppData|C:[\\/]+Users`, Groß/klein egal; die RegExp entsteht **je Aufruf** (A7, kein `lastIndex`).
  Ausnahmen (Platzhalter): `C:\Users` gefolgt von `[\\/]+<` (`C:\Users\<name>`), `AppData` direkt hinter einem
  Platzhalter-Segment `<…>[\\/]+` (`<HOME>\AppData`). `/Users/<name>` trifft das erste Muster schon nicht.
- `pruefeAufPersoenlichePfade(text, ort)` ⇒ wirft `Error` mit Ort und den Fundstellen (gekürzt, ±20 Zeichen) bei Treffer.
- `sammleSichtbarenText()` — im Browser per `page.evaluate` ausgeführt (keine Abhängigkeiten, nur `document`):
  `document.body.innerText` plus `value` aller sichtbaren `input`/`textarea`/`select` (sichtbar =
  `offsetParent !== null` oder `getClientRects().length > 0`).

Unit-Tests: Treffer `C:\Users\anna\AppData\Local\Temp\x`, `c:/users/anna`, `/Users/anna/x`, `D:\AppData`; keine Treffer
`C:\Users\<name>\AppData\…`, `<HOME>\AppData\Local`, `C:\aiw-nachweis\lauf-1\temp\…`, `/tmp/aiw-nachweis`; zweimal
derselbe Aufruf ⇒ dasselbe Ergebnis; Meldung enthält Ort.

## 2 Neutrale Umgebung — neu `scripts/neutrale-umgebung.mjs` (rein) und `scripts/neutrale-umgebung-starten.mjs` (Seiteneffekt)

`scripts/neutrale-umgebung.mjs` (nur Node-Builtins, kein Seiteneffekt beim Import):
- `standardWurzel(env, plattform)` ⇒ `env.AIW_NEUTRAL_WURZEL` oder `C:\aiw-nachweis` (win32) bzw. `/tmp/aiw-nachweis`.
- `richteNeutraleUmgebungEin({ wurzel, env, fs, plattform })` (alles injizierbar; Defaults `process.env`, echte `node:fs`):
  1. `wurzel` trifft die Pfadprobe ⇒ wirft (sonst wäre die Umgebung nicht neutral).
  2. legt `wurzel` an, darin per `mkdtempSync` den **Laufordner** `lauf-XXXXXX` mit `home/` und `temp/`.
  3. setzt `env.HOME = env.USERPROFILE = <lauf>/home`, `env.TEMP = env.TMP = <lauf>/temp` (posix zusätzlich `TMPDIR`).
     `LOCALAPPDATA` bleibt (Chromium/Playwright).
  4. gibt `{ laufordner, entferne }` zurück; `entferne()` löscht den Laufordner (`rmSync` recursive/force, `maxRetries: 3`)
     und danach `wurzel`, falls leer (`rmdirSync`, Fehler ⇒ stehen lassen); Fehler beim Löschen ⇒ Warnung mit Pfad, kein Wurf.

`scripts/neutrale-umgebung-starten.mjs` (Seiteneffekt, nur für Instanzen): ruft `richteNeutraleUmgebungEin()` beim Import,
registriert `process.once('exit', entferne)` und für `SIGINT`/`SIGTERM` `process.exit(130)` (Strg+C beendet die Instanz,
`exit` räumt synchron). **Wie entfernt wird:** beim Prozessende über den `exit`-Handler; ein hart beendeter Prozess
(`taskkill /F`) hinterlässt den Laufordner — dann von Hand `C:\aiw-nachweis\lauf-*` löschen (steht im Kopf der Datei und im
Nachweis).

Neue Instanzen importieren `neutrale-umgebung-starten.mjs` als **ersten** Import (ES-Module werten in Importreihenfolge aus;
`src/faehigkeiten/index.ts:36`, `src/ressourcen/skill-installation.ts:117` rechnen Pfade beim Laden — Advisor entlastend).
Die alten Instanzen (`features/F45/nachweise/*/instanz.mjs` ×13, `f2b2/render/instanz.mjs`, `f2a/instanz-erneut.mjs`)
bleiben unangetastet (A6).

Unit-Test `scripts/neutrale-umgebung.test.mjs` mit injiziertem `fs`/`env` (kein Ordner auf der Platte): gesetzte Variablen,
Laufordner unter der Wurzel, Wurf bei `C:\Users\anna\x`, `entferne` löscht Laufordner und leere Wurzel, Löschfehler ⇒ kein Wurf.

## 3 DOM-Probe vor jedem Screenshot — `scripts/render-nachweis.mjs`

- Import von `findePersoenlichePfade`/`pruefeAufPersoenlichePfade`/`sammleSichtbarenText` aus `./render-pfadprobe.mjs`
  (kein Import der neutralen Umgebung, A6).
- In `knappesScreenshot` **vor** `page.screenshot`: `pruefeAufPersoenlichePfade(await page.evaluate(sammleSichtbarenText),
  `Screenshot ${dateiname}`)` ⇒ bei Treffer Wurf, kein Bild, Lauf bricht ab (Exit 1 über `main().catch`).
- Je Schritt Spalte `Pfadprobe` im Protokoll (`sauber` bzw. — nicht erreicht, weil vorher abgebrochen).
- Vor dem Schreiben von `protokoll.md`/`protokoll.json`: `pruefeAufPersoenlichePfade` über beide Texte (A7 — `texte`,
  `Zwischenablage` u. a.); Treffer ⇒ nichts schreiben, Wurf.
- Dateikopf: Abschnitt „F45 B2b-3e-1 (F-1125)“.

## 4 Beleg-Instanz und Nachweis — neu `features/F45/nachweise/b2b3e1/`

- `instanz.mjs`: erster Import `neutrale-umgebung-starten.mjs`; Wegwerf-Projekt unter `tmpdir()` (wie b2b3d, ohne Ablauf),
  Leitstand auf Port 4405; gibt `os.tmpdir()`, `os.homedir()`, Laufordner und Ergebnis von `findePersoenlichePfade` darauf aus.
- `render/erzeuge-nachweis.mjs`: (n1) `#/projekt` de 1440 ganze Seite ⇒ Probe sauber, ein Bild (rechte Spalte zeigt den
  neutralen Arbeitsordner); (n2) derselbe Weg mit `anfragenAntworten` auf GET …/code, die `absoluterPfad`
  `C:\Users\anna\AppData\Local\Temp\x` einschleust ⇒ Probe bricht ab, **kein** Bild; das Skript erwartet Exit ≠ 0 und hält
  die Meldung fest.
- `nachweis.md`: Ausgaben (tmpdir/homedir), Protokoll n1, Abbruchmeldung n2, Laufordner nach Strg+C entfernt.

## 5 Gate `scripts/check-f45-b2b3e1-pfade.mjs` (neu, `check:gates` hinter b2b3b1b) — jeder Fall lädt dynamisch (A4)

- (p1) `render-pfadprobe.mjs`: Fall-Tabelle Treffer/kein Treffer wie §1; zweiter Aufruf gleich (kein `/g`-Zustand).
- (p2a) `render-nachweis.mjs` (Quelltext): importiert die Probe; in `knappesScreenshot` steht der Probe-Aufruf vor
  `page.screenshot`; vor `writeFileSync(… 'protokoll.md' …)`/`protokoll.json` steht eine Probe; kein Import von
  `neutrale-umgebung`.
- (p2b) genaue Dateimenge: jede `instanz*.mjs` unter `features/**/nachweise/` außerhalb der eingefrorenen Altliste (15 Pfade,
  im Gate aufgezählt) hat `neutrale-umgebung-starten.mjs` als ersten Import; `b2b3e1/instanz.mjs` muss dabei sein.
- (p3a) `richteNeutraleUmgebungEin` mit injizierter Wurzel `C:\aiw-test` bzw. `/tmp/aiw-test`, injiziertem `env` und `fs`
  (Aufzeichnung, keine Platte): Variablen gesetzt, keine Probe-Treffer, Wurf bei Wurzel `C:\Users\anna\x`, `entferne`
  löscht den Laufordner.
- (p3b) Kindprozess `node -e` mit `HOME/USERPROFILE/TEMP/TMP` = Pfade unter der injizierten Wurzel (nicht angelegt):
  `os.tmpdir()`/`os.homedir()` liefern genau diese — belegt den Mechanismus auf der Plattform, schreibt nichts.
- (i) Invariante (auf main schon grün, so gekennzeichnet): `starteWorkflowSchritt(` 6× in `leitstand-server.mjs`.

Rot gegen main: `git archive main | tar -x -C <scratchpad>/main-3e1`, Gate dorthin kopieren, laufen lassen — je Fall eine
eigene rote Meldung (p1, p2a, p2b, p3a, p3b), (i) grün.

## 6 Doku / Findings

- `state/findings.md` F-1125: Nachtrag — für **neue** Instanzen erledigt (neutrale Umgebung, Probe vor jedem Screenshot und
  über das Protokoll); **alte Instanzen bleiben ohne neutrale Umgebung, ein Neu-Rendern alter Nachweise erzeugt wieder
  persönliche Pfade** (die Probe bricht dann ab). Historie nicht bereinigt.
- Der Ursprungsauftrag nannte zusätzlich Kleinkram (Fixture `stefan` → `nutzer` in `src/rueckfrage/protokoll.test.ts`,
  F-1128 → P1). Nicht im Schnitt A1 genannt ⇒ **nicht in 3e-1**, wandert mit 3e-2 (Offener Punkt für den Delta-Pass: oder
  doch hier, weil klein und thematisch „keine persönlichen Namen“?).
- `docs/STATUS.md`/Feature-Akte: Zeile B2b-3e-1, falls die Gates (`check-status-akten`, `check-feature`) es verlangen.

## 7 Tests (rot → grün)

`scripts/render-pfadprobe.test.mjs`, `scripts/neutrale-umgebung.test.mjs` zuerst rot (Module fehlen), dann grün; Gate
(p1)–(p3b) rot gegen main, grün auf dem Branch.

## 8 Risiken

- Ein Laufwerks-Stamm ohne Schreibrecht ⇒ `AIW_NEUTRAL_WURZEL` setzen (Meldung nennt das).
- Hart beendete Instanz hinterlässt `C:\aiw-nachweis\lauf-*` (§2, dokumentiert).
- Andere sichtbare Nutzerpfade (z. B. Installwurzel `C:\Users\…\Projekte\ai-workforce` in einer Ansicht) ⇒ Probe bricht ab;
  Behebung in der Instanz, nicht durch Abschalten der Probe. In n1 sichtbar, ob `#/projekt` so eine Stelle hat.
- Die DOM-Probe sieht keinen Text in Bildern/Canvas und keine `title`-Tooltips (nicht im Screenshot sichtbar).
- `innerText` von Elementen mit `display:none` fehlt korrekt; Text in geschlossenen `<details>` ebenfalls (nicht im Bild).

## Nachtrag — Delta-Advisor-Pass (16.10.2026, `features/F45/advisor-b2b3e1-delta.md`)

Urteil **Freigegeben mit Auflagen B1, B2**, Zuschnitt passt („würde nicht erneut schneiden“). Übernommen:
- **B1:** (p3b) läuft über das neue Modul — der Kindprozess importiert `scripts/neutrale-umgebung.mjs`, ruft
  `richteNeutraleUmgebungEin` mit aufzeichnendem `fs` und echtem `process.env` des Kindes und gibt danach `os.tmpdir()`/
  `os.homedir()` aus. Rot gegen main, nichts auf der Platte.
- **B2:** n2 belegt den Abbruch über die Meldung (Ort `Screenshot <datei>` + Fundstelle) und über die Abwesenheit von Bild und
  `protokoll.*` im Ordner, nicht nur über den Exit-Code. Der eingeschleuste Pfad `C:\Users\anna\…` ist im Nachweis als
  erfunden gekennzeichnet.
- Hinweise: Probe zusätzlich über `placeholder` sichtbarer Felder, Muster `[A-Za-z]--Users-` (Claude-Projektkennung) und
  posix `/home/<name>` (Platzhalter `<…>` ausgenommen); SIGHUP/SIGBREAK; `rmSync` mit `maxRetries: 10, retryDelay: 100`;
  (p2b) begrenzt die Importe von `neutrale-umgebung*.mjs` auf `node:`-Module und `render-pfadprobe.mjs`, „erster Import“ =
  erste statische `import`-Zeile; Spalte `Pfadprobe` am letzten Protokolleintrag nach dem Bild, sonst „–“;
  `render-nachweis.mjs` nur als Text lesen (startet `main()` beim Import); Dateikopf: Probe liest die ganze Seite (streng,
  sicher); `docs/STATUS.md` Zeile B2b-3e auf 3e-1/3e-2.
- §6 Offener Punkt: Kleinkram (Fixture `stefan` → `nutzer`, F-1128 → P1) **in 3e-1**, als letzter, getrennter Schritt
  (weder A1 noch 3e-2 nannte ihn; thematisch „keine persönlichen Namen“).
- n1: bricht die Probe an einer Stelle außerhalb der Instanz-Konfiguration ab ⇒ anhalten, Befund aufnehmen, nicht ausweiten.
