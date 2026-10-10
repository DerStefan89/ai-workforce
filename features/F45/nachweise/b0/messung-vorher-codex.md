# Chat-Messung „vorher-codex“ (F45 B0)

Erzeugt von `scripts/messe-chat.mjs` am 2026-10-10T17:26:14.220Z. Rohdaten: `messung-vorher-codex.json`.

## Umgebung

- Modus: jarvis, Turns: 5, Warmlauf: 0 min
- Startvorlage: startvorlagen/ai-workforce.json
- Leitstand: `Leitstand läuft auf http://127.0.0.1:4199 (Startvorlage: startvorlagen/ai-workforce.json, Projekte: ai-workforce, haushaltsbuch, haushaltsbuch2)`
- Git: d10f9be, Node v24.16.0, win32 x64, Arbeitsordner `C:\Users\stefa\Projekte\ai-workforce`
- Start 2026-10-10T17:25:12.411Z, Ende 2026-10-10T17:26:14.220Z

## Kennzahlen (ms)

| Kennzahl | Median | Max | Anzahl |
|---|---|---|---|
| K1 Absenden → 202 (Client) | 36 | 55 | 5 |
| K2 request_eingang → prozess_gestartet (Server) | – | – | 0 |
| Prozess (prozess_gestartet → prozess_beendet) | – | – | 0 |
| Nachbereitung (prozess_beendet → letzte Marke) | – | – | 0 |
| 202 → Poll-Ergebnis (Client) | 6734 | 11945 | 5 |
| Poll-Ergebnis → Anzeige (Client) | 17 | 30 | 5 |
| K3 Absenden → Antwort sichtbar | 6786 | 12017 | 5 |
| GET /api/zustand (alle 2 s) | 48 | 2696 | 25 (p95 697) |
| Event-Loop max je 60-s-Fenster | 1485 | 1485 | 1 |

K4: 5 von 5 Turns enden sichtbar (Antwort 5, Fehler mit Grund 0, hängt 0).

K3 nimmt die Client-Zeile (gesamt_ms), sonst die von außen gemessene Zeit bis zum Ende der Tipp-Punkte. K1 ebenso (absenden_bis_quittung_ms, sonst Klick → 202).

## Turns

| # | Start | Endart | K1 | K2 | Prozess | Nachber. | K3 | Worker | Modell | claude/codex | laufId | Grund / Auszug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 17:25:19 | Antwort | 55 | – | – | – | 12017 | codex | gpt-6-astra | 10/0 | `85bff4480b94` | Jarvis OK |
| 2 | 17:25:34 | Antwort | 41 | – | – | – | 6220 | codex | gpt-6-astra | 10/0 | `2b14b2ae8a47` | Jarvis Dieses Projekt heißt AI Workforce. |
| 3 | 17:25:44 | Antwort | 36 | – | – | – | 6786 | codex | gpt-6-astra | 10/0 | `eb89321cf05d` | Jarvis Der aktuelle Meilenstein ist M5: Projektkontext, Coach, Challenge-Flow, Architektur und Dogfooding. |
| 4 | 17:25:54 | Antwort | 29 | – | – | – | 7784 | codex | gpt-6-astra | 10/0 | `9eddb7ac02af` | Jarvis F45 ist das Fixpaket „Arbeitsfähigkeit“, das aktuell mit B0 zur Verbesserung der Zuverlässigkeit des Jarvis-Chats |
| 5 | 17:26:05 | Antwort | 21 | – | – | – | 5715 | codex | gpt-6-astra | 10/0 | `8646ac711ebf` | Jarvis 42 |
