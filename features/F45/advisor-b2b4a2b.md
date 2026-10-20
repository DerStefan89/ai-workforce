# Delta-Advisor-Pass F45 B2b-4a-2b „Bereit zum Sichern – Anzeige“ — Plan v2

Geprüft: `features/F45/plan-b2b4a2b.md` gegen `0bf84ff`. Subagent `architecture-advisor`, frischer Kontext, nur Read/Grep/Glob,
20.10.2026. Inhaltlich übernommen, gestrafft. Nichts ausgeführt.

## Abgleich
- V1 (plan §2/§5, `versionSequenz` in `aktuellesDetail` ergänzt, `workflows.js:1151`), Bauauflagen 1/2/5/6/8, O3, F-1157 (1)–(8) eingearbeitet.
  `nurNodeModules` entfällt folgerichtig (Server filtert ⇒ `keineAenderungen`).
- [Fakt] Lücke: `remoteWebUrl.status !== 'ok'` ⇒ weder push-Block noch `keinOrigin` — still (`sicherBefehle` sperrt nur bei `origin === false`,
  `code-daten.js:271`).

## node_modules in `leseDateien` — trägt
- [Fakt] Ratsche zählt nur `leitstand-server.mjs` (`check-wachstumsbremse-server.mjs:44`, `:118-121`); Import aus `public/` hat Vorbild
  (`leitstand-server.mjs:535`). Gate b4a1 bleibt grün ((c1) vergleicht beide Seiten, (a) eigene Attrappen). `routen-code.test:384-389` unberührt.
  Diff-Allowlist bleibt ungekappt (`:638-641`), Dateikopf `:41` präzisieren.
- [Fakt] Weitere `anzahl`-Leser: `auftrag-umgebung.js:86/:205`, `arbeitsordner-anzeige.js:77`, `code-daten.js:374` (`bereitschaft`).
- [Schlussfolgerung] Filter auf Pfad/`alterPfad` aller Einträge versteckt auch getrackte/gestagte node_modules-Änderungen, und
  „fehlt in .gitignore“ wäre dann falsch; F-1157 (1) betrifft nur `??`. [Fakt] Zweite, engere Regel `src/arbeitsordner/index.ts:347`.

## push-Regel — passt zu V2
„oder commit-Block davor“ fügt nur hinzu, unterdrückt nie; Gate (c) „gekappt + voraus > 0 ⇒ push“ prüft genau das. Bleibt bis zum Aufräumen
stehen (`voraus` ≠ ungepusht, F-1155) — harmlos.

## V3 — genau ein Aufräumen
- [Fakt] Abnahme-Modus nur bei ABGESCHLOSSEN mit offener Abnahme (`workflow-abnahme.js:111,139-144`, `workflow-entscheiden.js:59`) ⇒
  `aufraeumenMoeglich` falsch (`arbeitsordner-anzeige.js:190`) ⇒ Art `knopf` dort nie erreichbar; würde sie gewählt, stünde ein zweiter
  Knopf neben `renderArbeitsordnerAktion` (`workflows.js:883`).
- [Schlussfolgerung] Modus null mit `aktionen` zeigt ins Leere, wenn `aufraeumenMoeglich` falsch ist (`letzteAbnahme` noch nicht geladen,
  `vorbereitungLaeuft`).

## Zuschnitt: knapp zu groß
[Schlussfolgerung] Fast der ganze v1-Umfang (schon „knapp zu groß“, `advisor-b2b4a2.md:55-56`) plus `leseDateien`, Workboard-Delegation,
Klick-Handler; zweite Korrekturrunde wahrscheinlich. Vorschlag:
- **4a-2b-1 „Regeln und node_modules“:** §1, §2, Hinweis in `#/code`; Gate `sichernQuelle`, (c), (e), (f); Tests `code-daten`, `routen-code`;
  Render-Nachweis nur `#/code` mit node_modules 1440/390. Schließt F-1157 (1)(2)(3)(7) auf Regelebene.
- **4a-2b-2 „Anzeige“:** §3–§7, Gate (b)(d)(g)(h). Schließt F-979, F-1087, Rest F-1157.
Naht: reine Exporte `ablaufSicherBefehle`, `sichernQuelle`, `sichernSchluessel`, `istNodeModulesPfad`.

## Bauauflagen
1. Filter nur `art === '??'` (`alterPfad` entfällt); Grenze zu `src/arbeitsordner:347` im Kopf nennen.
2. Hinweis `nodeModules` unabhängig vom Ergebnis, auch neben `{ grund }`; fehlendes Feld = 0 (alter Server).
3. Aufräumen-Art aus demselben `aufraeumenMoeglich(...)` wie `renderArbeitsordnerAktion` ableiten: `aktionen` nur bei wahr, sonst
   `nachAbnahme` oder neutraler Text; `knopf` streichen oder Einsatzort nennen; Gate (d) anpassen.
4. `remoteWebUrl.status !== 'ok'` ⇒ sichtbarer Hinweis.
5. Risiken um weitere `anzahl`-Leser ergänzen; Kopf `code-daten.js` „Wird aufgerufen von: routen-code.mjs“; Kopf `routen-code.mjs` (Allowlist,
   Feld `dateien` `:16`) nachziehen.
6. [Annahme] Workboard frischt nach „abgeschlossen“ nicht auf — V1 wirkt dort nur über „Aktualisieren“; als Grenze nennen.

## Urteil: Freigegeben mit Hinweisen (Zuschnitt knapp zu groß — Schnitt empfohlen)

## Nächster sinnvoller Schritt
Stefan entscheidet Schnitt 4a-2b-1/4a-2b-2 oder nimmt eine zweite Korrekturrunde bewusst in Kauf; Bauauflagen 1–6 in den Plan, dann bauen.
