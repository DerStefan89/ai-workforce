# F35 — Nachweis des Reallaufs gegen `haushaltsbuch2` (Feature bauen aus Akte, 28.09.2026)

Reallauf der vollständigen F35-Kette (WS-1 Auftrag aus Akte, WS-2 Urteil je
AK, WS-3 ADJUST-Automatik) gegen das Fremdprojekt `haushaltsbuch2`, Feature
`F1` „Kategorien verwalten" (AK1–AK3). Erstmals entsteht in einem
Fremdprojekt über den Pfad `hoch` (Architekt → Advisor → Ausführung →
Review) echter, geprüfter und vom Menschen abgenommener Produktcode.

Alle IDs, Zeitpunkte und Dauern sind aus dem Kontrollzustand von
`haushaltsbuch2` gelesen (`C:\Users\stefa\Projekte\haushaltsbuch2\
kontrollzustand`, lesend), die Review-Urteile aus den Rohströmen unter
`kontrollzustand-roh/<lauf>/rohstrom.json` in ai-workforce (codex-Läufe
schreiben dort, `arbeitsverzeichnis_pfad` = Installationswurzel). Der
Kontrollzustand von `haushaltsbuch2` ist dort gitignored — dieses Dokument
ist die einzige versionierte Sicherung der Belege (F-766).

- Auftrag `8b138eac-36a8-4266-998f-ff79fd41a159` (angelegt
  2026-09-25T22:55:42Z, `herkunft.art: 'feature_akte'`, `titel: 'F1'`).
- Workflow `router-8b138eac-36a8-4266-998f-ff79fd41a159` (32 Versionen,
  2026-09-28T08:43:28Z bis 13:54:50Z, Endstatus `ABGESCHLOSSEN`).
- Abnahme-Artefakt `entscheidung-workflow-router-8b138eac-…-abnahme`
  (3 Versionen: 2× `kern`, 1× `mensch`).
- `haushaltsbuch2`-Commits: `e7ee227` (Iteration 1), `07b6691`
  (Vorbereitung Iteration 2), `0c92af2` (Iteration 2), `6fc21d0`
  (Iteration 3, abgenommen).

## Prüfpunkte

Die Zählung Z1–Z7 folgt der F35-Kette (WS-1 → WS-3 → Abnahme); sie war im
Repo nicht vorab festgelegt.

| Ziel | Mechanik | Inhalt | Beleg |
| --- | --- | --- | --- |
| Z1 Auftrag aus Akte + Routing (WS-1) | ✅ | ✅ | Auftrag `8b138eac`: `herkunft.art 'feature_akte'`, `akzeptanzkriterien` AK1–AK3 mit expliziten IDs, `nicht_ziele` (Unterkategorien/Hierarchien, Budgets). Router-Lauf `router-8b138eac-…-1790584994316` (codex, 14 s) ERFOLGREICH: `kontrolltiefe 'hoch'` (Begründung: neue Persistenzsemantik), `risikoklasse 'mittel'`, `vorlage 'hoch'`, eine Rückfrage (Kategorie fest Einnahme/Ausgabe?). Zwei vorherige Router-Läufe (`…-1790376942377`, `…-1790378100861`, 25.09.2026 22:55Z/23:15Z, je ~40 s) FEHLGESCHLAGEN — Codex-Störung, F-744ff. |
| Z2 Planung (Architekt + Advisor) | ✅ | ✅ | Architekt `d6e26fb5` (codex, 75 s) ERFOLGREICH, Halt `KLAERUNG_ERFORDERLICH` mit 2 offenen Fragen in `entscheidungen_mensch[]`, menschliche Entscheidung 08:54:53Z. Advisor `9a0a68ac` (claude-code, 112 s) ERFOLGREICH. Jeder Schritt mit menschlicher `ZWINGEND`-Freigabe (`erzeuger 'mensch'`). |
| Z3 Bau + Kern-Prüfschritt | ✅ | ⚠️ → ✅ | Iteration 1 `7873df97` (410 s): nur Entwurf zurückgeschrieben (ADR 0004, Schema, `scripts/check-schemas.mjs`, Akte), kein Code → F-752/F-753/F-754 (#264); Kern-Prüfung `check:template` GRÜN. Iteration 2 `08c84cd7` (899 s): Code gebaut, VERWEIGERT → Sackgasse → F-760 (#265). Wiederholung `2f6509a1` (736 s): `npm run check` GRÜN, 17/17 Tests. Iteration 3 `630e4282` (552 s): HTTP-Server (127.0.0.1) + Oberfläche + ADR 0006, `npm run check` GRÜN, 25/25 Tests. Alle drei Bauläufe nach #264 enden VERWEIGERT (`bypass_verdacht_anzahl 0`, abgelehnte Probebefehle) → F-764. |
| Z4 Gesammelte Halte (F-718) | ✅ | ✅ | Workflow-Version 11 (Iteration 1): EIN Halt mit drei Gründen, Trenner ` \| ` — 1h (F-714 CLAUDE.md/ADR), 1h (F-735 `pruefketten_pfade`), 1j (F-713 `package.json` scripts). Version 22 (`2f6509a1`) und 29 (`630e4282`): F-760-Halt („Lauf endete VERWEIGERT (ohne Bypass-Verdacht) … menschliche Sichtung") + 1j gesammelt. Version 18 (`08c84cd7`, vor #265): nur „endete VERWEIGERT", keine Artefakte — die F-760-Sackgasse. |
| Z5 Urteil je AK (WS-2) | ✅ | ✅ | Alle drei Reviews (codex, `--output-schema ergebnis-code-reviewer`) liefern `ak_urteile` für AK1–AK3 mit Datei:Zeile-Beleg; der Review-Auftragstext trägt AK-Liste, Nicht-Ziele und Belegpflicht. `a00cf9d6` (52 s): `BLOCKIERT`, AK1–3 `NICHT_ERFUELLT` (nur beschrieben). `0efc9683` (66 s): `BLOCKIERT`, AK1–3 `NICHT_ERFUELLT` („nicht über die Anwendung bedienbar"). `0b95e8c2` (85 s): `BEREIT_NACH_KORREKTUR`, AK1–3 `ERFUELLT`, 2× MITTEL (Löschen zeigt 404/500 nicht an; Netzwerkfehler ohne Rückmeldung). |
| Z6 ADJUST-Automatik (WS-3) | ✅ | ⚠️ | Abnahme-Versionen 1 (09:22:56Z) und 2 (13:37:46Z): `ANPASSUNG_ANGEFORDERT`, `herkunft.erzeuger 'kern'`, Begründung „Automatische Anpassung (Iteration n von max. 3)" mit Befunden und verletzten AK. Danach jeweils `WARTET_FREIGABE` (Versionen 15, 26) — der Kern startet nie selbst, jede Folgeiteration braucht eine menschliche Freigabe (Freigaben 11:13:23Z, 13:21:18Z, 13:40:01Z). Inhaltlich: Review- und Ausführungstext stellen die Kern-Begründung als menschliche dar (`src/korrekturschleife/index.ts:50` „der Mensch hat … ‚Anpassung anfordern' gewählt", `:86` „Verbindliche Klarstellung … durch den Menschen"; im Review-Rohstrom `0efc9683`/`0b95e8c2` wörtlich); die Ausführung übernimmt das in ADR 0006 als „menschliche Abnahme-Entscheidung" → F-765 (Bezug F-757). |
| Abnahme F1 (haushaltsbuch2) | ✅ | ✅ | Abnahme-Version 3, 2026-09-28T14:03:05Z, `ANGENOMMEN`, `erzeuger 'mensch'`, Bezug Ausführung `630e4282` / Review `0b95e8c2`; die zwei MITTEL-Befunde als Nacharbeit, nicht AK-relevant. Commit `6fc21d0`. |
| Z7 Feature-Abnahme F35 | — | — | Offen, folgt nach Merge dieses Nachweises (F35 steht auf `FEATURE_GATE`, Abnahme durch Stefan). |

## Iterationen und Dauer je Lauf

Dauer = `run_prepared` → `terminal` aus den Lauf-Checkpoints.

| Lauf | Rolle | Worker | Start (UTC) | Dauer | Ergebnis |
| --- | --- | --- | --- | --- | --- |
| `router-…-1790376942377` | Router | codex | 25.09. 22:55:42 | 40 s | FEHLGESCHLAGEN |
| `router-…-1790378100861` | Router | codex | 25.09. 23:15:00 | 40 s | FEHLGESCHLAGEN |
| `router-…-1790584994316` | Router | codex | 28.09. 08:43:14 | 14 s | ERFOLGREICH |
| `d6e26fb5` | architekt | codex | 08:47:49 | 75 s | ERFOLGREICH |
| `9a0a68ac` | architecture-advisor | claude-code | 08:55:01 | 112 s | ERFOLGREICH |
| `7873df97` | ausfuehrung (It. 1) | claude-code | 09:06:08 | 410 s | ERFOLGREICH |
| `a00cf9d6` | code-reviewer | codex | 09:22:03 | 52 s | ERFOLGREICH, Urteil BLOCKIERT |
| `08c84cd7` | ausfuehrung (It. 2) | claude-code | 11:13:25 | 899 s | VERWEIGERT (Sackgasse, F-760) |
| `2f6509a1` | ausfuehrung (It. 2, Wdh.) | claude-code | 13:21:20 | 736 s | VERWEIGERT (Halt F-760 + 1j) |
| `0efc9683` | code-reviewer | codex | 13:36:40 | 66 s | ERFOLGREICH, Urteil BLOCKIERT |
| `630e4282` | ausfuehrung (It. 3) | claude-code | 13:40:02 | 552 s | VERWEIGERT (Halt F-760 + 1j) |
| `0b95e8c2` | code-reviewer | codex | 13:53:24 | 85 s | ERFOLGREICH, Urteil BEREIT_NACH_KORREKTUR |

Reine Laufzeit der erfolgreichen Kette am 28.09. (ohne die Sackgasse
`08c84cd7` und ohne Router-Fehlversuche): rund 35 Minuten; Wandzeit
Workflow-Anlage bis Abnahme 08:43:28Z–14:03:05Z inklusive zweier Fixpakete
(#264, #265) und menschlicher Sichtungen.

## Halte

| Workflow-Version | Status | Grund (gekürzt) |
| --- | --- | --- |
| 4 | KLAERUNG_ERFORDERLICH | Architektur-Entscheidung erforderlich, 2 offene Fragen (`d6e26fb5`). |
| 5, 8 | WARTET_FREIGABE | `ZWINGEND`-Freigabe für Advisor bzw. Ausführung. |
| 11 | KLAERUNG_ERFORDERLICH | 1h F-714 \| 1h F-735 \| 1j F-713 (`7873df97`). |
| 14 | KLAERUNG_ERFORDERLICH | Review `a00cf9d6` Urteil BLOCKIERT → ADJUST 1/3 (Kern). |
| 15 | WARTET_FREIGABE | Ausführung zurückgesetzt, wartet auf menschliche Freigabe. |
| 18 | KLAERUNG_ERFORDERLICH | „endete VERWEIGERT" (`08c84cd7`), ohne Artefakte — Sackgasse. |
| 22 | KLAERUNG_ERFORDERLICH | F-760 (abgelehnte Probebefehle) \| 1j F-713 (`2f6509a1`). |
| 25 | KLAERUNG_ERFORDERLICH | Review `0efc9683` Urteil BLOCKIERT → ADJUST 2/3 (Kern). |
| 26 | WARTET_FREIGABE | Ausführung zurückgesetzt, wartet auf menschliche Freigabe. |
| 29 | KLAERUNG_ERFORDERLICH | F-760 (`git status`/`find`) \| 1j F-713 (`630e4282`). |
| 32 | ABGESCHLOSSEN | Workflow durchgelaufen; Abnahme `ANGENOMMEN` 14:03:05Z. |

Die Fortsetzungen nach den Versionen 11, 18, 22 und 29 (Versionen 12, 19,
23, 30, Status `OFFEN`) liefen über Reparaturfassungen mit vollständigem
Workflow-JSON (F-768, Bezug F-653).

## Gefundene und behobene Fehler

| Finding | Ursache im Reallauf | Behoben |
| --- | --- | --- |
| F-752 | Ausführungs-Instruktion (Feature-Modus) verlangte nur das Zurückschreiben des Entwurfs; `7873df97` baute keinen Code. | #264 |
| F-753 | Stack-Entscheidungs-Instruktion nur im Projektmodus, Halt 1h aber modusunabhängig. | #264 |
| F-754 | Werkzeugsatz `schreibend` ohne Bash — kein `npm install`/Typecheck/Test möglich. | #264 (Allowlist E-F754) |
| F-760 | Vollständiger Bau endete VERWEIGERT ohne Änderungsübersicht/Prüfergebnis; Review unerreichbar. | #265 |

## Offene Findings aus diesem Lauf

F-762 (Race im Test-Nachlauf, rotes CI in #265), F-763 (Abnahme-Knöpfe
während `LAEUFT`), F-764 (Allowlist-Satz verhindert Probebefehle nicht),
F-765 (Kern-Entscheidung als menschliche dokumentiert), F-766
(Kontrollzustand von Fremdprojekten ungesichert), F-767 (AK ohne
Zugangsweg), F-768 (Fortsetzung nach Sichtung nur per JSON-Reparatur) —
`state/findings.md`.

## Beobachtung in der Oberfläche (Stefan, Screenshots Chat)

Stefan hat die UI-Teile der folgenden AK im Leitstand selbst gesehen und
per Screenshot im Chat belegt:

| AK | Datum | Beobachtung |
| --- | --- | --- |
| AK6 | 26.09.2026 | Knopf „Bauen“ auf haushaltsbuch2/F1 bedient; er legte Auftrag `8b138eac` an. |
| AK13 | 28.09.2026 | Die Abnahme-Ansicht zeigte die Tabelle „Urteil je Akzeptanzkriterium“ (AK · Urteil · Beleg) für Review `0b95e8c2`, AK1–AK3 `ERFUELLT`. |
| AK22 | 28.09.2026 | Hinweis „Automatisch angelegt – Iteration 1/3 – Start erfordert deine Freigabe“, später „Iteration 2/3“ sichtbar; Schritt `ausfuehrung` stand auf `OFFEN`, nicht gestartet. |

**Grenze:** Das ist eine menschliche Beobachtung, kein automatisierter
Render-Test. Es gibt keinen `render-nachweis`-Lauf mit Klicktabelle für F35;
F-622 bleibt für F35 eine bekannte Grenze.

## Kernaussage

Die F35-Kette trägt real: Auftrag aus Akte mit strukturierten AK, Routing
`hoch`, Urteil je AK mit Beleg, zwei automatische Anpassungen durch den
Kern ohne Selbststart, gesammelte Halte, abgenommenes Ergebnis mit grüner
Kern-Prüfung (25 Tests). Zwei Instruktions-/Pfadfehler (F-752–F-754, F-760)
wurden während des Laufs gefunden und behoben. Offen bleibt, dass jeder
Baulauf wegen Probebefehlen VERWEIGERT endet und menschliche Sichtung
braucht (F-764), und dass Kern-Entscheidungen in Texten als menschliche
erscheinen (F-765).
