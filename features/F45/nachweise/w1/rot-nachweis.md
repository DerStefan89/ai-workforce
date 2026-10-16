# F45 W1 — Rot-Nachweis

Stand 16.10.2026, Branch `f45/w1-wachstumsbremse` (Basis main `3c46adf`). Plan `features/F45/plan-w1-v2.md` (B1 = a, L4, L7).
Kopien per `git archive -o <scratchpad>/w1/main.tar HEAD` (= main), entpackt nach `<scratchpad>/w1/{rein,repo,ohne-git}`; je
Fall bekommt eine Kopie das neue Gate und `scripts/wachstumsbremse-server.json` aus dem Arbeitsbaum, dann eine Änderung.
Treiber: `features/F45/nachweise/w1/rot-nachweis-w1.mjs <w1-ordner> <repo-wurzel> datei|repo` (kein Worktree, kein Eintrag im
Projekt-Repo, F-1127).

## 1 Gate gegen Kopien ohne git (Modus `datei`, nach der Korrekturrunde)

Erwartet: (a1)/(a3)/(b1)/(b3) rot, Grün-Fälle grün; (a2)/(b2) **grün mit Hinweis** — ohne Referenz nicht prüfbar (benannte
Grenze, Durchsetzungsgrad).

| Fall | Exit | Befund | Referenz |
|---|---|---|---|
| g0 Ausgangslage | 0 (wie erwartet) | — | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| a1 Server +1 Zeile | 1 (wie erwartet) | (a1) scripts/leitstand-server.mjs hat 13456 Zeilen, Grenze 13455 — neue Teile nach scripts/leitstand/<thema>.mjs; zum Ausgleich reine Helfer auslagern (ARCHITECTURE.md §1). | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| a3 Server -1 Zeile (Grenze nicht gesenkt) | 1 (wie erwartet) | (a3) scripts/leitstand-server.mjs hat 13454 Zeilen, Grenze 13455 — Grenze in scripts/wachstumsbremse-server.json auf 13454 senken (straffe Ratsche). | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| a2 Server +1 und Grenze +1 | 0 (ERWARTET 1) | — | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| b1 neue Route im Server (Leerzeile ersetzt) | 1 (wie erwartet) | (b1) neue Route im Server (gleich): /api/w1-probe — neue Routen in scripts/leitstand/routen-*.mjs. | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| b3 Route aus dem Server entfernt, Bestand nicht nachgezogen | 1 (wie erwartet) | (b3) Bestandseintrag ohne Route im Server (gleich): /api/verbrauch — aus scripts/wachstumsbremse-server.json entfernen (straffe Ratsche). | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| b2 Probe-Route in Server und Bestand | 0 (ERWARTET 1) | — | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| g1 Probe-Route nur in scripts/leitstand/routen-w1probe.mjs | 0 (wie erwartet) | — | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |
| g2 Route entfernt, Bestand und Grenze nachgezogen | 0 (wie erwartet) | — | Referenz nicht lesbar: kein git-Repo (oder git fehlt) — (a2)/(b2) nicht geprüft |

## 2 (a2)/(b2) mit echtem git — Challenger-Cloud-Prüfung nach Push

Entscheidung Stefan (16.10.2026, ersetzt B1 = a): kein Mini-Repo. Den Rot-Nachweis für (a2) „Grenze angehoben“ und (b2)
„Bestand erweitert“ mit echtem git macht der Challenger nach dem Push in seinem Cloud-Clone (echtes `origin/main`): je Fall
Grenze bzw. Bestand anheben und `node scripts/check-wachstumsbremse-server.mjs` ⇒ Exit 1 mit genau diesem Befund. Bis dahin
sind (a2)/(b2) nur auf Funktionsebene rot belegt (`scripts/check-wachstumsbremse-server.test.mjs`, injiziertes git). Seit W1
checkt die CI mit `fetch-depth: 0` aus (`.github/workflows/ci.yml`), das Gate prüft (a2)/(b2) dort gegen die merge-base mit
`origin/main`.

## 3 Echter Lauf im Projekt-Repo (vor dem Merge)

`node scripts/check-wachstumsbremse-server.mjs` auf dem Branch: Exit 0, Hinweis „Referenz nicht lesbar:
scripts/wachstumsbremse-server.json fehlt auf main (vor dem ersten Merge) — (a2)/(b2) nicht geprüft“ — belegt den
Toplevel-Vergleich unter Windows (qa TC-10; nicht „kein eigenes git-Repo“).

## 4 Kalibrierung F-1123 (18) gegen main

`src/auftrag/index.ts` vorübergehend durch den Stand von main ersetzt (`git show HEAD:src/auftrag/index.ts`), danach
zurückgelegt:

```
ℹ fail 2
ℹ pass 13
✖ F45 W1 (F-1123 (18)): ohne Vorgänger und ohne Bestand prüft die Regel wie bisher voll (2.3222ms)
✖ F45 W1 (F-1123 (18)): unveränderte Altwerte von bereiche/budget_tokens blockieren keine neue Version; geänderte werden voll geprüft (3.4042ms)
✗ 1 Befund(e):
  - (b13) — 500 {"grund":"Budget nicht gespeichert: Auftrag <id> verstößt gegen schemas/kontrollzustand-auftrag-payload.schema.json: 'bereiche[0]' ('src/*.ts') ist ein Muster — '*' nur als ganzer Eintrag oder am Ende (src/**); 'bereiche[1]' ('/etc/') ist absolut — erlaubt sind Pfade relativ zum Projekt, ohne Laufwerk oder führenden Schrägstrich"}; Auftrag {"budget_tokens":1000,"bereiche":["src/*.ts","/etc/"]}
```

Mit dem Bestandsschutz: beide Unit-Tests grün, (b13) grün (POST …/budget 200, Budget 2500, `bereiche` unverändert).
