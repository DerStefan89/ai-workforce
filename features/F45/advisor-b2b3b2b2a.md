# Advisor-Pass: Plan v1 F45 B2b-3b-2b-2a „Rückfrage-Kanal: Einschalten (Opt-in) + Anzeige“

Geprüfter Plan: `features/F45/plan-b2b3b2b2a.md` (17.10.2026). Subagent `architecture-advisor`, frischer Kontext, nur Read/Grep/Glob
(kein Gate-/Testlauf, Rot/Grün aus dem Quelltext abgeleitet). Inhalt sinngemäß vollständig übernommen.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit].

## Befunde
- **B1 (Auflage)** Drei weitere Gates prüfen „Kanal aus“ mit `/erzeugeRequestHandler\([^)]*\brueckfrage\s*:/s`:
  `check-f45-b2b3b2b1b-r1.mjs:360`, `check-f45-b2b3b2b1a-rest.mjs:397`, `check-f45-b2b3b2a-absicherung.mjs:416`. [Schlussfolgerung]
  `rueckfrage: rueckfrageOptionFuer(…)` im defaultHandler macht sie rot; in `baueProjektHandlerMap` hinter `...(… )` erkennt `[^)]*`
  sie nicht; in Spread-Form blieben alle vier grün und still falsch (auch b2b3b1:528). Alle vier (f)-Stellen auf dieselbe
  Ersatzbedingung umstellen.
- **B2 (Auflage)** Ersatzbedingung so nicht gleich streng: (a) Herkunft des Arguments ungeprüft, (b) `baueProjektHandlerMap(`-Aufrufe
  (CLI-Block, Live-Anlage :8735) nicht abgedeckt, (c) Variable `o` nicht prüfbar, (d) Verbot von `rueckfrageVermittlung` muss bleiben.
  Empfehlung: `rueckfrageOptionFuer` liefert `{}` oder `{ rueckfrage }`; Aufrufstellen nur inline `...rueckfrageOptionFuer(rueckfrageBasis[,
  projekt.id])`; Gate: nach Entfernen genau dieser Tokens kein `\brueckfrage(Vermittlung)?\b` in einer `erzeugeRequestHandler(`-
  Argumentliste; `rueckfrageBasis` genau einmal aus `rueckfrageBasisAusUmgebung(process.env, PORT)`; jeder `baueProjektHandlerMap(`-
  Aufruf übergibt nur `rueckfrageBasis` bzw. den Ausdruck der Workforce-Instanz. [Fakt, entlastend] Zuweisungs-Invariante bleibt
  (Regelzeile hinter der Zuweisung; Abstand ≈ 600 < 800).
- **B3 (Auflage)** Rückgabe `string | { aus } | undefined` uneindeutig — `new URL('[object Object]')` wirft ⇒ Start abgelehnt statt
  „aus“. Eindeutig `{ an: true, basis } | { an: false, grund }`; `rueckfrageOptionFuer` nur mit nicht leerem String; (o1): Port 0 ⇒ nichts.
- **B4 (entlastend)** Opt-in tragfähig: PORT :650, Host fest 127.0.0.1, Handler vor `listen`, `ID_MUSTER` beim Laden erzwungen, Dispatcher
  ohne Decode; falsche Instanz ⇒ Token unbekannt ⇒ 403 ⇒ deny.
- **B5 (Hinweis)** Jede Instanz hat eine `projektHandlerMap` (:5933); POST /api/projekte ist auch an einer Projektinstanz erreichbar ⇒
  unerreichbarer Handler mit falscher url (fail closed). `istWorkforceInstanz && rueckfrageAn`; Planaussage berichtigen.
- **B6** Gate-Liste vollständig (Dateiname `b2b3b2a-absicherung`); zwingend nur b2b3b1 Lauf A/B (echtes Skript), sonst kosmetisch
  (Attrappen posten direkt). `src/rueckfrage/types.ts:29` beschreibt die url veraltet.
- **B7** (d) aussagekräftig; Restgrenze: belegt nicht, dass ein Lauf in einer Projektinstanz die Projekt-url in der mcp-config bekommt.
  Erst binden, dann Basis aus dem echten Port. Rot auf main echt (`/api/api/…` ⇒ 404 ⇒ deny).
- **B8** Aussage zu Ort-B stimmt (:3378-3406, :3424, :3476); (i) nützlich, auf main grün. [offene Unsicherheit] ohne `ortBLauf`
  prüft kein Init-Gate den Rückfrage-Server (2b-2b).
- **B9 (entlastend + Hinweis)** keine Versionspflicht; F-689-Hinweis bleibt; Vorrang wörtlich fassen („zuerst frage_stefan; nur ohne
  Antwort - [x] Blockiert“). [offene Unsicherheit] Startfreigabe mit Kanal-Argv (2b-2b).
- **B10** `daten` im Schema frei (`kontrollzustand-wirkungsmarke-payload.schema.json:61-63`), Leser nutzen benannte Felder. VERWEIGERT und
  TIMEOUT/ABBRUCH überschreiben `daten` (`result-evaluator/index.ts:393-426`) ⇒ `rueckfrage_*` danach zusammenführen.
  `result-evaluator.test.ts:1134` erwartet `daten` wörtlich ⇒ Zählung nur „wenn geliefert“. R3-Grund kann Text aus einer gefälschten
  Datei tragen ⇒ kappen. Je Code ein eingefrorenes Objekt; Zugang nur umhüllen, wenn gesetzt; konkreter Typ statt `object`; Zählung
  enthält auch nicht bestätigte `stefan_abgelehnt` (2a-2 beschriften).
- **B11** `leitstand-arbeitsordner.test.mjs:467` schneidet bis `export function loeseProjektPfade` ⇒ nach dem Umzug still schwächer —
  Endmarke anpassen; :469 verlangt `arbeitsordner: true })` am Ende des defaultHandler-Aufrufs. Importe: f25:60, fixpaket-f35:75.
  f813 (4): kein `.method` in `scripts/leitstand/*.mjs`.
- **B12** Bilanz realistisch +12..+18, Auslagern −22 ⇒ netto ≤ 0; Grenze genau auf das Ist senken.
- **B13** F-1126 (5)/(6) zuordnen: (5) „ohne url“ im Produkt nicht erreichbar, Katalog-Kollision prüfen oder verschieben; (6) 2b-2b.
- **B14** Nach 2a-1 allein wartet mit Variable=1 jeder Bash-Befehl 10 min und wird abgelehnt (keine Anzeige) — Startzeile/Doku:
  „Anzeige folgt mit 2a-2 — noch nicht für echte Läufe nutzen“.

## Zuschnitt
1–9 zusammen **zu groß**. 2a-1 passt knapp; natürlicher Rand bei Ausufern: §5.

## Urteil
**Zu groß** — Schnitt 2a-1 | 2a-2 wie vorab freigegeben. **2a-1 freigegeben mit Hinweisen**: B1–B3 vor dem Code in den Plan, B10/B11
beim Bau. 2a-2 bekommt eigenen Plan und Advisor-Pass.
