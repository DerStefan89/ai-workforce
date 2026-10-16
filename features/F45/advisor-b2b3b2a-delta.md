# Delta-Advisor-Pass — Plan v2 F45 B2b-3b-2a-1

Geprüft: `features/F45/plan-b2b3b2a-v2.md` gegen `features/F45/advisor-b2b3b2a.md`, frischer Kontext (Subagent
`architecture-advisor`), 16.10.2026. Entscheidungen Stefans E1–E5 nicht neu verhandelt.

**Rollengrenze:** nur Read/Grep/Glob. Kein `npm run check`, kein Rot-Lauf gegen main (Aussagen „rot gegen main“ abgeleitet),
keine Zeilenzählung mit `wc` (Bilanz aus Zeilennummern), kein Laufzeittest von `\p{…}`, keine Messung des Lesepfads, kein
`git check-ignore` für `kontrollzustand/`.

Marker: [Fakt] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit] · [Fakt, entlastend].

## A. Vor Baubeginn (Nachtrag zu v2)

- **D1** (mittel) `bestaetigeProtokoll` kann an einer manipulierten Datei werfen (`eintraege: [null]`): `leseRueckfrageProtokoll`
  gibt `daten` ungeprüft zurück (`src/execution-controller/index.ts:271`); der TypeError liefe aus `fuehreAufgabeDurch` in das
  `.catch` des Servers (`leitstand-server.mjs:7029-7037`) ⇒ Startfehler ohne Terminalmarke (Verstoß gegen `index.ts:263-264`
  „wirft nie“). Auflage: Grund „Eintrag i ist kein Objekt“, `ermittleRueckfrageProtokoll` ganz in try/catch (Wurf ⇒ null +
  console.error), Test `eintraege: [null]`.
- **D2** (niedrig–mittel) Speicher `[]` + Datei fehlt ist der Normalfall eines Laufs ohne Rückfrage
  (`rueckfrage-vermittlung.mjs:133`, `:80-88`) — kein Log, Rückgabe null.
- **D3** (niedrig–mittel) Bilanz < 0 ungeregelt: (a3) macht Ist < Grenze rot (`check-wachstumsbremse-server.mjs:120`); Gate-Klausel
  „Bremse unverändert gegenüber main“ blockiert das Senken und braucht git (in der `git archive`-Kopie nicht lesbar,
  `:171-208`). Empfehlung: Klausel aus (f) streichen; bei < 0 senken (Wort Stefans, E3).

## B. Beim Bau

- **H1** `check-f8-execution-controller.mjs:46-54` greppt `src/execution-controller/*.ts` inkl. Kommentaren nach
  `permission_denials|ermittleErgebnis|…` — das Wort nicht in neue Kommentare. [entlastend] neue Namen treffen nicht.
- **H2** `check-f45-b2b3b1-rueckfrage.mjs:543` meldet `/\brueckfrage:\s*\{/` in `src/**` — vermeiden. [entlastend]
  `rueckfrageSpeicher?:` trifft nicht.
- **H3** Gegen main fehlen nur Exporte (undefined, kein Ladefehler, `check-f45-b2b3b1b-auswertung.mjs:61-67`) — je Fall
  `typeof … === 'function'` prüfen, sonst bricht das Gate als Ganzes ab.
- **H4** Quelltextprüfung schärfen: `const rueckfragen =` aus `ermittleRueckfrageProtokoll(`; `leseRueckfrageProtokoll(` in
  `index.ts` genau einmal aufgerufen, innerhalb von `ermittleRueckfrageProtokoll`.
- **H5** Fälschungsfall in (a2) mit Gegenprobe: dieselbe gefälschte Version über den alten Pfad (`leseRueckfrageProtokoll` +
  `klassifiziereLauf`) ergibt ERFOLGREICH.
- **H6** B8-Messung auch für den Lesepfad (`ladeGueltigeCheckpoints` liest/prüft alle Versionen, `checkpoint-store/index.ts:655-675`,
  `:319-334`); Zahl in F-1128. [offene Unsicherheit] Event-Loop-Blockade.
- **H7** `tool_name` > 200 sieht wie Fälschung aus (`rueckfrage-protokoll.mjs:49`; `pruefeAnfrage` begrenzt nicht,
  `rueckfrage-vermittlung.mjs:162`) — Projektion normalisieren oder Grund ausdrücklich.
- **H8** B6 nur teilweise: „Wird aufgerufen von“ in `src/rueckfrage/protokoll.ts:22-23`, `rueckfrage-vermittlung.mjs:23-24`;
  Controller-Kopf `index.ts:114-117`, `:28-29`; Kopf `src/arbeitsordner/index.ts:18-20`.
- **H9** Doppelte Prüfungen kürzbar: (f) wiederholt b2b3b1 (f) / b2b3b1b (f); Löschlisten-Server-Prüfung doppelt (Gate (l1) und
  `leitstand-arbeitsordner.test.mjs`). Neu in (f) nur „ARCHITECTURE §1 nennt F-1131“.
- **H10** CRLF-Mehrzeiler werden abgelehnt (`\r` bleibt) — im Modulkopf nennen.
- **H11** `src/arbeitsordner/index.ts:37` importiert aus `loeschliste.ts` nur `MAX_LOESCHPFADE`; `loescheDateien` für den Aufruf
  dort nachtragen (kein Zyklus).

## C. Umsetzung B2–B12

B2, B3, B4, B5, B7, B8, B10, B11, B12 [Fakt, entlastend] umgesetzt; B6 teilweise (H8); B9 umgesetzt mit Rauschen (D2).
**C1** Zeilenbilanz gegen den Server geprüft: 525–526 −1, 1980–2000 +2, 6808–6828 +2, 6922–6924 −1, 6930–6932 −2 ⇒ 0; Biome ohne
Formatierer; Ist 13455 = Grenze.

## D. Neue Risiken

D4 Rückgabeform `bestaetigeProtokoll` passt (A6 nutzt nur die vier Felder + `lauf_id`/Schema). D5 Reihenfolge in `stelle` hält die
Invariante (403/400 ohne Eintrag `:182-185`; jeder Pfad +1 nur unter 200; `entscheide` verschiebt offen → Protokoll). D6 Projektion
`eintraegeVon` gleich bis auf `tool_name` > 200 (H7); Vermittlung im Scope (`server:6360-6364`). D7 `fuehreLoeschlisteAus`:
Validator nimmt `{ pfad, grund }` (`aenderungsuebersicht/index.ts:83`), Anzeige zeigt beides. D8 Lauf offen bei Klassifikation.
D9 `u`-Flag zulässig (ES2023), Biome-Regel aus. D10 [offene Unsicherheit, DEKLARIERT laut E5] Antwort-Route bleibt offen.

## E. Bestehende Gates/Tests

`execution-controller.test.ts:1672-1689` braucht den Leser (in v2 genannt). [entlastend] b2b3b1b (p3)/(f), b2b3b1 (f), f10 AK3,
f8 (bis auf H1), vermittlung.test, arbeitsordner.test (`?? 0`), f813 bleiben grün.

## F. Gate-Zuschnitt

(a2) echter Pfad soweit mit Attrappe möglich, mit H4/H5 belastbar; Token-Route per fetch genügt. (l1) machbar
(`check-f45-b2b3b1b-auswertung.mjs:242-277`, `leitstand-arbeitsordner.test.mjs:83-95`). Rot gegen main für a1, a2, l1, o1, z1
plausibel, je Fall sichtbar nur mit H3.

## G. Zuschnitt

v2 schneidet wie empfohlen; nicht anders schneiden.

## Urteil

**Freigegeben mit Hinweisen.** D1–D3 sind eng umrissene Ergänzungen ohne Umbau; D3 braucht ein Wort Stefans nur für das Senken
bei Bilanz < 0. Beim Bau H1–H11.

## Nachtrag (Autor, 16.10.2026)

D3 ohne Entscheidung aufgelöst: die Bremse-Klausel ist aus Gate (f) gestrichen (das Bremse-Gate prüft (a2)/(b2) selbst), und die
Bilanz wird auf genau 0 gebaut (Plan v2 §5) — ein Senken der Grenze ist damit nicht nötig. Ergäbe sich beim Bau < 0, wird
im selben Abschnitt ausgeglichen statt gesenkt oder Stefan gefragt. Der Befund bleibt als historischer Stand unverändert.
