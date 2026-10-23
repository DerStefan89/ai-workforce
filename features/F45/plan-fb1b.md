# F45 FB-1b „Fähigkeit übernehmen/verwerfen“ — Routen (Plan v1)

Stand: 23.10.2026 · Branch `f45/fb1b-faehigkeit-uebernehmen` (von main nach FB-1a, #371) · Grundlage `features/F45/plan-fb1-v2.md`
(Abschnitt FB-1b), `features/F45/advisor-fb1.md`, F-1167 (Pflichtpunkte), F-1069 (E-FB1-2/-3/-4), F-1131 (Zwischenmuster).

## 1 Ziel

`POST /api/workflows/<id>/faehigkeit-vorschlag/uebernehmen` und `…/verwerfen` mit Körper genau `{ typ, name, hash }` (auch
über `/api/projekte/<pid>/…`). Übernehmen verschiebt einen Vorschlag aus `vorschlaege/faehigkeiten/` nach `.claude/skills/<name>/`
bzw. `.claude/agents/<name>.md` im **selben** Arbeitsordner und setzt die Freigabe nach Inhalt (`setzeInhaltsfreigabe` über
`aendereLokaleDatei`, Art `freigabe`) — **nie** einschalten (`an` bleibt, E-F45-6). Verwerfen entfernt nur den Vorschlag.

Entscheidungen Challenger 23.10.2026 (übernommen): **B13** Ziel gitignoriert ⇒ 409 „Ziel ist gitignoriert — würde beim Sichern
nicht mitgenommen“ (fail-closed, auch „nicht bestimmbar“ ⇒ 409). **q1** nur Vorschläge, die gegenüber dem Basis-Commit des
Arbeitsordners neu oder geändert sind; getrackte unveränderte zählen nicht (Projektion und Routen).

## 2 Bausteine

### 2.1 `src/faehigkeiten/vorschlag.ts` (lesend, ergänzt)

- `istSchreibbarerName(name)` (q9): `NAME_MUSTER` und kein Punkt am Ende und kein Windows-Gerätename als Stamm vor dem ersten
  Punkt (`con`, `prn`, `aux`, `nul`, `com1`–`com9`, `lpt1`–`lpt9`, ohne Unterschied der Schreibweise). In `bewerteInhalt` als
  Grund (sichtbar schon in der Erkennung) und im Körper der Routen (400).
- `pruefeImBasisstand(wurzel, basisCommit, vorschlaege)` (q1) — async, wirft nie ⇒ `Map pfad → 'neu' | 'geaendert' |
  'unveraendert' | null`. Ein Aufruf `git --no-optional-locks ls-tree -r -z <basis> -- vorschlaege/faehigkeiten` über
  `fuehreGitAsync` (F-1000, Zeitgrenze 5 s). Kein Eintrag unter dem Vorschlagspfad ⇒ `neu` (häufiger Fall, ein git-Aufruf). Sonst
  Vergleich ohne zweiten git-Aufruf: Dateiliste des Vorschlags (Agent: die Datei; Skill: der begrenzte Durchlauf aus der
  Erkennung) gegen die Pfade im Baum, je Datei Blob-Kennung der Bytes in JS (`blob <len>\0` + Bytes, sha1 bzw. sha256 nach
  Länge der Kennung im Baum) — gleich wie `hash-object --no-filters`, kein Filter-Treiber, kein Index. Gleich in Pfaden und
  Blobs ⇒ `unveraendert`. `basisCommit` null/kein Hex, git-Fehler, Abbruch ⇒ `null` (nicht bestimmbar). Grenze DEKLARIERT:
  mit `core.autocrlf=true` (CRLF in der Arbeitskopie, LF im Blob) gilt ein unveränderter Vorschlag als `geaendert` (sichtbar,
  nicht verborgen).
- Typ: `ProjektFaehigkeitenKontext.werkzeugNamen` wird `readonly string[] | null` (pruefeFrontmatter kennt null schon, O2) —
  für die Probe in 2.3 Schritt 12.

### 2.2 Projektion `GET …/abnahme` (FB-1a, ergänzt)

`baueVorschlagProjektion(wurzel, { basisCommit, … })`: Einträge mit `unveraendert` fallen weg; `null` ⇒ Eintrag bleibt, Grund
„Basisstand nicht bestimmbar — nicht übernehmbar“ (nur wenn grund noch null). Bleibt nichts, fehlt das Feld (bitgleich). Cache
wie bisher je Wurzel, Schlüssel jetzt Wurzel + basisCommit + je Vorschlag `ziel:hash` (ein geänderter Inhalt verwirft den
Eintrag); `check-ignore` und `ls-tree` teilen den Eintrag (cr1 teilweise: git gecacht, Erkennung weiter je Poll).
Server: die vorhandene Zeile übergibt `basisCommit` aus `ladeArbeitsordner(workflowId)` (Zeile geändert, nicht neu).

### 2.3 Routen in `scripts/leitstand/routen-faehigkeit-vorschlag.mjs`

- `erkenneVorschlagRoute(pfad)` — `^/api/workflows/([^/]+)/faehigkeit-vorschlag/(uebernehmen|verwerfen)$` ⇒ `{ rohId, aktion }`
  oder null. Keine Methode im Modul (f813 (4): auch kein `.method` in Kommentaren).
- `pruefeVorschlagKoerper(text)` — JSON-Objekt mit genau `typ` (`skill|agent`), `name` (`istSchreibbarerName`), `hash`
  (`SHA256_MUSTER`); sonst 400 (unbekanntes Feld, z. B. `projekt_id`, ⇒ 400).
- `fuehreVorschlagAktionDurch(route, bodyText, kontext)` async ⇒ `{ status, koerper, lokalHash? }`, fängt jeden Wurf.
  `kontext` vom Server: `lage(workflowId)`, `lokalPfad`, `waechter` (nur lesend: `pruefe`), `aendere(aenderung)` (Rückruf auf
  `aendereLokaleDatei`, Schreiben der lokalen Datei bleibt im Server-Closure, B10), `referenz` optional (Tests).
  Reihenfolge (beide Aktionen, wenn nicht anders gesagt):
  1. Kennung dekodieren, Zeichenregel/Länge wie `pruefeAblaufKennung` ⇒ 400. Körper ⇒ 400.
  2. `lage` null ⇒ 404. `lage.laufGesperrt` ⇒ 409 (instanzlokaler Lauf, Projekt-Aufruf, globaler Lauf — eine Funktion
     `laufGesperrtGrund()` im Server, auch von den Plugin-Routen benutzt). `lage.wurzel` null (kein Arbeitsordner, nicht BEREIT,
     Ordner fehlt, Vorbereitung/Aufräumen läuft, aufgeräumt) ⇒ 409.
  3. Nur Übernehmen (E-FB1-3): `abnahme.faellig && (abnahme.offen || (abnahme.entscheidungStatus === 'ok' && abnahme.ergebnis
     === 'ANGENOMMEN'))`, sonst 409. Verwerfen ohne diese Bedingung.
  4. Erkennung frisch (`erkenneFaehigkeitVorschlaege`), Eintrag mit genau `typ` und `name` ⇒ fehlt 404.
  5. q1 frisch (`pruefeImBasisstand`, ohne Cache): `unveraendert` ⇒ 404 „liegt unverändert im Basisstand“; `null` ⇒ 409.
  6. `hash` null ⇒ 409 (nicht vollständig gelesen, z. B. Verknüpfung/zu groß — von Hand entfernen); `hash ≠ body.hash` ⇒ 409
     (Drift, neu laden). Verwerfen erlaubt einen Vorschlag mit `grund` (ungültige Vorschläge sollen weg können), Übernehmen nicht.
  7. Nur Übernehmen: `grund` ⇒ 409; `ziel_existiert` ⇒ 409 (nie überschreiben); `pruefeZielIgnoriert` frisch: `true` ⇒ 409 B13,
     `null` ⇒ 409.
  8. Nur Übernehmen, vor jeder Dateibewegung (B3, Muster `aendereLokaleDatei`): `lokalPfad` null ⇒ 409; Datei ungültig ⇒ 409;
     `waechter.pruefe(hashLokaleDatei)` ⇒ 409 FREMD_UNBESTAETIGT; `<typ>:<name>` (ohne Unterschied der Schreibweise) in `an`
     ⇒ 409 „wäre sofort aktiv“; in `inhalt_freigaben` mit anderem Hash ⇒ 409 „würde die bestehende Freigabe überschreiben“;
     gleicher Hash ⇒ weiter (idempotent).
  9. B6 Quelle: `realWurzel = realpathSync.native(wurzel)`; lstat-Kette `vorschlaege`, `vorschlaege/faehigkeiten`,
     `…/skills|agents` (Ordner, keine Verknüpfung), Vorschlag selbst (Skill Ordner / Agent Datei, keine Verknüpfung);
     `relative(realWurzel, realpathSync.native(quelle))` = erwarteter Pfad (Segmente ohne Unterschied der Schreibweise, nie `..`,
     nie absolut) ⇒ sonst 409.
  10. B6 Ziel (nur Übernehmen): `.claude`, dann `.claude/skills|agents` einzeln: fehlt ⇒ `mkdirSync` **nicht rekursiv**; danach
      lstat (Ordner, keine Verknüpfung) und `relative(realWurzel, realpathSync.native(…))` = `.claude` bzw. `.claude/<x>` ⇒ sonst
      409 (angelegte leere Ordner werden best effort wieder entfernt). Ziel selbst per lstat `ENOENT`, sonst 409.
  11. Bewegen (B9): Skill `renameSync(quelle, ziel)` (ein Ordner-Rename zerstört nie Inhalt: POSIX ersetzt höchstens einen
      leeren Ordner, sonst ENOTEMPTY; Windows scheitert an vorhandenem Ziel). Agent `copyFileSync(quelle, ziel, COPYFILE_EXCL)`
      (EEXIST atomar, auch gegen fremde Prozesse), die Quelle bleibt bis Schritt 13. Fehler ⇒ 409 „nichts übernommen“.
  12. Probe am Ziel (q4 + Hash am Ziel, schließt das Zeitfenster seit Schritt 4): `ermittleProjektFaehigkeiten(wurzel, { katalog:
      leer, einstellungen: { an: [s], aus: [], inhalt_freigaben: { [s]: hash } }, werkzeugNamen: null, referenz })` — `s` muss
      `aktiv` sein (Hash am Ziel = body.hash, Frontmatter, kein Unterordner, kein eingebauter Name) und `hindernis` null
      (Mehrdeutigkeit über Frontmatter-Namen anderer Dateien, Agents in Unterordnern, Commands, Verknüpfungen unter .claude —
      dieselbe Regel wie am Start). Sonst Rücknahme, 409 „würde am Start gesperrt: …“.
  13. Agent: `unlinkSync(quelle)`; Fehler ⇒ Ziel entfernen, 409.
  14. `aendere({ art: 'freigabe', eintrag: s, hash })` (prüft Wächter und Gültigkeit selbst erneut); nicht ok ⇒ Rücknahme
      (Skill `renameSync(ziel, quelle)`, Agent `copyFileSync(ziel, quelle, EXCL)` + `unlinkSync(ziel)`), 409 mit dessen Grund.
  15. Leere Behälter `…/skills|agents`, `vorschlaege/faehigkeiten`, `vorschlaege` best effort `rmdirSync` (nur leer).
  16. Erfolg Übernehmen: `200 { typ, name, hash, ziel, eingeschaltet: false, hinweis }` + `lokalHash` (Server ruft
      `waechter.nachRoute`). Verwerfen nach 9: Skill `rmSync(quelle, { recursive: true })` (folgt keiner Verknüpfung), Agent
      `unlinkSync`; Fehler ⇒ 409; `200 { typ, name, verworfen: true }`. Die lokale Datei bleibt beim Verwerfen bitgleich.
  - Rücknahme scheitert (Schritt 12–14) ⇒ **500** mit beiden Orten (`quelle`, `ziel`) und Log (B9); ohne Freigabe ist der Inhalt
    nicht aktiv (fail-closed). Ein unerwarteter Wurf außerhalb dieser Schritte ⇒ 500 mit Log (Programmfehler, kein Bedienfall).
- B4 (Entscheidung, siehe 3): `hinweis` = „Im Arbeitsordner liegt die Fähigkeit jetzt ungesichert unter .claude/ — vor einem
  weiteren Lauf in diesem Ablauf sichern (Bereit zum Sichern), sonst wird ein Lauf mit Fähigkeiten, Ort-B-Skill oder Plugin rot.“

### 2.4 Server (`scripts/leitstand-server.mjs`, nur Registrierung, netto ≤ 0)

Vor `GET …/abnahme` (Zwischenmuster E-FB1-2): `const vorschlagRoute = erkenneVorschlagRoute(pfad)`; `req.method !== 'POST'` ⇒ 405;
`lage` als Pfeilfunktion (Workflow laden, `ermittleLaufort`, Arbeitsordner bereit und keine Vorbereitung, `basis_commit` aus
`ladeArbeitsordner`, `ermittleAbnahmeStand` + `ergebnis`, `laufGesperrtGrund()`); `aendere` als Rückruf; `nachRoute(lokalHash)`;
`sendeJson`. Körper über `leseBody(req)` mit `.catch` ⇒ 400 im Modul. ≈ +22 Zeilen; `laufGesperrtGrund` ersetzt die
Pfeilfunktion der Plugin-Routen (≈ +2). Ausgleich: `ermittleFreigabeAbschwaechungen` (rein, 48 Zeilen mit Doku, nur der Server
nutzt sie) unverändert nach `scripts/leitstand/freigabe-abschwaechung.mjs` mit Test. Netto ≈ −23; Grenze in
`scripts/wachstumsbremse-server.json` auf das Ist. `starteWorkflowSchritt(` bleibt 6×.

### 2.5 Gate `scripts/check-f45-fb1b-faehigkeit-uebernehmen.mjs`

Muster FB-1a-Gate (tmp-Repo auf main, Arbeitsordner über den echten Startweg, Attrappen-Worker, lokale Datei im tmp, git ohne
globale Konfiguration). Neue Funktionen dynamisch (auf main ⇒ Befund je Fall). Fälle:
(u1) Skill übernehmen ⇒ 200, Ziel da (Hash = Start-Hash), Vorschlag weg, `inhalt_freigaben` gesetzt, `an` unverändert, Wächter
ohne Fremdmeldung (zweite Übernahme gelingt); (u2) Agent ebenso; (b3) `an` enthält den Schlüssel bzw. andere Freigabe ⇒ 409,
nichts bewegt, Datei bitgleich; (h) Hash-Drift ⇒ 409; (z) Ziel existiert in anderer Schreibweise ⇒ 409; (i) Ziel gitignoriert
⇒ 409 mit dem Wortlaut B13; (q1) getrackter unveränderter Vorschlag im Basis-Commit ⇒ fehlt in der Projektion, Route 404; nach
Änderung sichtbar; (q4) Agent-Name kollidiert mit Frontmatter-Namen eines Agents in einem Unterordner ⇒ 409, Vorschlag wieder
an seinem Ort, Ziel fehlt; (q9) `con`/`x.` ⇒ 400; (s) `.claude` als Verknüpfung auf einen fremden Ordner ⇒ 409, fremder Ordner
unverändert (übersprungen mit Meldung, wenn keine Verknüpfung anlegbar); (a) Übernehmen bei nicht abgeschlossenem Ablauf ⇒ 409,
nach ANGENOMMEN ⇒ 200, nach ABGELEHNT ⇒ 409, Verwerfen nach ABGELEHNT ⇒ 200; (l) Lauf aktiv (`globalerLaufZustand`) ⇒ 409
beide; (o) ohne Arbeitsordner (Bestand) ⇒ 409; (v) Verwerfen ⇒ Vorschlag weg, lokale Datei bitgleich, auch mit Grund;
(k) unbekanntes Feld ⇒ 400, GET ⇒ 405, unbekannter Ablauf ⇒ 404, kaputte Kennung ⇒ 400; (c) CSRF: fremde Herkunft (Origin bzw.
Sec-Fetch-Site) ⇒ 403 direkt und über `/api/projekte/<pid>/…` (echter Dispatcher), nichts bewegt; (r) Rücknahme: `aendere`
scheitert ⇒ 409, Vorschlag zurück, Ziel fehlt; Rücknahme scheitert ⇒ 500 mit beiden Orten (direkter Aufruf mit Rückruf-Attrappe);
(b4) nach Übernahme meldet `leseClaudeAenderungen(arbeitsordner)` das Ziel (Wechselwirkung real, Hinweis nötig), nach einem
Commit im Arbeitsordner nicht mehr; (e) `starteWorkflowSchritt(` 6×. Rot-Nachweis: Gate in einer `git archive`-Kopie von main ⇒
jeder Fall rot mit eigenem Befund.
Unit-Tests (plattformneutral: Pfade nur über `join`/`mkdtemp`, Enthaltensein über `relative()`): `vorschlag.test.ts`
(istSchreibbarerName, pruefeImBasisstand neu/geändert/unverändert/nicht bestimmbar), `routen-faehigkeit-vorschlag.test.mjs`
(Erkenner, Körper, Abläufe mit Attrappen-Kontext inkl. Rücknahme), `freigabe-abschwaechung.test.mjs`.

### 2.6 Doku und Findings (E-FB1-4: knapp im Kern, Wortlaut im Detail; Deckel 17 800 B bleibt, Ist 17 565 B)

- Kern §1: „bis W2 entstehen keine neuen Routen (…F-1131)“ ⇒ „bis W2 neue Routen nur nach dem Zwischenmuster (Modul erkennt den
  Pfad, Server prüft die Methode hinter dem CSRF-Haken) — DEKLARIERT, CSRF-Probe je Route im Gate (F-1131)“. Detail
  `wachstumsbremse.md` gemeinsam, dort auch B10 (Modul darf im Arbeitsordner verschieben/löschen; lokale Datei nur über Rückruf).
- Kern §2 Arbeitsordner: Ausnahme „auf Klick übernimmt bzw. verwirft der Server einen Fähigkeit-Vorschlag (`.claude/` des
  Arbeitsordners) — Pfadprüfung ERZWUNGEN (Gate fb1b), Rest DEKLARIERT“. Detail `arbeitsordner.md` (Ablauf, B4-Grenze),
  `lokale-dateien.md` (neue Schreibroute der Freigabe nach Inhalt). Passt es nicht, wandert anderer Kerntext wörtlich ins Detail.
- Findings: F-1167 und F-1069 Stand (FB-1b erledigt, FB-2 Anzeige offen), F-1131 Nachtrag (erste Anwendung). Neu: P3
  PROCESS_IMPROVEMENT „Cloud-Prüfung FB-1a ohne Node 24 …“ (Wortlaut Auftrag, Entdeckt: Challenger 23.10.2026); TECH_DEBT B4 (c)
  „leseClaudeAenderungen vorher/nachher“ (eigenes Paket). `docs/STATUS.md`, `docs/projekt/fixpaket-f45.md`, danach
  `node scripts/erzeuge-lagebild.mjs`.

## 3 Entscheidungen in diesem Plan (nicht still)

- **B4 = (b) DEKLARIERT mit Hinweis**, nicht (a) Sperre und nicht (c) Umbau. Begründung: Folge ist fail-closed (ein Lauf wird
  rot, Grund `claude_ordner_veraendert` mit Pfad), kein Sicherheitsverlust; der übliche Weg ist Übernahme ⇒ Sichern (bei offener
  Abnahme ist „Bereit zum Sichern“ schon angeboten, nach ANGENOMMEN folgt kein Lauf mehr). Riskant ist nur Übernahme ⇒
  ANPASSUNG ohne Sichern ⇒ Lauf mit Ort-B/Fähigkeit/Plugin. (c) wäre die eigentliche Lösung (git-Weg vorher/nachher, gefiltert
  nur für `.claude/`-Pfade, die schon vorher im Laufdiff standen und die der Dateisystem-Vergleich abdeckt), ändert aber die
  Klassifikation im Controller — eigenes Paket (neues Finding). (a) ohne Zustand wäre eine Vorstart-Prüfung im Controller
  (`vorStartPruefung`): spart den teuren roten Lauf, bliebe aber im selben Ablaufzustand stecken wie heute.
- Verwerfen eines Vorschlags mit `grund` ist erlaubt, wenn sein Inhalt gelesen wurde (`hash` nicht null).
- Agent: `copyFileSync(COPYFILE_EXCL)` statt `linkSync` (Hardlinks fehlen auf FAT/exFAT; EXCL ist ebenso atomar).
- Statuscodes: alle Bedienfälle 4xx; 500 nur bei gescheiterter Rücknahme (B9) und bei einem unerwarteten Wurf.

## 4 Offene Punkte (für den Advisor)

- O1 Reicht `ermittleProjektFaehigkeiten` als Probe für q4, oder muss die Mehrdeutigkeit gegen den Projektordner geprüft werden
  (dort wird nach dem Merge eingeschaltet)? Plan: Arbeitsordner (Basis = main + Lauf), Projektordner bleibt lesend und ist nicht
  Ziel.
- O2 `pruefeImBasisstand` per eigener Blob-Kennung statt `hash-object` — trägt die Annahme „Blob = Hash der Bytes ohne
  Filter“ für sha256-Repos (Länge 64)?
- O3 Kernbytes: zwei Sätze ≈ 200 B bei 235 B Luft — knapp.

## 5 Risiken

Kleinster Pfad zur Datenzerstörung: Bewegen/Löschen im Arbeitsordner — begrenzt durch lstat-Kette, `realpath`+`relative()`,
nicht rekursives Anlegen, Hash-Gleichheit vor und nach dem Bewegen, EXCL bzw. Ordner-Rename, Rücknahme. Stefans Bestand
(`~/.claude`) wird nie berührt (Fall „.claude als Verknüpfung“). Die lokale Datei nur über `aendereLokaleDatei` (Wächter,
Gültigkeit). Kein Kontrollzustand, kein Workflow-Schreiber, kein Laufstart.
