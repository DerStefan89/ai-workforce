# Advisor-Findings — Plan v1 F4: Invocation Policy / Protection Validator

Slug: f4-invocation-policy
Stand: 2026-08-31
Rolle: Advisor (Subagent `architecture-advisor`, frischer Kontext,
`Read/Grep/Glob`, kein Schreibrecht)
Geprüfter Plan: `state/plan-v1-f4-invocation-policy.md` (nach den zwei
Korrekturen AC9-Fix und D-Nummern-Umbenennung — Stand dieses Advisor-Passes)

## Kopf — was gegen welche Quellen geprüft wurde

- `state/plan-v1-f4-invocation-policy.md` (vollständig)
- `features/F4/feature.md` (vollständig)
- `docs/projekt/zielfassung.md` §16.1 (D1–D16), §16.2 (Modulschnitt-
  Tabelle), §16.3, §16.4, §16.8, §9.4 E-182–E-188
- `ARCHITECTURE.md` §3 „Auth"
- `src/authorization-boundary/index.ts` und `types.ts` (vollständig)
- `src/checkpoint-store/types.ts` und Signatur von `schreibeWirkungsmarke`
  (`src/checkpoint-store/index.ts:530–536`)
- `scripts/check-f9-human-transport.mjs:155–194` (AC8-Grep-Präzedenz)
- `schemas/kontrollzustand-autorisierung-payload.schema.json`
- `state/gates.md` (F3-, F1B-, F9-, F5-Gate-Zeilen)
- `state/assumption-ledger.md:14` (cwd/Pfad-Bug in `commit-guard.cjs`)
- `state/findings.md` (F-006)
- `state/plan-v2-f3-authorization-boundary.md` (Gegenprobe: kein Treffer
  auf `export`/die drei Helferfunktionen)
- Glob `state/tasks/*f4*` (keine Treffer — Handoff-Vertrag existiert noch
  nicht)

**Rollengrenze:** Nur `Read/Grep/Glob`. Kein Code unter `src/
invocation-policy/` existiert; keine der A1–A22-Behauptungen des Plans
konnte real ausgeführt werden — die Prüfung bleibt bei Aussagen zu
künftigem Funktionsverhalten auf Plan-Text-Ebene (Widerspruchsfreiheit
gegen Sollquelle/Code-Präzedenz), nicht auf real ausgeführtem Testlauf.
Der ursprüngliche Planungsauftrag dieser Sitzung („Auftrag Punkt 1–8"),
auf den der Plan mehrfach verweist, ist in keiner dem Advisor
zugänglichen Datei gespeichert — Binnenkonsistenz des Plans mit sich
selbst wurde geprüft, nicht die Treue der Zitate zum tatsächlichen
Auftrag (siehe F13).

## Marker-Legende

`[Fakt]` im Code/Dokument belegt · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Annahme]` unbelegte Prämisse · `[offene Unsicherheit]`
weder belegt noch widerlegt · `[Fakt, entlastend]` bestätigt einen
geprüften Teil als in Ordnung.

## Befunde

### Fokus 1 — Design-Entscheidung 3 (Wirksamkeitsnachweis als Parameter)

**F1 [Fakt]** E-188 (`zielfassung.md:213`) verlangt wörtlich: „Die
Wirksamkeit der Schutzschichten wird gegen einen bekannten Rot-Fall
nachgewiesen, **nicht aus ihrer Existenz gefolgert**." Schema 2
(`plan:178–203`) macht `rot_fall_beleg` zwar Pflicht, aber nur als
Freitext-Verweis. `pruefeStartbedingung2` validiert diesen Freitext nur
gegen das Schema (nicht-leerer String) und vergleicht sonst
ausschließlich den `gueltigkeitsschluessel` feldweise — keine Prüfung,
dass der referenzierte Rot-Fall real existiert, ausgeführt wurde oder
noch aktuell ist.

**F2 [Schlussfolgerung]** Architektonisch nicht unbegründet: eine echte
Rot-Fall-Prüfung würde einen Werkzeugaufruf erfordern und §16.4 („lokal,
ohne Werkzeugaufruf") verletzen. Die Grenze ist plausibel — ABER: F4
erzwingt von E-188 damit nur die **Drift-Hälfte**, nicht die
„nachgewiesen-nicht-gefolgert"-Hälfte. Diese zweite Hälfte wird komplett
an die Echtheit des übergebenen `wirksamkeitsnachweis`-Objekts delegiert
— an einen Aufrufer (F6), der noch nicht existiert und dem gegenüber
diese Erwartung nirgends schriftlich fixiert ist (kein Nicht-Ziel-/
Dependency-Eintrag vergleichbar zu §16.8 Punkt 3/4/8).

**F3 [Schlussfolgerung, hohe Relevanz]** Asymmetrie zwischen den beiden
Startbedingungen: Für die Baseline (E-183) legt SCOPE.1 verbindlich fest,
dass sie nie aus dem Arbeitsbaum dieses Produkt-Repos gelesen wird,
sondern ausschließlich commit-gepinnt aus dem extern geschützten Repo
(D16-Analogie). Für den Wirksamkeitsnachweis (E-188) trifft der Plan
bewusst keine vergleichbare Festlegung (offene Unsicherheit 3). Die
Entkopplung ist auf Code-Ebene tragfähig (Dependency Injection ist
testbar, unabhängig vom Aufrufer), aber **nicht auf Sicherheitsebene**:
Landet die Nachweis-Instanz später z. B. in `kontrollzustand/` im
Produkt-Repo, kann das geprüfte Ausführungswerkzeug sie potenziell selbst
überschreiben und Startbedingung 2 wertlos machen — exakt die Bedrohung,
die D16 für Autorisierungsartefakte generell ausschließen soll. Der Plan
dokumentiert diese Erwartung an eine künftige Ablageort-Entscheidung
nirgends als verbindliche Auflage.

Antwort auf die gestellte Kernfrage: Der Plan verschiebt nicht die
gesamte Prüfverantwortung unsichtbar — die Drift-Erkennung ist real und
testbar (A6/A15). Er verschiebt aber die Frage „ist der Nachweis
überhaupt echt und unmanipulierbar" komplett und unbenannt auf F6.
„Vergleich eines gegebenen Nachweises gegen einen gegebenen Ist-Zustand"
ist als Lesart von §16.2s „Startbedingungen erzwingen" nur tragfähig,
wenn die Echtheit des gegebenen Nachweises anderweitig garantiert ist —
das ist hier nicht sichergestellt.

### Fokus 2(a) — Additiver Export auf F3

**F4 [Fakt]** In `src/authorization-boundary/index.ts` sind aktuell
nicht exportiert: `leiteRepoRelativenPfadAb` (Zeile 65), `leseAusCommit`
(Zeile 76), `gitattributesPinntZeilenenden` (Zeile 89). Exportiert:
`validiereAutorisierungEintrag` (94), `pruefeAutorisierung` (155),
`verweigereAutorisierung` (211). Der Plan trifft diese Feststellung
korrekt.

**F5 [Fakt, entlastend]** `state/plan-v2-f3-authorization-boundary.md`
enthält keinen Treffer auf `export` oder die drei Funktionsnamen — kein
dokumentierter Beleg für eine bewusste Kapselungs-Entscheidung. Der
fehlende Export ist ein Nebenprodukt, keine absichtliche Grenze. Ein
additiver `export` ist risikoarm: bestehende Aufrufer/Tests ändern sich
nicht.

**F6 [Schlussfolgerung]** Der Fix vermeidet aber nur einen Teil der zu
vermeidenden Duplikation. SCOPE.5 beschreibt `pruefeStartbedingung1`
explizit als „analog F3 SCOPE.4, Pfad-Präfixprüfung +
`.gitattributes`-Prüfung + Commit-Hash-Vergleich, identisches
Rot-Fall-Set wie F3" — F4 muss praktisch die gesamte Verzweigungslogik
von `pruefeAutorisierung` (`index.ts:155–204`, vier fail-closed-Zweige)
erneut schreiben, nur mit Schema 1 statt Autorisierungsprüfung am Ende.
Das ist Duplikation der **Orchestrierung**, nicht nur fehlender Zugriff
auf Primitiven — genau das, was „kein zweiter Regelsatz" verhindern
soll. Sauberer: eine zusätzliche, additive Exportfunktion in F3, die
„commit-gepinnten Inhalt auflösen + verifizieren" bis zum geparsten
Inhalt kapselt (`{ok:true, inhalt} | {ok:false, grund}`), sodass F3 und
F4 dieselbe Verzweigungslogik teilen und nur die Schema-Validierung am
Ende unterschiedlich ist.

### Fokus 2(b) — Form von `berechtigungskontext`

**F7 [Schlussfolgerung]** §16.2 (`zielfassung.md:333`) weist genau
diesem Modul zu: „Startfreigabe: **Berechtigungskontext
materialisieren**, beide Startbedingungen erzwingen." Der Plan behandelt
`berechtigungskontext` als opaken, vom Aufrufer gelieferten Wert und
lässt `pruefeStartbedingung2` ihn nur vergleichen/durchreichen. Kein
anderer Eintrag der §16.2-Modultabelle trägt „Berechtigungskontext
materialisieren" — reines Durchreichen erfüllt AC5 formal (Feld
vorhanden), ohne dass echte Materialisierung je stattfindet, und kein
geplanter Test (A1–A22) würde das aufdecken.

**F8 [Schlussfolgerung]** Weil `berechtigungskontext` opak bleibt, kann
F4 D5 („Der Berechtigungskontext wird je Aufruf gesetzt, nicht geerbt")
an dieser Stelle nicht durchsetzen: nichts erkennt einen wiederverwendeten/
„geerbten" Wert — unterläuft den Drift-Zweck, für den dieses Feld laut
E-188 in den Gültigkeitsschlüssel aufgenommen wurde.

### Fokus 2(c) — Ablageort der Wirksamkeitsnachweis-Instanz

Kernfinding bereits unter F3 oben. Ergänzend:

**F9 [Schlussfolgerung]** Die Nicht-Entscheidung ist als Code-Entscheidung
unproblematisch (Parameter-Injection ist bewährtes, in F3 bereits
etabliertes Muster), verdeckt aber eine echte Scope-Lücke: Niemand in
diesem Plan trägt die Verantwortung, dass die E-188-Schutzeigenschaft am
Ende der Kette tatsächlich hergestellt wird. Empfehlung: mindestens
einen expliziten, vorwärtsverweisenden Hinweis aufnehmen, der die
künftige Ablageort-Entscheidung an eine D16-analoge
Schreibschutz-Auflage bindet — analog zur bestehenden Behandlung von
§16.8 Punkt 3/4/8, statt es implizit zu lassen.

### Fokus 2(d) — Eingabeformat `pruefeAufrufparameter`

**F10 [Fakt, entlastend]** `string[]` als generischstes, aus E-182
direkt ableitbares Format ist ein angemessener, risikoarmer Kompromiss
gegenüber einer noch nicht existierenden F6-internen Repräsentation.
Kein Befund.

### Zusätzlich gefunden, außerhalb des vorgegebenen Fokus

**F11 [Schlussfolgerung, wichtig]** Fehlende Querkonsistenz zwischen den
zwei Startbedingungen: E-188s Gültigkeitsschlüssel übernimmt wörtlich
zwei Bestandteile, die bereits in Bedingung 1 unabhängig geprüft werden
— „Hash der Werkzeugkonfiguration" und „Hashes der referenzierten
Schutzskripte". `pruefeStartbedingung1(baselineReferenz, istZustand,
...)` prüft diese Hashes gegen real gemessene `istZustand.hashes`;
`pruefeStartbedingung2(wirksamkeitsnachweis, istGueltigkeitsschluessel)`
erhält `istGueltigkeitsschluessel.werkzeug_konfiguration_hash`/
`schutzskript_hashes` aber als separaten, unabhängigen Eingabewert
desselben Aufrufers — ohne dass `pruefeStartfreigabe` je erzwingt, dass
beide Werte identisch sind. Ein Aufrufer (F6) könnte Bedingung 1 mit den
echten, aktuellen Datei-Hashes bestehen lassen und Bedingung 2
gleichzeitig mit veralteten, aber zum (ebenfalls veralteten) Nachweis
passenden Hash-Strings — F4 würde trotzdem `FREIGEGEBEN` liefern. Keiner
der geplanten Testfälle (A1–A22) prüft diese Inkonsistenz; sie
widerspricht direkt AC22 („kein Codepfad ... leitet daraus ein
FREIGEGEBEN ab"), gerade weil AC22 nur über A3/A6/A8 belegt werden soll,
die diesen Fall nicht abdecken. Konkreter, im bestehenden Zuschnitt
lösbarer Vorschlag: `istGueltigkeitsschluessel.werkzeug_konfiguration_hash`/
`schutzskript_hashes` sollten aus denselben, in Bedingung 1 bereits
verifizierten `istZustand.hashes` **abgeleitet** werden statt als
zweiter, unabhängiger Parameter entgegengenommen zu werden.

**F12 [Schlussfolgerung]** `pruefeStartbedingung2`s geplanter feldweiser
Gleichheitsvergleich (A6-Testfall „ein anderer `arbeitsverzeichnis_pfad`")
legt implizit „rohe String-Gleichheit, keine Normalisierung" als
Vergleichssemantik fest — obwohl §16.8 Punkt 8 „Normalisierung des
Arbeitsverzeichnispfads" ausdrücklich als weiterhin offen führt, und
genau diese Fehlerklasse bereits real im Projekt dokumentiert ist:
`state/assumption-ledger.md:14` beschreibt, wie `commit-guard.cjs`s
`eingabe.cwd || process.cwd()`-Konstruktion bei Abweichung zu einem
falschen Pfad und stillem Fehlverhalten führt; F3 selbst brauchte für
Pfadvergleiche extra `normalisierePfad`/`leiteRepoRelativenPfadAb`
(`index.ts:53–73`, dort als Fix für Advisor-Finding B20 dokumentiert).
Risikorichtung ist sicherheitsseitig unkritisch (führt zu einem falschen
`ABGELEHNT`, nicht zu einem falschen `FREIGEGEBEN` — fail-closed), aber
ein reales, bereits einmal beobachtetes Betriebsrisiko (ein unveränderter,
legitimer Lauf wird wegen reiner Pfadformat-Abweichung abgelehnt), das
der Plan nicht als bewusste Entscheidung benennt.

**F13 [offene Unsicherheit]** Kein `state/tasks/f4-invocation-policy.md`
existiert, und die „Auftrag Punkt 1–8"-Zitate, auf die sich der Plan
mehrfach beruft, sind in keiner dem Advisor zugänglichen Datei
gespeichert. Binnenkonsistenz des Plans mit sich selbst wurde bestätigt,
nicht die Treue der Zitate zum tatsächlichen Planungsauftrag dieser
Sitzung.

## Entlastende Befunde

**E1 [Fakt, entlastend]** §16.4 und `ARCHITECTURE.md:50` sind wortgleich
zu dem, was der Plan zitiert — keine Fehlzitierung gefunden.

**E2 [Fakt, entlastend]** E-182/E-183/E-188 stimmen wörtlich mit den
Plan-Zitaten überein; beide neuen Schemas (Baseline, Wirksamkeitsnachweis)
decken strukturell jedes in E-183/E-188 genannte Feld ab, keine
Auslassung gefunden.

**E3 [Fakt, entlastend]** Die geplante `verweigereStart`-Signatur
entspricht exakt der real existierenden Signatur von
`schreibeWirkungsmarke` und ist praktisch identisch zu F3s bereits
gebautem, gate-geprüftem `verweigereAutorisierung`. Geringes
Umsetzungsrisiko.

**E4 [Fakt, entlastend]** Die geplante AC8-Grep-Struktur entspricht
exakt der realen Präzedenz in `check-f9-human-transport.mjs:166–182`;
das vorgeschlagene Muster `\b(child_process|spawn|exec|execSync)\b`
erzeugt korrekt keinen Fehlalarm bei legitimen Aufrufen wie
`execFileSync` (keine Wortgrenze zwischen „exec" und „FileSync").

**E5 [Fakt, entlastend]** Jedes der elf `feature.md`-Akzeptanzkriterien
(AC1–AC11) ist im Plan mit mindestens einem konkreten `A`-Kriterium
explizit querverwiesen — die Zuordnung ist nachvollziehbar dokumentiert.

**E6 [Fakt, entlastend]** Der additive Export-Bedarf (offene
Unsicherheit 1) ist real, aber risikoarm: keine dokumentierte
Kapselungs-Entscheidung in F3s Plan, additive Exporte sind für
bestehende Aufrufer nicht-brechend.

**E7 [Fakt, entlastend]** `state/gates.md`-Konvention (Zeile erst nach
realem Bau-/Prüflauf) wird korrekt eingehalten — SCOPE.9 verschiebt den
Eintrag bewusst nach dem Bau, konsistent mit F1B/F3/F9/F5.

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Der Plan folgt konsequent etablierten Mustern (F3-Präzedenz
für Lesepfad/Rückgabeform/Terminalartefakt, F9-Präzedenz für den
AC8-Grep), grenzt sich sauber gegen F3/F6 ab und deckt alle elf
`feature.md`-ACs nachvollziehbar ab. Er behandelt die zielfassungsseitig
offenen Punkte (§16.8 P3/4/8) korrekt, indem er sie nicht stillschweigend
schließt.

**Vor oder spätestens während des Baus verbindlich zu klären** (keine
reine Doku-Nacharbeit — sie können AC22 sonst real unterlaufen, ohne dass
ein geplanter Test es zeigt):

- **F11** — Querkonsistenz zwischen `istZustand`-Hashes (Bedingung 1) und
  `istGueltigkeitsschluessel`-Hashes (Bedingung 2). Fix im bestehenden
  Zuschnitt lösbar: Ableitung statt zweitem unabhängigem Parameter.
- **F3** — Schutz des künftigen Nachweis-Ablageorts (D16-Analogie).
  Mindestens als explizite, dokumentierte Auflage für die spätere
  Ablageort-Entscheidung festhalten.

**Dürfen mitlaufen** (im Executor-Schritt entscheiden und dokumentieren,
CLAUDE.md-Entscheidungsregel Punkt 5 — nicht stillschweigend):

- **F6/F7** — ob und wie F4 „Berechtigungskontext materialisieren"
  tatsächlich umsetzt oder bewusst als Nicht-Ziel dokumentiert.
- **F6 (Export-Umfang)** — drei Primitiven exportieren vs. eine
  gemeinsame Verifikationsfunktion in F3 extrahieren.
- **F12** — bewusste Pfad-Vergleichssemantik für `arbeitsverzeichnis_pfad`
  dokumentieren.
- **Offene Unsicherheit 4** (Eingabeformat `pruefeAufrufparameter`) —
  bereits tragfähig, kein Nacharbeitsbedarf.

**Kein Blocker:** keiner der Befunde erfordert einen Umbau der Modul-/
Schema-Struktur; alle sind Verfeinerungen innerhalb des bestehenden
Zuschnitts (ein Modul, zwei Schemas, fünf Funktionen, ein Gate).

## Nächster sinnvoller Schritt

1. F11 und F3 in einer kurzen Ergänzung zu Abschnitt 4
   (Design-Entscheidungen) bzw. Abschnitt 9 (Offene Unsicherheiten) des
   Plans nachtragen — als `plan-v2-f4-invocation-policy.md`; plan-v1
   bleibt unverändert stehen.
2. Klärung von offener Unsicherheit 1 (F3-Export) mit Stefan — jetzt
   zusätzlich mit der Frage, ob die drei Primitiven oder eine gebündelte
   Verifikationsfunktion exportiert werden sollen (F6).
3. Erst danach Handoff-Vertrag `state/tasks/f4-invocation-policy.md`
   erstellen.
