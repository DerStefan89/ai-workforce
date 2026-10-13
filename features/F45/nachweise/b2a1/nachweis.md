# Nachweis F45 B2a-1 — Projektkarte im echten Architekt-Lauf (13.10.2026)

## Lauf (`architekt-lauf.mjs`)

Eigene Leitstand-Instanz auf `LEITSTAND_PORT=4199` (danach beendet), `repoWurzel` = dieses Repo, Wegwerf-Kontrollzustand
und Rohstrom in `%TEMP%` (nicht im Repo). Weg der Oberfläche: `POST /api/auftraege` → Workflow aus
`workflow-vorlagen/hoch.json` (unverändert, nur Freigabe von Schritt 1 erteilt) → `POST /api/workflows/<id>/starten`.
Es lief nur Schritt 1 (`architekt`, Worker codex, Modus `feature`); danach `WARTET_FREIGABE` vor dem Advisor.
Option `arbeitsordner` aus (lesender Lauf) — die Karte nennt deshalb den Projektordner als Schreibort.

| Größe | Wert |
|---|---|
| Lauf | `27e17355-3bc4-4f28-8891-353b2a002105`, ERFOLGREICH |
| Worker / Modell | codex / `gpt-6-astra` (deklariert) |
| Dauer | 80 s (Wanduhr des Gateways 79,5 s) |
| Verbrauch (Laufakte) | 160 684 Eingabe-Tokens (davon 104 832 aus dem Cache), 1 949 Ausgabe-Tokens; Codex liefert keine Kosten in USD — nicht geschätzt |
| Projektkarte (Laufakte `projektkarte`) | Hash `55c3208a…564ffb3`, Abschnitte vorhaben, bestand, ausfuehrungsrahmen, faehigkeiten, qualitaet, `fehlend` leer |
| Kartentext | 15 614 Zeichen (`karte.md`, aus dem Prompt im Rohstrom) |

Dateien: `karte.md` (Kartentext, so wie er im Auftrag stand), `lauf.json` (Laufakten-Auszug und Entwurf =
letzte `agent_message`). Kein Rohstrom im Repo.

Auftrag (klein, gegen dieses Repo): „Gate für die Kartengröße je Rolle planen, in die Prüfkette aufnehmen; nur
Entwurf, kein Code.“

## Wo der Entwurf Bestand und Ausführungsrahmen berücksichtigt

- **Bestand gelesen und mit Pfad belegt** (Lese-Anweisung F-1065): `evidenz` trägt 8 × `[Fakt]`, davon 6 mit Dateipfad —
  `src/projektkarte/index.ts` (Exporte `ZUSCHNITT`, `KARTE_ROLLEN`, `GRENZE_ZEICHEN`, Kürzung in `baueProjektkarte`),
  `src/projektkarte/projektkarte.test.ts` (Toleranz +100 im Kürzungstest), `scripts/check-f45-b2a1-projektkarte.mjs` und
  `package.json` (Gate bereits in der `&&`-Kette), `src/projektkarte/types.ts`, `ARCHITECTURE.md` (Prüfskripte in
  `scripts/`, `node:test`, kalibrierte Rot-/Grün-Fälle vor „ERZWUNGEN“), `CLAUDE.md` (`npm run check` Exit 0).
- **Konventionen übernommen:** neues Gate unter `scripts/`, importiert Rollen und Grenzen statt einer zweiten
  Konfigurationsquelle, kalibrierte Grenzfälle (exakt Grenze / Grenze + 1), keine neue Abhängigkeit, kein ADR, kein
  Schema (`module`, `zusammenfassung`).
- **Ausführungsrahmen eingehalten:** kein git-Schritt; Verifikation ausschließlich über `npm run
  check:projektkarte-groesse` und `npm run check` — beide in der Allowlist der Karte (`npm run check:*`); neues Skript
  über `package.json` statt `node scripts/…` direkt; Schlussfolgerung im Entwurf: „Die vorgeschlagenen npm-Prüfaufrufe
  passen in den eingespeisten Ausführungsrahmen.“
- **Capability-Auszug im Feature-Modus genutzt:** `capabilities_bedarf` nennt `architecture-advisor` mit
  `ressource_id` aus dem Auszug, status `vorhanden`.

## Befunde aus dem Lauf (behoben in B2a-1)

1. Der Entwurf fand einen echten Fehler: die Gesamtkürzung hängte den Marker **nach** der Grenze an — die Karte
   überschritt `GRENZE_ZEICHEN` um die Markerlänge, der Test duldete +100. Behoben (`baueProjektkarte`: Marker zählt
   zur Grenze), Test ohne Toleranz für alle drei Rollen; Rot-Fall kalibriert (alte Kürzung → 1 Test rot).
2. `karte.md` zeigt: Überschriften der Projektbeschreibung (`## Was es ist` …) standen gleichrangig neben den
   Kartenabschnitten. Behoben (`einbetten`: eingebettete Überschriften auf Ebene 4), Test ergänzt.

`karte.md` ist der Stand **dieses** Laufs (vor beiden Korrekturen); der Hash einer Karte nach den Korrekturen weicht ab.
