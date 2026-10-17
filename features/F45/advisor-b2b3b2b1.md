# Advisor-Pass: Plan v1 F45 B2b-3b-2b-1 „Rückfrage-Kanal: Rest-Absicherung“

Geprüfter Plan: `features/F45/plan-b2b3b2b1.md` (Stand 16.10.2026). Subagent `architecture-advisor`, frischer Kontext, nur
Read/Grep/Glob (keine Messung, kein Gate-Lauf, CLI-Reihenfolge nicht real prüfbar — als Annahme/offene Unsicherheit markiert).
Bericht unverändert übernommen.

Gelesene Quellen: `scripts/leitstand/rueckfrage-vermittlung.mjs`, `scripts/leitstand/rueckfrage-protokoll.mjs`,
`src/rueckfrage/protokoll.ts`, `src/execution-controller/index.ts:100-645` + `types.ts`, `src/claude-code-gateway/index.ts:340-620,
1100-1190`, `src/claude-code-gateway/prozessstart.ts:395-445`, `src/lineage-registry/index.ts:60-220`, `src/checkpoint-store/index.ts`
(`schreibeCheckpoint`, `ladeGueltigeCheckpoints`), `src/result-evaluator/index.ts`, `scripts/leitstand-server.mjs` (547-548,
1975-2001, 2951-2972, 6355-6367, 6795-7039, 8335-8405, 8463), `scripts/check-f45-b2b3b2a-absicherung.mjs` (a2),
`scripts/check-f7-result-evaluator.mjs` (a), `scripts/check-f45-b2b3b1-rueckfrage.mjs`, `scripts/leitstand/rueckfrage-mcp.mjs`,
`scripts/wachstumsbremse-server.json`, `biome.json`, Schema + Beispiele, `state/findings.md` F-1128/F-1131, ARCHITECTURE §3/§4,
`features/F45/nachweise/b2b3a/spike.md` + `rohstrom-deny.ndjson`, `public/leitstand/attention-daten.js`.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit]. Schwere: blockierend vor Bau / mitlaufend.

## Befunde

**B1 — R1-Signal „tool_result nach der Entscheidung“ trägt nicht bei verzögertem statischem tool_result (blockierend vor Bau)**
- [Fakt] Plan Z. 25-27/36-38/43-45: Waschen setzt voraus, dass das statische tool_result vor der Token-Anfrage im Strom steht; Rest nur ms-Rennen.
- [Fakt] Die CLI schreibt den tool_use in den Strom, bevor Sperrregel/Hooks greifen (`src/claude-code-gateway/index.ts:350-363, 1138-1145`; `features/F45/nachweise/b2b3a/spike.md:56-65`).
- [Annahme / offene Unsicherheit] Zwei nicht nebenläufige Aufrufe in einer Nachricht: A (Rückfrage) und B (statisch gesperrt). Während Stefan über A nachdenkt, ist B sichtbar ohne tool_result. Ein Prozess mit dem Token stellt B und lehnt über die Antwort-Route ab (E-B7 = A); danach kommt das statische tool_result ⇒ `zaehlt = true` ⇒ ERFOLGREICH. Gate (r1a) fängt das nicht.
- [Fakt, Gegenmittel belegt] Die CLI übernimmt die `message` der Ablehnung wörtlich als `content` mit `is_error: true` (`rohstrom-deny.ndjson:9`, `rueckfrage-mcp.mjs:140-146`); statische Ablehnungen haben einen eigenen CLI-Text (`spike.md:60-61`).
- Empfehlung O1: eindeutiger Ablehnungstext je Entscheidung (z. B. `… (Ref <randomUUID>)` in `entscheide`); `stefan_abgelehnt` zählt nur, wenn das tool_result dieser ID `is_error === true` und `content ===` genau diesen Text trägt. Takt kann entfallen. Neuer Gate-Fall (r1d): Anfrage + Ablehnung vor einem tool_result mit statischem CLI-Text ⇒ VERWEIGERT. Alternativ Takt behalten und §4 den Rest ehrlich (Sekunden bis Minuten) benennen.

**B2 — Wortlaut R1: Takt statt Zeitstempel (mitlaufend)** — inhaltlich gleichwertig/stärker, als Abweichung Stefan vorlegen; Token bleibt bis `beendeLauf` (`leitstand-server.mjs:6871`) gültig, späte Einträge zählen nicht, kippen über O2 das Protokoll; `gestelltTakt` ist toter Zustand.

**B3 — O2 ganzes Protokoll verwerfen (mitlaufend)** — sicher; Folge: jeder lokale Prozess kann VERWEIGERT (und über R2 Aussetzung der Löschliste) erzwingen — Verfügbarkeitsfrage, in §4 dokumentieren. Beibehalten empfohlen.

**B4 — stdout vs. HTTP, Subagenten, doppelte tool_result, --resume (entlastend, eine offene Unsicherheit)** — echter Ablauf kausal (`rueckfrage-vermittlung.mjs:120-127`, `prozessstart.ts:408-424`); `leseToolResultBloecke` filtert nicht nach Subagent (`index.ts:541-553`) — [offene Unsicherheit] ob Subagent-Zeilen real gestreamt werden, Prüfpflicht 2b-2; doppelte tool_result unkritisch; `--resume` in `src/` nicht genutzt.

**B5 — Gate deckt Verdrahtung Controller→Gateway nicht ab (mitlaufend)** — Fall mit echtem `fuehreAufgabeDurch` und Starter-Attrappe (`src/execution-controller/index.ts:519`) oder mindestens Quelltextprobe.

**B6 — `rueckfrageZugang` wird vor `oeffneLauf` gebaut (mitlaufend)** — `laufOptionen` 6809-6831, `oeffneLauf` 6861: `zugang` muss den Lauf erst beim Aufruf nachschlagen, ohne offenen Lauf No-op/null; Test.

**B7 — R2 / O5 (entlastend)** — `beendeLauf` vor Löschliste, ohne Kanal No-op; ODER redundant, unschädlich, netto 0.

**B8 — R3 Weg (entlastend, Hinweis)** — `startfehlerListe` (6405) → `GET /api/startfehler` (8463) → Leitstand „startproblem“ (`attention-daten.js:112, 220-266`). F-1128 (6) Schreibfehler bleiben Konsole, erst bei Klassifikation als Abweichung sichtbar — nicht als „(6) erledigt“ vermerken.

**B9 — Größe/Lesezeit (entlastend)** — `ladeArtefaktVersion` liest schon heute alle Versionen; Zuwachs ⇒ gleiche Dateizahl, ~1/50–1/100 Bytes; Schätzung ~0,6 MB.

**B10 — Fehlerpfad Zuwachs-Schreiber (mitlaufend)** — Wurf nach geschriebener Version ⇒ gleiches `ab` ⇒ „lückenhaft“ ⇒ falsches VERWEIGERT; praktisch kaum erreichbar (kein `schreiber` am Server, 6366); als Grenze vermerken.

**B11 — O3 v0 → v1 (entlastend, Hinweis)** — keine `rueckfragen-*` im Kontrollzustand; Beispiele + `check-datenformate` nachziehen; `herkunft` in dieselbe v1.

**B12 — O6 Herkunftsregel (entlastend)** — passt zu `istFremdeBrowserAnfrage` (2958-2972); `none` ⇒ nicht_browser richtig; gefälschter Origin durch „Hinweis, kein Schutz“ gedeckt.

**B13 — Server-Zeilenbilanz (entlastend)** — nur Ersetzungen (548, 1999/2000, 6829/6830, 6871, 6932, 8400); kein Formatierer; keine Route; Argv unverändert.

**B14 — Auftrag 6 vs. Status F-1128 (mitlaufend)** — F-1128 hat weitere offene Punkte ((3), (4), (7)–(10)): Status offen mit Nachtrag oder schließen + neues Finding — Stefan klärt. (4) bekommt mit B1 Prüfpflicht „tool_result trägt die Marke“.

**B15 — D5-Doku/Options-Sperre (mitlaufend)** — `types.ts:56` und `VERBOTENE_OPTIONEN_FELDER` synchron umbenennen.

## Zuschnitt — anders
- **2b-1a (mechanisch):** R2; R3 mit `rueckfrageZugang = { speicher, meldeAbweichung }`; Schema v1 (`ab` + `herkunft`), Zuwachs-Schreiber/-Leser, Messung; E-B7 + §3-Satz; Gate-Fälle r2, r3, g, b7, f.
- **2b-1b (Sicherheitsregel):** R1 mit Entscheidung O1 (Marke empfohlen); `ergebnisGesehen`, Gateway-Option; Gate r1a–r1d mit echtem Controller + Starter-Attrappe; §4, F-1128-Nachtrag. Abhängigkeit von 2b-1a im CONTEXT.

## Urteil
**Nicht freigegeben.** R1 mit der Takt-Regel in plausibler Reihenfolge nicht erfüllt (B1), Rest unterschätzt; Gegenmittel günstig und belegt, muss als O1-Entscheidung vor dem Bau im Plan stehen. Zuschnitt zu groß. R2, R3, Größe, E-B7 sauber geplant (B7–B9, B11–B13), nur mitlaufende Hinweise (B6, B10, B14, B15).

## Nächster sinnvoller Schritt
Plan v2: O1 entscheiden (Marke oder Takt + ehrlicher Rest), r1d; B2 und B14 Stefan vorlegen; in 2b-1a/2b-1b schneiden, `zugang` beim Aufruf nachschlagen, Gate mit echtem Controller; danach Delta-Advisor mit frischem Kontext.
