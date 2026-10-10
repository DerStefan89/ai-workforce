# Chat-Messung „vorher-coach“ (F45 B0)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T17:25:11.762Z. Rohdaten: `messung-vorher-coach.json`.

## Umgebung

- Modus: sparring (Untermodus feature), Turns: 5, Warmlauf: 0 min
- Startvorlage: Standard (ohne LEITSTAND_STARTVORLAGE_PFAD)
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/beispielprojekt.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Warnung beim Start: `[F-391] Startvorlage 'startvorlagen/beispielprojekt.json' geladen — Codex ist nicht verfügbar (Startvorlage trägt keinen vollständigen 'worker.codex'-Block (startziel/versionDeklariert/sandbox)); der Router fällt auf den fehleranfälligen claude-code-Klassifikationspfad zurück (F-337/F-373). Fix: LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json`
- Git: d10f9be, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T17:17:53.788Z, Ende 2026-10-10T17:25:11.762Z

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | 24 | 32 | 5 |
| K2 request_eingang → prozess_gestartet (Server) | 269 | 301 | 5 |
| Prozess (prozess_gestartet → prozess_beendet) | 46732 | 300443 | 5 |
| Nachbereitung (prozess_beendet → letzte Marke) | 22 | 303 | 5 |
| 202 → Poll-Ergebnis (Client) | 47439 | 300697 | 5 |
| Poll-Ergebnis → Anzeige (Client) | 8 | 21 | 5 |
| K3 Absenden → Antwort sichtbar | 28167 | 52701 | 4 |
| GET /api/zustand (alle 2 s) | 54 | 271588 | 77 (p95 171) |
| Event-Loop max je 60-s-Fenster | 896 | 271657 | 3 |

K4: 4 von 5 Turns enden sichtbar (Antwort 4, Fehler mit Grund 0, hängt 1).

K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).

## Turns

| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 17:17:57 | Antwort | 29 | 269 | 7438 | 303 | 8031 | claude-code | claude-sonnet-5 | 10/0 | `cfbab2e53add` | Product Coach "Chatverlauf als Text kopieren" klingt simpel, aber in F45 B0 (Chat-Arbeitsfähigkeit) ist unklar, welchen  |
| 2 | 17:18:09 | Antwort | 24 | 243 | 8464 | 22 | 8867 | claude-code | claude-sonnet-5 | 11/0 | `6a06614ff0ce` | Product Coach „Uhrzeit des letzten Laufs“ ist im Leitstand nicht eindeutig: Dieser gesamte Lagebild-/STATUS-Kontext zeig |
| 3 | 17:18:21 | Antwort | 32 | 301 | 52236 | 32 | 52701 | claude-code | claude-sonnet-5 | 10/0 | `31b820988129` | Product Coach Der Status in `state/findings.md` ist durchgehend Freitext, kein festes Vokabular: ich sehe `offen`, `gelö |
| 4 | 17:19:17 | hängt | 16 | 235 | 300443 | 12 | – | claude-code | – | 10/0 | `a427e48fe90d` | Lauf nicht erfolgreich 19:24 Lauf abgebrochen. |
| 5 | 17:24:22 | Antwort | 19 | 275 | 46732 | 16 | 47466 | claude-code | claude-sonnet-5 | 10/0 | `37b16364eb56` | Product Coach „Entscheidungen“ ist in der Seitenleiste kein neuer Begriff, sondern schon belegt: Seit F46 D2 zeigt die S |
