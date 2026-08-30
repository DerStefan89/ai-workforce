SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

Zielverzeichnis: Repo DerStefan89/ai-workforce, Branch
`feature/f9-human-transport` (bereits ausgecheckt, von `main` abgeleitet).

## TASK: f9-human-transport-bauauftrag

GOAL: Ein neues, eigenständiges Modul `src/human-transport/` setzt den
kompletten Ablauf aus `state/plan-v1-f9-human-transport.md` Abschnitt 2.3
um: `BEDARF_V0` erfassen und über F2 registrieren, ein Transportpaket
daraus bauen und registrieren, vor Aushändigung eine `RUN_PREPARED`-
Wirkungsmarke (F1B) schreiben, eine zurückkommende Antwort vor jeder
Registrierung gegen ein eigenes Schema prüfen, sie als neue
Transportpaket-Version registrieren und den Lauf über ein F1B-
Terminalartefakt abschließen, vor jeder Weiterverwendung F2s
`pruefeStale` aufrufen und bei `stale: true` über `haltFestStaleEntscheidung`
blockieren (D6), sowie den bestehenden Leitstand-Prototyp minimal um die
neuen Felder erweitern. Die Akzeptanzkriterien A1–A14 (inkl. A8a) aus
`state/plan-v1-f9-human-transport.md` Abschnitt 7 sind erfüllt.

CONTEXT:
- [Fakt] Vollständiger Plan: `state/plan-v1-f9-human-transport.md`
  (plan-v1, an diesem Tag um vier bindende Ergänzungen aus dem
  Advisor-Pass erweitert — D6, B5, B4, B6, siehe unten). Dieser Vertrag
  ist die Ausführungsanweisung dazu; bei Widerspruch gilt dieser Vertrag,
  bei dessen Schweigen der Plan.
- [Fakt] Advisor-Pass: `state/advisor-findings-f9-human-transport.md` —
  **Freigegeben mit Hinweisen.** Kein struktureller Mangel; D2 (Zweckent-
  fremdung von `eingabe.pfad` für die `BEDARF_V0`-Referenz) und D3
  (Zeitpunkt von `RUN_PREPARED`) tragen. Vier Punkte wurden als bindend
  entschieden und sind bereits in `state/plan-v1-f9-human-transport.md`
  eingearbeitet:
  - **D6 (löst B3):** `pruefeStale` liefert `stale: true` → F9 blockiert
    die Weiterverwendung, verlangt eine über F2s bestehendes
    `haltFestStaleEntscheidung` (`src/lineage-registry/index.ts:234`,
    Werte `neu_erzeugen`/`nachtrag`/`unveraendert_gueltig`) festgehaltene
    menschliche Entscheidung, bevor die Antwort als gültig gilt (Plan
    Abschnitt 4, D6; Abschnitt 7, A8a).
  - **B5:** benannte Hilfsfunktion `baueAktuelleEingabeInhalte` in
    `src/human-transport/index.ts` — liest reale Dateien **und** ergänzt
    den synthetischen `BEDARF_V0`-Eintrag, getrennt von
    `leseAktuelleEingaben` (Plan Abschnitt 5).
  - **B4:** F-031 ist real in `state/findings.md` vorhanden
    (`PROCESS_IMPROVEMENT`, P1, offen) — Referenz in Plan Abschnitt 0/10
    und `features/F9/feature.md` Nicht-Ziele bereits nachgezogen.
  - **B6:** D2-Formulierung zu `lineage-registry.test.ts` abgeschwächt
    (Test nutzt einen dateipfad-*förmigen* Schlüssel mit Literal-Inhalten,
    Zeile 144–160, nicht „echte Dateien") — bereits im Plan nachgezogen.
    **[Abweichung von der Auftragsvorgabe, mit Beleg]** Die
    Auftragsvorgabe „ARCHITECTURE.md-Zeilenverweis 41 → 40 korrigieren"
    wurde **nicht** übernommen: `ARCHITECTURE.md:41` (direkt gelesen,
    30.08.2026) trägt real den Satz „Artefakte werden versioniert, nicht
    überschrieben." — die ursprüngliche Zitierung im Plan (`:41`) ist
    korrekt, eine Änderung auf `:40` (dort steht der `profiles/`-Satz)
    wäre ein neuer Fehler gewesen. Plan-Zitat unverändert bei `:41`
    belassen.
- [Fakt] Feature-Akte: `features/F9/feature.md`, `Status:
  READY_FOR_TECH` (heute von `ENTWURF` angehoben, alle vier von
  `scripts/check-feature.mjs` bei diesem Status verlangten Abschnitte
  — Scope, Nicht-Ziele, Akzeptanzkriterien, Dependencies — real
  vorhanden). Bei Widerspruch gilt `feature.md` für WAS, der Plan für
  WIE.
- [Fakt] Dependencies erfüllt: F1B (`schreibeWirkungsmarke`
  `src/checkpoint-store/index.ts:530`, `stelleLaufstatusFest`
  `:697`) und F2 (`registriereKernArtefakt`
  `src/lineage-registry/index.ts:85`, `pruefeStale` `:209`,
  `haltFestStaleEntscheidung` `:234`) — beide gemergt, alle vier
  Funktionen ausschließlich von außen aufgerufen, kein Touch an
  `src/checkpoint-store/` oder `src/lineage-registry/` (D1).
- [Fakt] `haltFestStaleEntscheidung`-Signatur (real gelesen,
  `src/lineage-registry/index.ts:234-242`): `(artefaktId: string,
  versionSequenz: number, profilReferenz: ProfilReferenz, entscheidung:
  Entscheidung, begruendung?: string, betroffeneEingaben?: string[],
  optionen?: Optionen): { pfad: string; versionSequenz: number }` — wirft
  bei `entscheidung === 'unveraendert_gueltig'` ohne `begruendung`.
- [Fakt] Referenzmuster für das Gate-Skript:
  `scripts/check-f1b-wirkungsmarke.mjs`/
  `scripts/check-f3-authorization-boundary.mjs` — importiert
  Validierungs-/Kernfunktionen direkt aus dem Modul statt einen zweiten
  Regelsatz nachzubauen (D5-Muster).
- [Fakt] `package.json`: `check` (Zeile 17) und `check:template`
  (Zeile 18) sind zwei unabhängige Skript-Strings, aktuell endend auf
  `... && node scripts/check-f3-authorization-boundary.mjs && npm run
  test` bzw. `... && node scripts/check-f3-authorization-boundary.mjs`.
  `check-f9-human-transport.mjs` in beide direkt danach eintragen.
- [Fakt] Leitstand-Erweiterungspunkte real geprüft:
  `scripts/leitstand-server.mjs` Funktion `lineageFelder` (Zeile 38–45),
  `public/leitstand/app.js` Funktion `checkpointZeile` (Zeile 19–33) und
  Tabellenkopf (Zeile 39–43) — beide bereits bedingt auf `daten.art`
  verzweigend, gleiches Muster für die neuen Zweige `bedarf`/
  `transportpaket` nutzen. Kopfkommentar `leitstand-server.mjs:1-19`
  markiert die Datei als bewusst rein lesend — keine neue Schreiblogik.

SCOPE:
1. `schemas/kontrollzustand-bedarf-payload.schema.json`,
   `schemas/kontrollzustand-transport-payload.schema.json` (Draft
   2020-12, `additionalProperties: false`) + je ein
   `schemas/examples/kontrollzustand-bedarf*.valid.json`/
   `*.invalid*.json` und `kontrollzustand-transport*.valid.json`/
   `*.invalid*.json` (Muster: `kontrollzustand-lineage-payload.schema.json`
   + `schemas/examples/kontrollzustand-lineage*`, beschreibt nur
   `daten.daten`, wenn `bedarf_schema`/`transport_schema === "v0"`).
2. `src/human-transport/types.ts` — Feldformen aus Plan Abschnitt 2.1/2.2
   (`BEDARF_V0`, Transportpaket v1/v2), eigene `Entscheidung`-Re-Exporte
   wo nötig, kein Eingriff in `src/lineage-registry/types.ts` oder
   `src/checkpoint-store/types.ts`.
3. `src/human-transport/index.ts` — neues, eigenständiges Modul (D1):
   - `erfasseBedarf(laufId, profilReferenz, beschreibung, eingaben,
     optionen?)` — dünner Aufrufer von `registriereKernArtefakt("bedarf-
     <laufId>", ...)` mit `werkzeug_auswahl: null` (Plan 2.1).
   - `erzeugeTransportpaket(laufId, profilReferenz, inhalt, executor,
     optionen?)` — registriert Version 1 (Plan 2.2), `eingaben` verweist
     auf die `BEDARF_V0`-Version.
   - `haendigeAus(laufId, profilReferenz, optionen?)` — schreibt
     `RUN_PREPARED` (Plan 2.3 Schritt 3, D3) **vor** jeder Aushändigung.
   - `validiereTransportantwort(obj): { ok: boolean; fehler: string[] }`
     — handgeschriebene Feldprüfung (Plan 2.4, kein `ajv`, D5).
   - `importiereAntwort(laufId, profilReferenz, antwort, einstufung:
     'ERFOLGREICH' | 'VERWEIGERT', optionen?)` — bei Schemaverstoß: keine
     Registrierung, `schreibeWirkungsmarke(..., 'terminal', { ergebnis:
     'FEHLGESCHLAGEN', daten: { grund } })` (D4). Bei gültiger Antwort:
     Transportpaket Version 2 registrieren, danach
     `schreibeWirkungsmarke(..., 'terminal', { ergebnis: einstufung })`.
   - `baueAktuelleEingabeInhalte(laufId, echteDateien: Record<string,
     string>, optionen?): Record<string, string>` (B5) — liest reale
     Dateien (Aufrufer liefert Pfad→Inhalt, analog `leseAktuelleEingaben`
     in `scripts/leitstand-server.mjs:47-60`) **und** ergänzt den
     synthetischen Schlüssel für die aktuelle `BEDARF_V0`-Version über
     `ladeArtefaktVersion("bedarf-<laufId>", ...)` (Plan 2.5) zu einer
     gemeinsamen Map.
   - `pruefeUndEntscheideStale(laufId, profilReferenz, optionen?): {
     freigegeben: boolean; stale: boolean; geaenderteEingaben: string[]
     }` (D6) — ruft `pruefeStale("transport-<laufId>", 2,
     baueAktuelleEingabeInhalte(...))` auf. Bei `stale: false`:
     `{ freigegeben: true, stale: false, geaenderteEingaben: [] }`, keine
     Weiterverwendung blockiert. Bei `stale: true`: **keine** automatische
     Entscheidung — Funktion liefert `{ freigegeben: false, stale: true,
     geaenderteEingaben }` und wirft nicht; ein separater Aufruf
     `entscheideStale(laufId, profilReferenz, entscheidung, begruendung?,
     optionen?)` reicht direkt an `haltFestStaleEntscheidung` durch. Ein
     Terminalartefakt/eine Freigabe darf im Ablauf nur folgen, wenn
     `pruefeUndEntscheideStale` zuvor `freigegeben: true` geliefert hat
     ODER `entscheideStale` real aufgerufen wurde.
4. `src/human-transport/human-transport.test.ts` — `node:test`-Fälle für
   A2–A9 und A8a (D6): u. a. ein benannter Testfall analog
   `test('D2-synthetischer-Schlüssel: BEDARF_V0-Änderung nach
   Transportpaket-Erzeugung liefert stale:true')` (Advisor-Pass B2) sowie
   ein Testfall, der belegt, dass ohne `entscheideStale`-Aufruf nach
   `stale: true` keine Terminalregistrierung über die Modul-API möglich
   ist bzw. `pruefeUndEntscheideStale` weiterhin `freigegeben: false`
   liefert.
5. `scripts/check-f9-human-transport.mjs` — Gate-Skript, Muster wie
   `check-f1b-wirkungsmarke.mjs`: Payload-Fixtures gegen die beiden neuen
   Schemas, ein synthetischer End-zu-Ende-Lauf (Bedarf → Paket →
   RUN_PREPARED → gültige Antwort → Terminal ERFOLGREICH), ein
   Schemaverstoß-Fall (→ FEHLGESCHLAGEN), ein STALE-Fall (→ blockiert bis
   `entscheideStale`). Eingehängt in `npm run check` UND `npm run
   check:template`, direkt nach `check-f3-authorization-boundary.mjs`.
6. `scripts/leitstand-server.mjs`, Funktion `lineageFelder` (Zeile
   38–45): neuer Zweig für `daten.art === "bedarf"`
   (`beschreibung`/`werkzeug_auswahl`) und `daten.art ===
   "transportpaket"` (`status`/`executor`/`bezieht_sich_auf_bedarf`),
   gleiches Bedingungsmuster wie bestehende Zweige. Kein neuer
   Schreibpfad.
7. `public/leitstand/app.js`, Funktion `checkpointZeile` (Zeile 19–33)
   und Tabellenkopf (Zeile 39–43): neue, bedingt gerenderte Spalten
   Aufgabe/Status/Executor/Ergebnis.
8. `state/gates.md` — neue Tabellenzeile `F9-Human-Transport-Gate`,
   Rot-/Grün-Beleg erst nach realem Lauf eintragen (Muster wie die
   bestehenden Gate-Zeilen).
9. `state/memory-map.md` — neue Zeile „Human-Transport-Modul" →
   `src/human-transport/`, `schemas/kontrollzustand-bedarf-payload.
   schema.json`, `schemas/kontrollzustand-transport-payload.schema.json`,
   „nicht hierhin": kein Touch an `src/checkpoint-store/` oder
   `src/lineage-registry/`, keine Automatisierung der
   Werkzeug-/Bedarfsauswahl (F-031 bleibt eigenes, späteres Feature).
10. `docs/STATUS.md` — Eintrag unter „Erledigt" nach Bau, Muster wie die
    bestehende F3-Zeile.
11. `features/F9/journal.md` — Nachtrag: Advisor-Pass, Plan-Nachträge
    (D6/B5/B4/B6), dieser Vertrag, Ausführung.

NICHT:
- Execution Controller, Claude-Code-Gateway, Context Builder, Invocation
  Policy (Features #4–#8) — ausdrücklicher Nicht-Ziel-Rand.
- Automatische Bedarfsanalyse/Werkzeugempfehlung — `werkzeug_auswahl`
  bleibt manuell `null`, keine Heuristik (F-031 bleibt zurückgestellt).
- Jede Stufe-2-Orchestrierung — jeder Übergang (Erfassen, Aushändigen,
  Importieren, STALE-Entscheidung, Freigeben) ist eine für sich manuell
  ausgelöste Funktion, kein Auto-Start, keine automatische
  STALE-Entscheidung.
- Ein neuer Autorisierungsmechanismus — Freigaben bleiben F3s
  Zuständigkeit; F9 erzeugt kein `daten.autorisierung`-Feld selbst.
- Zusammenführung mehrerer `kontrollzustand`-Ketten im Leitstand zu einer
  Aufgaben-Zeile.
- Ein neues, generisches JSON-Schema-Validator-Tooling (`ajv` o. ä.) —
  handgeschriebene Validierung nach D5.
- `fetch`/HTTP-Client/Browsersteuerung in jedem Codepfad dieser Akte
  (AC10) — Gate-Skript oder Test belegt das über eine Grep-Prüfung,
  Muster wie F1Bs `TEMP-ROT-FALL`-Nachweis.
- Änderung von `src/checkpoint-store/` oder `src/lineage-registry/`
  (Exporte, Signaturen, Typen).
- `git add`/`git commit` im Schreibpfad ohne frische Freigabe.

BUDGET: Ein Baudurchgang plus höchstens eine Korrekturrunde. Zweites Rot
auf demselben Gate ⇒ BLOCKIERT ⇒ Mensch.

OUTPUT:
- Neue Dateien: `schemas/kontrollzustand-bedarf-payload.schema.json`,
  `schemas/kontrollzustand-transport-payload.schema.json` +
  zugehörige `schemas/examples/*`, `src/human-transport/{index,types}.ts`,
  `src/human-transport/human-transport.test.ts`,
  `scripts/check-f9-human-transport.mjs`. Zusätzlich (F-005/F-035-Muster
  — Planungsdokumente ausdrücklich ins Change-Set, nicht nur Produktcode,
  sonst CI-Fehlschlag wie bei F3): die bereits vor diesem Vertrag
  angelegten, aktuell untracked Dateien `features/F9/feature.md`,
  `state/plan-v1-f9-human-transport.md`,
  `state/advisor-findings-f9-human-transport.md`,
  `state/tasks/f9-human-transport-bauauftrag.md` gehören zum selben
  Commit.
- Geänderte Dateien: `scripts/leitstand-server.mjs`,
  `public/leitstand/app.js`, `package.json` (`check` und
  `check:template`), `state/gates.md`, `state/memory-map.md`,
  `docs/STATUS.md`, `features/F9/journal.md`.
- Beleg: `npm run check` und `npm run check:template` grün, Konsolen-
  Ausgabe im Bericht zeigen. Kalibrierungstest für das Gate-Skript
  (SCOPE.5): Grün-Fall (Ende-zu-Ende), Schemaverstoß-Fall
  (FEHLGESCHLAGEN), STALE-Fall (blockiert bis Entscheidung) je einmal
  real auslösen und den erwarteten Rot-/Grün-Ausgang zeigen.
  Kalibrierungstest für `human-transport.test.ts`: jeden Testfall aus
  SCOPE.4 real auslösen (temporäre Fixture-/Codemanipulation),
  Fehlschlag zeigen, zurücknehmen, Grün-Zustand zeigen. Regressionsbeleg:
  `checkpoint-store.test.ts`, `lineage-registry.test.ts`,
  `authorization-boundary.test.ts` bleiben unverändert grün (kein
  F1B-/F2-/F3-Touch).
- Commit ausschließlich mit expliziten Pfaden (nie `-A`/`.`), `git-flow`-
  Skill nutzen, kein Commit ohne frische Freigabe, Push separat
  autorisiert.
- Bericht: was gebaut wurde, welche Checks liefen (alle
  Rot-/Grün-Kalibrierungen), Ergebnis, echte Blocker.

ESCALATE:
- `state/plan-v1-f9-human-transport.md` (mit D6/B5/B4/B6-Nachträgen) oder
  `state/advisor-findings-f9-human-transport.md` fehlt oder widerspricht
  diesem Vertrag → abbrechen, melden, nichts anlegen.
- Einer der Kalibrierungstests reproduziert sich nicht wie hier
  beschrieben → anhalten, welcher Fall betrifft es, was tatsächlich
  passierte, melden. Nicht das Skript/den Test so lange anpassen, bis
  irgendein Fehler auftritt.
- `npm run check` wird rot an einem Glied, das dieser Auftrag nicht
  angefasst hat (insbesondere `checkpoint-store.test.ts`,
  `lineage-registry.test.ts`, `authorization-boundary.test.ts`) →
  anhalten und melden. Kein Nachziehen fremder Stellen.
- Eine der vorgegebenen Formulierungen/Signaturen (insbesondere D6s
  `pruefeUndEntscheideStale`/`entscheideStale`-Aufteilung) widerspricht
  `features/F9/feature.md` oder `state/plan-v1-f9-human-transport.md` →
  anhalten, beide Stellen zitieren, melden. Nicht selbst entscheiden,
  welche gilt.
- `git commit` oder `git push` wird ohne frische Freigabedatei verlangt
  → nicht ausführen.

Vertrag endet mit Freigabe-Halt: kein Bau, kein Commit, kein Push in
diesem Schritt. Ausführung erst nach Stefans expliziter, frischer
Freigabe.
