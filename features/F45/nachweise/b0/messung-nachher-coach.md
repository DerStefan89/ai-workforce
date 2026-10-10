# Chat-Messung „nachher-coach“ (F45 B0)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T18:31:27.486Z. Rohdaten: `messung-nachher-coach.json`.

## Umgebung

- Modus: sparring (Untermodus feature), Turns: 5, Warmlauf: 0 min
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: d10f9be, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T18:30:05.298Z, Ende 2026-10-10T18:31:27.486Z
- Modern Standby während der Messung: nicht lesbar

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | 22 | 51 | 5 |
| K2 request_eingang → prozess_gestartet (Server) | 229 | 234 | 5 |
| Prozess (prozess_gestartet → prozess_beendet) | 9462 | 22936 | 5 |
| Nachbereitung (prozess_beendet → letzte Marke) | 18 | 22 | 5 |
| 202 → Poll-Ergebnis (Client) | 9780 | 23190 | 5 |
| Poll-Ergebnis → Anzeige (Client) | 13 | 15 | 5 |
| K3 Absenden → Antwort sichtbar | 9817 | 23214 | 5 |
| GET /api/zustand (alle 2 s) | 43 | 1318 | 38 (p95 279) |
| Event-Loop max je 60-s-Fenster | 316 | 316 | 1 |

K4: 5 von 5 Turns enden sichtbar (Antwort 5, Fehler mit Grund 0, hängt 0).

K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).

## Turns

| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 18:30:08 | Antwort | 22 | 234 | 9462 | 22 | 9817 | claude-code | claude-sonnet-5 | 10/0 | `f7c02fa56ee1` | Product Coach Chat-Ansichten gibt es in diesem Repo mindestens zwei, mit unterschiedlichem Verlaufsbegriff: public/leits |
| 2 | 18:30:20 | Antwort | 51 | 229 | 6398 | 11 | 6750 | claude-code | claude-sonnet-5 | 10/0 | `0fab32329857` | Product Coach Diese Idee kam im selben Durchgang [Messung F45-B0] schon einmal vor, wortgleich — ich habe dieselbe Rückf |
| 3 | 18:30:29 | Antwort | 11 | 224 | 7429 | 15 | 7735 | claude-code | claude-sonnet-5 | 10/0 | `d2d11f06d6bb` | Product Coach Diese Idee kam im selben Durchgang [Messung F45-B0] schon einmal vor, wortgleich — ich habe dieselbe Rückf |
| 4 | 18:30:39 | Antwort | 23 | 224 | 19220 | 21 | 19621 | claude-code | claude-sonnet-5 | 10/0 | `4714908accc2` | Product Coach Ein globales Tastenkürzel existiert in diesem Repo bisher nicht — es gibt nur Escape zum Schließen des Cha |
| 5 | 18:31:01 | Antwort | 16 | 232 | 22936 | 18 | 23214 | claude-code | claude-sonnet-5 | 10/0 | `a8c431cc43e8` | Product Coach Diese Idee kam im selben Durchgang [Messung F45-B0] schon einmal vor, wortgleich — ich habe dieselbe Rückf |
