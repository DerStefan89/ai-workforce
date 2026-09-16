<!--
Ziel-Pfad im Repo: docs/harness/werkzeug-katalog.md
Stand dieser Fassung: 16.09.2026
Erstlektüre: nein — Nachschlagewerk, kein Teil des Einstiegs.
-->
# Werkzeug-Katalog

Skelett, projektübergreifend. Beantwortet: *was gibt es und wann lohnt es
sich.* Die Frage *was läuft in diesem Projekt* beantwortet
`state/tooling.md` — nicht hier. Die Frage *warum diese Stack-Entscheidung*
beantwortet `docs/adr/` — auch nicht hier.

Aufnahme in den Katalog ist keine Empfehlung zur Installation. Die
Entscheidung fällt pro Projekt nach der Auswahlprozedur, Skill
`werkzeug-auswahl` — Bedarf zuerst.

**Kein Eintrag der Haltbarkeitsklasse C ist installationsbereit, solange
sein Versionspin offen ist.** Das gilt für jeden Eintrag, nicht nur für
den, bei dem es zufällig auffällt.

## Legende

**Haltbarkeitsklassen** — wie lange ein Eintrag voraussichtlich gilt:

| Klasse | Was | Haltbarkeit |
|---|---|---|
| A | Konzepte und Verfahren | Jahre |
| B | Erstanbieter-Features | Monate bis Jahre |
| C | Community-Werkzeuge | Wochen bis Monate, austauschbar, Vetting-Pflicht |
| D | Schlagworte | verifizieren oder verwerfen |

Nicht zu verwechseln mit der Vier-Ebenen-Regelhierarchie des Harness
(Mensch, Modell-Evaluator, deterministische Gates, Berechtigungen). Beide
Begriffe kursieren nebeneinander — siehe
`docs/harness/HARNESS-GLOSSARY.md`.

**Vetting-Status:** ungeprüft · recherchiert (Herkunft belegt, nicht
benutzt) · erprobt (real eingesetzt und beobachtet).

**Klasse C zwingend zusätzlich:** Herkunft als Repo-URL und Versionspin.
Muster in diesem Repo: `.claude/skills/ponytail/` — nur die SKILL.md
kopiert, Version im Dateikopf notiert, Lizenz danebengelegt, kein
ausführbarer Code übernommen.

## Eintragsformat

### <Name>
- **Haltbarkeitsklasse:**
- **Zweck:**
- **Herkunft:**
- **Vetting-Status:**
- **Prüfdatum:**
- **Lohnt sich:**
- **Ausdrücklich nicht, wenn:**
- **Token-/Kostenwirkung:**
- **Risiko-Hinweis:**

Das Prüfdatum ist das Datum der letzten Herkunftsprüfung, nicht das der
Aufnahme. Ohne Prüfdatum lässt sich nicht entscheiden, ob ein Eintrag der
Klasse C noch gilt.

## Quellenregel

Rund um Agenten-Werkzeuge existiert ein Schwarm von Verzeichnis-Websites,
die voneinander abschreiben und teils unglaubwürdige Kennzahlen führen. Für
den Herkunfts-Check zählt ausschließlich das Quell-Repo, nie ein
Verzeichnis-Eintrag.

Datierte Rechercheartefakte (docs/harness/kandidaten-*.md) sind Belege mit
Prüfdatum, keine Katalogeinträge und keine Bestandsliste. Sie werden nicht
automatisch gelesen und nicht von Skills, Agents oder .claude/-Pfaden
referenziert. Ein Kandidat wird erst zum Katalogeintrag, wenn er real
eingesetzt werden soll. Aktueller Beleg: docs/harness/kandidaten-2026-09-15.md
(176 bewertete Kandidaten, Prüfdatum 15.09.2026, Vetting-Status
„recherchiert").

## Bewusst nicht aufgenommen

Geprüfte und verworfene Werkzeuge stehen mit Begründung und Prüfdatum in
einem eigenen Abschnitt — damit dieselbe Prüfung nicht in einem halben Jahr
von vorn beginnt. Ein begründeter Ausschluss ist genauso viel wert wie ein
Eintrag.

Aus der Kandidatenrecherche vom 15.09.2026 ausgeschlossen (Prüfdatum
16.09.2026): Nutzungsart dieses Projekts ist „Weitergabe der Workforce
eingeplant". Daraus folgt: Copyleft (GPL/AGPL) ist für eingebaute
Bestandteile ausgeschlossen, separat laufende Fremdprozesse nicht.
Zwingend kostenpflichtige APIs oder Datenquellen gelten als kostenpflichtig,
auch wenn der Code kostenlos ist.
- figranium (GPL-3.0): würde eingebaut, Copyleft auf das Produkt.
- iannuttall/seo (Apache-2.0): zwingender externer Datenprovider je Funktion.
- academic-research-skills (CC BY-NC 4.0): kommerzielle Nutzung ausgeschlossen.
- Werkzeuge, die Harness oder Leitstand duplizieren (u.a. Archon, Langflow,
  vibe-kanban, Herdr, gsd-core, gstack, claudex-loop, planning-with-files).
- Zweite Gedächtnissysteme neben Dateien/Git (u.a. claude-mem, mem-palace,
  beads).
- Aktive Security- und Stealth-Werkzeuge (u.a. PentAGI, Strix, Shannon,
  CloakBrowser, patchright) sowie inoffizielle Plattformzugänge.

Vollständige Begründung je Kandidat: docs/harness/kandidaten-2026-09-15.md.
Lizenzvolltext geprüft am 16.09.2026 und unbedenklich: thinking-orbs (MIT),
simplify-codebase (MIT), kibo (MIT, shadcnblocks/kibo), ntfy (Apache-2.0),
OCRmyPDF (MPL-2.0; Ghostscript bleibt AGPL und darf nicht mitgeliefert
werden).

## Einträge

[FÜLLUNG] Die Einträge liegen nicht hier, sondern zentral im Lern-Repo —
eine Quelle für alle Projekte, die an einer Stelle altert statt in jedem
Klon. In diesem Repo steht nur die Mechanik.

Im Produktkontext dieses Repos führt ressourcen.json, welche Ressource welche
Capability bereitstellt und ob sie freigegeben ist. Bewertung, Vetting-Status,
Prüfdatum und bewusst verworfene Werkzeuge bleiben im Katalog.

## Benannte Leerstellen

Eine benannte Leerstelle ist ein Befund, eine unbenannte ist ein Irrtum.
Der Katalog stammt aus einem Web- und Agentenprojekt und deckt derzeit nur
diese Sorte Werkzeug ab. Nicht abgedeckt:

- **Web3** — Test- und Analysewerkzeuge für Smart Contracts,
  Gas-Regression, Testnetz-Zwang.
- **Video** — Medienprüfung, Asset- und Lizenzmanifest, Shot-Protokoll.
- **Data/ML** — Seed-Festlegung, Prüfung auf Datenleckage.
- **Skill-Sorte „Handwerk"** — alle vorhandenen Skills sind Verfahren, also
  Regeln dafür, *wie* gearbeitet wird. Die zweite Sorte — recherchieren,
  schreiben, schneiden — fehlt, weil das Harness aus einem Softwareprojekt
  stammt.
