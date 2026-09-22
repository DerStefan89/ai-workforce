# Nachweis WS-2 — Sparring-Latenz A/B-Messung (F34, F-609)

Reale Messung vor der UI-Arbeit (Auftrag F34 WS-2, Punkt 1). Dieselben drei
Nachrichten wie `features/F34/nachweis-ws1.md`, je Variante eine frische
Sparring-Kette (isolierte Server-Instanz mit eigenem `basisVerzeichnis`,
kein gemeinsamer Verlauf zwischen Varianten). Worker durchgehend
`claude-code` (Codex in dieser Umgebung nicht verfügbar, unverändert
gegenüber WS-1).

## Varianten
- **V0** — Stand WS-1 (Referenz, bereits in `nachweis-ws1.md` gemessen, hier
  nicht erneut gelaufen).
- **V1** — `KONFIGURATION_PRODUCT_COACH.aufrufEingabenZusatz` um
  `umgebungsvariablen.MAX_THINKING_TOKENS: '0'` ergänzt (Muster `jarvis`).
- **V2** — V0 unverändert + zusätzliche Zeile in `baueCoachAuftragstext`:
  "Nutze ZUERST den unten eingespeisten Projektkontext … Lies Dateien nur
  GEZIELT, höchstens 2 Reads je Turn …".
- **V3** — V1 + V2 kombiniert.

## Latenz-Tabelle

| Variante | Turn 1 (`dauer_ms`) | Turn 2 (`dauer_ms`) | Turn 3 (`dauer_ms`) | **Median** | interne Runden (1/2/3) |
|---|---:|---:|---:|---:|---|
| V0 (Referenz, WS-1) | 88 734 | 60 279 | 67 128 | **67,1 s** | 16 / 8 / 8 |
| V1 (MAX_THINKING_TOKENS=0) | 6 217 | 8 224 | 24 641 | **8,2 s** | 1 / 2 / 5 |
| V2 (Lese-Obergrenze) | 14 041 | 46 138 | 53 900 | **46,1 s** | 1 / 1 / 1 |
| V3 (V1+V2) | 15 956 | 42 466 | 30 702 | **30,7 s** | 6 / 8 / 4 |

Alle drei art-Ausgänge (`frage`, `frage`, `scope_entwurf` bzw. bei V2
`frage`, `alternativen`, `scope_entwurf`) real erreicht, kein Turn
fehlgeschlagen.

## Qualitätsvergleich der Scope-Entwürfe (Turn 3)

| Variante | Reale Fundstellen? | Abgrenzung (Out of Scope) vorhanden? | Anmerkung |
|---|---|---|---|
| V0 | Ja — `features/F29/feature.md` (WS-3) UND `state/findings.md` F-596, per aktivem Grep über Feature-Akten/Findings gefunden | Ja — 10 benannte Findings/Features explizit ausgeschlossen | Am gründlichsten; einzige Variante, die F-596 (P3, nicht in `lagebild.md`) selbst fand |
| V1 | Ja — F25 WS-2b, F25 WS-3 als Out-of-Scope-Referenzen; Annahme benennt explizit "im Findings-Register nicht auffindbar" (hat also geprüft, F-596 nicht gefunden) | Ja — vier klar benannte Out-of-Scope-Punkte | Schnellste Variante; F-596 nicht gefunden, sonst inhaltlich solide |
| V2 | Ja — "design-guardian-Pass" (reales Prüfrollen-Konzept aus CLAUDE.md), Import-Wizard/Health-Projektion als reale F25-Referenzen | Ja — drei Out-of-Scope-Punkte | 0 zusätzliche Lesevorgänge in Turn 2/3 (interne Runden = 1) — Antwort stützt sich fast ausschließlich auf den eingespeisten Kontext |
| V3 | Ja — zitiert E-M5-2 explizit als Entscheidungs-ID | Ja — vier Out-of-Scope-Punkte inkl. Verweis auf E-M5-2 | Median knapp über der 30-s-Zielmarke |

**Beobachtung (kein Blocker, aber real und wert festzuhalten):** V1/V2/V3
finden — anders als V0 — `state/findings.md` F-596 nicht. Wahrscheinliche
Ursache: `docs/projekt/kontext/lagebild.md` (die vorberechnete
Context-Builder-Einspeisung, F40 WS-2) fasst nur OFFENE P1-Findings
zusammen; F-596 ist P3 und taucht dort nicht auf. V0 fand F-596 nur über
eigene, mehrstufige Recherche (16 interne Runden in Turn 1) — genau die
Recherchetiefe, die MAX_THINKING_TOKENS=0 (V1/V3) und die Lese-Obergrenze
(V2/V3) beide unabhängig voneinander reduzieren. Nach der in Punkt 1 des
Auftrags gegebenen Entscheidungsregel ("reale Fundstellen + Abgrenzung
vorhanden") erfüllen V1/V2/V3 die Qualitätsschwelle dennoch — sie liefern
jeweils andere, ebenfalls reale Fundstellen (F25 WS-2b/WS-3, E-M5-2,
design-guardian) und eine klare Abgrenzung.

## Entscheidung

**V1 übernommen** — schnellste Variante (Median 8,2 s, klar unter der
30-s-Zielmarke), erfüllt die Qualitätsschwelle (reale Fundstellen +
Abgrenzung vorhanden). `KONFIGURATION_PRODUCT_COACH.aufrufEingabenZusatz`
trägt seither `umgebungsvariablen.MAX_THINKING_TOKENS: '0'`, identisch zu
`KONFIGURATION_JARVIS`. Die V2-Instruktionszeile in `baueCoachAuftragstext`
wurde NICHT übernommen (nur Teil von V2/V3, nicht V1).

Die oben dokumentierte Beobachtung (F-596 wird von keiner der drei
schnelleren Varianten gefunden) ist kein Blocker für diese Entscheidung,
aber ein real beobachteter Nebeneffekt der Latenzoptimierung — festgehalten
statt stillschweigend übergangen.

## Rohdaten
Vollständige `coachAntwort`-Objekte je Turn/Variante liegen als JSON in den
Ausgaben der Mess-Läufe (nicht Teil dieses Repos — flüchtige, isolierte
`kontrollzustand-test-f34-latenz-v{1,2,3}/`-Verzeichnisse, nach der Messung
entfernt, Muster jedes anderen Gate-Testlaufs). Diese Datei ist die
kanonische, dauerhafte Zusammenfassung.
