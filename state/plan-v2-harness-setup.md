<!-- Ziel-Pfad im Repo: state/plan-v2-harness-setup.md -->
# Plan v2 — HARNESS_SETUP

Stand: 20.08.2026 · Ergebnis des Advisor-Passes über Plan v1.
`state/plan-v1-harness-setup.md` bleibt unverändert stehen. Befunde:
`state/advisor-findings-harness-setup.md`.

Marker: `[Fakt]` · `[Schlussfolgerung]` · `[Annahme]` · `[offene Unsicherheit]`

**Status: Plan v2. Vor dem Bau folgen Handoff-Vertrag und Pre-Build-Freigabe.**

---

## 0. Was sich gegenüber v1 geändert hat

Vier materielle Änderungen, alle mit Stefan einzeln entschieden:

1. **AP 5 erhält eine Vorbedingung plus Grün-Fall-Pflicht.** Ohne echten
   Inhalt mit gültigem `Stand dieser Fassung:`-Datum in
   `HARNESS-LEARNING-STATE.md`/`HARNESS-CHANGELOG.md` überspringt
   `check-docs.mjs` den Dokumentenpaar-Vergleich still — der geplante Rot-Fall
   wäre nicht auslösbar (Advisor-Befund, „vor Baubeginn zu klären").
2. **AP 7 erhält Prüfbar-Zeilen je Maßnahme** und die Kennzeichnung „ohne
   Kriteriumsbezug, Altlastenbeseitigung" (Advisor-Befund: einziges AP ohne
   Abnahmekriterium und ohne Kriteriumsbezug).
3. **Die Reihenfolge wird linearisiert: AP 4 läuft erst nach AP 3.** AP 4s
   Kalibrierung der CI-/Branch-Protection-Zeilen ist nur aussagekräftig, wenn
   CI bereits die Produktkette fährt — das Ergebnis von AP 3 (Advisor-Befund,
   „hohe Schwere").
4. **AP 0 erhält einen Bereinigungsschritt.** `main` bei `9189959` trägt in
   `state/` und `state/tasks/` rund 140 KB Artefakte eines abgeschlossenen,
   eigenständigen Vorprogramms („Harness-Fix-Programm" — die frühere Arbeit,
   den generischen Harness selbst zu bauen und zu härten). Unbereinigt
   geklont, würden diese Dateien vom Vertrags-Gate (`check-contract.mjs`,
   prüft jede `.md` unter `state/tasks/`) und vom Doku-Gate (Prüfung 3, prüft
   rekursiv über `state/**`) mitverarbeitet, obwohl sie nichts mit AI Workforce
   zu tun haben und teils auf ein anderes Zielverzeichnis verweisen.

Dazu zwei kleinere Klärungen ohne Planänderung: Der Verweis „(035)" in AP 7
bezeichnet Entscheidungsregister-Eintrag 35 (Secret-Ausschluss aus
Modellkontext), nicht einen der acht Harness-Kandidaten aus Challenge 2 —
kein Widerspruch zu Abschnitt 6. Und **TP-14 ist geschlossen**: Node 24 führt
TypeScript im Strip-only-Modus direkt aus, kein eigener Build-Schritt, unter
drei gemessenen Konfigurationsauflagen (siehe AP 1).

**Nicht übernommen, aber notiert — läuft mit, keine Planänderung:**
Node-/Git-/Claude-Code-Versionsverifikation, AP 3s Log-Nachweis über den
tatsächlich gelaufenen Befehl, AP 6s Spannung zu SETUP.md Punkt 6 (ein leerer
Befundbericht ist laut eigener Doktrin unwahrscheinlich).

---

## 1. Ziel

Unverändert gegenüber Plan v1: Der Projekt-Harness ist so konfiguriert, dass
die sechs Abschlusskriterien aus Ziel-Fassung v1.3, Abschnitt 11 erfüllt sind
und der erste grüne Produkt-Prüflauf vorliegt. **Kein Produktcode.**

## 2. Ausgangslage

Wie Plan v1, Abschnitt 2, mit einer Ergänzung:

`[Fakt]` `main` bei `9189959` ist kein leerer Template-Ausgangszustand,
sondern trägt bereits die vollständige, abgeschlossene Historie des
Harness-Fix-Programms (Phasen 0–2, neun Vertragsdateien unter `state/tasks/`,
vier Plan-/Findings-Dateien unter `state/`, `state/reibung.md`). Bestätigt
gegen die Lesekopie `_lesekopie` (SHA `9189959a7d4de0486a4fee1e30b57ea8e5644661`).

## 3. Entschiedene Werkzeugwahl

Wie Plan v1, Abschnitt 3, mit drei Ergänzungen aus der Vormessung:

- **Biome:** Versionsstand 20.08.2026: `2.5.9`, MIT/Apache-2.0, wöchentliche
  Release-Kadenz — exakter Pin ohne Caret erforderlich. Regel „nicht
  abgewartete Promises" (`noFloatingPromises`) hat **Nursery-Status**
  (experimentell, schaltet Projekt-Scanner und Typinferenz zu). Sie bleibt im
  Regelsatz; ihre Gültigkeit hängt vollständig am Rot-Fall aus AP 4 — jeder
  Versionswechsel zieht den Rot-Fall neu.
- **Telemetrie von Biome** ist an der offiziellen Dokumentation nicht in
  irgendeine Richtung belegt (weder CLI- noch VS-Code-Referenz erwähnen sie).
  Wird **Installationsauflage in AP 7**, durch Beobachtung beim ersten Lauf zu
  klären — kein Blocker für diesen Plan.
- **TP-14 geschlossen:** Kein eigener Build-Schritt. `typecheck` und
  Ausführung bleiben ein Vorgang, unter drei gemessenen Auflagen (gegen Node
  v24.16.0 auf der Zielmaschine bestätigt): `erasableSyntaxOnly: true` im
  tsconfig · `"type": "module"` in `package.json` plus `.ts`-Endungen in
  Projekt-Importen (`allowImportingTsExtensions`) · `types: ["node"]` im
  tsconfig, sonst findet `tsc` `node:test` nicht.

## 4. Arbeitspakete

### AP 0 — Projekt-Repository anlegen
Klon des Templates auf dem Stand von `main`, eigene Historie, Template
zusätzlich als **nur lesendes Remote**. Kein ZIP. Harness-Stand als
Commit-SHA dokumentiert.

**Neu — Bereinigungsschritt:** Nach dem Klon die Artefakte des
Harness-Fix-Programms identifizieren (`state/advisor-findings-phase1-vertraege.md`,
`advisor-findings-phase2-adoptionsfaehigkeit.md`, `plan-v1/v2-phase1-vertraege.md`,
`plan-v1/v2-phase2-adoptionsfaehigkeit.md`, `state/reibung.md`,
`state/tasks/harness-fix-1` bis `-8`, `phase0-artefakte-committen.md`) und in
einen klar benannten Ordner verschieben (z. B.
`docs/harness/programm-historie/`) oder mit einem Kopfvermerk „Fremdprogramm,
nicht AI Workforce" versehen — bevor AP 1 beginnt.

**Prüfbar:** Das Repository existiert, `git remote -v` zeigt zwei Remotes,
der gepinnte SHA ist notiert, **und** `state/tasks/` enthält ausschließlich
AI-Workforce-Verträge.

### AP 1 — Prüfkette füllen *(Kriterium 1)*
`lint`, `typecheck`, `test` in `package.json` auf echte Befehle umstellen.
Die `check`-Kette selbst bleibt unverändert. `typecheck` und `test`
verwenden die drei Konfigurationsauflagen aus Abschnitt 3 (`erasableSyntaxOnly`,
`type: module` + `.ts`-Importendungen, `types: ["node"]`).
**Prüfbar:** Jedes der drei Skripte läuft und liefert einen echten Exit-Code.

### AP 2 — Erster grüner Produkt-Prüflauf *(Kriterium 2)*
Unverändert gegenüber Plan v1. `npm run check` läuft einmal vollständig mit
Exit 0 — mit mindestens einer echten Testdatei (Harness-Selbsttest, kein
Produktcode), damit `test` nicht auf einer leeren Menge grün wird.
**Prüfbar:** Exit 0, und die Ausgabe zeigt, dass jedes Glied gelaufen ist.

### AP 3 — CI auf die Produktkette umstellen *(Kriterium 3)*
Unverändert gegenüber Plan v1. `ci.yml` führt den Produkt-Prüfbefehl aus
statt `check:template`.
**Prüfbar:** Ein Lauf auf frischer Maschine ist grün.

### AP 4 — Gates kalibrieren *(Kriterium 4)*
**Läuft jetzt ausdrücklich nach AP 3, nicht nur nach AP 2** — die
CI-/Branch-Protection-Zeilen in `state/gates.md` sind nur sinnvoll
kalibrierbar, wenn CI bereits die Produktkette fährt.

Für jedes Kettenglied mit Prüfanspruch ein Rot- und ein Grün-Fall in
`state/gates.md`, mit Originalausgabe. **Harte Bedingung (vormals „besondere
Auflage"):** Beide Linter-Regeln bekommen je einen echten Rot-Fall. Fängt der
Rot-Fall die nicht abgewartete Promise nicht, ist Biome an dieser Stelle
widerlegt und der Linter wird gewechselt — das gilt jetzt uneingeschränkt,
weil Regel 2 Nursery-Status hat (Abschnitt 3). `check-rules.mjs` bleibt leer
und gilt nach E-178 als ausdrücklich leer, also evidenzneutral.
**Prüfbar:** Keine `[FÜLLUNG]`-Zelle mehr in einer Zeile mit Prüfanspruch,
**und** für jede der zwei Linter-Regeln existiert eine eigene kalibrierte
Zeile mit dokumentiertem Rot-Fall.

### AP 5 — Erstes Dokumentenpaar scharfstellen *(Kriterium 5)*
**Neue Vorbedingung:** `HARNESS-LEARNING-STATE.md` und
`HARNESS-CHANGELOG.md` erhalten vor dem Rot-Fall echten Inhalt mit gültigem
`Stand dieser Fassung:`-Datum — ohne das überspringt `check-docs.mjs` den
Vergleich still (`scripts/check-docs.mjs:274-275`).

`dokumentPaare` in `check-docs.mjs` um das Paar Changelog ↔ Learning-State
ergänzen.
**Prüfbar:** Rot-Fall **und Grün-Fall** dokumentiert (vormals nur Rot-Fall
verlangt — nach `state/gates.md:5-7`s eigenem Kalibrierungsstandard ist ein
Gate ohne beide Fälle ein ungeprüftes Versprechen); ohne dieses Paar gilt die
Lernkandidaten-Erfassung aus 124/126 als nicht eingerichtet.

### AP 6 — Prosa gegen Wirksamkeit abgleichen *(Kriterium 6)*
Unverändert gegenüber Plan v1. Einmaliger Abgleich der Harness-Dokumentation
gegen die wirksamen Artefakte. Befunde dokumentieren, **nicht** reparieren —
`repo-audit`-Doktrin.
**Prüfbar:** Ein Befundbericht liegt vor, auch wenn er leer ist (ein leerer
Bericht ist laut `SETUP.md` unwahrscheinlich — läuft als Beobachtungshinweis
mit, kein Blocker).

### AP 7 — Sofortmaßnahmen und Altlasten
**Kennzeichnung: ohne Kriteriumsbezug, Altlastenbeseitigung.**

| Maßnahme | Prüfbar |
|---|---|
| `.env`/`.env.local` in `.claudeignore` (Entscheidungsregister #35, nicht Harness-Kandidat) | `.claudeignore` enthält beide Einträge, Diff gezeigt |
| Baseline der Schutzskript-Hashes für E-183/E-188 anlegen | Hash-Datei existiert, referenziert die Hook-Skripte aus AP 0 |
| gitleaks über `werkzeug-auswahl` nachprüfen oder als bewusste Ausnahme mit Begründung vermerken | Eintrag in `state/tooling.md`, positiv oder negativ |
| Alle Entscheidungen aus Abschnitt 3 nach `state/tooling.md`, auch die verworfenen | `state/tooling.md` enthält Biome-Version/-Lizenz/-Nursery-Vermerk, TP-14-Ergebnis, alle verworfenen Kandidaten |
| **Neu:** Telemetrie von Biome beim ersten Lauf beobachten | Ergebnis (ja/nein/unklar) nach `state/tooling.md` |

## 5. Reihenfolge und Begründung

AP 0 zuerst (inklusive Bereinigungsschritt), weil ohne Repository nichts
anderes stattfinden kann. AP 1 vor AP 2, weil die Kette Befehle braucht,
bevor sie grün werden kann. **AP 3 vor AP 4** (geändert gegenüber v1): AP 4s
CI-/Branch-Protection-Kalibrierung setzt die Produktkette in CI voraus. AP 5
zusätzlich an seine eigene Vorbedingung gebunden (echte Daten in den beiden
Harness-Dateien), ansonsten wie AP 6 und AP 7 reihenfolgeunabhängig.

Kette: **AP 0 → AP 1 → AP 2 → AP 3 → AP 4 → (AP 5, 6, 7 frei, AP 5 an eigene
Vorbedingung gebunden).**

## 6. Was ausdrücklich nicht dazugehört

Unverändert gegenüber Plan v1: kein Produktcode, keine Modulstruktur der
Anwendung, keine Regeln in `check-rules.mjs`, keine weiteren Linter-Regeln
über die zwei entschiedenen hinaus, keine Änderung am generischen Template
(die acht gemeldeten Harness-Kandidaten bleiben gemeldet), keine Einrichtung
der Branch Protection über `SETUP.md` Punkt 1 hinaus.

## 7. Offene Punkte

Gegenüber Plan v1 Abschnitt 7 verändert:

1. ~~TP-14~~ — **geschlossen**, siehe Abschnitt 3.
2. **[offene Unsicherheit]** Trägt Biomes genäherte Typinferenz die Regel
   gegen nicht abgewartete Promises? Entscheidet sich in AP 4 am Rot-Fall —
   jetzt eine harte Bedingung, nicht mehr nur eine Auflage.
3. ~~Telemetrie von Biome~~ — **verlagert** zu AP 7 als Installationsauflage,
   kein Blocker mehr für diesen Plan.
4. **[offene Unsicherheit]** Ist die Prüfkette gliedweise auswertbar? TP-11,
   weiterhin offen, betrifft die spätere Gate-Auswertung des Kerns.
5. **[offene Unsicherheit]** Greift die Branch Protection im vorliegenden
   GitHub-Tarif? Betrifft AP 3, weiterhin offen.
6. **[Annahme]** Ein Klon mit zwei Remotes berührt die dokumentierten
   Windows- und Cloud-Sync-Fallen nicht. Weiterhin ungeprüft.

## 8. Nächster Schritt nach diesem Plan

Handoff-Vertrag nach dem Sieben-Sektionen-Format, danach **harter
Pre-Build-Halt**, erst danach Bau — wie in der Sitzungsübergabe vom
20.08.2026, Abschnitt 4, für beide Fälle (Pass durchgeführt oder
übersprungen) festgelegt. Der Pass wurde durchgeführt; dieser Schritt ist
erreicht.
