# Advisor-Findings — AF-F001: Feature-Akte im Repo

Geprüfter Plan: `state/plan-v1-af-f001-feature-akte.md`
Rolle: `architecture-advisor`, frischer Kontext, Read/Grep/Glob, kein Schreibrecht.

---

## Finding 1 — spec.md-Ablage widerspricht der bestehenden memory-map-Konvention

**Evidenz-Marker:** [Fakt]

**Beschreibung:** Der Plan legt `spec.md` (erzeugt mit dem Skill `spec-schreiben`) unter `features/<feature-id>/spec.md` ab. `state/memory-map.md` weist Specs jedoch bereits explizit einer anderen Heimat zu: „Spec: das WAS eines Vorhabens → `specs/`". Auch die Prozessdokumentation ist hier eindeutig: `docs/guide/06-DER-PROZESS.md:52` „Skill: `spec-schreiben` → Ergebnis nach `specs/`." und `docs/guide/04-DEEPDIVE-gedaechtnis.md:190-209` beschreibt `specs/` als alleinige Heimat für Spec-Artefakte. Der Plan (Abschnitt 4) begründet nur, warum `features/<id>/feature.md` und `journal.md` außerhalb von `specs/` liegen dürfen ("die Akte trägt mehr als eine Spec"), adressiert aber nicht, warum das eigentliche Spec-Artefakt selbst (`spec.md`) mit umzieht, obwohl memory-map und Prozess-Doku dafür bereits eine Heimat definieren. Abschnitt 2, Punkt 3 des Plans sieht zwar eine neue memory-map-Zeile für die Feature-Akte vor, aber keine Anpassung der bestehenden `specs/`-Zeile (z. B. eine „nicht hierhin"-Ergänzung, dass feature-gebundene Specs künftig nach `features/<id>/spec.md` gehören statt nach `specs/`).

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:22-27, 56-60`; `state/memory-map.md:23`; `docs/guide/06-DER-PROZESS.md:52`; `docs/guide/04-DEEPDIVE-gedaechtnis.md:190-209`

**Auswirkung:** Genau das Risiko, für dessen Vermeidung memory-map.md laut eigenem Kopftext existiert ("damit nichts doppelt und an zwei Stellen leicht widersprüchlich gepflegt wird") — zwei konkurrierende Heimaten für Spec-Artefakte, ohne dass die Umwidmung dokumentiert ist.

**Empfehlung:** In Plan v2 entweder (a) `spec.md` weiterhin nach `specs/<id>/` erzeugen und nur per Verweis aus `feature.md` verlinken, oder (b) explizit begründen und in der memory-map-Zeile für `specs/` als „nicht hierhin"-Fall eintragen, dass feature-gebundene Specs künftig unter `features/<id>/spec.md` liegen.

---

## Finding 2 — Gate-Fehlerpfad „features/ fehlt" weicht vom etablierten Muster in check-contract.mjs ab

**Evidenz-Marker:** [Fakt]

**Beschreibung:** Scope Punkt 2 verlangt, `check-feature.mjs` „nach dem Muster von check-contract.mjs" zu bauen. Das reale Muster in `scripts/check-contract.mjs:26-38` unterscheidet zwei Fälle mit zwei unterschiedlichen Meldungen: Verzeichnis fehlt komplett → „ⓘ kein Vertragsverzeichnis, nichts zu prüfen" (Exit 0); Verzeichnis existiert, ist aber leer → „ⓘ 0 Verträge geprüft" (Exit 0). Akzeptanzkriterium A4 des Plans sieht dagegen nur einen Fall vor: „Exit 0 mit Hinweis „0 Akten geprüft", wenn `features/` fehlt." Das ist die Formulierung, die im Referenzmuster für den *leeren, aber existierenden* Ordner steht, nicht für den *fehlenden* Ordner.

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:78`; `scripts/check-contract.mjs:26-38`

**Auswirkung:** Klein, aber real: A2 formuliert einen Fehlerpfad, der beim Bauen entweder falsch implementiert wird (weil er wörtlich als AK übernommen wird) oder beim Review als Abweichung vom selbst zitierten Referenzmuster auffällt. Fehlender zweiter Fall (leerer, aber vorhandener `features/`-Ordner) ist im Plan gar nicht als eigenes AK benannt.

**Empfehlung:** A4 in zwei AKs auftrennen (Verzeichnis fehlt vs. Verzeichnis leer), analog zu den zwei Meldungen in `check-contract.mjs`.

---

## Finding 3 — Akzeptanzkriterien decken nicht die volle in Scope 1.2 beschriebene Gate-Logik ab

**Evidenz-Marker:** [Schlussfolgerung]

**Beschreibung:** Scope Punkt 2 beschreibt die Gate-Logik als Verweigerung von `Status: READY_FOR_TECH` bei fehlendem *Ziel, Nicht-Zielen, Akzeptanzkriterien oder Dependencies* — vier Prüfbedingungen. Akzeptanzkriterium A3 testet aber nur einen einzigen dieser vier Fälle („ohne Akzeptanzkriterien"). Für die anderen drei (fehlendes Ziel, fehlende Nicht-Ziele, fehlende Dependencies) gibt es kein geprüftes AK — ebenso wenig für die übrigen laut Scope 1.1 pflichtigen Felder (Workstream-Liste, Entscheidungs-Referenzen, Zuordnung Meilenstein/Deliverable), die die Gate-Logik laut Scope 1.2 gar nicht prüft.

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:29-32` (Scope 1.2) vs. `state/plan-v1-af-f001-feature-akte.md:76-77` (A3)

**Auswirkung:** Frage 2 aus dem Prüfauftrag ("Sind die Akzeptanzkriterien tatsächlich prüfbar?") ist teilweise negativ zu beantworten — A3 ist für sich genommen prüfbar, deckt aber die Behauptung aus Scope 1.2 nicht vollständig ab. Ein Executor könnte die Gate-Logik korrekt für den in A3 getesteten Fall bauen und die anderen drei stillschweigend auslassen, ohne dass ein AK das auffängt.

**Empfehlung:** Entweder Scope 1.2 auf den tatsächlich geprüften Umfang reduzieren (nur Akzeptanzkriterien-Pflichtprüfung), oder je Prüfbedingung ein eigenes AK ergänzen (mind. eine Tabelle mit vier Rot-Fällen statt einem).

---

## Finding 4 — Fehlerpfad für nicht wohlgeformte feature.md nicht spezifiziert

**Evidenz-Marker:** [offene Unsicherheit]

**Beschreibung:** Die Gate-Logik greift laut Scope 1.2 nur, wenn `Status: READY_FOR_TECH` gesetzt ist. Weder Scope noch Akzeptanzkriterien sagen, was bei einem `feature.md` ohne `Status:`-Zeile, mit einem nicht erkannten Status-Wert oder mit doppelter `Status:`-Zeile passiert. Nach der beschriebenen Logik würde ein `feature.md` mit z. B. `Status: DRAFT` oder ganz ohne Status-Feld den Gate stillschweigend passieren, selbst wenn Ziel/Nicht-Ziele/Akzeptanzkriterien/Dependencies komplett fehlen.

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:29-32, 71-88` (kein Fehlerpfad für fehlenden/unbekannten Status)

**Auswirkung:** Fehlender Fehlerpfad im Sinne der Prüfaufgabe ("fehlende Fehlerpfade"). Ein Executor kann diese Lücke plausibel füllen, aber ohne Vorgabe entscheidet er sie selbst — CLAUDE.md verlangt, Entscheidungen zu dokumentieren statt sie stillschweigend in Code zu verwandeln.

**Empfehlung:** Mindestens einen Satz ergänzen, was bei fehlendem/unbekanntem Status-Feld gilt (z. B. „kein Status-Feld → Exit 1, Meldung `Status fehlt`").

---

## Finding 5 — Offener Punkt 2 (Reihenfolge AF-F001 vor Feature 0/1) ist in der führenden Quelle bereits entschieden

**Evidenz-Marker:** [Fakt]

**Beschreibung:** Plan Abschnitt 9, Punkt 2 führt die Reihenfolge „AF-F001 vor Feature 0/1 des Umsetzungsplans" als offenen, dem Menschen zur Bestätigung vorgelegten Punkt. `docs/projekt/umsetzungsplan-fassung-1.md:192-196` (Abschnitt 6, markiert `[Fakt, korrigiert]`) sagt aber bereits wörtlich: „Nächster Schritt ist damit das Nachziehen der Ebene-2-Grundlage in das Repository …, danach AF-F001 (Feature-Akte im Repo), danach Feature 0 aus Deliverable 1." Laut CLAUDE.md ist genau diese Datei die Referenz, „wenn die Reihenfolge … eines Features zu klären ist" — der Plan zitiert sie an dieser Stelle jedoch nicht.

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:113-115`; `docs/projekt/umsetzungsplan-fassung-1.md:192-196`

**Auswirkung:** Nicht falsch, aber inkonsistent: Der Plan behandelt als offen, was die führende Quelle bereits als Fakt festhält, ohne diese Quelle zu zitieren. Das deckt sich mit dem eigenen Verlässlichkeits-Hinweis am Kopf des Plans (Zeile 9-14: Repo-Stand zum Planungszeitpunkt nicht gegengeprüft) — die Vorsicht ist also erklärbar, sollte aber in Plan v2 durch den Verweis auf die bereits vorliegende Quelle ersetzt oder ergänzt werden, statt eine bereits schriftlich fixierte Reihenfolge erneut zur Bestätigung vorzulegen.

**Empfehlung:** In Plan v2 `docs/projekt/umsetzungsplan-fassung-1.md:192-196` als Beleg zitieren; wenn weiterhin eine explizite menschliche Bestätigung gewünscht ist, das als bewusste zweite Absicherung kennzeichnen, nicht als offene Frage ohne bekannten Stand.

---

## Finding 6 — Ablageort-Empfehlung (Abschnitt 4) steht in Spannung zu ihrer bereits fixierten Verwendung im SCOPE (Abschnitt 2)

**Evidenz-Marker:** [Schlussfolgerung]

**Beschreibung:** Abschnitt 4 markiert den Ablageort `features/<id>/` ausdrücklich als „[EMPFEHLUNG]", reversibel per `git mv`, „zu verwerfen, sobald ein echter Konflikt mit `specs/` auftritt" — also als vorläufig. Abschnitt 2 (SCOPE) benutzt genau diesen Pfad aber bereits als feststehende „Konvention", auf der alle weiteren Scope-Punkte (Gate-Pfad, memory-map-Zeile, die AF-F001-Akte selbst) aufbauen. Eine Konvention, die im selben Dokument gleichzeitig als settled Scope und als widerrufbare Empfehlung geführt wird, lässt offen, ob ein „echter Konflikt mit `specs/`" (der laut Abschnitt 4 zum Verwerfen führen soll) auch den bereits in Finding 1 beschriebenen `spec.md`-Konflikt einschließt.

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:21-22` (Scope) vs. `state/plan-v1-af-f001-feature-akte.md:56-60` (Abschnitt 4)

**Auswirkung:** Für sich genommen kein Blocker, aber es beantwortet die Prüffrage „ist der Ablageort-Vorschlag plausibel begründet oder nur behauptet?" nur teilweise: Die Begründung (Feature-Akte trägt mehr als eine Spec) ist plausibel für `feature.md`/`journal.md`, deckt aber nicht den in Finding 1 benannten Fall (`spec.md` selbst) ab — genau der Fall, den die eigene Rückzugsklausel in Abschnitt 4 („echter Konflikt mit `specs/`") eigentlich adressieren müsste.

**Empfehlung:** Abschnitt 4 um den `spec.md`-Fall aus Finding 1 explizit ergänzen, damit die Rückzugsklausel den relevantesten Konfliktfall auch tatsächlich erfasst.

---

## Finding 7 — Non-Scope-Punkt „Versionierte Prompt-Contracts" ohne erkennbaren Bezug zum Feature-Akte-Scope

**Evidenz-Marker:** [offene Unsicherheit]

**Beschreibung:** Abschnitt 3 (NICHT) listet „Versionierte Prompt-Contracts — YAGNI, erst bei zweitem konkreten Bedarf" zwischen Punkten, die alle klar benachbarte Module sind (Execution Controller, Checkpoint Store, Human Transport, API-Anbindung, Auto-Start, Hooks/Guards). Prompt-Contracts (Rollen-Systemprompts) haben keinen offensichtlichen Bezug zu einer Datei-Konvention für Feature-Akten. Der Plan erläutert nicht, warum dieser Punkt hier als Abgrenzung relevant ist.

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:47-48`

**Auswirkung:** Gering — vermutlich ein Copy/Paste-Rest aus einer anderen Abgrenzungsliste, aber nicht mit Sicherheit feststellbar aus dem Plan allein.

**Empfehlung:** In Plan v2 entweder den Bezug in einem Halbsatz herstellen oder den Punkt streichen, falls er nicht zum Feature-Akte-Scope gehört.

---

## Finding 8 — A1 „alle Pflichtabschnitte vorhanden" ist nicht operationalisiert

**Evidenz-Marker:** [offene Unsicherheit]

**Beschreibung:** A1 verlangt, dass `features/AF-F001/feature.md` existiert und „alle Pflichtabschnitte vorhanden" sind. Was „vorhanden" bedeutet — Abschnittsüberschrift vorhanden vs. Abschnitt mit nicht-leerem Inhalt gefüllt — ist nicht definiert. Der automatische Gate-Check (A2/A3) prüft laut Scope 1.2 nur den READY_FOR_TECH-Fall; ob AF-F001 selbst zu diesem Zeitpunkt überhaupt `Status: READY_FOR_TECH` trägt, ist im Plan nicht festgelegt. Ist der Status ein anderer, wäre A1 nicht durch den Gate-Lauf, sondern nur durch manuelle Durchsicht geprüft.

**Fundstelle:** `state/plan-v1-af-f001-feature-akte.md:72-73`

**Auswirkung:** A1 ist in der aktuellen Formulierung eher ein Sichtprüfungs- als ein Prüfkriterium im engeren Sinn (mit Ja/Nein durch ein Werkzeug beantwortbar). Das widerspricht dem im Skill `spec-schreiben` selbst formulierten Grundsatz „Eine Spec-Zeile, aus der kein Test werden kann, ist keine Spec-Zeile" — dasselbe Prinzip gilt sinngemäß für Akzeptanzkriterien in einem Plan.

**Empfehlung:** A1 präzisieren: entweder „jede Pflichtüberschrift aus Scope 1.1 ist vorhanden" (rein strukturell, automatisierbar) oder ausdrücklich als manuelles Kriterium kennzeichnen.

---

## Entlastende Befunde

**[Fakt, entlastend]** Die in Scope 1.1 verlangten Pflichtfelder von `feature.md` (Zuordnung Meilenstein/Deliverable, hard/soft-Dependencies, Workstream-Liste) sind keine neu erfundene Komplexität, sondern spiegeln die bereits in `docs/projekt/zielfassung.md:91-93` festgelegte Hierarchie „Vision/Ziel → Meilenstein → Deliverable → Feature → Workstream" samt „hard/soft-Abhängigkeiten" und „deterministischem Dependency-Gate" wider.

**[Fakt, entlastend]** `READY_FOR_TECH` ist kein im Plan neu erfundener Statuswert, sondern eine bereits in `docs/projekt/zielfassung.md:93,101` definierte Lifecycle-Stufe ("Feature wählen → READY_FOR_TECH → Workstream-Schnitt genehmigt → …").

**[Fakt, entlastend]** Der Ablageort `features/<feature-id>/` mit `feature.md`/`spec.md`/`journal.md` sowie `scripts/check-feature.mjs` und Einhängen in `npm run check:template` deckt sich wortgleich mit der bereits im Vorgänger-Vertrag skizzierten FOLGT-Ankündigung: `state/tasks/ebene2-architektur-in-repo-nachziehen.md:167`.

**[Fakt, entlastend]** Der Vorgänger-Vertrag schließt ein `features/`-Verzeichnis für sich selbst ausdrücklich aus („Kein `features/`-Verzeichnis … Das ist AF-F001 und läuft als eigener Vertrag danach", `state/tasks/ebene2-architektur-in-repo-nachziehen.md:134`) — der vorliegende Plan hält diese Abgrenzung sauber ein.

**[Fakt, entlastend]** Abschnitt 5 (Budget & Pässe: „Ein Baudurchgang plus höchstens eine Korrekturrunde") entspricht wörtlich der Zuschnitt-Heuristik aus `CLAUDE.md` ("ein Baudurchgang plus höchstens eine Korrekturrunde ohne Eskalation, mit eigenständig prüfbarem Artefakt").

**[Fakt, entlastend]** Die Non-Scope-Liste (Abschnitt 3) grenzt sauber gegen benachbarte, noch nicht gebaute Module ab (Execution Controller, Checkpoint Store, Artifact Registry, Human Transport, Leitstand, ChatGPT-API, Auto-Start) und begründet jeden Punkt kurz, konsistent mit `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2 und dem dort begründeten Reihenfolge-Modell.

**[Fakt, entlastend]** Der Gate-Aufbau folgt im Grundmuster tatsächlich `check-contract.mjs` (Verzeichnis-Iteration, Exit 0 bei leerem/fehlendem Verzeichnis, kein Einhängen in Prüfungen, die nichts mit dem Vertragstyp zu tun haben) — die Abweichung liegt nur im Detail (siehe Finding 2), nicht im Grundprinzip.

**[Fakt, entlastend]** Keine der geprüften Scope-Punkte berührt `ARCHITECTURE.md`-Regeln zu `kontrollzustand/`, Auth-Grenzen, Fehlerklassifikation (`ERFOLGREICH`/`VERWEIGERT`/`FEHLGESCHLAGEN`) oder verbotenen Patterns — der Plan bewegt sich ausschließlich in Markdown-Konventionen unter `features/`/`state/`/`docs/`, kein Konflikt mit ARCHITECTURE.md gefunden.

**[Fakt, entlastend]** Abschnitt 9, Punkt 1 (Repo-Stand nicht gegengeprüft) ist inzwischen belegbar erledigt: `ARCHITECTURE.md` und `CLAUDE.md` tragen zum Prüfzeitpunkt reale, projektspezifische Inhalte (keine reinen FÜLLUNG-Platzhalter mehr), und der zugehörige Vertrag `ebene2-architektur-in-repo-nachziehen` ist laut Git-Historie bereits gemerged (Commit `83be859`). Die im Plankopf verlangte Verifikation ist damit im Ergebnis erfüllbar, sofern Schritt A des Bauauftrags dies noch einmal formal feststellt.

---

## Gesamturteil

**FREIGEGEBEN MIT HINWEISEN**

Begründung: Der Plan ist im Kern solide und weitgehend aus bereits getroffenen Projektentscheidungen (`docs/projekt/zielfassung.md`, Vorgänger-Vertrag) hergeleitet, verletzt keine Regel aus ARCHITECTURE.md und hält Scope/Non-Scope sauber getrennt — er enthält jedoch einen nicht aufgelösten Konflikt mit der bestehenden `specs/`-Konvention aus `state/memory-map.md` (Finding 1) sowie mehrere Lücken in Fehlerpfaden und Prüfbarkeit der Akzeptanzkriterien (Findings 2–4, 8), die vor dem Handoff-Vertrag in Plan v2 geschlossen werden sollten, aber keine grundsätzliche Neuplanung erfordern.
