# F45 B2a-3b — Plan (geprüfter Stand, „Review veraltet“, Befehlsblöcke im Leitstand, Restpunkte B2a-3a)

Branch `f45/b2a3b-review-stand` (Stefan), Basis `origin/main` `2fd1ac5` (B2a-3a, #331). Grundlage: Auftrag F45 B2a-3b
(13.10.2026), `features/F45/plan-b2a3.md` (§4, §6, Advisor-Pass B1/L3/L4/L8), Fixpaket-Zeile B2a-3b, Spec §9.6, Findings
F-1063, F-959, F-1085. Bau erst nach freigegebenem Plan.

## Plan v1

### Befunde vorab (Code gegen 2fd1ac5)
- **Nachweis B2a-3a:** `git log origin/main..f45/b2a3-codex-review` zeigt nur `f912773`; dessen Baum ist gleich `2fd1ac5`
  (`git diff --stat` leer) — kein eigener Nachweis-Commit. Ungesichert im Arbeitsbaum: `features/F45/nachweise/b2a3/
  codex-review-lauf.{mjs,json,md}` (echter Lauf `0960f9cc-…`, codex/`gpt-6-astra`, Schema v2 ohne Schema-Fehler,
  Befund B1 mit allen v2-Feldern, `review.policy_version`) und die Änderung an `state/findings.md` (F-1085 (7)/(11)).
  Genau diese werden übernommen (Teil A, keine Laufakte, kein Rohstrom).
- **Review-Start:** `starteWorkflowSchritt` (Server ~Z. 6528) setzt `reviewMeta = { policy_version }` nur für
  `code-reviewer`; `laufWurzel = laufort.wurzel` (Arbeitsordner bei Pflicht+BEREIT, sonst Projekt) — identisch mit
  `laufwurzelFuer` für denselben Workflow. `reviewMeta` geht über `ausfuehrungsOptionen.review` → Execution-Controller →
  beide Gateways → Laufakte `review`. Ein Validator (`validiereLaufakteDaten`, `src/claude-code-gateway`, `pruefeReview`
  lässt heute nur `policy_version` zu), Schema `kontrollzustand-laufakte-payload` `review` mit `additionalProperties:false`.
- **GET …/abnahme** (Z. 7639): Projektion `urteil` status ok mit `policy_version`, `vertrag_*`, `kontext_luecken`.
  Handler ist `async`. „Abnahme offen“ = `ermittleAbnahmeStand(...).offen` (ABGESCHLOSSEN + Bau gelaufen + keine
  Entscheidung zum aktuellen Bau) — eine Regel, schon da.
- **Git lesend:** `fuehreGitSync` (sync, `input` möglich über execFileSync) und `routen-code.mjs` `fuehreGitAus` (async,
  `--literal-pathspecs`, Zeitgrenze, maxBuffer, kein stdin). `fuehreGitAsync` (git-starter) ohne stdin. Gate
  `check-git-starter` verlangt den Git-Starter (`fuehreGitSync`/`gitProgramm`+`gitUmgebung`).
- **Ausnahmen:** `istAusnahmePfad` (`src/ausfuehrung-vorbedingung`): `kontrollzustand/`, `state/nachweis-runde2-`,
  `scripts/.aufraeumen-reste/`, `stdin-check.js`.
- **Anzeige:** `reviewHinweise(urteil)` (workflow-abnahme.js) speist Vorab-Block, Review-Kachel und Zählzeile im Blick.
- **Befehle:** `sicherBefehle` liefert `{ zeilen, hinweise }` (add…, commit, push in EINEM Block, kein cd); `code.js`
  (Sichern + Prüfstand mit einem Befehl ohne cd) und `workboard.js` (Sichern) rendern je einen Block. Daten aus GET
  `/api/code` (`baueCodeProjektion({ repoWurzel })`, `absoluterPfad` = Projektordner). Abhängig:
  `public/leitstand/code-daten.test.mjs`, `scripts/leitstand/routen-code.test.mjs`, i18n.
- **Workboard-„Sichern“ nach einem Ablauf im Arbeitsordner:** die Code-Projektion liest immer `repoWurzel` (Projekt),
  nie den Worktree `wf/<id>`. Ja — sie zeigt den Projektordner. **Nicht gelöst**, neues Finding für B2b („Bereit zum
  Sichern“).

### A Nachweis B2a-3a nachziehen
- Die drei ungesicherten Dateien unter `features/F45/nachweise/b2a3/` bleiben unverändert (echter Lauf).
- F-1085: (7) „erledigt 13.10.2026 — Nachweis `features/F45/nachweise/b2a3/codex-review-lauf.md` (Lauf `0960f9cc-…`)“;
  (11) neu (schon im Arbeitsbaum, Maßnahme „mit B2a-3b“).
- `features/F45/feature.md` Z. 898 („Offen als Beleg: echter Codex-Lauf …“) → „Belegt: echter Codex-Lauf … (Nachweis
  codex-review-lauf.md); Fall ‚leere Befunde mit Pflichtsatz‘ nur über Gate/Unit-Tests.“

### B Geprüfter Stand und „Review veraltet“ (F-1063 Rest, Spec §9.6)
**Neues Modul `src/review-stand/index.ts`** (Kern, weil der Server und das Gate es nutzen; reine Funktionen + zwei
dünne Hüllen über den Git-Starter):
- Rein: `parseLsTree(rohZ)` → Map Pfad→Blob (Zeilen `<mode> <typ> <hash>\t<pfad>\0`); `parseDiffIndexRaw(rohZ)` →
  `{ geaendert: string[], geloescht: string[] }` (`:<m1> <m2> <h1> <h2> <S>\0<pfad>\0`; D → geloescht, sonst geaendert);
  `parseNulListe(rohZ)`; `pfadeZumHashen(geaendert, neu)` (ohne Ausnahmen, sortiert, dedupliziert);
  `fingerabdruckAusTeilen({ commit, baum, geloescht, gehasht })` → `{ commit, inhalt }`: Map = Baum minus gelöschte
  minus Ausnahmen, überschrieben mit `gehasht` (Pfad→Blob aus `hash-object`); `inhalt = sha256` über die nach Pfad
  (Codepunkt) sortierten Zeilen `pfad\tblob`, mit `\n` verbunden. Ausnahmen über `istAusnahmePfad` in JS.
- `standIstVeraltet(geprueft, aktuell)` → `true | false | null` (null, wenn einer fehlt); vergleicht nur `inhalt`.
- Git-Aufrufe (nur Plumbing, alle mit `--no-optional-locks -c core.quotePath=false -c core.fsmonitor=false`):
  `rev-parse --verify HEAD^{commit}`, `ls-tree -r -z HEAD`, `diff-index --raw -z --no-renames HEAD`,
  `ls-files --others --exclude-standard -z`, `hash-object --stdin-paths` (OHNE `-w`, Pfade über stdin, eine Zeile je
  Pfad). Kein `git status`, kein `update-index`, kein `write-tree`.
- Hülle synchron `leseGeprueftenStandSync(wurzel, { zeitgrenzeMs = 5000, maxPfade = 2000, maxBytes = 64 MiB })` über
  `fuehreGitSync` (`input` für hash-object, `maxBuffer`): Kappe vor `hash-object` — Anzahl der zu hashenden Pfade und
  Summe ihrer Dateigrößen (`statSync`, fehlende Datei = weglassen wie gelöscht? nein: Fehler → null). Ergebnis
  `{ stand: { commit, inhalt } } | { stand: null, grund }`. Wirft nie.
- Hülle asynchron `leseGeprueftenStandAsync(wurzel, optionen)` gleiche Semantik über `gitProgramm()`+`gitUmgebung()` mit
  `execFile` und stdin (eigener kleiner Starter im Modul, Muster `fuehreGitAsync`; Gate git-starter bleibt grün).
- Ohne Commit (leeres Repo) → null „kein Commit (HEAD fehlt)“; Pfad, der zwischen Auflisten und Hashen verschwindet →
  hash-object scheitert → null mit Grund (ehrlich statt geraten).
- Leitstand-Server: beim Start eines `code-reviewer`-Schritts (dort, wo `reviewMeta` entsteht) `stand =
  leseGeprueftenStandSync(laufWurzel)`; `reviewMeta = { policy_version, geprueft_stand: stand.stand, ...(stand.stand
  === null ? { stand_grund: stand.grund } : {}) }`. `laufWurzel` ist `laufort.wurzel` = `laufwurzelFuer(...)` (gleiche
  Regel; Kommentar nennt das). Kein neuer `starteWorkflowSchritt(`-Aufruf.
- Laufakte: Schema `review.properties` + `geprueft_stand` (`oneOf` null | `{commit: string 40/64 hex, inhalt: string
  64 hex}`, additionalProperties false) und `stand_grund` (string, minLength 1); `required` bleibt `["policy_version"]`
  (alte Laufakten gültig). Validator `pruefeReview` erweitert (Zwilling), Typ `ReviewV0` + Felder. Beispiel
  `schemas/examples/kontrollzustand-laufakte-review.valid.json` um `geprueft_stand` ergänzt; ein invalid-Beispiel
  (`geprueft_stand` ohne `inhalt`). NICHT im Modellschema.
- GET …/abnahme, `urteil` (status ok) additiv: `geprueft_stand` (aus der Review-Laufakte, sonst null), `aktueller_stand`,
  `veraltet`, `stand_grund`. Regel: nur wenn `ermittleAbnahmeStand(...).offen` und `geprueft_stand` gesetzt →
  `await leseGeprueftenStandAsync(laufwurzelFuer(...))`; `veraltet = standIstVeraltet(...)`; scheitert die Berechnung →
  `veraltet: null`, `stand_grund` = Grund. Abnahme nicht offen → `aktueller_stand: null`, `veraltet: null`,
  `stand_grund: null` (nicht berechnet, kein Hinweis). Offene Abnahme mit alter Laufakte (ohne `geprueft_stand`) →
  `veraltet: null`, `stand_grund` = `review.stand_grund` oder „Review ohne geprüften Stand (vor B2a-3b)“.
  `abnahmeVersion` wird dafür vor der Urteilsprojektion geladen (heute danach — nur Reihenfolge, gleicher Wert).
- Anzeige `reviewHinweise(urteil)` (eine Quelle): `veraltet === true` → Art `reviewVeraltet` „Review veraltet — der
  Arbeitsordner hat sich seit dem Review geändert“ (amber, kein Halt); `veraltet === null` und `stand_grund` Text →
  Art `standUnbestimmt` „Stand des Reviews nicht bestimmbar: {text}“ (amber). Damit in Review-Kachel, Vorab-Block (dort
  heute nie, weil nicht offen) und Zählzeile „Auf einen Blick“. i18n de/en/tr/ru (`abnahme.review.reviewVeraltet`,
  `abnahme.review.standUnbestimmt`).

### C Befehlsblöcke im Leitstand (F-959 Rest Leitstand)
- `code-daten.js`: reine `befehlsBloecke(pfad, folgen)` → `{ bloecke: string[][] }` (je Folge ein Block, erste Zeile
  `cd ${psArgument(pfad)}`) oder `{ grund: 'keinPfad' }` ohne absoluten Pfad (Windows `X:\…`/UNC oder `/…`).
- `sicherBefehle(daten, …)` → `{ bloecke, hinweise }`: Block 1 [cd, add…, commit], Block 2 [cd, push] (nur mit origin);
  alle bisherigen Gründe bleiben, neu `keinPfad`. Feld `zeilen` entfällt (zwei Aufrufer, beide angepasst).
- Neu rein `pruefstandBefehle(daten)` → `{ bloecke: [[cd, pruefbefehl]] } | { grund: 'keinBefehl' | 'keinPfad' }`.
- `code.js` (Sichern, Prüfstand) und `workboard.js` (Sichern) rendern je Block `renderBefehlsblock` (eigenes „Kopieren“;
  `insTerminal()` je Block wie bisher). `auftrag-umgebung.js` bleibt. i18n `code.sichern.grund.keinPfad` +
  `code.pruefstand.keinPfad` de/en/tr/ru.

### D Restpunkte F-1085
- (11) `pruefeReviewErgebnis`: `fundstelle`, `zusammenfassung`, `beleg` in die Liste der Pflichtwerte (fehlend/leer →
  Hinweis, kein Halt). Gleiche Policy-Version: der Policy-Text ändert sich nicht (Hash im Gate f45-b2a3 bleibt), das
  Schema verlangt die drei Felder schon seit v1; die Prüfung holt nur nach, was der Vertrag schon sagt.
- (6) HTTP-Fall „Projektion folgt dem neuesten Review-Lauf nach ANPASSUNG“ im neuen Gate (e).

### E Gate `scripts/check-f45-b2a3b-review-stand.mjs` (in `npm run check` direkt nach f45-b2a3)
(a) Wegwerf-Repo (git init, autocrlf false, Commit), nur über `leseGeprueftenStandSync`/`Async`: gleicher Stand → false;
Datei geändert → true; neue unverfolgte Datei → true; Änderung nur in `kontrollzustand/` (neu + geändert) → false; nur
Commit der Änderungen (`git add <pfad>` + commit im Gate, Inhalt gleich) → false bei anderem `commit`; Datei gelöscht →
true; nur `touch` (mtime) einer verfolgten Datei → false; sync = async; `.git/index` Bytes + mtime unverändert und keine
neue Datei unter `.git/objects` (Liste vorher/nachher) über alle Aufrufe. (b) HTTP-Pfad (Attrappe wie f45-b2a3, spiegelt
`eingaben.review`): Laufakte trägt `review.geprueft_stand` = Fingerabdruck des Repos zum Review-Start; Laufakte valide.
(c) Projektion: offene Abnahme, Ordner unverändert → `veraltet: false`; Datei danach geändert → `true`; Repo danach
ohne HEAD-Zugriff (`.git` umbenannt) → `null` mit `stand_grund`; Laufakte ohne `geprueft_stand` → `null` mit Grund.
(d) `sicherBefehle`/`pruefstandBefehle`: erste Zeile je Block `cd <psArgument(pfad)>`, push in eigenem Block, ohne
origin nur ein Block, ohne Pfad Grund. (e) (11): Befund mit leerer `fundstelle`/`zusammenfassung`/`beleg` → drei
Hinweise, kein Halt; (6): Ablauf → ABGESCHLOSSEN → POST …/abnahme ANPASSUNG_ANGEFORDERT → Datei im Repo ändern → POST
…/freigabe → zweiter Review-Lauf → Projektion `laufId` = zweiter Lauf, `geprueft_stand` = neuer Fingerabdruck, Befund
des zweiten Ergebnisses. (f) `starteWorkflowSchritt(` genau 6× im Server; `leseGeprueftenStandSync(` genau einmal.
(g) Rotfälle kalibriert: je Prüfung ein verfälschter Eingang (Fingerabdruck ohne Ausschluss, Vergleich über `commit`,
Block ohne cd, push im ersten Block, Projektion ohne `veraltet`, fehlende Hinweise (11), siebter `starteWorkflowSchritt(`).

### F Tests, Nachweis, Doku
- Unit: `src/review-stand/review-stand.test.ts` (rein + Hüllen am Wegwerf-Repo), `src/review-policy` (11),
  `public/leitstand/code-daten.test.mjs` (Blöcke), `views/workflow-abnahme.test.mjs` (zwei neue Hinweise),
  Gateway-Tests beider Worker (`review.geprueft_stand` in der Laufakte), `routen-code.test.mjs` angepasst, falls es
  `sicherBefehle` prüft.
- Render-Nachweis `features/F45/nachweise/b2a3b/` (Muster b2a3 `instanz.mjs`/`erzeuge-nachweis.mjs`, Port 4199):
  Code-Seite Sichern (zwei Blöcke) + Prüfstand (cd), Workboard Sichern, Abnahme mit „Review veraltet“ und „nicht
  bestimmbar“; 1440/390, hell/dunkel, ru 390. design-guardian.
- Register: F-1063 erledigt; F-959 Leitstand erledigt, Rest Coach + Vorlage Bauaufträge; F-1085 (6)(7)(11) erledigt,
  (1)(2)(3)(4)(5)(10) → B2b, (8)(9) → UX nach F30; neu F-1086 (PROCESS_IMPROVEMENT P2): Ausgabeschema erst nach echtem
  Codex-Lauf mergen (F-638), Nachweis-Commits vor dem Merge auf dem Remote-Branch prüfen (Vorfall B2a-3a); neu F-1087
  (TECH_DEBT P2, B2b): Workboard-„Sichern“ zeigt nach einem Ablauf im Arbeitsordner den Projektordner.
- Akte F45 „Stand B2a-3b“, B2a abgeschlossen (Belege 1/2/10 je Teil), Fixpaket-Zeile B2a-3b Ist, STATUS, ARCHITECTURE.md
  §1 (`src/review-stand`) und §2 (lesender Fingerabdruck, kein Index-/Objekt-Schreiben).

### Nicht ändern
`.claude/**`, Hooks, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`, `package.json` außer der Gate-Zeile;
Modellschema `ergebnis-code-reviewer`; keine Rohströme, `*.lokal.json`, nichts aus `kontrollzustand/`/„Claude outputs/“.

### Offene Punkte (für den Advisor)
O1 Synchrone Berechnung beim Schrittstart blockiert den Event-Loop bis zur Zeitgrenze (5 s je Aufruf, fünf Aufrufe) —
oder Start asynchron vorziehen? (starteWorkflowSchritt ist synchron.) O2 Hinweis „nicht bestimmbar“ auch für alte
Laufakten bei offener Abnahme (Lärm vs. Ehrlichkeit). O3 (11) ohne neue Policy-Version. O4 Symlinks/Submodule: hash-object
folgt dem Link bzw. scheitert am Ordner → null mit Grund (kein Sonderweg). O5 Vorab-Lage (KLAERUNG) berechnet keinen
aktuellen Stand („nur bei offener Abnahme“ laut Auftrag).

## Advisor-Pass (13.10.2026, frischer Kontext, `architecture-advisor`)
Urteil **Freigegeben mit Hinweisen**, Bedingung N1–N6: (N1) Gate f45-b2a3 (b) vergleicht `eingaben.review` exakt mit
`{policy_version}` → bewusst auf `policy_version` einschränken, `geprueft_stand` prüft das neue Gate; (N2) GET über
`ermittleLaufort` (fail-closed), nicht `laufwurzelFuer` (fällt still auf den Projektordner zurück → falsches „veraltet“);
(N3) CRLF in HEAD bei `text=auto`: `hash-object` mit Filtern ≠ HEAD-Blob → Gate-Fälle, ggf. `--no-filters`-Gegenprobe;
(N4) `rev-parse --show-toplevel` gegen die Wurzel (sonst umgebendes Repo, Pfade cwd-relativ); (N5) `maxBuffer`
ausdrücklich (Node-Standard 1 MiB, das eigene Repo hat ~4 800 Dateien); (N6) Review-Beispiele in eine Fixture-Liste, die
ein Gate ausführt. Läuft mit: Gates mit `repoWurzel = process.cwd()` hashen das echte Repo (6); `fuehreGitAsync` um stdin
erweitern statt eines dritten Starters (8); Pfadwache für `"`/Zeilenumbruch (9); Filter-Treiber (LFS) starten fremde
Programme (10); Teil A: nur die Nachweisdateien fehlen auf main (11); F-1085 (10) nicht still verschieben (12); eine
`cd`-Quelle für Server und Client, `-LiteralPath` bei Wildcard-Zeichen (13); Baureihenfolge B → D → C (14); Gate (a)
misst Index/Objekte je Aufruf (15); Test `codex-gateway.test.ts:664` (16). O1 Gesamtbudget statt 5 s je Aufruf; O2
anzeigen, ohne Jargon; O3 vertretbar, Kopfkommentar `src/review-policy` präzisieren; O4 Symlinks als Grenze; O5 ok.

## Plan v2 (Nachträge vor dem Bau)
- **N3 geprüft (Wegwerf-Repo, 13.10.2026):** CRLF-Blob in HEAD + `* text=auto eol=lf` + `touch` → `diff-index` meldet die
  Datei (Null-Hash), `hash-object` = LF-Blob ≠ HEAD, `hash-object --no-filters` = HEAD-Blob; LF in HEAD + `autocrlf=true` +
  CRLF im Arbeitsbaum → gefilterter Hash = HEAD-Blob. Kein Objekt, Index-mtime unverändert. **Regel je geänderter Datei:**
  erst `hash-object --no-filters --stdin-paths`; gleich dem HEAD-Blob → unverändert. Sonst (und für neue Dateien)
  `check-attr filter -z --stdin` — ist ein Filter-Treiber gesetzt, `null` mit Grund „Filter-Treiber (z. B. LFS) — Stand
  nicht lesend bestimmbar“ (Finding 10, kein fremdes Programm im Leitstand); sonst `hash-object --stdin-paths` (mit
  EOL-Umwandlung). Gate-Fälle für beide CRLF-Lagen.
- **N4:** erster Aufruf `rev-parse --show-toplevel HEAD`; Toplevel (realpath, unter Windows ohne Groß-/Kleinschreibung) ≠
  realpath(Wurzel) → `null` „kein eigenes Git-Repo an der Wurzel“; ohne HEAD → `null` „kein Commit“.
- **N5:** `maxBuffer` 64 MiB je Aufruf; Überlauf → `null` „Git-Ausgabe zu groß“. Kappe `maxPfade` (2 000 zu hashende Pfade)
  und `maxBytes` (64 MiB Dateigröße) mit Grund „zu viele geänderte Dateien (Index veraltet? einmal `git status`)“ bzw. „zu
  groß“. **O1:** Gesamtbudget 5 s über alle Aufrufe der synchronen Hülle (Restzeit je Aufruf), async gleich.
- **Pfadwache (9):** ein zu hashender Pfad mit Zeilenumbruch oder führendem `"` → `null` mit Grund.
- **(8):** `fuehreGitAsync` bekommt optional `eingabe` (stdin) und `umgebung` (Zusatzwerte, hier `LC_ALL=C`); kein neuer
  Starter. Sync über `fuehreGitSync` mit `input` und `stdio: ['pipe','pipe','pipe']`.
- **N2:** Start und GET nutzen `ermittleLaufort(workflowId, workflowDaten)`; `!ok` → `veraltet: null`, `stand_grund` =
  dessen Grund. Gate-Fall „Arbeitsordner weg“ entfällt als HTTP-Fall (der Gate-Ablauf hat keinen Pflicht-Arbeitsordner);
  belegt über eine reine Hilfsfunktion `staendeVergleichen(geprueft, laufort, berechne)` im Server? — nein, YAGNI: der
  Zweig ist eine Zeile, belegt per Quelltext-Prüfung im Gate (f): GET ruft `ermittleLaufort(`, nicht `laufwurzelFuer(`.
- **N1:** f45-b2a3 (b) vergleicht nur `review.policy_version` (vorher: ganzes Objekt gleich `{policy_version}`; jetzt
  zusätzlich prüft f45-b2a3b (b) `geprueft_stand` gegen den echten Fingerabdruck → nicht schwächer). Grep: kein weiteres
  Gate vergleicht `review` exakt (nur f45-b2a3 nennt `policy_version`).
- **(6):** Gates mit `repoWurzel = process.cwd()` hashen beim Review-Start das echte Repo — nur Laufzeit (Budget 5 s, Kappe),
  kein Gate vergleicht den Wert; beobachten, im Bericht nennen.
- **N6:** `schemas/examples/kontrollzustand-laufakte-review.valid.json` (mit `geprueft_stand`) und neu
  `kontrollzustand-laufakte.invalid-review-geprueft-stand.json` in die Fixture-Liste von `check-f6a-claude-code-gateway.mjs` (e).
- **(11):** Teil A — die Textänderungen an feature.md/F-1085 sind im Arbeitsbaum, die Nachweisdateien kommen mit diesem Paket
  auf main.
- **(12):** F-1085 (10) → B2b ist Stefans Vorgabe im Auftrag B2a-3b; im Register so vermerkt.
- **(13):** `cdZeile(pfad)` in `code-daten.js` (einzige Quelle: `cd <psArgument>`, bei `[`, `]`, `*`, `?` im Pfad
  `cd -LiteralPath <psArgument>`), `baueProjektCdZeile` im Server nutzt sie.
- **(14):** Reihenfolge B → D → C, je mit Unit-Tests; Gate am Ende.
- **(15):** Gate (a) vergleicht Index-Bytes/mtime und Objektliste unmittelbar vor/nach jedem Fingerabdruck-Aufruf.
- **(16):** Kommentar am Rotfall angepasst (falscher Typ).
- **O2:** Text „Review aus einem älteren Lauf — geprüfter Stand nicht festgehalten“. **O3:** Kopfkommentar
  `src/review-policy` präzisiert („neue Regeln“ = neue Policy-Regeln; das Nachholen schon vertraglicher Pflichtfelder als
  Hinweis gilt für die Version weiter). **O4:** Symlinks (hash-object folgt dem Link → kann falsch `true` melden) und
  Submodule/eingebettete Repos (`null` mit Grund) als Grenze im Kopfkommentar; Durchsetzungsgrad „geprüft, nicht ERZWUNGEN“.

## Prüfpass und Korrekturrunde (13.10.2026, frischer Kontext)
- **design-guardian:** freigegeben mit Hinweisen — (2) Prüfstand-Block unter „berührt · kommt“ → Block davor; (4)
  Workboard-Hinweis ohne „je Block am Stück, Push zuletzt“ → ergänzt (de/en/tr/ru); (1) Umbruch nach `cd` in der schmalen
  Prüfstand-Spalte hingenommen (kein CSS-Eingriff); (3) Zoom/reduzierte Bewegung nicht gerendert (keine Bewegung).
- **code-reviewer:** freigegeben mit Hinweisen, Bedingung K1 — rohes NUL-Byte im Unit-Test → `\x00`; (1) `UMGEBUNG` nur
  `LC_ALL` (GIT_* wäre sync wirkungslos); (2) Rotfall Ausschluss rechnet echte Teile (`fingerabdruckAusTeilen` mit
  Ausnahme-Parameter); (3) Gate (a) mit beiden CRLF-Lagen und verfolgter Datei unter `kontrollzustand/`; (4) Submodul über
  Modus 160000; (5) `cdZeile` auch in `auftrag-umgebung.js`, Backtick → `-LiteralPath`; (6)/(7) → F-1088.
- **qa:** nicht freigegeben — (1) Render-Kennzeichen der Abnahme ohne die Stand-Felder → `reviewHinweisKennung` im
  Kennzeichen (`views/workflows.js`), Test; (2) Poll-Last → `aktuellerStandMitCache` (10 s, geteilte Berechnung; Gate 0);
  (3) NUL-Byte (= K1); (4) Zeitgrenze-Test; (5) wie Code-Review (3); (6) eigener Grund bei fehlendem Arbeitsordner; (7) Satz
  zum nächsten Schritt in „Review veraltet“; (8) F-1087; (9)/(10) → F-1088.
