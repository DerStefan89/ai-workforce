# F45 W2b-2 — Wegwerf-Ordner und Fristen — Plan v2

Stand 27.10.2026. Plan v1 `plan-w2b2.md` → Advisor `advisor-w2b2.md` „Freigegeben mit Hinweisen“ (A1–A5, kein Schnitt) →
diese Fassung. v1 bleibt; hier nur die Änderungen.

## Entscheidungen zu den Auflagen

- **A2 (zuerst):** Die ungetrackten `kontrollzustand/jarvis-jarvis-chat-*`-Ordner stammen aus echter Leitstand-Nutzung, nicht
  aus einem Gate. BELEGT: jeder Satz (Lauf, `lineage-auftrag/-kontextpaket/-laufakte-…`) gehört zu einem neuen Checkpoint in
  `kontrollzustand/lineage-chat-ai-workforce` (Nr. 127 am 18.10., 128 am 23.10.); jüngster Satz 23.10.2026 22:58, obwohl am
  27.10. mehrere volle Gate-Läufe liefen (W2a/W2b-1 Commit-Blöcke). Kein Umfang.
- **A1:** Beleg für das Herausnehmen der Repo-Baum-Läufer: (1) statisch `grep -rn kontrollzustand-test scripts src` ohne
  Code-Treffer (Kommentare, `.gitignore`-Netz und Projektregister-Einträge unter `os.tmpdir()` ausgenommen, einzeln
  begründet); (2) kein Gateway-/F8-Lauf mit dem Standard-Rohstromordner aus Gates — Suche nach Starts ohne
  `rohBasisVerzeichnis` in den Gates, die echte Gateways fahren; (3) im Commit-Block vor/nach `npm run check:gates`:
  Anzahl `kontrollzustand-roh/*`, Einträge in `kontrollzustand/`, `startvorlagen/`, Liste der Repo-Wurzel und
  `git status --porcelain --ignored` (Rohströme werden nie aufgeräumt, ein Standard-Schreiber fällt also auf). In der Sitzung
  zusätzlich derselbe Vergleich um jedes einzeln gelaufene geänderte Gate.
- **A3:** `schalteGitWartungAb(repo)` direkt nach jedem `git init` in Gates und Tests, ohne Bedingung (grep-prüfbar:
  jede `'init'`-Aufrufstelle hat in der Folgezeile den Helfer). `legeRepoAn()` in b2a3b behält seine `git config`-Aufrufe.
- **A4:** F-1230 → „umgesetzt, Beobachtung in CI“ (Ursache bleibt VERMUTET).
- **A5:** Fristen, die im Gate ablaufen SOLLEN (Timeout-/Abbruch-Rotfälle, z. B. `zeitgrenzeMs: 1500` in f14 oder ein
  absichtlich überschrittenes `pruefZeitgrenzeMs`), werden nicht skaliert. Risiken ergänzt: Temp-Pfade sind länger (MAX_PATH
  bei tiefen Kopien) — fällt beim Einzellauf auf; der Exit-Hook kann mit einem nicht tolerierten Fehlercode werfen und ein
  grünes Gate rot färben — laut, gewollt, im Kopf von `_wegwerf.ts` genannt.
- **Optional, nicht umgesetzt:** Regel in `check-rules` gegen das Literal (neue Gate-Aussage, eigenes kleines Paket) — als
  Finding P3 festgehalten. Eigener Commit für die git-Wartung entfällt: der Commit-Block hat eine Freigabe je Commit; der
  Diff bleibt über die Dateiliste im Bericht prüfbar.

## Unverändert aus v1

Helfer `scripts/_wegwerf.ts` (`wegwerfOrdner`, `schalteGitWartungAb`), mechanische Umstellung je Datei,
startvorlagen/Rohströme über `startvorlagePfad`/`rohBasisVerzeichnis` ohne Produktänderung, Fristen ≤ 10 s über
`skaliert`, SERIELL 23 → 16 (Frist-Gates und f3b1 bleiben), Messung und Doku wie v1.
