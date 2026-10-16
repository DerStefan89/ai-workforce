# F45 B2b-3e — Advisor-Pass zu Plan v1 (`features/F45/plan-b2b3e.md`)

Subagent `architecture-advisor`, frischer Kontext, 16.10.2026. Rollengrenze: nur Read/Grep/Glob, kein tsc, Biome, node,
Playwright oder git. Nicht ausgeführt, nur erschlossen: ob tsc (TS 7.0.2) die `.d.ts` findet, wie `os.homedir()`/`os.tmpdir()`
auf Umgebungsvariablen reagieren, wo Playwright Browser sucht, ob die Gates gegen main rot laufen. Kontrollzustand anderer
Projekte nicht gesehen.

Geprüft gegen: ARCHITECTURE.md (§1, §2, §4, §7), CLAUDE.md, state/findings.md (F-1122, F-1123, F-1125, F-1128),
plan-b2b3d.md, plan-b2b3d-v2.md, tsconfig.json, biome.json, package.json, src/auftrag/index.ts, src/umfang/index.ts,
src/budget/index.ts, schemas/kontrollzustand-auftrag-payload.schema.json, scripts/leitstand-server.mjs (Ausschnitte),
scripts/leitstand/routen-code.mjs, public/leitstand/arbeitspaket-felder.js (+test), views/projekt.js,
views/auftrag-umgebung.js, views/workflow-abnahme.js, code-stand.js, style.css (~7630), i18n (de/en/ru/tr),
scripts/render-nachweis.mjs, features/F45/nachweise/*/instanz.mjs, b2b3d/render/erzeuge-nachweis.mjs, Kontrollzustand
(Grep `bereiche`).

Marker: [Fakt] belegt · [Fakt, entlastend] geprüft, in Ordnung · [Schlussfolgerung] abgeleitet · [Annahme] unbelegt ·
[offene Unsicherheit] nur durch einen Lauf klärbar.

## Befunde

1. **HOCH — Zuschnitt und Reihenfolge.** [Fakt] Formular-Nachweise rendern `#/projekt` als ganze Seite
   (b2b3d/render/erzeuge-nachweis.mjs:58-63); die rechte Spalte zeigt `absoluterPfad` (views/auftrag-umgebung.js:197), die
   Instanz legt ihn unter `tmpdir()` an (b2b3d/instanz.mjs:29). [Schlussfolgerung] Neue Bilder brauchen F-1125 fertig — der
   Rückfall-Schnitt in §8 („F-1125 als B2b-3e-2“) ist falsch herum. Umfang ≈ 35 Dateien, drei Themen, Gate mit 9 Fällen,
   4 Sprachen, ≈ 9 Bilder, 13 Instanzen; ein Baudurchgang plus eine Korrekturrunde ist nicht realistisch.
2. **MITTEL–HOCH — Offener Punkt 1, Variante (a).** [Fakt, entlastend] Technisch trägt (a): kein `allowJs`, importierte
   `.d.ts` wird einbezogen (tsconfig.json:16); Biome prüft `public/**/*.js` (biome.json:4); Node lädt zur Laufzeit das `.js`;
   arbeitspaket-felder.js hat keine Importe. [Fakt, entlastend] §7 verbietet es nicht, kein Gate verbietet es.
   [Fakt] Spannung zu §1 („`src/` … Einziger Produktpfad“). [Fakt] Präzedenz `cdZeile` passt nicht (Import aus `.mjs` in
   `scripts/`, leitstand-server.mjs:536, ohne Typprüfung); kein `.ts` in src importiert heute `.js` aus public.
   [Fakt] Variante (b) ist eingeführtes Muster (check-f34-product-coach.mjs:24, :626-665, :925-1048). [Fakt] `skipLibCheck`
   (tsconfig.json:14): die `.d.ts` bleibt ungeprüft. [Annahme] TS 7 löst `./x.js` → `x.d.ts` auf.
3. **MITTEL — Regel unscharf.** [Fakt] Server trimmt nicht (src/auftrag/index.ts:218), Abgleich trimmt (src/umfang/index.ts:39)
   ⇒ `' /etc/'` gälte nicht als absolut. [Fakt] Formular nimmt heute `src\**` an (arbeitspaket-felder.js:32); der Plan nennt
   nur `/**`, `/*` ⇒ Rückschritt.
4. **MITTEL — Rot-Nachweis je Fall.** [Schlussfolgerung] Statische Importe neuer Exporte/Module brechen das Gate gegen den
   main-Abzug beim Laden ab ⇒ kein Rot je Fall. [Fakt] (i) und POST-(b1) sind auf main schon grün (leitstand-server.mjs:1837,
   :9660) — Invarianten.
5. **MITTEL — Gate (p3) mit Seiteneffekt.** [Schlussfolgerung] (p3) liefe nur mit `C:\aiw-nachweis` ⇒ jedes `npm run check`
   legt Ordner im Laufwerks-Stamm an.
6. **NIEDRIG–MITTEL — alte Instanzen / render-nachweis.mjs.** [Fakt] Glob übersieht `f2b2/render/instanz.mjs`,
   `f2a/instanz-erneut.mjs`; f3a2 setzt `repoWurzel: INSTALL` (f3a2/instanz.mjs:33). [Schlussfolgerung] neutrales HOME ändert
   die Szenarien von f3a2/f3b1/f3b2 (Plugins über `homedir()`, leitstand-server.mjs:6321, routen-plugins.mjs:87).
   [Fakt] render-nachweis.mjs ruft weder `tmpdir()` noch `homedir()` (Z. 122-124). [Annahme] posix: anderes HOME verschiebt
   `~/.cache/ms-playwright`.
7. **NIEDRIG–MITTEL — Offener Punkt 2 unvollständig.** [Fakt, entlastend] `validiereAuftragDaten` nur beim Schreiben
   (src/auftrag/index.ts:105); 0 `bereiche`-Einträge im Kontrollzustand. [Fakt] Betroffen auch die automatische Übernahme der
   Einrichtung im Nachlauf des Architekten (leitstand-server.mjs:6199) ⇒ Bau gesperrt; kein Änderungsweg für `bereiche`;
   Schema-Beschreibung (schema:40-46) nicht angepasst.
8. **NIEDRIG — Offener Punkt 3.** [Fakt] `baueCodeProjektion` hat drei Rückgabewege (routen-code.mjs:594, :598, :607);
   Dateikopf Z. 8-18 zu ergänzen; „Kontextbudget · Standardbudget“ steht schon in der Ansicht (auftrag-umgebung.js:278).
   [Schlussfolgerung] Platzhalter mit Zahlen wird bei 390 px abgeschnitten. [Fakt, entlastend] kein neuer Abruf nötig.
9. **NIEDRIG — zwei Endungs-Schleifen** (`pruefeBereich` vs. `normalisiereBereich`, src/umfang/index.ts:51-62).
10. **NIEDRIG — Pfadprobe.** [Fakt] `texte`/`Zwischenablage` landen ungeprüft im Protokoll (render-nachweis.mjs:151-153,
    :354-374); „Pfad kopieren“ schreibt `absoluterPfad`. [Schlussfolgerung] `/g`-Regex auf Modulebene behält `lastIndex`.
11. **Hinweise.** Grund-Code `steuerzeichen` (Vorbild `pruefeDiffPfad`, routen-code.mjs:295); `MAX_SAFE_INTEGER`; ru-Plural für
    „… und n weitere“; Platzhalter braucht Abo auf `code-stand`; (15) per nachgestellter Antwort erledigt F-1123 (6) nicht.

Entlastend außerdem: Server-Teil des Budgets gebaut (leitstand-server.mjs:1837-1847); Codes statt Texte in der Regel sauber
getrennt; Importreihenfolge entscheidend und tragfähig (src/faehigkeiten/index.ts:36, src/ressourcen/skill-installation.ts:117
rechnen Pfade beim Laden); alte Instanzen setzen lokale git-Identität; Groß/Klein bleibt unterschieden (plan-b2b3d.md:21);
Schema-Beispiel bleibt gültig; CSS-Selektor (15) passt (style.css:7632); `auftrag.bereiche.fehler` sicher entfernbar.

## Urteil

**Nicht freigegeben** — nur wegen Zuschnitt (1) und weil Offener Punkt 1 eine Architekturentscheidung Stefans ist.

Vor Baubeginn:
- **A1 Zuschnitt:** 3e-1 = F-1125 (neutrale Umgebung als reine, testbare Funktion, `render-pfadprobe`, DOM-Probe plus
  Protokoll-Prüfung, Gate p1–p3); 3e-2 = Regel, Budget-Feld, Formular-Reste mit Render-Nachweis, abhängig von 3e-1 (CONTEXT).
- **A2 Offener Punkt 1 — Stefan entscheidet** (a) oder (b). Bei (a): importfreies eigenes Modul (oder Gate „keine Imports“),
  `npm run typecheck` grün und rot ohne `.d.ts` als erster Bauschritt, Risiko `skipLibCheck`, Satz in ARCHITECTURE §1.
  Bei (b): Muster check-f34 (i)/(q).
- **A3** trimmen vor allen Prüfungen, `\`-Endungen wie `/`; Fall-Tabelle mit `' /etc/'`, `src\**`, `src\**\`, `src/**/`,
  `Src/` + `src/`.
- **A4** neue Exporte/Module im Gate je Fall dynamisch laden; (i) und POST-(b1) als Invarianten.
- **A5** (p3): darf `npm run check` `C:\aiw-nachweis` anlegen? Sonst reine Funktion prüfen, Ordner nur beim echten Start.

In Plan v2 der jeweiligen Teil-Iteration: A6 alte Instanzen nicht anfassen, neutraler Import nur in neuen Instanzen, (p2) mit
genauer Dateimenge ab b2b3e, kein Import in render-nachweis.mjs · A7 Probe prüft auch Protokollzeilen, kein `/g`-Zustand ·
A8 Offener Punkt 2 vollständig im Risiko, Schema-Beschreibung anpassen · A9 bei Feld in GET …/code: alle drei Rückgabewege
bzw. Server-Wrapper (leitstand-server.mjs:8535), Dateikopf, Gate (b2) ohne Git-Repo, Zahlen in den Hinweis statt Platzhalter,
Abgrenzung zu „Kontextbudget“; sonst Platzhalter ohne Zahlen · A10 Gate-Fall bindet Regel und Abgleich.

Zuschnitt: so zu groß, Rückfall-Reihenfolge falsch herum; nach A1 je ein Baudurchgang plus höchstens eine Korrekturrunde.

## Nächster sinnvoller Schritt

Anhalten (F-1124). Stefan entscheidet Schnitt A1 und Variante (a)/(b). Dann Plan v2 für B2b-3e-1 (F-1125) mit A4–A7 als
Delta-Pass; Plan v2 für B2b-3e-2 mit A2, A3, A8–A10 nach dem Merge von 3e-1.
