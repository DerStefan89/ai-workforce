# Plan v1 — AF-F001: Feature-Akte im Repo

Slug: af-f001-feature-akte
Stand: 2026-08-28
Rolle: Technical Challenger + Planner (Claude-Projektchat „AI Workforce")
Grundlage: Handoff AF-F001 (v2), Challenge AF-F001. Akzeptanzkriterien
unverändert aus dem ursprünglichen Handoff, Abschnitt 12.

**Hinweis zur Verlässlichkeit:** Der Repo-Stand aus dem Handoff (PR #13
gemerged, ARCHITECTURE.md/CLAUDE.md/docs/STATUS.md befüllt) war zum
Zeitpunkt dieser Planung durch die Planungsrolle NICHT gegengeprüft
(Sync-Problem im Claude-Projekt). Verifikation ist Schritt A des
Bauauftrags, der diese Datei erzeugt hat — dessen Ergebnis muss grün
sein, bevor der Advisor-Pass beginnt.

## 1. Ziel (prüfbar)
Eine frische Claude-Code-Sitzung kann allein aus dem Repo benennen, was
ein Feature ist, was ausdrücklich nicht dazugehört und woran Fertigkeit
erkannt wird — ohne Zugriff auf das Claude-Projekt.

## 2. SCOPE
1. Konvention `features/<feature-id>/` mit drei Dateien:
   - `feature.md`: ID, Titel, Status, Ziel, Scope, Nicht-Ziele,
     Akzeptanzkriterien, Zuordnung (Meilenstein/Deliverable),
     Dependencies (hard/soft), Workstream-Liste, Entscheidungs-Referenzen.
   - `spec.md`: erzeugt mit dem bestehenden Skill `spec-schreiben`.
   - `journal.md`: Anhängeprotokoll (Pass, Zeitpunkt, Ergebnis,
     Artefaktpfad).
2. `scripts/check-feature.mjs` — Gate nach dem Muster von
   `check-contract.mjs`. Verweigert `Status: READY_FOR_TECH` bei
   fehlendem Ziel/Nicht-Zielen/Akzeptanzkriterien/Dependencies. Einhängen
   in `npm run check:template`.
3. Zeile in `state/memory-map.md` (mit „nicht hierhin") + Eintrag in
   `docs/STATUS.md`.
4. `features/AF-F001/` als erste befüllte Akte (die Akte beweist sich an
   sich selbst).

## 3. NICHT (Non-Scope, mit Grund)
- Execution Controller/Orchestrator — abhängig von allen anderen Modulen,
  eigenes Feature.
- Checkpoint Store, Artifact Registry — eigene Verträge.
- Human Transport, Leitstand — eigenes Feature.
- API-Anbindung ChatGPT — Backlog, kollidiert mit Fassung-1-Scope
  (nur manueller Kopierblock-Workflow zulässig).
- Automatischer Rollenaufruf/Auto-Start — Orchestrierungsstufe 2+,
  Backlog (Fassung 1 = Stufe 1, Mensch wählt jeden Schritt).
- Versionierte Prompt-Contracts — YAGNI, erst bei zweitem konkreten
  Bedarf.
- Änderungen an bestehenden Hooks/Guards — eigener Vertrag, andere
  Vertrauensgrenze.
- Reparatur des `cwd`-Fehlers in `commit-guard.cjs` — bekannt
  (Assumption-Ledger), eigener Vertrag.
- Befüllen von `ARCHITECTURE.md`/`CLAUDE.md` — laut Handoff bereits
  erledigt; siehe Verifikations-Hinweis oben, nicht Teil dieses Plans.

## 4. Ablageort — [EMPFEHLUNG]
`features/<id>/`, nicht `specs/<id>/`. Begründung: die Akte trägt mehr
als eine Spec (Status, Dependencies, Workstreams); `specs/` ist laut
Memory-Map-Doktrin auf „das WAS" begrenzt. Reversibel per `git mv`. Zu
verwerfen, sobald ein echter Konflikt mit `specs/` auftritt.

## 5. Budget & Pässe
- Ein Baudurchgang plus höchstens eine Korrekturrunde.
- Advisor-Pass ist fällig (neues blockierendes Gate: `check-feature.mjs`)
  — Subagent `architecture-advisor`, frischer Kontext, `Read/Grep/Glob`,
  ohne Vorab-Begründung, warum der Plan gut ist.
- Danach `code-reviewer` und `qa`, read-only.
- Rework-Regel: Gate 1 rot → eine Korrekturrunde → Gate 2. Zweites Rot
  ⇒ BLOCKIERT ⇒ Mensch.

## 6. Akzeptanzkriterien
- **A1** `features/AF-F001/feature.md` existiert, alle Pflichtabschnitte
  vorhanden.
- **A2** `node scripts/check-feature.mjs` liefert Exit 0 auf dem
  vollständigen Beispiel.
- **A3** Exit 1 + benannter fehlender Abschnitt, wenn
  `Status: READY_FOR_TECH` ohne Akzeptanzkriterien gesetzt ist.
- **A4** Exit 0 mit Hinweis „0 Akten geprüft", wenn `features/` fehlt.
- **A5** `npm run check:template` ruft `check-feature.mjs` auf und ist
  grün.
- **A6** `npm run check` ist grün (inkl. Doku-Gate — keine toten
  Verweise durch die neuen Dateien).
- **A7** `state/memory-map.md` enthält die Zeile „Feature-Akte →
  `features/<id>/feature.md`" mit „nicht hierhin"-Spalte.
- **A8** (Hauptkriterium) Eine frische Claude-Code-Sitzung kann allein
  aus `features/AF-F001/feature.md` benennen, was das Feature ist, was
  nicht dazugehört und woran Fertigkeit erkannt wird — ohne Zugriff auf
  das Claude-Projekt.

A1–A7 sind Mechanik, A8 ist das eigentliche Kriterium.

## 7. Rollen für diesen Workstream
| Position | Träger | Rechte |
|---|---|---|
| Advisor | Subagent `architecture-advisor`, frisch | `Read, Grep, Glob` |
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Release, echte Abzweigungen |

## 8. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)
1. Advisor-Pass auf diese Datei.
2. Findings → `state/advisor-findings-af-f001-feature-akte.md`.
3. `plan-v2-af-f001-feature-akte.md` als neue Datei — `plan-v1` bleibt
   unverändert stehen.
4. Handoff-Vertrag → `state/tasks/af-f001-feature-akte.md`, SCHRITT 0
   wörtlich, 7 Pflichtsektionen, ESCALATE-Sektion inkl. Fall
   „Kalibrierungs-Rot-Fall reproduziert nicht".

## 9. Offene Punkte — NICHT stillschweigend entschieden
1. Repo-Stand (PR #13, Befüllung ARCHITECTURE.md/CLAUDE.md/docs/STATUS.md)
   ist durch die Planungsrolle nicht gegengeprüft — abhängig vom Ergebnis
   aus Schritt A dieses Bauauftrags.
2. Reihenfolge AF-F001 vor Feature 0/1 des Umsetzungsplans — dem
   Menschen zur Bestätigung vorgelegt (siehe Chat), nicht selbst
   entschieden.
3. Nachtrag „Findings-Visualisierung im Leitstand" — Zeitpunkt und
   Wortlaut liegt bei Stefan, ist eine `docs/projekt/*`-Änderung, nicht
   Teil dieses Plans.
