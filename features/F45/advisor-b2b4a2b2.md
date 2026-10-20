# Delta-Advisor-Pass F45 B2b-4a-2b-2 „Bereit zum Sichern – Anzeige“ — Plan v1

Geprüft: `features/F45/plan-b2b4a2b2.md` gegen `fabb6a1`. Subagent `architecture-advisor`, frischer Kontext, nur Read/Grep/Glob,
20.10.2026. Inhaltlich übernommen, gestrafft. Nichts ausgeführt.

## Befunde
- (1) [Fakt, entlastend] Schlüsselschutz trägt: Auffrischer lädt das Detail je Tick (`workflows.js:1614`) → `zeichneEntscheiden` (`:1155`);
  `sichernSchluessel` (`code-daten.js:365`) wechselt nur bei Status/Ordner/Vorbereitung/Fassung. [Schlussfolgerung] Der Auffrischer lädt
  auch auf anderen Seiten nach (`:450-452`) — ein Schlüsselwechsel im Hintergrund löste einen Abruf ohne offene Karte aus (F-1157 (4));
  Abhilfe: Routenprüfung wie `:453`. Wiedereintritt bei synchroner `laedt`-Meldung — Schlüssel vor der Meldung vermerken.
- (2) [Fakt] Kartenknopf entfällt nur bei gesetztem `sichernHtml` — bei leerem String zwei Knöpfe; Gate (c) fängt es.
- (3) 409 trägt; 409 ohne `grund_schluessel` offen.
- (4) [Fakt] GESTOPPT ⇒ immer `nichtAbgeschlossen` (`ablauf-sichern.mjs:90`), nie `nichtsOffen` — „Nichts offen“ für GESTOPPT 0/0
  unerreichbar.
- (5) Zuschnitt passt knapp; Workboard-Render-Fall notfalls als benannte Abweichung.
- (6) [Fakt, schwer] Workboard bliebe auf „wird gelesen …“: nach `abgeschlossen` kein Auffrischen (`workboard.js:1248`), kein Abonnent des
  neuen Stand-Moduls. [Fakt] node_modules-Satz bei `nichtBestimmbar` entsteht als 200 `bereit: false` (`ablauf-sichern.mjs:25-26, :92`),
  nicht nur als 409; Schlüsselbereich für „200 nicht bereit“ fehlt.

## Bauauflagen
1. Workboard abonniert das Stand-Modul, zeichnet bei offener Seite und passender workflowId neu (Muster `workboard.js:1853`); Test/Gate.
2. Ein Schlüsselsatz `arbeitsordner.sichernGrund.<k>` für 409 und 200 `bereit: false`; node_modules-Satz bei `nichtBestimmbar` in beiden.
3. GESTOPPT 0/0 ⇒ „Nichts offen“; GESTOPPT ohne lesbare Zahlen ⇒ eigener neutraler Text; Fälle in Gate (c).
4. 409 ohne `grund_schluessel` ⇒ `fehler`; Gate (e).
5. Mitnehmen: Karte in Modus null nie mit Knopf (`ohneKnopf`), `stelleAblaufCodeStandSicher` nur auf der Detailroute, Schlüssel vor
   jeder Meldung vermerken.

## Urteil: Freigegeben mit Hinweisen

## Nächster sinnvoller Schritt
Auflagen 1–4 in den Plan (ohne neuen Pass), dann bauen.
