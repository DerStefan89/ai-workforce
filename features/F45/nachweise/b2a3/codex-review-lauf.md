# Nachweis F45 B2a-3a — echter Codex-Review-Lauf mit Schema v2 (Merge-Bedingung, 13.10.2026)

Hintergrund: F-638 — ein statisch passendes Ausgabeschema wurde von Codex real abgelehnt. Die Merge-Bedingung des Challengers
verlangt deshalb einen echten Lauf mit `ergebnis-code-reviewer` v2.

## Lauf (`codex-review-lauf.mjs`)

Eigene Leitstand-Instanz auf `LEITSTAND_PORT=4199` (danach beendet), `repoWurzel` = dieses Repo (Stand `f912773`),
Wegwerf-Kontrollzustand und Rohstrom in `%TEMP%` (nicht im Repo). Weg der Oberfläche: `POST /api/auftraege` → Workflow mit
genau einem Schritt `code-reviewer` aus `workflow-vorlagen/standard.json` (Worker codex, Modell `gpt-6-astra`, Werkzeugsatz
`lesend`, `output_schema: ergebnis-code-reviewer`, Freigabe AUTOMATISCH; ohne Eingaben aus einem Ausführungsschritt) →
`POST /api/workflows/<id>/starten`. Damit lief `baueCodexAufruf` mit `--output-schema schemas/ergebnis-code-reviewer.schema.json`
(v2) und der Review-Policy im Auftrag. Geprüft wurde ein kleiner echter Ausschnitt: `src/review-policy/index.ts` und
`review-policy.test.ts` aus Commit `f912773`.

| Größe | Wert |
|---|---|
| Lauf | `0960f9cc-7d6d-4fe9-a37e-843daded8dd8`, Schritt ERFOLGREICH, Workflow ABGESCHLOSSEN |
| Worker / Modell | codex / `gpt-6-astra` (deklariert), codex-cli 0.153.4 |
| Dauer | 86 s (Gateway 85,1 s) |
| Verbrauch (Laufakte) | 250 431 Eingabe-Tokens (davon 198 400 aus dem Cache), 1 558 Ausgabe-Tokens; Codex liefert keine Kosten in USD |
| Ausgabeschema im Argv | `schemas/ergebnis-code-reviewer.schema.json` (v2) |
| Codex-Ereignisse | `turn.completed`, kein `turn.failed`/`error`; stderr ohne Zeile zu Schema/invalid/error |
| Laufakte `review` | `{ "policy_version": "review-policy-1" }` |
| Laufakte `projektkarte` | Abschnitte vorhaben, qualitaet, bestand; eine Lücke (kein Basis-Commit, da der Ablauf ohne Ausführungsschritt startet) |

Dateien: `codex-review-lauf.json` (Laufakten-Auszug, Verbrauch, Ergebnis = letzte `agent_message`, Vertragsprüfung,
Abnahme-Projektion). Kein Rohstrom im Repo.

## Prüfpunkte der Merge-Bedingung

| Punkt | Ergebnis |
|---|---|
| Codex nimmt das Schema an (kein Schema-Fehler) | **ja** — Lauf ERFOLGREICH, `turn.completed`, kein HTTP-400/`invalid_json_schema` (anders als F-638) |
| Jeder Befund trägt `id`, `dimension`, `evidenz`, `korrekturrichtung` | **ja** — 1 Befund: `id` B1, `dimension` funktion, `evidenz` confirmed, `korrekturrichtung` gefüllt; Schwere MITTEL |
| Bei leerem Befund steht der Pflichtsatz | **nicht eingetreten** — der Lauf lieferte einen Befund. Der Fall ohne Befunde ist über Gate f45-b2a3 (e3/e4, HTTP-Pfad mit Attrappe) und die Unit-Tests belegt, nicht über einen echten Lauf |
| Laufakte trägt `review.policy_version` | **ja** — `review-policy-1` |
| Vertragsprüfung (`pruefeReviewErgebnisFuer`) | keine Halt-Gründe, keine Hinweise; Abnahme-Projektion `status ok`, `policy_version` gesetzt, `kontext_luecken` = die Basis-Commit-Lücke |

Wirkung der Policy im Ergebnis: `empfehlung` beginnt mit „Checkliste: 16 geprüft, 0 nicht erfüllt, 9 nicht anwendbar“, nennt
„UI- und Harness-Prozesspunkte sind nicht anwendbar“ (Vorrang Policy vor Karte), „vollständige Testsuiten wurden nicht
ausgeführt“ und „der historische Stand der Projektvorgaben vor dem Bau wurde nicht geprüft“ (Lücke als nicht geprüft benannt).
Der Beleg des Befunds ist ein gezielter Funktionsaufruf (§4 Ausnahme).

Inhalt des Befunds B1 (echt, gegen diese Änderung): `pruefeReviewErgebnis` meldet leere `fundstelle`, `zusammenfassung` und
`beleg` nicht — die Prüfung deckt nur die vier neuen Felder ab. Nicht behoben (nicht Teil der Merge-Bedingung), als
F-1085 (11) registriert.

## Nebenbefund des Gesamtlaufs

Der Test `scripts/leitstand/routen-code.test.mjs:356` („ohne Commits ein Leerzustand“) war im einen `npm run check` dieses
Pakets rot (gemeldet: „weder origin/main noch main vorhanden“, 13 s) und lief isoliert grün (12/12, 13.10.2026 17:14). Die
Datei ist von B2a-3a nicht berührt. Nicht weiter verfolgt (Challenger prüft in der Cloud).

## Ergebnis

Merge-Bedingung erfüllt: Codex akzeptiert Schema v2 im Strict-Modus, das Ergebnis trägt die v2-Felder, die Laufakte die
Policy-Version. Keine Code- oder Schemaänderung nötig.
