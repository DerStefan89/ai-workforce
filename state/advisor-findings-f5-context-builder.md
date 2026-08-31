# Advisor-Findings — Plan v1 F5 Context Builder

**Geprüft gegen:** `state/plan-v1-f5-context-builder.md` (vollständig),
`features/F5/feature.md` (vollständig), `ARCHITECTURE.md` (vollständig),
`docs/projekt/zielfassung.md` (§4 Zeile 64–84, §12 Zeile 251, Zeile
140–145, §16.2 Zeile 330–334, §16.7 Zeile 364–366, D14 Zeile 316),
`docs/projekt/umsetzungsplan-fassung-1.md` (Zeile 65–79),
`src/lineage-registry/index.ts` und `types.ts` (vollständig),
`src/human-transport/index.ts` (vollständig, als Präzedenzmuster),
`src/authorization-boundary/index.ts` (Auszug, `{ok:false, grund}`-Muster),
`schemas/kontrollzustand-lineage-payload.schema.json`,
`schemas/kontrollzustand-bedarf-payload.schema.json`,
`schemas/profile.schema.json`, `state/nachtrag-e191-vorschlag.md`,
`.claude/agents/*.md`, `package.json`.

**Rollengrenze:** Advisor prüft einen Plan vor dem Bau, kein fertiges
Artefakt. Kein Code existiert. Nur Read/Grep/Glob verwendet, keine
Schreiboperation. Subagent `architecture-advisor`, frischer Kontext (kein
Zugriff auf die Planungssitzung).

**Marker-Legende:** `[Fakt]` belegt aus Quelle · `[Fakt, entlastend]`
belegt, spricht für den Plan · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Annahme]` nicht weiter geprüft · `[offene Unsicherheit]`
im Repo nicht klärbar.

---

## A. Entlastende Befunde (geprüft, in Ordnung)

**A1 `[Fakt, entlastend]`** Alle wörtlichen Zitate in Abschnitt 0 stimmen
mit den Quellen überein: §16.2-Zeile „**Context Builder** | begrenztes
Kontextpaket je Auftrag, mit Herkunftsreferenzen | keine
Zustandsentscheidung" (`docs/projekt/zielfassung.md:332`),
Umsetzungsplan-Zeile „5 | Context Builder | Muss vor dem Gateway stehen
— liefert das Kontextpaket" (`docs/projekt/umsetzungsplan-fassung-1.md:72`),
D14 „Domänenunabhängiger Kern, Prüfmittel im Profil" (`zielfassung.md:316`)
und §16.7 „Der Kern besitzt Lebenszyklus, Positionen, Übergangslogik […].
Das Profil liefert Auswahl, Schwellwerte und Zuordnung […]"
(`zielfassung.md:366`) — keine Verfälschung, keine Auslassung des
Kontexts gefunden.

**A2 `[Fakt, entlastend]`** `registriereKernArtefakt`-Signatur
`(artefaktId, profilReferenz, herkunft, daten, eingaben?, optionen?)` und
Rückgabe `{pfad, versionSequenz, inhaltsHash}` korrekt wiedergegeben
(`src/lineage-registry/index.ts:85-114`). Der im Plan 2.3 Schritt 4
skizzierte Aufruf folgt exakt dieser Reihenfolge.

**A3 `[Fakt, entlastend]`** `{ ok: false, grund: string }` ist ein
reales, etabliertes Muster, nicht neu erfunden —
`src/authorization-boundary/index.ts:161-199` (`pruefeAutorisierung`)
liefert dieselbe Form bei jedem Ablehnungsfall. D4 des Plans ist damit
korrekt belegt.

**A4 `[Fakt, entlastend]`** `profiles/profile.schema.json` (vollständig
gelesen) trägt ausschließlich `projekt, version, gates, dod, werkzeuge,
reviewRegeln` — kein Rollenfeld. Bestätigt D1 (Rollen gehören nicht ins
Profil).

**A5 `[Fakt, entlastend]`** Kein neuer Dateibaum: `registriereKernArtefakt`
ruft intern `schreibeCheckpoint` (F1) auf derselben Hash-Kette
`lineage-${artefaktId}` (`index.ts:106-109`) — ARCHITECTURE.md §2 Zeile
39 bleibt gewahrt.

**A6 `[Fakt, entlastend]`** `KONTEXTPAKET_V0` (Abschnitt 2.4) trägt kein
`runtime`-/`modell`-Feld — E-191 N1/N2
(`state/nachtrag-e191-vorschlag.md:28-31`) korrekt vorweggenommen.

**A7 `[Schlussfolgerung, entlastend]`** Der Plan braucht tatsächlich
keinen F1/F1B/F2-Code-Eingriff: alle referenzierten Funktionen werden
ausschließlich importiert, nicht verändert — analog zu F9s
`src/human-transport/index.ts:26-30`.

---

## B. Findings mit Klärungsbedarf

### B1 — Pfad-Kollision bei mehreren zitierten Bereichen derselben Datei (höchste Priorität) `[Schlussfolgerung]`

`[Fakt]` `pruefeStale` vergleicht pro `EingabeReferenz`-Eintrag
`aktuelleEingabeInhalte[eingabe.pfad]` gegen `eingabe.inhalts_hash`,
wobei `aktuelleEingabeInhalte: Record<string, string>` genau einen
String je Schlüssel `pfad` trägt (`src/lineage-registry/index.ts:209-232`).

`[Fakt]` AC3 (`features/F5/feature.md`) verlangt: „Zwei Anfragen mit
identischem Pfad **und identischem zitiertem Bereich** werden nur einmal
aufgenommen" — im Umkehrschluss müssen zwei Anfragen mit identischem
Pfad, aber unterschiedlichem zitiertem Bereich, als zwei separate
Elemente aufgenommen werden.

`[Schlussfolgerung]` Plan 2.3 Schritt 2 dedupliziert über
`pfad_oder_muster` + Inhalts-Hash. Zwei Anfragen mit gleichem Pfad, aber
unterschiedlichem Bereich/Inhalt, werden beide aufgenommen, beide mit
demselben `pfad`-Wert im `EingabeReferenz`-Array. `pruefeStale` kann für
diesen `pfad`-Schlüssel nur einen String vergleichen — die
Staleness-Prüfung ist für genau den von AC3 selbst verlangten Fall
strukturell nicht durchführbar. Kein Rand- oder Musterfall — tritt schon
bei zwei konkreten Anfragen auf dieselbe Datei auf.

### B2 — Fail-open bei unbekannter Rolle `[Schlussfolgerung]`

`[Fakt]` Plan 2.2: „jede unbekannte Rolle erhält die leere
Ausschlussliste (kein Ausschluss, nicht ‚alles ausgeschlossen')".

`[Schlussfolgerung]` Ein Tippfehler im `rolle`-Parameter führt nicht zu
einem Fehler, sondern zu vollem, unbeschränktem Zugriff — genau der
Fall, den die Ausschlussliste verhindern soll. Die Begründung des Plans
(„kein Sicherheitsmechanismus, kein heimliches Kompensieren") trägt
ebenso gut die entgegengesetzte Entscheidung: laut statt still
scheitern. Die gewählte Variante ist selbst eine stille Kompensation
(stiller Vollzugriff).

### B3 — Muster-Matching-Mechanismus unspezifiziert `[Fakt]` + `[offene Unsicherheit]`

`[Fakt]` `package.json` enthält keine Glob-/Pattern-Matching-Dependency;
Volltextsuche nach `glob(` liefert keine Treffer im Repo.

`[offene Unsicherheit]` Plan 2.2 nennt Beispiele wie `src/**`, was
Glob-Syntax impliziert, ohne den Vergleichsalgorithmus
(Präfix/Regex/Glob) zwischen `Anfrage.pfad_oder_muster` und
`ROLLEN_AUSSCHLUSSMUSTER` zu spezifizieren. Kein vorhandener Helper.
ARCHITECTURE.md §6 verlangt vor neuer Dependency den Skill
`werkzeug-auswahl`.

### B4 — Reihenfolgeabhängigkeit der Budget-/Evidenz-Entscheidung `[Schlussfolgerung]`

`[Fakt]` Plan 2.3 Schritt 3 verarbeitet Anfragen in Aufrufer-Reihenfolge,
laufende Budgetsumme.

`[Schlussfolgerung]` Ob eine `notwendig: true`-Anfrage einen Stopp
auslöst, hängt vom bereits durch vorherige, nicht notwendige Anfragen
verbrauchten Budget ab — dieselbe Anfrageliste kann je nach Reihenfolge
zwischen Erfolg und `EVIDENZLUECKE` wechseln. Für „Evidenz vor Budget"
(115) ist eine Priorisierung (notwendige Anfragen zuerst einplanen) die
naheliegendere Lesart; der Plan wählt implizit die schwächere Variante,
ohne das als Entscheidung zu benennen (CLAUDE.md-Entscheidungsregel 5).

### B5 — Faktischer Fehler in der Plan-Verifikation zu `pruefeStale` `[Fakt]`

`[Fakt]` Plan Abschnitt 0 behauptet: „Kein `pruefeStale`-Aufruf ohne
vorherige `registriereKernArtefakt`-Registrierung möglich (Funktion lädt
intern über `ladeArtefaktVersion`)".

`[Fakt]` Das stimmt nicht: `pruefeStale` (`index.ts:209-232`) prüft `if
(version !== null)`; andernfalls bleibt `geaenderteEingaben` leer und die
Funktion liefert `{ stale: false, geaenderteEingaben: [] }` — kein Wurf,
sondern ein stiller, vakuöser „nicht veraltet"-Befund.

`[Schlussfolgerung]` Ein Tippfehler in `laufId`/`versionSequenz`, oder
ein Aufruf vor dem eigentlichen Bau, wird nicht sichtbar, sondern liefert
`stale: false` — ein nie gebautes Paket könnte fälschlich als „frisch"
gelten. AC10 nennt diesen Fall nicht als Testfall.

### B6 — Duplikat-Kriterium weicht vom AC3-Wortlaut ab `[Schlussfolgerung]`, geringe Schwere

AC3 spricht von „identischem zitiertem Bereich", Plan 2.3 Schritt 2
verwendet den Inhalts-Hash als Proxy. Pragmatisch nachvollziehbar, aber
nicht als bewusste Abbildungsentscheidung benannt.

### B7 — Rollentabelle: Besetzung vs. Verantwortung `[Schlussfolgerung]`

`[Fakt]` §4 Rollenmodell definiert Verantwortungen (Autor, Prüfer,
Ausführer, Entscheider, Begleiter); konkrete Subagenten-Namen sind laut
Zeile 80 die „Besetzung Fassung 1" dieser Positionen, nicht die Rollen
selbst.

`[Schlussfolgerung]` Plan 2.2 hartcodiert `ROLLEN_AUSSCHLUSSMUSTER` auf
Besetzungsnamen, nicht auf §4-Verantwortungskategorien. Eine reine
Staffing-Änderung würde eine Kern-Datei-Änderung erzwingen. Kein
Show-Stopper (D1s Kern-vs-Profil-Antwort bleibt richtig), aber zusätzlich
zu benennende Fragilität.

### B8 — „executor" als Rollenwert kollidiert terminologisch mit bestehendem Feld `[Fakt]`, geringe Schwere

`src/human-transport/types.ts:33` und
`schemas/kontrollzustand-transport-payload.schema.json:28` verwenden
`executor: string` bereits als freien String für das
Transport-Zielsystem, nicht als Rollen-Enum-Wert. Rein terminologische
Doppeldeutigkeit, keine technische Kollision.

### B9 — Stopp-statt-Teilpaket (Plan-Punkt 7.1) `[offene Unsicherheit]`

Entscheidung 115 ist im Repo nur als Ein-Wort-Referenz belegt, ohne
weiteren Text (Register liegt außerhalb des Repos). Die Plan-Auslegung
(voller Stopp) ist intern konsistent mit dem D4/D10-Präzedenzmuster
(real bestätigt in A3), aber aus dem Repo allein nicht beweis- oder
widerlegbar. Klärung nur durch Stefan möglich, nicht durch weitere
Repo-Recherche.

---

## Urteil

**Nicht freigegeben.**

Begründung, nach Schwere sortiert: B1 ist ein struktureller
Mechanik-Fehler, der einen von AC3 selbst geforderten Fall (zwei
Elemente, gleicher Pfad, unterschiedlicher zitierter Bereich) nicht mit
F2s realer `pruefeStale`-API vereinbar macht — AC6/AC7 sind für diesen
Fall wie geplant nicht erfüllbar. B5 zeigt eine sachlich falsche
Verifikationsaussage im Plan selbst (Abschnitt 0 behauptet einen Wurf, wo
tatsächlich ein stiller Vakuous-Befund erfolgt). B2 betrifft eine
sicherheitsnahe Design-Entscheidung (fail-open bei Rollentippfehler), die
der eigenen Begründung im Plan widerspricht. B3 und B4 sind unbelegte
Annahmen bzw. stillschweigende Design-Entscheidungen. B6–B8 sind kleinere
Präzisierungen.

Vor Umsetzungsbeginn zu klären, nach Schwere: **B1** (zwingend, sonst
AC6/AC7 nicht wie spezifiziert baubar), **B5** (Plan-Abschnitt-0-Korrektur),
**B2** (fail-open vs. fail-closed bei unbekannter Rolle), **B4**
(Priorisierung notwendiger Anfragen explizit entscheiden), **B3**
(Muster-Matching-Mechanismus benennen). B6–B9 können als Hinweise in
plan-v2 einfließen, ohne zwingend eine weitere Advisor-Runde zu
erfordern, sofern B1/B2/B4/B5 sauber aufgelöst werden.

## Nächster sinnvoller Schritt

`plan-v2-f5-context-builder.md` als neue Datei mit expliziten Antworten
auf B1 (Schlüsselstrategie für Mehrfachzitate derselben Datei), B2
(fail-closed bei unbekannter Rolle), B3 (Matching-Mechanismus +
Dependency-Entscheidung) und B4 (Priorisierungsregel
notwendig-vs-optional) — Plan v1 bleibt unverändert stehen. Ein zweiter,
auf das Delta beschränkter Advisor-Pass vor dem Handoff-Vertrag.
