# Delta-Advisor-Pass F45 FB-1b (Plan v2)

Stand: 23.10.2026 · Prüfling `features/F45/plan-fb1b-v2.md` (Delta zu `plan-fb1b.md`, nach `advisor-fb1b.md`) · Subagent
`architecture-advisor`, frischer Kontext. Bericht wörtlich übernommen (abgelegt vom Autor des Plans).

**Geprüfte Quellen:** `plan-fb1b-v2.md`, `plan-fb1b.md`, `advisor-fb1b.md`, `plan-fb1-v2.md` (E-FB1-2/-4), ARCHITECTURE.md (ganz), `scripts/architektur-kern.json`, `scripts/check-f45-k-kontext.mjs` (:57-70), `docs/architektur/wachstumsbremse.md`, `arbeitsordner.md` (grep). Code: `scripts/leitstand-server.mjs` (Aufräumen :12103-12172, Laufstarts :7450-7460 und :9996-10034, `laufSperreAnzeige` :6545, `ladeArbeitsordner`/`ermittleLaufort`/`loeseCodeOrt` :6230-6366, `arbeitsordnerVorStart` :6473-6500, `ermittleAbnahmeStand` :2140, `leseJsonBegrenzt`/`leseBody` :5584-5617, Plugin-Kontext :9137-9181, `empfehlungsZusatz` :6018-6021), `scripts/leitstand/kennung.mjs`, `routen-plugin-freigabe.mjs` (:226-267), `routen-faehigkeiten.mjs` (:59-99, :388-406), `src/faehigkeiten/vorschlag.ts` (ganz), `src/faehigkeiten/index.ts` (:596-779), `src/review-stand/index.ts` (:66-106), `src/rueckfrage/index.ts` (:246-253).

**Rollengrenze:** nur Read/Grep/Glob, kein Schreiben, kein Bash, kein Git.

**Wo das die Prüfung begrenzt:** Kernbytes nur von Hand gezählt (UTF-8, Umlaute 2 B), Zeilenumbruch geschätzt, LF/CRLF der
Arbeitskopie nicht geprüft. Kein Gate und kein Test gelaufen. Nicht gemessen: `rmSync({ maxRetries })` unter Windows/Node 24,
sha256-Blobs gegen echtes git. `erzeugeLokalWaechter.pruefe` nur bis :99 gelesen.

**Marker:** [Fakt] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit] · [Fakt, entlastend].

## Befunde

**1 · Mittel · Abschnitt A: Die Invariante „ab Phase B kein await“ ist nur deklariert, und eine asynchrone `lage` würde offen scheitern (fail-open). Beim Bau einarbeiten.**
- [Fakt] Plan :10-11 sichert die Invariante mit einem Kommentar und einem Test (die `lage`-Attrappe liefert beim zweiten Aufruf „Lauf aktiv“). Der Test zeigt, dass `lage₁` neu gelesen wird, nicht, dass zwischen `lage₁` und dem Bewegen kein `await` liegt.
- [Schlussfolgerung] Wird `kontext.lage` später `async`, bekommt Phase B ein Promise; `lage₁.laufGesperrt` bzw. `.wurzel` sind `undefined`, die Sperrprüfung ist falsy, es wird bewegt (fail-open).
- Korrektur: Phase B als eigene, nicht asynchrone Funktion (ein `await` darin ist im ESM-Modul ein SyntaxError — strukturell ERZWUNGEN). `lage₁` streng prüfen (`null`, `typeof wurzel !== 'string'`, Form von `laufGesperrt`) ⇒ 409 bzw. 500, nie weiter. Unit-Test: die Rückgabe von Phase B ist kein Promise.

**2 · Niedrig · Abschnitt A: „Wurzel = Wurzel aus A“ deckt den Basis-Commit nicht ab. Darf mitlaufen.**
- [Fakt] Nach ENTFERNT legt die Vorbereitung den Ordner deterministisch neu an (`leiteArbeitsordnerAb`), `basis_commit` beginnt neu (`leitstand-server.mjs:6480-6490`).
- [Schlussfolgerung] Theoretisch gleiche Wurzel, anderer Basis-Commit zwischen A und B; praktisch kaum erreichbar (A ≤ 5 s).
- Korrektur: in Phase B zusätzlich `basisCommit₁ === basisCommit₀`, sonst 409.

**3 · Niedrig · Abschnitt A: `ziel_ignoriert` kann `undefined` sein. Darf mitlaufen.**
- [Fakt] `pruefeZielIgnoriert` wertet nur Einträge mit `grund === null` aus, sonst fehlt der Schlüssel (`vorschlag.ts:378-382`).
- Korrektur: „`ziel_ignoriert !== false` ⇒ 409“ (fail-closed); ein `grund` in Erkennung₀ darf für Übernehmen schon in A zu 409 führen.

**4 · Niedrig · Abschnitt C: Der umgekehrte Alias über die Aufräumen-Route bleibt offen (Bestand, nicht durch FB-1b entstanden). Darf mitlaufen, als Finding.**
- [Fakt] Die Aufräumen-Route prüft nur Zeichenregel und `workflowVersion === null`, nicht `daten.workflow_id === workflowId` (`leitstand-server.mjs:12109-12131`), und trägt die Kennung wie angefragt ein (`arbeitsordnerVorbereitungLaeuft.add(workflowId)`, :12146). `LAUFID_UNZULAESSIGE_ZEICHEN` lässt Großbuchstaben und Punkt am Ende zu (`kennung.mjs:22`).
- [Schlussfolgerung] Aufräumen mit `WF` (NTFS findet `wf`) setzt `has('WF')`; FB-1b fragt `has('wf')` ⇒ `false` und bewegt in einen Worktree, der gerade entfernt wird.
- [Schlussfolgerung, entlastend] Folge harmlos (ohne Verwerfen bricht `git worktree remove` an ungetrackten Vorschlägen ab; `an` bleibt); nur über eine gebastelte Anfrage.
- Korrektur: neues Finding (Aufräumen bekommt die Identitätsprüfung wie `loeseCodeOrt`, eine Zeile) oder Mitnahme. Befund 2 des Erstpasses ist für FB-1b geschlossen.

**5 · Niedrig · Abschnitt C, Gate (k): Der Identitätsfall ist unter Linux nicht widerlegbar. Darf mitlaufen.**
- [Fakt] Vorbild Quelltextprüfung: `check-f45-b2b4a1-sichern.mjs:143-149` (a5).
- Korrektur: Quelltextprüfung der Zeile `workflow_id !== workflowId` oder ein Artefakt mit abweichender `workflow_id` im tmp-Kontrollzustand; alternativ „ERZWUNGEN nur unter Windows“.

**6 · Mittel · Abschnitt D: Der §2-Satz hat keinen Durchsetzungsgrad (E-FB1-4). Beim Bau einarbeiten, der Deckel reicht.**
- [Fakt] E-FB1-4 verlangt je einen kurzen Satz mit Durchsetzungsgrad (`plan-fb1-v2.md:17-18`; ARCHITECTURE.md:23, :180). §1 in v2 trägt „DEKLARIERT“, §2 (Plan :46) nicht.
- [Schlussfolgerung] „nur auf Klick“ ist DEKLARIERT; ERZWUNGEN ist die Pfadprüfung (Gate (s)). Ein „außerdem“ (+9 B) macht die Ausnahme zur Löschliste eindeutig.
- Bytes (Handzählung): §1 +53 B, §2 +87 B, Umbruch +5…10 B ⇒ ≈ 17 710–17 715 B; mit Grad ≈ 17 750 B (Luft ≈ 50 B). Rückfall: Klammer „ (nie `git status`, `update-index`, `write-tree`)“ ≈ −49 B. [Fakt, entlastend] `arbeitsordner.md:28` nennt `update-index`/`write-tree` schon. [offene Unsicherheit] Das Gate zählt Rohbytes (CRLF +1 je Zeile, `check-f45-k-kontext.mjs:69-70`); maßgeblich ist die Messung beim Bau.
- Korrektur: §2 mit Grad und „außerdem“, beim Bau messen. Befund 4 des Erstpasses damit geschlossen.

**7 · Mittel · Abschnitt E: Für `s` ist offen, gegen welchen Hash die Probe freigibt — so fiele die Hash-Prüfung am Ziel still weg. Beim Bau einarbeiten.**
- [Fakt] v1: `inhalt_freigaben: { [s]: hash }` mit `body.hash` (`plan-fb1b.md:80-82`); v2: „je eigener Hash“ (Plan :53).
- [Schlussfolgerung] Kämen Schlüssel und Hashes der Nachher-Probe aus einem Vorlauf am Ziel, wäre `s` immer `aktiv`, auch bei geändertem Inhalt.
- Korrektur: für `s` gilt `inhalt_freigaben[s] = body.hash` (oder ausdrücklich `hash === body.hash` prüfen). Ablauf: Vorlauf (leere Einstellungen) ⇒ Schlüssel/Hashes ⇒ Probe vorher ⇒ Bewegen ⇒ Probe nachher mit denselben Schlüsseln plus `s`; alles in Phase B.

**8 · Niedrig · Abschnitt E: Vergleich über den Trenner `'; '` ist bei Dateinamen mit „; “ unscharf. Darf mitlaufen, wenn DEKLARIERT.**
- [Fakt] `hindernis` = `hindernisse.join('; ')` (`index.ts:778`), Teile enthalten Pfade/Namen unter `.claude/` (:762-775).
- [Schlussfolgerung] Folge meist eine unnötige 409 (fail-closed); unentdeckt nur konstruiert.
- Korrektur: DEKLARIEREN oder `ProjektFaehigkeitenErgebnis` um `hindernisse: string[]` erweitern (zusätzliches Ausgabefeld).

**9 · Niedrig · Abschnitt B: `parseLsTree` liefert keinen Modus. Darf mitlaufen.**
- [Fakt] `review-stand/index.ts:77-81`, :101-103; `GRUND_ARGUMENTE`/`UMGEBUNG` nicht exportiert (:70, :75).
- Korrektur: `BaumEintrag` additiv um `modus`. Bei Skills Pfad mit abschließendem `/` vergleichen (`skills/foo` ≠ `skills/foobar/…`).

**10 · Niedrig · Abschnitt G: `leseJsonBegrenzt` passt nicht zur Modul-Schnittstelle aus v1. Darf mitlaufen.**
- [Fakt] liefert `{ ok, daten }` bzw. `{ ok: false, status: 400 | 413 }`, leerer Körper ⇒ `{}` (`leitstand-server.mjs:5584-5604`).
- Korrektur: das Modul nimmt `daten` (Objekt); 413/400 reicht der Server durch; leerer Körper ⇒ 400 über die Pflichtfelder.

**11 · Niedrig · Abschnitt F/Server: `nachRoute` läuft erst nach dem `await` des Moduls. Darf mitlaufen.**
- [Fakt] Dasselbe Muster bei der Plugin-Freigabe (`leitstand-server.mjs:9169`, :9181); `nachRoute` setzt nur den bekannten Stand (`routen-faehigkeiten.mjs:88-91`).
- Korrektur: `nachRoute` im `aendere`-Rückruf des Servers synchron nach Erfolg aufrufen.

## Geprüft und in Ordnung

- [Fakt, entlastend] Befund 1 im Kern geschlossen: Aufräumen prüft (`aufraeumenSperrgrund`) und trägt ein (`arbeitsordnerVorbereitungLaeuft.add`) ohne `await` dazwischen (:12134-12146), erst danach `await entferneArbeitsordner` (:12149) — ein synchrones Phase B liegt ganz davor oder sieht es (409). Laufstarts lesen, prüfen, reservieren und setzen `laufAktiv`/`globalerLaufZustand.aktiv` synchron (:9999-10031, :7450-7460) — die Kernregel „gesperrt während eines Laufs“ (ARCHITECTURE.md:77) bleibt gewahrt; zweite Linie Vorher/Nachher-Hash (:10010).
- [Fakt, entlastend] Alles in Phase B ist synchron (Lage, Erkennung, `ermittleProjektFaehigkeiten`, `aendereLokaleDatei`, `werkzeugNamenAus`, `rmSync` mit `maxRetries`); die Laufsperre deckt instanzlokalen Lauf, Projekt-Aufruf und globalen Lauf wie die Plugin-Routen (:9150-9154).
- [Fakt, entlastend] In Phase A hängt `check-ignore` nur an Name und Regeln, `ls-tree` nur an Basis und Pfad (`vorschlag.ts:361-364`, :383); der Rest ist DEKLARIERT (Plan :23).
- [Fakt, entlastend] Abschnitt C entspricht `loeseCodeOrt` (:6358).
- [Fakt, entlastend] §1 trägt einen Grad (E-FB1-2); der Detailsatz `wachstumsbremse.md:10` muss gemeinsam geändert werden.
- [Fakt, entlastend] B10 widerspricht dem Kern nicht (Detail fasst „schreibende Aufrufe“ als Workflow-Schreiber/`starteWorkflowSchritt(`; Vorbild `schreibeKopie`).
- [Fakt, entlastend] Abschnitt E Variante (a) trägt: Mehrdeutigkeit nur für aktive Einträge (`index.ts:760-776`), vorher alle aktiv ⇒ der Fall aus Erstpass-Befund 3 wird ein neuer Teil; Werkzeugnamen wie am Start (`empfehlungsZusatz` :6020, `werkzeugNamenAus` importiert :550).
- [Schlussfolgerung, entlastend] Abschnitt F: Rücknahme vor `aendere`-Erfolg nur `unlinkSync(ziel)`; ein liegengebliebener Vorschlag hat `ziel_existiert` ⇒ Übernehmen 409, Verwerfen möglich.
- [Fakt, entlastend] Abschnitt G setzt die Befunde 5 und 10–13 des Erstpasses um; neu nur Befund 10 oben.

## Urteil

**Freigegeben mit Hinweisen.** Die neue Reihenfolge schließt Befund 1 im Kern; Befund 2 ist für FB-1b geschlossen; Befund 4
passt nach Zählung unter den Deckel (Rückfall benannt). Die neuen Punkte sind Präzisierungen (Phase B nicht asynchron mit
strenger `lage₁`-Form, Durchsetzungsgrad im §2-Satz, `body.hash` für `s`, `modus` in `parseLsTree`) und gehören als kurzer
Nachtrag in v2; ein weiterer Advisor-Pass ist nicht nötig.

**Beim Bau einarbeiten:** 1, 6, 7. **Darf mitlaufen:** 2, 3, 5, 8, 9, 10, 11. **Als Finding:** 4 (Aufräumen-Alias).

## Nächster sinnvoller Schritt

Nachtrag in v2 (1, 6, 7; 2, 3, 9, 10 je eine Zeile), Finding für Befund 4, dann bauen; Kernbytes mit
`node scripts/check-f45-k-kontext.mjs` messen; danach `code-reviewer` + `qa` mit frischem Kontext.
