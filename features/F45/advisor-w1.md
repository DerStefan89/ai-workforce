# F45 W1 — Advisor-Pass zu Plan v1 (`features/F45/plan-w1.md`)

Subagent `architecture-advisor`, frischer Kontext, 16.10.2026, Branch `f45/w1-wachstumsbremse` (= main `3c46adf`).
Rollengrenze: nur Read/Grep/Glob. Nicht ausgeführt: `npm run check`/tsc/Biome/node:test; `git show`/`merge-base`/`archive`
und Stand von `origin/main`; Zeilenzahl per `wc` (über Read: letzte Zeile 13455, endet mit Umbruch); commit-guard im
Live-Lauf (nur Quelltext); `process.kill(pid, 0)` unter Windows, Dirent bei Junctions, `mkdtemp`-Zeichenvorrat,
`rmSync`-Wartezeiten; Binär-Pipes in PowerShell; Cloud-Clone des Challengers.

Geprüft gegen: ARCHITECTURE.md §1/§2/§7/§8; scripts/leitstand-server.mjs (:869, :1022, :2361, :6189-6204, :8347-8389, :8777,
:9583, :9637-9666, :9675, :9694, :10477, :10667, :11457-11587, :12951, :13250-13279, Ende :13455); src/auftrag/index.ts,
src/lineage-registry/index.ts (:166-199), src/checkpoint-store/index.ts (:655-675), src/budget/index.ts (:103);
scripts/neutrale-umgebung{,-starten,.test}.mjs, check-f45-b2b3e1-pfade.mjs, check-f45-b2b3c-budget.mjs, check-f46-bestand.mjs,
check-git-starter.mjs, check-f15-workflow.mjs (:3285-3326); scripts/leitstand/routen-*.mjs; .claude/hooks/commit-guard.cjs;
state/findings.md (F-371, F-509, F-1123, F-1125, F-1127, F-1128); features/F45/advisor-b2b3e2-delta.md, plan-b2b3e2-v2.md;
docs/projekt/fixpaket-f45.md; package.json.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit].

## A. Vor Baubeginn klären (Teil 1 Gate)

**B1 — HOCH (Nachweis): Rot-Nachweis (a2)/(b2) scheitert wie beschrieben an commit-guard.** [Fakt] Plan verlangt in der Kopie
`git init` + Commit; commit-guard verweigert jeden Befehl mit `git` und `commit` als Wörtern, repo-unabhängig
(commit-guard.cjs:54-58, :567-589), Freigabe-Datei relativ zum cwd (:577-578), Modell darf sie nicht anlegen (:82-89).
[Fakt] `git archive HEAD` = main ohne Gate/JSON — beide müssen vor dem Commit in die Kopie. [Schlussfolgerung] Umgehen per
Plumbing wäre Aushebeln der Sicherheitsarchitektur. Optionen: (a) Stefan führt die zwei Git-Befehle im Mini-Repo aus;
(b) (a2)/(b2) nur auf Funktionsebene rot (Unit-Tests), echter Git-Weg nach dem Merge am ersten Folgebranch, Lücke im
Nachweis; (c) injizierbare Referenzquelle (neue Stellschraube, Delta-Pass). Empfehlung (a) oder (b).

**B2 — MITTEL: Regel (b) vs. ARCHITECTURE §1 / F-228.** [Fakt] ARCHITECTURE.md:32 „Was schreibt, bleibt im Server (Zählung der
Workflow-Schreiber, F-228)“; F-228-Gate zählt 14 Schreiber nur im Server (check-f15-workflow.mjs:3323); `starteWorkflowSchritt(`
6× in mindestens vier Gates (b2b3c:590, b2b3d:258, b2b3b1:514, b2b3e1:265). [Schlussfolgerung] Eine neue schreibende Route kann
nach W1 nicht in `routen-*.mjs` liegen, ohne F-228 zu brechen; B2b-4 ist so ein Fall [Annahme]. Vor dem Bau festlegen (z. B.
Dispatch im Modul, Schreibaufruf als Rückruf aus dem Server). [Fakt] Die neue Regel samt Durchsetzungsgrad gehört nach
ARCHITECTURE.md (§8:181); Vokabular: ERZWUNGEN für Zeilen und Literal-Dispatch an `pfad`, DEKLARIERT für den Rest.

**B3 — MITTEL: Folgen für die nächsten Pakete.** [Fakt] B2b-3b-2 hat Pflichtpunkte im Server (F-1128 (2)(3), CLI-Bindeblock,
fixpaket :99). [Schlussfolgerung] Mit Grenze = Ist muss jede Server-Zeile vor W2 durch Kürzen bezahlt werden — praktisch
Auslagern, was W1 als Umbau ausschließt. Ein Modulaufruf kostet mehr als eine Zeile (Kontextobjekt aus Closures). Stefan
entscheidet, ob Folgepakete durch Auslagern reiner Helfer bezahlen dürfen (Kandidat `pruefeAuftragsformular` :1807-1839
[Annahme]); gehört in die Reihenfolge-Zeile fixpaket §3.

**B4 — MITTEL: `erhebeRouten` übersieht/überfasst.** [Fakt] 5 Regex-Dispatches `.exec(pfad)` (:8355, :8386, :9583, :9675, :9694),
die jüngsten Routen nutzen sie ⇒ vierte Art „muster“ (Regex-Literale vor `.(exec|test)(pfad)`). [Fakt] `pfad === '…'` trifft
fremde Felder (`'string'` :869, :1022, :2361) ⇒ nur Literale mit `/`. [Fakt] Kommentar :8777 wird mitgezählt ⇒ Kommentare
entfernen oder Grenze benennen. [offene Unsicherheit] 38 statt 39 `===`-Routenliterale. Grenzen benennen: Kombination
vorhandener Literale, neue Methode auf bestehendem Pfad, Multi-Projekt-Dispatcher `url.pathname.match` (:13258).

**B5 — MITTEL: Unit-Test „Erhebung = Bestand“ widerspricht „Bestand darf schrumpfen“** — straffe Ratsche durch die Hintertür.
Offener Punkt 1 für Zeilen und Routen gleich entscheiden; sonst Test nur „Server ⊆ Bestand“.

## B. Läuft mit

- **L1** Referenz: `git merge-base HEAD origin/main` [Annahme], Toplevel-Prüfung (`git rev-parse --show-toplevel` = Wurzel,
  sonst `null`); Rückfall im Cloud-Clone in den Durchsetzungsgrad; ggf. lokales `main` als zweiter Rückfall.
- **L2** Lokale JSON fehlt/kaputt/Schlüssel fehlen ⇒ rot, nicht `null`.
- **L3** Aufräumen: (a) `statSync`-Fehler ⇒ Warnung, überspringen; (b) Starter: `exit`-Handler zuerst, Markieren/Aufräumen
  danach in `try`; (c) ohne gültige `pid` nur löschen, wenn `home/` und `temp/` vorhanden; (d) Quelltextprüfung der
  Starter-Reihenfolge (Vorbild (a1) plan-b2b3e2-v2.md:140-142); (e) [Annahme] Teil-Löschen kann `pid` entfernen/mtime
  zurücksetzen (24 h Verzögerung); `rmSync`-Wiederholungen verzögern den Start.
- **L4** F-1123 (18): Test „gleiche bereiche, andere Reihenfolge ⇒ voll geprüft“; (b13) und Unit-Tests rot gegen main
  kalibrieren; `erhoehtesBudget` > MAX_SAFE bleibt 500 (Randfall benennen); Alternative ohne I/O über `optionenAusAuftrag`
  vertretbar, Plan-Weg (Wahrheit von der Platte) ebenso.
- **L5** Doku: (R1)–(R8) in F-1125 neu verorten; „F-1123 P3 → P2“ und „(18) erledigt“ in einem Zug begründen.
- **L6** Invariante (i) wäre die fünfte Kopie — weglassen oder begründen.
- **L7** `git archive -o <scratch>/main.tar HEAD` + `tar -xf` statt Pipe; „ohne Platte“ im Testwortlaut angleichen.

## C. Entlastend

1. Server bleibt unberührt: alle drei Schreibwege laden die letzte Version und reichen `optionenAusAuftrag` durch (:6194→:6199,
   :11487→:11503, :11554→:11578).
2. Neue Aufträge mit `randomUUID` (:9654, routen-f35.mjs:102) — kein Vorgänger, POST unverändert voll geprüft.
3. `validiereAuftragDaten` nur beim Schreiben und in Beispiel-Gates (check-f11-auftrag.mjs:93, check-f45-b2a2-arbeitspaket.mjs:86)
   — optionaler zweiter Parameter kompatibel.
4. 4xx bräuchte Server-Zeilen (:11504-11507, :11579-11582) — Bestandsschutz ist der einzige Weg ohne Zuwachs.
5. Delta-Auflagen 1–3 vollständig übernommen; `node:path` im Starter erlaubt (check-f45-b2b3e1-pfade.mjs:189-197); eigenes `istTot`
   statt `pidLebt` richtig.
6. Messwerte stimmen: 13 455 Zeilen, 6× `starteWorkflowSchritt(`, 8 startsWith-, 14 endsWith-Literale.
7. Gates fallen nicht unter das Git-Starter-Gate (check-git-starter.mjs:17-19).
8. Exportmuster check-f46-bestand.mjs:92 passt, auch in einer Kopie.
9. Kein `routen-*.mjs` dispatcht heute; Grün-Fall `routen-w1probe.mjs` ist trivial grün (Gate liest keine Module).
10. F-1129/F-1130 frei; package.json nur Gate-Zeile; Rückfrage-Kanal unberührt.

## D. Offene Punkte 1–6

1. straff für Zeilen und Routen (Empfehlung), jedenfalls gleich (B5) — Stefan. 2. `merge-base` + Toplevel, Rückfall sichtbar.
3. `.exec/.test(pfad)` als vierte Art, nur `/`-Literale; nicht auf alle `'/api/…'` ausweiten. 4. kein Hook in W1, aber
Bezahlung/F-228 festlegen (B2, B3). 5. Bestandsschutz. 6. siehe E.

## E. Zuschnitt

Anders, aber nicht in drei Aufträge: drei getrennt stagebare Commits Teil 3 → Teil 2 → Teil 1 + Doku. Kann Stefan B1–B3 nicht
vor Baubeginn entscheiden, Gate als W1b abtrennen. Mit Gate ≈ 12–13 Dateien + ARCHITECTURE.md innerhalb der Heuristik.

## Urteil

**Freigegeben mit Auflagen** — B1–B5 vor Baubeginn für Teil 1; Teile 2 und 3 mit L3/L4 freigegeben.

## Nächster sinnvoller Schritt

Stefan entscheidet B1 (Option a/b), B2/B3 (schreibende Routen, Bezahlung der Zeilen für B2b-3b-2/B2b-4), Offener Punkt 1
(straff/locker, gleich für beide). Danach Plan v2 mit B4/B5, L1–L3 und ARCHITECTURE-Zeile; weiterer Pass nur bei B1 (c) oder
Sammel-Hook. Bau in der Reihenfolge Teil 3 → Teil 2 → Teil 1.
