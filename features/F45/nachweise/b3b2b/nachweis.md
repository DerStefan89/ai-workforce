# Nachweis F45 B3b-2b — Bewertung der Darstellung im qa-Schritt

Stand 29.10.2026, Branch `feature/f45-b3b2b-qa-darstellung`, Basis main `8d5b7d3`. Plan `features/F45/plan-b3b2b.md` +
`plan-b3b2b-v2.md`, Advisor `features/F45/advisor-b3b2b.md` („Freigegeben mit Hinweisen“).

## Spike

`spike-qa-darstellung.md`: echter claude-code-Lauf (`claude-sonnet-5`) mit dem neuen Abschnitt — PNG per Read gelesen,
roter Punkt als Befund HOCH, Schema `ergebnis-qa` hält; 0,22 USD, 91 s.

## Render-Nachweis der Karte (FEHLER-Text)

Testinstanz `instanz.mjs` (Kopie von `../b3b2a2/instanz.mjs`, nur FEHLER-Folgen, Port 4404, neutrale Umgebung, echte
Vorlage standard, Attrappe statt CLI). Je Ordner `01-karte.webp`, `klickfolge.json`, `protokoll.md`/`.json`; Pfadprobe
„sauber“.

| Folge | Zeigt |
|---|---|
| `fehler-de-1440`, `fehler-de-390` | „entscheidbar“: Badge FEHLER (amber), Hinweis „Darstellung nicht geprüft — den Grund zeigt das Ausgabe-Ende. Abnahme trotzdem möglich.“, Ausgabe-Ende aufgeklappt, kein Ortssatz, „Abnehmen“ angeboten |
| `fehler-ru-390-hell` | dasselbe auf Russisch (längster Text), hell |
| `vorab-fehler-de-1440-hell` | Halt nach Review BLOCKIERT: Karte (h4) im Block „vorab“, Hinweis „… sie ist nicht der Grund für den Halt. Den Grund zeigt das Ausgabe-Ende.“, „Abnehmen“ gesperrt |

Klicktabelle (Karte · vorab · Hinweis amber · Badge grün · Badge amber · aufgeklappt · Abnehmen): fehler
true/false/true/false/true/true/true; vorab-fehler true/true/true/false/true/true/false. Überlauf: keiner (1440/1440,
390/390, auch ru).

GRÜN/ROT/ZEITGRENZE sind unverändert (Auftrag) — Bilder dazu in `../b3b2a2/`.
