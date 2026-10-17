# Advisor-Pass Plan K „Kontext-Diät“ (features/F45/plan-k.md, v1)

Subagent `architecture-advisor`, frischer Kontext, 17.10.2026. Abgelegt vom Autor des Plans; Inhalt des Berichts unverändert
in der Sache, gekürzt in der Form.

## Kopf

Geprüft: plan-k.md, ARCHITECTURE.md, CLAUDE.md, state/memory-map.md, state/findings.md (Kopf, Kopfzeilen),
check-wachstumsbremse-server.mjs (+ .test), check-docs.mjs, check-f21-workboard.mjs, die vier ARCHITECTURE-Textprüfungen
(absicherung :421–423, b1a-rest :403–405, b1b-r1 :365–367, b1b-auswertung :397–399), check-f40-lagebild.mjs,
src/workboard/findings.ts, src/projektkarte/index.ts, projektkarte.test.ts, leitstand-server.mjs, erzeuge-lagebild.mjs,
routen-harness.mjs, public/leitstand/entwicklung-daten.js, attention-daten.js, views/workboard-detail.js, .githooks/pre-push,
.claude/, fixpaket-f45.md, package.json.

Rollengrenze: nur Read/Grep/Glob. Nicht gemessen: Byte-Größen (12 288 B geschätzt), keine Gate-/Testläufe, andere
Branches/Worktrees nicht sichtbar, Anzeige unbekannter IDs im Workboard-Detail nicht geprüft.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit].

## Befunde

1. **Textanker W1 fehlt im Kernsatz** (hoch, vor Umsetzung). [Fakt] absicherung:422 schneidet ab
   `indexOf('Wachstumsbremse (F45 W1')` 4000 Zeichen und sucht `F-1131`; der Plan formuliert „Wachstumsbremse W1“. Weitere
   Anker: `## 3. Auth`, `## 4. Fehlerbehandlung`, `## 4.`, `## 5.`. Korrektur: Pflichtfragmente wörtlich im Plan.
2. **check-docs prüft den verschobenen Text nicht mehr** (hoch). [Fakt] check-docs.mjs:44–60, :148 nur Anweisungsdateien;
   der wandernde Text trägt heute geprüfte Verweise (ARCHITECTURE.md:26, :44, :98, :121, :166). Korrektur: Verweis- und
   Versionsprüfung auch über `docs/architektur/*.md` (neues Gate); Rückverweis in Backtick-Form mit `.md`.
3. **Invariantenliste offen und unvollständig** (hoch). [Fakt] fehlend u. a. §1 Validator nackt Bash/git (:29), Regel 4b und 3a
   samt Schreibvorgang (:34), „Prüfer wiederholen“ zählt nicht (:32), Projektkontext kein zweiter Speicher (:33), Arbeitspaket
   kein Artefakttyp, Projektkarte rein, „veraltet“ nur über `inhalt`, Budget/Umfang kein Workflow-Schreiber (:26); §2 „jede weitere
   Ausnahme erst hier, dann im Code“ (:42), Plugin-Kopie 409 (:59–61), E-F45-7/F-1061/Laufsperre (:47–52), Stand fail-closed und
   kein Schutz gegen Nutzerprozess (:78–80), `--ignore-scripts` (:84–88), plugins/data Befund statt Abbruch (:101–102); §3 Argv und
   Auftragstext bitgleich ERZWUNGEN (:121–123, :129), Rückfrage-ID genau einmal (:186–187), `entschieden` ohne Token DEKLARIERT
   (:148–149), R3-Sichtung DEKLARIERT (:163–165), Frist/timeout DEKLARIERT (:168–169), Bedien- statt Sicherheitsgrenze (:190–191),
   Sperr-/Deny/Hooks vor dem Kanal (:175–176), escaped/einziger Schreiber (:141–146); §4 `lauf_ende` ERZWUNGEN, `daten` bitgleich,
   R2, Hook-Annahme für R1, CLI-Voraussetzung F-1128 (4) (:200). Korrektur: geschlossene Tabelle Herkunft → Kernsatz; Kriterium
   ERZWUNGEN/DEKLARIERT/nur/nie/einzig/ausschließlich/kein.
4. **12 288 B mit vollständiger Liste fraglich** (mittel). [Schlussfolgerung] Unveränderte Teile ≈ 8,5–9 KB. Korrektur: Kern
   entwerfen, messen, dann Grenze; „Invariante vor Byte-Grenze“, sonst Entscheidung Stefan.
5. **Deckel statt Ratsche** (mittel). Grenze = Ist + kleiner Puffer, ehrlich „Deckel, nur senkbar“. [Fakt] (a2) in einer
   `git archive`-Kopie nie rot prüfbar (W1: test.mjs:71,118 per injiziertem git) ⇒ AK2 per Unit-Test.
6. **Grammatik (v1) unscharf** (mittel). [Fakt] Feldpfade (`daten.abgelehnt_durch_stefan`), fremde Wurzeln (`plugins/data`,
   `skills/`, `.git/objects`). Korrektur: Datei-Regex von check-docs, Ordner nur bei vorhandenem erstem Segment, Links getrennt.
7. **Kopf von findings.md widerspricht** (mittel). [Fakt] findings.md:3 „bestehende nie löschen“. Umformulieren; memory-map:35
   ergänzen.
8. **Workboard-Verlust breiter** (mittel, Entscheidung Stefan). [Fakt] Spalte „Abgenommen“ verliert die Karten
   (entwicklung-daten.js:10,151); „Zum Eintrag“-Links (attention-daten.js:154–165) zeigen ins Leere [Annahme: „nicht gefunden“].
   [Fakt, entlastend] `offeneBefunde` und VS-Code-Link unberührt. Kein „DEKLARIERT“, sondern „bekannte Grenze, hingenommen“;
   Folgen nennen, TECH_DEBT-Finding, Zustimmung Stefan.
9. **Archivregel ≠ Workboard-Regel** (Entscheidung Stefan). [Fakt] Parser: gelöst/behoben/erledigt/korrigiert per `includes`
   (findings.ts:37,43); 226 beginnen mit „erledigt“, 0 mit geschlossen/abgeschlossen. Empfehlung: eine Regel „Status beginnt mit
   einem ERLEDIGT-Wort des Parsers“; (z) mit derselben Regel.
10. **P1-Finding „erledigt durch K“ verfrüht** (läuft mit). Wirkung hängt am Sync; Status „offen (Repo-Teil durch K erledigt)“,
    dann `docs/projekt/kontext/lagebild.md` neu erzeugen (check-f40-lagebild).
11. **Zwei Quellen ohne Vorrang** (mittel). Details gleich verbindlich, Kern hat Vorrang, Widerspruch = Befund; §-Angaben im
    Detail meinen ARCHITECTURE.md.
12. **Aufteilungsregel halb angewandt** (läuft mit). Zweiter Auslöser „Größengrenze des Kerns“ im Kopfkommentar; eine
    memory-map-Zeile für den Ordner.
13. **Rückweg-Teile in eine Datei** (niedrig).
14. **Rollen sehen nur den Kern — überwiegend entlastend.** [Fakt] Projektkarte kürzt je Abschnitt auf 2000, gesamt 9000 Zeichen
    (projektkarte/index.ts:62–64, 357–359); heute fehlen W1 und §3-Grenzen dort ganz. ERZWUNGEN/DEKLARIERT-Sätze zuerst; kein
    „[FÜLLUNG“ außerhalb des Kommentars.
15. **Ein Gate für drei Belange** (niedrig). (z) nach check-f21-workboard; neues Gate nur ARCHITECTURE.
16. **Durchsetzungsgrad der neuen Regeln fehlt** (läuft mit). Grenze und Verweise ERZWUNGEN, (a2) mit Referenz; DEKLARIERT:
    Invarianten-im-Kern, Gate/JSON bearbeiten, ID-Vergabe „max + 1“.
17. **Weitere Leser** — [Fakt, entlastend] nur leitstand-server:1756, f21-workboard:87/229, erzeuge-lagebild:45,
    f40-lagebild:46, routen-harness:100; Textanker nur die vier Gates. AK4 um `npm test` (projektkarte.test.ts) ergänzen.
    [offene Unsicherheit] parallele Branches mit findings.md — großen Diff früh mergen.
18. **Kein Stand-Marker** in den Köpfen (check-docs Prüfung 3).

Entlastend außerdem: genau ein Kopfblock in findings.md; F-1136 offen und bleibt; Duplikate nur je Datei geprüft ⇒ (z) nötig;
W1-Muster für JSON-Form passt; AK5 einhaltbar.

## Urteil

- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] Nicht freigegeben
- [ ] Blockiert

Kein Grundsatzproblem; Befunde 1, 2, 3 widerlegen Kernaussagen des Plans, 4 ist offen. Vor Umsetzung: 1–4, 5 (AK2), 6, 7, 11;
Stefan: 8, 9. Läuft mit: 5 (Puffer, Name), 10, 12–18. Nächster Schritt: Plan v2, Entscheidungen Stefans, Delta-Pass.
