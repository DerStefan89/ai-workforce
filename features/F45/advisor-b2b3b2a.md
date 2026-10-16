# Advisor-Pass — Plan v1 F45 B2b-3b-2a „Rückfrage-Kanal: Absicherung vor dem Einschalten“

Geprüft: `features/F45/plan-b2b3b2a.md`, Branch `f45/b2b3b2a-absicherung`, frischer Kontext (Subagent
`architecture-advisor`), 16.10.2026.

**Rollengrenze:** nur Read/Grep/Glob, kein Schreiben, kein Bash/git. Folgen davon: kein `npm run check`, kein Rot-Lauf
gegen main, keine Zeilenzählung mit `wc` (die Bilanz ist aus Zeilennummern abgeleitet), kein Laufzeittest der
Unicode-Klassen, keine Messung von Schreibdauer und Größe des Protokolls. Nicht geprüft: ob die CLI für jedes auto_deny eine
`permission_denial` mit `tool_use_id` schreibt; ob `kontrollzustand/` mit Rückfrage-Artefakten in Commits landet.

**Gegengeprüft vom Autor:** B1 am Code bestätigt (`scripts/check-f813-csrf.mjs:18-20`, `:296-301`).

Marker: [Fakt] im Code belegt · [Schlussfolgerung] aus Fakten abgeleitet · [Annahme] unbelegte Prämisse ·
[offene Unsicherheit] weder belegt noch widerlegt · [Fakt, entlastend] geprüft und in Ordnung.

## Vor Baubeginn zu klären

**B1 — Ein wörtlicher Routen-Umzug macht Gate f813 (4) rot; Widerspruch zur W1-Regel.** Schwere: blockierend für §5.
- [Fakt] `scripts/check-f813-csrf.mjs:298-302`: jedes `scripts/leitstand/*.mjs`, auf das `/\.method\b/` passt, ist ein
  Befund („wertet die HTTP-Methode selbst aus — Routen gehören hinter den zentralen Haken“); Kopf Zeile 18–20 ebenso.
- [Fakt] Die Rückfrage-Routen werten die Methode aus: `leitstand-server.mjs:8356`, `:8382`, `:8387`.
- [Fakt] Heute trifft das Muster in keinem Modul unter `scripts/leitstand/`; kein `routen-*.mjs` bekommt `req, res`.
- [Fakt] ARCHITECTURE.md:32 (W1): „neue Routen dispatchen in `scripts/leitstand/routen-*.mjs`“.
- [Schlussfolgerung] Dieses Paket wendet die Regel zum ersten Mal auf eine Route mit Methodenweiche an. Auswege:
  (a) f813 (4) schärfen: Methodenweiche in `routen-*.mjs` erlaubt, wenn der Handler nur aus `requestHandler` hinter dem
  Haken aufgerufen wird; das Gate prüft die Aufrufstelle. Änderung an einem Sicherheits-Gate ⇒ Freigabe Stefans.
  (b) Methode als Parameter übergeben — umgeht das Muster, nicht den Zweck; nicht empfohlen.
  (c) Umzug aus dem Paket nehmen.

**B2 — „offen“ ist in §3 nicht festgelegt.** Schwere: hoch.
- [Fakt] Entschiedene Einträge bleiben bis `beendeLauf` in `lauf.eintraege` (`rueckfrage-vermittlung.mjs:21`, `:109-116`,
  `:293-300`).
- [Schlussfolgerung] `offen = lauf.eintraege.size` zählt Entschiedene doppelt (200er greift zu früh) und macht aus der
  20er-Grenze „höchstens 20 Bash-Rückfragen je Lauf insgesamt“. Pflicht: `offen` = Einträge mit `entscheidung === null`;
  Test: 25 nacheinander beantwortete Rückfragen erreichen alle Stefan.

**B3 — Gate (a2) „über Controller-Lesepfad“ prüft eine Kopie.** Schwere: hoch für den Gate-Wert.
- [Fakt] Server-Gates ersetzen den Controller durch eine Attrappe (`check-f45-b2b3b1b-auswertung.mjs:231-236`).
- [Schlussfolgerung] Ruft die Attrappe `bestaetigeProtokoll(...)` selbst auf, bleibt eine spätere Änderung an
  `execution-controller/index.ts:568` grün. Empfehlung: exportierte Controller-Funktion (z. B.
  `ermittleRueckfrageProtokoll(laufId, basisVerzeichnis, speicher)`), die Controller und Gate aufrufen.

**B4 — Zeilenbilanz „−1“ zu optimistisch, von keinem Gate gemessen.** Schwere: mittel.
- [Fakt] Nachträge in `VERBOTENE_OPTIONEN_FELDER` und `laufOptionen` tragen je eine Kommentarzeile
  (`leitstand-server.mjs:1988-1999`, `6812-6826`) ⇒ §1 eher +4. §2 −3 möglich, eigene `const` +1.
- [Fakt] Die Bremse misst nur die Gesamtzahl (`check-wachstumsbremse-server.mjs:115-121`); der Umzug (~85 Zeilen) verdeckt
  jede Überschreitung in §1/§2. Empfehlung: Bilanz je Zeile in v2, Nachweis am Diff.

**B5 — `fuehreLoeschlisteAus` in `loeschliste.ts` erzeugt einen Import-Zyklus.** Schwere: mittel.
- [Fakt] `leseLoeschliste` in `src/arbeitsordner/index.ts:196`; `index.ts` importiert `loeschliste.ts` (:37, :40).
  Empfehlung: Funktion in `index.ts`. [Fakt, entlastend] `leseLoeschliste`/`loescheDateien` im Server nur 525/526 und
  6930/6931.

## Darf mitlaufen

- **B6** Doku: ARCHITECTURE.md:26 („Routen … im Server“); `execution-controller/types.ts:56` (D5: „kein Feld wird vom
  Controller gelesen“ — `rueckfrageSpeicher` wird aufgerufen, Vorbild `zeitmessung`); Kopf Gate b2b3b1b (p3) :21-23;
  „Wird aufgerufen von“ in `rueckfrage-vermittlung.mjs:23`, `protokoll.ts:22`.
- **B7** O1 untertrieben: ein lokaler Prozess kann über `GET /api/rueckfragen` (ohne Token, `:8382-8384`) und `beantworte`
  (`rueckfrage-vermittlung.mjs:279`) auch **einmal erlauben**. In 2a DEKLARIERT lassen, in F-1128 beide Richtungen nennen,
  Entscheidung Stefans vor 3b-2b.
- **B8** Menge bei 200 Einträgen: je Entscheidung eine Version mit allen Einträgen (`rueckfrage-protokoll.mjs:74-80`) ⇒
  20 100 Eintrags-Kopien, ~60 MB je Lauf bei ~3 KB/Eintrag, bis ~250 MB bei `\u00XX`/CJK. [offene Unsicherheit] Git,
  Kettenprüfung. 200 beziffern/bestätigen oder senken; (o1) mit `protokolliere`-Stub, echter Schreiber einmal mit Zeitmessung.
- **B9** Abweichung Speicher/Datei mit `console.error` und Grund melden (Schreibfehler vs. Fälschung unterscheidbar; F-1128 (6)).
- **B10** `eintraegeVon` liefert nur die vier Vergleichsfelder als neue Objekte.
- **B11** (w1) über `erhebeRouten` prüfen, nicht `includes`; (f) kann gegen main nicht rot sein; (a2) „Neustart“ ⇒
  „Speicher fehlt / Lauf nicht offen“, plus `eintraegeVon` nach `beendeLauf` ⇒ null; Test `datei` kein Objekt /
  `eintraege` keine Liste ⇒ null.
- **B12** O6/O7: `\n`/`\t` können den gefährlichen Teil aus dem Sichtbereich schieben; Frage-Texte/Optionen wörtlich —
  Auflage für die Anzeige in 3b-2b (vollständige Anzeige, Zeilenzahl, Steuerzeichen in Fragen maskiert), in F-1126 (3) vermerken.

## Entlastend

- **E1** Zur Klassifikation ist der Lauf auf allen Pfaden in der Vermittlung offen (`oeffneLauf` 6856-6864 vor
  `fuehreAufgabeDurchFn`; `beendeLauf` nur in `.then` 6868 und `.catch` 7030; Klassifikation `index.ts:568-576` davor;
  Startfehler/Wurf klassifizieren nicht; gescheitertes `oeffneLauf` ⇒ Speicher null ⇒ VERWEIGERT).
- **E2** Speicher- und Dateiread synchron ohne Event-Loop-Runde (`lineage-registry/index.ts:85`, `:182`).
- **E3** Reservierungs-Invariante `protokoll.length + offen ≤ 200` hält bei Prüfung vor jeder Schreibstelle (Doppel-ID :191,
  auto_deny :199, `entscheide` :110 genau einmal) — Voraussetzung B2.
- **E4** Fremde `tool_use_id` vorgreifen scheitert (:189-193, `protokoll.ts:177`).
- **E5** Löschlisten-Bedingung richtig (`result-evaluator/index.ts:371`, `types.ts:53`, Server 6926); Hinweis über
  `abgelehnt[]` wird angezeigt (`public/leitstand/views/arbeitsordner-anzeige.js:122-128`) — O4 ohne Schemawechsel.
- **E6** CONTEXT-Zeilennummern und 6 Bremse-Einträge stimmen (`wachstumsbremse-server.json:31,32,48,49,74,75`).
- **E7** Reihenfolge Host (8323) → CSRF (8333-8339) → URL (8342) → Rückfrage-Dispatch bleibt beim Aufruf an derselben Stelle;
  f814 (3) unberührt; einziges Hindernis B1.
- **E8** Im Produkt ruft nur der Controller `klassifiziereLauf`; keine Klassifikation nach Neustart.
- **E9** O3: die vier Vergleichsfelder sind in Speicher und Datei gleich (`tool_use_id` beidseitig `null`; `tool_name` nur > 200
  ersetzt ⇒ fail closed).
- **E10** `VERBOTENE_OPTIONEN_FELDER` erweitern ungefährlich (f10 AK3 iteriert dynamisch, `check-f10-leitstand.mjs:161-181`).
- **E11** Regex §4 deckt `\r`, ESC/C1 (Cc), U+200B–F, U+202A–E, U+2066–9, U+061C, U+FEFF, U+00AD, Tag-Zeichen (Cf), Zl/Zp,
  einzelne Surrogate; nicht: Variationsselektoren, NBSP/Zs, Homoglyphen — im Modulkopf nennen.

## O1–O7

| Punkt | Urteil |
|---|---|
| O1 | DEKLARIERT in 2a in Ordnung; auch „einmal erlauben“ benennen (B7); Entscheidung Stefans vor 3b-2b. |
| O2 | Tragfähig, Bedingung: exportierte Funktion (B3), Doku (B6). |
| O3 | Tragfähig (E9). |
| O4 | Tragfähig (E5). |
| O5 | Tragfähig (E3); Volumen beziffern (B8). |
| O6 | Für 2a in Ordnung, Auflage 3b-2b (B12). |
| O7 | Für 2a in Ordnung, Auflage 3b-2b (B12). |

## Zuschnitt

[Schlussfolgerung] Anders schneiden: §5 ist ein reiner Umbau, unabhängig von der Absicherung, braucht die Gate-Entscheidung
aus B1 und wird als Zeilenausgleich nicht gebraucht; bleibt er drin, hängt die P1-Absicherung an einer Entscheidung über ein
Sicherheits-Gate, und sein Zeilengewinn verdeckt die Bilanz von §1/§2 (B4).
- **2a-1** = §1–§4 und §6, eigenes Gate (a1, a2, l1, o1, z1, f).
- **2a-2** = §5 mit der f813-(4)-Entscheidung (Variante a), Gate (w1), Senken der Bremse.
Bei einem Paket: mindestens §5 als eigener Commit, zuerst gebaut, reiner Umzug am Diff prüfbar (`--color-moved`).

## Urteil

**Nicht freigegeben.** Wörtlich gebaut macht §5 ein bestehendes Sicherheits-Gate rot (B1); B2 führte zu falschem Verhalten,
B3 zu einem Gate ohne Prüfwert. Alle drei lösbar mit Plan v2; nicht „Blockiert“, weil die Abtrennung von §5 ohne
Gate-Entscheidung weiterkommt. Vor Baubeginn in v2: B1 (Weg oder Abtrennung, Entscheidung Stefans), B2, B3, B4, B5.
Mitlaufen: B6–B12.

## Nächster sinnvoller Schritt

Stefan entscheidet: §5 abtrennen (empfohlen) oder f813 (4) nach Variante (a) schärfen; O1 für 3b-2b vormerken. Danach Plan v2
mit B1–B5 und Delta-Advisor-Pass in frischem Kontext.
