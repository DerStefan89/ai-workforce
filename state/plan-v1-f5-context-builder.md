# Plan v1 — Feature F5: Context Builder

Slug: f5-context-builder
Stand: 2026-08-30
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F5/feature.md` (Ziel/Scope/Nicht-Ziele/AC1-11).

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **`docs/projekt/zielfassung.md` §16.2 real gelesen:** „**Context
  Builder** | begrenztes Kontextpaket je Auftrag, mit Herkunftsreferenzen
  | keine Zustandsentscheidung". Eigene Tabellenzeile, gleiche Ebene wie
  Checkpoint Store, Artifact Registry/Lineage, Authorization Boundary —
  kein Unterpunkt eines anderen Moduls (gleiche Weiche wie F3 gegenüber
  F1B: eigenes Modul, kein fremder Touch).
- **Zeile 145 real gelesen:** „Context-Manifest statt Vollkopie (59) ·
  Historie auditierbar, kein aktiver Kontext (107) · Rohlogs getrennt
  (133) · …". Zwei tragende Prinzipien für F5: (a) das Paket ist ein
  gezielter Ausschnitt, keine Vollkopie; (b) eine bereits gebaute
  Vergangenheit bleibt nachvollziehbar (Lineage), wird aber nicht
  automatisch zum aktiven Kontext eines neuen Aufrufs — jeder Aufruf baut
  explizit neu, es gibt keinen impliziten „letzten Kontext wiederverwenden"
  -Pfad.
- **Zeile 251 real gelesen:** „rollenbezogene Context Views (113) ·
  deterministischer Mindestkontext (26, 34) · Nachforderungen begründet
  und begrenzt (114) · Evidenz vor Budget (115) · …". Vier Anforderungen,
  wörtlich in AC2/AC1/AC4/AC5 übersetzt: Rolle filtert, ein Mindestkontext
  ist deterministisch (nicht Gegenstand dieser Akte im Detail — siehe
  Abschnitt 3 NICHT), eine Nachforderung braucht Begründung, und eine
  notwendige Evidenzlücke schlägt nie durch Budget-Kürzung stillschweigend
  fehl.
- **`docs/projekt/umsetzungsplan-fassung-1.md` Zeile 72 real gelesen:**
  „5 | Context Builder | Muss vor dem Gateway stehen — liefert das
  Kontextpaket". Bestätigt Feature-Nummer 5 und Reihenfolge-Begründung
  wörtlich wie im Auftrag.
- **`src/lineage-registry/index.ts` real gelesen, nicht angenommen:**
  - `registriereKernArtefakt(artefaktId, profilReferenz, herkunft, daten,
    eingaben?, optionen?)` — `eingaben` ist optional, Typ `EingabeReferenz[]`
    (aus `src/lineage-registry/types.ts`, unten geprüft). Rückgabe `{
    pfad, versionSequenz, inhaltsHash }`.
  - `pruefeStale(artefaktId, versionSequenz, aktuelleEingabeInhalte:
    Record<string, string>, optionen?)` — der Aufrufer liefert den
    aktuellen Inhalt jeder Eingabe als String, keyed nach `eingabe.pfad`;
    die Funktion selbst liest nichts vom Dateisystem. F5 übernimmt exakt
    diese Grenze (AC8) — kein neues Präzedenzmuster, sondern
    Wiederholung eines bereits etablierten.
  - `laufId(artefaktId)` intern `lineage-${artefaktId}` — F5 registriert
    das Kontextpaket unter einer eigenen `artefaktId`
    (`kontextpaket-<lauf_id>`, Abschnitt 2.3), keine Kollision mit anderen
    Artefakt-IDs derselben `lauf_id`.
  - Kein `pruefeStale`-Aufruf ohne vorherige `registriereKernArtefakt`-
    Registrierung möglich (Funktion lädt intern über
    `ladeArtefaktVersion`) — AC7 setzt AC6 voraus, in dieser Reihenfolge
    zu testen.
- **`src/lineage-registry/types.ts` real geprüft** (`EingabeReferenz`):
  trägt mindestens `pfad` und `inhalts_hash` (von `pruefeStale` gegen
  `sha256Hex(aktuellerInhalt)` verglichen) — die Kontextpaket-Elemente
  werden 1:1 in dieser Form gehalten, damit sie ohne Übersetzungsschritt
  direkt als `eingaben`-Parameter an `registriereKernArtefakt`
  durchgereicht werden können (kein zweites Referenzformat erfinden,
  Prinzip aus F2s Nicht-Zielen: „Eine eigene Struktur/ein eigenes Format
  für `herkunft` oder `eingaben[].pfad` erfinden — bleiben unstrukturiert"
  übertragen: F5 übernimmt F2s Form unverändert, statt eine eigene zu
  erfinden).
- **`schemas/kontrollzustand-bedarf-payload.schema.json` und
  `src/human-transport/` als Muster für ein neues, eigenständiges
  Payload-Schema real geprüft:** F9s `BEDARF_V0` beschreibt ausschließlich
  die Form von `daten.daten` (checkpoint.payload.daten.daten), nicht die
  äußere Lineage-/Checkpoint-Hülle — diese bleibt von
  `validiereLineageEintrag`/`validiereCheckpointEintrag` (F1/F2)
  geprüft. `KONTEXTPAKET_V0` folgt demselben Muster (Abschnitt 2.4).
- **`state/nachtrag-e191-vorschlag.md` real gelesen:** N1 (Anbietername
  nur in dediziertem Runtime-Feld) und N2 (Rolle und Runtime bleiben
  getrennte Felder, nie kombiniert) — für F5 relevant, weil das
  Kontextpaket ein `rolle`-Feld trägt (AC2) und damit die Versuchung
  bestünde, „für Rolle X mit Modell Y" in ein Feld zu packen. `v0` trägt
  deshalb bewusst **kein** Runtime-Feld (Nicht-Ziel, AC9 als
  Vorsichtsmaßnahme, falls eine spätere Fassung eines hinzufügt).
- **`ARCHITECTURE.md` §2 real geprüft:** „Schreibend auf `kontrollzustand/`
  greift ausschließlich der Kern zu, und nur über die append-only
  Hash-Kette des Checkpoint Store." F5 hält sich daran über
  `registriereKernArtefakt` (F2), das intern `schreibeCheckpoint` (F1)
  aufruft — kein eigener Dateibaum, Muster wie F1B/F2/F9 (Option A).

## 1. Ziel (prüfbar)

Für eine gegebene `lauf_id` und `rolle` liefert eine Funktion aus einer
Liste konkreter, vom Aufrufer formulierter Anfragen (Pfad/Muster, Frage,
Begründung, bereits gelesener Inhalt) ein Kontextpaket, das nur
rollenzulässige, nicht-doppelte, budgetkonforme Elemente mit
Herkunftsreferenz enthält; eine notwendige, nicht ins Budget passende
Anfrage stoppt den Bau statt eines stillschweigend unvollständigen
Pakets; das Paket wird über F2 versioniert registriert und ist über F2
mechanisch auf STALE prüfbar.

## 2. SCOPE

### 2.1 Modul

`src/context-builder/{index,types}.ts`,
`context-builder.test.ts` — neuer, eigenständiger Modulordner, analog
D1 aus F3 (§16.2 führt „Context Builder" als eigene Tabellenzeile, kein
Unterpunkt eines anderen Moduls).

### 2.2 Rollenbezogene Context Views (offene Frage 2, Teilantwort)

**Design-Entscheidung D1:** Rollen sind Kern-Struktur (§4
Rollenmodell, §16.7: „Der Kern besitzt Lebenszyklus, Positionen,
Übergangslogik […]"), keine Profil-Zuordnung (D14: Profil liefert
„Auswahl, Schwellwerte und Zuordnung vorhandener **Prüfmittel**" — das
sind fachliche Prüfwerkzeuge wie Linter/Testrunner, nicht Rollen selbst).
Rollenbezogene Ausschlussregeln für F5 sind deshalb eine kleine, im Modul
selbst gehaltene Tabelle `ROLLEN_AUSSCHLUSSMUSTER: Record<string,
string[]>` (Rolle → Liste von Pfadmustern, die für diese Rolle
grundsätzlich ausgeschlossen sind — z. B. Reviewer-Rollen dürfen keine
`state/tasks/*`-Freigabeartefakte referenzieren, Advisor-Rollen keine
`src/**`-Diffs). Für `v0` genügt eine minimale, bewusst kleine Tabelle mit
genau den drei bestehenden Prüfrollen (`architecture-advisor`,
`code-reviewer`, `qa` — read-only laut `.claude/agents/*.md`) plus
`executor`; jede unbekannte Rolle erhält die leere Ausschlussliste (kein
Ausschluss, nicht „alles ausgeschlossen" — ein unbekannter Rollenname ist
kein Sicherheitsmechanismus, sondern ein Konfigurationsfehler, den F5
nicht heimlich kompensiert). Eine Anfrage, deren Pfad eines der
Ausschlussmuster der Rolle trifft, wird nicht aufgenommen (AC2).

Explizit nicht in dieser Akte: eine vollständige, mit dem realen
Rollenmodell aus `docs/projekt/zielfassung.md` §4 abgeglichene
Rollentabelle — die Modultabelle nennt keine feste Rollenliste für F5,
und eine erschöpfende Tabelle wäre ohne einen realen zweiten Aufrufer
(Gateway, F6) unbelegte Vorab-Abstraktion. Die Tabelle ist bewusst
erweiterbar (`Record`, kein geschlossenes Enum), ohne dass F5 selbst sie
vollständig befüllt.

### 2.3 Nachforderung / Budget (offene Frage 2, Rest)

```ts
interface Anfrage {
  pfad_oder_muster: string
  frage: string
  begruendung: string
  inhalt: string        // vom Aufrufer bereits gelesen — F5 liest nichts selbst
  notwendig?: boolean   // Default false; true = Evidenz vor Budget (115)
}

interface Budget {
  maxElemente?: number
  maxBytes?: number
}
```

`baueKontextpaket(laufId, rolle, anfragen: Anfrage[], profilReferenz,
budget: Budget, optionen?)`:

1. Rollenfilter (2.2) — je Anfrage: passt ein Ausschlussmuster der Rolle
   → `ausgeschlossen.push({ pfad, grund: 'rolle' })`, weiter zur
   nächsten Anfrage.
2. Duplikat-Filter — Schlüssel `pfad_oder_muster` (als `pfad` im Paket
   geführt) + Inhalts-Hash der bisher schon aufgenommenen Elemente; ein
   exaktes zweites Vorkommen wird übersprungen, nicht als Ausschluss mit
   Grund geführt (kein Fehlerzustand, reine Idempotenz — AC3 unterscheidet
   „ausgeschlossen" nicht von „bereits enthalten").
3. Budget-Durchsetzung — Anfragen in der vom Aufrufer übergebenen
   Reihenfolge; laufende Summe `elemente`/`bytes` (Byte-Länge von
   `inhalt`, UTF-8); eine Anfrage, die `maxElemente`/`maxBytes`
   überschreiten würde:
   - `notwendig !== true` → `ausgeschlossen.push({ pfad, grund: 'budget' })`,
     weiter zur nächsten Anfrage (AC4).
   - `notwendig === true` → **Stopp des gesamten Baus**, Rückgabe `{ ok:
     false, grund: 'EVIDENZLUECKE', nichtAufnehmbar: [pfad_oder_muster,
     …] }` — kein Teilpaket wird registriert (AC5, Entscheidung 115).
     Sammelt alle so blockierenden Anfragen in einem Durchlauf, statt
     beim ersten Treffer abzubrechen (ein Aufrufer soll die volle
     Evidenzlücke auf einmal sehen, nicht einzeln nachfragen müssen).
4. Bei Erfolg: `elemente` (angenommene Anfragen, Form deckungsgleich mit
   `EingabeReferenz`: `{ pfad, zitierter_bereich?: <aus
   pfad_oder_muster abgeleitet oder unverändert>, inhalts_hash:
   sha256Hex(inhalt) }`), `ausgeschlossen`, `rolle`, `laufId`,
   `erstellt_am` werden zu `KONTEXTPAKET_V0` (2.4) zusammengesetzt und
   über `registriereKernArtefakt('kontextpaket-' + laufId,
   profilReferenz, { rolle, quelle: 'context-builder' }, paketDaten,
   elemente, optionen)` registriert (AC6). Rückgabe `{ ok: true, pfad,
   versionSequenz, inhaltsHash, paket }`.

Kein Wurf bei einer erwarteten Evidenzlücke — gleiches Muster wie F3s
`pruefeAutorisierung`/F1Bs `stelleLaufstatusFest` (D10-Präzedenz): ein
unvollständiges Budget ist ein regulärer, benannter Ausgang.

### 2.4 `KONTEXTPAKET_V0` (offene Frage 1)

```json
{
  "kontextpaket_schema": "v0",
  "lauf_id": "...",
  "rolle": "...",
  "elemente": [
    { "pfad": "...", "zitierter_bereich": null, "inhalts_hash": "sha256..." }
  ],
  "ausgeschlossen": [
    { "pfad": "...", "grund": "rolle" }
  ],
  "erstellt_am": "..."
}
```

Schema `schemas/kontrollzustand-kontextpaket-payload.schema.json`
beschreibt ausschließlich diese `daten.daten`-Form (Muster
`kontrollzustand-bedarf-payload.schema.json`, F9) — die äußere
Lineage-Hülle bleibt von `validiereLineageEintrag` (F2) geprüft, kein
zweiter Regelsatz dafür. Kein `runtime`- oder `modell`-Feld (E-191 N1/N2,
siehe Abschnitt 0).

### 2.5 STALE-Prüfung vor Auslieferung

`pruefeKontextpaketFrisch(laufId, versionSequenz,
aktuelleEingabeInhalte: Record<string, string>, optionen?)` — dünner
Aufrufer von F2s `pruefeStale('kontextpaket-' + laufId, versionSequenz,
aktuelleEingabeInhalte, optionen)`, keine eigene Logik (AC7). Ein
Aufrufer, der ein zuvor gebautes Paket erneut ausliefern will, ruft diese
Funktion zuerst; `stale: true` blockiert die Auslieferung — die
Entscheidung, was dann geschieht (neu bauen, F2s
`haltFestStaleEntscheidung`), liegt außerhalb dieses Scopes beim
Aufrufer, exakt wie F9s Umgang mit `pruefeStale` (F9 AC7).

### 2.6 Strukturierte Laufausgabe

Neue Ereignisnamen `kontextpaket_gebaut`,
`kontextpaket_evidenzluecke`, `kontextpaket_stale_geprueft` (gleiches
Ereignisformat wie F1/F1B/F2), eigene Ereignis-Union in
`src/context-builder/types.ts` — kein Eingriff in fremde Unions (Muster
F2/F3/F9).

### 2.7 Gate, Tests, Doku

- `scripts/check-f5-context-builder.mjs` — Muster wie
  `check-f1b-wirkungsmarke.mjs`/`check-f9-*`: baut ein Kontextpaket gegen
  Wegwerf-Fixtures (Grünfall, Rollenausschluss, Budget-Überlauf mit/ohne
  `notwendig`), prüft STALE-Blockade. Eingehängt in `npm run check` und
  `npm run check:template`.
- `src/context-builder/context-builder.test.ts` — `node:test`-Fälle für
  AC1-AC9 (feingranularer als das Gate-Skript).
- Zeile in `state/gates.md`, Zeile in `state/memory-map.md`
  („Context-Builder-Modul" → `src/context-builder/`, `schemas/
  kontrollzustand-kontextpaket-payload.schema.json`, „nicht hierhin":
  nicht in `src/lineage-registry/` — eigenes Modul laut §16.2, keine
  Rollentabelle im Profil — Rollen sind Kern laut D14/§16.7).
- `docs/STATUS.md` — Eintrag unter „Erledigt" nach Bau.
- `features/F5/journal.md` — fortgeschrieben je Phase.

## 3. NICHT (Non-Scope, mit Grund)

- **Claude-Code-Gateway (Deliverable 3, #6), jeder Prozessstart.** Baut
  erst auf F5 auf, nicht Teil dieser Akte.
- **Invocation Policy / Protection Validator (#4), F-030.** F5 startet
  nichts, braucht keine Startfreigabe (feature.md Dependencies).
- **Ein vollständiger, deterministischer Mindestkontext je Rolle
  (26, 34).** Zeile 251 nennt „deterministischer Mindestkontext" als
  eigene, von „Nachforderungen begründet und begrenzt" (114) getrennte
  Anforderung. F5 liefert den Mechanismus, der eine Anfrageliste zu einem
  begrenzten Paket verarbeitet (114/115) — welche Anfragen ein
  Mindestkontext je Rolle *immer* enthält, ist eine spätere,
  rollenspezifische Konfigurationsfrage (vermutlich Sache des Aufrufers,
  der die initiale Anfrageliste zusammenstellt, nicht des Context
  Builders selbst, der nur filtert/budgetiert). Ohne einen realen
  Aufrufer (Gateway) wäre eine feste Mindestkontext-Liste unbelegte
  Vorwegnahme.
- **Ein Runtime-/Modell-Feld im Schema.** Siehe Abschnitt 0, E-191 N1/N2.
- **Caching/Wiederverwendung eines Pakets über mehrere Läufe hinweg.**
  Jeder Aufruf von `baueKontextpaket` baut neu; `pruefeKontextpaketFrisch`
  prüft nur ein bereits *innerhalb desselben Laufs* zuvor gebautes Paket
  auf STALE, ersetzt aber keinen impliziten Wiederverwendungsmechanismus
  über Läufe hinweg (Entscheidung 107 — Historie auditierbar, nicht
  aktiver Kontext).
- **Eine vollständige, gegen `docs/projekt/zielfassung.md` §4
  abgeglichene Rollentabelle.** Siehe 2.2 — bewusst minimal, erweiterbar,
  kein geschlossenes Enum.
- **Dateien/Bereiche selbst lesen.** Aufrufer liefert Inhalt (AC8,
  identische Grenze wie F2s `pruefeStale`).

## 4. Design-Entscheidungen

- **D1 (Rollenregeln im Kern-Modul, nicht im Profil):** siehe 2.2 —
  D14/§16.7 ordnen Rollen dem Kern zu, Profile liefern nur
  Prüfmittel-Zuordnung. Eine Ablage der Ausschlussregeln unter `profiles/`
  würde diese Grenze ohne Beleg verwischen.
- **D2 (Elemente-Form identisch zu F2s `EingabeReferenz`, kein eigenes
  Referenzformat):** vermeidet einen Übersetzungsschritt zwischen
  Kontextpaket-Element und `registriereKernArtefakt`-Parameter `eingaben`
  und folgt F2s eigenem Nicht-Ziel-Prinzip („kein eigenes Format für
  `eingaben[].pfad` erfinden") sinngemäß auf F5 übertragen.
- **D3 (Evidenzlücke sammelt alle betroffenen Anfragen, bricht nicht bei
  der ersten ab):** ein Aufrufer, der nachbessern muss (Budget erhöhen
  oder Anfrage fallen lassen), soll das vollständige Bild in einem
  Durchlauf bekommen — Wiederholung des Musters aus F1Bs
  `stelleLaufstatusFest`, das ebenfalls alle offenen `RUN_PREPARED`-
  Sequenzen in einem Feld sammelt statt nur die erste zu melden.
- **D4 (kein Wurf bei Evidenzlücke oder Rollenausschluss, `{ ok: false,
  grund }`):** gleiches Muster wie F3/F1B (D4/D10-Präzedenz) — ein
  unvollständiges Budget oder ein Rollenausschluss ist ein regulärer,
  benannter Ausgang, kein Programmfehler.
- **D5 (kein eigener Dateibaum, Option A über F2/F1 wie F1B/F2/F9):**
  keine neue Ablageform unter `kontrollzustand/` — `registriereKernArtefakt`
  läuft intern bereits über `schreibeCheckpoint` (F1), F5 fügt keine
  vierte Variante hinzu.

## 5. Ablageort

- `src/context-builder/{index,types}.ts`, `context-builder.test.ts` —
  neuer, eigenständiger Modulordner (D1).
- `schemas/kontrollzustand-kontextpaket-payload.schema.json` +
  `schemas/examples/kontrollzustand-kontextpaket*.json` — neben den
  bestehenden F0/F1/F1B/F2/F9-Schemas.
- `scripts/check-f5-context-builder.mjs` — neben den bestehenden
  Gate-Skripten.

## 6. Budget & Pässe

- Zuschnitt-Bewertung (CLAUDE.md-Heuristik): ein Baudurchgang plus
  höchstens eine Korrekturrunde, eigenständig prüfbares Artefakt (Gate +
  `npm run check` grün). Kein F1-/F1B-/F2-Touch nötig (D5) —
  Regressionsrisiko vergleichbar mit F9 (reiner externer Aufrufer).
  Advisor-Pass fällig: neues, blockierendes Gate, neues Schema, neues
  Architekturmuster (Rollenregeln als Kern-Struktur, Budget-vs-Evidenz-
  Mechanik) — Fokus auf D1 (Rolle im Kern statt Profil, trägt oder
  bricht bei erstem echten zweiten Aufrufer), D3 (Evidenzlücke-Sammlung)
  und die Frage, ob AC5s Stopp-statt-Teilpaket wirklich Entscheidung 115
  trifft oder zu restriktiv ist (ein Aufrufer könnte auch ein Teilpaket
  plus sichtbare Lücke bevorzugen — bewusst NICHT stillschweigend
  entschieden, siehe Abschnitt 7).
- Advisor-Pass — Subagent `architecture-advisor`, frischer Kontext,
  `Read/Grep/Glob`, danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot ⇒
  BLOCKIERT ⇒ Mensch.
- `state/gates.md`-Eintrag entsteht erst NACH dem realen Bau-/Prüflauf,
  mit echtem Befehl+Ausgabe-Beleg.

## 7. Offene Punkte, nicht stillschweigend entschieden

1. **Stopp-statt-Teilpaket bei Evidenzlücke (AC5/D3).** Entscheidung 115
   („Evidenz vor Budget") liest sich in diesem Plan als „nie ohne
   notwendige Evidenz ausliefern" — umgesetzt als vollständiger Stopp des
   Baus. Eine Alternative wäre ein Teilpaket, das die notwendige Evidenz
   fehlend, aber sichtbar als `nichtAufnehmbar` markiert ausliefert, statt
   den Bau ganz zu verweigern. Der Plan entscheidet sich für den Stopp,
   weil ein „Kontextpaket ohne die als notwendig markierte Evidenz" für
   eine Rolle irreführend wäre (sie könnte das Fehlen übersehen) — aber
   das ist eine Auslegung, kein aus 115 direkt ableitbarer Zwang. Advisor
   soll das gezielt prüfen.
2. **Rollentabelle als Kern-Konstante statt Parameter (D1/2.2).** Die
   Tabelle `ROLLEN_AUSSCHLUSSMUSTER` ist im Modul selbst hartcodiert,
   nicht als Parameter von `baueKontextpaket` übergebbar. Das folgt D14,
   könnte sich aber als zu starr erweisen, sobald ein realer zweiter
   Aufrufer (Gateway) eigene Rollen mitbringt, die die feste Tabelle nicht
   kennt. Bewusst nicht als Parameter geöffnet, um keine unbelegte
   Erweiterbarkeit vorwegzunehmen (YAGNI) — Advisor soll prüfen, ob das
   die richtige Seite des Tradeoffs ist.
3. **`zitierter_bereich`-Ableitung aus `pfad_oder_muster`.** Der Plan
   lässt offen, ob ein Muster (z. B. `src/**/*.ts`) 1:1 als
   `zitierter_bereich: null` durchgereicht wird oder ob eine Struktur
   (Zeilenbereich, Glob-Treffer-Liste) nötig ist. F2s `EingabeReferenz`
   lässt `zitierter_bereich` als `unknown` offen (F2-Nicht-Ziel: „bleiben
   unstrukturiert") — dieser Plan übernimmt das, könnte aber für
   `pruefeStale`s spätere Nützlichkeit zu grob sein, wenn ein Muster
   mehrere Dateien trifft und `pruefeStale` nur einen `pfad`-Schlüssel je
   Eingabe kennt (ein Muster mit mehreren Treffern bräuchte mehrere
   `EingabeReferenz`-Einträge, nicht einen). Advisor soll prüfen, ob 2.3
   Schritt 4 das korrekt auflöst oder ob ein Muster vor der Aufnahme in
   mehrere konkrete Pfad-Einträge aufgelöst werden muss (vom Aufrufer,
   da F5 selbst nicht liest).

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Release, echte Abzweigungen, Klärung der offenen Punkte oben |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Advisor-Pass auf diese Datei, Fokus auf Abschnitt 7.
2. Findings → `state/advisor-findings-f5-context-builder.md`.
3. Falls nötig: `plan-v2-f5-context-builder.md` als neue Datei — dieser
   plan-v1 bleibt unverändert stehen.
4. Handoff-Vertrag → `state/tasks/f5-context-builder.md`, SCHRITT 0
   wörtlich, sieben Pflichtsektionen. **Noch nicht ausführen** — Auftrag
   dieser Sitzung endet bei der Feature-Akte, nicht beim Bau.
