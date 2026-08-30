# Advisor-Findings — Feature F3: Authorization Boundary (minimal)

Slug: f3-authorization-boundary
Stand: 2026-08-30
Rolle: Architecture Advisor, frischer Kontext, Subagent `architecture-advisor`

## Kopf

**Geprüft:**
- `state/plan-v1-f3-authorization-boundary.md` (vollständig)
- `features/F3/feature.md` (vollständig — Ziel/Scope/Nicht-Ziele/AC1-8, Dependencies)

**Gegengeprüft (real gelesen, nicht aus dem Plantext übernommen):**
`docs/projekt/zielfassung.md` §16.2 (Modulschnitt-Tabelle, Zeile 331),
§16.3 (Zustandsablage, Zeilen 341-344), Zeile 50 (P2/E-177/E-189), Zeile
215 (E-189 vollständig), Zeile 318 (D16), Zeile 320 (Bewusste
Nicht-Anforderungen), §16.4-16.8 (Zeilen 346-378); `ARCHITECTURE.md`
Abschnitt 2 (Zeilen 36-44), Abschnitt 3 „Auth" (Zeilen 45-54), Abschnitt 4
„Fehlerbehandlung" (Zeilen 56-64); `docs/projekt/umsetzungsplan-fassung-1.md`
(Zeilen 61-75, Deliverable 2/3); `src/checkpoint-store/types.ts`
(vollständig); `src/checkpoint-store/index.ts` (vollständig, insbesondere
Zeilen 530-592 `schreibeWirkungsmarke`, Zeilen 672-756
`stelleLaufstatusFest`); `src/lineage-registry/index.ts` (Zeilen 1-30,
83-148, Hashing-Präzedenz `sha256Hex` vs. `kanonischesJson`);
`features/F1B/feature.md` (vollständig); `features/F2/feature.md`
(Existenz geprüft, Pfad vorhanden, nicht inhaltlich benötigt für die
Befunde unten); CLAUDE.md (Abschnitt „Bekannte Fallen", OneDrive-
Reparse-Points und CRLF/LF); `state/advisor-findings-f1b-wirkungsmarke.md`
und `-v2.md` (als Formatvorlage).

**Rollengrenze:** Nur `Read`, `Grep`, `Glob`. Kein Schreibzugriff, kein
Bash, kein Git, keine Ausführung — keine Datei geändert.

**Grenze der Prüftiefe (wichtig für B4/B5 unten):** Ich kann `git show`,
`git init`, `core.autocrlf`-Verhalten oder das Anlegen eines
Wegwerf-Repos in dieser Rolle nicht selbst ausführen. Die Aussagen zu
Git-Blob-Verhalten (B4) stützen sich auf dokumentiertes, allgemein
bekanntes Git-Verhalten (Checkout-Filter wirken auf Arbeitsbaum-Operationen,
nicht auf `git show`/`cat-file`-Objektlesen), nicht auf einen realen Testlauf
in dieser Umgebung — als `[Schlussfolgerung]`, nicht `[Fakt]`, markiert. Das
externe Repo `C:\Users\stefa\ai-workforce-autorisierung\` existiert laut
Auftrag noch nicht; ich konnte es nicht inspizieren.

## Marker-Legende

`[Fakt]` im Code/Dokument belegt · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]` weder
belegt noch widerlegt · `[Fakt, entlastend]` geprüft und in Ordnung.

---

## Befunde

### B1 — D2/D3 schließen „Veränderung", aber nicht „Erzeugung": das zentrale Sicherheitsversprechen des Plans ist teilweise unbelegt
`[Fakt]` + `[Schlussfolgerung]` — **Schwere: hoch, zentraler Prüffokus laut Budget-Abschnitt**

`docs/projekt/zielfassung.md:50` (P2/E-177/E-189, vom Plan selbst in
Abschnitt 0 zitiert): „Autorisierungsartefakte entstehen ausschließlich aus
direkter menschlicher Eingabe, und ihre Bezeugung muss gegen **Erzeugung
und Veränderung** durch das Ausführungswerkzeug geschützt sein." Gleicher
Doppelbegriff wörtlich in Zeile 215 (E-189). Der Plan zitiert diesen
Doppelbegriff selbst korrekt (plan-v1 Zeilen 27-35), löst ihn aber nur zur
Hälfte ein:

- **Veränderung** (nachträgliche Manipulation einer bereits committeten
  Datei) wird tatsächlich abgedeckt: `git show <hash>:<pfad>` liest den
  unveränderlichen Objektinhalt zum referenzierten Commit, ein Abgleich
  gegen den Arbeitsbaum deckt genau die in D3 beschriebene
  Divergenz-Lücke (plan-v1 SCOPE.4, Zeilen 144-160). Das ist real und
  korrekt.
- **Erzeugung** (dass die Datei überhaupt von einem Menschen und nicht vom
  Werkzeug selbst committet wurde) bleibt vollständig ungeprüft. Ein
  Git-Commit trägt zwar Autor-/Committer-Felder, aber diese sind trivial
  fälschbar (`git config user.name`/`--author`) und werden vom Plan an
  keiner Stelle geprüft — kein Signatur-Mechanismus (GPG/SSH-Signing), kein
  Autor-Whitelist-Check, keine sonstige Bindung an eine echte menschliche
  Identität ist vorgesehen. `pruefeAutorisierung` prüft nur: „stimmt der
  Inhalt am Pfad X im Commit Y mit dem referenzierten Hash überein" — nicht
  „wurde Commit Y von einem Menschen erzeugt".

Der Plan selbst räumt in Abschnitt 3 („NICHT", Zeilen 206-223) ein, dass der
externe Ordner „innerhalb `C:\Users\stefa\` und damit potenziell vom
Ausführungswerkzeug technisch erreichbar" ist — also technisch auch
beschreibbar. Konsequenz, die der Plan nicht auszieht: Ein Ausführungswerkzeug
mit dieser technischen Reichweite könnte selbst eine Datei
`autorisierungen/<lauf_id>.json` mit `entscheidung: "FREIGEGEBEN"` anlegen,
committen, `commit_hash`/`datei_hash` daraus berechnen und als `referenz` an
`pruefeAutorisierung` übergeben — die Funktion würde `{ ok: true,
entscheidung: "FREIGEGEBEN" }` liefern, **ohne dass je ein Mensch entschieden
hat**. Das ist exakt der Fall, den E-189 („niemals alleinige Autoritätsquelle")
und D16 verhindern sollen.

Trotzdem behauptet Abschnitt 4, D3 (plan-v1 Zeile 258-266) explizit: „Der
Git-Objekt-Lesezugriff ist die einzige Stelle in diesem Plan, die diese
Lücke schließt" — Singular, „die Lücke", ohne zwischen den beiden von
E-189 genannten Bedrohungen zu unterscheiden. Das ist ein Overclaim: D3
schließt eine von zwei benannten Lücken.

Verschärfend: SCOPE.3/SCOPE.4 legen nirgends fest, **wer** oder **welcher
Prozess** den initialen, vertrauenswürdigen `commit_hash`/`datei_hash` in
eine `referenz` einträgt, bevor `pruefeAutorisierung(referenz, ...)`
aufgerufen wird — die Funktion nimmt `referenz` als **Eingabe**, prüft sie
also nur nachträglich, erzeugt/verifiziert sie aber nicht selbst gegen eine
unabhängige menschliche Quelle. Der Plan verweist diese Frage implizit an
„den Aufrufer" (SCOPE.3, Zeilen 121-125) — ein Akteur, der in diesem
Feature nicht existiert und dessen Vertrauenswürdigkeit nirgends
spezifiziert ist.

Das ist kein Grund, die bereits entschiedene Scope-Frage („Pfad-/
Prozessgrenze statt OS-Sperre reicht") erneut aufzurollen — das ist
Stefans getroffene Entscheidung und nicht Gegenstand dieses Passes. Es ist
aber ein Grund, die **Formulierung des Plans** zu korrigieren: D3 schließt
nachweislich nicht „die Lücke" (E-189 vollständig), sondern nur ihre
Veränderungs-Hälfte. Diese Einschränkung sollte explizit im Plan stehen
(z. B. als dokumentierte Restlücke, die von Deliverable 3/4 —
Invocation Policy, Execution Controller — geschlossen werden muss), statt
stillschweigend als gelöst behauptet zu werden — genau das
Entscheidungsregel-Gebot aus `CLAUDE.md` („Entscheidung dokumentieren —
niemals stillschweigend in Code [oder Plantext] verwandeln").

### B2 — A4/A10 wie beschrieben technisch nicht erfüllbar: `stelleLaufstatusFest` liefert ohne vorherige `RUN_PREPARED`-Marke `NICHT_GESTARTET`, nicht `ABGESCHLOSSEN`
`[Fakt]` — **Schwere: hoch**

`src/checkpoint-store/index.ts:710-751` (real gelesen, `stelleLaufstatusFest`):
Ein Terminal-Eintrag wird nur dann einem Paar zugeordnet
(`irgendeinPaarAufgeloest = true`, führt zu Status `ABGESCHLOSSEN`), wenn
zuvor in derselben `lauf_id`-Kette eine offene `run_prepared`-Wirkungsmarke
existiert (`offeneRunPrepared.length > 0`, Zeile 716). Fehlt sie, landet die
Terminal-Sequenz in `terminaleOhneRunPrepared` (Zeile 722), und der
Endstatus ist `NICHT_GESTARTET` (Zeile 750-751), **nicht** `ABGESCHLOSSEN`.
Diese Regel ist zusätzlich dokumentarisch verankert:
`docs/projekt/zielfassung.md:352` „Erst danach `RUN_PREPARED`-Wirkungsmarke
[...], dann Werkzeugstart" und `features/F1B/feature.md:53` (AC3)
„`RUN_PREPARED` wird vor der möglichen Außenwirkung geschrieben."

Plan-v1 SCOPE.4 (Zeilen 161-165, `verweigereAutorisierung`) beschreibt
ausschließlich einen Aufruf von `schreibeWirkungsmarke(..., "terminal",
{ ergebnis: "VERWEIGERT", ... })` — keine vorangehende
`run_prepared`-Wirkungsmarke wird geschrieben, weder in
`verweigereAutorisierung` selbst noch im Testaufbau (SCOPE.7, A4, A10).
A4 (Zeile 320-324) verlangt aber ausdrücklich: „Beleg über einen
nachfolgenden `stelleLaufstatusFest`-Aufruf (F1B), der
`ABGESCHLOSSEN`/`VERWEIGERT` liefert." Nach dem real existierenden
F1B-Code ist das, wie beschrieben, falsifizierbar: Der Testfall würde
`{ status: 'NICHT_GESTARTET', terminaleOhneRunPrepared: [<sequenz>] }`
liefern.

Das ist keine Design-Frage, sondern eine konkrete Vervollständigungslücke:
entweder muss `verweigereAutorisierung`/der Testaufbau vor dem Terminal
eine `run_prepared`-Marke schreiben (naheliegend, da eine Autorisierung
per Definition zu einem vorbereiteten Lauf gehört — passt inhaltlich gut
zu §16.4), oder A4/A10 müssen präzisieren, dass `KLAERUNG_ERFORDERLICH`
mit `terminaleOhneRunPrepared` als Alternativbeleg akzeptiert wird. So wie
der Plan aktuell steht, würde ein Executor entweder den Test falsch bauen
oder beim ersten `npm run check`-Lauf über einen unerwarteten roten Test
stolpern.

### B3 — Windows-CRLF/LF-Risiko bei D3s Arbeitsbaum-vs.-`git show`-Vergleich ist nicht behandelt, obwohl CLAUDE.md diese Falle für genau dieses Muster (Datei-Byte-Vergleich zwischen zwei Lesepfaden) dokumentiert
`[Schlussfolgerung]` — **Schwere: mittel-hoch**

`CLAUDE.md`, Abschnitt „Bekannte Fallen": „Symptom: `git status` meldet [...]
tritt auf, wenn [...] Arbeitskopie hat CRLF, die Git-Datenbank LF,
`core.autocrlf` dort nicht gesetzt." Das ist die allgemeine Windows/Git-
CRLF-Falle. Plan-v1 SCOPE.4 (Zeilen 144-155) beschreibt ein Verfahren, das
diese Falle direkt trifft: `pruefeAutorisierung` liest die Datei einmal
vom Arbeitsbaum (`readFileSync`) und einmal über `git show
<commit_hash>:<pfad>` (Objektlesen), berechnet **für beide** einen Hash und
vergleicht **beide** gegen `referenz.datei_hash` (SCOPE.4, „berechnet den
Hash beider gelesenen Inhalte, vergleicht gegen `referenz.datei_hash`").

`git show`/`git cat-file` liefert den Rohinhalt des gespeicherten Blobs
ohne Checkout-Filter — Arbeitsbaum-Checkouts durchlaufen dagegen ggf.
`core.autocrlf`-Konvertierung (bei Git-for-Windows-Standardinstallation
häufig `true`). Wird das externe Repo von Stefan per einfachem `git init`
ohne `.gitattributes`/`core.autocrlf=false` angelegt (im Plan an keiner
Stelle vorgeschrieben, SCOPE.1/Budget), kann eine **unveränderte, korrekt
committete** Datei zwei unterschiedliche Byte-Inhalte liefern (CRLF im
Arbeitsbaum, LF im Git-Objekt) — der Grün-Fall A2 (echte, unveränderte
Freigabe) würde dann als Divergenz-Fall (A5-Verhalten) fehlschlagen, obwohl
keine Manipulation stattfand.

Das betrifft den wichtigsten Testfall des Features (A2, „Hauptkriterium"-
nahe A18-Beleg) und ist eine reale, aus dokumentierter Windows/Git-
Erfahrung dieses Projekts ableitbare Gefahr, nicht spekulativ. Der Plan
erwähnt weder `.gitattributes` noch `core.autocrlf` noch eine sonstige
Normalisierungsregel für das externe Repo — trotz konkretem Windows-Pfad
in SCOPE.1 und trotz expliziter Prüfanweisung in diesem Auftrag, CLAUDE.md
gegen genau diesen Pfad zu prüfen.

### B4 — SCOPE.3s Hashing-Präzedenzangabe ist gegen den realen Code falsch: externe Dateiinhalte werden im Projekt bereits per rohem `sha256Hex`, nicht per `kanonischesJson`, gehasht
`[Fakt]` — **Schwere: mittel**

Plan-v1 SCOPE.3 (Zeile 131): `"datei_hash": "<sha256 des Dateiinhalts,
gleiche kanonischeJson-Regel wie F0/F1>"`. Realer Code
(`src/lineage-registry/index.ts:94` vs. `:127`, beide real gelesen)
unterscheidet zwei Fälle exakt nach der vom Plan selbst zitierten
Eigentümerschaftsregel (§16.2, A7):

- **kern-erzeugt** (`registriereKernArtefakt`, Zeile 94): `const
  inhaltsHash = sha256Hex(kanonischesJson(daten))` — Kanonisierung, weil
  `daten` ein vom Kern selbst konstruiertes JS-Objekt ist, dessen
  Schlüsselreihenfolge irrelevant sein soll.
- **werkzeug-erzeugt** (`registriereWerkzeugReferenz`, Zeile 127): `const
  inhaltsHash = sha256Hex(inhalt)` — **roher** String-Hash, keine
  Kanonisierung, weil `inhalt` eine externe, vom Werkzeug gelieferte
  Zeichenfolge ist, deren exakte Bytes gebunden werden sollen.

Die Autorisierungsdatei in F3 ist nach genau dieser Logik der zweite Fall
(extern, außerhalb der Kern-Schreibhoheit erzeugt) — der reale Präzedenzfall
wäre also `sha256Hex(inhalt)`, nicht „kanonischeJson-Regel wie F0/F1"
(F0/F1 hashen ausschließlich eigene, kern-erzeugte Payload-Objekte, nie
externe Dateien). Diese Verwechslung ist mehr als kosmetisch: Ob
`datei_hash` roh (byte-exakt, tolerant gegen nichts) oder kanonisiert
(semantisch, tolerant gegen Formatierungsänderungen) berechnet wird,
entscheidet direkt, wie streng die in SCOPE.4 geforderte Aussage „genau
dieser Inhalt" (Zeile 149) tatsächlich ist — und ob B3 (CRLF) das Ergebnis
zusätzlich verschärft (bei rohem Hash: ja, jede Byte-Abweichung zählt; bei
kanonisiertem Hash: nein, aber dann müsste auch die Divergenz-Prüfung
selbst kanonisiert vergleichen, was SCOPE.4 nicht spezifiziert).

### B5 — Ableitung des „repo-relativen Pfads" für `git show` aus dem absoluten `referenz.pfad` ist nicht spezifiziert
`[offene Unsicherheit]` — **Schwere: niedrig**

SCOPE.3 legt `referenz.pfad` als vollständigen Windows-Absolutpfad fest
(`C:\\Users\\stefa\\ai-workforce-autorisierung\\autorisierungen\\<lauf_id>.json`).
SCOPE.4 verlangt für `git show` einen „repo-relativer-pfad", ohne die
Ableitungsregel zu benennen (z. B. Abschneiden des fest verdrahteten
Repo-Root-Präfixes aus SCOPE.1). Kein Sicherheitsproblem — eine falsche
Ableitung würde `git show` mit Wahrscheinlichkeit einfach fehlschlagen
lassen (fail-closed, Rot), nicht fälschlich Grün — aber eine
Vervollständigungslücke, die vor dem Handoff-Vertrag benannt werden
sollte, damit die Ausführungssitzung sie nicht stillschweigend selbst
entscheidet.

### B6 — Kein F1B-Touch nötig: Behauptung real gegen Code verifiziert
`[Fakt, entlastend]`

`src/checkpoint-store/types.ts:29-37` (`WirkungsmarkePayload`,
`ergebnis?: 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN'`) und
`src/checkpoint-store/index.ts:530-592` (`schreibeWirkungsmarke`, Signatur
`(laufId, profilReferenz, art, zusatz, optionen)`) bestätigen exakt, was
Plan-v1 Abschnitt 0 behauptet: `verweigereAutorisierung` kann
`schreibeWirkungsmarke(laufId, profilReferenz, "terminal", { ergebnis:
"VERWEIGERT", daten: {...} })` unverändert von außen aufrufen. Kein
Typ, keine Funktion muss erweitert werden. Die Behauptung ist nicht nur
plausibel, sondern am realen, gemergten Code (Commit `8520714`)
nachgewiesen.

### B7 — D1 (eigenes Modul, kein Checkpoint-Store-Touch) ist wörtlich durch §16.2 gedeckt
`[Fakt, entlastend]`

`docs/projekt/zielfassung.md:331` (real gelesen): „**Authorization
Boundary** | eigener Eingang für menschliche Entscheidungen; hält beide
Schlüsselarten auseinander | keine Deutung von Modelltext als Freigabe;
erzeugt nie die Git-Freigabe-Datei" — eigene Tabellenzeile, gleiche Ebene
wie „Checkpoint Store" (Zeile 329) und „Artifact Registry / Lineage"
(Zeile 330). Das vom Plan gezogene Gegenbeispiel zu F1B (dort war
„Wirkungsmarke" ausdrücklich dem Checkpoint Store zugeordnet, Zeile 329
„zwei Artefakttypen") trägt: F1B durfte ein bestehendes Modul erweitern,
weil die Doku es dort verortet; F3 folgt korrekt einer anderen Zeile.

### B8 — AC2 („Pfad + Hash, nie der Entscheidungsinhalt selbst") korrekt umgesetzt
`[Fakt, entlastend]`

Das Referenzformat in SCOPE.3 (Zeilen 126-134) enthält ausschließlich
`pfad`, `commit_hash`, `datei_hash` — keine Kopie von `entscheidung` oder
`begruendung`. Deckt `features/F3/feature.md:56-57` (AC2) wörtlich.

### B9 — D2s Grundidee (Pinning auf einen konkreten historischen Commit statt `HEAD`) ist eine robuste, nicht überflüssige Designentscheidung
`[Schlussfolgerung, entlastend]`

Da `referenz.commit_hash` einen festen, bereits existierenden
Commit referenziert (statt z. B. „lies die aktuellste Version"), invalidieren
spätere, unabhängige Commits auf denselben Pfad eine bereits gepinnte,
gültige Referenz nicht — Git-Objekte sind inhaltsadressiert und unveränderlich
für einen gegebenen Hash. Das ist der Kern dessen, was D2 als „Manipulationssicherheit
aus dem Commit selbst" beschreibt, und trägt tatsächlich — für die
Veränderungs-Hälfte von E-189 (siehe B1 zur Erzeugungs-Hälfte).

### B10 — `docs/projekt/umsetzungsplan-fassung-1.md`-Zitat und Reihenfolge-Begründung akkurat
`[Fakt, entlastend]`

`docs/projekt/umsetzungsplan-fassung-1.md:66-67` (real gelesen): „| 3 |
**Authorization Boundary** | Eigenes Repo außerhalb der Schreibreichweite
(D16) — kann parallel zu Deliverable 1 entstehen |" — deckt sowohl
`features/F3/feature.md:78-87` (Zuordnung) als auch die dortige
Begründung, warum F3 trotzdem nach F1B gebaut wird (AC6-Wiederverwendung),
wörtlich.

---

## Urteil

**Nicht freigegeben.**

Begründung (Schwere-Sortierung): B1 und B2 betreffen die beiden Dinge, die
dieser Advisor-Pass laut Budget-Abschnitt des Plans ausdrücklich prüfen
sollte (D2/D3-Tragfähigkeit, A4-Beleg) — beide sind nicht bloß stilistische
Lücken, sondern lassen sich konkret als „so wie beschrieben, nicht
korrekt/nicht vollständig" belegen: B1 zeigt, dass D3 nur eine der zwei in
E-189 benannten Bedrohungen abdeckt und der Plantext das gegenteilige
überzieht; B2 zeigt, dass der zentrale AC6-Beleg (A4/A10) mit dem real
existierenden F1B-Code, so wie spezifiziert, den falschen Status liefern
würde. B3 verschärft das zusätzlich operativ (der Grün-Fall A2 könnte auf
diesem Windows-System spurious rot werden), gestützt auf eine im Projekt
bereits dokumentierte, wiederkehrende Fallenklasse. B4 ist eine konkrete
Faktenkorrektur an der im Plan zitierten Präzedenz. Keiner dieser vier
Punkte erfordert eine neue Scope-Entscheidung (die drei „ehemals offenen
Punkte" bleiben unangetastet) — alle vier sind als Ergänzungen in einem
plan-v2 nachtragbar, ohne die Grundarchitektur (D1, eigenes Modul;
Referenzformat Pfad+Hash) zu verwerfen. Mehrere zentrale Behauptungen des
Plans (kein F1B-Touch nötig, D1-Modulschnitt, AC2-Umsetzung, D2s
Pinning-Idee) sind dagegen real geprüft und tragfähig (B6-B10) — der Plan
ist nicht grundsätzlich fehlgeleitet, aber in seiner aktuellen Fassung noch
nicht baureif.

## Nächster sinnvoller Schritt

`plan-v2-f3-authorization-boundary.md` mit mindestens vier konkreten
Ergänzungen, bevor ein Handoff-Vertrag entsteht:

1. **B1** — D3 im Plantext ausdrücklich auf „Veränderung" begrenzen (nicht
   „die Lücke" pauschal); benennen, wer/was den initialen, vertrauenswürdigen
   `commit_hash`/`datei_hash` liefert, bevor `pruefeAutorisierung` aufgerufen
   wird, oder die verbleibende „Erzeugung"-Lücke explizit als an
   Deliverable 3/4 delegierte Restanforderung dokumentieren (Entscheidung
   dokumentieren, nicht stillschweigend absorbieren, CLAUDE.md
   Entscheidungsregel Punkt 5).
2. **B2** — SCOPE.4/`verweigereAutorisierung` und die A4/A10-Testfälle so
   ergänzen, dass vor dem Terminal-Aufruf eine `run_prepared`-Wirkungsmarke
   in derselben `lauf_id`-Kette existiert (oder A4/A10 auf den tatsächlich
   erreichbaren Status `NICHT_GESTARTET`/`terminaleOhneRunPrepared`
   umformulieren).
3. **B3** — für das externe Repo eine Zeilenenden-Regel festlegen
   (`.gitattributes` mit `* -text` oder `text eol=lf`, bzw.
   `core.autocrlf=false` bei Stefans `git init`) und im Gate-Skript
   (SCOPE.6) einen Testfall ergänzen, der genau diese Randbedingung prüft.
4. **B4** — SCOPE.3s Hashing-Regel auf den realen Präzedenzfall
   (`sha256Hex(inhalt)`, roher Dateiinhalt, analog
   `src/lineage-registry/index.ts:127`) korrigieren, nicht `kanonischeJson`.

B5 kann direkt im Handoff-Vertrag (nicht zwingend in plan-v2) nachgetragen
werden. Danach ein erneuter, fokussierter Advisor-Pass auf plan-v2 (Delta-
Prüfung wie beim F1B-Präzedenzfall), bevor die Ausführungssitzung startet.

Relevante Dateien: `state/plan-v1-f3-authorization-boundary.md`,
`features/F3/feature.md`, `docs/projekt/zielfassung.md` (Zeilen 50, 215,
318, 320, 331, 341-352), `ARCHITECTURE.md` (Zeilen 45-64),
`src/checkpoint-store/index.ts` (Zeilen 530-592, 672-756),
`src/checkpoint-store/types.ts`, `src/lineage-registry/index.ts` (Zeilen
83-148), `CLAUDE.md` (Abschnitt „Bekannte Fallen").
