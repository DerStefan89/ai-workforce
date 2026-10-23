# Advisor-Pass F45 FB-1b „Fähigkeit übernehmen/verwerfen“ (Plan v1)

Stand: 23.10.2026 · Prüfling `features/F45/plan-fb1b.md` · Subagent `architecture-advisor`, frischer Kontext. Bericht wörtlich
übernommen (abgelegt vom Autor des Plans, die Rollengrenze erlaubt dem Advisor kein Schreiben).

**Geprüfte Quellen:** ARCHITECTURE.md (Kern), `docs/architektur/wachstumsbremse.md`, `arbeitsordner.md`, `lokale-dateien.md`; `state/findings.md` F-1069 (:7769-7778), F-1131 (:8253-8261), F-1167 (:8595-8602); `features/F45/plan-fb1-v2.md`, `features/F45/advisor-fb1.md`; Code: `src/faehigkeiten/vorschlag.ts`, `index.ts` (setzeInhaltsfreigabe, pruefeFrontmatter, alleFrontmatterNamen, ermittleProjektFaehigkeiten), `types.ts`, `scripts/leitstand/routen-faehigkeit-vorschlag.mjs`, `routen-faehigkeiten.mjs`, `routen-plugin-freigabe.mjs`, `kennung.mjs`, `scripts/leitstand-server.mjs` (CSRF-Haken, GET/POST …/abnahme, ermittleLaufort, ermittleAbnahmeStand, laufSperreAnzeige, Plugin-Routen, ermittleFreigabeAbschwaechungen, leseBody/leseJsonBegrenzt, Aufräumen, Dispatcher), `src/execution-controller/index.ts`, `src/ausfuehrung-vorbedingung/index.ts`, `src/arbeitsordner/index.ts`, `src/review-stand/index.ts`, `src/git-starter/index.ts`, `scripts/check-f813-csrf.mjs`, `check-wachstumsbremse-server.mjs`, `check-f45-fb1-faehigkeit-vorschlag.mjs`, `scripts/architektur-kern.json`.

**Rollengrenze:** nur Read/Grep/Glob, kein Schreiben, kein Bash, kein Git.

**Wo das die Prüfung begrenzt:**
- Kernbytes nicht gemessen, nur von Hand gezählt.
- Kein Gate und kein Test gelaufen.
- Nicht gemessen unter Windows/Node 24: `renameSync`, `copyFileSync(COPYFILE_EXCL)`, `rmSync({recursive})`, `realpathSync.native`, `lstat` auf Junctions.
- sha256-Blob-Gleichheit nicht gegen echtes git geprüft.
- Nicht gelesen: Ort-B-Startweg (`leitstand-server.mjs` ≈ :3351-3379), Sichern-Befehle im Detail.

**Marker:** [Fakt] im Code belegt · [Schlussfolgerung] abgeleitet · [Annahme] unbelegte Prämisse · [offene Unsicherheit] nicht klärbar · [Fakt, entlastend] geprüft und in Ordnung.

## Befunde

**1 · Hoch · Lücke über die `await`s: geprüft wird vor, geschrieben nach den asynchronen Schritten. Vor Baubeginn.**
- [Fakt] Laufsperre, Arbeitsordner und Vorbereitung/Aufräumen prüft Schritt 2 (Plan :55-57). Erkennung und Hash prüfen die Schritte 4 und 6 (:60-63). Danach kommen zwei `await`s: `pruefeImBasisstand` in Schritt 5 (:61) und `pruefeZielIgnoriert` in Schritt 7 (:64-65), je bis 5 s. Erst danach wird bewegt und geschrieben (Schritte 11-14).
- [Fakt] Die Aufräumen-Route kann in dieser Lücke beginnen. Sie prüft nur `laufAktiv`/`arbeitsordnerVorbereitungLaeuft` und trägt sich erst danach ein (`scripts/leitstand-server.mjs:12134-12151`). Laufstarts setzen `globalerLaufZustand` (z. B. :7458).
- [Fakt] Es gibt ein Vorbild: Die Plugin-Freigabe prüft die Laufsperre unmittelbar vor dem synchronen Schreiben noch einmal (`scripts/leitstand/routen-plugin-freigabe.mjs:246-248`, Advisor F6).
- [Schlussfolgerung] Eine Freigabe in `faehigkeiten.lokal.json` während eines Laufs verstößt gegen Kern §2 („gesperrt während eines Laufs“, ARCHITECTURE.md:77). Eine Verschiebung in einen Worktree, der gerade entfernt wird, ist möglich.
- [Schlussfolgerung] Beim Verwerfen kann in derselben Lücke eine Verknüpfung in den Skill-Ordner gelegt werden, bevor `rmSync` läuft.
- Korrektur:
  - Zuerst alle `await`s erledigen: den Basis-Baum per `ls-tree` lesen (hängt nur von Basis und Vorschlagspfad ab) und `check-ignore` für den Zielpfad (hängt nur vom Namen ab).
  - Danach ein einziger synchroner Block, in dieser Reihenfolge:
    1. `lage()` neu: `laufGesperrtGrund()`, `arbeitsordnerVorbereitungLaeuft`, Wurzel, Abnahme.
    2. Erkennung frisch.
    3. Hash gleich `body.hash`.
    4. q1-Vergleich in JS gegen den vorab gelesenen Baum.
    5. B3, B6, Bewegen, Probe, `aendere`.
  - `pruefeImBasisstand` dafür teilen: asynchron „Baum lesen“, synchron „vergleichen“.
  - Die Invariante „ab hier kein await“ in den Plan schreiben und mit einem Unit-Test belegen (die `lage`-Attrappe wechselt zwischen zwei Aufrufen).

**2 · Mittel · Windows-Alias der Ablaufkennung umgeht die Sperre „Vorbereitung/Aufräumen läuft“. Vor Baubeginn.**
- [Fakt] Schritt 1 prüft nur die Zeichenregel (Plan :54; `scripts/leitstand/kennung.mjs:32-37`). `loeseCodeOrt` verlangt zusätzlich `version.daten?.workflow_id === roh` (`leitstand-server.mjs:6358`). Der Kommentar dort nennt den Grund: „Windows-Alias … andere Schreibweise, Punkt am Ende“ (:6347).
- [Schlussfolgerung] Eine Kennung in anderer Schreibweise lädt unter NTFS dasselbe Artefakt. `arbeitsordnerVorbereitungLaeuft.has(alias)` ist dann aber `false`.
- Korrektur: in `lage` die Identitätsprüfung wie `loeseCodeOrt` einbauen (404). Gate-Fall unter (k).

**3 · Mittel · O1/q4: Die Probe schaltet nur den neuen Eintrag ein. Darf mitlaufen, wenn DEKLARIERT.**
- [Fakt] Mehrdeutigkeit prüft der Start nur für aktive Einträge (`src/faehigkeiten/index.ts:764-776`).
- [Fakt] Lose Namen zählen jede eingerückte `name:`-Zeile im Frontmatter mit (:512), auch in einer Block-description. Der strenge Leser lässt solche Fortsetzungszeilen zu (:548-551).
- [Schlussfolgerung] Ein neuer Agent mit einer Zeile `  name: pruefer` in der description macht ein schon aktives `agent:pruefer` mehrdeutig. Der nächste Start ist dann gesperrt. Die Probe mit `an: [s]` (Plan :81) sieht das nicht.
- [Schlussfolgerung, entlastend] O1: Für diese Route ist der Arbeitsordner der richtige Ort, denn das Ziel liegt dort. Im Projektordner prüft der Start erneut, fail-closed.
- Korrektur, eine von drei Varianten: (a) Probe vorher/nachher mit allen gefundenen Einträgen aktiv (`inhalt_freigaben` = eigener Hash); 409 nur bei einem neuen Hindernis. (b) Probe mit den echten Einstellungen plus s und echtem Katalog. (c) Die Grenze DEKLARIEREN.

**4 · Mittel · O3: Die Kernbytes reichen voraussichtlich nicht. Vor Baubeginn den Wortlaut festlegen.**
- [Annahme] Ist 17 565 B, Deckel 17 800 B (`scripts/architektur-kern.json:2`); nicht gemessen.
- [Schlussfolgerung, Handzählung] Der neue §1-Satz (Plan :132-133) ersetzt ≈ 82 B durch ≈ 174 B, also ≈ +92 B. Der §2-Satz (:135-136) bringt ≈ +160 B. Zusammen ≈ +250 B bei 235 B Luft.
- [Fakt] §2 sagt „löscht der Kern ausschließlich … Löschliste …, nie unter … `.claude/`“ (ARCHITECTURE.md:92-93). Das Verwerfen braucht dazu eine eigene, ausdrückliche Ausnahme.
- Korrektur: knappere Sätze. Nach E-FB1-4 vorab benennen, welcher Kerntext wörtlich ins Detail wandert (z. B. die Klammer „Kollision mit `check-f813-csrf` (4)“). Danach messen.

**5 · Mittel · Der Rot-Nachweis „jeder Fall rot“ stimmt so nicht. Darf mitlaufen.**
- [Fakt] Der CSRF-Haken lehnt jede fremde POST-Anfrage ab, auch auf main und ohne Route (`leitstand-server.mjs:8172-8178`). Fall (c) ist auf main deshalb grün.
- [Fakt] `starteWorkflowSchritt(` steht auf main 6× im Server, Fall (e) ist dort also grün.
- [Fakt] Auf main liefert ein unbekannter POST-Pfad 404 als text/plain (:12799). „Unbekannter Ablauf ⇒ 404“ in (k) ist deshalb grün, wenn das Gate nur den Status prüft.
- Korrektur: JSON-`grund` prüfen. (c) und (e) als „auf main grün“ führen, mit Sabotage-Kopie (Route vor dem Haken), wie (p2)/(p3) in FB-1a (`check-f45-fb1-faehigkeit-vorschlag.mjs:17-19`).

**6 · Mittel · Zuschnitt grenzwertig. Darf mitlaufen, mit Kürzung.**
- [Fakt] Umfang: 16-Schritt-Ablauf mit drei Rücknahmepfaden, zwei Erweiterungen in `vorschlag.ts`, Projektion mit neuem Cache-Schlüssel, Umbau der Plugin-Sperre, Auslagerung mit Test, Gate mit ≈ 20 Fällen plus Rot-Nachweis, drei Testdateien, Kern §1/§2 und drei Detaildateien, vier Findings.
- [Schlussfolgerung] Die Korrekturrunde entsteht voraussichtlich an den Windows-Dateioperationen. Die Kürzung aus Befund 7 und der synchrone Block aus Befund 1 nehmen Rücknahmepfade heraus. Dann trägt „ein Baudurchgang + eine Korrekturrunde“ knapp.

**7 · Niedrig · Agent-Reihenfolge vereinfachen. Darf mitlaufen.**
- [Schlussfolgerung] Reihenfolge Kopie (EXCL) → Probe → `aendere` → `unlinkSync(quelle)`. Damit ist die Rücknahme vor dem Löschen nur noch `unlinkSync(ziel)`; das Zurückkopieren in Schritt 14 (Plan :87) entfällt.
- [Schlussfolgerung] Scheitert das Löschen der Quelle danach, bleibt der Vorschlag mit `ziel_existiert` stehen und lässt sich verwerfen. Das ist harmlos.

**8 · Niedrig · O2 `pruefeImBasisstand`. Darf mitlaufen.**
- [Fakt] `parseLsTree` (40–64 Hex) und die festen Argumente `-c core.quotePath=false -c core.fsmonitor=false` mit `LC_ALL=C` gibt es schon (`src/review-stand/index.ts:70-75`, `:98-106`). Wiederverwenden statt neu schreiben.
- [Annahme] sha256-Repos benutzen denselben Kopf `blob <len>\0`; nur die Hash-Funktion ist anders. Die Auswahl nach Länge trägt.
- Korrektur: Unit-Test gegen echtes `git hash-object --no-filters`, auch mit `git init --object-format=sha256` (überspringen mit Meldung, wenn git zu alt ist). Nur Typ `blob` werten; Modus 120000/160000 ⇒ `geaendert` bzw. `null`.
- [Fakt, entlastend] Die autocrlf-Grenze trifft den Arbeitsordner praktisch nicht. `worktree add` läuft mit `-c core.autocrlf=false -c core.eol=lf` (`docs/architektur/arbeitsordner.md:16-18`; `src/arbeitsordner/index.ts:434`, `:437`).
- [Fakt] Die Dateiliste des begrenzten Durchlaufs (`durchlaufeBegrenzt`) ist nicht exportiert (`vorschlag.ts:114`). Die API muss sie liefern.

**9 · Niedrig · Typ `werkzeugNamen: readonly string[] | null` wird für den Startweg weiter. Darf mitlaufen.**
- [Fakt] `ProjektFaehigkeitenKontext` ist die Schnittstelle des Starts (`src/faehigkeiten/types.ts:92-95`).
- [Schlussfolgerung] Übergibt ein künftiger Aufrufer am Start `null`, fällt die Prüfung „tools im Werkzeugsatz“ still weg.
- Korrektur: Der Server gibt der Probe die echten Namen des Werkzeugsatzes `schreibend` (`werkzeugNamenAus`). Damit fängt die Probe auch fremde `tools` ab, wie der Start. Alternativ `null` nur mit Dokumentation „nur Probe“.

**10 · Niedrig · Verwerfen mit `rmSync({recursive})`. Darf mitlaufen.**
- [offene Unsicherheit] Wie das native `rmSync` in Node 24 Junctions behandelt, ist nicht geprüft.
- [Fakt, entlastend] Eine Verknüpfung im Skill-Ordner ergibt in der Erkennung `hash: null` (`vorschlag.ts:136`, `:240`), also 409 in Schritt 6. Mit Befund 1 liegt die Erkennung im selben synchronen Block.
- Korrektur: `maxRetries` für Windows (EBUSY) mitgeben, oder bottom-up löschen anhand der Dateiliste aus dem begrenzten Durchlauf.

**11 · Niedrig · Rest-TOCTOU nach der lstat-Kette nicht deklariert. Darf mitlaufen.**
- [Fakt] FB-1a deklariert sein Zeitfenster ausdrücklich (`vorschlag.ts:20-21`).
- Korrektur: Für den Schreibweg denselben DEKLARIERT-Satz ergänzen (fremder Prozess ohne laufenden Lauf). Gate (s) erweitern: `.claude/skills` als Junction (zweite Ebene) und ein Behälter unter `vorschlaege/` als Junction.

**12 · Niedrig · f813 (4) liest auch Testdateien. Darf mitlaufen.**
- [Fakt] Geprüft werden alle `*.mjs` unter `scripts/leitstand/` (`check-f813-csrf.mjs:298-301`, Ableitung :120). Dazu gehören `routen-faehigkeit-vorschlag.test.mjs` und `freigabe-abschwaechung.test.mjs`.
- Korrektur: Auch in den Tests kein `.method` (z. B. in einer Request-Attrappe) und keine Zeile `req.method === 'POST'`.

**13 · Niedrig · Kleinere Punkte. Darf mitlaufen.**
- [Fakt] `leseBody` hat keine Größengrenze (`leitstand-server.mjs:5608-5617`). Vorhanden ist `leseJsonBegrenzt(req, maxBytes)` (:5584), z. B. mit 4 KiB.
- [Fakt] `aendereLokaleDatei` meldet einen Schreibfehler mit 500 (`routen-faehigkeiten.mjs:403`); der Plan bildet ihn auf 409 ab (:87). Im Plan benennen.
- [Fakt] E-FB1-3 verlangt, „Review veraltet“ zu benennen (`plan-fb1-v2.md:14-16`). Plan v1 erwähnt es nicht. In `hinweis` bzw. `arbeitsordner.md` aufnehmen.
- [Schlussfolgerung] FB-1b hat keine Oberfläche: Der B4-`hinweis` sieht niemand vor FB-2. Als Pflicht in F-1167/FB-2 eintragen.
- [offene Unsicherheit] q9: `com0`/`lpt0` vorsorglich mit aufnehmen (kostet nichts).
- [Fakt] B10: Kern ARCHITECTURE.md:58-59 sagt allgemein „schreibende Aufrufe bleiben im Server“. Ein Vorbild für Schreiben im Modul gibt es schon: `schreibeKopie` (`routen-plugin-freigabe.mjs:242`). Die Präzisierung im Detail trägt; der Kern bleibt mehrdeutig. In `wachstumsbremse.md` ausdrücklich benennen.

## Geprüft und in Ordnung

- [Fakt, entlastend] Zwischenmuster: Der CSRF-Haken greift für jede Methode außer GET/HEAD vor jeder Route (`leitstand-server.mjs:8172-8178`). f813 (3) sieht nur `req.method === '<X>'` (`check-f813-csrf.mjs:134`); `!== 'POST'` erzeugt also keinen Befund „nicht ableitbar“. Die Wachstumsbremse erhebt nur Literale an `pfad` (`check-wachstumsbremse-server.mjs:49-62`); `erkenneVorschlagRoute(pfad)` sieht sie nicht. Das entspricht dem DEKLARIERT in F-1131. Keine frühere Route fängt `/faehigkeit-vorschlag/…` ab (Liste `startsWith/endsWith` bei :8637-12432); die Lage vor GET …/abnahme passt.
- [Fakt, entlastend] Der Dispatcher setzt `/api/projekte/<id>/…` wieder zu `/api/…` zusammen (:13081-13099). Die CSRF-Probe über den echten Dispatcher ist realistisch.
- [Fakt, entlastend] Die Gate-Fälle lassen sich real erzeugen: ANGENOMMEN lässt ABGESCHLOSSEN stehen (:12646-12654), daraus folgt `entscheidungStatus 'ok'` (:2143). ABGELEHNT setzt GESTOPPT (:12620-12627), daraus folgt `faellig: false` (:2144). Die Begründung ist Pflicht (:12534). `globalerLaufZustand` lässt sich als Option übergeben (:5695); `projektId` ist standardmäßig `'ai-workforce'` (:5733). Die Optionen `faehigkeitenLokalPfad` und `faehigkeitenLokalWaechter` gibt es (:13227). „Rücknahme scheitert“ lässt sich plattformneutral auslösen: die `aendere`-Attrappe legt eine Datei an `quelle` an.
- [Fakt, entlastend] B4 ist jetzt belegt (löst die offene Unsicherheit aus `advisor-fb1.md` B4): Ein Start im Arbeitsordner verlangt keinen sauberen Baum, nur den richtigen Branch (`src/ausfuehrung-vorbedingung/index.ts:96-113`). `leseClaudeAenderungen` wertet absolut aus (`src/execution-controller/index.ts:173-199`, Aufruf :647-650). Ein Ort-B-Lauf nach einer Übernahme wird deshalb rot (fail-closed). Der Dateisystem-Vergleich arbeitet vorher/nachher und ist nicht betroffen (:235-242). Entscheidung (b) mit `hinweis` plus TECH_DEBT für (c) ist für FB-1b vertretbar.
- [Fakt, entlastend] E-F45-6 bleibt gewahrt: `setzeInhaltsfreigabe` ändert `an` nie (`src/faehigkeiten/index.ts:266-269`). `aendereLokaleDatei` prüft Wächter und Gültigkeit und schreibt atomar (`routen-faehigkeiten.mjs:388-406`; `index.ts:351-362`).
- [Fakt, entlastend] `basis_commit` ist bei BEREIT immer Hex (`src/arbeitsordner/index.ts:469`, Schema :192).
- [Fakt, entlastend] Git läuft über `fuehreGitAsync` mit Zeitgrenze (`src/git-starter/index.ts:141-195`). `ls-tree` ist Plumbing, wie Kern §2 es verlangt (ARCHITECTURE.md:94-95).
- [Fakt, entlastend] `ermittleFreigabeAbschwaechungen` ist rein und wird nur im Server genutzt (`leitstand-server.mjs:2178`, `:9772`); kein Gate verweist darauf. Die Auslagerung trägt. Den Kopfkommentar :374 nachziehen.
- [Schlussfolgerung, entlastend] B6 Windows: Die Junction-Erkennung per `lstat` belegt FB-1a schon (Gate e3, `check-f45-fb1-faehigkeit-vorschlag.mjs:134-150`). Beide Seiten über `realpathSync.native` zu normalisieren ist richtig (nicht native mit JS-realpath mischen). `relative()` vergleicht unter win32 ohne Groß-/Kleinschreibung. Nicht rekursives Anlegen mit `lstat` danach schließt den Fall „`.claude` als Junction“ aus.
- [Annahme, plausibel] Ein Ordner-Rename zerstört nie Inhalt: POSIX ersetzt höchstens einen leeren Ordner (ENOTEMPTY/ENOTDIR), Windows ersetzt keinen vorhandenen Ordner. `COPYFILE_EXCL` ist atomar (O_EXCL bzw. CopyFileW mit failIfExists) und löscht bei EEXIST das vorhandene Ziel nicht. [offene Unsicherheit] libuv-Verhalten nicht gemessen. Unit-Test: Ziel vorhanden, nicht leer ⇒ bitgleich.
- [Fakt, entlastend] B13 (409 fail-closed), q1, „netto ≤ 0“ (≈ −23 rechnerisch plausibel), `starteWorkflowSchritt(` 6× und „4xx außer Rücknahme scheitert“ sind umsetzbar wie vorgegeben.

## Urteil

**Nicht freigegeben.** Der Ansatz trägt: Zwischenmuster, Rückruf für die lokale Datei, nie überschreiben, Probe am Ziel, B4 als
(b) belegt. Zwei Punkte gehören aber vorher in den Plan: Befund 1 betrifft den Kern der Reihenfolge, nach der ausdrücklich
gefragt war — zwischen Prüfung und Schreiben liegen `await`s; das kann gegen die Kernregel „lokale Datei gesperrt während eines
Laufs“ verstoßen und mit dem Aufräumen kollidieren; ein Vorbild für die Lösung gibt es im Repo. Befund 4: der Kernsatz passt nach
Zählung nicht unter den Deckel. Beide Befunde und Befund 2 lassen sich mechanisch einarbeiten.

**Vor Baubeginn:** 1, 2, 4. **Darf mitlaufen:** 3 (wenn DEKLARIERT), 5–13.

## Nächster sinnvoller Schritt

Plan v2 (`features/F45/plan-fb1b-v2.md`): Befund 1 (erst alle `await`s, dann ein synchroner Block ab dem frischen `lage()`;
`pruefeImBasisstand` geteilt), Befund 2 (Identitätsprüfung der Kennung), Befund 4 (Kernwortlaut gekürzt und gemessen, verschobener
Kerntext benannt), Befunde 5, 7, 8, 12 einarbeiten, zu Befund 3 eine Variante wählen ((a) bevorzugt, sonst DEKLARIERT). Bleibt es
bei diesen Änderungen, reicht ein kurzer Delta-Advisor-Pass nur auf die neue Reihenfolge der Schritte; ein voller Pass ist nicht
nötig.
