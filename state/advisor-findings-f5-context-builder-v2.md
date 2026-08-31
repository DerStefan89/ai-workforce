# Advisor-Findings — Plan v2 (Delta-Prüfung) F5 Context Builder

**Geprüft gegen:** `state/plan-v2-f5-context-builder.md` (vollständig),
`state/plan-v1-f5-context-builder.md` (als fortgeltende Grundlage),
`state/advisor-findings-f5-context-builder.md` (Vorbefunde B1–B9),
`features/F5/feature.md` (vollständig), `src/lineage-registry/index.ts`
(vollständig, insbes. `registriereKernArtefakt:85-114`,
`ladeArtefaktVersion:182-199`, `pruefeStale:209-232`),
`src/lineage-registry/types.ts` (vollständig), `ARCHITECTURE.md` §6/§7,
`src/human-transport/types.ts:33`, `src/authorization-boundary/index.ts`
(Stichprobe).

**Rollengrenze:** Advisor prüft ein Delta vor dem Bau, kein fertiges
Artefakt. Kein Code existiert. Nur `Read/Grep/Glob` verwendet. Aufgabe
beschränkt auf: löst jedes der sechs Deltas sein jeweiliges Finding
(B1–B8) tatsächlich auf — kein vollständiger Neu-Review des Gesamtplans.

**Marker-Legende:** `[Fakt]` belegt aus Quelle · `[Fakt, entlastend]`
belegt, spricht für das Delta · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Annahme]` nicht weiter geprüft · `[offene Unsicherheit]`
im Repo nicht klärbar.

---

## Delta 1 (löst B1) — zusammengesetzter Element-Schlüssel

**V1 `[Fakt, entlastend]`** `pruefeStale` ist ein reiner `Record`-Lookup
(`aktuelleEingabeInhalte[eingabe.pfad]`, `index.ts:221`), ohne Annahme
über das Stringformat von `pfad`. `registriereKernArtefakt` (Zeile 102)
reicht `eingaben` unverändert durch — Delta 1s Behauptung „`pruefeStale`
bleibt unverändert" ist faktisch zutreffend.

**V2 `[Fakt, entlastend]`** Rollenfilter (`a.pfad`, roh) und
Schlüsselbildung (zusammengesetzt) sind sauber getrennt und in der
richtigen Reihenfolge beschrieben (Rollenfilter zuerst).

**V3 `[Schlussfolgerung]` — neuer Kollisionsfall, Trennzeichen `#`.**
`elementSchluessel` escaped `#` im rohen Pfad nicht: `pfad: "a#b"` ohne
`bereichsKennung` kollidiert mit `pfad: "a"` + `bereichsKennung: "b"` —
beide ergeben denselben Schlüssel `"a#b"`. Nicht adressiert.

**V4 `[Schlussfolgerung]` — residualer Kollisionsfall auch ohne
`#`-Problem.** Zwei Anfragen mit identischem `pfad` und identischem
`bereichsKennung`, aber unterschiedlichem `inhalt`, werden vom
unveränderten Duplikat-Filter (exakter Hash-Vergleich) nicht
zusammengeführt — beide erhalten denselben zusammengesetzten `pfad`-Wert.
Reproduziert dieselbe Fehlerklasse wie B1, mit engerer
Auslösebedingung. Kein Schema-Netz fängt das ab
(`validiereArtefaktVersionDaten` prüft `eingaben` inhaltlich nicht).

**V5 `[Fakt]`, geringe Schwere** Hängender Querverweis „siehe Delta 6"
in Delta 1 — die dort erwartete Begründung fehlt in Delta 6. Redaktionell,
kein inhaltlicher Fehler.

**Fazit:** Der von B1 konkret benannte Fall ist strukturell korrekt
gelöst. Zwei angrenzende, nicht behandelte Kollisionsrisiken (V3, V4)
bleiben offen.

---

## Delta 2 (löst B2) — Fail-closed bei unbekannter Rolle

**V6 `[Fakt, entlastend]`** Vorgelagerte, eigenständige Prüfstufe mit
eigenem Rückgabewert und Ereignisnamen, konsistent zu 2.6. Kein
Widerspruch zu Rollenfilter oder Budget.

**V7 `[Schlussfolgerung, entlastend]`** Fail-closed widerspricht der
eigenen Sicherheitsbegründung des Plans nicht mehr.

**Fazit:** B2 vollständig und widerspruchsfrei aufgelöst.

---

## Delta 3 (löst B3) — Minimaler Präfix-Matcher

**V8 `[Fakt, entlastend]`** `passtMuster` vollständig als Code
angegeben, für `state/tasks/**` und `src/**` korrekt nachvollzogen.

**V9 `[Fakt]`, moderate Schwere — ARCHITECTURE.md-Zitat überdehnt.**
Delta 3 beruft sich auf §6, das wörtlich nur „Test-Framework"/„MCP-
Werkzeug" nennt (`ARCHITECTURE.md:70-72`), nicht allgemeine Utility-/
Pattern-Matching-Dependencies. Die YAGNI-Schlussfolgerung selbst bleibt
tragfähig, der konkrete Beleg ist ungenau zitiert.

**Fazit:** B3 im Kern gelöst; Zitat-Ungenauigkeit ohne
Freigaberelevanz.

---

## Delta 4 (löst B4) — zweiphasige Budgetvergabe

**V10 `[Fakt, entlastend]`** Das ursprüngliche B4-Problem
(Reihenfolgeabhängigkeit notwendig-vs-optional) ist durch die
Phasentrennung strukturell beseitigt — notwendige Anfragen konkurrieren
nie mehr gegen optionale ums Budget.

**V11 `[Schlussfolgerung]`, moderate Schwere — Phase A nur als Prosa
spezifiziert.** „gegen das volle Budget geprüft" ist zweideutig: (a)
kumulative laufende Summe (mit plan-v1 konsistente Lesart) oder (b) jede
notwendige Anfrage einzeln gegen das volle Budget geprüft. Lesart (b)
wäre ein Mechanik-Fehler: mehrere notwendige Anfragen, die einzeln unter
dem Maximum liegen, aber gemeinsam das Budget überschreiten, würden
fälschlich alle als passend gelten — ein budgetüberschreitendes Paket
würde gebaut, AC4/AC5 verletzt. Lesart (a) ist nahegelegt, aber nicht
mit Pseudocode wie in Delta 3 explizit gemacht.

**V12 `[Schlussfolgerung]`, geringe Schwere** Innerhalb der
notwendig-Gruppe bleibt eine Greedy-First-Fit-Reihenfolgeabhängigkeit für
die genaue Zusammensetzung von `nichtAufnehmbar` (nicht für das
Gesamtergebnis `ok: false`).

**Fazit:** Kernproblem gelöst; V11 sollte vor Bau als kumulativer
Algorithmus (Pseudocode) explizit festgehalten werden.

---

## Delta 5 (löst B5) — Korrektur der `pruefeStale`-Verifikation

**V13 `[Fakt, entlastend]`** Gegen den realen Code verifiziert
(`index.ts:209-232`, `ladeArtefaktVersion` `193-196`): korrekt
wiedergegeben — kein Wurf, stiller `{ stale: false }`-Befund bei
nicht existierender Referenz.

**V14 `[Fakt, entlastend]`** Neuer Testfall korrekt aus dem Code
abgeleitet, schließt die von B5 benannte Lücke in AC10.

**Fazit:** B5 vollständig und faktisch korrekt aufgelöst — sauberste
der sechs Deltas.

---

## Delta 6 (löst B6, B7, B8) — kleinere Präzisierungen

**V15–V17 `[Fakt, entlastend]`** B6 (reine Begründungsergänzung), B7
(reine Nicht-Ziel-Ergänzung), B8 (Umbenennung `executor` →
`ausfuehrung`, Kollision real bestätigt behoben, keine neue Kollision
gefunden) — alle drei ohne Verhaltens-/Seiteneffekt.

**V18 `[Schlussfolgerung]`, geringe Schwere — Terminologie.** §4 nennt
die Position wörtlich „Ausführer" (`zielfassung.md:72,80`), Delta 6 wählt
`ausfuehrung` (Vorgang statt Position) als Tabellenschlüssel. Löst die
Kollision zuverlässig, weicht sprachlich leicht von §4 ab — kosmetisch.

**Fazit:** B6–B8 sauber und ohne neue Nebenwirkungen aufgelöst.

---

## Prüfung der Akzeptanzkriterien-Zuordnungstabelle

**V19 `[Fakt]`** AC3, AC6/AC7, AC9, AC10 korrekt gegen `feature.md`
zugeordnet.

**V20 `[Schlussfolgerung]`, moderate Schwere — AC2 fehlt in der
Tabelle.** AC2 wird unter „unverändert" geführt, obwohl Delta 3 (der
Vergleichsalgorithmus) AC2 überhaupt erst umsetzbar macht — sollte
Delta 3 zugeordnet werden.

**V21 `[Schlussfolgerung, entlastend]`** AC4 korrekt als „unverändert"
geführt — für den reinen Optional-Fall verhält sich Phase B
beobachtbar identisch zum plan-v1-Mechanismus.

---

## Zusammenfassende Bewertung je Ursprungsfinding

| Finding | Status nach Delta-Prüfung |
|---|---|
| B1 | Ursprünglich benannter Fall gelöst; zwei angrenzende Restrisiken (V3 `#`-Kollision, V4 gleicher Schlüssel/unterschiedlicher Inhalt) |
| B2 | Vollständig gelöst |
| B3 | Gelöst; ARCHITECTURE.md-Zitat ungenau, Kernaussage tragfähig |
| B4 | Kernproblem gelöst; Ambiguität in Phase-A-Algorithmus sollte vor Bau geklärt werden |
| B5 | Vollständig und faktisch korrekt gelöst |
| B6–B8 | Vollständig gelöst, keine Seiteneffekte |

## Urteil

**Freigegeben mit Hinweisen.**

Begründung: Alle sechs Deltas lösen ihr jeweiliges Ursprungsfinding in
der Sache, drei davon (B2, B5, B6–B8) sauber und ohne Einschränkung.
Delta 1 und Delta 3 lösen ihr Finding vollständig für den ursprünglich
belegten Fall, lassen aber je einen angrenzenden Punkt offen (V3/V4 bzw.
V9). Delta 4 birgt die relevanteste offene Stelle: die fehlende
Pseudocode-Explizitheit für Phase A (V11) lässt eine Lesart zu, die
AC4/AC5 stillschweigend verletzen würde. Kein Finding rechtfertigt
„Nicht freigegeben" — im Unterschied zum ersten Pass gibt es keinen
strukturellen Mechanik-Fehler mehr, der eine geforderte AC unmöglich
macht, und keine sachlich falsche Tatsachenbehauptung im Plan mehr.

## Nächster sinnvoller Schritt

Vor dem Handoff-Vertrag, als kurzer Nachtrag in plan-v2 (keine dritte
Advisor-Runde nötig):
1. Delta 4 Phase A als kumulative laufende Summe gegen das volle Budget
   explizit spezifizieren (Pseudocode analog Delta 3, schließt V11).
2. Delta 1: `#` im rohen Pfad validieren/ablehnen (V3), identischer
   Schlüssel mit unterschiedlichem Inhalts-Hash als expliziter
   Fehlerpfad statt stillschweigender Doppelaufnahme (V4).
3. AC2 in der Zuordnungstabelle auf Delta 3 umstellen (V20).
