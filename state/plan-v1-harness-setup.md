<!-- Ziel-Pfad im Repo: state/plan-v1-harness-setup.md -->
# Plan v1 — HARNESS_SETUP

Stand: 20.08.2026 · Workstream nach 122 · Autor: technischer Planer
**Status: Plan v1. Vor dem Bau folgen Advisor-Pass, Handoff-Vertrag und Pre-Build-Freigabe.**

Marker: `[Fakt]` · `[Schlussfolgerung]` · `[Annahme]` · `[offene Unsicherheit]`

> **Hinweis zur Fassung.** Die Abschnitte 1 bis 8 sind der unveränderte
> Wortlaut von Plan v1. Die Abschnitte 9 bis 11 sind Nachträge vom
> 20.08.2026 — menschliche Entscheidungen und Messergebnisse, die nach dem
> Schreiben des Plans und **vor** dem Advisor-Pass entstanden sind. Sie
> werden angehängt, nicht eingearbeitet, damit die Wirkung des Passes
> später belegbar bleibt.

---

## 1. Ziel

Der Projekt-Harness ist so konfiguriert, dass die sechs Abschlusskriterien aus Ziel-Fassung v1.3, Abschnitt 11 erfüllt sind und der erste grüne Produkt-Prüflauf vorliegt. Danach ist die technische Projektgrundlage READY und Layer 3 kann beginnen.

**Kein Produktcode.** Dieser Workstream richtet ein, er baut nicht.

## 2. Ausgangslage

`[Fakt]` Ein Repository für die AI Workforce existiert nicht. Vorhanden sind: ein Arbeitsbaum des Templates auf dem älteren Branch `regel/zielverzeichnis` (HEAD `7ad0086`, vier Hooks) und ein ZIP-Download von `main` unter `claude-projekt-template-main` (fünf Hooks, kein Git-Repository).
`[Fakt]` Zielumgebung: Windows, PowerShell, Node v24.16.0, Git 2.54.0, Claude Code 2.1.237.
`[Fakt]` `main` steht bei `9189959`; Challenge 2 wurde gegen diesen Stand geführt.
`[Fakt]` Die Prüfkette lautet `lint && typecheck && check-docs && check-rules && check-contract && test`. Drei Glieder sind Platzhalter, die mit Exit 1 abbrechen.
`[Fakt]` `.github/workflows/ci.yml` führt derzeit `npm run check:template` aus, nicht `npm run check`.
`[Fakt]` `check-docs.mjs`, Prüfung 4 (`dokumentPaare`), ist ein leeres Array.
`[Fakt]` `state/tooling.md` führt gitleaks mit dem Vermerk, es sei vermutlich nie über `werkzeug-auswahl` geprüft worden.

## 3. Entschiedene Werkzeugwahl

| Gegenstand | Entscheidung | Klasse |
|---|---|---|
| Betriebsform | Kommandozeilenwerkzeug ohne dauerhaften Prozess | A |
| Sprache und Laufzeit | Node mit TypeScript | A/B |
| Typechecker | `tsc --strict` | B |
| Testrunner | `node:test`, in der Laufzeit enthalten | B |
| Linter | Biome, minimaler Regelsatz | **C — Versionspin und Telemetrie vor Installation klären** |

**Regelsatz des Linters, abschließend für Fassung 1:** explizites `any` verboten · nicht abgewartete Promises gemeldet. Mehr nicht; weitere Regeln entstehen nach der Beförderungsregel aus dem dritten identischen Fehler.

**Geprüft und verworfen:** Python *(zweite Laufzeit; holt die vertagte Prüfbefehl-Indirektion ins Projekt; Typisierung nur konfiguriert statt erzwungen)* · C#/.NET *(dritte Laufzeit, Prüfkette komplett neu, Apparat ohne Driver-Bedarf)* · Go und Rust *(bedienen keinen der sechzehn Drivers; kosten Iterationsgeschwindigkeit)* · ESLint mit typescript-eslint *(exakter bei typbewussten Regeln, aber deutlich größere Vetting-Fläche; unterlegen gegenüber der Kalibrierungsauflage)* · laufender Prozess mit Oberfläche *(führt wieder ein, was D11 gestrichen hat; Fassung-2-Kandidat)*.

## 4. Arbeitspakete

### AP 0 — Projekt-Repository anlegen
Klon des Templates auf dem Stand von `main`, eigene Historie, Template zusätzlich als **nur lesendes Remote** *(123 neu, Befund 8)*. Kein ZIP. Harness-Stand als Commit-SHA dokumentiert.
**Prüfbar:** Das Repository existiert, `git remote -v` zeigt zwei Remotes, der gepinnte SHA ist notiert.

### AP 1 — Prüfkette füllen *(Kriterium 1)*
`lint`, `typecheck`, `test` in `package.json` auf echte Befehle umstellen. Die `check`-Kette selbst bleibt unverändert.
**Prüfbar:** Jedes der drei Skripte läuft und liefert einen echten Exit-Code.

### AP 2 — Erster grüner Produkt-Prüflauf *(Kriterium 2)*
`npm run check` läuft einmal vollständig mit Exit 0 — mit mindestens einer echten Testdatei, damit `test` nicht auf einer leeren Menge grün wird.
**Prüfbar:** Exit 0, und die Ausgabe zeigt, dass jedes Glied gelaufen ist.

### AP 3 — CI auf die Produktkette umstellen *(Kriterium 3)*
`ci.yml` führt den Produkt-Prüfbefehl aus statt `check:template`.
**Prüfbar:** Ein Lauf auf frischer Maschine ist grün. `[Schlussfolgerung]` Ohne dieses eine Zeilen-Update bewacht die Branch Protection dauerhaft die Harness-Selbstprüfung statt des Produkts.

### AP 4 — Gates kalibrieren *(Kriterium 4)*
Für jedes Kettenglied mit Prüfanspruch ein Rot- und ein Grün-Fall in `state/gates.md`, mit Originalausgabe.
**Besondere Auflage:** Die beiden Linter-Regeln bekommen jeweils einen echten Rot-Fall. Fängt der Rot-Fall die nicht abgewartete Promise nicht, ist Biome an dieser Stelle widerlegt und der Linter wird gewechselt. `check-rules.mjs` bleibt leer und gilt nach E-178 als ausdrücklich leer, also evidenzneutral.
**Prüfbar:** Keine `[FÜLLUNG]`-Zelle mehr in einer Zeile mit Prüfanspruch.

### AP 5 — Erstes Dokumentenpaar scharfstellen *(Kriterium 5)*
`dokumentPaare` in `check-docs.mjs` um das Paar Changelog ↔ Learning-State ergänzen.
**Prüfbar:** Rot-Fall dokumentiert; ohne dieses Paar gilt die Lernkandidaten-Erfassung aus 124/126 als nicht eingerichtet.

### AP 6 — Prosa gegen Wirksamkeit abgleichen *(Kriterium 6)*
Einmaliger Abgleich der Harness-Dokumentation gegen die wirksamen Artefakte *(E-181)*. Befunde dokumentieren, **nicht** reparieren — `repo-audit`-Doktrin.
**Prüfbar:** Ein Befundbericht liegt vor, auch wenn er leer ist.

### AP 7 — Sofortmaßnahmen und Altlasten
`.env` und `.env.local` in `.claudeignore` *(035)* · Baseline der Schutzskript-Hashes für E-183 und E-188 anlegen · gitleaks entweder über `werkzeug-auswahl` nachprüfen oder als bewusste Ausnahme mit Begründung vermerken · alle Entscheidungen aus Abschnitt 3 nach `state/tooling.md`, auch die verworfenen.

## 5. Reihenfolge und Begründung

AP 0 zuerst, weil ohne Repository nichts anderes stattfinden kann. Dann AP 1 vor AP 2, weil die Kette Befehle braucht, bevor sie grün werden kann. AP 3 nach AP 2, weil eine CI-Umstellung auf eine rote Kette den Branch dauerhaft blockieren würde. AP 4 nach AP 2, weil ein Rot-Fall eine funktionierende Kette voraussetzt. AP 5, 6 und 7 sind reihenfolgeunabhängig.

## 6. Was ausdrücklich nicht dazugehört

Kein Produktcode. Keine Modulstruktur der Anwendung. Keine Regeln in `check-rules.mjs`. Keine weiteren Linter-Regeln über die zwei entschiedenen hinaus. Keine Änderung am generischen Template — die gemeldeten Harness-Kandidaten 1 bis 8 bleiben gemeldet und werden hier nicht umgesetzt *(079)*. Keine Einrichtung der Branch Protection über das hinaus, was `SETUP.md` Punkt 1 verlangt.

## 7. Offene Punkte — nicht stillschweigend entschieden

1. **[offene Unsicherheit] Braucht TypeScript einen eigenen Build-Schritt, oder führt Node 24 den Code direkt aus?** Entscheidet, ob `typecheck` und die Ausführung ein oder zwei Vorgänge sind. **TP-14**, zu klären vor AP 1.
2. **[offene Unsicherheit] Trägt Biomes genäherte Typinferenz die Regel gegen nicht abgewartete Promises?** Entscheidet sich in AP 4 am Rot-Fall, nicht vorher.
3. **[offene Unsicherheit] Telemetrie von Biome.** An der Quelle nicht belegt. Vor der Installation zu klären.
4. **[offene Unsicherheit] Ist die Prüfkette gliedweise auswertbar?** **TP-11**, offen. Betrifft die spätere Gate-Auswertung des Kerns, nicht dieses Setup — aber AP 2 ist die erste Gelegenheit, es zu beobachten.
5. **[offene Unsicherheit] Greift die Branch Protection im vorliegenden GitHub-Tarif?** `SETUP.md:18-23` nennt sie bei privaten Repos im Free-Tarif als angelegt, aber nicht durchgesetzt. Betrifft AP 3.
6. **[Annahme] Ein Klon mit zwei Remotes berührt die dokumentierten Windows- und Cloud-Sync-Fallen nicht.** Ungeprüft.

## 8. Nächster Schritt nach diesem Plan

Advisor-Pass durch `architecture-advisor` in frischem Kontext, mit den sechs offenen Punkten als Fokus. Danach Plan v2, Handoff-Vertrag, Pre-Build-Halt.

---
---

# Nachträge vom 20.08.2026 — vor dem Advisor-Pass

## 9. Entscheidungen des Menschen, vor dem Advisor-Pass

`[Fakt]` Am 20.08.2026 entschieden, nachdem dieser Plan geschrieben und
bevor der Advisor-Pass gelaufen war. Der Wortlaut der Abschnitte 1 bis 8
bleibt unverändert.

| Gegenstand | Entscheidung | Folge für den Plan |
|---|---|---|
| **Fälligkeit des Advisor-Passes** | **Durchführen**, mit eingegrenztem Fokus und Vorabmessungen. Damit ist Instruction 1 des Skills `advisor-pass` erfüllt und die Entscheidung ausgesprochen, nicht stillschweigend getroffen | Fokus und Ausschlüsse stehen in Abschnitt 11 |
| **Offener Punkt 1 — TP-14** | **Beantwortet durch Messung: kein eigener Build-Schritt.** Node 24 führt TypeScript im Strip-only-Modus direkt aus | AP 1 erhält drei Konfigurationsauflagen, siehe Abschnitt 10. Punkt 1 ist geschlossen |
| **Offener Punkt 3 — Telemetrie von Biome** | **Am Schreibtisch nicht schließbar.** Die offizielle Dokumentation trifft in keine Richtung eine Aussage; nach P3 wird daraus kein „keine Telemetrie". Die Frage wird durch Beobachtung beim ersten Lauf geschlossen | Wird **Installationsauflage in AP 7** über `werkzeug-auswahl`. Kein Blocker für den Pass, weil sie an keinem Arbeitspaket die Struktur ändert |
| **Nursery-Status der zweiten Linter-Regel** (Befund 2 der Sitzung) | **Regel bleibt.** Absicherung über exakten Versionspin ohne Caret; der Rot-Fall aus AP 4 ist ihre Gültigkeitsbedingung, jeder Versionswechsel zieht ihn neu | AP 4 — die besondere Auflage wird von einer Soll- zu einer harten Bedingung. AP 7 — Pin und Nursery-Vermerk nach `state/tooling.md` |

`[Fakt]` Belege zum Nursery-Status: Die Biome-Regeldokumentation zu
`noFloatingPromises` führt die Regel in der Gruppe `nursery`
(„experimental and the behavior can change at any time") und in der
`types`-Domäne, deren Aktivierung den Projekt-Scanner und die
Typinferenz-Engine einschaltet. Verfügbar seit v2.0.0.

`[Fakt]` Versionsstand am 20.08.2026, über die npm-Registry abgefragt:
`@biomejs/biome` 2.5.9, veröffentlicht 2026-08-17, Lizenz
`MIT OR Apache-2.0`. Kadenz der letzten sechs Veröffentlichungen:
wöchentlich. Der frühere Vermerk „2.4.16 vom 27.05.2026" ist damit
überholt.

`[Schlussfolgerung]` Die Begründung, mit der ESLint samt typescript-eslint
verworfen wurde („deutlich größere Vetting-Fläche"), trifft in
abgeschwächter Form auch die gewählte Regel 2: Sie schaltet Scanner und
Inferenz zu. Die Entscheidung fällt trotzdem für Biome, weil der Pin die
Instabilität einfriert und der Rot-Fall aus AP 4 die Wirksamkeit belegt
statt sie zu behaupten.

## 10. Messergebnisse zu TP-14

`[Fakt]` Zwei Messreihen, beide am 20.08.2026.

**Reihe A — Zielmaschine, Windows, PowerShell, Node v24.16.0**

| Messung | Ergebnis |
|---|---|
| `node a.ts` mit reinen Typannotationen | `STRIP_OK 42` |
| `node b.ts` mit `enum` | Abbruch, `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`: „TypeScript enum is not supported in **strip-only mode**" |

`[Fakt]` Die Fehlerspur des zweiten Laufs zeigt `Module._compile` aus
`node:internal/modules/cjs/loader` — die Datei wurde als CommonJS geladen,
weil im Ordner keine `package.json` mit `"type": "module"` liegt.

**Reihe B — Vormessung im Linux-Container, Node v22.22.2, TypeScript 7.0.2**

| Messung | Ergebnis |
|---|---|
| Reine Typannotationen | läuft direkt |
| `enum` + Parameter-Property | `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` |
| `import { val } from "./lib.ts"` | trägt |
| `node --test` über `*.test.ts` | `# pass 1 # fail 0` |
| `tsc --noEmit` mit `erasableSyntaxOnly` gegen den enum-Fall | `TS1294` an beiden Stellen |
| Kette `tsc && node --test` nach Bereinigung | **Exit 0** |

**Ergebnis: `typecheck` und Ausführung bleiben ein Vorgang, kein
Build-Schritt.** Drei Konfigurationsauflagen für AP 1, alle gemessen:

1. **`erasableSyntaxOnly: true`.** `[Schlussfolgerung]` Die tragende
   Kopplung: Ohne diese Option fällt die Fehlerklasse aus Reihe A erst zur
   Laufzeit auf; mit ihr fängt `typecheck` sie ab. `tsc` wird damit zum
   Wächter über die Ausführbarkeit, nicht nur über Typen.
2. **`allowImportingTsExtensions`** plus `.ts`-Endungen in allen
   Projekt-Importen, und **`"type": "module"`** in `package.json`.
3. **`types: ["node"]`** im tsconfig. Ohne diesen Eintrag findet `tsc`
   `node:test` nicht, obwohl `@types/node` installiert ist — gemessen:
   erst mit dem Eintrag Exit 0.

`[offene Unsicherheit]` **Welches `tsc`?** `npx tsc --version` liefert am
20.08.2026 die Version 7.0.2, also die native Portierung — nicht die
Fassung, gegen die Abschnitt 3 „`tsc --strict`" formuliert wurde. Die
Entscheidung ändert sich dadurch nicht, aber der Pin in
`state/tooling.md` muss die Major-Linie ausdrücklich benennen. Gehört
nach AP 7.

`[offene Unsicherheit]` Reihe B lief unter Node 22, nicht 24. Die beiden
für AP 1 entscheidenden Ergebnisse — Strip-only und der enum-Abbruch —
sind über Reihe A gegen Node 24 bestätigt; die vier übrigen Zeilen sind
**nicht** auf der Zielmaschine nachgemessen.

## 11. Fokus des Advisor-Passes

**Im Auftrag:**

1. Verifikation der sieben `[Fakt]`-Behauptungen aus Abschnitt 2 gegen den
   tatsächlichen Arbeitsbaum. Jede Behauptung einzeln: bestätigt,
   widerlegt oder nicht überprüfbar.
2. Innere Widersprüche zwischen den Arbeitspaketen und Abschnitt 6.
3. Reihenfolge aus Abschnitt 5 — trägt die Begründung, fehlt eine
   Abhängigkeit, ist eine behauptete Unabhängigkeit falsch.
4. Für jedes Arbeitspaket: Stellt die genannte `Prüfbar:`-Bedingung
   tatsächlich fest, was das Paket zu leisten behauptet, oder ist sie
   schwächer als ihr Anspruch.
5. Umfangsvergrößerung: Arbeitspakete oder Teile davon, die kein benanntes
   Problem lösen.

**Ausdrücklich nicht im Auftrag** — der Advisor hat nur Lesezugriff und
kann sie nicht messen; er soll sie als `[offene Unsicherheit]` markieren
statt sie abzuleiten:

- offener Punkt 2 (Biome-Rot-Fall) — entscheidet sich in AP 4
- offener Punkt 4 (TP-11, gliedweise Auswertbarkeit)
- offener Punkt 5 (Branch Protection im vorliegenden Tarif)
- offener Punkt 6 (Klon mit zwei Remotes unter Windows)

Die offenen Punkte 1 und 3 sind nach Abschnitt 9 geschlossen
beziehungsweise verlagert und stehen dem Advisor nicht mehr als Fokus zur
Verfügung.

---

## Status

- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

**Advisor-Pass steht aus.** Ergebnis gehört nach
`state/advisor-findings-harness-setup.md`, überarbeiteter Plan nach
`state/plan-v2-harness-setup.md`. Diese Datei bleibt danach unverändert
stehen.
