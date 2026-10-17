# Plan K „Kontext-Diät“ (F45, v1)

Auftrag Stefan 17.10.2026, Branch `f45/k-kontext-diaet`, Basis main `e2b0f2e7` (#360). Reines Doku-/Gate-Paket: kein
Produktverhalten, kein Produktcode (`src/`, `public/`, `scripts/leitstand*`). Reihenfolge F-1124: dieser Plan →
Advisor-Pass → Umsetzung → code-reviewer. Nicht anfassen: `features/F45/nachweise/b2b3b2b2b/` (ungetrackt, gehört zu 2b-2b-2).

## Briefing

1. **Ziel:** Sitzungskontext senken — ARCHITECTURE.md (Pflichtlektüre, 40 094 B) auf einen Kern ≤ 12 KB; `state/findings.md`
   (1 597 930 B) um die erledigten Einträge entlasten; beides gegen Rückfall absichern.
2. **Referenz:** Befund Challenger 17.10.2026; Muster `scripts/check-wachstumsbremse-server.mjs` (Ratsche gegen main);
   Kopfkommentar ARCHITECTURE.md (Aufteilungsregel: Abspaltung ⇒ memory-map-Zeile + Rückverweis + CLAUDE.md sagt WANN).
3. **Module/Daten:** ARCHITECTURE.md, neu `docs/architektur/*.md`, neu `state/findings-archiv.md`, neues Gate, JSON-Grenze,
   `scripts/check-f21-workboard.mjs` (liest findings.md), CLAUDE.md, `state/memory-map.md`, `docs/projekt/fixpaket-f45.md`.
4. **Zustände:** Gate-Fälle grün / rot je Bedingung / „Referenz nicht lesbar“ (ohne main) / JSON fehlt oder kaputt.
5. **AK:** siehe unten.
6. **Risiken:** siehe unten.

## 1 ARCHITECTURE.md → Kern + `docs/architektur/`

Abschnittsnummern und -titel §1–§8 bleiben (Regel 1h `analysiereArchitektur` braucht „Ordnerstruktur“/„Datenzugriff“;
rund 90 Kommentare in `scripts/`, `src/`, `public/`, `schemas/`, `docs/` zeigen auf „ARCHITECTURE.md §x“). Jeder Abschnitt
behält seine Regeln als Sätze und bekommt je Thema einen Verweis auf die Detaildatei. Damit stimmen alle „§x“-Verweise
weiter (die Regel steht in §x, das Detail einen Klick weiter) — kein Kommentar im Produktcode wird angefasst.

Detailtexte wandern **wörtlich** (ganze Bullets/Absätze, Zeichen für Zeichen) in:

| Datei | Herkunft (heute) |
|---|---|
| `docs/architektur/module.md` | §1 Bullet `src/` (Module projektkarte … rueckfrage), Detail-Bullets `startvorlagen/`, `harness-abgleich/`, `docs/projekt/`, `schemas/` |
| `docs/architektur/wachstumsbremse.md` | §1 Bullet `scripts/` (Rückweg-Regel + W1 mit ERZWUNGEN/DEKLARIERT) |
| `docs/architektur/lokale-dateien.md` | §2 Ausnahmen `~/.ai-workforce/…` (faehigkeiten.lokal, plugin-kopien, _lauf, faehigkeiten.stand), Lese-Bullet Claude-Code-Bestand |
| `docs/architektur/arbeitsordner.md` | §2 Bullet Produktdateien/Arbeitsordner, Bullet Lesender Fingerabdruck |
| `docs/architektur/rueckfrage-kanal.md` | §3 Absatz Rückfrage-Kanal mit Anzeige, Abnahme, Nachweislauf und allen Grenzen-Bullets; §4 Bullet Ablehnung durch Stefan |

Jede Detaildatei: Kopf (Zweck, „Herkunft: wörtlich aus ARCHITECTURE.md §x, F45 K, 17.10.2026“, „Regel im Kern: §x“), dann
der verschobene Text unverändert. Nachweis „nicht gekürzt“: ein Skript im Scratchpad prüft, dass jeder entfernte Absatz
byte-gleich in genau einer Detaildatei steht (Ergebnis im Bericht).

**Invarianten im Kern** (je mindestens ein Satz, Durchsetzungsgrad sichtbar), u. a.:
- §1: `src/` einziger Produktpfad; neue Auftragsversionen nur über `registriereAuftrag`; Review-Policy einzige Quelle, nur
  leere Befunde ohne Pflichtsatz halten an (1k); Code-Reviewer liest CLAUDE.md/ARCHITECTURE.md im Basis-Stand; nur
  `src/plugin-lauf` importiert `src/plugin-kopie` auf dem Startweg (Gate f45-f3b1 (f)), Gateway/Fähigkeiten-Start/Controller
  kennen nur Namen, Ordner, Rückrufe; `src/claude-plugins` reine Anzeige; Budget DEKLARIERT fail-open; Umfang nur Hinweis
  DEKLARIERT; Startvorlage ≠ Profil; Harness-Abgleich gehört zur Installation, Ergebnis ist Kontrollzustand.
  `scripts/`: Rückweg ≤ 1 je Stufe; Wachstumsbremse W1 (Zeilen = Grenze, nur senkbar gegen main, neue Routen in
  `routen-*.mjs`, schreibende Aufrufe bleiben im Server, bis W2 keine neuen Routen — F-1131), ERZWUNGEN/DEKLARIERT je ein Satz.
- §2: alle Ausnahmen namentlich (Lock, vier `~/.ai-workforce`-Orte, Arbeitsordner) je mit „außerhalb Repo/Arbeitsordner,
  geschrieben nur von …, kein Kontrollzustand“; Fingerabdruck schreibt Index und `.git/objects` nie; Claude-Code-Bestand nur
  lesend, unser Code schreibt dort nie (Gate f45-f3a (b)).
- §3: zwei Schichten wörtlich (bleiben). Rückfrage-Kanal: Opt-in `LEITSTAND_RUECKFRAGE=1` (ERZWUNGEN), Vorentscheidung im
  Leitstand, nur Bash an Stefan, Zeichenregel ERZWUNGEN, Grenzen 20/200 ERZWUNGEN, Token gibt kein Antwortrecht ERZWUNGEN,
  „Nur Stefan antwortet“ DEKLARIERT (E-B7 = A, `herkunft` je Antwort nur Hinweis), Wartegrenze 10 min, Fehler ⇒ Ablehnung,
  „noch nicht für echte Läufe“.
- §4: alle Bullets bleiben; der lange Rückfrage-Bullet wird ein Satz: Ablehnung allein durch Stefan ⇒ ERFOLGREICH mit
  `abgelehnt_durch_stefan`, sonst VERWEIGERT; Speicherstand ist Quelle der Wahrheit (ERZWUNGEN gegen gefälschte Datei);
  R1 `ablehnung_hash` ERZWUNGEN; Regel insgesamt DEKLARIERT.
- §5–§8 unverändert (klein).

Bestands-Gates mit Textprüfung am Kern (`check-f45-b2b3b2a-absicherung` (f) F-1131 im W1-Satz, `…-b2b3b2b1a-rest` (f) E-B7 +
Herkunft in §3, `…-b2b3b2b1b-r1` (f) R1 + `ablehnung_hash` in §4, `…-b2b3b1b-auswertung` (f) `abgelehnt_durch_stefan`/
ERFOLGREICH/DEKLARIERT in §4) bleiben **unverändert** grün, weil die Kernsätze genau diese Invarianten tragen.
Kopfkommentar (Aufteilungsregel) bleibt.

## 2 Gate `scripts/check-f45-k-kontext.mjs` (neu, in `check:gates`)

Grenze in `scripts/architektur-kern.json` `{ "obergrenze_bytes": 12288 }`.
- (a1) Bytes von ARCHITECTURE.md > Grenze ⇒ rot.
- (a2) Grenze höher als auf main (merge-base `origin/main`/`main`, Muster W1) ⇒ rot; ohne lesbare Referenz Meldung
  „(a2) nicht geprüft“. Nicht straff (kein (a3)): Spielraum unter der Grenze ist erlaubt — eine Byte-Gleichheit würde jede
  Textkorrektur zur JSON-Änderung machen.
- (f) JSON fehlt, kaputt, Grenze keine positive ganze Zahl ⇒ rot.
- (v1) jeder Verweis in ARCHITECTURE.md (Backtick-Pfad mit `/` oder Endung, Markdown-Link) auf eine Repo-Datei bzw. einen
  Ordner existiert; ausgenommen: Pfade außerhalb des Repos (`~`, `/api`, URL), Platzhalter (`<`, `*`, `…`), gitignorierte
  (wie check-docs). (v2) jede Datei in `docs/architektur/` wird aus ARCHITECTURE.md verwiesen (Rückverweis-Pflicht).
- (z) Findings: Kennungen über `state/findings.md` + `state/findings-archiv.md` eindeutig; jeder Archiv-Eintrag hat Status
  erledigt/geschlossen/abgeschlossen; Archiv parst befundfrei (`parseFindings`).
- Rot-Nachweis per `git archive HEAD` in eine Kopie + gezielte Präparation je Bedingung (Muster F-1127); Ergebnis im Bericht.

## 3 `state/findings.md` → `state/findings-archiv.md`

Regel (wörtlich nach Auftrag): Eintrag = Kopfzeile `**F-…** · \`TYP\` · P… · <Status>` bis vor die nächste Kopfzeile; Status
(ohne `**`) beginnt mit `erledigt`, `geschlossen` oder `abgeschlossen` ⇒ Archiv. Heute 226 Einträge (≈ 364 KB);
`offen (… erledigt …)` bleibt. `gelöst`/`behoben`/`korrigiert` (weitere ≈ 186 Einträge, ≈ 324 KB) **nicht** — außerhalb des
Wortlauts; als Entscheidung für Stefan im Bericht. Verschiebung per Skript: Bytes je Eintrag unverändert, Reihenfolge erhalten,
Kopf der Datei bleibt; Archiv bekommt eigenen Kopf. Kontrolle: Vereinigung beider Dateien (ohne Köpfe) = Original-Einträge,
Byte für Byte, Reihenfolge je Datei aufsteigend nach Fundstelle.

Kopf von findings.md (neue Sätze): erledigte Einträge stehen in `state/findings-archiv.md`; **nächste freie ID = höchste ID über
beide Dateien + 1**; Archivieren heißt wörtlich verschieben.

**Leser von `state/findings.md`** (Suche über `scripts/ src/ public/ .claude/ .githooks/ .github/ docs/`):
- `scripts/check-f21-workboard.mjs` (2)/(5): parst das Register; (2) Kopfzeilen = Workitems und (5) Typ/Priorität laufen
  künftig über **beide** Dateien (Bedingung erweitert, keine entfällt).
- `scripts/leitstand-server.mjs` Workboard (`parseFindings`): liest nur findings.md ⇒ die 226 archivierten (alle ERLEDIGT) fehlen
  im Workboard. **Hingenommen, DEKLARIERT** (Produktcode bleibt unberührt; Wachstumsbremse), steht in CLAUDE.md/Kopf.
- `scripts/erzeuge-lagebild.mjs`, `scripts/check-f40-lagebild.mjs`: nur offene P1 ⇒ unberührt.
- `scripts/leitstand/routen-harness.mjs`: zeigt die Datei im Harness-Bereich ⇒ funktioniert; Archiv dort nicht gelistet (hingenommen).
- Doku-Verweise „`state/findings.md` F-nnn“: stimmen weiter über den Kopfsatz (Archiv-Hinweis); nicht einzeln umgeschrieben.
- Tests/Nachweise mit eigenen Fixtures (`zustand-caches.test.mjs`, `routen-harness.test.mjs`, features/*): unberührt.

Größe danach im Bericht. Hinweis: die Entlastung des Claude-Projekts wirkt nur, wenn `state/findings-archiv.md` dort nicht
synchronisiert wird — Einstellung bei Stefan, nicht im Repo.

## 4 CLAUDE.md, memory-map

CLAUDE.md Pflichtlektüre: ein Satz — Details in `docs/architektur/` nur bei Bedarf (wenn eine Aufgabe das Thema berührt; die
Regel steht im Kern); `state/findings-archiv.md` nur bei Bedarf (Suche nach einer erledigten Kennung, ID-Vergabe).
`state/memory-map.md`: zwei Zeilen (Architektur-Details; erledigte Findings) mit „nicht hierhin“.

## 5 fixpaket-f45.md, Findings

Zeile „K Kontext-Diät“ zwischen „B2b-3b-2b-2b Lauf“ und „B2b-3b-2b-2b-2“ (Reihenfolge Lauf → K → 2b-2b-2), Stand gebaut
17.10.2026, nicht committet. Zwei neue Findings in findings.md (IDs nach Regel = max über beide + 1): PROCESS_IMPROVEMENT P1
„Wissensgrenze Claude-Projekt durch findings.md“, PROCESS_IMPROVEMENT P2 „ARCHITECTURE.md-Wachstum“, Status „erledigt
durch K“ (bleiben bis zum nächsten Archivlauf in findings.md).

## AK

1. ARCHITECTURE.md ≤ 12 288 B; §1–§8 mit unveränderten Titeln; jede Invariante als Satz; jeder entfernte Absatz byte-gleich
   in einer `docs/architektur/`-Datei (Skript-Nachweis).
2. Neues Gate grün; je Bedingung (a1)(a2)(f)(v1)(v2)(z) ein Rot-Fall in einer `git archive`-Kopie.
3. findings.md ohne Einträge mit Status erledigt/geschlossen/abgeschlossen (außer den beiden neuen); Archiv-Vereinigung =
   Original; check-f21-workboard prüft beide Dateien.
4. `check-docs`, `check-rules`, betroffene Gates (f21-workboard, f40-lagebild, f45-b2a1, f45-b2a2, f45-b2a3, die vier mit
   ARCHITECTURE-Textprüfung, neues Gate), `npm run lint`, `typecheck` lokal grün; `npm run check` → Cloud.
5. Keine Datei unter `src/`, `public/`, `scripts/leitstand*` geändert.

## Risiken

- R1 Kern verliert eine Invariante beim Kürzen ⇒ Gegenlesen je Bullet (Advisor, code-reviewer); wörtliche Detaildatei bleibt.
- R2 Projektkarte/Code-Reviewer im Lauf sehen nur den Kern (sie lesen ARCHITECTURE.md, nicht `docs/architektur/`) ⇒
  Invarianten stehen im Kern; Details fehlen den Rollen. Hingenommen (Kern ist die Regel; die Karte kürzt ohnehin).
- R3 Workboard zeigt archivierte erledigte Findings nicht mehr (s. o.).
- R4 Grenze 12 288 B lässt wenig Spielraum; Wachstum über die Grenze heißt künftig: Detail auslagern.
