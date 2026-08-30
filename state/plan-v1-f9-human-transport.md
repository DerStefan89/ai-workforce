# Plan v1 — Feature F9: Human Transport

Slug: f9-human-transport
Stand: 2026-08-30
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F9/feature.md` (Ziel/Scope/Nicht-Ziele/AC1-11, aus
dem Auftrag dieser Sitzung abgeleitet).

Hinweis zur Ablage: der ursprüngliche Auftrag verlangte diesen Plan
zunächst unter `state/tasks/f9-human-transport.md` statt unter dem sonst
üblichen `state/plan-v1-<slug>.md` (siehe F1B/F3-Präzedenz). Das brach
real `scripts/check-contract.mjs` (Vertrags-Gate behandelt jede `.md`-
Datei unter `state/tasks/` als Handoff-Vertrag und verlangt SCHRITT 0 +
sieben Pflichtmarker) — entdeckt beim ersten realen Gate-Lauf vor dem
Bauauftrag, 30.08.2026. Auf Stefans Entscheidung hierher verschoben, um
den Gate-Konflikt zu vermeiden statt das Gate-Skript zu ändern. Inhalt
und Aufbau folgen der plan-v1-Konvention (Abschnitte 0–10 unten). Dies
ist **kein** Handoff-Vertrag im Sinne des Skills `handoff-vertrag` (keine
sieben Pflichtsektionen, kein Budget in Turns/Kosten) — der eigentliche
Handoff-Vertrag liegt in `state/tasks/f9-human-transport-bauauftrag.md`.

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **`BEDARF_V0` real im Repo gesucht, nicht angenommen:** `grep -ri
  BEDARF` über das gesamte Repo liefert ausschließlich Treffer aus
  anderen Wörtern (`Bedarfsauswahl`, `bedarfsgerecht` u. ä. in
  `docs/harness/werkzeug-katalog.md`, `state/tooling.md`,
  `.claude/skills/werkzeug-auswahl/SKILL.md`) — keiner davon ist ein
  Datenformat. `specs/` enthält nur `F0/` und `AF-F001/`. Es gibt **keine
  ursprüngliche F4-Übergabe** im Repo (Feature #4, Invocation Policy /
  Protection Validator, ist laut `docs/STATUS.md` „Erledigt"-Liste noch
  nicht gebaut — F0, F1, F1B, F2, F3 sind es). Der Auftragstext benennt
  „die ursprüngliche F4-Übergabe" als mögliche Quelle; diese Prüfung
  findet sie nicht. Konsequenz (Auftragsvorgabe „sonst neu anlegen"):
  `BEDARF_V0` wird in diesem Plan neu entworfen (Abschnitt 2.1), nicht
  aus einer nicht vorhandenen Quelle übernommen.
- **F-031 real in `state/findings.md` gesucht:** zum Prüfzeitpunkt dieses
  Plans lieferte `grep F-031 state/findings.md` keinen Treffer (Register
  endete bei F-019, gespaltenes Register, siehe F-036). **Nachtrag
  (Advisor-Pass B4, 30.08.2026):** F-031 ist inzwischen real in
  `state/findings.md` vorhanden (`PROCESS_IMPROVEMENT`, P1, offen —
  Werkzeug-/Bedarfsauswahl-Feature direkt nach S3 einplanen) und belegt
  „bewusst zurückgestellt" wörtlich. Die Grundsatzentscheidung (Platzhalter
  bleibt manuell) wird dadurch nicht neu verhandelt, nur die Referenz
  aktualisiert.
- **`docs/projekt/zielfassung.md` Zeile 336 real gelesen:** Modul-Tabelle
  (§16.2-Umfeld): „**Human Transport** | Transportpakete erzeugen,
  Antworten als untrusted Input übernehmen und schemaprüfen | keine
  Browserautomatisierung". Das ist die einzige Stelle im Dokument, die
  F9 fachlich beschreibt — keine weitere Ausdetaillierung vorhanden.
- **`docs/projekt/zielfassung.md` Zeile 341 real gelesen:** die
  Kontrollzustand-Struktur zählt „Transportpakete" bereits ausdrücklich
  neben Checkpoints/Artefakten/Lineage/Profilkonfiguration auf — F9 ist
  also als Artefakttyp **unter** `kontrollzustand/` vorgesehen, nicht als
  neuer, externer Ablageort (Unterschied zu F3, das bewusst außerhalb des
  Repos liegt, D16).
- **`ARCHITECTURE.md:27` real geprüft:** identische Aufzählung als
  verbindliche Ordnerstruktur-Konvention, bestätigt die vorige Zeile als
  Code-Konvention, nicht nur Zielbild.
- **`src/lineage-registry/index.ts` real gelesen (nicht nur Signatur):**
  `registriereKernArtefakt(artefaktId, profilReferenz, herkunft, daten,
  eingaben?, optionen?)` (Zeile 85) nimmt `daten: unknown` entgegen —
  bewusst offen (`schemas/kontrollzustand-lineage-payload.schema.json`
  Zeile 33: `"daten": {}`). Das reale Beispielfixture
  `schemas/examples/kontrollzustand-lineage-kern.valid.json` Zeile 19–22
  nutzt bereits `herkunft: { erzeuger: "kern", schritt: "coach-output"
  }` — ein Präzedenzfall, der den Human-Transport-Anwendungsfall
  („Coach" als externe Instanz) bereits vorwegnimmt, ohne dass F2 selbst
  je einen Human-Transport-Baustein gebaut hat. `pruefeStale(artefaktId,
  versionSequenz, aktuelleEingabeInhalte, optionen?)` (Zeile 209)
  vergleicht `aktuelleEingabeInhalte[eingabe.pfad]` gegen
  `eingabe.inhalts_hash` — der Schlüssel `eingabe.pfad` ist ein vom
  Aufrufer frei gewählter String, keine erzwungene echte Dateisystem-
  Prüfung (wichtig für Abschnitt 4, D2 unten).
- **`src/checkpoint-store/index.ts` real gelesen:** `schreibeWirkungsmarke
  (laufId, profilReferenz, art, zusatz?, optionen?)` (Zeile 530) verlangt
  bei `art: "terminal"` zwingend `zusatz.ergebnis ∈
  {ERFOLGREICH,VERWEIGERT,FEHLGESCHLAGEN}` (Zeile 541–545) und wirft vor
  jedem Schreiben bei ungültiger Kombination — kein halb geschriebener
  Zustand. `stelleLaufstatusFest(laufId, optionen?)` (Zeile 697) liefert
  `KLAERUNG_ERFORDERLICH` mit allen fünf laut `ARCHITECTURE.md:61`
  geforderten Bestandteilen, sobald eine `RUN_PREPARED`-Sequenz am Ende
  offen bleibt (FIFO-Paarung, Zeile 672–756).
- **`scripts/leitstand-server.mjs` und `public/leitstand/app.js` real
  gelesen (nicht angenommen, dass F10 nicht existiert):** ein
  funktionierender, rein lesender Prototyp existiert bereits
  (Kopfkommentar `leitstand-server.mjs:1-19`: „F10 Leitstand-Prototyp …
  bewusst wegwerfbar (kein Vertrag, kein Advisor-Pass)"). Er iteriert
  jedes Top-Level-Verzeichnis unter `kontrollzustand/` unabhängig
  (`sammleLaeufe`, Zeile 127–135) und rendert je Checkpoint eine Zeile
  über `lineageFelder` (Zeile 38–45, Server) und `checkpointZeile`
  (Zeile 19–33, `app.js`) — beide bereits bedingt auf `daten.art`
  verzweigend. Das ist der reale Erweiterungspunkt für Abschnitt 2.6,
  nicht ein neu zu bauendes UI-Modul.
- **`schemas/kontrollzustand-autorisierung-payload.schema.json` real
  geprüft:** gehört zu F3 (externe Freigabedatei-Struktur), nicht zu F9.
  Verwechslungsgefahr ausgeschlossen — F9 führt ein eigenes,
  unabhängiges Schema.

## 1. Ziel (prüfbar)

Ein `BEDARF_V0` lässt sich für eine `lauf_id` erfassen und über F2
registrieren; daraus entsteht ein Transportpaket, das ebenfalls über F2
registriert wird und dessen Aushändigung an die menschliche Brücke durch
eine F1B-`RUN_PREPARED`-Marke bezeugt ist; eine später zurückkommende
Antwort wird vor jeder Registrierung gegen ein eigenes Schema geprüft,
als neue Version des Transportpakets registriert und schließt den Lauf
über ein F1B-Terminalartefakt ab; vor jeder Weiterverwendung der Antwort
blockiert F2s `pruefeStale` veraltete Eingaben; der bestehende Leitstand-
Prototyp zeigt Aufgabe/Status/Freigabestatus/Executor/Ergebnis an.

## 2. SCOPE

### 2.1 `BEDARF_V0` — Feldliste (neu entworfen, Abschnitt 0 bestätigt: kein Vorgänger im Repo)

Liegt als `daten`-Argument von `registriereKernArtefakt(artefaktId =
"bedarf-<lauf_id>", profilReferenz, herkunft, daten, eingaben)` — F2
selbst lässt `daten` bewusst offen (Abschnitt 0), F9 definiert hier seine
eigene, benannte Innenstruktur:

```
{
  "bedarf_schema": "v0",
  "lauf_id": "...",
  "beschreibung": "...",           // Klartext: was wird gebraucht, wofür
  "werkzeug_auswahl": null,        // Platzhalter — Auftragsvorgabe: vorerst
                                    // manuell befüllt, keine Automatisierung.
                                    // Befüllt-Form (spätere Version, sequenz 2+):
                                    // { "kandidat": "...",
                                    //   "quelle": "docs/harness/werkzeug-katalog.md" |
                                    //             "state/tooling.md",
                                    //   "manuell_bestaetigt_am": "..." }
  "erstellt_am": "..."             // ISO-Zeitstempel
}
```

Registriert mit `herkunft: { erzeuger: "mensch", schritt: "bedarf-
erfassung" }` (Muster aus dem F2-Fixture, Abschnitt 0) und `eingaben`
als reale Dateireferenzen (Pfad + zitierter Bereich + Inhalts-Hash), die
den Bedarf fachlich begründen — z. B. ein Spec- oder Auftragsdokument.
`werkzeug_auswahl` bleibt bei der ersten Version `null`; eine spätere
manuelle Befüllung ist laut `ARCHITECTURE.md:41` („versioniert, nicht
überschrieben") eine **neue** Version desselben `artefakt_id` über
denselben `registriereKernArtefakt`-Aufruf, keine Mutation.

### 2.2 Transportpaket — Feldliste

`artefakt_id = "transport-<lauf_id>"`, ebenfalls über
`registriereKernArtefakt`, mit `eingaben` = [{ Referenz auf die
`BEDARF_V0`-Version, siehe D2 unten }]:

Version 1 (vor Aushändigung):
```
{
  "transport_schema": "v0",
  "bezieht_sich_auf_bedarf": { "artefakt_id": "bedarf-<lauf_id>", "versionSequenz": N },
  "inhalt": "...",              // der auszuhändigende Text/Payload
  "executor": "...",            // Klartext, z. B. "ChatGPT (manueller Kopierblock)"
                                 // — analog zielfassung.md Backlog-Notiz
                                 // „Coach = ChatGPT nur als manueller
                                 // Kopierblock-Workflow über Human Transport"
  "status": "ERSTELLT"
}
```

Version 2 (nach Import der Antwort, SCOPE.4):
```
{
  "transport_schema": "v0",
  "bezieht_sich_auf_bedarf": { "artefakt_id": "bedarf-<lauf_id>", "versionSequenz": N },
  "antwort": "...",             // importierter, ungeprüfter Text (untrusted,
                                 // erst NACH Schemaprüfung SCOPE.3 hier abgelegt)
  "status": "ANTWORT_EINGETROFFEN",
  "importiert_am": "..."
}
```

### 2.3 Ablauf mit F1B-Anbindung (Kern dieser Akte)

1. `BEDARF_V0` registrieren (2.1).
2. Transportpaket Version 1 registrieren (2.2).
3. **Vor** der Aushändigung: `schreibeWirkungsmarke(lauf_id,
   profilReferenz, "run_prepared")` — Außenwirkung beginnt mit dem
   manuellen Verlassen des Systems (zielfassung.md §16.4-Prinzip, wie
   F1B es für jeden Lauf mit möglicher Außenwirkung verlangt).
4. Mensch trägt das Paket manuell aus (Kopierblock o. ä.) — kein
   Systemzugriff, keine Browserautomatisierung.
5. Antwort kommt zurück → Schemaprüfung (2.4) **vor** jeder
   Registrierung.
   - Gültig: Transportpaket Version 2 registrieren (2.2), danach
     `schreibeWirkungsmarke(lauf_id, profilReferenz, "terminal", {
     ergebnis: "ERFOLGREICH" | "VERWEIGERT", daten: {...} })` — welcher
     der beiden Werte greift, entscheidet die menschliche Einstufung der
     Antwort (brauchbar vs. bewusst verworfen), nicht die Schemaprüfung
     allein.
   - Ungültig (Schemaverstoß): keine Registrierung, stattdessen
     `schreibeWirkungsmarke(..., "terminal", { ergebnis: "FEHLGESCHLAGEN",
     daten: { grund: "..." } })` — deckt sich mit `ARCHITECTURE.md:58`
     (ungültige Beobachtungsbasis → `FEHLGESCHLAGEN`).
6. Vor jeder Weiterverwendung der Antwort: `pruefeStale("transport-
   <lauf_id>", 2, aktuelleEingabeInhalte)` (2.5). Liefert das `stale:
   true` (z. B. weil `BEDARF_V0` sich seit Transportpaket-Erzeugung
   geändert hat), blockiert F9 die Weiterverwendung sofort (D6) — kein
   stillschweigendes Weiterlaufen mit der veralteten Antwort.
7. `stelleLaufstatusFest(lauf_id)` erkennt eine offene `RUN_PREPARED`
   ohne Terminal (Mensch antwortet nie) als `KLAERUNG_ERFORDERLICH` —
   ohne dass F9 dafür eigenen Code braucht (reine Wiederverwendung, AC8).

### 2.4 Schemaprüfung der importierten Antwort (untrusted Input)

Eigenes, neues Schema `schemas/kontrollzustand-transport-payload.schema.
json`, beschreibt ausschließlich die Form von `daten.daten`, wenn
`bedarf_schema`/`transport_schema` `"v0"` ist — analog zu
`schemas/kontrollzustand-lineage-payload.schema.json`, das ausschließlich
`checkpoint.payload.daten` beschreibt, wenn `daten.typ === "lineage"`
(siehe Zeile 5 dieser Datei). Prüfung selbst folgt dem im Repo
etablierten Muster **ohne** Schema-Validator-Bibliothek
(`scripts/check-datenformate.mjs` Zeile 10–13, D5 aus
`state/plan-v1-feature0-datenformate.md`; Präzedenz auch bei
`validiereCheckpointEintrag`/`validiereWirkungsmarkeEintrag`,
`src/checkpoint-store/index.ts:167/216`): eine handgeschriebene
`validiereTransportantwort(obj): string[]`-Funktion, die die Pflichtfelder
und Wertebereiche von Hand nachbildet. Kein `ajv`, keine neue
Werkzeugentscheidung nötig (bestehende, bereits geprüfte Konvention).

### 2.5 Staleness-Prüfung vor Freigabe (F2 `pruefeStale`, unverändert)

`pruefeStale` vergleicht `aktuelleEingabeInhalte[eingabe.pfad]` gegen den
bei der Registrierung festgehaltenen `inhalts_hash` (Abschnitt 0). Für
reale Dateireferenzen (z. B. das Spec-Dokument hinter `BEDARF_V0`)
liefert der Aufrufer den aktuellen Dateiinhalt wie in F2 selbst üblich
(vgl. `scripts/leitstand-server.mjs` Zeile 47–60,
`leseAktuelleEingaben`). Für die Frage „hat sich der zugrunde liegende
`BEDARF_V0` seit Erzeugung des Transportpakets geändert" (D2 unten) liest
der Aufrufer stattdessen die aktuelle `BEDARF_V0`-Version über
`ladeArtefaktVersion("bedarf-<lauf_id>")` und übergibt deren serialisierte
Form unter demselben synthetischen Schlüssel, den `eingaben[].pfad` bei
der Transportpaket-Registrierung trägt.

### 2.6 Leitstand-Erweiterung (minimal, bestehende Dateien)

Erweiterungspunkte, keine neuen Dateien:
- `scripts/leitstand-server.mjs`, Funktion `lineageFelder` (Zeile
  38–45): neuer Zweig für `daten.art === "bedarf"` (liefert
  `beschreibung`, `werkzeug_auswahl`) und `daten.art === "transportpaket"`
  (liefert `status`, `executor`, `bezieht_sich_auf_bedarf`) — gleiches
  Bedingungsmuster wie die bestehenden Zweige für `artefakt_version`/
  `stale_entscheidung`.
- `public/leitstand/app.js`, Funktion `checkpointZeile` (Zeile 19–33)
  und die Tabellenkopfzeile (Zeile 39–43): neue Spalten
  Aufgabe/Status/Executor/Ergebnis, bedingt gerendert wie die
  bestehenden `lin.*`-Felder.
- Freigabestatus: falls ein Checkpoint/eine Wirkungsmarke ein
  `daten.autorisierung`-Feld trägt (F3-Konvention,
  `state/plan-v1-f3-authorization-boundary.md` SCOPE.3), zeigt der
  Leitstand dessen `entscheidung`-Wert an — F9 erzeugt dieses Feld nicht
  selbst (Nicht-Ziel, `features/F9/feature.md`).
- Ausdrücklich **keine** neue Schreiblogik in `leitstand-server.mjs` —
  bleibt rein lesend (Kopfkommentar-Konvention dort unverändert
  gültig).

## 3. NICHT (Non-Scope, mit Grund)

- **Execution Controller, Claude-Code-Gateway, Context Builder,
  Invocation Policy** (Features #4–#8) — ausdrücklicher Nicht-Ziel-Rand
  des Auftrags.
- **Automatische Bedarfsanalyse/Werkzeugempfehlung** — `werkzeug_auswahl`
  bleibt manuell (2.1), keine Heuristik, kein Scoring.
- **Stufe-2-Orchestrierung** — jeder Übergang (Erfassen, Aushändigen,
  Importieren, Freigeben) ist eine für sich manuell ausgelöste
  Funktion, kein Auto-Start.
- **Ein neuer Autorisierungsmechanismus** — Freigaben bleiben F3.
- **Zusammenführung mehrerer `kontrollzustand`-Ketten im Leitstand** zu
  einer Aufgaben-Zeile — bewusst unterlassen (Abschnitt 2.6), wäre ein
  eigenständiges UI-Feature ohne Auftrag.
- **Ein neues, generisches JSON-Schema-Tooling** — die handgeschriebene
  Validierung (2.4) folgt der bereits getroffenen, dokumentierten
  Werkzeugentscheidung (D5, `state/tooling.md`), keine neue Prüfung
  nötig.

## 4. Design-Entscheidungen

- **D1 (eigenes Modul `src/human-transport/`, kein F1B-/F2-Touch):**
  Analog zu F2 gegenüber F1 und F3 gegenüber F1B — F9 ruft
  `schreibeWirkungsmarke`/`stelleLaufstatusFest` (F1B) und
  `registriereKernArtefakt`/`pruefeStale` (F2) ausschließlich von außen
  auf, verändert keine fremden Exporte. `zielfassung.md` Zeile 336 führt
  „Human Transport" außerdem als eigene Zeile in derselben Modul-Tabelle
  wie Checkpoint Store, Artifact Registry und Authorization Boundary —
  gleiche Modulschnitt-Begründung wie F3s D1
  (`state/plan-v1-f3-authorization-boundary.md` Abschnitt 4).
- **D2 (Staleness-Referenz auf `BEDARF_V0` über einen synthetischen
  `pfad`-Schlüssel, kein Umbau von `pruefeStale`):** `pruefeStale`
  vergleicht Werte in einer vom Aufrufer gelieferten Map
  (`aktuelleEingabeInhalte`), keyed by `eingabe.pfad` — dieser String ist
  laut F2-Code (Abschnitt 0) frei wählbar, keine erzwungene
  Dateisystem-Semantik. F9 nutzt das, um „ist der zugrunde liegende
  `BEDARF_V0` seit Erzeugung des Transportpakets neuer geworden" ohne
  Änderung an F2 zu prüfen. **Offener Punkt für einen Advisor-Pass** (Abschnitt
  10): das ist eine Zweckentfremdung des `pfad`-Feldes (kein echter
  Dateipfad), technisch von F2 gedeckt, aber ohne Präzedenz in F2s eigenen
  Tests: `lineage-registry.test.ts` (Zeile 144–160, `AC14-Hauptfall`)
  nutzt einen dateipfad-*förmigen* Schlüssel (`'docs/zitierte-
  eingabe.md'`), liest die verglichenen Inhalte aber nicht von der Platte,
  sondern übergibt sie als literale Test-Strings — kein Test einer
  reinen Artefakt-zu-Artefakt-Referenz wie hier vorgesehen (Advisor-Pass
  B6, Formulierung präzisiert 30.08.2026). Alternative wäre ein neuer,
  F9-eigener Vergleich außerhalb von `pruefeStale` — bewusst nicht
  gewählt, weil das AC7/Scope.5 wörtlich „F2s pruefeStale … nutzen, nicht
  duplizieren" verletzen würde.
- **D3 (`RUN_PREPARED` vor Aushändigung, nicht erst bei Rückkehr):** F1Bs
  A5 verlangt die Wirkungsmarke „vor der möglichen Außenwirkung"
  (`features/F1B/feature.md` AC3). Die Außenwirkung von Human Transport
  beginnt, sobald der Mensch das Paket außerhalb des Systems weiterträgt
  — nicht erst, wenn eine Antwort zurückkommt. Eine spätere
  `RUN_PREPARED`-Platzierung (z. B. erst beim Import) würde eine
  Aushändigung ohne jede Wirkungsmarke zulassen, falls der Mensch nie
  zurückkehrt — genau der Fall, den F1Bs `KLAERUNG_ERFORDERLICH`
  auffangen soll.
- **D4 (Terminalartefakt `FEHLGESCHLAGEN` bei Schemaverstoß, nicht
  `VERWEIGERT`):** `ARCHITECTURE.md:58` ordnet „ungültige
  Beobachtungsbasis" ausdrücklich `FEHLGESCHLAGEN` zu, getrennt von einer
  inhaltlichen (gültigen) Verweigerung. Eine schemawidrige Antwort ist
  keine gültige Beobachtungsbasis für irgendeine Klassifikation — sie
  ist kein Fall von „der Mensch hat die Antwort inhaltlich abgelehnt"
  (das wäre `VERWEIGERT`, weiterhin möglich für eine schemakonforme, aber
  inhaltlich unbrauchbare Antwort).
- **D5 (kein neues Schema-Validator-Tooling):** die einzige im Repo
  etablierte Konvention für Datenformat-Prüfung ist handgeschrieben
  (Abschnitt 0/2.4). Eine neue Bibliothek (`ajv` o. ä.) wäre eine
  unbegründete Abweichung ohne neuen Bedarf — F0s D5 gilt unverändert
  fort.
- **D6 (Advisor-Pass B3, bindend): `stale: true` blockiert die
  Weiterverwendung und verlangt eine explizite menschliche
  STALE-Entscheidung über F2s `haltFestStaleEntscheidung`, bevor die
  Antwort als gültig gilt.** `pruefeStale` (Abschnitt 2.5, Schritt 6)
  meldet nur, *dass* eine Eingabe sich geändert hat — was danach passiert,
  war in plan-v1 ursprünglich offen (Advisor-Finding B3). Festlegung:
  liefert die Prüfung gegen die Transportpaket-Eingaben `stale: true`,
  darf F9 die Antwort nicht als Grundlage für Terminalartefakt
  `ERFOLGREICH`/`VERWEIGERT` verwenden. Stattdessen ruft F9
  `haltFestStaleEntscheidung("transport-<lauf_id>", 2, profilReferenz,
  entscheidung, begruendung, betroffeneEingaben)`
  (`src/lineage-registry/index.ts:234`) auf, mit einer der drei
  F2-Werte `neu_erzeugen` (Antwort verwerfen, neuer Durchlauf ab
  Bedarfserfassung), `nachtrag` (Antwort bleibt gültig, Änderung wird
  nur vermerkt) oder `unveraendert_gueltig` (Änderung war unwesentlich,
  Begründung Pflicht laut F2-Signatur) — diese Entscheidung trifft der
  Mensch, nicht F9 automatisch. Erst nach dieser festgehaltenen
  Entscheidung darf der Ablauf mit Terminalartefakt/Freigabe fortfahren.
  Ohne Entscheidung bleibt die Antwort blockiert (kein `KLAERUNG_
  ERFORDERLICH`-Ersatz, sondern eine F9-eigene Blockade vor der
  F1B-Terminalstufe).

## 5. Ablageort (Vorschlag für den Bau, hier nicht angelegt)

- `src/human-transport/{index,types}.ts`,
  `human-transport.test.ts` — neuer, eigenständiger Modulordner (D1).
  In `index.ts`: benannte Hilfsfunktion `baueAktuelleEingabeInhalte`
  (Advisor-Pass B5) — liest reale Dateien (Muster
  `leseAktuelleEingaben`, `scripts/leitstand-server.mjs:47-60`) **und**
  ergänzt den synthetischen `BEDARF_V0`-Eintrag (D2) zu einer
  gemeinsamen `aktuelleEingabeInhalte`-Map, getrennt von
  `leseAktuelleEingaben` (die generische Leitstand-Funktion befüllt
  synthetische Schlüssel nicht, weil sie ausschließlich über
  `existsSync`/`readFileSync` echter Pfade arbeitet).
- `schemas/kontrollzustand-bedarf-payload.schema.json`,
  `schemas/kontrollzustand-transport-payload.schema.json` +
  `schemas/examples/kontrollzustand-bedarf*.json`,
  `schemas/examples/kontrollzustand-transport*.json`.
- `scripts/check-f9-human-transport.mjs` — neben den bestehenden
  Gate-Skripten, Muster wie `check-f1b-wirkungsmarke.mjs`/
  `check-f3-authorization-boundary.mjs`.
- `scripts/leitstand-server.mjs`, `public/leitstand/app.js` — bestehende
  Dateien, minimal erweitert (2.6), nicht neu angelegt.
- `state/gates.md`, `state/memory-map.md`, `docs/STATUS.md`,
  `features/F9/journal.md` — Einträge erst nach realem Bau-/Prüflauf.

## 6. Budget & Pässe

- Dieser Schritt liefert **nur** Feature-Akte + Plan — kein Bau, kein
  Advisor-Pass, kein Handoff-Vertrag (Auftragsvorgabe „NICHT bauen").
- Empfohlene nächste Schritte vor dem Bau (Abschnitt 9): Advisor-Pass mit
  Fokus auf D2 (Zweckentfremdung von `eingabe.pfad` für eine
  artefaktinterne Referenz statt einer echten Datei) und D3 (Zeitpunkt
  von `RUN_PREPARED` — deckt sich das mit dem F1B-Präzedenzfall
  vollständig, oder braucht es eine eigene Klarstellung in
  `zielfassung.md`, analog zu F1Bs zweitem Advisor-Pass B4/B11).
- Zuschnitt-Heuristik (`CLAUDE.md`): ein zusammenhängender Workstream
  (Abschnitt WS1 in `features/F9/feature.md`), kein F1B-artiger
  Fremdmodul-Touch (D1) — ähnliches Regressionsrisiko wie F2/F3, nicht
  wie F1B.

## 7. Akzeptanzkriterien (technisch, Entwurf — vor Advisor-Pass nicht als final zu behandeln)

- **A1** `schemas/kontrollzustand-bedarf-payload.schema.json` und
  `schemas/kontrollzustand-transport-payload.schema.json` existieren,
  sind gültiges JSON Schema (Draft 2020-12).
- **A2** Ein `BEDARF_V0` mit `werkzeug_auswahl: null` lässt sich
  registrieren und inhaltlich identisch wieder laden (deckt AC1).
- **A3** Eine spätere manuelle Befüllung von `werkzeug_auswahl` erzeugt
  eine neue Version desselben `artefakt_id`, die erste Version bleibt
  unverändert (deckt AC1, `ARCHITECTURE.md:41`).
- **A4** Ein Transportpaket Version 1 referenziert die `BEDARF_V0`-
  Version über `eingaben` (deckt AC2).
- **A5** Vor Aushändigung erzeugt der Ablauf real eine `RUN_PREPARED`-
  Wirkungsmarke für dieselbe `lauf_id` — Beleg über einen nachfolgenden
  `stelleLaufstatusFest`-Aufruf (deckt AC3).
- **A6** Eine schemawidrige Antwort führt zu `{ ok: false }`
  (`validiereTransportantwort`) und **keiner** Registrierung, stattdessen
  zu `schreibeWirkungsmarke(..., ergebnis: "FEHLGESCHLAGEN")` (deckt
  AC4/AC5/D4).
- **A7** Eine gültige Antwort wird als Transportpaket Version 2
  registriert und schließt mit `ERFOLGREICH` oder `VERWEIGERT` ab, je
  nach übergebener menschlicher Einstufung (deckt AC6).
- **A8** `pruefeStale` gegen die Transportpaket-Eingaben (inkl. der
  `BEDARF_V0`-Referenz, D2) liefert `stale: true`, sobald die
  referenzierte `BEDARF_V0`-Version nicht mehr die aktuellste ist (deckt
  AC7) — benannter Testfall, z. B. `test('D2-synthetischer-Schlüssel:
  BEDARF_V0-Änderung nach Transportpaket-Erzeugung liefert
  stale:true')` (Advisor-Pass B2).
- **A8a** (D6, Advisor-Pass B3): Bei `stale: true` verwendet F9 die
  Antwort nicht weiter und ruft `haltFestStaleEntscheidung` auf; erst
  nach einer festgehaltenen Entscheidung (`neu_erzeugen`/`nachtrag`/
  `unveraendert_gueltig`) darf der Ablauf mit Terminalartefakt/Freigabe
  fortfahren. Ein Testfall belegt: ohne festgehaltene Entscheidung bleibt
  die Weiterverwendung blockiert.
- **A9** Eine offene `RUN_PREPARED`-Sequenz ohne Terminal liefert über
  `stelleLaufstatusFest` `KLAERUNG_ERFORDERLICH` — ohne F9-eigenen Code
  für diese Prüfung (deckt AC8, reine Wiederverwendung).
- **A10** Der Leitstand rendert für einen Human-Transport-Lauf die neuen
  Felder aus 2.6, ohne einen neuen Schreibpfad einzuführen (deckt AC9).
- **A11** Kein Testfall oder Codepfad ruft `fetch`/einen HTTP-Client/eine
  Browsersteuerung auf — geprüft z. B. über eine Grep-Zeile im Gate
  (deckt AC10, analog zu F1Bs `TEMP-ROT-FALL`-Grep-Nachweis).
- **A12** `node scripts/check-f9-human-transport.mjs` → Exit 0.
- **A13** `npm run check` und `npm run check:template` sind grün.
- **A14** `state/gates.md`/`state/memory-map.md`/`docs/STATUS.md` tragen
  die neuen Einträge nach dem Bau.

A1–A10 sind Mechanik, A11 ist das Nicht-Browserautomatisierungs-
Kriterium (AC10), A12–A14 sind Prüfkette/Doku.

## 8. Rollen für diesen Workstream

| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Klärung der offenen Punkte (Abschnitt 10), Release |

## 9. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

1. Klärung der Offenen Punkte (Abschnitt 10) durch Stefan.
2. Advisor-Pass auf diese Datei (Fokus D2/D3, Abschnitt 6).
3. Findings → `state/advisor-findings-f9-human-transport.md`.
4. Falls nötig: ein plan-v2 als eigene Datei (dieser plan-v1-Inhalt
   bleibt unverändert stehen, wie bei F1B/F3 gehandhabt).
5. Handoff-Vertrag (Skill `handoff-vertrag`, sieben Pflichtsektionen) —
   erst danach, nicht Teil dieses Auftrags.

## 10. Offene Punkte

1. **D2 — synthetischer `pfad`-Schlüssel für die `pruefeStale`-Referenz
   auf `BEDARF_V0`:** technisch von F2 gedeckt (Abschnitt 0), aber ohne
   Präzedenz in F2s eigenen Tests. Braucht eine bewusste Freigabe oder
   eine im Advisor-Pass geprüfte Alternative, bevor gebaut wird.
2. **`werkzeug_auswahl`-Feldform:** Abschnitt 2.1 schlägt eine Form vor
   (`kandidat`/`quelle`/`manuell_bestaetigt_am`), ist aber nicht mit
   `docs/harness/werkzeug-katalog.md`/`state/tooling.md` gegen ein
   bestehendes Format abgeglichen, weil dort keine feste Feldform für
   „aktuell gewählt" existiert (beide Dateien sind Tabellen, kein
   strukturiertes Datenformat). Vorschlag, nicht Festlegung.
3. **F-031:** ~~im Auftrag benannt, im Repo nicht vorhanden~~ — erledigt
   (Advisor-Pass B4, 30.08.2026): F-031 ist inzwischen real in
   `state/findings.md` vorhanden (P1, offen), Referenz in Abschnitt 0
   nachgezogen.
4. **Executor-Feld als Freitext:** Abschnitt 2.2 lässt `executor` als
   freien String zu (keine Enum) — passend für Stufe 1 (kein
   automatisierter Executor), aber ungeprüft gegen künftige
   Leitstand-Filterung/-Auswertung. Kein Blocker, nur benannt.
