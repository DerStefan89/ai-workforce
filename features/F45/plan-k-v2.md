# Plan K „Kontext-Diät“ (F45, v2)

v1: `features/F45/plan-k.md` (unverändert). Advisor-Pass: `features/F45/advisor-k.md` (Nicht freigegeben, 18 Befunde).
Entscheidungen Stefan 17.10.2026 (nach dem Pass): **E-K-1** Archivregel = Status beginnt mit einem ERLEDIGT-Wort des
Workboard-Parsers (gelöst/behoben/erledigt/korrigiert; Befund 9). **E-K-2** Workboard-Verlust hinnehmen, als bekannte Grenze
benennen, TECH_DEBT-Finding (Befund 8). **E-K-3** Invariante vor Byte: jede Invariante bleibt als Satz im Kern; die Grenze ist
der gemessene Ist-Wert plus kleiner Puffer, auch über 12 KB (Befund 4).

Unverändert aus v1: Ziel, Scope, keine Datei unter `src/`, `public/`, `scripts/leitstand*`; `features/F45/nachweise/b2b3b2b2b/`
bleibt unberührt.

## Änderungen gegenüber v1

| Befund | v2 |
|---|---|
| 1 Textanker | Pflichtfragmente wörtlich (Tabelle „Anker“ unten); Überschriften `## 1. Ordnerstruktur` … `## 8. Definition of Done` unverändert. |
| 2 Geltungsbereich check-docs | Neues Gate prüft Verweise (Prüfung-1-Grammatik) und Versionsnummern (Prüfung-2-Muster) auch in `docs/architektur/*.md`. Rückverweise in Backtick-Form mit `.md`. |
| 3 Invariantenliste | Geschlossene Tabelle unten (Herkunft → Kernsatz oder „nur Detail“ mit Grund). |
| 4 Größe | Kern gemessen: 15 601 B (heute 40 094 B, −61 %). Deckel 16 000 B (Ist + ≈ 400). |
| 5 Ratsche | Ehrlich „Deckel, nur senkbar“; (a2) per Unit-Test mit injiziertem git (`scripts/check-f45-k-kontext.test.mjs`), da in einer `git archive`-Kopie nicht rot prüfbar. |
| 6 Grammatik (v1) | Dateien: Regex aus check-docs Prüfung 1 (Backtick, Endung md/ts/tsx/js/mjs/json; mit `/` ⇒ Pfad existiert, ohne ⇒ Name existiert im Repo; gitignoriert ausgenommen). Ordner: Backtick-Text endet auf `/` und erstes Segment ist ein Eintrag der Repo-Wurzel ⇒ existiert. Markdown-Links `](rel)` ohne Schema/Anker ⇒ existiert. Feldpfade und fremde Wurzeln fallen damit heraus. |
| 7 Kopf findings.md | Satz neu: „bestehende nie löschen — Status ändern statt entfernen; Archivieren heißt: erledigte Einträge wörtlich nach `state/findings-archiv.md` verschieben“; dazu die ID-Regel. memory-map Zeile Findings ergänzt. |
| 8 Workboard | Bekannte Grenze (kein „DEKLARIERT“): Spalte „Abgenommen“ verliert die archivierten Karten; „Zum Eintrag“-Links alter Aufträge auf archivierte IDs finden nichts; `offeneBefunde`/VS-Code-Link unberührt. TECH_DEBT-Finding. |
| 9 Archivregel | E-K-1; dieselbe Regel in Skript und Gate. |
| 10 P1 „erledigt“ | Stefans Auftrag nennt den Status „erledigt durch K“ ⇒ so gesetzt; die Abhängigkeit vom Sync steht in der Maßnahme (Hinweis im Bericht). |
| 11 Vorrang | Kopf jeder Detaildatei und Einleitung des Kerns: gleich verbindlich, bei Widerspruch gilt der Kern, Widerspruch = Befund; §-Angaben im Detail meinen ARCHITECTURE.md. CLAUDE.md trennt „verbindlich“ und „bei Bedarf lesen“. |
| 12 Aufteilungsregel | Kopfkommentar: zweiter Auslöser „Größengrenze des Kerns“. Eine memory-map-Zeile für den Ordner. |
| 13 Rückweg | Rückweg-Regel (§1 `scripts/`) und Plan v2 (§1 `schemas/`) gemeinsam in `docs/architektur/kette.md`. |
| 14 Projektkarte | ERZWUNGEN/DEKLARIERT-Sätze in §3/§4 vorn; kein „[FÜLLUNG“ außerhalb des Kommentars. |
| 15 Gate-Schnitt | Findings-Prüfungen in `scripts/check-f21-workboard.mjs`; neues Gate nur ARCHITECTURE + `docs/architektur/`. |
| 16 Durchsetzungsgrad | Einleitung des Kerns: Deckel und Verweise ERZWUNGEN ((a2) bei lesbarer Referenz); „jede Regel als Satz“ DEKLARIERT; Bearbeiten von Gate/JSON DEKLARIERT. ID-Vergabe „max + 1“ DEKLARIERT, Eindeutigkeit über beide Dateien ERZWUNGEN (Kopf findings.md). |
| 17 Tests | AK um `npm test` lokal (mindestens projektkarte, wachstumsbremse, neues Gate); Hinweis Merge-Reihenfolge. |
| 18 Stand-Marker | Keiner in den neuen Köpfen. |

## Detaildateien (wörtlich, per Skript aus dem Original erzeugt)

| Datei | Herkunft (Zeilen heute) |
|---|---|
| `docs/architektur/module.md` | :26, :29, :30, :33, :34 ohne den Plan-v2-Satz |
| `docs/architektur/kette.md` | :32 Rückweg-Teil, :34 Plan-v2-Satz |
| `docs/architektur/wachstumsbremse.md` | :32 W1-Teil |
| `docs/architektur/lokale-dateien.md` | :43–80, :94–102 |
| `docs/architektur/arbeitsordner.md` | :83–93 |
| `docs/architektur/rueckfrage-kanal.md` | :116–195 (§3), :200 (§4) |

Nachweis „nicht gekürzt“: Skript prüft, dass jede entfernte Zeile (bei :32/:34 jedes Teilstück) byte-gleich in genau einer
Detaildatei steht.

## Anker (Bestands-Gates, wörtlich im Kern)

| Gate | Fragment |
|---|---|
| f45-b2b3b2a-absicherung (f) | `Wachstumsbremse (F45 W1` und `F-1131` innerhalb von 4000 Zeichen danach |
| f45-b2b3b2b1a-rest (f) | in `## 3. Auth` … `## 4. Fehlerbehandlung`: `E-B7`, `herkunft` |
| f45-b2b3b2b1b-r1 (f) | in `## 4. Fehlerbehandlung` … `## 5.`: `R1`, `ablehnung_hash` |
| f45-b2b3b1b-auswertung (f) | in `## 4.` … `## 5.`: `abgelehnt_durch_stefan`, `ERFOLGREICH`, `DEKLARIERT` |
| projektkarte (1h), f45-b2a1 (c) | Titel „Ordnerstruktur“, „Datenzugriff“ beschrieben; kein `[FÜLLUNG` außerhalb von Kommentaren |

## Invarianten (geschlossen): Herkunft → Kern

Kriterium (Befund 3): jeder entfernte Satz mit ERZWUNGEN, DEKLARIERT, nur, nie, einzig, ausschließlich, kein.

| Herkunft | Regel | Kern |
|---|---|---|
| :26 | Projektkarte rein, `analysiereArchitektur` eine Regel (1h) | §1 `src/` a |
| :26 | Arbeitspaket kein Artefakttyp; `baueArbeitspaketBlock` einzige Textquelle; neue Versionen nur über `registriereAuftrag` (auch Budget) | §1 a |
| :26 | Review-Policy einzige Quelle; nur leere Befunde ohne Pflichtsatz halten an (1k) | §1 b |
| :26 | Code-Reviewer liest Regeln im Stand vor dem Bau; „veraltet“ nur über `inhalt` | §1 b |
| :26 | `src/claude-plugins` reine Anzeige (kein Lauf importiert) | §1 c |
| :26 | `src/plugin-lauf` einziger Weg, Prüfung vor jedem Lauf; nur es importiert `src/plugin-kopie` (Gate f45-f3b1 (f)); Gateway/Start/Controller nur Namen, Ordner, Rückrufe | §1 c |
| :26 | Budget DEKLARIERT fail-open; Umfang nur Hinweis DEKLARIERT; beide kein Workflow-Schreiber | §1 d |
| :26 | `src/rueckfrage` rein, Vorentscheidung/Pfadgrenze fail closed | §1 a, §3 |
| :29 | Startvorlage kein Profil; nacktes Bash/git vom Validator abgewiesen (E-F754) | §1 `startvorlagen/` |
| :30 | Harness-Abgleich gehört zur Installation, Kern liest nur; Ergebnis Kontrollzustand | §1 `harness-abgleich/` |
| :32 | Rückweg ≤ 1 je Stufe, ≤ `max_replans`, Halt bei denselben Befunden; „Prüfer wiederholen“ zählt nicht; Schreibendes im Server (F-228) | §1 `scripts/` a |
| :32 | W1 samt ERZWUNGEN/DEKLARIERT, F-1131 | §1 `scripts/` b |
| :33 | Projektkontext je Projekt-Repo, kein zweiter Speicher (E-M4-2) | §1 `docs/projekt/` |
| :34 | Regel 4b; Plan v2 höchstens einmal, ohne zweiten Advisor (3a), im selben Schreibvorgang | §1 `schemas/`, `scripts/` a |
| :42 | „Jede weitere Ausnahme … erst hier, dann im Code“ | §2 (bleibt wörtlich) |
| :43–57 | faehigkeiten.lokal: nur Routen auf direkte Eingabe, Laufsperre, Hash je Lauf, E-F45-7, F-1061; Zuordnung nur `ausfuehrung`; Freigabe nur im Checkout mit Prüfbericht | §2 Ausnahmen 1 |
| :58–66 | plugin-kopien: inhaltsadressiert, nie überschrieben (409), nie Hooks/MCP/LSP, nur nach Prüfbericht; Prüfläufe nur Workforce-Instanz | §2 Ausnahmen 2 |
| :67–72 | `_lauf`: nur Startweg, nie gelöscht, anderer Inhalt ⇒ kein Start | §2 Ausnahmen 2 |
| :73–80 | faehigkeiten.stand: nur Wächter, atomar, fail-closed, kein Schutz gegen Nutzerprozess | §2 Ausnahmen 3 |
| :83–88 | Arbeitsordner: nur git, `--ignore-scripts`, Löschliste nur innerhalb, nie `.git`/`.claude/`/`kontrollzustand/`, Projektordner lesend | §2 Produktdateien |
| :89–93 | Fingerabdruck: kein Index-/Objekt-Schreiben (Gate f45-b2a3b (a)), kein Filter-Treiber | §2 Produktdateien |
| :94–102 | Claude-Code-Bestand nur lesend, nie schreiben (Gate f45-f3a (b)); `plugins/data`-Abweichung Befund statt Abbruch | §2 |
| :119–123, :129 | Opt-in; Argv und Auftragstext ohne Kanal bitgleich ERZWUNGEN | §3 Grenzen 1 |
| :141–146 | escaped, Maskierung, einziger Schreiber rueckfrage-kanal.js | §3 Grenzen 6 |
| :148–149 | `entschieden` ohne Token lesbar DEKLARIERT | §3 Grenzen 5 |
| :163–165 | R3-Sichtung zweiter Schritt DEKLARIERT | §3 Grenzen 5 |
| :168–170 | Frist/timeout DEKLARIERT; noch nicht für echte Läufe | §3 Grenzen 5, Einleitung |
| :171–176 | Vorentscheidung im Leitstand; nur Bash an Stefan; Zeichenregel ERZWUNGEN; Sperr-/Deny/Hooks vorher | §3 Grenzen 2 |
| :177–179 | 20/200 ERZWUNGEN | §3 Grenzen 3 |
| :180–183 | Token kein Antwortrecht ERZWUNGEN | §3 Grenzen 4 |
| :184–193 | Nur Stefan antwortet DEKLARIERT (E-B7, `herkunft`); ID genau einmal, nur offene Läufe; Bedien- statt Sicherheitsgrenze | §3 Einleitung, Grenzen 4/5 |
| :194–195 | Wartegrenze 10 min; Fehler ⇒ Ablehnung | §3 Grenzen 7 |
| :200 | ERFOLGREICH/`abgelehnt_durch_stefan`, sonst VERWEIGERT; Speicherstand Quelle (ERZWUNGEN); R1 `ablehnung_hash` ERZWUNGEN mit Hook-Annahme und CLI-Voraussetzung F-1128 (4); `lauf_ende` ERZWUNGEN; R2; `daten` bitgleich; insgesamt DEKLARIERT | §4 Bullet 2 |

**Nur Detail** (Beschreibung, keine Regel): Inhalt der Projektkarte und Laufakten-Felder, Freigabe-Zustände der Kopie,
Budget-Stand-Zwischenspeicher, Formfehler im Umfangs-Feld, pruefbefehl/pruefketten_pfade, Schema-Pfade, `$schema`-Entfernung,
Pfadsyntax der Routen, Wurzel per Umgebungsvariable, gemeinsamer Werkzeugsatz der Instanzen, `.in_use`-Marke der CLI (von Stefan
als Nebenwirkung angenommen, E-F3a-1), URL-Form und Weiterleitung des Kanals, Anzeige-Einzelheiten (Band, Restzeit, Unicode-Klassen),
Abnahme-Projektion und Startfehler-Beschriftung, Felder `rueckfrage_abgleich`/`rueckfrage_zaehlung`/`rueckfrage_abweichung`,
Datei-Versionen des Protokolls und ihre bekannten Grenzen, Nachweislauf-Werkzeug.

## Gate `scripts/check-f45-k-kontext.mjs` (neu, in `check:gates`)

Deckel in `scripts/architektur-kern.json` `{ "obergrenze_bytes": 16000 }`.
- (a1) Bytes ARCHITECTURE.md > Deckel ⇒ rot. (a2) Deckel höher als auf main (merge-base `origin/main`/`main`) ⇒ rot; ohne
  Referenz „(a2) nicht geprüft“. (f) JSON fehlt/kaputt/keine positive Ganzzahl ⇒ rot.
- (v1) Verweise (Grammatik s. Befund 6) in ARCHITECTURE.md und `docs/architektur/*.md`; (v2) jede Datei in `docs/architektur/`
  ist aus ARCHITECTURE.md als `` `docs/architektur/<name>.md` `` verwiesen; (v3) keine Versionsnummer (Muster check-docs
  Prüfung 2) in `docs/architektur/*.md`.
- Reine Funktionen exportiert, Prüfung nur am Haupteinstieg; Unit-Test `scripts/check-f45-k-kontext.test.mjs` für (a1)(a2)(f)(v1)(v2)(v3).
- Rot-Nachweis: `git archive HEAD` + Arbeitsstand in eine Kopie, je Bedingung präpariert ((a1)(f)(v1)(v2)(v3)); (a2) per Unit-Test.

## Findings

- Archiv per Skript (E-K-1): 413 Einträge (≈ 690 KB) nach `state/findings-archiv.md`; findings.md danach ≈ 0,91 MB.
  Kontrolle: Vereinigung = Original, Byte für Byte, Reihenfolge je Datei erhalten.
- `scripts/check-f21-workboard.mjs`: (2) parserfrei und Kopfzeilen = Workitems und (5) Typ/Priorität über **beide** Dateien;
  neu (z): Kennungen über beide eindeutig; jeder Archiv-Eintrag erfüllt die Archivregel. Keine Bedingung entfällt.
- Kopf findings.md: Archivsatz, ID-Regel „höchste ID über beide Dateien + 1“ (DEKLARIERT; Eindeutigkeit ERZWUNGEN durch (z)).
- Neue Findings: F-1137 PROCESS_IMPROVEMENT P1 Wissensgrenze (erledigt durch K; Wirkung erst, wenn das Archiv nicht ins
  Claude-Projekt synchronisiert wird — Stefan), F-1138 PROCESS_IMPROVEMENT P2 ARCHITECTURE-Wachstum (erledigt durch K),
  F-1139 TECH_DEBT P3 Workboard liest das Archiv nicht (offen; Lösung braucht Server-Zeilen, W1-Ausgleich).

## CLAUDE.md, memory-map, fixpaket

- CLAUDE.md Pflichtlektüre: „Die Regeln stehen im Kern von ARCHITECTURE.md; `docs/architektur/` trägt den wörtlichen
  Detailtext (gleich verbindlich) und wird nur bei Bedarf gelesen — wenn eine Aufgabe das Thema berührt. `state/findings-archiv.md`
  nur bei Bedarf (erledigte Kennung nachschlagen, ID-Vergabe).“
- memory-map: Zeile „Architektur-Detailtext“ → `docs/architektur/*.md`; Findings-Zeile um das Archiv ergänzt.
- fixpaket-f45.md: Zeile „K Kontext-Diät“ zwischen „B2b-3b-2b-2b Lauf“ und „B2b-3b-2b-2b-2“.

## AK

1. ARCHITECTURE.md ≤ Deckel 16 000 B; Titel §1–§8 unverändert; Anker-Tabelle erfüllt; Invarianten-Tabelle im Kern abgebildet;
   Verschiebe-Nachweis grün.
2. Neues Gate grün; Rot je (a1)(f)(v1)(v2)(v3) in einer Kopie, (a2) im Unit-Test.
3. Archiv-Kontrolle grün; check-f21-workboard grün über beide Dateien, (z) rot bei doppelter ID / falschem Archiv-Status.
4. Lokal grün: check-docs, check-rules, check-f21-workboard, check-f40-lagebild, f45-b2a1/b2a2/b2a3, die vier Anker-Gates,
   wachstumsbremse, neues Gate, lint, typecheck, `node --test` für projektkarte, wachstumsbremse, neues Gate.
5. Keine Datei unter `src/`, `public/`, `scripts/leitstand*` geändert.

## Risiken

R1 Kernsatz und Detail laufen auseinander ⇒ Vorrangregel, DEKLARIERT. R2 Workboard (E-K-2). R3 parallele Branches mit
findings.md-Änderungen ⇒ K früh mergen (Konflikt im Kopfbereich/Ende möglich). R4 Wirkung aufs Claude-Projekt hängt am Sync.

## Nachtrag nach dem Delta-Pass (17.10.2026)

Delta-Pass `features/F45/advisor-k-delta.md`: FREIGEGEBEN MIT HINWEISEN. Umgesetzt vor dem Bau des Kerns (die Tabellen oben
bleiben als Stand v2 stehen):
- Befund 1: Kernsatz korrigiert — den **Rückweg** zu Plan v2 schreibt der Nachlauf des Advisors im selben Schreibvorgang.
- Befund 2: zusätzliche Kernsätze — `src/claude-plugins` kein Lauf importiert; Lauf-Kopie nur der zugeordneten Teile; Umfang kein
  Artefakttyp; Positivliste `skills/`/`agents/`/`commands/`; Plugin-Kopie gelöscht nur durch Stefan; `_` beginnt nie eine
  Plugin-id; Stand-Datei gelesen nur beim Serverstart; Kanal „genau dieser Wert, nur über `rueckfrageOptionFuer`“, Instanz-Trennung
  (fremdes Token ⇒ 403), keine Regelzeile mit „- [x]“; Token nur zwischen Start und Ende, nur zum Fragen/Warten; Abweichung des
  Hashes = Lauf rot; Schreib-Routen gesperrt bis zur Bestätigung; W1-Ausgleich durch Auslagern reiner Helfer.
- Befund 3: stdout-Umgehung bei R1 als DEKLARIERT im Kern.
- Befund 4: Einleitung nennt ERZWUNGEN (Deckel, Verweise, Rückverweise, (a2) nur bei lesbarer Referenz) und DEKLARIERT
  (Regel als Satz, Gate/JSON bearbeiten).
- Gemessen: Kern 16 519 B ⇒ Deckel **17 000 B** (E-K-3; statt 16 000 aus v2).
- Befund 5: Projektkarte sieht §3 nach ≈ 2000 Zeichen nicht ganz — besser als heute, nicht vollständig (hingenommen).
- Befunde 6–8: siehe Nachtrag in `advisor-k-delta.md`.

## Nachtrag nach code-reviewer und qa (17.10.2026)

Beide FREIGEGEBEN MIT HINWEISEN. Eingearbeitet: Zeichenregel statt ganzer Vorentscheidung ERZWUNGEN (M1); Kernsätze für die
einzige während eines Laufs offene rechtegebende Route, die Löschliste (ausschließlich geprüfte reguläre Dateien nach
`ausfuehrung`), den Schreiber der Plugin-Kopie, das Git-Plumbing des Fingerabdrucks und „fehlender Speicherstand ⇒ nicht nur
Stefan“ (M2); Gate-Kennungen an den ERZWUNGEN-Sätzen in §3; Weg zum Anheben des Deckels (Entscheidung Stefans) und „Kern und
Detail gemeinsam ändern“ in der Einleitung; Kern **17 332 B, Deckel 17 800 B**. Gate: Kern fehlt ⇒ (f), BOM in der JSON
toleriert, Unterordner/Nicht-.md in `docs/architektur/` ⇒ (v2), Rückverweis im HTML-Kommentar zählt nicht, Links mit Titel.
check-f21-workboard (6): die höchste ID bleibt im Register (die nächste freie ID ergibt `state/findings.md` allein); Archivlauf
im Kopf von `state/findings-archiv.md` beschrieben. AK1 lautet damit „≤ Deckel 17 800 B“, AK3 meint Prüfung (6) (in v2 „(z)“).
Rest als F-1140 (TECH_DEBT).
