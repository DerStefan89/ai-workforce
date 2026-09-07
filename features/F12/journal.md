# Journal — F12

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-06 — Akte angelegt (Status READY_FOR_TECH)

`features/F12/feature.md` neu angelegt auf Grundlage der F12-Challenge
(06.09.2026, Repo-Stand `650451d`) und der beiden Stefan-Entscheidungen
vom selben Tag:

- **E-M2-3** — der geführte Start (Startformular im Leitstand) gehört
  in F12, nicht in einen Nachzügler-Workstream von F11. F11 bleibt
  abgeschlossen; F12 heißt „Bedienbarer Lauf: Auftrag, Liste, Detail".
- **E-M2-4** — ein Lauf wird seinem Auftrag über eine
  Lineage-Eingabe-Referenz `artefakt:auftrag-<auftragId>` zugeordnet,
  nach dem in F8 WS-2b real verwendeten `vorgaengerLaufId`-Muster. Der
  Auftrag ist ein `AUFTRAG_V0`-Kernartefakt; der Leitstand hält keine
  eigene Zuordnungswahrheit (§16.2). Löst F-134.

Zehn Akzeptanzkriterien (AK1–AK10), vier Workstreams
(WS-1 → WS-2 → WS-3 → WS-4), Blocker gegen den Doku-PR, der Meilenstein
2 um E-M2-3/E-M2-4 erweitert (analog F-129 bei F11). Fünf neue Findings
aus der Challenge ins Register aufgenommen (F-137 bis F-141), F-134 um
einen Nachtrag zur Auflösung durch E-M2-4/AK5 ergänzt.
