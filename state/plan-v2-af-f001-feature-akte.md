# Plan v2 — AF-F001: Feature-Akte im Repo

Slug: af-f001-feature-akte
Stand: 2026-08-28
Rolle: Technical Challenger + Planner (Claude-Projektchat „AI Workforce")
Ersetzt: `state/plan-v1-af-f001-feature-akte.md` (bleibt unverändert stehen,
Findings dort dokumentiert in `state/advisor-findings-af-f001-feature-akte.md`).

**Repo-Stand bestätigt** (löst den Vorbehalt aus plan-v1 §9 Punkt 1 auf):
PR #13 gemerged (Commit `83be859`), ARCHITECTURE.md/CLAUDE.md/docs/STATUS.md
tragen reale Inhalte, kein Fund widerspricht ARCHITECTURE.md (entlastender
Befund, Advisor-Pass).

## 1. Ziel (prüfbar) — unverändert
Eine frische Claude-Code-Sitzung kann allein aus dem Repo benennen, was
ein Feature ist, was ausdrücklich nicht dazugehört und woran Fertigkeit
erkannt wird — ohne Zugriff auf das Claude-Projekt.

## 2. SCOPE

### 2.1 Dateien je Feature — geändert (Finding 1, 6)
- `features/<feature-id>/feature.md` — ID, Titel, Status, Ziel, Scope,
  Nicht-Ziele, Akzeptanzkriterien, Zuordnung (Meilenstein/Deliverable),
  Dependencies (hard/soft), Workstream-Liste, Entscheidungs-Referenzen,
  **Spec-Referenz** (Pfad nach `specs/<feature-id>/`, siehe 2.2).
- `features/<feature-id>/journal.md` — Anhängeprotokoll (Pass, Zeitpunkt,
  Ergebnis, Artefaktpfad).

**`spec.md` zieht NICHT nach `features/<id>/` um** (Abweichung von plan-v1,
Finding 1). Erzeugt weiterhin mit dem Skill `spec-schreiben`, Ablage
bleibt `specs/<feature-id>/` — deckt sich mit `state/memory-map.md`
("Spec: das WAS eines Vorhabens → `specs/`") und
`docs/guide/06-DER-PROZESS.md:52`. `feature.md` referenziert den Pfad,
kopiert ihn nicht (E-066, keine zweite Autorität).

### 2.2 Gate `scripts/check-feature.mjs` — geändert (Finding 2, 3, 4)
Nach dem Muster von `check-contract.mjs`. Verweigert
`Status: READY_FOR_TECH` bei fehlendem Ziel, fehlenden Nicht-Zielen,
fehlenden Akzeptanzkriterien oder fehlenden Dependencies — **genau diese
vier Prüfbedingungen**, nicht mehr (Workstream-Liste, Entscheidungs-
Referenzen, Zuordnung sind Pflichtfelder in 2.1, aber nicht Teil des
automatisierten Gates in dieser ersten Fassung — YAGNI, Erweiterung erst
bei belegtem Bedarf). Einhängen in `npm run check:template`.

### 2.3 Memory-Map & Status — unverändert
Zeile in `state/memory-map.md` (mit „nicht hierhin") + Eintrag in
`docs/STATUS.md`. Die bestehende `specs/`-Zeile bleibt unverändert
(kein Konflikt mehr, siehe 2.1).

### 2.4 Erste befüllte Akte — geändert (Finding 8)
`features/AF-F001/` wird mit **`Status: READY_FOR_TECH`** angelegt, damit
A1–A3 durch den tatsächlichen Gate-Lauf geprüft werden, nicht nur durch
Sichtprüfung.

## 3. NICHT (Non-Scope, mit Grund) — geändert (Finding 7)
- Execution Controller/Orchestrator — abhängig von allen anderen Modulen.
- Checkpoint Store, Artifact Registry — eigene Verträge.
- Human Transport, Leitstand — eigenes Feature.
- API-Anbindung ChatGPT — Backlog, kollidiert mit Fassung-1-Scope.
- Automatischer Rollenaufruf/Auto-Start — Orchestrierungsstufe 2+, Backlog.
- Änderungen an bestehenden Hooks/Guards — eigener Vertrag.
- Reparatur des `cwd`-Fehlers in `commit-guard.cjs` — eigener Vertrag.
- Befüllen von `ARCHITECTURE.md`/`CLAUDE.md` — bereits erledigt, bestätigt.

(Gestrichen gegenüber plan-v1: „Versionierte Prompt-Contracts" — kein
herstellbarer Bezug zum Feature-Akte-Scope, Finding 7.)

## 4. Ablageort `features/<id>/` — [EMPFEHLUNG], geändert (Finding 6)
Betrifft nach 2.1 nur noch `feature.md`/`journal.md`. Begründung
unverändert: die Akte trägt mehr als eine Spec (Status, Dependencies,
Workstreams), `specs/` bleibt laut Memory-Map auf „das WAS" begrenzt —
`spec.md` bleibt deshalb dort, kein Zielkonflikt mehr offen. Reversibel
per `git mv`.

## 5. Budget & Pässe — unverändert
Ein Baudurchgang plus höchstens eine Korrekturrunde. Advisor-Pass für
`check-feature.mjs` bereits erfolgt (dieser Plan ist das Ergebnis).
Handoff-Vertrag als nächster Schritt. Danach `code-reviewer`/`qa`.

## 6. Akzeptanzkriterien — geändert (Finding 2, 3, 4, 8)
- **A1** `features/AF-F001/feature.md` existiert; jede Pflichtüberschrift
  aus 2.1 ist als Markdown-Überschrift vorhanden (strukturell, per Gate
  automatisierbar — inhaltliche Vollständigkeit ist Sache des
  Advisor-/Review-Passes, nicht von A1).
- **A2** `node scripts/check-feature.mjs` liefert Exit 0 auf dem
  vollständigen Beispiel (`Status: READY_FOR_TECH`, alle vier
  Prüfbedingungen aus 2.2 erfüllt).
- **A3a** Exit 1 + benannter fehlender Abschnitt, wenn bei
  `Status: READY_FOR_TECH` das Ziel fehlt.
- **A3b** Exit 1 + benannter fehlender Abschnitt, wenn die Nicht-Ziele
  fehlen.
- **A3c** Exit 1 + benannter fehlender Abschnitt, wenn die
  Akzeptanzkriterien fehlen.
- **A3d** Exit 1 + benannter fehlender Abschnitt, wenn die Dependencies
  fehlen.
- **A3e** Exit 1, Meldung „Status fehlt oder unbekannt", wenn `feature.md`
  kein `Status:`-Feld hat oder ein Wert außerhalb der gültigen Menge
  (`ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT,
  FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN`) steht.
- **A4a** Exit 0, Meldung „ⓘ kein Feature-Verzeichnis, nichts zu prüfen",
  wenn `features/` nicht existiert (analog `check-contract.mjs:26-29`).
- **A4b** Exit 0, Meldung „ⓘ 0 Akten geprüft", wenn `features/` existiert,
  aber leer ist (analog `check-contract.mjs:35-38`).
- **A5** `npm run check:template` ruft `check-feature.mjs` auf, grün.
- **A6** `npm run check` grün (inkl. Doku-Gate, keine toten Verweise).
- **A7** `state/memory-map.md` enthält Zeile „Feature-Akte →
  `features/<id>/feature.md`" mit „nicht hierhin".
- **A8** (Hauptkriterium) Eine frische Claude-Code-Sitzung kann allein aus
  `features/AF-F001/feature.md` benennen, was das Feature ist, was nicht
  dazugehört und woran Fertigkeit erkannt wird — ohne Claude-Projekt-
  Zugriff.

## 7. Rollen — unverändert
| Position | Träger | Rechte |
|---|---|---|
| Executor | Claude-Code-Sitzung, frisch, kennt nur Repo + Vertragsvolltext | voll im freigegebenen Pfad |
| Reviewer | Subagenten `code-reviewer`, `qa`, frisch | read-only |
| Mensch (Stefan) | — | Freigaben, Release, echte Abzweigungen |

## 8. Nächste Schritte
Handoff-Vertrag → `state/tasks/af-f001-feature-akte.md`, SCHRITT 0
wörtlich, 7 Pflichtsektionen, ESCALATE-Sektion inkl. Fall
„Kalibrierungs-Rot-Fall reproduziert nicht" (F-004).

## 9. Offene Punkte — Status
1. ~~Repo-Stand nicht gegengeprüft~~ — erledigt, siehe Kopf dieses Plans.
2. ~~Reihenfolge AF-F001 vor Feature 0/1~~ — erledigt, bereits Fakt in
   `docs/projekt/umsetzungsplan-fassung-1.md:192-196` (Finding 5).
3. Nachtrag „Findings-Visualisierung im Leitstand" — weiterhin Stefans
   Sache, `docs/projekt/*`-Änderung, nicht Teil dieses Plans, keine Eile.
