# F45 F-3b-1 — Nachweise: Plugins aus Stefans Claude Code freigeben

Stand 14.10.2026, Branch `f45/f3b1-plugins-freigabe` (Basis `8ac4647`). Plan `features/F45/plan-f3b.md` (v2.1, Delta-Advisor:
freigegeben mit Auflagen). Nur Fixtures (`scripts/_plugin-kopie-fixture.ts` „kraft“, `scripts/_plugin-fixture.ts`), keine
persönlichen Pfade oder IDs; kein echter Prüflauf mit Modell (die Testinstanz nutzt eine Attrappe des Laufstarts).

## 1 Tests zuerst (F-1092)

Roter Lauf vor den Modulen (14.10.2026 12:18): `node --test src/plugin-kopie/kopie.test.ts src/faehigkeiten/plugin-felder.test.ts
src/sammlung/pruefbericht-plugin.test.ts src/claude-plugins/text-fakten.test.ts` — alle vier Dateien rot (Modul
`src/plugin-kopie/index.ts` fehlt; Exporte `PLUGIN_ROLLEN`, `pluginBerichtSchluessel`, `textTreffer` fehlen). Danach grün.
Nach dem Modul geschrieben (ehrlich vermerkt): `scripts/leitstand/routen-plugin-freigabe.test.mjs` und
`public/leitstand/plugins-workforce-anzeige.test.mjs` (Oberfläche) — rot ist dort nur über die Rotfälle des Gates belegt.

## 2 Gate `scripts/check-f45-f3b1-freigabe.mjs`

(a) Kopie-Regeln je Art, (b)/(b2) Freigabe ohne/mit anderem Bericht, Hash, NICHT_GEEIGNET, Reihenfolge N1 (echte lokale Datei, die
sich während des Abrufs ändert), (c)/(c2) Drift und Vorrang, (d)/(d2)/(d3) Zuordnung, Felder-Erhalt bei Aktivierung und
Inhaltsfreigabe, nur Ausführung, (e)/(e2) Schreibwirkung und Prüfordner, (f) Lauf unverändert, (g) `starteWorkflowSchritt(` 6×,
(h) XSS inkl. verwaister Einträge, (j) Auftrag ohne Befehle, (k) Laufsperre nach dem Abruf (der Lauf beginnt erst während des
Abrufs), (l) Bericht überholt und Rücknahme ohne Freigabe 404, (m) verwaiste Einträge sichtbar und entfernbar, (n) Fremdänderung
(Einträge bleiben, Wächter sperrt mit seinem Grund), (o) Werkzeugsatz null = unbekannt (Fakt sichtbar, keine Bewertung, kein
Rückfall per `??`), (i) 40 Rotfälle.

## 3 Render-Nachweis (`render/`, Testinstanz `instanz.mjs`, Port 4199)

`LEITSTAND_PORT=4199 node features/F45/nachweise/f3b1/instanz.mjs`, dann
`node features/F45/nachweise/f3b1/render/erzeuge-nachweis.mjs`. Je Folge `protokoll.md` mit Klicktabelle und Bilder.

| Folge | Inhalt |
|---|---|
| `f3b1-ablauf-de-1440` (dunkel), `-de-1440-hell`, `-de-390`, `-ru-390`, `-en-390-hell`, `-de-1440-zoom200` | echter Klickablauf im Browser: Detail (5 übernommen, 9 nicht übernommen mit Grund) → „Kopie prüfen“ → Bericht „Mit Auflagen“ → „Freigeben“ → freigegeben → Kästchen „debuggen · Ausführung“ → zugeordnet |
| `f3b1-veraltet-de-1440`, `f3b1-veraltet-tr-390` | Freigabe veraltet, gespeicherte Zuordnung sichtbar mit Hinweis „wirkt nicht“ |
| `f3b1-gesperrt-ru-390`, `f3b1-gesperrt-de-1440-hell` | Lauf aktiv: alle Knöpfe und Kästchen gesperrt (angekreuzt und gesperrt auch hell erkennbar), eigener Hinweis ohne Server-Grund |
| `f3b1-verwaist-de-390` | Plugin nicht mehr installiert: Freigabe und Zuordnung mit „Freigabe zurücknehmen“/„Zuordnung entfernen“ (nur Anzeige) |
| `f3b1-fehler-de-390-hell` | Freigabe 409 → Fehler mit Grund am Plugin |
| `f3b1-tastatur-de-1440` | nur Tastatur (F-1094 (8)): Kopie prüfen, Freigeben, Kästchen (Leertaste), Zurücknehmen — Fokus danach auf der Meldung bzw. dem Kästchen, Live-Region `#plugins-status` nennt das Ergebnis |
| `f3b1-tastatur-verwaist-de-390` | nur Tastatur: Zuordnung entfernen und Freigabe zurücknehmen bei nicht mehr installiertem Plugin — Fokus danach auf der Meldung bzw. dem Kopf der Liste |

14 Folgen, kein waagerechter Überlauf. Nicht im Bild: „Prüfung läuft“ (Attrappe zu schnell), Hinweis der Projektansicht,
Fremdänderung, „Bericht überholt“, Klick auf „Entfernen“ bei verwaisten Einträgen (Zustände in Tests und Gate belegt). Bekannt: die schwebende Persona-Schaltfläche verdeckt bei 390 px einen Teil der
Zeilen (F-1093 (5)).
