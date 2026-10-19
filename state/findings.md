# Findings-Register — AI Workforce Harness

Anhängeprotokoll. Neue Zeilen unten anfügen, bestehende nie löschen — Status ändern statt entfernen. Archivieren ist kein Löschen: erledigte Einträge (Status beginnt mit gelöst, behoben, erledigt oder korrigiert) werden gesammelt und wörtlich nach `state/findings-archiv.md` verschoben (F45 K, E-K-1); dort steht nach, was hier fehlt. Nächste freie ID = höchste ID in dieser Datei + 1: der Eintrag mit der höchsten ID wird nie archiviert (ERZWUNGEN wie die Eindeutigkeit über beide Dateien, Gate check-f21-workboard (6)). Das Workboard im Leitstand liest nur diese Datei (bekannte Grenze, F-1139). Format je Zeile: `ID | Typ | Priorität | Status | Titel — Beschreibung | Fundstelle | Auswirkung | Maßnahme | Feature/Run`.

Typen: `BUG` · `HARNESS_IMPROVEMENT` · `TECH_DEBT` · `PROCESS_IMPROVEMENT`.
Priorität: `P0` kritisch · `P1` wichtig · `P2` sinnvoll · `P3` Verbesserungsidee · `P4` sehr niedrig.

---

**F-002** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Entscheidungsregister 001–176 noch nicht im Repo.
Beschreibung: `docs/projekt/zielfassung.md` und `umsetzungsplan-fassung-1.md` liegen jetzt im Repo, das zugrundeliegende Entscheidungsregister (Claude-Projekt-Dokument `04_ENTSCHEIDUNGSREGISTER_001_176.md`) nicht. E-073 (lokaler Workspace = Single Source of Truth) bleibt dadurch teilweise verletzt.
Fundstelle: fehlt unter `docs/projekt/`.
Auswirkung: gering — die konsolidierten Fassungen sind im Repo, das Register ist Herleitung, nicht Sollquelle.
Maßnahme: eigener, kleiner Terminal-Nachtrag (analog `zielfassung.md`), keine Eile.
Feature/Run: Planung Vertrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026.

**F-003** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `check-docs.mjs` Prüfung 2 erkennt bare zweistellige Versionszahlen nicht.
Beschreibung: Regex verlangt ein `v`-Präfix oder einen Punkt in der Zahl. „Node 24" (ohne beides) löst keinen Befund aus — verifiziert per Rot-Fall-Test, Exit 0 statt erwarteter Exit 1.
Fundstelle: `scripts/check-docs.mjs`, Prüfung 2, Regex.
Auswirkung: ein künftiger Eintrag wie „Node 20" in `CLAUDE.md`/`ARCHITECTURE.md` würde nicht erkannt, obwohl die Prüfung als `ERZWUNGEN`/kalibriert gilt.
Maßnahme: Regex um bare zwei-/dreistellige Zahlen direkt nach gelistetem Techniknamen erweitern.
Feature/Run: Bauauftrag `ebene2-architektur-in-repo-nachziehen`, Kalibrierungsschritt, 28.08.2026.

**F-006** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `ARCHITECTURE.md` erklärt mehrere sicherheitsrelevante Kernbegriffe nicht selbst.
Beschreibung: Checkpoint, Wirkungsmarke, Checkpoint Store, Gültigkeitsschlüssel, Wirksamkeitsnachweis, Ergebnishülle, Beobachtungsbasis werden benutzt, aber nur in `docs/projekt/zielfassung.md` (§7, §16.2, §16.4, E-188) definiert, ohne Rückverweis aus `ARCHITECTURE.md`.
Fundstelle: `ARCHITECTURE.md` Abschnitt 1/2.
Auswirkung: mittel — verfehlt an dieser Stelle das eigentliche Ziel des Vertrags („ohne externe Quelle benennbar").
Maßnahme: pro Begriff an der ersten Nennung einen Satz oder gezielten Verweis „siehe `docs/projekt/zielfassung.md` §X" ergänzen.
Feature/Run: qa-Review Runde 1, Bauauftrag `ebene2-architektur-in-repo-nachziehen`, 28.08.2026.

**F-007** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: `check-docs.mjs` Prüfung 1 erkennt Ordnerverweise ohne Dateiendung nicht.
Beschreibung: `lib/utils/`, `lib/data/`, `lib/auth/` (Alt-Template-Reste in `CLAUDE.md`, Abschnitt „Bestehende Helper") werden vom Doku-Gate nicht als toter Verweis erkannt, weil Prüfung 1 nur Pfade mit Dateiendung matcht.
Fundstelle: `scripts/check-docs.mjs` Prüfung 1; `CLAUDE.md`, Abschnitt „Bestehende Helper".
Auswirkung: niedrig — Template-Leichen bleiben unbemerkt im laufenden Text stehen.
Maßnahme: Prüfung 1 auf Ordnerverweise erweitern (optional), oder den Abschnitt jetzt auf die reale Struktur (`src/`) umschreiben/entfernen.
Feature/Run: qa-Review Runde 1, 28.08.2026.

**F-008** · `TECH_DEBT` · P3 · offen
Titel: Terminologie „Arbeitsstrang" vs. „Workstream" nicht explizit gleichgesetzt.
Beschreibung: `ARCHITECTURE.md` (verbotene Patterns) nennt „Arbeitsstrang" (D13), `docs/STATUS.md`/Umsetzungsplan nennen „Workstream" — gleicher Sachverhalt, keine Datei spricht die Gleichsetzung aus. `docs/harness/HARNESS-GLOSSARY.md` ist dafür nur eine leere `[FÜLLUNG]`-Zeile.
Fundstelle: `ARCHITECTURE.md`, `docs/STATUS.md`, `docs/harness/HARNESS-GLOSSARY.md`.
Auswirkung: niedrig — aus Kontext erschließbar, nicht belegt.
Maßnahme: Glossar füllen oder Gleichsetzungssatz ergänzen.
Feature/Run: qa-Review Runde 1, 28.08.2026.

**F-011** · `TECH_DEBT` · P4 · offen, absichtlich zurückgestellt
Titel: `[FÜLLUNG, nur UI]`-Reste in `CLAUDE.md` trotz entschiedener Web-UI.
Beschreibung: DoD-Punkte, `design-guardian`-Zeile, Entscheidungsregel Punkt 1 unausgefüllt, obwohl der Leitstand inzwischen als Web-Oberfläche entschieden ist (`docs/adr/oberflaechentechnik-leitstand.md`).
Fundstelle: `CLAUDE.md`.
Auswirkung: niedrig, wird bei Feature 10 (Leitstand) fällig.
Maßnahme: bei Feature 10 ausfüllen, nicht vorher.
Feature/Run: qa-Review Runde 1, 28.08.2026.

**F-013** · `PROCESS_IMPROVEMENT` · P1 · offen (Prio von P2 auf P1 angehoben)
Titel: Claude-Projekt-GitHub-Sync liefert keine Repo-Dateien in dieses Projekt.
Beschreibung: Direkt nach dem Merge von PR #13 zeigte project_search/project_read für ARCHITECTURE.md weiterhin alten Template-Inhalt. Bei erneuter Prüfung (Planungssitzung AF-F001, 28.08.2026) liefert project_info für dieses Projekt weiterhin ausschließlich die claude/*-Chat-Dokumente — kein einziger Repo-Pfad (ARCHITECTURE.md, CLAUDE.md, docs/*, scripts/*, state/*, features/*) erscheint, trotz konfigurierter GitHub-Sync-Quelle mit Include-Filter "/". Ist damit kein reines Merge-Lag, sondern ein strukturelles Sync-Problem.
Fundstelle: dieses Claude-Projekt, GitHub-Sync-Quelle main; project_info Doc-Liste.
Auswirkung: eine Claude-Projekt-Sitzung darf project_read/project_search für Repo-Fakten grundsätzlich nicht verwenden, nicht nur "kurz nach einem Merge".
Maßnahme: Sync-Konfiguration prüfen (Ursache klären), bis dahin Repo-Fakten ausschließlich über eine Claude-Code-Sitzung direkt einholen.
Feature/Run: AF-F001-Planung, 28.08.2026.

**F-014** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: GitKraken-MCP-Tool in Claude-Projekt-Sitzungen ohne Auth nutzbar.
Beschreibung: `repository_get_file_content` (Provider github) verlangt `gk auth login` auf dem verbundenen Gerät — in einer reinen Claude-Projekt-Sitzung ohne verbundenes Gerät nicht nutzbar. Damit ist der einzige belegte Fallback zu F-013 ebenfalls blockiert.
Fundstelle: mcp__remote-devices__plugin_gitkraken_gitkraken__repository_get_file_content.
Auswirkung: verschärft F-013 — keine funktionierende Alternative zur Verifikation innerhalb des Claude-Projekts.
Maßnahme: Auth einrichten, oder Verfahren dauerhaft auf "Repo-Fakten immer per Claude-Code-Prompt" festlegen.
Feature/Run: AF-F001-Planung, 28.08.2026.

**F-015** · `TECH_DEBT` · P4 · offen
Titel: `ARCHITECTURE.md` Kopfkommentar trägt noch `[FÜLLUNG — GANZE DATEI]`.
Beschreibung: Alle acht Inhaltsabschnitte sind befüllt, aber der Meta-Kommentar (Zeile 1–18) wurde nicht entfernt.
Fundstelle: `ARCHITECTURE.md:1–18`.
Auswirkung: kosmetisch — kein Platzhalter im eigentlichen Inhalt, aber irreführend für den nächsten Leser.
Maßnahme: Kopfkommentar bei Gelegenheit entfernen.
Feature/Run: Verifikation AF-F001-Planung, Schritt A, 28.08.2026.

**F-017** · `PROCESS_IMPROVEMENT` · P4 · offen
Titel: Zahlenfehler in der Selbstverifikation von plan-v1-feature0-datenformate.
Beschreibung: plan-v1 Abschnitt 0 behauptet „24 Gates" in `state/gates.md`. Die reale Gate-Tabelle enthält 14 Datenzeilen; „24" trifft eher auf die Zeilennummer des letzten Tabelleneintrags zu als auf die Gate-Anzahl.
Fundstelle: `state/plan-v1-feature0-datenformate.md` Abschnitt 0; `state/gates.md:9-24`.
Auswirkung: keine auf die Design-Entscheidungen — reine Ungenauigkeit, aber gerade in einem Abschnitt, der explizit Sorgfalt beansprucht („real geprüft, nicht aus den Handoff-Dokumenten übernommen").
Maßnahme: kosmetisch, kein Recheck nötig. Bei Gelegenheit in plan-v1 korrigieren.
Feature/Run: architecture-advisor-Pass auf plan-v1-feature0-datenformate, 29.08.2026.

**F-018** · `PROCESS_IMPROVEMENT` · P4 · offen
Titel: D5 in plan-v1-feature0-datenformate zitiert `ARCHITECTURE.md` Abschnitt 6 etwas weiter, als der Wortlaut trägt.
Beschreibung: plan-v1 D5 formuliert: „jedes neue Werkzeug verlangt laut `ARCHITECTURE.md` Abschnitt 6 vorher den Skill `werkzeug-auswahl`". `ARCHITECTURE.md:71` deckt wörtlich nur „Test-Framework" und „MCP-Werkzeug" ab, nicht jede neue npm-Dependency. Die gelebte Praxis in `state/tooling.md` (Biome, `tsc`, `gh` — reguläre Dependencies, trotzdem über `werkzeug-auswahl` geprüft) stützt die Schlussfolgerung von D5 (kein `ajv`) inhaltlich trotzdem — nur die Zitierschärfe ist ungenau.
Fundstelle: `state/plan-v1-feature0-datenformate.md` D5; `ARCHITECTURE.md:71`; `state/tooling.md`.
Auswirkung: keine auf das Ergebnis (kein `ajv` bleibt richtig), nur auf die Begründungsschärfe.
Maßnahme: kosmetisch, kein Recheck nötig. Bei Gelegenheit in plan-v1 auf die gelebte Praxis in `state/tooling.md` statt auf Abschnitt 6 stützen.
Feature/Run: architecture-advisor-Pass auf plan-v1-feature0-datenformate, 29.08.2026.

**F-019** · `TECH_DEBT` · P4 · offen
Titel: Typ des `version`-Felds in der Profil-Referenz ist eine unbelegte, aber offen benannte Festlegung.
Beschreibung: Weder ADR-0002 noch die geprüften Stellen aus `docs/projekt/zielfassung.md` legen den Datentyp von „Version" für `profiles/` fest. plan-v1 wählt `integer, minimum: 1` als eigene Festlegung. Der Plan benennt diese Interpretation selbst ausdrücklich als Auslegung, nicht als wörtliche Ausnahme — genau das erwartete Verhalten, kein verstecktes Risiko.
Fundstelle: `state/plan-v1-feature0-datenformate.md` D1.
Auswirkung: keine Blockade nötig. Eine künftige Monotonie-Prüfung bräuchte eine Historie, die Feature 0 nicht liefert (bereits im Plan so benannt).
Maßnahme: kein Recheck nötig, in plan-v2 unverändert stehen gelassen.
Feature/Run: architecture-advisor-Pass auf plan-v1-feature0-datenformate, 29.08.2026.
Feature/Run: Verifikation AF-F001-Planung, Schritt A, 28.08.2026.

**F-021** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Claude-Projekt-Projektbeschreibung „AI Workforce" beschreibt eine bereits überholte Phase.
Beschreibung: Beschreibung nennt „Zielarchitektur final planen/Stack wählen/Produktcode schreiben" als „noch nicht erlaubt", obwohl Architektur-Baseline längst entschieden ist und F0-F3 real gebaut/gemergt sind. Nur die separate Projektbeschreibung ist stehengeblieben, die Project Instructions selbst sind aktuell.
Fundstelle: Claude-Projekt „AI Workforce", Feld Projektbeschreibung.
Auswirkung: Verwirrungsrisiko für frische Sitzungen ohne Chat-Historie.
Maßnahme: bei Gelegenheit aktualisieren.
Status: dritte Wiederholung (`claude/89` Befund 3, `claude/90` Abschnitt 6, `claude/94`), weiterhin offen.
Feature/Run: Challenge Artifact Registry / Lineage, 29.08.2026; dritte Wiederholung 30.08.2026.

**F-023** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: „Von Git als Binärdatei erkannt" wurde einmal fälschlich als False Alarm abgetan, bevor F-022 real gefunden wurde.
Beschreibung: Ein ernstzunehmendes Signal (Git-Binärerkennung auf erwarteter Textdatei) wurde zunächst übergangen.
Fundstelle: F1-Bauauftrag, Prüfschritt vor Commit.
Auswirkung: hätte unentdeckt bis zum Commit durchlaufen können.
Maßnahme: „Git meldet Textdatei als binär" nie ohne Byte-Inspektion als False Positive abtun — Kandidat für code-reviewer/qa-Checkliste.
Feature/Run: F1-Bauauftrag, 29.08.2026.

**F-026** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Verwechslung, wofür der commit-guard-Freigabe-Mechanismus gilt, kostete mehrere unnötige Runden.
Beschreibung: Freigabe-Zwang (`state/freigabe-commit.md`) gilt nur für `git commit`/`git push` durch Claude Code selbst, nicht für `gh pr create/checks/merge` durch Stefan direkt — wurde einmal fälschlich mit angefordert.
Fundstelle: Merge-Ablauf PR #21/#22.
Auswirkung: mehrere unnötige Runden.
Maßnahme: vor jeder Freigabe-Anforderung prüfen, wer den Git-Befehl ausführt; Terminal-Anweisungen einzeln statt als Mehrzeilen-Block geben (PowerShell-Copy-Paste-Probleme). Status: seither angewendet, bewährt sich.
Feature/Run: Feature 2, Merge-Ablauf PR #21/#22, 29.08.2026.

**F-027** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Leitstand-Prototyp (F10) wurde ohne eigene Feature-Akte gebaut.
Beschreibung: `features/` enthält kein `F10`-Verzeichnis, kein zugehöriger plan-v1/plan-v2. Prototyp funktioniert nachweislich, aber außerhalb der AF-F001-Konvention.
Fundstelle: `features/` (fehlender Eintrag).
Auswirkung: gering, Nachvollziehbarkeit schwächer als bei anderen Features.
Maßnahme: Akte nachziehen oder bewusst als „Prototyp ohne Akte" deklarieren.
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026.

**F-029** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Product-Coach-Übergabe (F4) nutzte kollidierende Feature-Nummerierung und falsche Vorbedingungen.
Beschreibung: Übergabe ging von „F3 abgeschlossen" aus und nannte den nächsten Schritt „F4" — der Umsetzungsplan vergibt F3 bereits an Authorization Boundary, F4 an Invocation Policy. Beschriebener Umfang entsprach zudem dem gesamten Rest von Meilenstein 1, nicht einem Feature.
Fundstelle: Übergabe „AI_Workforce_Uebergabe_F4_E2E_Workstream.md".
Auswirkung: ohne Repo-Abgleich wäre auf falscher Vorbedingung weitergeplant worden.
Maßnahme: Product-Coach-Handoffs auf Ziel/Scope/AK begrenzen; IDs und Zustände holt der Challenger selbst aus dem Repo.
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026.

**F-031** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Werkzeug-/Bedarfsauswahl (MCP, APIs, Agents, Tools, Skills) hat bereits einen manuellen Vorläufer im Harness — Feature direkt nach S3 einplanen.
Beschreibung: `docs/harness/werkzeug-katalog.md`, `state/tooling.md` und Skill `.claude/skills/werkzeug-auswahl/SKILL.md` bilden bereits eine Bedarf-zuerst-Auswahlprozedur. Stefan wünscht ein späteres AI-Workforce-Feature, das MCPs/APIs/Agents/Tools/Skills automatisch aus einer Library auswählt: (1) Bedarf (`BEDARF_V0`) auswerten, (2) prüfen was der Harness schon hat, (3) prüfen was fehlt, (4) Einträge aus der Bibliothek empfehlen, (5) nach Bestätigung umsetzen, (6) Ergebnis ist dauerhaft nutzbare Zuordnung, nicht nur einmalige Empfehlung.
Fundstelle: `docs/harness/werkzeug-katalog.md`, `state/tooling.md`, `.claude/skills/werkzeug-auswahl/SKILL.md`; `docs/projekt/zielfassung.md` §11 (automatisches Werkzeug-Sammeln = Nicht-Ziel Fassung 1, Auswahl aus gepflegtem Katalog erlaubt).
Auswirkung: keine jetzt — Backlog-Hinweis, damit kein Feature später eine zweite, konkurrierende Werkzeug-Library aufbaut.
Maßnahme: `BEDARF_V0` bekommt von Anfang an ein Feld, das auf Katalog-/`tooling.md`-Einträge zeigt, vorerst manuell befüllt (in F9s `feature.md`/plan-v1 bereits als `werkzeug_auswahl`-Platzhalterfeld übernommen). Priorität von P2 auf P1 angehoben (30.08.2026) — der manuelle Vorläufer ist schon heute nutzbar, die automatisierte Version wird direkt nach F9/S3 geplant, nicht erst nach ganz Meilenstein 1.
Feature/Run: Challenge F4/E2E-Workstream, 29.08.2026; präzisiert und Priorität geklärt, 30.08.2026.

**F-032** · `TECH_DEBT` · P2 · offen
Titel: F3 (Authorization Boundary) prüft nur Integrität („unverändert"), nicht Urheberschaft („von Mensch erzeugt").
Beschreibung: `pruefeAutorisierung` vergleicht Arbeitsverzeichnis-/Git-Show-Inhalt gegen den referenzierten Hash — beweist Integrität, nicht dass ein Mensch die Freigabedatei erzeugt hat. E-189/D16 verlangen wörtlich nur „außerhalb der Schreibreichweite des Ausführungswerkzeugs".
Fundstelle: `src/authorization-boundary/index.ts`, `pruefeAutorisierung`.
Auswirkung: gering jetzt, aber ein Skript mit Zugriff auf den externen Ordner könnte technisch eine gültige Freigabe erzeugen.
Maßnahme: als bewusste Vereinfachung für Fassung 1 akzeptiert. Bei Bedarf später: zusätzlicher Herkunftsnachweis.
Feature/Run: F3-Advisor-Pass, 30.08.2026.

**F-034** · `HARNESS_IMPROVEMENT` · P3 · **zusammengeführt mit F-045**
Titel: Geräte-Brücken-Lesebefehle (device_bash) können einen verwaisten `.git/index.lock` hinterlassen.
Beschreibung: Mehrfach beobachtet (zuletzt 30.08.2026, dritte Wiederholung): ein reiner Lese-Git-Befehl über die Geräte-Brücke hinterlässt eine 0-Byte `.git/index.lock`, die reales `git commit` blockieren würde.
Fundstelle: `mcp__remote-devices__device_bash`-Aufrufe gegen das lokale Repo.
Auswirkung: gering, aber wiederkehrend.
Maßnahme: mit F-045 zusammengeführt, gemeinsame Regel siehe `docs/harness/geraete-bruecke-verifikation.md`.
Feature/Run: wiederholt seit F1B, zuletzt 30.08.2026; zusammengeführt Findings-Batch, 31.08.2026.

**F-036** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Findings-Register war in zwei unabhängig fortgeschriebene Kopien gespalten (dieses Repo-Register vs. Claude-Projekt „AI Workforce").
Beschreibung: Repo-Register endete bei F-019 (29.08.2026), das Claude-Projekt-Register führte unabhängig F-020 bis F-036 fort, ohne Rückspielung. Grund, warum `grep F-031 state/findings.md` im F9-plan-v1 keinen Treffer lieferte.
Fundstelle: `state/findings.md` (dieses Repo) vs. `claude/75_FINDINGS_REGISTER_ANHANG.md` (Claude-Projekt).
Auswirkung: mittel — Repo-seitige Sitzungen sahen Challenger-Findings ab F-020 nicht.
Maßnahme: `state/findings.md` ist ab sofort einzige Sollquelle (dieser Nachtrag). Künftige Findings werden direkt am Ende jedes Bauauftrags hier angehängt, nicht mehr primär im Claude-Projekt.
Feature/Run: F9-plan-v1-Review, 30.08.2026.

**F-038** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: `docs/harness/werkzeug-katalog.md` ist leer und nicht maschinenlesbar — harte Vorbedingung für jedes Automatisierungs-Feature der Werkzeugauswahl.
Beschreibung: Abschnitt „Einträge" trägt nur `[FÜLLUNG]` mit Verweis auf ein externes Lern-Repo. Ein künftiges Bedarfsanalyse-Feature (F-031), das „die Capability Library prüft", liest heute eine leere Datei. Ohne reale Einträge ist kein Kalibrierungstest möglich (Zielfassung P3).
Fundstelle: `docs/harness/werkzeug-katalog.md`, Abschnitt „Einträge".
Auswirkung: blockierend für das geplante Bedarfsanalyse-Feature.
Maßnahme: Stefans externe Werkzeug-Bibliothek in das bestehende Eintragsformat überführen (mind. ca. 10 Einträge), danach abgeleiteten maschinenlesbaren Index definieren. Markdown bleibt führend.
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-039** · `TECH_DEBT` · P2 · offen
Titel: `BEDARF_V0.werkzeug_auswahl` ist ein Platzhalter ohne Schema und ohne Zielformat.
Beschreibung: Feld wurde in F9s `feature.md`/plan-v1 als Platzhalter übernommen (F-031), trägt aber kein definiertes Schema.
Fundstelle: `features/F9/feature.md`, zugehörige Bedarf-Schemas.
Auswirkung: gering jetzt; wird bei einem künftigen Bedarfsanalyse-Feature die erste zu klärende Frage.
Maßnahme: in einem künftigen plan-v1 ausspezifizieren, nicht vorher.
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-042** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Terminal-Befehle mit geratenem Pfad und in Unix-Notation ausgegeben, obwohl Zielmaschine Windows/PowerShell ist.
Beschreibung: In einer Challenger-Sitzung wurde „git -C ~/projekte/..." ausgegeben. Pfad geraten, `~` wird von PowerShell in `git -C` nicht expandiert, beide Befehle schlugen fehl. F-026 verlangt „echte Pfade", wurde nicht gegen die reale Zielumgebung geprüft.
Fundstelle: Challenger-Sitzung 30.08.2026, TERMINAL-Ausgabe.
Auswirkung: gering, ein Fehlversuch pro Vorkommen.
Maßnahme: `[EMPFEHLUNG]` F-026 um zwei Punkte ergänzen: Zielumgebung ist Windows/PowerShell, keine Unix-Notation, kein `~`; steht das Arbeitsverzeichnis bereits im Repo, keinen `-C`-Pfad konstruieren.
Feature/Run: Challenge Bedarfsanalyse, 30.08.2026.

**F-043** · `TECH_DEBT` · P2 · offen
Titel: F5-Rollentabelle bindet an Besetzungsnamen statt an die §4-Verantwortungskategorien — Spannung zu E-191/N2.
Beschreibung: `state/tasks/f5-context-builder.md` bzw. plan-v2 verwendet Besetzungsnamen (architecture-advisor, code-reviewer, qa, ausfuehrung) als Schlüssel der Rollentabelle statt der stabileren Verantwortungskategorien aus Zielfassung §4. E-191/N2 verlangt Rolle und Runtime als getrennte Felder — hier sind sie im selben Schlüssel vermischt. Bewusst so belassen (YAGNI, kein zweiter realer Aufrufer vorhanden).
Fundstelle: `state/tasks/f5-context-builder.md`, Rollentabelle.
Auswirkung: gering jetzt (N2 ist DEKLARIERT, nicht ERZWUNGEN); eine künftige Besetzungsänderung erzwingt sonst eine Änderung an dieser Kern-Datei statt einer Konfigurationszeile.
Maßnahme: bei F6 (zweiter realer Aufrufer) oder beim nächsten ohnehin anstehenden Bauauftrag auf getrennte Rolle/Runtime-Felder umstellen.
Feature/Run: F5 Context Builder, plan-v2, 31.08.2026.

**F-044** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: `state/freigabe-commit.md` kann zwischen Vorbereitung und tatsächlichem Commit-Versuch das 10-Minuten-Fenster von `commit-guard.cjs` überschreiten.
Beschreibung: Wird die Freigabedatei vorab angelegt (z. B. während noch Diff/Bericht geprüft werden), statt unmittelbar vor dem eigentlichen `git commit`/`git push`-Aufruf, kann das Frischefenster ablaufen, bevor der Befehl läuft — der Guard verweigert dann mit „ist N Minuten alt (Frischefenster 10 Minuten) — verweigert", obwohl die Freigabe inhaltlich noch galt.
Fundstelle: `.claude/hooks/commit-guard.cjs` (Frischefenster-Prüfung); real beobachtet während des F5-Merge-Vorgangs, 31.08.2026.
Auswirkung: gering — führt zu einem Fehlversuch und einer erneuten Freigabe-Anlage, kein Datenverlust, keine Sicherheitslücke.
Maßnahme: Freigabe unmittelbar vor dem Commit-Versuch anlegen, nicht vorab.
Feature/Run: F5 Context Builder, Merge/Abschluss, 31.08.2026.

**F-046** · `PROCESS_IMPROVEMENT` · P1 · **entschieden**
Titel: F4 wurde ohne vorherigen Code-Reviewer-/QA-Pass gemergt — kein
strukturell erzwungener Review-Schritt zwischen Ausführung und Merge.
Beschreibung: Retroactiver Review-Pass auf F4 (bereits gemergt, PR #33, main
HEAD `2c3f6f3`) durchgeführt: Subagent `code-reviewer` auf
`src/invocation-policy/`, `src/authorization-boundary/index.ts`
(additiver Diff), `scripts/check-f4-invocation-policy.mjs`, die beiden
neuen Schemas angesetzt; Subagent `qa` auf F4 aus Nutzersicht angesetzt.
Beide Ergebnisse in `state/code-reviewer-findings-f4-invocation-policy.md`
und `state/qa-findings-f4-invocation-policy.md` abgelegt (erstmaliges
Muster für einen nachträglichen Review-Pass in diesem Projekt). Beide
Rollen: „Freigegeben mit Hinweisen", kein Blocker. Wichtigster
Sachbefund: Schutzskript-Prüfung vergleicht nur die Menge der Hashes
(Multiset), nicht Pfad-zu-Hash-Zuordnung — ein Vertauschen zweier gültiger
Skript-Inhalte bliebe FREIGEGEBEN, obwohl AC3 „jedes referenzierte" Skript
prüfen lassen will. Der eigentliche Prozess-Befund ist aber, dass diese
Befunde erst nachträglich entstanden, weil kein Review-Schritt vor dem
Merge strukturell erzwungen war — anders als beim üblichen Ablauf
(Advisor-Pass vor dem Bau, aber kein Reviewer-/QA-Pass danach, vor dem
Commit/Merge).
Fundstelle: Ablauf F4 (`features/F4/journal.md`, Abschnitt „Ausführung" —
endet direkt mit Diff-Vorlage/Freigabe/Commit, kein Reviewer-/QA-Schritt
dazwischen).
Auswirkung: mittel — kein Datenverlust, keine Sicherheitslücke im
gemergten Stand (kein Befund war blockierend), aber die Sachbefunde
(insbesondere der Multiset-Hash-Punkt) hätten vor dem Merge auffallen
können, wenn ein Reviewer-/QA-Pass Teil des Standardablaufs gewesen wäre.
Maßnahme: Reviewer-/QA-Pass (analog `code-reviewer`/`qa` Subagenten) als
festen Pflichtpunkt in `CLAUDE.md` Definition of Done ergänzt (gleichrangig
neben „`npm run check` → Exit 0"), zwischen Ausführung und Freigabe/Commit.
Der konkrete Sachbefund (Multiset-Hash-Vergleich) ist als eigenständiges
Finding **F-047** ausgelagert, statt hier mitgeführt zu werden.
Entschieden mit dieser Prozessänderung — der Sachbefund selbst bleibt über
F-047 offen und getrennt verfolgt.
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass, 31.08.2026.

**F-049** · `TECH_DEBT` · P2 · offen
Titel: Sammel-Finding F4-Testlücken aus dem retroactiven QA-Pass (fünf
ungetestete Randfälle).
Beschreibung: (1) AC10 Fall 2 deckt nur „manipuliertes", nicht „fehlendes"
Schutzskript ab — die Längenprüfung fängt das vermutlich korrekt ab, ist
aber unbewiesen. (2) Kein Testfall für mehrere gleichzeitige
Verbotsparameter. (3) Keine Fixture für eine teilweise korrupte
`schutzskripte`-Liste (einziger Negativfall ist „Array komplett leer").
(4) `normalisierePfadFuerVergleich` ohne eigenen Test — reine
Schreibvarianten (`C:\Foo\Bar` vs. `c:/foo/bar`) ungeprüft, eine
Regression bliebe unbemerkt. (5) Kein End-to-End-Test der Kette
`pruefeStartfreigabe()` → `ABGELEHNT` → `verweigereStart()`.
Fundstelle: `src/invocation-policy/invocation-policy.test.ts`,
`src/invocation-policy/index.ts:79-91`,
`schemas/examples/kontrollzustand-invocation-policy-baseline.invalid-leere-schutzskripte.json`;
Detailbelege in `state/qa-findings-f4-invocation-policy.md`
(Befunde 2, 3, 4, 6, 7).
Auswirkung: gering — kein bekanntes Fehlverhalten, der Kernablauf (AC10 vier
Fälle inkl. realem VERWEIGERT-Terminalartefakt) ist real getestet. Risiko ist
unbemerkte Regression, nicht aktueller Defekt.
Maßnahme: eine kleine Nachtrags-Iteration an `invocation-policy.test.ts`,
wenn ohnehin ein Workstream an F4 geöffnet wird (z. B. beim F-048-Fix vor
F6). Kein eigenes Feature nötig. Bewusst als ein Finding geführt statt als
fünf, weil es ein einziger Arbeitsschritt ist.
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass, 31.08.2026.

**F-050** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Schema-Dateien werden weder gegen das Draft-2020-12-Metaschema noch
gegen ihre Handvalidierer geprüft — projektweite Drift-Lücke.
Beschreibung: Zwei zusammenhängende Bestandslücken. (a) Die Gate-Skripte
validieren nur Fixtures gegen den handgeschriebenen Validierer, nie die
Schema-Datei selbst gegen das JSON-Schema-Draft-2020-12-Metaschema — ein
formal ungültiges Schema fällt nicht auf (AC1-artige Kriterien sind damit
faktisch DEKLARIERT, nicht ERZWUNGEN). (b) Schema-Datei und Handvalidierer
sind zwei unabhängige Wahrheitsquellen derselben Regeln; driften sie
auseinander, meldet kein Check das.
Fundstelle: durchgängiges Projektmuster —
`scripts/check-f4-invocation-policy.mjs` und die gleichartigen Gate-Skripte
von F0/F1B/F2/F3/F5/F9; `src/invocation-policy/index.ts:105-231` vs.
`schemas/kontrollzustand-invocation-policy-*.schema.json`.
Auswirkung: mittel auf Sicht — kein aktueller Defekt, aber die Zahl der
Schema/Validierer-Paare wächst mit jedem Feature, und die Drift-Gefahr
wächst mit.
Maßnahme: eigener Harness-Schritt, kein Feature-Nachtrag — ein gemeinsames
Check-Skript, das (a) jede Datei unter `schemas/` gegen das Metaschema
validiert und (b) mindestens die vorhandenen Fixtures gegen Schema UND
Handvalidierer laufen lässt, sodass ein Auseinanderlaufen einen Rot-Fall
erzeugt. Nicht F4-spezifisch, daher bewusst nicht in einem F4-Fix
mitgelöst.
Feature/Run: F4 Invocation Policy, retroactiver Review-Pass (qa Befund 8 +
code-reviewer Befund 3), 31.08.2026.

**F-051** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Umsetzungsplan-Tabellenzeilen 6/7 verschweigen die F6/F7-
Systemgrenze zwischen Prozessstart und Klassifikation.
Beschreibung: `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 2,
Zeile 6 („Startet erst, wenn Invocation Policy (4) freigibt und Context
Builder (5) liefert") und Zeile 7 („Verarbeitet die Ausgabe des
Gateways") legen für sich gelesen nahe, das Gateway könnte oder müsste
seine eigene Ausgabe selbst bewerten. Tatsächlich weist
`docs/projekt/zielfassung.md` §16.2 (Zeile 334/335) die Klassifikation
ausdrücklich dem Result Evaluator zu und dem Gateway „keine fachliche
Bewertung, keine Fließtextdeutung". Beim F6-Challenge wäre ein naiver
Zuschnitt (ein Feature #6) fast in dieses Duplikat-Muster gelaufen (D5).
Fundstelle: `docs/projekt/umsetzungsplan-fassung-1.md`, Abschnitt 2,
Tabellenzeilen 6/7.
Auswirkung: gering jetzt (im F6-Challenge rechtzeitig erkannt und in
F6a/F7-Zuschnitt aufgelöst), aber ein künftiger Leser der Tabelle allein
würde denselben Fehler wiederholen.
Maßnahme: `features/F6a/feature.md` benennt die Grenze bereits explizit
als Nicht-Ziel (AK12 prüft sie sogar mechanisch per Grep). Optional:
Tabellenzeile 6/7 im Umsetzungsplan um einen Verweis auf §16.2 Zeile
334/335 ergänzen, wenn ohnehin am Dokument gearbeitet wird.
Feature/Run: Challenge F6/F6a, 31.08.2026.

**F-052** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Zielfassung §16.8 Punkt 5 (Absturz-Erkennung) als offen geführt,
obwohl real gemessen.
Beschreibung: `docs/projekt/zielfassung.md` §16.8 Punkt 5 lautet
„Erkennung eines nach Absturz möglicherweise noch laufenden
Werkzeugprozesses. (Weiterhin offen — an Vertrag 3 gebunden.)".
`state/tp-nachtrag.md`, Abschnitt „TP-01 e", enthält aber bereits zwei
reale Messfälle (A: Abbruch per `kill -9`, B: Zeitüberschreitung per
`timeout 5s`) mit dokumentiertem Befund: kein terminales Ergebnisobjekt,
leeres stderr, kein Rest- oder Kindprozess (per `Get-CimInstance
Win32_Process` geprüft). Der Punkt ist damit faktisch beantwortet, aber
die Zielfassung wurde nicht nachgezogen.
Fundstelle: `docs/projekt/zielfassung.md` §16.8 Punkt 5;
`state/tp-nachtrag.md`, Abschnitt „TP-01 e", Messfall A und B.
Auswirkung: gering direkt, aber erzeugt unnötige Nacharbeit — F6a hätte
sonst denselben Messvorgang für vermeintlich neu gehalten (im
F6-Challenge bereits vermieden, siehe `features/F6a/journal.md`).
Maßnahme: §16.8 Punkt 5 mit Verweis auf `state/tp-nachtrag.md`
schließen oder den verbleibenden Restumfang (z. B. Windows-PID-Mapping
von Git-Bash-Subshells, dort als offene Unsicherheit vermerkt) präzise
benennen, statt den Punkt pauschal offen zu lassen.
Feature/Run: Challenge F6/F6a, 31.08.2026.

**F-054** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Mehrzeiliger `&&`-verketteter Terminalblock in PowerShell bricht
mitten im Ablauf ab und hinterlässt einen halb ausgeführten Zustand.
Beschreibung: Ein per 🖥️ TERMINAL ausgegebener Block der Form
`git checkout main && git pull --ff-only origin main` scheitert unter
Windows PowerShell mit `ParserError: Das Token "&&" ist in dieser
Version kein gültiges Anweisungstrennzeichen` (PowerShell < 7 kennt kein
`&&`). Zweimal in dieser Sitzung aufgetreten. Beim zweiten Mal blieb ein
`git checkout -b feature/f6a-gateway-lesepfad` auf einer veralteten
Branch-Basis stehen (`checkout main` war zuvor am `&&` gescheitert, ein
stales `.git/index.lock` verhinderte danach zusätzlich den Fallback-
Checkout), sodass der neue Feature-Branch 1 vor/1 hinter `origin/main`
divergierte, bevor überhaupt ein Commit stattfand — nur durch
`git reset --hard origin/main` vor dem ersten Commit folgenlos
korrigierbar.
Fundstelle: 🖥️ TERMINAL-Blöcke dieser Sitzung (PR-Merge- und
Branch-Wechsel-Sequenzen); `.claude/`-Umgebung des Nutzers ist Windows
PowerShell, nicht Git Bash/POSIX-sh.
Auswirkung: mittel — kein Datenverlust in dieser Sitzung, aber ein
Terminalblock, der stillschweigend mitten im Ablauf abbricht, kann bei
destruktiveren Folgebefehlen (z. B. einem `git reset` auf den falschen
Branch) real schaden.
Maßnahme: Terminalblöcke für diesen Nutzer künftig zeilenweise ohne
`&&`-Verkettung ausgeben (PowerShell-kompatibel), oder pro Zeile mit
`;` trennen, das PowerShell akzeptiert. Bei mehrschrittigen Git-
Sequenzen zusätzlich nach dem Lauf explizit den erreichten Zustand
gegenprüfen (Branch, HEAD, ahead/behind), statt den Erfolg aus dem
Terminaloutput anzunehmen.
Feature/Run: PR #35 Merge- und F6a-Branch-Erstellung, 31.08.2026.
**F-055** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Wiederholt stale `.git/index.lock` durch Lesebefehle über die
Geräte-Brücke blockiert nachfolgende echte Git-Operationen.
Beschreibung: In dieser Sitzung dreimal aufgetreten. Ein über
`mcp__remote-devices__device_bash` ausgeführter, rein lesender Git-Befehl
(`git status`, `git fetch`, `git log`) hinterlässt gelegentlich eine
`.git/index.lock`-Datei (0 Byte), die die Geräte-Brücke selbst nicht
löschen kann (`Operation not permitted` beim Versuch, sie zu entfernen —
vermutlich eine Dateisperren-Eigenheit der Windows/Bridge-Kombination,
Ursache nicht untersucht, außerhalb des Geltungsbereichs dieses
Findings). Jeder danach im echten Terminal des Nutzers ausgeführte
schreibende Git-Befehl (`git add`, `git commit`, `git checkout`)
scheitert mit „fatal: Unable to create '…/.git/index.lock': File
exists." — unabhängig davon, ob der Nutzer selbst gerade einen Git-
Prozess laufen hat. In einem Fall blieb dadurch ein `git checkout -b`
auf einer veralteten Branch-Basis stehen, bevor der stale Lock bemerkt
wurde (siehe F-054).
Fundstelle: `mcp__remote-devices__device_bash`-Aufrufe dieser Sitzung
(mehrere `git status`/`git fetch`/`git log`-Lesebefehle im Wechsel mit
🖥️ TERMINAL-Anweisungen an den Nutzer); `.git/index.lock` im lokalen
Repo-Klon des Nutzers (`C:\Users\stefa\Projekte\ai-workforce`).
Auswirkung: mittel — kein Datenverlust in dieser Sitzung (jedes Mal
rechtzeitig bemerkt, bevor destruktive Befehle liefen), aber
wiederkehrende Reibung: der Nutzer muss den Terminalblock abbrechen,
`Remove-Item .git\index.lock` manuell ausführen und den unterbrochenen
Schritt erneut anstoßen. Bei einem unbeaufsichtigten oder eiligen Ablauf
steigt das Risiko, einen halb ausgeführten Zustand zu übersehen.
Maßnahme: Vor jedem 🖥️ TERMINAL-Block, der auf zuvor über die
Geräte-Brücke gelesenen Git-Zustand aufbaut, den lesenden Git-Zugriff über
die Brücke minimieren oder den Nutzer routinemäßig `Remove-Item
.git\index.lock -ErrorAction SilentlyContinue` als ersten Schritt
ausführen lassen, bevor irgendein schreibender Git-Befehl folgt — statt
den Lock-Fehler erst nach dem Auftreten zu behandeln. Kein Code-Fix
nötig, reine Ablaufänderung dieser Rollenkette.
Feature/Run: Challenge/Planung F6a, PR-Merge- und Branch-Sequenzen,
31.08.2026.
**F-058** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Korrektur eines Findings propagiert nicht automatisch in referenzierende Feature-Akten.
Beschreibung: Die F-030-Reprüfung (31.08.2026, PR #38) korrigierte den Finding-Eintrag selbst korrekt (Status „korrigiert", Nachtrag), aktualisierte aber nicht die Dependencies-Sektion in `features/F6a/feature.md`, die F-030 wörtlich als „Hard, offen und blockierend" zitierte. Der Widerspruch blieb bis zur WS2/WS3-Statusprüfung (31.08.2026) unbemerkt in der Feature-Akte stehen.
Fundstelle: `features/F6a/feature.md`, Dependencies-Sektion, vor Korrektur in diesem Commit.
Auswirkung: gering hier (rein dokumentarisch, kein Code betroffen), aber ein Muster, das bei einer echten Blockade-Aufhebung zu falscher Zurückhaltung oder bei einer neu entstandenen Blockade zu übersehenem Risiko führen könnte.
Maßnahme: Konvention aufnehmen — wird ein Finding korrigiert, das in einer Feature-Akte wörtlich zitiert oder als Dependency referenziert ist, gehört die Prüfung dieser Referenzstellen zum selben Korrektur-Schritt, nicht zu einem späteren Zufallsfund.
Feature/Run: F6a WS2/WS3-Statusprüfung, 31.08.2026.

**F-060** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: AK14-Grep-Regel (Shell-String-Verbot) im F6a-Gate hat reale Erkennungslücken.
Beschreibung: Reviewer-/QA-Pass (frischer Kontext, 31.08.2026) hat die Regel in `scripts/check-f6a-claude-code-gateway.mjs` gegen gedachte Verstoßfälle laufen lassen: `execSync(cmd)` (Wortgrenze `\bexec\(` matcht nicht „execSync("), `tokens.join(',')` (Regel verlangt exakt ein Leerzeichen als Trennzeichen) und Template-Literal-Zusammenbau ohne `.join` werden **nicht** erkannt. Der tatsächlich gebaute Code (`prozessstart.ts`) ist sauber (`execFile` mit Argv-Array, F-057 eingehalten) — die Lücke betrifft nur die Regression-Erkennung für künftige Änderungen. Zum Vergleich: `scripts/check-f4-invocation-policy.mjs:259` nutzt für ein ähnliches Verbot bereits ein wortgrenzensicheres Muster für `execSync`.
Fundstelle: `scripts/check-f6a-claude-code-gateway.mjs`, AK14-Grep-Regel; Vergleichsmuster `scripts/check-f4-invocation-policy.mjs:259`.
Auswirkung: kein aktueller Verstoß, aber die mechanische Absicherung von F-057 ist schwächer als angenommen — ein künftiger Fehlgriff (z. B. `execSync` statt `execFile`) würde vom Gate nicht zuverlässig erkannt.
Maßnahme: Regel härten (Wortgrenzen-sicheres Muster für `exec`/`execSync`, Trennzeichen-unabhängige Join-Erkennung, ggf. Template-Literal-Heuristik) — Muster aus F4s Gate übernehmen. Kein Blocker für den aktuellen Merge, vor dem nächsten Gateway-bezogenen Bau nachziehen.
Feature/Run: F6a WS2-Reviewer-/QA-Pass, 31.08.2026.

**F-061** · `TECH_DEBT` · P2 · offen
Titel: `is_error`/`non_execution_kind` (E-184) in `state/tp-nachtrag.md` an keiner Stelle real belegt.
Beschreibung: `docs/projekt/zielfassung.md` E-184 verlangt für die Erfolgs-/Verweigerungs-Klassifikation eines Laufs u. a. `is_error` und `non_execution_kind` aus der strukturierten Ergebnisausgabe. Volltextsuche in `state/tp-nachtrag.md` (allen bisherigen realen `claude -p --output-format json`-Messungen, TP-03d Messfall 1-3, TP-01e Messfall A/B): beide Feldnamen kommen nirgends vor. Real belegt sind ausschließlich `permission_denials` und `result` (TP-03d Messfall 1/2, Wortlaut-Zitate) sowie das Fehlen jedes Ergebnisobjekts bei Abbruch/Zeitüberschreitung (TP-01e). Gleiches Muster wie F-059 (`modell_beobachtet`): ein in der Zielfassung benanntes Feld ohne empirischen Beleg.
Fundstelle: `docs/projekt/zielfassung.md` Zeile 205 (E-184); `state/tp-nachtrag.md` (Volltextsuche negativ).
Auswirkung: gering für F7 selbst — die Kernklassifikation (FEHLGESCHLAGEN/VERWEIGERT/ERFOLGREICH) stützt sich laut `state/plan-v1-f7-result-evaluator.md` ausschließlich auf real belegte Signale (`beobachtungsbasis_vollstaendig`, `permission_denials`); beide unbelegten Felder werden nur informativ, nicht klassifikationsrelevant geführt.
Maßnahme: Feldnamen real klären, sobald ein echter Lauf ein vollständiges Ergebnisobjekt liefert — natürlicher Zeitpunkt ist WS3 (`state/tasks/f6a-ws3-realer-nachweis.md`). Danach kleiner Nachtrag an F7, keine Architekturänderung nötig.
Feature/Run: F7-Challenge, 31.08.2026.

**F-063** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Advisor-Korrektur (Design-Entscheidung 2) im Plan nachgezogen, aber nicht an der zitierenden Stelle in `features/F7/feature.md` — gleiches Muster wie F-058.
Beschreibung: `state/plan-v1-f7-result-evaluator.md` Design-Entscheidung 2 legt nach dem Advisor-Pass (31.08.2026) fest, dass der Aufrufer die bereits geladene `LaufakteV0Daten` an `klassifiziereLauf` übergibt (kein eigener Laufakte-Lesepfad in F7). `features/F7/feature.md`, Scope-Abschnitt, führte bis zum F7-Baudurchgang weiterhin die ältere Signatur `klassifiziereLauf(laufId, profilReferenz, optionen)` und die Formulierung „liest die Laufakte" — beides widerspricht der advisor-geprüften Planfassung. Im F7-Handoff-Vertrag (`state/tasks/f7-result-evaluator.md`, CONTEXT/OUTPUT) bereits vorab benannt und im selben Baudurchgang auf die Planfassung nachgezogen.
Fundstelle: `features/F7/feature.md`, Scope-Abschnitt (vor Korrektur); `state/plan-v1-f7-result-evaluator.md` Design-Entscheidung 2.
Auswirkung: gering hier (vor jedem Bau erkannt und korrigiert, kein Code auf der falschen Signatur aufgesetzt), aber ein wiederholtes Muster (siehe F-058): eine Advisor-Korrektur im Plan propagiert nicht automatisch in referenzierende Feature-Akten.
Maßnahme: in diesem Baudurchgang behoben (`features/F7/feature.md` Scope-Abschnitt auf die Planfassung nachgezogen). F-058s Maßnahme (Konvention: Referenzstellen einer Korrektur im selben Schritt prüfen) bleibt die zutreffende Prozessregel — kein neuer Maßnahmenpunkt nötig, dieses Finding ist der zweite reale Beleg dafür.
Feature/Run: F7-Baudurchgang, 02.09.2026.

**F-064** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: AK4-Grep-Regel im F7-Gate hat dieselbe Schwächenklasse wie die bereits als F-060 erfasste AK14-Regel.
Beschreibung: Reviewer-Pass (frischer Kontext, 02.09.2026) auf `scripts/check-f7-result-evaluator.mjs`: das Muster `/\.(includes|match|indexOf|search|test)\(/` erkennt keinen `.exec(`-Aufruf einer Regex (`/ERFOLG/.exec(result)` leitet dieselbe Konsolentext-Ableitung ab wie `.test(`, wird aber nicht erfasst), keine `.startsWith(`/`.endsWith(`/Substring-Vergleiche (`result.slice(0,3) === 'ERR'`) und keine Bracket-Notation-Umgehung (`stdout['includes'](...)`). Der Selbsttest deckt nur die vom Regelautor selbst gewählten Verstoßformen ab — strukturell dieselbe Blindheit wie F-060 (ein Selbsttest kann nur die antizipierten Formen prüfen, keine anderen).
Fundstelle: `scripts/check-f7-result-evaluator.mjs`, AK4-Grep-Regel und Selbsttest; Vergleichsmuster F-060 (`scripts/check-f6a-claude-code-gateway.mjs`).
Auswirkung: kein aktueller Verstoß im real gebauten Code — die mechanische Absicherung künftiger Änderungen an `src/result-evaluator/*.ts` ist aber schwächer, als der Name „AK4-Selbsttest bestanden" suggeriert.
Maßnahme: Regel härten (`.exec(` ergänzen, ggf. `.startsWith(`/`.endsWith(`/Bracket-Notation) — idealerweise gemeinsam mit F-060 in einem Harness-Schritt, der beide Gates gleichzeitig auf ein gemeinsames, robusteres Muster hebt, statt jedes Feature-Gate einzeln nachzuziehen. Kein Blocker für den aktuellen Merge.
Feature/Run: F7-Baudurchgang, Reviewer-Pass, 02.09.2026.

**F-065** · `TECH_DEBT` · P3 · offen
Titel: `tool_input`→Tokens-Adapter (F7) tokenisiert nur das Feld `command`; andere String-Felder bleiben ein Einzeltoken, Array-/Objekt-wertige Felder werden übersprungen.
Beschreibung: `toolInputZuTokens` (`src/result-evaluator/index.ts`) tokenisiert am Leerzeichen ausschließlich das Feld `command`; jedes andere String-Feld (z. B. `query`) wird unverändert als ein einzelnes Token behandelt — ein mehrwortig eingebetteter Verbotswert in einem Nicht-`command`-Feld (z. B. `tool_input: { query: 'x --dangerously-skip-permissions y' }`) würde nicht erkannt. Nicht-String-Feldwerte (Arrays, verschachtelte Objekte, z. B. `{ args: ['echo', '--dangerously-skip-permissions'] }`) werden komplett übersprungen, nicht zerlegt. Für die drei real belegten TP-03d-`tool_input`-Formen irrelevant (keine davon nutzt Arrays oder mehrwortige Nicht-`command`-Felder).
Fundstelle: `src/result-evaluator/index.ts`, `toolInputZuTokens`.
Auswirkung: gering jetzt (keine reale Fixture verlangt es, E-186 ist ohnehin nur Zählung ohne Eskalation), wird relevant, falls künftige Werkzeugtypen mehrwortige Nicht-`command`-Parameter oder Array-/Objektparameter mit Sicherheitsrelevanz einführen.
Maßnahme: bei Bedarf erweitern (alle String-Felder tokenisieren, Array-Elemente rekursiv aufnehmen) — kein aktueller Auftrag, da keine reale Evidenz für die Notwendigkeit vorliegt (YAGNI).
Feature/Run: F7-Baudurchgang, Reviewer-Pass, 02.09.2026.

**F-066** · `TECH_DEBT` · P2 · offen
Titel: `pruefeAufrufparameter` (F4) erkennt einen Verbotswert nur als eigenständiges Token — ein ohne Wortgrenze angehängter Verbotswert (kein Leerzeichen-/Quoting-Trenner) bleibt ungezählt.
Beschreibung: QA-/Reviewer-Pass (frischer Kontext, 02.09.2026) auf F7: der neue `tool_input`→Tokens-Adapter deckt die drei realen TP-03d-Formen und den im Plan (Abschnitt 8.4) benannten Shell-Quoting-Einbettungsfall real ab (eigener Test, `bypass_verdacht_anzahl: 1`). Ein Verbotswert, der ohne jede Wortgrenze an ein anderes Token angehängt ist (z. B. `command: 'npm run test--dangerously-skip-permissions'`), bleibt jedoch ungezählt — `pruefeAufrufparameter` vergleicht exakte Tokens (`Array.includes`), keine Teilstrings. Das ist keine F7-spezifische Lücke, sondern eine Eigenschaft von F4s Vergleichssemantik selbst (`src/invocation-policy/verbotene-aufrufparameter.ts`), die durch F7s Adapter erstmals sichtbar wird. Eigener Testfall in `result-evaluator.test.ts` belegt dieses Verhalten jetzt explizit, statt es unverifiziert zu lassen.
Fundstelle: `src/invocation-policy/verbotene-aufrufparameter.ts` (`pruefeAufrufparameter`); sichtbar gemacht über `src/result-evaluator/index.ts` (`toolInputZuTokens`) und den Testfall „bekannte Grenze des tool_input-Adapters …" in `result-evaluator.test.ts`.
Auswirkung: gering — E-186 ist in F7 ohnehin nur Zählung ohne Eskalation (kein Aufrufer, der auf Vollständigkeit dieser Zahl angewiesen wäre); ein künftiges F8, das `bypass_verdacht_anzahl` als vollständiges Sicherheitssignal behandelt, würde diese Lücke erben.
Maßnahme: Änderung an F4s `pruefeAufrufparameter` (außerhalb des F7-Scopes, NICHT-Abschnitt des Vertrags verbietet F4-Änderungen in diesem Baudurchgang) — bei Bedarf eigener, kleiner F4-Nachtrag (Substring- oder Grenzzeichen-sensitive Prüfung), erst wenn ein realer Aufrufer auf Vollständigkeit angewiesen ist.
Feature/Run: F7-Baudurchgang, Reviewer-/QA-Pass, 02.09.2026.

**F-067** · `TECH_DEBT` · P2 · offen
Titel: `stelleLaufstatusFest` (F1B) zeigt bei zwei Terminal-Schreibvorgängen für dieselbe `laufId` das ERSTE, nicht das zuletzt geschriebene `ergebnis`.
Beschreibung: QA-Pass (frischer Kontext, 02.09.2026) auf F7: bei genau einer `run_prepared`-Marke gefolgt von zwei `terminal`-Marken paart die FIFO-Logik in `stelleLaufstatusFest` (`src/checkpoint-store/index.ts`) die einzige offene Sequenz mit dem ERSTEN Terminal; der zweite Terminal landet unpaariert in `terminaleOhneRunPrepared` (Diagnosefeld). Der über `status.ergebnis` sichtbare Wert bleibt damit der des ersten Aufrufs — ein Doppelaufruf „verschwindet nicht still" (der zweite Terminal ist über `terminaleOhneRunPrepared` sichtbar), aber ein Aufrufer, der naiv „letzter Schreibvorgang gewinnt" erwartet, würde das falsche `ergebnis` lesen. Neuer Testfall in `result-evaluator.test.ts` (F-067) belegt dieses Verhalten jetzt explizit.
Fundstelle: `src/checkpoint-store/index.ts`, `stelleLaufstatusFest`, FIFO-Paarungslogik.
Auswirkung: gering jetzt (F7 selbst hat laut Vertrag ausdrücklich keine eigene Idempotenzprüfung zu bauen, `state/tasks/f7-result-evaluator.md` CONTEXT), relevant für ein künftiges F8, das `klassifiziereLauf` möglicherweise wiederholt aufruft (z. B. bei einem Retry) und dabei „letzter Wert gewinnt" annehmen könnte.
Maßnahme: keine Änderung an F1B in diesem Baudurchgang (außerhalb des F7-NICHT-Scopes). Bei F8-Planung berücksichtigen: entweder `terminaleOhneRunPrepared` aktiv auswerten, oder F1B um eine explizite „letzter Terminal gewinnt"-Semantik erweitern, falls ein realer Wiederholungsfall auftritt.
Feature/Run: F7-Baudurchgang, QA-Pass, 02.09.2026.

**F-068** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Geräte-Brücke (`device_bash`) kann `npm run check`/`lint`/`typecheck` nicht ausführen — fehlende Linux-Plattform-Binärdateien für Biome/TypeScript.
Beschreibung: `node_modules` im Repo wurde unter Windows installiert (`stefans-laptop`, win32); die Geräte-Brücke läuft in einer separaten Linux-VM. `npx biome` bricht mit `Cannot find module '@biomejs/cli-linux-x64/biome'` ab, `npx tsc` mit `Unable to resolve @typescript/typescript-linux-x64`. `node --test` (reiner Node-Testrunner, keine plattformspezifischen nativen Binärdateien) läuft dagegen anstandslos — real geprüft im F7-Reviewer-Nachweis (86/86 Tests grün). Zusätzlich: `rm`/`rmdir` auf Testartefakte schlägt ohne vorherige `device_request_delete_permission`-Freigabe in EPERM fehl (jede Sitzung muss das neu anfordern).
Fundstelle: Geräte-Brücke gegen `~/Projekte/ai-workforce`, 02.09.2026; deckt sich mit der in `claude/100_UEBERGABE_NEUER_CHAT_18_F6A_ABGESCHLOSSEN_F7_GEPLANT.md` dokumentierten Beobachtung zu F6a WS2 (dort musste Stefan Lint/Typecheck manuell bestätigen).
Auswirkung: Eine Challenger-Sitzung kann `npm run check` über die Brücke nie vollständig eigenständig nachvollziehen — nur den Testrunner-Teil. Für Lint/Typecheck bleibt die bauende Terminalsitzung (Stefans Maschine, korrekte Plattform-Binärdateien) die einzige maßgebliche Quelle.
Maßnahme: Kein Fix nötig/möglich (Plattformgrenze der Brücke) — als bekannte Grenze für künftige Challenger-seitige Verifikationen dokumentieren: Testrunner-Teil selbst nachprüfen, Lint-/Typecheck-Ergebnis aus der bauenden Sitzung übernehmen, nicht wiederholen versuchen.
Feature/Run: F7-Reviewer-Nachprüfung (Challenger-Sitzung), 02.09.2026.

**F-057** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Subprozessstart des Claude-Code-Gateways muss Argv-Array nutzen, nicht Shell-String.
Beschreibung: F6a (`src/claude-code-gateway/index.ts`) liefert den Aufruf bereits als Tokens-Array (`baueAufruf`). WS2/WS3 (Prozessstart, noch nicht gebaut) darf dieses Array beim tatsächlichen Subprozessstart nicht zu einem Shell-Kommandostring zusammenfügen (z. B. `child_process.exec`/`execSync` mit interpoliertem String) — dynamischer Prompt-Inhalt im `-p`-Argument könnte sonst über Shell-Metazeichen (`;`, Backtick, `$()`, Anführungszeichen-Escape) aus dem beabsichtigten Einzelbefehl ausbrechen. Node bietet mit `child_process.execFile`/`spawn` samt Argv-Array einen Weg, der den Shell-Parser vollständig umgeht.
Fundstelle: `src/claude-code-gateway/index.ts` (`baueAufruf`, liefert `AufrufTokens`), noch kein Subprozessstart-Code vorhanden (WS2/WS3 offen).
Auswirkung: real erst mit dem WS2-Bau — ohne diese Vorgabe könnte ein einziger Fehlgriff (Shell-String statt Argv-Array) E-182 faktisch aushöhlen, unabhängig davon, wie sorgfältig `pruefeAufrufparameter` selbst geprüft hat.
Maßnahme: In plan-v1 für WS2 als bindende Design-Entscheidung aufnehmen: Subprozessstart ausschließlich über `execFile`/`spawn` mit Argv-Array, nie über eine shell-interpretierte Kommandozeile. Kein eigener Vertrag nötig — normale Vorgabe im WS2-Plan.
Feature/Run: Challenge F-030 (Reprüfung), im Zuge von F6a, 31.08.2026.

**F-072** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger-Sitzungen liefern Verträge aus, ohne sie gegen `scripts/check-contract.mjs` zu prüfen.
Beschreibung: Der Vertrag `f6a-ws4-windows-prozessstart` war inhaltlich vollständig, aber im falschen Format — neun Befunde, CI rot, obwohl das prüfende Skript seit Langem existiert und das Format in `.claude/skills/handoff-vertrag/SKILL.md` festgeschrieben ist. Die Prüfung fand erst in CI statt, nach Branch, Commit und PR. Ein vorangestellter HTML-Kommentar (`<!-- Ziel-Pfad im Repo: … -->`) hätte allein schon die `SCHRITT 0`-Präambelprüfung ausgelöst.
Fundstelle: `scripts/check-contract.mjs`, `.claude/skills/handoff-vertrag/SKILL.md`; Vorfall PR #48, 02.09.2026.
Auswirkung: ein vermeidbarer roter CI-Lauf plus Amend/Force-Push pro Vertrag; bei mehreren Verträgen je Feature ein wiederkehrender Reibungsposten.
Maßnahme: Eine Sitzung, die einen Vertrag nach `state/tasks/` schreibt, prüft ihn vor der Übergabe mechanisch (`node scripts/check-contract.mjs`). Zusätzlich prüfenswert: `check-contract.mjs` in einen Pre-Commit-Hook hängen, damit das Format nicht erst in CI auffällt.
Feature/Run: WS4-Vertragsübergabe, 02.09.2026.

**F-073** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger hat eine Abwesenheit aus einem einzigen Ort geschlossen und daraus eine Vertragsprämisse gemacht.
Beschreibung: Der WS4-Vertrag behauptete in CONTEXT „keine native `claude.exe`" — belegt allein dadurch, dass `C:\Users\stefa\.local` nicht existiert. Real liegt die native Binary im `bin`-Verzeichnis des npm-Global-Pakets (`bin/claude.exe`, PE32+, 218.507.936 Bytes). Die naheliegende Gegenprobe (`bin`-Feld der `package.json` lesen) wurde nicht gemacht, obwohl der Vertrag genau diese Messung für Messschritt M vorschrieb — nur eben erst nach der Prämisse. Die bauende Sitzung hat korrekt eskaliert statt auszuweichen; behoben über Nachtrag 1 zum Vertrag.
Fundstelle: `state/tasks/f6a-ws4-windows-prozessstart.md`, CONTEXT-Abschnitt und Nachtrag 1; Messschritt-M-Bericht vom 02.09.2026.
Auswirkung: E1 wurde auf einer falschen Grundlage formuliert; ein Vertragsnachtrag war nötig. Kein Schaden, weil die ESCALATE-Klausel griff — genau dafür war sie da.
Maßnahme: Eine Abwesenheitsaussage gehört nur dann als `[Fakt]` in einen Vertrag, wenn sie an der Stelle gemessen wurde, an der die Sache normalerweise liegt — bei npm-Paketen also am `bin`-Feld, nicht an einem vermuteten Installationspfad. Andernfalls als `[Offene Unsicherheit]` formulieren.
Feature/Run: WS4 Messschritt M, 02.09.2026.

**F-074** · `TECH_DEBT` · P2 · offen
Titel: Werkzeugversion driftet weiter — `state/tp-nachtrag.md` ist als E-188-Quelle nicht belastbar.
Beschreibung: In WS4 real gemessen: `2.1.258 (Claude Code)`. `state/tp-nachtrag.md` hält `2.1.241` (CLI) und `2.1.250` (VSCode-Extension). Dritter abweichender Wert. E-188 nennt die Version des Ausführungswerkzeugs als Bestandteil des Gültigkeitsschlüssels.
Fundstelle: `state/tp-nachtrag.md`; `state/gates.md`, WS4-Eintrag (Messschritt M), 02.09.2026.
Auswirkung: Ein aus Dokumentation gelesener Versionswert erzeugt einen falschen Gültigkeitsschlüssel und damit eine Prüfung, die formal besteht, ohne etwas zu belegen.
Maßnahme: `werkzeugVersionDeklariert` stammt immer aus einer Messung zum Laufzeitpunkt, nie aus `tp-nachtrag.md`. Relevant für die F8-Planung: wer misst, wann, und was passiert bei Abweichung gegen den gepinnten Schlüssel.
Feature/Run: WS4 Messschritt M, 02.09.2026.

**F-076** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Git-Kommandos über die Geräte-Brücke hinterlassen eine stale `.git/index.lock` und blockieren Stefans Terminal.
Beschreibung: Die Challenger-Sitzung hat `git status`/`git diff` über die Geräte-Brücke (`device_bash`) im echten Arbeitsverzeichnis ausgeführt. Git legt dabei `.git/index.lock` an; die Brücke darf Dateien standardmäßig nicht löschen („Operation not permitted"), also bleibt die Lock-Datei liegen. Jeder nachfolgende schreibende Git-Befehl in Stefans Terminal scheitert mit „Unable to create '.git/index.lock': File exists" — im Vorfall gleich drei Befehle hintereinander (`add`, `commit`, `push`), gefolgt von einem irreführenden `error: src refspec … does not match any`.
Fundstelle: Vorfall 03.09.2026, nach dem F-072/F-073/F-074-Nachtrag; Warnung „unable to unlink … index.lock: Operation not permitted" in der Brückenausgabe.
Auswirkung: Stefans Terminal ist blockiert, bis er die Lock-Datei manuell entfernt. Die Fehlermeldung nennt fälschlich einen laufenden Git-Prozess und führt damit in die Irre.
Maßnahme: Sitzungen, die über die Geräte-Brücke arbeiten, führen dort **keine** Git-Kommandos aus — Lesen und Prüfen ja (`cat`, `grep`, `sed`, `wc`), Git nein. Git läuft ausschließlich in Stefans eigenem Terminal. Für Diffs gegen `origin/main` gibt die Sitzung stattdessen einen Terminalbefehl aus und liest die Ausgabe. Falls eine Sitzung doch Git braucht: vorher Löschrechte für den Ordner anfordern, sonst bleibt jede Lock-Datei liegen.
Feature/Run: F6a WS4, Findings-Nachtrag, 03.09.2026.

**F-079** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Verbindliche Auflage lebt nur in einem Feature-Journal, nicht im Findings-Register.
Beschreibung: Die D16-analoge Schreibschutz-Auflage für den Wirksamkeitsnachweis-Ablageort stand ausschließlich in `features/F4/journal.md` (Nachtrag plan-v2 Delta 2) und im Schema-`description`. Grep über `state/findings.md` nach „Ablageort": null Treffer. Eine Sitzung, die nur das Register liest, übersieht sie.
Fundstelle: `features/F4/journal.md`; `state/findings.md`.
Auswirkung: mittel — die Auflage wurde in Übergabe 101 und 103 beide Male nicht erwähnt.
Maßnahme: Auflagen, die eine spätere Entscheidung binden, gehören zusätzlich ins Register, nicht nur ins Journal.
Feature/Run: Challenge F6b, 03.09.2026.

**F-082** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger-Sitzung hat Findings im Chat definiert, aber nicht in einem lesbaren Ort persistiert — Muster wie F-072/F-073/F-076.
Beschreibung: F-077 und F-079 wurden im F6b-Challenge im Chat-Text ausgegeben und per ID referenziert, ihr Volltext stand aber weder in `claude/104_CHALLENGE_F6B_SCHREIBWIRKUNG.md` noch sonst im Projekt/Repo. Die bauende Sitzung (WS-B) konnte die IDs deshalb nicht auflösen und musste zurückfragen.
Fundstelle: `claude/104_CHALLENGE_F6B_SCHREIBWIRKUNG.md`, `claude/105_F6B_ENTSCHEIDUNGEN_UND_WORKSTREAM_SCHNITT.md`.
Auswirkung: ein vermeidbarer Rückfrage-Zyklus vor jedem Commit, in dem ein Handoff-Dokument Finding-IDs referenziert, deren Volltext nicht mitgeliefert wurde.
Maßnahme: Jedes Finding, das in einem Handoff-Dokument per ID referenziert wird, bekommt seinen vollen Register-Text im selben Dokument mit.
Feature/Run: Challenge F6b / WS-B, 03.09.2026.

**F-084** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Git-Schreibzugriffe auf `ai-workforce` über die Desktop-Bridge sind unzuverlässig (Unlink-/Lock-Berechtigungsfehler) — wiederholt aufgetreten trotz dokumentierter Gegenmaßnahme.
Beschreibung: Bei drei Reviews (WS-D, WS-E, WS-F) hat ein `git checkout`/`merge`/`pull` über die Bridge einen hängenden `.git/index.lock` bzw. `.git/ORIG_HEAD.lock` hinterlassen (Netzwerk-Mount-Unlink-Semantik), der Stefans eigenes Terminal danach blockierte.
Fundstelle: Review-Sitzungen 03.09.2026 (WS-D, WS-E, WS-F), `mcp__remote-devices__device_bash` gegen `C:\Users\stefa\Projekte\ai-workforce`.
Auswirkung: Kein Datenverlust (Inhalt jedes Mal hash-verifiziert identisch), aber wiederholter manueller Korrekturaufwand für Stefan.
Maßnahme: Reviewer-Zugriffe über die Bridge sind ausschließlich `fetch`/`show`/`log`/`diff`/Hash-Vergleich. Jeder Branch-Sync (`checkout main`, `merge`/`pull`/`reset --hard origin/main`) geht als Terminalbefehl an Stefan, nie als eigener Bridge-Aufruf.
Status: offen (Verhaltensänderung der Challenger-Rolle aktiv seit 03.09.2026)
Feature/Run: F6b WS-D/WS-E/WS-F Reviews, 03.09.2026.

**F-086** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Bauauftrag 108 (F6b WS-G) widersprüchlich zwischen CONTEXT und SCOPE-Punkt 2 bei der Referenzquelle für startfreigabe.
Beschreibung: CONTEXT beschrieb state/aktuelle-autorisierung.json als von starteGateway selbst gelesene Pfad-Konstante; SCOPE-Punkt 2 verlangte zusätzlich ein startfreigabe-Feld in GatewayEingaben, über das der Aufrufer dieselben Referenzen mitliefert. Claude Code ist während der Umsetzung darauf gestoßen und hat korrekt eskaliert statt eigenmächtig zu entscheiden. Entschieden: starteGateway liest die Datei selbst, kein Feld in GatewayEingaben (Sicherheitsgrund: kein Aufrufer soll die geprüfte Autorisierung selbst bestimmen können).
Fundstelle: claude/108_F6B_WS_G_BAUAUFTRAG.md, CONTEXT vs. SCOPE Punkt 2.
Auswirkung: kein Schaden (Eskalation griff), unnötige Rückfrage.
Maßnahme: Bauaufträge vor Vergabe auf Konsistenz zwischen CONTEXT und SCOPE prüfen, insbesondere bei sicherheitsrelevanten Schnittstellen.
Status: gelöst · Feature/Run: F6b WS-G, 03.09.2026.

**F-090** · `TECH_DEBT` · P1 · offen, zurückgestellt (E-192)
Titel: Drei-Ebenen-Zustandsmodell (Workstream → Execution → Lauf, §16.8 Punkt 6 / A4) existiert im Kern nicht und wird in Fassung 1 bewusst nicht gebaut.
Beschreibung: Grep über `src/` findet keine Workstream- oder Execution-Identität; `src/checkpoint-store/` führt ausschließlich `laufId`. Die Zielfassung erklärt §16.8 Punkt 6 als geschlossen und weist dem Execution Controller zwei Automaten zu — beide Ebenen sind nie gebaut worden. Mit E-192 ist entschieden, sie in Fassung 1 auch nicht zu bauen.
Fundstelle: `docs/projekt/zielfassung.md:332`, `:381`; `src/checkpoint-store/types.ts`.
Auswirkung: Bewusste, dokumentierte Abweichung von einer als geschlossen geführten Architekturentscheidung. Wird teuer, falls sich später zeigt, dass eine Execution mehrere Läufe bündeln muss — der Checkpoint Store bekäme nachträglich eine zweite Identitätsachse, was Hash-Kette und Artefaktpfade berührt.
Maßnahme: Als P1-Schuld sichtbar halten. In `features/F8/feature.md` als ausdrückliches Nicht-Ziel benannt; `zielfassung.md` §16.8 Punkt 6 und §16.2 Zeile 332 bekommen den Zusatz „Automaten in Fassung 1 nicht implementiert (E-192)". Neu bewerten, sobald ein realer Mehr-Lauf-je-Execution-Fall auftritt.
M3-Relevanz: F15 (Workflow-Artefakt + Schritt-Automat) ist der in der Maßnahme genannte reale Mehr-Lauf-je-Execution-Fall — vor F15-WS-1 gegen das geplante WORKFLOW_V0-Datenmodell prüfen, ob eine zweite Identitätsachse (Schritt vs. Lauf) die bestehende Hash-Kette/Artefaktpfade berührt.
Feature/Run: Challenge F8, 04.09.2026.

**F-091** · `TECH_DEBT` · P2 · offen
Titel: F9s `haendigeAus` schreibt `run_prepared` — eine Eskalation unter der `laufId` des auslösenden Laufs kippt dessen Status zurück auf `KLAERUNG_ERFORDERLICH`.
Beschreibung: `haendigeAus` (`src/human-transport/index.ts:147`) schreibt bewusst eine `run_prepared`-Wirkungsmarke, weil die Außenwirkung mit dem Verlassen des Systems beginnt (D3). `stelleLaufstatusFest` (`src/checkpoint-store/index.ts:697`) paart `run_prepared` und `terminal` FIFO; eine zusätzliche, unpaarige `run_prepared` führt immer zu `KLAERUNG_ERFORDERLICH`. Löst F8 die E-186-Eskalation unter der `laufId` des bereits klassifizierten Laufs aus, gilt dieser Lauf danach als ungeklärt, obwohl er sauber klassifiziert wurde.
Fundstelle: `src/human-transport/index.ts:147`; `src/checkpoint-store/index.ts:697-740`.
Auswirkung: Ohne Klärung würde jede E-186-Eskalation den auslösenden Lauf scheinbar entwerten. Kein Datenverlust, aber ein falscher Statuswert an genau der Stelle, an der ein Sicherheitsverdacht gemeldet wird.
Maßnahme: F8 führt die Eskalation unter einer eigenen `laufId` und verbindet sie über die Lineage (F2) mit dem auslösenden Lauf. Als AK6 in `features/F8/feature.md` festgeschrieben, in plan-v1 real nachzuweisen.
Feature/Run: Challenge F8, 04.09.2026.

**F-092** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger-Handoffs referenzieren Claude-Projekt-Dokumente per Pfad, die für die bauende Sitzung nicht erreichbar sind — Muster wiederholt sich jetzt auf Dokumentebene, nicht nur bei einzelnen Finding-IDs.
Beschreibung: Im F8-Bauauftrag wurde `claude/110_CHALLENGE_F8_ENTSCHEIDUNGEN_UND_FEATURE_AKTE.md` zunächst nur als Pfadverweis übergeben. Die bauende Sitzung hat bestätigt, dass sie keine Claude-Projekt-Dokumente erreicht — nur was real im Repo liegt. Repo-seitig verifiziert: `claude/` enthält nur `65_...` und `66_...`, alle anderen 108 Dokumente (inkl. `109`, `110`) existieren ausschließlich im Claude-Projekt. Strukturell verwandt mit F-013 (Sync Repo→Projekt liefert nichts) und F-082 (Finding-IDs ohne Volltext) — dieselbe Grundursache, jetzt erstmals bei ganzen Handoff-Dokumenten.
Fundstelle: `claude/` (Repo, 2 von 110 Dateien vorhanden) vs. Claude-Projekt „AI Workforce" (alle 110); Vorfall F8-Feature-Akte, 04.09.2026.
Auswirkung: Jeder Bauauftrag mit reinem Pfadverweis auf ein Projekt-Dokument erzeugt einen vermeidbaren Rückfrage-Zyklus — zweiter Auftreten dieses Grundmusters in derselben Challenge-Runde.
Maßnahme: Generalisierung von F-082s Maßnahme: ein Bauauftrag darf sich auf ein `claude/*`-Projekt-Dokument nur per Pfad beziehen, wenn der relevante Volltext im selben Prompt mitgeliefert wird. Reiner Pfadverweis ist nur für nachweislich committete Pfade zulässig (`docs/`, `state/`, `features/`, `src/`).
Feature/Run: Challenge F8, Bauauftrag `features/F8/feature.md`, 04.09.2026.

**F-094** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: F2 hat kein dediziertes Lauf-zu-Lauf-Lineage-Primitiv — F8s Wiederaufnahme-/Eskalationsverweis (AK6/AK7) wiederverwendet F9s D2-Muster in einer neuen, noch nie geprüften Anwendung.
Beschreibung: `registriereKernArtefakt`s `eingaben: EingabeReferenz[]` (`src/lineage-registry/index.ts:85-114`) verlangt nur einen frei gewählten `pfad`-String, keine erzwungene Dateisystemsemantik — F9 nutzt das bereits für einen synthetischen `artefakt:<id>`-Schlüssel, aber ausschließlich für eine Referenz **innerhalb derselben `laufId`** (BEDARF_V0 → Transportpaket, `state/plan-v1-f9-human-transport.md` D2, dort per Advisor-Pass als „fachlich tragfähig" bestätigt, `state/advisor-findings-f9-human-transport.md`). `state/plan-v1-f8-execution-controller.md` Abschnitt 2.2/2.3 wendet dasselbe Muster erstmals **über eine `laufId`-Grenze hinweg** an (Eskalations-BEDARF_V0 referenziert `laufakte-<ausloesenderLaufId>`; der Wiederaufnahme-Kontextpaket referenziert `laufakte-<vorgaengerLaufId>`) — strukturell von F2 gedeckt (kein Code-Widerspruch), aber ohne eigene Prüfung dieser spezifischen Anwendung.
Fundstelle: `src/lineage-registry/index.ts:85-114`; `state/plan-v1-f8-execution-controller.md` Abschnitt 2.2/2.3/4 (D2), Abschnitt 10 Frage 1.
Auswirkung: gering — kein Blocker für plan-v1, aber ein echter, unentschiedener Punkt vor dem WS-2-Bauauftrag: ohne Advisor-Bestätigung bliebe der einzige Lineage-Beleg für AK6/AK7 ungeprüfte Neuware.
Maßnahme: Advisor-Pass auf `state/plan-v1-f8-execution-controller.md` mit explizitem Fokus D2 (Lauf-zu-Lauf-Anwendung), vor dem WS-2-Handoff-Vertrag.
Feature/Run: Planung F8 (plan-v1), 04.09.2026.

**F-093** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Feature-Akten-Status wird beim Abschluss eines Features nicht verlässlich nachgezogen.
Beschreibung: F-088 hat den Drift zwischen Feature-Akten-Status und realem Bauzustand bei F4/F6a/F7 aufgedeckt und behoben. Bei der Bereinigung stellte sich heraus, dass derselbe Drift unabhängig davon auch bei F0, F1 und F3 vorlag — alle drei standen weiterhin auf `READY_FOR_TECH`, obwohl längst gemergt und real abgeschlossen. Der Drift wurde beide Male nicht während des Baus bemerkt, sondern erst durch eine spätere, eigens dafür angesetzte manuelle Gegenprüfung entdeckt.
Fundstelle: `features/F0/feature.md:13`, `features/F1/feature.md:13`, `features/F3/feature.md:13` (vor Korrektur); `F-088`.
Auswirkung: Zweites Auftreten desselben Grundmusters — der Status-Drift ist kein Einzelfall, sondern ein strukturelles Loch im Abschluss-Schritt. Ohne Gegenmaßnahme ist ein drittes Auftreten (z. B. bei F2, F5, F9) wahrscheinlich.
Maßnahme: Statuswechsel der Feature-Akte auf `ABGESCHLOSSEN` als verbindlicher Bestandteil des Abschluss-Schritts, geprüft im selben Commit wie der letzte Bau-Commit des Features — nicht als spätere, separate Dokumentationskorrektur.
Feature/Run: Bereinigung F-088-Nachtrag (F0/F1/F3), 04.09.2026.

**F-095** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: plan-v2-f8-execution-controller.md ordnet Frage 4
(GatewayOptionen-Durchreichung) in der Zusammenfassung dem falschen
Workstream zu.
Beschreibung: Die Zusammenfassung von plan-v2 weist die aus plan-v1
Abschnitt 7 offene Frage 4 (Form der GatewayOptionen-Durchreichung)
„vor WS-2b" zu, obwohl sie laut plan-v1 Abschnitt 7 und
features/F8/feature.md unmittelbar AK8 betrifft, das WS-1 zugeordnet
ist. Im Vertrag state/tasks/f8-execution-controller-ws1.md wurde das
richtiggestellt (SCOPE Punkt 2, Widerspruch im CONTEXT-Abschnitt
dokumentiert) — plan-v2 selbst wurde nicht korrigiert.
Fundstelle: state/plan-v2-f8-execution-controller.md (Zusammenfassung),
state/tasks/f8-execution-controller-ws1.md SCOPE Punkt 2 / CONTEXT.
Auswirkung: Wer plan-v2 direkt liest (z. B. beim WS-2b-Vertrag), erbt
die falsche Zuordnung erneut. Gleiches Muster wie F-088/F-093:
Korrektur unten in der Kette statt an der Quelle.
Maßnahme: plan-v2-Zusammenfassung auf AK8/WS-1 korrigieren, bei
Gelegenheit (z. B. zusammen mit dem WS-2b-Vertrag).
Feature/Run: F8 WS-1-Vertrag, 04.09.2026.

**F-096** · `TECH_DEBT` · P2 · offen
Titel: D2 (artefakt:<id>-Pfadschlüssel über laufId-Grenze hinweg) als
„bereits durch F9 geprüft" abgetan, ohne Fundstelle in der Sollquelle.
Beschreibung: Advisor-Befund 7
(state/advisor-findings-f8-execution-controller.md) erklärt D2 für
erledigt mit Verweis auf ein angeblich bereits durch F9 geprüftes
Muster — ohne konkrete Fundstelle (Code, Test oder F9-Advisor-
Dokument). state/findings.md (laut F-036 die einzige Sollquelle)
enthält dazu keinen eigenen Eintrag.
Fundstelle: state/advisor-findings-f8-execution-controller.md
Befund 7; state/findings.md (kein Eintrag).
Auswirkung: Blockiert WS-1 nicht. Ein künftiger WS-2a-Vertrag würde
aber auf einer unbelegten Behauptung aufbauen.
Maßnahme: Vor dem WS-2a-Vertrag konkrete Fundstelle nachliefern (Code
oder F9-Advisor-Dokument); danach hier aufnehmen oder als erledigt
schließen.
Feature/Run: F8 Advisor-Pass / WS-1-Vertrag, 04.09.2026.

**F-097** · `TECH_DEBT` · P2 · offen
Titel: Laufübergreifende `pruefeStale`-Referenz wird still übersprungen, wenn der Aufrufer den Inhalt nicht liefert.
Beschreibung: `pruefeStale` berechnet nichts selbst. Fehlt der Eintrag in `aktuelleEingabeInhalte`, greift `if (aktuellerInhalt === undefined) continue` — die Referenz wird stillschweigend nicht geprüft statt zu scheitern.
Fundstelle: `src/lineage-registry/index.ts:222`.
Auswirkung: Ein laufübergreifender Lineage-Verweis in F8 WS-2a wäre ohne aktives Laden der fremden Laufakte eine stille Nicht-Prüfung.
Maßnahme: WS-2a-Vertrag bindet als AK: Eskalationslauf lädt die referenzierte Laufakte real und speist sie in `aktuelleEingabeInhalte` ein; Test für den laufübergreifenden Fall (erster im Repo).
Feature/Run: F8, Auflösung F-096, 04.09.2026.

**F-100** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Lesende Git-Befehle über die Remote-Devices-Bridge hinterlassen `.git/index.lock`.
Beschreibung: `git status` und `git fetch` aus der Bridge legen `.git/index.lock` an, können sie mangels Löschrecht nicht aufräumen und blockieren danach jede Git-Operation des Menschen.
Fundstelle: Challenger-Sitzung 04.09.2026; Wiederherstellung per `Remove-Item .git\index.lock`.
Auswirkung: Ein Pull des Menschen scheiterte, ein Branch wurde von der falschen Basis abgezweigt.
Maßnahme: Aus der Bridge nur `git log`, `git ls-tree`, `git ls-remote`, `git rev-parse` und `cat` verwenden.
Feature/Run: F8 WS-1-Vorbereitung, 04.09.2026.

**F-105** · `TECH_DEBT` · P2 · offen
Titel: `fuehreAufgabeDurch` wirft bei ungültiger `laufId` unbehandelt statt ein strukturiertes `AusfuehrungsErgebnis` zu liefern.
Beschreibung: QA-Pass (frischer Kontext, vor F8-WS-1-Commit) fand: eine leere, Steuerzeichen- oder Pfadzeichen-`laufId` (`/`, `..`, `\`) löst über `checkpoint-store/index.ts` `pruefeLaufId` eine ungefangene `Error`-Exception aus, die als rejected Promise aus `fuehreAufgabeDurch` nach außen dringt — anders als die zwei dokumentierten Abbruchzweige (`stufe:'kontextpaket'`/`stufe:'gateway'`), die strukturierte `{ok:false}`-Objekte liefern. Weder getestet noch in `features/F8/feature.md` Nicht-Ziele oder im Dateikopf von `src/execution-controller/index.ts`/`types.ts` als „technische Vorbedingung wirft" dokumentiert.
Fundstelle: `src/execution-controller/index.ts` (`fuehreAufgabeDurch`); `src/checkpoint-store/index.ts:75-84` (`pruefeLaufId`).
Auswirkung: kein WS-1-Blocker (laufId kommt bislang aus vertrauenswürdigen Aufrufern), aber ein für einen „von außen aufrufbaren Ablauf" (Zielsatz F8) realistischer Aufruferfehler ohne definiertes Verhalten.
Maßnahme: entweder im Dateikopf als bewusstes „wirft, kein Vertragszweig"-Muster dokumentieren (konsistent mit dem Rest des Projekts: technische Vorbedingung wirft, Geschäftsablehnung liefert Objekt), oder einen Testfall ergänzen, der das reale Wurfverhalten belegt.
Feature/Run: QA-Pass F8 WS-1 (frischer Kontext), 04.09.2026.

**F-106** · `TECH_DEBT` · P3 · offen
Titel: AK2 („Verweigert `starteGateway` den Start") ist am Controller nur über eine von vier genannten Verweigerungsquellen real getestet.
Beschreibung: QA-Pass fand: `features/F8/feature.md` AK2 nennt wörtlich vier Verweigerungsquellen von `starteGateway` — Aufrufparameter, Startziel, Autorisierung, Ist-Zustand. Am Controller (`execution-controller.test.ts`) ist nur die Aufrufparameter-Quelle (E-182) real durchgespielt. Die Rückgabeform (`{ok:false, grund: string}`) ist strukturell über alle vier Quellen identisch und der Controller verzweigt nicht nach Grund, was das Risiko einer stillen Regression senkt — ersetzt aber nicht den Nachweis, dass auch der eigentliche Startfreigabe-Ablehnungspfad (nicht nur der E-182-Vor-Check) unverändert durch den Controller hindurchgereicht wird.
Fundstelle: `features/F8/feature.md` AK2; `src/execution-controller/execution-controller.test.ts` (nur E-182-Fall); `src/claude-code-gateway/index.ts:255-267` (`pruefeStartfreigabe`-Ablehnungspfad, am Controller ungetestet).
Auswirkung: gering — strukturelles Passthrough-Argument deckt das Risiko weitgehend, aber nicht vollständig.
Maßnahme: bei Gelegenheit einen zusätzlichen Testfall ergänzen, der `pruefeStartfreigabe` (statt nur den E-182-Vor-Check) am Controller in ABGELEHNT laufen lässt (z. B. `wirksamkeitsnachweisReferenz` auf falschen Commit zeigen lassen, Muster bereits in `claude-code-gateway.test.ts` vorhanden).
Feature/Run: QA-Pass F8 WS-1 (frischer Kontext), 04.09.2026.

**F-107** · `TECH_DEBT` · P3 · offen
Titel: `starteGateway`-Aufruf in `execution-controller/index.ts` reicht `GatewayOptionen` feldweise statt strukturell durch — ein künftiges F6a-Optionsfeld würde still nicht mitgereicht.
Beschreibung: Code-Review-Pass (frischer Kontext, vor F8-WS-1-Commit) fand: `index.ts` listet die sechs Gateway-Optionsfelder (`schreiber, basisVerzeichnis, rohBasisVerzeichnis, starter, settingsPfad, aktuelleAutorisierungPfad, startfreigabeRepoWurzel`) einzeln auf, statt `optionen` strukturell durchzureichen. Da alle Felder in `GatewayOptionen` optional sind, würde ein künftig in F6a neu hinzugefügtes Optionsfeld hier ohne Typfehler still nicht weitergereicht — unterläuft die im Kopfkommentar von `types.ts` behauptete Garantie „unverändert an F5/F6a/F7/F1B durchgereicht" (D5).
Fundstelle: `src/execution-controller/index.ts:58-76`.
Auswirkung: gering, aber eine stille, vom Typchecker und vom Gate-Skript nicht gefangene künftige Regression gegen die eigene Dokumentation.
Maßnahme: entweder `optionen` direkt durchreichen (TS lässt überzählige Felder bei Variablen-Zuweisung zu) oder einen Kommentar/Test ergänzen, der bei neuen `GatewayOptionen`-Feldern aktiv auffällt.
Feature/Run: Code-Review-Pass F8 WS-1 (frischer Kontext), 04.09.2026.

**F-110** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: plan-v1 sagt AK4/AK6-Testfälle zu, ohne zu prüfen, ob eine passende Starter-Attrappe existiert.
Beschreibung: plan-v1 Abschnitt 2.2 benennt die AK4/AK6-Testfälle als selbstverständlich umsetzbar. Real existierten zum Zeitpunkt der Vertragserstellung nur zwei Attrappen (attrappeMitValidemErgebnis → ERFOLGREICH, attrappeOhneErgebnisobjekt → FEHLGESCHLAGEN) — keine erzeugte VERWEIGERT. Ohne die im WS-2a-Vertrag nachgetragene Fixture-Vorgabe hätte die bauende Sitzung entweder eine neue Attrappe in prozessstart.ts bauen müssen (D1-Verletzung) oder wäre steckengeblieben.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:122,134` (Stand vor WS-2a); `state/plan-v1-f8-execution-controller.md` Abschnitt 2.2/7.
Auswirkung: gering, real durch den Vertrag aufgefangen (Fixtures dort definiert, in der Testdatei statt in prozessstart.ts).
Maßnahme: Bei künftigen Plänen, die einen bestimmten Klassifikationsausgang testen wollen, vor der Vertragserstellung prüfen, ob eine passende Attrappe/Fixture bereits existiert.
Feature/Run: F8 WS-2a-Vertrag, 04.09.2026.

**F-112** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Übergabedokumente nennen origin/main-SHAs, die aus der Remote-Devices-Bridge nicht verifizierbar sind (F-100-Folgefehler, real eingetreten).
Beschreibung: claude/114 nannte origin/main = df4730d. Das lokale origin/main-Ref stand zu dem Zeitpunkt noch auf 4664b32 (F-100 verbietet git fetch aus der Bridge). Der WS-2a-Vertragscommit landete dadurch zuerst auf dem bereits über PR #65 gemergten Branch feat/f8-execution-controller-ws1, bevor ein manueller git fetch im Nutzerterminal den Widerspruch aufdeckte.
Fundstelle: Challenger-Sitzung 04.09.2026 (Branch-Korrektur vor PR #66).
Auswirkung: kein Datenverlust (Cherry-Pick auf korrekte Basis), aber ein realer Fehlversuch und ein Zwischenschritt, der ohne menschliches Terminal nicht auflösbar gewesen wäre.
Maßnahme: Übergabedokumente nennen den Basis-SHA zusammen mit der PR-Nummer, aus der er stammt. Vor dem ersten Commit einer Sitzung mit Bridge-Zugriff führt der Mensch git fetch im eigenen Terminal aus.
Feature/Run: F8 WS-2a-Vertrag, 04.09.2026.

**F-114** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Zwei Claude-Sitzungen haben real gleichzeitig in dasselbe Arbeitsverzeichnis geschrieben — Verstoß gegen „Ein Schreiber pro Arbeitsverzeichnis".
Beschreibung: Die Cloud-Sitzung (Technical Challenger, Zugriff über die Remote-Devices-Bridge) und eine zweite, lokale Bash-Sitzung (aus dem 🤖-PROMPT-Handoff für den WS-2a-Bau gestartet) haben unkoordiniert im selben Repo-Arbeitsverzeichnis committet. Die zweite Sitzung fand einen ihr unbekannten Commit (`3b68271`, Findings F-108–F-113) auf ihrem Branch und musste beim Menschen nachfragen, ob er echt ist.
Fundstelle: Branch `feat/f8-execution-controller-ws2a`, Commits `ac79ad3` und `3b68271`, gemergt als PR #67 (`853792f`), 04.09.2026.
Auswirkung: diesmal keine — orthogonale Dateien, kein Konflikt. Strukturell aber ein reales Kollisionsrisiko (Git-Index-Lock-Race, überschriebene Datei, stiller Verlust), nicht nur ein theoretisches.
Maßnahme: Vor jedem weiteren Schreibzugriff einer Cloud-Sitzung auf ein Arbeitsverzeichnis nach einem 🤖-PROMPT-Handoff klären, ob die ausführende Sitzung noch aktiv ist.
Feature/Run: F8 WS-2a, 04.09.2026.

**F-117** · `TECH_DEBT` · P3 · offen
Titel: `state/freigabe-commit.md`-Gate (`commit-guard.cjs`) sichert nur den Pfad über die lokale Claude-Code-CLI-Session ab, nicht Commits, die der Mensch direkt im Terminal ausführt.
Beschreibung: Der Hook blockt `git commit`/`git push` sowie jeden Bash-/Edit/Write-Zugriff auf die Freigabedatei ausschließlich innerhalb der lokalen Claude-Code-CLI-Session (PreToolUse-Hook auf deren eigenes Bash-Werkzeug). Führt der Mensch denselben Befehl direkt in seinem eigenen Terminal aus (wie in dieser Sitzung durchgehend praktiziert, 🖥️ TERMINAL-Konvention), greift dieses zweite Sicherheitsnetz nicht.
Fundstelle: `.claude/hooks/commit-guard.cjs` Dateikopf, Aufgabe 3/4; Technical-Challenger-Sitzung, WS-2b-Verifikation, 04.09.2026.
Auswirkung: keine akute — der Terminal-Pfad wird aktuell ausschließlich nach expliziter Freigabe im Chat genutzt (funktionierendes Ersatzverfahren). Die Datei täuscht aber ein einheitliches Schutzniveau vor, das für den Terminal-Pfad tatsächlich nicht besteht.
Maßnahme: bei Gelegenheit im Hook-Dateikopf oder in SETUP.md dokumentieren, dass das Freigabefenster nur den CLI-Session-Bau-Pfad absichert, nicht direkte Terminal-Commits.
Feature/Run: F8 WS-2b-Verifikation, 04.09.2026.

**F-120** · `BUG` · P2 · offen
Titel: Leitstand-Server bindet an alle Netzwerkschnittstellen statt Loopback.
Beschreibung: `server.listen(PORT, cb)` ohne Host-Argument → Node bindet 0.0.0.0/::.
Fundstelle: `scripts/leitstand-server.mjs:196`.
Auswirkung: Rein lesend geringfügig (Zustandspreisgabe im LAN). Mit Schreibpfad: fremdauslösbarer Prozessstart auf dem Entwicklerrechner.
Maßnahme: `server.listen(PORT, '127.0.0.1', …)`, als AK4 im Gate nachgewiesen.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-121** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Übergabedokumente behaupten „existiert bereits" ohne Nachweis am Artefakt.
Beschreibung: `claude/117` stützte eine Empfehlung auf ein UI-Polling, das es nicht gibt, und nannte sieben Eingabefelder, wo die Signatur vier Parameter hat.
Fundstelle: `public/leitstand/app.js:66-71`; `src/execution-controller/index.ts:82-87`.
Auswirkung: Eine Empfehlung wirkt aufwandsneutral, obwohl sie neuen Scope enthält — dieselbe Klasse wie F-112.
Maßnahme: Aussagen der Form „X existiert bereits" im Handoff mit Datei + Zeile belegen, analog zur bestehenden SHA-Regel.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-122** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: F-100 zum dritten Mal verletzt — `git status` aus der Bridge.
Beschreibung: Die Gegenchallenge-Sitzung eröffnete mit `git status --short`, bevor F-100 gelesen war. Folgenlos (keine `.git/index.lock` zurückgeblieben, geprüft), aber die dritte Wiederholung. F-118 hat für genau diesen Fall festgelegt: kein viertes Selbstversprechen.
Fundstelle: Gegenchallenge-Sitzung 04.09.2026; `state/findings.md` F-100, F-118.
Auswirkung: Wiederkehrender Prozessfehler mit real eingetretenem Folgeschaden (F-112).
Maßnahme: Technischer Guard — Git-Zugriff aus Bridge-Sitzungen nur über ein Wrapper-Skript, das die erlaubte Befehlsliste (`log`, `ls-tree`, `ls-remote`, `rev-parse`, `cat`) durchsetzt.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-123** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: F-100 zum vierten Mal verletzt — `git fetch` aus der Bridge, diesmal mit realem Schaden.
Beschreibung: Die Challenger-Sitzung (Gegenchallenge F10) führte nach Merge von PR #74 `git fetch origin` aus der Bridge aus, um den main-Stand zu verifizieren. Ergebnis: `.git/index.lock` wurde angelegt und war aus der Bridge nicht löschbar (`Operation not permitted`), zusätzlich eine Warnung `unable to unlink '.git/objects/.../tmp_obj_...'`. Blockierte danach jede Git-Operation im Nutzerterminal, bis Stefan den Lock manuell entfernt hat (`Remove-Item .git\index.lock`).
Fundstelle: `state/findings.md` F-100, F-118, F-122 (dieselbe Ursache, jetzt vierte Wiederholung); Gegenchallenge-Sitzung 04.09.2026, nach Merge PR #74.
Auswirkung: Erster real eingetretener Arbeitsausfall aus dieser Fehlerklasse (F-100/F-118/F-122 waren bisher folgenlos oder nur PR-Verwechslungen). Bestätigt, dass eine wiederholte Selbstverpflichtung („kein git fetch aus der Bridge") die Praxis real nicht verhindert.
Maßnahme: F-118/F-122s Empfehlung eines technischen Guards ist jetzt nicht mehr optional. Vorschlag: ein Wrapper-Skript/Alias, das aus erkennbaren Bridge-Sitzungen (z. B. über eine Umgebungsvariable oder den Arbeitsverzeichnis-Pfad `/sessions/.../mnt/...`) nur log/ls-tree/ls-remote/rev-parse/cat zulässt und alles andere (fetch/pull/status/commit/push) hart verweigert, statt sich auf Rollenverhalten zu verlassen.
Feature/Run: Gegenchallenge F10, 04.09.2026.

**F-125** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: device_bash-VM (Remote-Devices-Bridge) hat plattformfremde native Binaries im gemounteten node_modules.
Beschreibung: `npm run check` schlägt in der Bridge-VM mit MODULE_NOT_FOUND @biomejs/cli-linux-x64 bzw. "Unable to resolve @typescript/typescript-linux-x64" fehl — node_modules wurde unter Windows installiert, die Linux-VM kann die nativen Anteile nicht nutzen.
Fundstelle: Bridge-Sitzung 06.09.2026, F-124-Fix-Verifikation.
Auswirkung: Verifikation über die Bridge kann Lint/Typecheck nicht selbst laufen lassen, nur node --test und die reinen .mjs-Gate-Skripte. Deckt Logikfehler ab, keine Typ-/Lint-Fehler.
Maßnahme: Kein Produktcode-Fix nötig; bekannte Grenze der Bridge-Verifikation, bei Freigaben auf Stefans echten `npm run check`-Lauf verlassen.
Feature/Run: F-124-Fix-Verifikation, 06.09.2026.

**F-126** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Fünfte Verletzung von "aus der Bridge nur lesende Git-Befehle" (F-100/F-118/F-122/F-123), folgenlos.
Beschreibung: Eine Bridge-Sitzung hat git fetch, git checkout, git pull --ff-only, git branch und git reset --hard ausgeführt. Kein Schaden (kein .git/index.lock, git status danach sauber), aber die fünfte dokumentierte Wiederholung derselben Fehlerklasse.
Fundstelle: state/findings.md F-100, F-118, F-122, F-123; Sitzung 06.09.2026.
Auswirkung: Wiederkehrender Prozessfehler; zweimal folgenlos, zweimal mit realem Schaden (F-112, F-123). Reine Selbstverpflichtung verhindert das Muster nachweislich nicht.
Maßnahme: Den in F-118/F-122/F-123 vorgeschlagenen technischen Guard (Wrapper/Alias, der aus der Bridge nur log/ls-tree/ls-remote/rev-parse/cat zulässt) vor Beginn von Meilenstein 2 umsetzen.
Feature/Run: F-124-Verifikation/M1-Abschluss, 06.09.2026.

**F-129** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: "Meilenstein 2" existierte in der Sollquelle nicht.
Beschreibung: docs/projekt/zielfassung.md §13 kannte nur Fassung 1 mit Meilenstein 1; umsetzungsplan-fassung-1.md Abschnitt 1 nannte M1 "einziger für Fassung 1" und ordnete die M2-Inhalte Deliverable 5 zu.
Fundstelle: docs/projekt/zielfassung.md §13, docs/projekt/umsetzungsplan-fassung-1.md Abschnitt 1/2.
Auswirkung: Ohne Nachtrag Drift zwischen Chat-Planung und Repo — die Fehlerklasse, die P5/E-073 verhindern sollen.
Maßnahme: dieser Doku-PR.
Feature/Run: M2-Challenge, 06.09.2026.

**F-131** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Bauauftrag enthielt einen Einfüge-Platzhalter statt des Volltexts.
Beschreibung: Der Auftrag zur Aktenanlage enthielt an der Stelle des Akten-Volltexts den Platzhalter `<<<HIER DEN VOLLTEXT AUS ABSCHNITT 1 VON claude/122 EINFÜGEN>>>`. Die bauende Sitzung musste zurückfragen, der Volltext wurde manuell nachgereicht.
Fundstelle: Challenger-Chat, Auftrag 1 zur M2-Sollquelle, 06.09.2026.
Auswirkung: ein vermeidbarer Rückfragezyklus; identische Familie wie F-013, F-082, F-092, F-100 — die Volltext-Regel wurde formal eingehalten (Volltext lag im Projektdokument), aber nicht im Prompt selbst.
Maßnahme: Prompts an Claude Code nie mit Einfüge-Platzhaltern ausgeben. Der für den Auftrag relevante Volltext steht direkt im Prompt-Block, auch wenn er lang ist.
Feature/Run: F11-Aktenanlage, 06.09.2026.

**F-132** · `TECH_DEBT` · P3 · offen
Titel: auftrag_id folgt nicht derselben Zeichenregel wie laufId.
Beschreibung: src/auftrag/index.ts prüft auftrag_id nicht gegen dieselbe Zeichenklasse wie checkpoint-store's laufId-Regel (LAUFID_UNZULAESSIGE_ZEICHEN-Äquivalent) — ein auftrag_id-Wert mit Leerzeichen/Sonderzeichen würde erst beim Dateisystemzugriff auffallen, nicht vorab.
Fundstelle: src/auftrag/index.ts (validiereAuftragDaten); src/checkpoint-store/index.ts (pruefeLaufId).
Auswirkung: gering — bislang kein realer Fehlschlag, da auftrag_id serverseitig bisher immer aus derselben Quelle wie laufId erzeugt wurde.
Maßnahme: bei nächster Berührung von src/auftrag/index.ts dieselbe Zeichenregel per D5 wiederverwenden statt eigenständig zu lassen.
Feature/Run: F11 WS-1 Advisor-Pass, 06.09.2026.

**F-133** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: node --test schlägt in der Remote-Devices-Bridge-VM systematisch mit EPERM bei der Testfixture-Bereinigung fehl.
Beschreibung: node --test in der Bridge-VM meldet EPERM: operation not permitted, unlink ... beim rimrafSync-Cleanup unter dem Windows-gemounteten Arbeitsverzeichnis (85/137 bzw. 14/? Fehlschläge je nach Lauf) — 0 AssertionError darunter, ausschließlich Cleanup-Rauschen, bestätigt durch gezielten Re-Lauf der betroffenen Testdateien.
Fundstelle: Bridge-Sitzung, F11-WS-1-Verifikation, 06.09.2026.
Auswirkung: Verifikation über die Bridge kann node --test nicht als alleinigen Nachweis nutzen; reine .mjs-Gate-Skripte plus Stefans eigener Windows-Lauf bleiben maßgeblich (wie F-125).
Maßnahme: kein Produktcode-Fix; dokumentierte Grenze der Bridge-Verifikation.
Feature/Run: F11 WS-1 Verifikation, 06.09.2026.

**F-134** · `TECH_DEBT` · P2 · offen
Titel: Lauf→Auftrag-Lineage-Verweis zum zweiten Mal zurückgestellt.
Beschreibung: Der WS-1-Plan stellte den Lineage-Verweis "welcher Auftrag hat diesen Lauf ausgelöst" auf WS-2 zurück (nicht ohne Eingriff in F6as starteGateway/GatewayEingaben erreichbar). WS-2 baut ihn ebenfalls nicht — kein AK in F11 verlangt ihn.
Fundstelle: state/plan-v1-f11-auftrag-ws1.md Abschnitt 2 (Frage 2); features/F11/journal.md (WS-2-Eintrag).
Auswirkung: kein Blocker für F11. Wird real gebraucht ab F12 (Laufliste/Detailansicht — "welcher Auftrag hat diesen Lauf ausgelöst").
Maßnahme: Design-Entscheidung spätestens bei F12-Planung treffen, nicht weiter stillschweigend verschieben.
Feature/Run: F11 WS-1/WS-2, 06.09.2026.
Nachtrag (06.09.2026): entschieden durch E-M2-4 (Lineage-Eingabe-Referenz `artefakt:auftrag-<auftragId>`, nach dem F8-WS-2b-Muster `vorgaengerLaufId`), F12 AK5 zugeordnet.

**F-135** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Neuer Testfall lief kurzzeitig real gegen kontrollzustand/ statt gegen eine Attrappe.
Beschreibung: Ein neuer AK7(D13)-Testfall in check-f10-leitstand.mjs überließ starteTestserver ohne fuehreAufgabeDurchFn-Attrappe (anders als jeder andere Testfall in der Datei) und lief dadurch real bis F4s Invocation Policy durch, die den Start korrekt mit E-188 verweigerte — aber vorher entstanden zwei echte Lineage-/Wirkungsmarke-Einträge unter dem echten kontrollzustand/. Vor Commit gefunden und entfernt (rm -rf kontrollzustand/check-f11-ak7-verwaist-neu-* und zugehörige lineage-kontextpaket-*), Testfall korrigiert.
Fundstelle: scripts/check-f10-leitstand.mjs (F11 AK7(D13)-Verwaist-Testfall).
Auswirkung: keine — vor Commit gefunden, kein Schaden an echtem kontrollzustand/, kein Kindprozess gestartet. Gleiche Fehlerklasse wie F-114 (zwei Schreiber im selben Zustand), hier selbst abgefangen statt real beobachtet.
Maßnahme: keine akute; als Erinnerung, dass jeder starteTestserver-Aufruf immer eine fuehreAufgabeDurchFn-Attrappe braucht (Konvention bereits in der Datei etabliert, hier einmalig verfehlt).
Feature/Run: F11 WS-2, 06.09.2026.

**F-139** · `TECH_DEBT` · P2 · offen
Titel: Rohereignisstrom ist über keine API erreichbar.
Beschreibung: `kontrollzustand-roh/<laufId>/rohstrom.json` ist gitignoriert und liegt außerhalb des Server-Lesebereichs; die Laufakte trägt jedoch bereits `rohstrom_referenz: { pfad, inhalts_hash }`.
Fundstelle: `src/claude-code-gateway/index.ts:298-309`; `kontrollzustand/lineage-laufakte-*/checkpoints/`.
Auswirkung: „was kam heraus" (exitCode, permission_denials) ist im Leitstand nicht sichtbar — Kernbestandteil des M2-Zielsatzes.
Maßnahme: F12 WS-3 (AK7/AK8) — Auflösung über die Laufakte mit Hash-Prüfung, Pfadsicherheit über F11s `loeseEvidenzPfadAuf`.
Feature/Run: F12-Challenge, 06.09.2026.

**F-140** · `TECH_DEBT` · P2 · offen
Titel: Vollprojektion des Kontrollzustands im 2-Sekunden-Poll.
Beschreibung: `/api/laeufe` validiert bei jedem Poll die komplette Hash-Kette jedes Verzeichnisses und liest für die Staleness-Prüfung referenzierte Dateien live von der Platte; der Aufwand wächst linear mit der Historie. Messung in der Bridge-VM über einen gemounteten Windows-Ordner: 3860/3528/3657 ms je Runde bei 28 Verzeichnissen und 35 Checkpoints, ohne Staleness und statSync. Der absolute Wert ist wegen der Mount-Latenz nicht belastbar, das Skalierungsverhalten schon.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleLaeufe`, `sammleCheckpoints`, `leseAktuelleEingaben`); `public/leitstand/app.js` (`POLL_INTERVALL_MS = 2000`).
Auswirkung: die Anzeige kann hinter dem Poll zurückbleiben; verschärft sich mit realer Nutzung.
Maßnahme: Listen- und Detailprojektion trennen (F12 AK2); nativen Wert bei Gelegenheit auf der Windows-Maschine messen, bevor weiter optimiert wird.
Feature/Run: F12-Challenge, 06.09.2026.

**F-141** · `BUG` · P3 · **entschieden**
Titel: Checkpoint-Zeitstempel stammen aus der Datei-mtime.
Beschreibung: `sammleCheckpoints` setzt `zeitstempel: statSync(pfad).mtime.toISOString()` statt der Zeit aus dem Artefakt; nach einem frischen Clone oder Checkout zeigt der Leitstand Checkout-Zeiten als Ereigniszeiten.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleCheckpoints`).
Auswirkung: Fehldarstellung des realen Zustands (§13.3-Messgröße) — klein, aber genau in der Zielmetrik.
Maßnahme: F12 AK3.
Feature/Run: F12-Challenge, 06.09.2026.
Maßnahme-Nachtrag: E-M2-5 (07.09.2026): optionales `erstellt_am` in Checkpoint-/Wirkungsmarke-Payload, additiv, bestehende Einträge bleiben gültig. Umsetzung in F12 WS-1 (`state/plan-v1-f12-ws1.md`).

**F-143** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Finding-ID in einem Claude-Code-Prompt referenziert, die nie im Repo committet wurde.
Beschreibung: Der Challenger-Chat hat in einem Auftrag „F-142 von offen auf entschieden setzen" verlangt, obwohl F-142 nur im Chat genannt und nie über einen eigenen Doku-Auftrag nach state/findings.md geschrieben wurde. Die bauende Sitzung hat es sinnvoll auf F-141 gemappt.
Fundstelle: Auftrag „docs(f12): E-M2-5, TECH_PLAN v1 WS-1" (PR #88).
Auswirkung: keine — korrekt aufgefangen, aber ein potenzieller Rückfrage-Zyklus (F-013-Klasse), der diesmal ausblieb.
Maßnahme: vor jedem Prompt, der eine Finding-ID referenziert, gegen den realen state/findings.md-Stand verifizieren, dass sie dort existiert.
Feature/Run: F12 WS-1 Vorbereitung, 07.09.2026.

**F-144** · `TECH_DEBT` · P3 · offen
Titel: Startvorlage-Feld 'modell' ungenutzt, Startformular hat eigenen hartkodierten Wert.
Beschreibung: `startvorlagen/*.json` deklariert ein `modell`-Feld, `validiereStartvorlageDaten` prüft es, aber `erzeugeRequestHandler` liest es nie. Das F12-WS2-Startformular (AK6) setzt stattdessen clientseitig `aufrufEingaben.modell = 'sonnet'` hartkodiert (`public/leitstand/app.js`). Zwei Quellen der Wahrheit, aktuell nur per Code-Kommentar dokumentiert.
Fundstelle: `public/leitstand/app.js` (Startformular-Submit-Handler), `startvorlagen/beispielprojekt.json` (`modell`-Feld), F12 WS-2.
Auswirkung: Ändert sich künftig das `modell`-Feld einer Startvorlage, hat das auf den geführten Start keine Wirkung — stille Divergenz.
Maßnahme: bei nächster Berührung vereinheitlichen (Formular liest `vorlage.modell` über `GET /api/startvorlage/werkzeugsaetze`, oder Feld bewusst als entkoppelt dokumentieren/entfernen).
Feature/Run: F12 WS-2, 07.09.2026.

**F-146** · `TECH_DEBT` · P2 · offen
Titel: `klassifiziereLauf` persistiert nur `wirkungsmarke.ergebnis` — `bypass_verdacht_anzahl`/`is_error`/`non_execution_kind`/der `FEHLGESCHLAGEN`-Grund gehen verloren.
Beschreibung: `src/result-evaluator/index.ts` (`ermittleErgebnis`) berechnet `bypass_verdacht_anzahl`, `is_error`, `non_execution_kind` und den `FEHLGESCHLAGEN`-Grund (`rohstrom_fehlt`/`rohstrom_integritaet`/`beobachtungsbasis_unvollstaendig`/`kein_ergebnisobjekt`) als `ErgebnisOhneWirkungsmarke`, aber `klassifiziereLauf` schreibt nur `{ ergebnis: teilergebnis.ergebnis }` in die terminale Wirkungsmarke (`schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: teilergebnis.ergebnis }, optionen)`) — der Rest des Teilergebnisses bleibt flüchtig, nur der reine Rückgabewert der Funktion trägt es, nicht die persistierte Kette.
Fundstelle: `src/result-evaluator/index.ts:125-134` (`klassifiziereLauf`), `76-123` (`ermittleErgebnis`).
Auswirkung: Aus der Laufkette ist nach Prozessende nur `wirkungsmarke.ergebnis` der `'terminal'`-Marke lesbar. F12 AK7 (Lauf-Detailansicht) kann die F7-Klassifikation im Leitstand deshalb nur auf dieses eine Feld reduziert zeigen — der Leitstand darf `klassifiziereLauf` nicht selbst aufrufen (F10-Invariante: kein Serverschreibzugriff auf `kontrollzustand/`) und die Klassifikationsregeln nicht nachbauen (D5), eine Behebung bräuchte zusätzliches Persistieren in Wirkungsmarke oder Laufakte.
Maßnahme: nicht in F12 WS-3 behoben (bewusstes Nicht-Ziel, kein zusätzliches Persistieren von Klassifikationsdetails in diesem Workstream). Bei Bedarf eigener kleiner Vertrag: Wirkungsmarke- oder Laufakte-Schema additiv um die übrigen Felder erweitern.
Feature/Run: F12-Challenge/WS-3-Planvorbereitung, 07.09.2026.

**F-148** · `TECH_DEBT` · P3 · offen
Titel: `GET /api/laeufe/<laufId>` prüft `istLaufkette` nicht — eine reine Artefaktkette liefert 200 statt 404.
Beschreibung: Der Detailendpunkt (`scripts/leitstand-server.mjs`) prüft nur `LAUFID_UNZULAESSIGE_ZEICHEN` und `existsSync(join(basisVerzeichnis, laufId))` — anders als `sammleLaeufe`/`sammleLaufKopfdaten`, die zusätzlich `istLaufkette` (mindestens eine Wirkungsmarke) verlangen (AK1). Eine reine Artefaktkette (z. B. `lineage-auftrag-<id>`, Verzeichnisname trägt den `lineage-`-Präfix) liefert dadurch `200` mit `checkpoints`/`laufStatus` statt `404`.
Fundstelle: `scripts/leitstand-server.mjs`, `GET /api/laeufe/<laufId>`-Handler.
Auswirkung: kein WS-1-Bug im Sinne der AK1-Abnahme (AK1 gilt für die Liste, nicht den Detailendpunkt; `feature.md` AK2 nennt für den Detailendpunkt nur „404 bei unbekannter laufId") und über die UI nicht erreichbar (das Detail-Panel öffnet nur aus bereits gefilterten Listeneinträgen). Über die rohe API weiterhin erreichbar.
Maßnahme: bewusst NICHT in F12 WS-3 behoben (Offene Frage 8 des WS-3-Plans, mit dem Plan entschieden) — nicht im Wortlaut von AK7/AK8/AK10, über die UI nicht erreichbar, eine saubere Behebung bräuchte einen zweiten `ladeGueltigeCheckpoints`-Aufruf oder eine zweite `istLaufkette`-Ableitung auf der bereits gesendeten Projektion (D5-Verstoß). Bei Bedarf eigener kleiner Vertrag.
Feature/Run: F12 WS-3-Planvorbereitung/Bauauftrag, 07.09.2026.

**F-150** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Verwaiste Remote-Branches und ein aus einem Challenger-Fehler entstandener Duplikat-Branch.
Beschreibung: `git ls-remote` zeigte vor dieser Runde ~30 bereits gemergte `docs/*`-Branches auf `origin`. Zusätzlich hat der Challenger-Chat vor dem WS-3-Plan-Auftrag einen Terminal-Block ausgegeben, der den bereits existierenden Branch `docs/f12-ws3-techplan` nicht kannte (kein vorheriges `git ls-remote`) und dadurch einen lokalen Duplikat-Branch `docs/f12-ws3-tech-plan` erzeugen ließ. Stefan hat ihn wieder gelöscht.
Fundstelle: Challenger-Sitzung 07.09.2026, vor dem WS-3-Bauauftrag.
Auswirkung: Branch-Liste unübersichtlich, Verwechslungsgefahr bei Merge-Bestätigungen.
Maßnahme: gemergte Branches nach PR-Merge zeitnah löschen (lokal und remote); im Challenger-Chat vor jedem vorgeschlagenen Branch-Namen `git ls-remote refs/heads/*` lesen statt einen Namen aus dem Gesprächsverlauf zu erinnern.
Feature/Run: F12 WS-3-Planvorbereitung, 07.09.2026.

**F-151** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Trotz F-100 und der dokumentierten Bridge-Regel erneut `git status`/`git branch` aus der Bridge ausgeführt — `.git/index.lock` blieb stehen.
Beschreibung: Der Technical-Challenger-Chat hat am 07.09.2026 vor der Verifikation von F12 WS-3 `git status` und `git branch --show-current` über die Remote-Devices-Bridge ausgeführt, obwohl sowohl F-100 als auch die eigenen Projektinstruktionen (Abschnitt „Bridge- und Git-Sicherheitsregel") diese Befehle explizit ausschließen (erlaubt: log, ls-tree, ls-remote, rev-parse, cat, diff, grep, show). Ergebnis: `.git/index.lock` blieb zurück, von der Bridge nicht löschbar — Stefan musste ihn manuell per `Remove-Item .git\index.lock` entfernen.
Fundstelle: Challenger-Sitzung 07.09.2026, unmittelbar vor Freigabe von F12 WS-3 zum Commit/Push.
Auswirkung: identisch zu F-100 — jede Git-Operation blockiert, bis der Lock manuell entfernt wird. Zeigt, dass die dokumentierte Regel allein Wiederholung nicht verhindert.
Maßnahme: [EMPFEHLUNG] die erlaubte Befehlsliste vor jedem Bridge-Verifikationsschritt als feste Checkliste behandeln statt aus dem Gedächtnis; für den hier üblichen Diff-/Log-basierten Verifikationsablauf reichen `log`/`diff`/`show`/`grep` durchgängig aus, `status`/`branch` werden nie gebraucht.
Feature/Run: F12 WS-3-Verifikation, 07.09.2026.

**F-152** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Messgröße "Fehldarstellungen = 0" ohne Phasentrennung nicht ehrlich messbar.
Beschreibung: §13.3 misst Terminalwechsel und manuell geöffnete Dateien in der Bedienphase, stellt Fehldarstellungen aber erst in der Verifikationsphase fest — diese Feststellung erfordert selbst eine Kreuzprüfung gegen kontrollzustand/. Ohne Phasentrennung ist mindestens eine der drei Zahlen zwangsläufig unehrlich.
Maßnahme: Protokollstruktur aus features/F12/nachweis-ws4.md für die Dogfooding-Phase übernehmen.
Feature/Run: F12 WS-4, 07.09.2026.

**F-153** · `TECH_DEBT` · P2 · offen
Titel: Leitstand nutzt fest startvorlagen/beispielprojekt.json.
Beschreibung: profiles/beispielprojekt.json ist die einzige Startvorlage; ein Lauf gegen das reale Projekt ai-workforce ist damit nicht startbar.
Auswirkung: kein AK9-Blocker, aber Blocker für die Dogfooding-Phase am realen Projekt.
Maßnahme: Startvorlage ai-workforce vor Beginn der Dogfooding-Phase nachziehen.
Feature/Run: F12 WS-4, 07.09.2026.

**F-154** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Bridge-Git-Sicherheitsregel zum zweiten Mal in Folge verletzt.
Beschreibung: git status über die Bridge ausgeführt, obwohl nur log, ls-tree, ls-remote, rev-parse, cat, diff, grep, show erlaubt sind. Zweiter Vorfall nach F-151, diesmal ohne bleibenden Schaden.
Auswirkung: fünf dokumentierte Vorfälle mit .git/index.lock, einmal mit realem Arbeitsausfall.
Maßnahme: technische statt rein dokumentarischer Absicherung prüfen — Dokumentation allein hat zweimal nicht gereicht.
Feature/Run: F12 WS-4, 07.09.2026.

**F-155** · `TECH_DEBT` · P3 · offen
Titel: Kein Schutz gegen Mehrfachklick auf "Starten" im Leitstand-Startformular.
Beschreibung: Fünf statt zwei Läufe im WS-4-Nachweis entstanden, alle real und valide. YAGNI-Rückstellung.
Maßnahme: Button während des laufenden POST deaktivieren, falls im Dogfooding erneut störend.
Feature/Run: F12 WS-4, 07.09.2026.

**F-156** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: F-152 bis F-155 wurden nicht ins Register übernommen.
Beschreibung: state/findings.md endete bei F-151, während claude/137 "Vollständiges Register: state/findings.md" behauptete. Vier Findings, davon eines P1 (Bridge-Regel, F-154), existierten nur außerhalb des Repos.
Auswirkung: die Findings-Regel verfehlt genau den Zweck, für den sie existiert — Findings bleiben im Chat.
Maßnahme: Register-Nachtrag als Pflichtschritt in die Übergaberoutine aufnehmen; nachgetragen mit PR docs/findings-f152-f155.
Feature/Run: Challenge F13, 07.09.2026.

**F-161** · `TECH_DEBT` · P3 · offen
Titel: werkzeugsatz bleibt in der Wiederaufnahme-Vorbelegung leer.
Beschreibung: baueWiederaufnahmeVorlage/initWiederaufnahmeBedienung (public/leitstand/app.js) belegt beim Wiederaufnahme-Formular alle rekonstruierbaren Felder vor, werkzeugsatz bewusst nicht — real geprüft: aus dem persistierten Zustand nirgends rekonstruierbar.
Auswirkung: Mensch muss werkzeugsatz bei jeder Wiederaufnahme erneut wählen.
Maßnahme: keine vorgesehen, außer der Wert wird künftig doch irgendwo mitgeführt.
Feature/Run: F13 WS-1, 07.09.2026.

**F-163** · `TECH_DEBT` · P3 · offen
Titel: Kein Lineage-Verweis für Entscheidungen der Art 'antwort'/'stale'.
Beschreibung: F13 WS-3 (AK5) registriert das entscheidung-<laufId>-Artefakt nur im art:'terminal'-Zweig; bei 'antwort'/'stale' bewusst zurückgestellt, weil der Folgelauf dort bereits über die Transportpaket-Kette (F9) verweist.
Auswirkung: keine bekannte reale Lücke, rein dokumentarisch nachgetragen.
Maßnahme: bei Bedarf (falls doch ein realer Klärfall mit art 'antwort'/'stale' eine Wiederaufnahme mit Lineage-Verweis braucht) erneut aufgreifen.
Feature/Run: F13 WS-3, 07.09.2026.

**F-164** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Findings-Register-Nachtrag bleibt Handarbeit — dritte Wiederholung.
Beschreibung: Wie schon bei F-151/F-154 (Bridge-Sicherheitsregel) zeigt sich erneut, dass eine rein dokumentarische Regel ohne technische Absicherung wiederholt verfehlt wird — F-156 hatte das für F-152 bis F-155 bereits einmal real belegt. Auch dieser Auftrag (F13 WS-4) musste den real vergebenen Findings-ID-Bereich (F-164 ff.) erst von Hand gegen state/findings.md prüfen, statt dass ein Gate das automatisch sicherstellt.
Auswirkung: ohne technische Absicherung bleibt jeder Findings-Nachtrag von der Disziplin der jeweiligen Sitzung abhängig.
Maßnahme: [EMPFEHLUNG] ein Gate, das im Code vorkommende F-\d+-Referenzen (Kommentare, Testnamen) gegen state/findings.md abgleicht und eine fehlende Registrierung meldet.
Feature/Run: F13 WS-4, 08.09.2026.

**F-165** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: F13-Workstream-Nummerierung in feature.md weicht vom real gebauten Verlauf ab.
Beschreibung: features/F13/feature.md listete AK5 unter WS-2 ("AK3, AK4, AK5, AK6, AK7"); real kam AK5 aber über einen eigenen, als "WS-3" betitelten PR (#100, Commit c7fc435) — WS-2 (PR #99) deckte real nur AK3/AK4/AK6/AK7 ab.
Auswirkung: die Workstream-Liste in feature.md war keine verlässliche Karte des realen Bauverlaufs mehr.
Maßnahme: Randnotiz in feature.md unter „Workstream-Liste" ergänzt (keine rückwirkende Umnummerierung).
Feature/Run: F13 WS-4, 08.09.2026.

**F-168** · `TECH_DEBT` · P2 · offen
Titel: art:'antwort' verwendet dieselbe laufId statt eskalationsLaufId(laufId).
Beschreibung: das art:'antwort'-Formular (renderEntscheidungBlock/initEntscheidungBedienung, public/leitstand/app.js) und der zugehörige POST /api/entscheidungen-Zweig (importiereAntwort) verwenden die laufId des ursprünglichen, blockierten Laufs (gewaehlteLaufId aus der Detailansicht) — die reale E-186-Eskalation läuft aber unter einer eigenen eskalationsLaufId(laufId) = `${laufId}-eskalation-<uuid>` (src/execution-controller/index.ts:106–108), unter der die transport-<...>-Kette tatsächlich liegt.
Auswirkung: real ungeprüft (kein E-186-Nachweisfall in AK8/AK9 vorgesehen, siehe F-159) — potenziell dieselbe Fehlerklasse wie F-166, aber für den selteneren E-186-Fall statt des häufigen VERWEIGERT-Falls.
Maßnahme: bewusst zurückgestellt (Nicht-Ziel von F13 WS-4) — bei Bedarf gesondert aufgreifen, sobald ein realer E-186-Nachweisfall ansteht.
Feature/Run: F13 WS-4, 08.09.2026.

**F-169** · `TECH_DEBT` · P2 · offen
Titel: Kein Schutz gegen Doppelklick bei den drei Entscheidungs-Buttons (terminal/antwort/kenntnisnahme).
Beschreibung: QA-Pass (F13 WS-4): initEntscheidungBedienung (public/leitstand/app.js) hat — anders als initAuftragFormular/initStartformular (Muster `if (button.disabled) return` / `button.disabled = true` / `finally { button.disabled = false }`) — keinen Disable-Guard für die Entscheidungs-Buttons. Zusätzlich verschwindet die Erfolgsmeldung sofort durch den automatischen `ladeLaufDetail`-Reload; bei 'kenntnisnahme' bleibt danach ein identisch leeres Formular sichtbar (keine neue Wirkungsmarke ändert den Laufstatus), was zu einem versehentlichen zweiten Absenden verleiten kann.
Auswirkung: mehrfache, harmlose aber unbeabsichtigte Zusatzversionen des entscheidung-<laufId>-Artefakts sind möglich; bei 'terminal'/'antwort' vorbestehend (WS-2), bei 'kenntnisnahme' neu durch WS-4 reproduziert (gleiches Muster, wie im Auftrag vorgegeben).
Maßnahme: [EMPFEHLUNG] alle drei Buttons auf das bestehende Disable-Guard-Muster umstellen; Erfolgsmeldung sichtbar halten, bis der Nutzer sie aktiv verlässt.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-170** · `TECH_DEBT` · P3 · offen
Titel: Begründungsfelder werden nicht getrimmt — eine reine Leerzeichen-Begründung wird akzeptiert.
Beschreibung: QA-Pass (F13 WS-4): pruefeEntscheidungsformular prüft bei 'terminal'/'stale'/'kenntnisnahme' nur `typeof !== 'string' || length === 0`, ohne `.trim()`; die Client-Textareas senden `.value` ebenfalls ungetrimmt.
Auswirkung: eine inhaltsleere Begründung (nur Leerzeichen) wird dauerhaft in der Lineage festgehalten — bei 'terminal' zusätzlich in daten.mensch_begruendung der Wirkungsmarke selbst — und unterläuft damit AK4 ("menschlich bezeugter Entscheidungstext").
Maßnahme: [EMPFEHLUNG] `.trim().length === 0` statt `.length === 0` prüfen, für alle drei Begründungsfelder einheitlich.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-171** · `TECH_DEBT` · P3 · offen
Titel: Ein zwischenzeitlich anderswo aufgelöster Klärfall zeigt im offenen Detail-Panel nur einen unerklärten 400.
Beschreibung: QA-Pass (F13 WS-4): ladeLaufDetail ist nicht Teil des 2-Sekunden-Polls — bleibt ein Detail-Panel offen, während derselbe Lauf über einen zweiten Tab/API-Aufruf entschieden wird, liefert ein anschließender Entscheidungsversuch im ersten Panel korrekt 400 (kein Dateninkonsistenz-Risiko), aber ohne Hinweis auf den geänderten Zustand oder automatisches Nachladen.
Auswirkung: UX-Verwirrung, keine Datenintegritätsverletzung — der Server bleibt in jedem Fall maßgeblich.
Maßnahme: [EMPFEHLUNG] bei 400 im Entscheidungsblock automatisch `ladeLaufDetail` erneut anstoßen statt nur den Fehlertext zu zeigen.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-172** · `TECH_DEBT` · P2 · offen
Titel: KLAERUNG_ERFORDERLICH ist strukturell ununterscheidbar von "Lauf läuft noch".
Beschreibung: QA-Pass (F13 WS-4, vorbestehend, nicht durch WS-4 verursacht, aber dieselbe Verzweigung betroffen): stelleLaufstatusFest (src/checkpoint-store/index.ts:702–757) liefert für eine offene RUN_PREPARED-Sequenz immer KLAERUNG_ERFORDERLICH — auch während `fuehreAufgabeDurch` für denselben Lauf noch aktiv läuft. Die In-Memory-laufAktiv-Sperre (D13) wird nirgends an GET /api/laeufe/<laufId> durchgereicht, und der Entscheidungs-POST bleibt bewusst ungesperrt (AK6). Ein Mensch könnte also während eines noch laufenden Prozesses eine vorzeitige art:'terminal'-Entscheidung schreiben.
Auswirkung: die spätere, echte Terminalmarke des Laufs würde als terminaleOhneRunPrepared-Waise landen, ohne den bereits von Hand gesetzten Status/das Ergebnis zu korrigieren — F-167 (dieser Workstream) schützt nur gegen "terminal auf bereits ABGESCHLOSSEN", nicht gegen diesen umgekehrten Fall.
Maßnahme: [EMPFEHLUNG] bei Bedarf gesondert aufgreifen — außerhalb des WS-4-Diffs entstanden, kein WS-4-Blocker.
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-173** · `TECH_DEBT` · P3 · offen
Titel: Auflösen eines Klärfalls über art:'terminal' (VERWEIGERT/FEHLGESCHLAGEN) zeigt sofort ein zweites, separates Kenntnisnahme-Formular für denselben Lauf.
Beschreibung: QA-Pass (F13 WS-4): renderEntscheidungBlock zeigt nach einer erfolgreichen art:'terminal'-Entscheidung mit Ergebnis VERWEIGERT (ohne Bypass-Verdacht) oder FEHLGESCHLAGEN sofort ein neues, leeres Kenntnisnahme-Formular — obwohl bereits ein entscheidung-<laufId>-Artefakt aus dem terminal-Zweig existiert und die menschliche Begründung dafür schon vorliegt (AK4 bereits erfüllt). Exakt die im Auftrag vorgegebene Bedingung (ABGESCHLOSSEN/VERWEIGERT ohne Bypass, ODER FEHLGESCHLAGEN → Kenntnisnahme-Formular), nur ohne Ausnahme für den Fall "gerade erst selbst terminal entschieden".
Auswirkung: unnötige doppelte Begründungsabfrage; keine Dateninkonsistenz (eine zweite Kenntnisnahme legt nur eine weitere harmlose Artefaktversion an).
Maßnahme: [EMPFEHLUNG] bei Bedarf prüfen, ob GET /api/laeufe/<laufId> künftig meldet, ob bereits ein entscheidung-<laufId>-Artefakt existiert, und die UI das Kenntnisnahme-Formular dann unterdrückt — eigener Workstream, da das eine neue Server-Projektion erfordert (über den WS-4-Vertrag hinaus).
Feature/Run: F13 WS-4 (QA-Pass), 08.09.2026.

**F-177** · `TECH_DEBT` · P2 · offen
Titel: zeitgrenzeMs ist durchgereicht, hat aber keinen Setzer im Realbetrieb
Beschreibung: AusfuehrungsOptionen.zeitgrenzeMs wird korrekt von F8 bis zu
starteProzess durchgereicht und ist als Body-Feld gesperrt
(VERBOTENE_OPTIONEN_FELDER). Kein Codepfad setzt den Wert. Über den Leitstand
gestartete Läufe haben damit weiterhin kein Timeout.
Fundstelle: scripts/leitstand-server.mjs:734 (einziger Treffer);
src/execution-controller/index.ts:258
Auswirkung: AK2 (F14) strukturell erfüllt, praktisch wirkungslos. Ohne
Auflösung ist der AK10-Nachweislauf nicht durchführbar.
Empfohlene Maßnahme: In F14 WS-4 die Herkunft festlegen (Vorschlag:
Startvorlage, konsistent zu werkzeugStartziel/berechtigungskontext, die seit
F11 WS-2 ebenfalls serverseitig von dort kommen).
Entdeckt bei: Verifikation F14 WS-1, 09.09.2026

**F-178** · `TECH_DEBT` · P3 · offen
Titel: TIMEOUT/maxBuffer-Abgrenzung hängt an undokumentiertem Node-Verhalten
Beschreibung: Die Unterscheidung stützt sich darauf, dass ein maxBuffer-
Überlauf fehler.killed !== true liefert — empirisch für die aktuelle
Node-Version geprüft, aber nicht dokumentiertes Verhalten. Bei einem
Node-Upgrade könnte ein Überlauf still als TIMEOUT klassifiziert werden.
Fundstelle: src/claude-code-gateway/prozessstart.ts:94-96, 131
Auswirkung: Fehlklassifikation nach Node-Upgrade. Durch bestehenden
Regressionstest abgefangen — kein Betriebsrisiko, solange npm run check vor
einem Upgrade läuft.
Empfohlene Maßnahme: Keine Codeänderung. Beim nächsten Node-Upgrade gezielt
gegenprüfen.
Entdeckt bei: Verifikation F14 WS-1, 09.09.2026

**F-180** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Scratch-Ordner "Claude outputs/" außerhalb der Repo-Konventionen
Beschreibung: Enthält Duplikate bereits committeter F13-Nachweise
(nachweis-ws3.md identisch mit features/F13/nachweis-ws3.md). Kein Bezug zu
docs/, state/, features/, nachweis/.
Fundstelle: Claude outputs/nachweis-ws3.md, Claude outputs/nachweis-ws4.md
Auswirkung: Gering — nur relevant, wenn erneut versehentlich mitcommitet.
Empfohlene Maßnahme: Bei Gelegenheit lokal aufräumen oder Ordner in
.gitignore aufnehmen. Kein aktiver Handlungsbedarf.
Entdeckt bei: Verifikation F14 WS-1, 09.09.2026

**F-181** · `TECH_DEBT` · P3 · offen
Titel: Detachte Enkelprozesse unter Windows sind durch keinen der beiden
Kill-Mechanismen abgedeckt
Beschreibung: F14 WS-2 (AK4) real gemessen (`node --test`, echter
Prozessbaum, `execFile`-Timeout, Windows 11/Node 24.16.0): ein *nicht*
detachter Enkelprozess stirbt bereits durch Node 24s eigenen
Windows-Job-Object-Mechanismus mit, sobald der direkte Kindprozess
gekillt wird — unabhängig vom zusätzlichen `taskkill /T /F`-Aufruf in
`killeProzessbaumFallsWindows`. Ein mit `detached: true` gestarteter
Enkelprozess entkommt diesem Job-Object jedoch (Windows-Breakaway) und
bleibt ohne Gegenmaßnahme am Leben. `taskkill /T /F` KANN einen solchen
Fall abdecken, aber nur, wenn der Ziel-PID zum Aufrufzeitpunkt noch lebt
— in der bestehenden Kill-Reihenfolge (Node killt zuerst über
`execFile`s `timeout`/`signal`, danach erst `taskkill` im Callback) ist
der direkte Kindprozess zu diesem Zeitpunkt bereits tot, `taskkill`
liefert real reproduzierbar „Der Prozess ... wurde nicht gefunden" und
kann den Baum nicht mehr aufbauen. Weder Node noch `taskkill` garantieren
also etwas für einen detachten Enkelprozess in der aktuellen Architektur.
Fundstelle: src/claude-code-gateway/prozessstart.ts (killeProzessbaumFallsWindows,
echterStarter)
Auswirkung: Kein bekannter Anwendungsfall — der von starteProzess
gestartete Claude-Code-Kindprozess und seine bislang beobachteten
Unterprozesse sind nicht detached. Falls ein künftiges Werkzeug oder ein
MCP-Server einen eigenen Hintergrundprozess mit `detached: true` startet,
bleibt dieser nach einem TIMEOUT/ABBRUCH-Kill als Waise zurück.
Empfohlene Maßnahme: Kein Handlungsbedarf ohne konkreten Anwendungsfall
(YAGNI). Bei Bedarf: eigene Kill-Auslösung vor statt nach Node's
execFile-Timeout (eigener Timer/Abort-Listener, der taskkill aufruft,
solange der Kindprozess noch lebt) — größerer Eingriff, der WS-1s
Fehlerklassifikation (fehler.killed/ABORT_ERR) neu empirisch prüfen
müsste.
Entdeckt bei: Verifikation F14 WS-2, 09.09.2026

**F-183** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: M3-Zielbild kollidiert an neun Stellen mit der geltenden Sollquelle
(Fassung-1-Grenzen).
Beschreibung: Provider-Adapter, Stufe-1-Orchestrierung, Rollen-Injektion,
Abo-Regel (30), automatische Modellwahl, Geld statt Kontingent,
Versionsverwaltung, Werkzeug-Sammeln, Parallelität — Tabelle in
Claude-Projekt claude/153 §3.
Fundstelle: docs/projekt/zielfassung.md §2, §4, §11, §12, §13.2, §13.3,
§16.1, §16.7; docs/projekt/umsetzungsplan-fassung-1.md §1, §4, §5.
Auswirkung: Ohne nummerierte Entscheidungen wäre jeder M3-Bauauftrag ein
Verstoß gegen §0 der Zielfassung.
Empfohlene Maßnahme: E-M3-1…E-M3-3 entscheiden (im Projektchat am
09.09.2026 mündlich freigegeben), Zielfassung v1.17 mit §13.4 als
Doku-PR vor F15.
Feature/Run: M3-Challenge, 09.09.2026.

**F-185** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Secret-Ausschluss (.claudeignore, Entscheidung 35) wirkt nur für
Claude Code — ein zweiter Worker braucht eine eigene Egress-Grenze.
Beschreibung: Codex liest .claudeignore nicht; ebenso greifen
guard-settings.js/commit-guard.cjs (Claude-Code-Hooks) für Codex nicht.
E-183/E-188 haben für einen zweiten Worker keinen Wirksamkeitsnachweis.
Fundstelle: .claudeignore; .claude/settings.json (Hooks);
src/invocation-policy/types.ts (Gültigkeitsschlüssel bindet
.claude/settings.json).
Auswirkung: Ein schreibender Codex-Lauf wäre ungegatet (§16.4-Verstoß);
ein lesender Lauf könnte .env*/state/tasks/** sehen.
Empfohlene Maßnahme: F16: Codex strukturell nur read-only; Context
Builder erhält Worker-Attribut `extern` mit Zusatz-Ausschlüssen; Spike
S-M3-01 misst den Rot-Fall.
Feature/Run: M3-Challenge, 09.09.2026.

**F-186** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: device_bash erneut nicht verfügbar; claude/152 verweist mit
falscher ID auf das Bridge-Finding.
Beschreibung: Sitzung 09.09.2026: „no Plan9 drive shares mounted" —
Workaround device_stage_files + Read trägt vollständig (Muster F-174).
claude/152 §2 nennt „F-155, F-174" für die Bridge-Zuverlässigkeit; F-155
ist real „Mehrfachklick auf Starten".
Fundstelle: Claude-Projekt claude/152 §2; state/findings.md F-155.
Auswirkung: Gering — nur Verweisqualität.
Empfohlene Maßnahme: Keine im Repo; Korrektur im Claude-Projekt.
Feature/Run: M3-Challenge, 09.09.2026.

**F-187** · `TECH_DEBT` · P3 · offen
Titel: Unversionierte Testlauf-Artefakte in kontrollzustand/.
Beschreibung: 34+ untracked Verzeichnisse unter kontrollzustand/
(Testläufe), weder committet noch gitignored.
Fundstelle: kontrollzustand/ (Beobachtung 09.09.2026, M3-Challenge-Session).
Auswirkung: Kein Blocker (Ziel-Fassung v1.17 §9.2 Punkt 2 nimmt
Workforce-State von der Arbeitsbaum-Sauberkeitsbedingung aus); F18
(Capability-Register) würde diese Testartefakte sonst mitscannen.
Empfohlene Maßnahme: Vor F18-Bau bereinigen oder Scan-Filter definieren.
Feature/Run: M3-Vorbereitung.

**F-188** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Codex-CLI-Standard-Sandbox blockiert auch Lesebefehle.
Beschreibung: In Lauf 1 der Spike S-M3-01 wurden reine Lesebefehle
(PowerShell Get-ChildItem, rg --files) von der Standard-Sandbox mit
„blocked by policy" abgelehnt — read-only heißt bei Codex CLI nicht
automatisch nutzbarer Lesezugriff.
Fundstelle: state/tp-m3-01-codex.md, Lauf 1.
Auswirkung: F16 (zweiter Worker, lesende Rollen, E-M3-2) kann nicht von
„Default-Sandbox reicht für lesende Rollen" ausgehen — sonst scheitern
reale lesende Aufträge.
Empfohlene Maßnahme: Vor F16-Bau klären, welche Sandbox-/
Approval-Konfiguration tatsächlich Lesezugriff erlaubt, ohne E-M3-2s
Schreibverbot zu verletzen.
Feature/Run: Spike S-M3-01.

**F-191** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: check:template enthält stackgebundene Gates.
Beschreibung: check:template ruft check-f11-auftrag.mjs,
check-f12-leitstand-ansicht.mjs und check-f13-entscheiden.mjs auf; alle
drei importieren aus src/ bzw. scripts/leitstand-server.mjs.
Fundstelle: package.json:19.
Auswirkung: Die Zusage „bleibt im leeren Template grün" trägt heute nicht
— ein frisch geklontes Template scheitert an diesen drei Gates. Nicht
F15-blockierend.
Empfohlene Maßnahme: Entweder die drei Gates aus check:template entfernen
oder die Zusage neu formulieren.
Feature/Run: F15 WS-1 (Nebenbefund).

**F-192** · `TECH_DEBT` · P3 · offen
Titel: kontrollzustand-workflow.valid.json zeigt nicht die
M3-Bestehensbedingung.
Beschreibung: Die Referenz-Beispieldatei nutzt für beide Schritte worker
„claude-code"; die Bestehensbedingung aus zielfassung.md §13.4 ist
„lesender Schritt auf Codex → schreibender Schritt auf Claude Code".
Fundstelle: schemas/examples/kontrollzustand-workflow.valid.json:18.
Auswirkung: Keine — in WS-1 ist Codex nicht dispatchbar, ein
Codex-Beispiel wäre irreführend. Der Codex-Grünfall liegt in
src/workflow/workflow.test.ts.
Empfohlene Maßnahme: Bei F16 Schritt 1 der Beispieldatei auf worker
„codex" umstellen.
Feature/Run: F15 WS-1.

**F-196** · `TECH_DEBT` · P2 · **teilweise gelöst**
Titel: POST /api/workflows prüft weder auftrag_id noch eine belegte
workflow_id.
Beschreibung: Zwei bewusste Auslassungen von WS-2a, beide im Code
benannt. (a) auftrag_id wird nicht auf Existenz geprüft — anders als
POST /api/laeufe, das genau das synchron tut (F12 AK5); ein Workflow
ohne existierenden Auftrag ist anlegbar und garantiert nicht startbar.
(b) Ein zweiter POST derselben workflow_id erzeugt eine neue Version
(ARCHITECTURE.md §2) und ersetzt damit die Definition eines Workflows,
den WS-2b abarbeiten könnte — der Mensch hätte Fassung 1 freigegeben,
der Automat liefe in Fassung 2 weiter.
Fundstelle: scripts/leitstand-server.mjs, POST /api/workflows
(Kommentarblock „Drei Prüfungen fehlen hier BEWUSST").
Auswirkung: Solange nichts startet, folgenlos. (b) wäre mit Automat eine
Freigabe-Umgehung im Kleinen.
Empfohlene Maßnahme: Vor WS-2b entscheiden — Existenzprüfung analog AK5;
409 bei nicht-OFFENem Workflow.
Feature/Run: F15 WS-2a, Reviewer-/QA-Pass 10.09.2026 (V2/TC-B5/TC-B6).
Status neu: **(b) gelöst, (a) weiterhin offen, 10.09.2026**
Auflösung (b): POST /api/workflows lehnt eine neue Fassung mit 409 ab,
solange der Bestand LAEUFT, WARTET_FREIGABE oder ABGESCHLOSSEN trägt
(GESPERRTE_ERSETZUNGS_STATUS); in OFFEN, KLAERUNG_ERFORDERLICH und GESTOPPT
ist sie erlaubt, weil sie dort der menschliche Reparaturzug ist. Zusätzlich
darf der eingereichte Datensatz selbst keinen gesperrten status tragen, und
ein bereits ungültiger Bestand ist in jedem Status ersetzbar — sonst wäre er
unerreichbar. Rot- und Grünfall je Status in scripts/check-f15-workflow.mjs.
Der Kommentarblock „Drei Prüfungen fehlen hier BEWUSST" ist entsprechend auf
zwei Prüfungen zurückgeschnitten.
Rest (a): auftrag_id wird beim ANLEGEN weiterhin nicht auf Existenz geprüft
(die Zeichenregel greift seit WS-2b, die Existenzprüfung nicht). Der
Startendpunkt fängt es mit 400 ab — ein Workflow ohne existierenden Auftrag
bleibt anlegbar und ist dann nicht startbar.

**F-197** · `BUG` · P2 · offen
Titel: decodeURIComponent ohne Auffangnetz beendet den Serverprozess —
zwei vorbestehende Fundstellen.
Beschreibung: `GET /api/laeufe/%` und `POST /api/laeufe/%/abbrechen`
werfen einen URIError aus einem async-Handler, dessen Promise niemand
awaitet; Node 24 beendet daraufhin den Prozess. Real reproduziert am
10.09.2026 an der dritten, neu hinzugekommenen Fundstelle (GET
/api/workflows/%, Exit 127) — dort mit der neuen Hilfsfunktion
dekodiereSegment behoben, die beiden alten bewusst nicht angefasst
(Verhaltensänderung außerhalb des WS-2a-Zuschnitts: heute Prozesstod,
danach 400).
Fundstelle: scripts/leitstand-server.mjs, GET /api/laeufe/<laufId> und
POST /api/laeufe/<laufId>/abbrechen; Gegenstück dekodiereSegment.
Auswirkung: Verstoß gegen F10 AK6 („ein Wurf beendet den Prozess
nicht"). Bedrohungsmodell entschärft es: der Server bindet nur auf
127.0.0.1, ein einziger lokaler Nutzer.
Empfohlene Maßnahme: Eigene kleine Iteration — beide Aufrufe auf
dekodiereSegment umstellen, je ein Gate-Rotfall mit Lebendprüfung
dahinter (Muster check-f15-workflow.mjs).
Feature/Run: F15 WS-2a, Reviewer-/QA-Pass 10.09.2026 (V1/TC-B2).

**F-198** · `TECH_DEBT` · P2 · offen
Titel: workflow_id ohne Längen- und ohne Windows-Zeichenprüfung — 500
statt 400, OS-divergent.
Beschreibung: POST /api/workflows prüft workflow_id gegen
LAUFID_UNZULAESSIGE_ZEICHEN (Spiegel von pruefeLaufId, D5 — bewusst kein
zweiter Regelsatz im Server). Diese Regel lässt `:` `<` `>` `"` `|` `?`
`*` und beliebige Längen durch. Unter Windows scheitert das anschließende
mkdir → 500; unter Linux entsteht ein Verzeichnis, das die Windows-Sicht
nie öffnen kann. Anders als eine auftragId (serverseitig per randomUUID)
kommt workflow_id aus der Payload, ist also Client-Eingabe.
Fundstelle: scripts/leitstand-server.mjs, POST /api/workflows (Punkt 3
des Kommentarblocks); src/checkpoint-store/index.ts, pruefeLaufId.
Auswirkung: Eine Client-Eingabe endet in einem 500 statt einem 400 (D2:
prüfen vor dem Schreibversuch), und das Verhalten unterscheidet sich
zwischen CI (Linux) und Dev-Rechner (Windows) — genau die Divergenz,
gegen die loeseEvidenzPfadAuf ausdrücklich härtet.
Empfohlene Maßnahme: Die strengere Regel in den Checkpoint Store ziehen
(eine Wahrheitsquelle), nicht als Zweitregel in den Server.
Feature/Run: F15 WS-2a, QA-Pass 10.09.2026 (TC-B3/TC-B4).

**F-200** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Im Projektchat formulierte Findings erreichen das Register nicht
zuverlässig.
Beschreibung: F-189, F-190 und F-199 wurden im Challenger-Chat vollständig
ausformuliert und nie in einen Bauauftrag gegeben. Das Register springt
dadurch von F-188 auf F-191. Aufgefallen erst, als die Feature-Akte F15
auf das nicht existierende F-199 verwies und die Bausitzung den Verweis
nicht auflösen konnte. Betroffen ist genau die Projektregel „Erkannte
Schulden dürfen nicht nur im Chat verbleiben" — der Kanal vom
FINDINGS-Abschnitt in die Datei ist rein manuell und hat dreimal
versagt.
Fundstelle: state/findings.md (Nummernlücke 189/190); Projektchat
09.-10.09.2026.
Auswirkung: Findings gehen verloren, sobald der Chat endet. Ein Verweis
aus einem Repo-Dokument auf eine nur im Chat vergebene Nummer zeigt ins
Leere und blockiert eine Bausitzung.
Empfohlene Maßnahme: Zwei Regeln auf Challenger-Seite. (1) Jeder
ausgegebene FINDINGS-Abschnitt benennt in derselben Nachricht den
Bauauftrag, der ihn schreibt — oder wird in den unmittelbar folgenden
Prompt aufgenommen. (2) Vor jeder Freigabe die höchste Nummer im
Register gegen die höchste im Chat vergebene prüfen; eine Lücke bedeutet,
dass etwas nur im Chat steht. Regel (2) hätte alle drei Fälle gefunden.
Feature/Run: F15 WS-2a, 10.09.2026.

**F-205** · `TECH_DEBT` · P3 · offen
Titel: Ambiguitäts-409 aus F-196(b) ist nach Einführung von
GESPERRTE_ERSETZUNGS_STATUS für bestimmte Zwischenzustände faktisch
unerreichbar.
Beschreibung: Rein informativ — kein Verhalten falsch, aber ein
Codepfad, der nach der (3)/(4)-Korrektur in WS-2b in der Praxis seltener
oder nie mehr greift als ursprünglich angenommen. Dokumentiert, damit
ein künftiger Bauauftrag ihn nicht für einen aktiv genutzten Pfad hält.
Fundstelle: scripts/leitstand-server.mjs, POST /api/workflows,
GESPERRTE_ERSETZUNGS_STATUS-Prüfung.
Auswirkung: keine.
Empfohlene Maßnahme: keine Handlung nötig, nur zur Kenntnis.
Status: offen.
Feature/Run: F15 WS-2b, 10.09.2026.

**F-206** · `TECH_DEBT` · P3 · offen
Titel: Verwaistes Kontextpaket-Artefakt nach Heilung eines Schritts
möglich.
Beschreibung: Heilt der Automat eine lauf_id (Heilungslogik in
scripts/leitstand-server.mjs, ~Zeile 2083ff), prüft er nur
<basis>/<laufId> auf Checkpoint/Wirkungsmarke. Registriert F5 vorher
erfolgreich ein kontextpaket-<laufId> und lehnt F6a danach ohne
Wirkungsmarke ab (2 von 7 Ablehnungszweigen in verweigereStart), bleibt
dieses Kontextpaket bestehen, ohne dass ein Schritt mehr darauf zeigt.
Fundstelle: scripts/leitstand-server.mjs, Kommentar bei der
Heilungslogik, ~Zeile 2050–2056 (im Code selbst bereits benannt).
Auswirkung: keine funktionale — die Lineage-Kette bleibt heil (nächster
Start zieht eine frische randomUUID). Reiner Speicher-/Übersichtlichkeits-
Rest.
Empfohlene Maßnahme: bei Gelegenheit (z.B. F18 Capability-Register oder
eine spätere Aufräum-Iteration) prüfen, ob verwaiste kontextpaket-*-
Artefakte identifizierbar/löschbar gemacht werden sollen. Kein Blocker
für WS-2c.
Status: offen.
Feature/Run: F15 WS-2b, 10.09.2026 (bei Verifikation gefunden, nicht im
Bauauftrag selbst).

**F-209** · `TECH_DEBT` · P3 · offen
Titel: Instanz-Lock kann bei PID-Wiederverwendung fälschlich blockieren.
Beschreibung: belegeInstanzLock entscheidet allein über
process.kill(pid, 0), ob der Vorbesitzer noch lebt. Betriebssysteme
vergeben PIDs wieder; stirbt der Leitstand hart und bekommt ein
beliebiger anderer Prozess dieselbe PID, hält der Lock den Neustart für
blockiert, obwohl keine Leitstand-Instanz läuft.
Fundstelle: scripts/leitstand-server.mjs, pidLebt/belegeInstanzLock
(~Zeile 2309ff).
Auswirkung: gering und selbstheilend — die Fehlermeldung nennt den
Dateipfad, der Mensch entfernt die Datei von Hand. Kein Datenverlust,
keine stille Fehlfunktion.
Empfohlene Maßnahme: keine. Eine belastbarere Prüfung (Prozessname,
Startzeit gegen Boot-Zeit) wäre plattformabhängig und steht in keinem
Verhältnis zum Risiko. Dokumentiert, damit ein künftiger Bauauftrag den
Fall nicht für einen Bug hält.
Status: offen.
Feature/Run: F15 WS-2c-Vorbereitung, 10.09.2026
(Challenger-Verifikation).

**F-210** · `TECH_DEBT` · P3 · offen
Titel: Zwei Restlücken im Heilungszweig des Instanz-Locks.
Beschreibung: (a) unlinkSync(lockPfad) im Heilungszweig von
belegeInstanzLock ist ungeschützt. Hat eine andere Instanz die verwaiste
Datei in derselben Millisekunde entfernt, wirft ENOENT und der Start
bricht mit einem rohen Fehler statt mit der vorgesehenen Meldung ab. (b)
Starten zwei Instanzen gleichzeitig auf eine bereits verwaiste
Lock-Datei, können beide sie als verwaist lesen; die zweite entfernt
danach die inzwischen frisch und gültig belegte Datei der ersten und
legt ihre eigene an. Beide laufen dann.
Fundstelle: scripts/leitstand-server.mjs, belegeInstanzLock, unlinkSync
im EEXIST-Zweig.
Auswirkung: (a) nur kosmetisch — der Start bricht in der sicheren
Richtung ab, es laufen nie zwei Instanzen. (b) ist die eigentliche
Restlücke, setzt aber einen harten Absturz UND zwei zeitgleiche Starts
voraus. Der Normalbetrieb (ein Mensch, ein npm run leitstand) erreicht
sie nicht.
Empfohlene Maßnahme: Keine. Bewusst offen gelassen (Challenger,
10.09.2026, Fast-Prototyping): eine dichte Fassung bräuchte
Schreiben-und-Umbenennen oder ein Inhaltsvergleich vor dem Entfernen,
und das steht in keinem Verhältnis zu einer lokalen
Einzelplatzanwendung. Erneut prüfen, falls der Leitstand je
mehrbenutzerfähig oder als Dienst betrieben werden soll.
Status: offen.
Feature/Run: F15 WS-2c-Vorbereitung, 10.09.2026
(Challenger-Verifikation).

**F-211** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: Neue Gates werden nicht auf Rot kalibriert.
Beschreibung: Der Vertragsfall (d) in
scripts/check-f15-instanzlock.mjs war in seiner ersten Fassung grün,
obwohl der Instanz-Lock-Aufruf im CLI-Bindeblock entfernt war — er
prüfte einen leeren Quelltextausschnitt und meldete Erfolg. Aufgefallen
ist das erst im Reviewer-Pass, nicht beim Bau. Die Definition of Done
verlangt grüne Gates, aber nirgends den Nachweis, dass ein Gate rot
wird, wenn die zugesagte Eigenschaft fehlt.
Fundstelle: scripts/check-f15-instanzlock.mjs, Vertragsfall (d), erste
Fassung; DoD in CLAUDE.md.
Auswirkung: Ein Gate ohne Rot-Nachweis belegt nur, dass die Datei läuft.
Bei einem Sicherheitsvertrag wie D13 oder dem Instanz-Lock heißt das:
der Schutz kann abgeschaltet werden, ohne dass etwas anschlägt. Betrifft
potenziell alle bestehenden check-*.mjs, nicht nur dieses.
Empfohlene Maßnahme: DoD ergänzen — für jede NEUE oder VERSCHÄRFTE
Gate-Zusage wird einmal belegt, dass sie rot wird, wenn man die
zugesagte Eigenschaft im Quelltext bricht (Manipulation, Rotbeleg,
Rückbau, Diff unverändert). Das Verfahren ist in diesem Branch bereits
real angewandt worden und hat drei Zusagen geprüft. Zusätzlich als
eigene Iteration prüfen, welche bestehenden Gates nie rot kalibriert
wurden.
Status: offen.
Feature/Run: F15 WS-2c-Vorbereitung, 10.09.2026 (Reviewer-Pass).

**F-212** · `TECH_DEBT` · P2 · offen
Titel: Die D13-Übergabe ohne Fenster ist nicht verhaltensmäßig prüfbar.
Beschreibung: Beim Rot-Kalibrieren von AK6b (F15 WS-2c) wurde die
Fortsetzung testweise in ein `setTimeout(..., 0)` verschoben — genau der
Defekt, den die Invariante ausschließen soll (D13 ist zwischen Reset und
Neubelegung frei). BEIDE Verhaltensfälle in
`scripts/check-f15-workflow.mjs` blieben grün: der Automat setzte weiterhin
fort, und nach der Übergabe war D13 wieder belegt. Rot wurde allein die
Quelltext-Invariante (`D13-UEBERGABE-OHNE-FENSTER`). Ein Test müsste einen
Request in ein Fenster von einem Microtask Breite legen; das ist von außen
nicht ansteuerbar.
Fundstelle: `scripts/check-f15-workflow.mjs`, Abschnitt „D13-Übergabe ohne
Fenster"; `scripts/leitstand-server.mjs`, die drei markierten Bereiche.
Auswirkung: Die Zusage hängt an einer Textprüfung. Sie fängt jede
Formulierung, die eine der bekannten Zeichenketten (`await`, `setTimeout`,
`queueMicrotask`, `.then(`, …) benutzt — nicht aber einen Kontrollflusswechsel,
der über eine eigene Hilfsfunktion außerhalb des markierten Bereichs
eingeführt wird.
Empfohlene Maßnahme: keine sofortige. Dokumentiert, damit ein künftiger
Eingriff die Textprüfung nicht für stärker hält, als sie ist. Falls der
Automat je mehr als zwei Schritte am Stück fährt oder ein zweiter
Fortsetzungspfad entsteht, erneut prüfen — dann wäre ein
Instrumentierungshaken (Zähler auf laufAktiv-Wechseln) das nächste Mittel.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026.

**F-213** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Ein Gate-Fall, der eine Scope-Grenze zusagt, wird beim Aufheben der
Grenze rot und muss ersetzt statt ergänzt werden.
Beschreibung: `scripts/check-f15-workflow.mjs` sagte in WS-2b ausdrücklich
zu, dass der Cursor NICHTS startet („das ist WS-2c"), inklusive eines
zweiten `POST .../starten`, der Schritt 2 ausführt. WS-2c hebt genau diese
Grenze auf — vier Befunde beim ersten Lauf, alle korrekt, keiner ein Defekt.
Der Fall musste durch sein Gegenteil ersetzt werden.
Fundstelle: `scripts/check-f15-workflow.mjs`, früherer „Grünfall 2 (WS-2b
(6))", jetzt „Grünfall 2 (WS-2c, AK6b)".
Auswirkung: keine funktionale. Aber: ein rot werdendes Gate ist normalerweise
ein Defektsignal, und hier war es ein Fahrplansignal. Wer den Unterschied
nicht sieht, repariert am falschen Ende — oder schwächt den Fall ab, statt
ihn zu ersetzen.
Empfohlene Maßnahme: Fälle, die eine bewusst temporäre Scope-Grenze zusagen,
im Fallnamen als solche kennzeichnen (z. B. „SCOPE-GRENZE WS-2b"), damit die
nächste Iteration sie als Umbaustelle und nicht als Regression liest.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026.

**F-214** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Die Feature-Gates F10–F15 stehen nicht in `state/gates.md`.
Beschreibung: `state/gates.md` führt jedes objektive Gate mit bekanntem Rot-
und Grün-Fall — die Datei nennt aber keines der Feature-Gates
`check-f10-leitstand.mjs` bis `check-f15-*.mjs`. Die Rot-Kalibrierungen
dieser Gates leben damit ausschließlich in Commit-Botschaften und
Berichten.
Fundstelle: `state/gates.md` (keine Zeile zu F10–F15);
`package.json`, `npm run check`.
Auswirkung: F-211 verlangt für jede neue oder verschärfte Gate-Zusage einen
Rotbeleg. Ohne Ablageort verfällt der Beleg mit dem Bericht, in dem er
steht — und die nächste Iteration kann nicht nachsehen, welche Zusage je rot
kalibriert wurde und welche nicht.
Empfohlene Maßnahme: gemeinsam mit F-211 als eigene Iteration — dieselbe
Frage, dieselbe Datei. Nicht in WS-2c nachgezogen, weil eine
Nachdokumentation von sechs Gates ohne erneute Kalibrierung genau die Art
Behauptung wäre, gegen die F-211 sich richtet.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026.

**F-215** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Der D13-Vertrag in `check-f11-auftrag.mjs` prüft nur das ERSTE
Vorkommen im Quelltext und diktiert dadurch die Codeform anderswo.
Beschreibung: `erfuelltD13Vertrag` sucht per `indexOf` die erste
D13-Sperrbedingung und die erste Belegtprüfung und verlangt jene vor dieser.
Die Prüfung ist damit an eine Position im Quelltext gebunden, nicht an einen
benannten Handler. In F15 WS-2c musste die neue Funktion
`starteWorkflowSchritt` ihre Belegtprüfung deshalb über eine
Zwischenvariable formulieren, weil sie VOR dem Handler von
`POST /api/laeufe` steht und sonst dessen geprüftes erstes Vorkommen
verdrängt hätte. Dieselbe Falle ist bereits im Kopf von
`scripts/leitstand-server.mjs` und an der `/starten`-Route dokumentiert — sie
wirkt inzwischen an drei Stellen.
Fundstelle: `scripts/check-f11-auftrag.mjs`, `erfuelltD13Vertrag`;
`scripts/leitstand-server.mjs`, Belegtprüfung in `starteWorkflowSchritt`.
Auswirkung: Die Codeform wird von einem Textvergleich diktiert statt von der
Sache. Schlimmer: eine künftige Umstellung, die die Routen-Reihenfolge
ändert, verschiebt lautlos, WELCHER Handler geprüft wird — das Gate bleibt
grün und prüft etwas anderes.
Empfohlene Maßnahme: den geprüften Bereich per Marker eingrenzen, statt ihn
über das erste Vorkommen zu erraten — das Muster steht bereits in derselben
Datei (`teileAmAufrufMarker`). Danach entfällt die Zwischenvariable in
`starteWorkflowSchritt`. Nicht in WS-2c gemacht, weil eine Änderung an einem
fremden Sicherheits-Gate eine eigene Rot-Kalibrierung braucht.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-Pass).

**F-217** · `TECH_DEBT` · P2 · offen
Titel: Die D13-Übergabe hängt an der Synchronität von Funktionen, die das
nicht wissen.
Beschreibung: Die Invariante aus AK6b hält nur, solange
`schreibeWorkflowFortschritt`, `ladeArtefaktVersion`, `registriereWorkflow`,
`validiereWorkflowDaten`, `loeseSchrittEingabenAuf` und
`ermittleNaechstenSchritt` synchron bleiben. Die Quelltextprüfung in
`scripts/check-f15-workflow.mjs` sieht nur die drei markierten Bereiche, nicht
deren Callees: würde eine dieser Funktionen `async`, bräche die Invariante
lautlos und kein Gate schlüge an.
Fundstelle: `scripts/leitstand-server.mjs`, `schreibeWorkflowFortschritt`
(trägt seit WS-2c eine Warnzeile in der Funktionsdoku);
`src/lineage-registry/index.ts`, `ladeArtefaktVersion`;
`src/workflow/index.ts`, `registriereWorkflow` / `validiereWorkflowDaten` /
`ermittleNaechstenSchritt` (ohne Warnzeile).
Auswirkung: Ein Umbau in `src/`, der von F15 nichts weiß, kann eine
Sicherheitszusage des Leitstands brechen, ohne dass irgendwo etwas rot wird.
Empfohlene Maßnahme: gemeinsam mit F-212 behandeln. Entweder je eine
Warnzeile an den betroffenen `src/`-Funktionen, oder — belastbarer — eine
Gate-Prüfung, die die Callees mitliest. Beides ist mehr als eine Zeile und
gehört in dieselbe Iteration wie F-212.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-Pass).

**F-218** · `TECH_DEBT` · P3 · **teilweise gelöst** (Bedienweg)
Titel: Der Ausweg aus `haltGrenze` verlangt ungenannt ein Nachziehen des
Cursors.
Beschreibung: Hält `grenzen.max_schritte` die Kette an, steht der Workflow
auf `GESTOPPT` mit `aktiver_schritt_id: null`. Die neue Fassung des Menschen
muss deshalb nicht nur die Grenze anheben und den `status` setzen, sondern
zusätzlich `aktiver_schritt_id` auf den nächsten fälligen Schritt. Vergisst
er das, greift der Fallback "Cursor sonst erster Schritt der Liste" und zeigt
auf Schritt 1 — der trägt eine `lauf_id`, also 409 "Schritt 'schritt-1' ist
nicht startbereit". Die Meldung nennt den falschen Schritt und nicht die
Ursache.
Fundstelle: `src/workflow/index.ts`, Erststart-Zweig von
`ermittleNaechstenSchritt`; `features/F15/feature.md`, Tabelle
"Halte-Zustände", Zeile `GESTOPPT`.
Auswirkung: Der dokumentierte Reparaturzug funktioniert, aber nur mit einem
Schritt, den nirgends jemand nennt. Der Mensch liest eine irreführende
Fehlermeldung.
Empfohlene Maßnahme: entweder die 409-Meldung um den Hinweis auf
`aktiver_schritt_id` ergänzen, oder den Fallback bei gesetzten `lauf_id`s auf
den ersten NICHT gelaufenen Schritt zeigen lassen. Die zweite Variante ist
eine Regeländerung in einer reinen Funktion und braucht einen eigenen
Rot-Fall — deshalb nicht in WS-2c.
Nachtrag F15 WS-2c (b1), 10.09.2026 (QA-Pass): Priorität steigt faktisch von
Randfall auf Normalfall. Eine abgelehnte Freigabe setzt aktiver_schritt_id auf
null (GESTOPPT), und die korrigierte Fassung, die der Mensch danach einreicht,
muss den Cursor selbst wieder setzen — genau der Fall, in dem die irreführende
Meldung entsteht. Beim Aufgreifen mit P2 statt P3 behandeln.
Status: **gelöst für den BEDIENWEG** in F15 WS-3b, 10.09.2026 — und nur für
ihn. Der Reparaturentwurf im Leitstand belegt den Cursor vor: er bleibt, wo er
steht, und zeigt bei `null` auf den ersten Schritt ohne `lauf_id`. Damit
entsteht der Fall, in dem die irreführende 409-Meldung erscheint, auf dem
vorgesehenen Weg nicht mehr; real belegt in
`nachweis/f15-ws3b-oberflaechennachweis.md` (Fall 2, Entwurf-Cursor springt
von `null` auf `schritt-1`).
UNVERÄNDERT ist die Meldung SELBST: wer die Fassung direkt über HTTP
einreicht und den Cursor vergisst, liest weiterhin „Schritt 'schritt-1' ist
nicht startbereit" statt der Ursache. Die empfohlene Maßnahme (409-Meldung um
den Hinweis auf `aktiver_schritt_id` ergänzen) ist damit NICHT erledigt — die
Oberfläche umgeht den Fall, sie behebt ihn nicht. Wer den Endpunkt ohne
Leitstand benutzt, braucht sie weiterhin.
Feature/Run: F15 WS-2c (a), 10.09.2026 (QA-Pass); Bedienweg gelöst F15 WS-3b, 10.09.2026.

**F-219** · `TECH_DEBT` · P3 · offen
Titel: Eine Reparaturfassung kann die `vorgaengerLaufId`-Kette still
verlieren.
Beschreibung: Der Lineage-Vorgänger eines Schritts entsteht aus
"nachfolger === schritt_id und lauf_id !== null". Setzt der Mensch in einer
korrigierten Fassung alle Schritte auf `OFFEN` mit `lauf_id: null` — die
naheliegende Geste, wenn er "von vorn" meint —, startet ein späterer Schritt
ohne `vorgaengerLaufId`. Kein Fehler, keine Warnung, aber der Verweis aus
F8/F13 fehlt für diesen Übergang.
Fundstelle: `scripts/leitstand-server.mjs`, `gelaufeneVorschritte` in
`starteWorkflowSchritt`.
Auswirkung: gering im Ergebnis, aber mit WS-2c wird die Reparatur mitten in
der Kette zum Normalfall — der Fall geht von theoretisch nach wahrscheinlich.
Empfohlene Maßnahme: in WS-3 (AK8) prüfen, ob die Ansicht beim Einreichen
einer Fassung auf verlorene Vorgängerverweise hinweisen soll. Kein
Serverzwang: ein Neustart von vorn ist eine zulässige menschliche
Entscheidung.
Nachtrag F15 WS-3b, 10.09.2026: SICHTBAR GEMACHT, NICHT GELÖST — und der
Unterschied ist Absicht. Der Reparaturentwurf im Leitstand warnt namentlich,
welcher Schritt seine `lauf_id` verliert und für welchen Folgeschritt damit
der `vorgaengerLaufId`-Verweis ausfällt (real belegt in
`nachweis/f15-ws3b-oberflaechennachweis.md`, Fall 2). Verhindert wird nichts:
die Prüfung dieses Befunds war „soll die Ansicht hinweisen?", und die Antwort
ist ja — der Zwang bleibt aus, weil ein Neustart von vorn eine zulässige
Entscheidung ist. Der Befund bleibt OFFEN, solange nicht entschieden ist, ob
der Verweis stattdessen erhalten werden soll.
Status: offen (Hinweis gebaut, Ursache unverändert).
Feature/Run: F15 WS-2c (a), 10.09.2026 (QA-Pass); Hinweis F15 WS-3b, 10.09.2026.

**F-220** · `TECH_DEBT` · P3 · offen
Titel: Die F4-Startfreigabe-Fixture liegt jetzt doppelt im Repo.
Beschreibung: `scripts/check-f15-automat-real.mjs` übernimmt rund hundert
Zeilen Fixture-Aufbau (Wegwerf-Git-Repo, Baseline, Wirksamkeitsnachweis,
Autorisierungsreferenz, Test-Startvorlage, Testserver) fast wörtlich aus
`scripts/check-f14-abbruch.mjs`. Der Dateikopf nennt das "D5, kein zweiter
Regelsatz" — zutreffend ist das Gegenteil: es IST der zweite.
Fundstelle: `scripts/check-f15-automat-real.mjs` gegen
`scripts/check-f14-abbruch.mjs`.
Auswirkung: Ändert sich F4s Nachweisformat, müssen zwei Gates nachgezogen
werden, und das zweite ist das, das vergessen wird. Verstoß gegen CLAUDE.md
("Bestehende Helper NUTZEN, nicht neu schreiben").
Empfohlene Maßnahme: `scripts/testhilfen/startfreigabe-fixture.mjs` mit
Präfix-Parameter, beide Gates darauf umstellen. Eigene, kleine Iteration —
ein Umbau am Fixture zweier realer Ende-zu-Ende-Gates gehört nicht in
denselben Commit wie die Funktion, die sie prüfen sollen.
Status: offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-Pass).

**F-221** · `TECH_DEBT` · P4 · offen
Titel: Zwei Restlücken am Rand des Automaten-Startpfads.
Beschreibung: (a) `GET /api/workflows` führt das neue Feld `grund` nicht mit
(`baueWorkflowKopfdaten`) — die Liste zeigt `KLAERUNG_ERFORDERLICH` ohne
Grund, nur der Detailendpunkt hat ihn. (b) Würfe `fuehreAufgabeDurchFn`
SYNCHRON statt ein abgelehntes Promise zu liefern, bliebe `laufAktiv` auf
true stehen (der `.then`/`.catch`-Reset wird nie angehängt, der Wurf endet im
try/catch der Nachbereitung) — D13 wäre bis zum Serverneustart blockiert.
Fundstelle: (a) `scripts/leitstand-server.mjs`, `baueWorkflowKopfdaten`;
(b) ebenda, Fire-and-forget-Block.
entscheiden, nicht hier. (b) ist mit einer `async`-Funktion unerreichbar —
`fuehreAufgabeDurch` ist eine, und nur eine Testattrappe könnte es verletzen.
Empfohlene Maßnahme: (a) in WS-3 mitentscheiden. (b) keine — dokumentiert,
damit ein künftiger Umbau des Aufrufvertrags den Fall kennt.
Status: (a) **gelöst** in F15 WS-3a — `baueWorkflowKopfdaten` führt `grund`,
die Workflow-Liste im Leitstand zeigt ihn als eigene Zeile. Als Vertrag in
`scripts/check-f15-workflow.mjs` festgehalten (Kopfdaten nach einem Stopp
tragen die Begründung des Menschen), rot kalibriert durch Entfernen des
Feldes aus der Projektion. (b) unverändert offen.
Feature/Run: F15 WS-2c (a), 10.09.2026 (Reviewer-/QA-Pass); (a) gelöst F15 WS-3a, 10.09.2026.

**F-222** · `TECH_DEBT` · P2 · offen
Titel: Freigabe und Ablehnung sind nur über HTTP erreichbar, die
Leitstand-Ansicht kennt sie nicht.
Beschreibung: F15 WS-2c (b1) baut POST /api/workflows/<id>/freigabe und
belegt ihn real — aber `public/leitstand/` zeigt weder den
WARTET_FREIGABE-Halt als Handlungsaufforderung noch eine Bedienung dafür.
Wer heute freigeben will, braucht curl und die schritt_id aus dem
Detail-Endpunkt.
Fundstelle: `public/leitstand/app.js` gegen
`scripts/leitstand-server.mjs`, POST /api/workflows/<id>/freigabe.
Auswirkung: Der Governance-Fall ist mechanisch vollständig und praktisch
nicht bedienbar. Für die Gates und für AK7 ist das folgenlos (beide gehen
über HTTP), für AK8/AK10 nicht: ein Ende-zu-Ende-Nachweis "über den
Leitstand" ist ohne Bedienelement keiner.
Empfohlene Maßnahme: In WS-3 (AK8) zusammen mit der Schrittliste bauen —
dort ist ohnehin zu entscheiden, wie ein Halt angezeigt wird. Kein
Nachtrag zu (b1): eine Bedienung ohne die übrige Workflow-Ansicht wäre ein
Knopf ohne Kontext.
Status: **gelöst** in F15 WS-3b, 10.09.2026. Der Bedienblock im
Workflow-Detail bietet „Freigeben" und „Ablehnen" mit Pflichtbegründung an,
sobald der Server `naechster.art === 'haltFreigabe'` meldet — die schritt_id
kommt aus derselben Antwort, nicht aus einer Eingabe des Menschen. Kein curl
mehr nötig. Real belegt in `nachweis/f15-ws3b-oberflaechennachweis.md`
(Fall 1).
Feature/Run: F15 WS-2c (b1), 10.09.2026; gelöst F15 WS-3b, 10.09.2026.

**F-223** · `TECH_DEBT` · P3 · offen
Titel: Eine neue Fassung verwirft alle erteilten Freigaben stillschweigend.
Beschreibung: POST /api/workflows normalisiert `schritte[].freigabe_erteilt`
aus dem Body weg (nötig, sonst erteilte sich eine eingereichte Fassung die
Freigabe selbst — siehe F-207). Folge: reicht der Mensch nach einem Halt eine
korrigierte Fassung ein, verliert ein bereits freigegebener, aber noch nicht
gelaufener Schritt seine Freigabe und hält erneut an. Die Wirkung ist die
sichere Richtung, aber der Server sagt es nirgends — weder in der Antwort noch
im Artefakt.
Fundstelle: `scripts/leitstand-server.mjs`, POST /api/workflows
(`koerperOhneFreigaben`).
Auswirkung: Heute schmal: eine Freigabe startet den Schritt sofort, das
Zeitfenster zwischen Freigabe und Lauf ist ein Tick. Erreichbar wird der Fall,
sobald eine Freigabe den Schritt NICHT sofort startet (z. B. D13 belegt, oder
ein Vorrat an Freigaben in WS-3).
Empfohlene Maßnahme: Zusammen mit F-219 entscheiden (dieselbe Klasse: eine
Reparaturfassung verliert still etwas, dort die vorgaengerLaufId-Kette, hier die
Freigabe), ob die Antwort auf verworfene Felder hinweist. Kein eigener Zug.
Nachtrag F15 WS-3b, 10.09.2026: SICHTBAR GEMACHT, NICHT GELÖST. Der
Reparaturentwurf warnt namentlich, für welche Schritte eine erteilte, aber
noch nicht verbrauchte Freigabe beim Einreichen verworfen wird. Die
Normalisierung selbst bleibt unverändert — sie MUSS bleiben, sonst erteilte
sich eine eingereichte Fassung ihre Freigabe selbst (F-207). Der Hinweis
steht in der Oberfläche, NICHT in der Serverantwort; wer über HTTP einreicht,
erfährt weiterhin nichts. Deshalb offen.
Status: offen (Hinweis in der Oberfläche, Serverantwort unverändert).
Feature/Run: F15 WS-2c (b1), 10.09.2026; Hinweis F15 WS-3b, 10.09.2026.

**F-224** · `TECH_DEBT` · P3 · offen
Titel: Die Artefakt-ID einer Workflow-Freigabe ist nicht eindeutig zerlegbar.
Beschreibung: `entscheidung-workflow-<workflowId>-<schrittId>` setzt zwei vom
Menschen gewählte Strings ohne Trennzeichenregel zusammen. `workflow_id: 'a'`
mit `schritt_id: 'b-c'` erzeugt dieselbe ID wie `workflow_id: 'a-b'` mit
`schritt_id: 'c'`. Beide Entscheidungen landen dann in derselben
Lineage-Kette; wer ohne Versionsangabe lädt, bekommt die des anderen
Workflows.
Fundstelle: `scripts/leitstand-server.mjs`, POST /api/workflows/<id>/freigabe
(Artefakt-ID der Entscheidung).
Auswirkung: Gering und nur bei gleichzeitig gewählten, kollidierenden IDs. Die
Entscheidung selbst geht nicht verloren (append-only, jede Version bleibt
lesbar), aber ein Leser ordnet sie dem falschen Workflow zu. Dieselbe Klasse,
aus der `schritte[].eingaben` und `workflow_id` ihre Zeichenregeln bekommen
haben.
Empfohlene Maßnahme: Entweder eine Zeichenregel für `schritt_id` (kein '-' in
der ID, oder eine Längenkodierung), oder die Entscheidung als eigene Version
unter `entscheidung-workflow-<workflowId>` mit `schritt_id` im Inhalt führen.
Nicht in (b1) entschieden, weil es das Artefaktlayout betrifft und die
bestehenden F13-Entscheidungen (`entscheidung-<laufId>`) mitbedacht werden
sollten.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass V3, QA-Pass Fehler 5).

**F-225** · `TECH_DEBT` · P3 · offen
Titel: `entscheidung_schema: 'v0'` behauptet ein Schema, das es nicht gibt.
Beschreibung: Sowohl die F13-Entscheidungen (`terminal`, `kenntnisnahme`) als
auch die neue Workflow-Freigabe schreiben `entscheidung_schema: 'v0'` in ihre
Nutzdaten. Unter `schemas/` existiert dafür keine Datei, und keine Funktion
prüft die Form — anders als bei AUFTRAG_V0, WORKFLOW_V0, BEDARF_V0.
Fundstelle: `scripts/leitstand-server.mjs`, POST /api/entscheidungen
(terminal/kenntnisnahme) und POST /api/workflows/<id>/freigabe.
Auswirkung: Kein heutiger Defekt — die Felder werden nur geschrieben, nie
gelesen. Aber ein Schemaname ohne Schema ist eine Zusage, auf die sich
niemand verlassen kann, und WS-3 will diese Artefakte anzeigen.
Empfohlene Maßnahme: Mit der Leitstand-Ansicht (AK8) zusammen entscheiden —
entweder ein `schemas/kontrollzustand-entscheidung-payload.schema.json` plus
Validator (dann für BEIDE Erzeuger, nicht nur den neuen), oder das Feld
streichen. Kein Nachtrag zu (b1): der neue Endpunkt hat das Muster geerbt,
nicht erfunden.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (QA-Pass Fehler 5).

**F-229** · `TECH_DEBT` · P3 · offen
Titel: Der Freigabe-Endpunkt hat als einziger Schreibpfad kein
Formular-Prüfobjekt.
Beschreibung: `POST /api/auftraege`, `POST /api/entscheidungen` und
`POST /api/laeufe` prüfen ihren Body über eine exportierte, reine Funktion
(`pruefeAuftragsformular`, `pruefeEntscheidungsformular`,
`pruefeStartauftrag`), die einzeln testbar ist und unbekannte Felder ablehnt.
Der Freigabe-Endpunkt prüft stattdessen inline an fünf Stellen und lässt
unbekannte Body-Felder stumm durch.
Fundstelle: `scripts/leitstand-server.mjs`, POST
/api/workflows/<id>/freigabe. WS-2c (b2) ergänzt eine zweite Fundstelle
derselben Art: `POST /api/workflows/<id>/stoppen` prüft `begruendung`
ebenfalls inline und lässt unbekannte Body-Felder stumm durch. Der Befund
umfasst seither beide Endpunkte — `pruefeFreigabeFormular` und
`pruefeStoppFormular` gehören in dieselbe Iteration.
Auswirkung: Kein Defekt — jede einzelne Prüfung hat ihren Rot-Fall im Gate.
Aber ein Tippfehler im Feldnamen (`begründung` statt `begruendung`) meldet
sich als „Pflichtfeld fehlt" statt als „unbekanntes Feld", und die
Prüfreihenfolge ist nur im Handler nachvollziehbar. Verstoß gegen D5 und
gegen CLAUDE.md („bestehende Helper nutzen").
Empfohlene Maßnahme: `pruefeFreigabeFormular(body)` neben die drei anderen
stellen und exportieren. Eigene kleine Iteration; die Prüfreihenfolge ändert
sich dabei (Formfehler vor Sachfehler), was die Gate-Erwartungen berührt.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass, V4).

**F-230** · `TECH_DEBT` · P3 · offen
Titel: Scheitert das Festschreiben eines Halts, bleibt der Workflow
zugemauert.
Beschreibung: `schreibeStartfehlerHalt` protokolliert einen fehlgeschlagenen
Halt-Schreibvorgang nur. Danach steht der Workflow auf `LAEUFT` ohne Schritt
auf `LAEUFT`: die Stale-Heilung greift nicht (sie verlangt einen SCHRITT auf
`LAEUFT`), und eine neue Fassung ist gesperrt, weil `LAEUFT` in
`GESPERRTE_ERSETZUNGS_STATUS` steht.
Fundstelle: `scripts/leitstand-server.mjs`, `schreibeStartfehlerHalt`.
Auswirkung: Sehr schmal — der Schreibvorgang scheitert nur bei einem
I/O-Fehler oder wenn der Datensatz zwischenzeitlich ungültig wurde. Dieselbe
Zustandsklasse, die die Funktion selbst verhindern soll.
Empfohlene Maßnahme: Entweder die Stale-Heilung auf „Workflow LAEUFT, aber
KEIN Schritt auf LAEUFT" erweitern (dann heilt der nächste Startversuch auch
diesen Fall), oder den Zustand ausdrücklich in der Halte-Zustands-Tabelle
führen. Die erste Variante ist eine Regeländerung und braucht einen eigenen
Rot-Fall.
Status: offen.
Feature/Run: F15 WS-2c (b1), 10.09.2026 (Reviewer-Pass, V3).

**F-232** · `TECH_DEBT` · P3 · offen
Titel: Die Reihenfolge-Zusage des Stopps ist eine Quelltextzusage, wie schon
die AK6b-Invariante.
Beschreibung: „Zuerst GESTOPPT schreiben, dann abbrechen" ist die tragende
Regel des Stopp-Endpunkts, aber verhaltensmäßig nicht ansteuerbar: beide
Schritte liegen in EINEM synchronen Block, und der Rückruf des abgebrochenen
Laufs kann frühestens im nächsten Microtask feuern. Vertauscht man sie,
bleiben alle Verhaltensfälle grün — real geprüft, nur die Quelltextprüfung
`STOPP-REIHENFOLGE` wurde rot. Damit hängt eine zweite Sicherheitszusage von
F15 an einem `indexOf` im Quelltext.
Fundstelle: `scripts/leitstand-server.mjs`, Bereich `STOPP-REIHENFOLGE`;
`scripts/check-f15-workflow.mjs`, gleichnamige Prüfung. Dieselbe Klasse wie
F-212 (AK6b-Invariante).
Auswirkung: Kein Defekt heute. Aber die Prüfung sieht, wie die
AK6b-Invariante, nur den markierten Bereich und nicht seine Callees: würde
`schreibeWorkflowFortschritt` je asynchron, wäre die Reihenfolge real
verletzbar und die Textprüfung bliebe grün.
Zwei Nachträge aus dem Reviewer-/QA-Pass vom 10.09.2026, beide dieselbe Klasse:
(1) Die Strecke LADEN→SCHREIBEN im Stopp-Endpunkt ist gar nicht markiert.
`STOPP-REIHENFOLGE` deckt schreiben→abbrechen ab; dass zwischen
`ladeArtefaktVersion` und `schreibeWorkflowFortschritt` kein `await` liegt,
trägt aber die Zusagen „ein abgelehnter Stopp schreibt nichts" und „der
eingefroren-Zweig ist unerreichbar". Beim Freigabe-Endpunkt ist genau diese
Strecke als Bereich markiert und begründet, beim Stopp nicht.
(2) Der `eingefroren`-Rücksetzer in `starteWorkflowSchritt` leitet seine
Workflow-Felder aus dem bei Funktionseintritt geladenen `workflowDaten` ab.
Der Ausdruck wird heute nie ausgewertet (der Schutz greift), aber der Code
sieht den Zweig vor und würde darin einen veralteten Status über den neueren
Stand des Menschen schreiben — gemeldet erst NACH dem Schreibvorgang.
Empfohlene Maßnahme: gemeinsam mit F-212 und F-217 behandeln — es ist
viermal dieselbe Frage (eine Synchronitätsannahme, die kein Gate mitliest).
Für (2) zusätzlich: im nicht-eingefrorenen Fall gar nicht schreiben oder die
Felder aus `datenMitSchritt` ableiten statt aus dem Eintrittsstand.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026 (Rot-Kalibrierung).

**F-234** · `TECH_DEBT` · P3 · offen
Titel: `laufAbgebrochen: false` ist mehrdeutig — es heißt nicht, dass nichts
läuft.
Beschreibung: Die Antwort des Stopp-Endpunkts unterscheidet zwei Fälle nicht:
„es lief gar nichts" und „es lief etwas, aber es gehörte nicht zu diesem
Workflow" (ein Lauf aus `POST /api/laeufe`, oder D13 ist von einem anderen
Workflow belegt). Beide antworten `200 { laufAbgebrochen: false }`.
Fundstelle: `scripts/leitstand-server.mjs`, Antwort von
`POST /api/workflows/<id>/stoppen`.
Auswirkung: Der Mensch stoppt, liest `false` und schließt daraus, es laufe
nichts mehr — während ein fremder Arbeitsstrang weiterläuft. Der Workflow ist
korrekt gestoppt, die Aussage der Antwort ist es nicht.
Zwei Nachträge aus dem Reviewer-/QA-Pass vom 10.09.2026:
(1) Ein dritter Fall fällt in dasselbe `false`: hat der Mensch nach dem Stopp
eine Reparaturfassung eingereicht, während der alte Lauf noch fliegt, trägt
kein Schritt mehr `LAEUFT` mit dessen `lauf_id` — ein erneuter Stopp findet
den Lauf am Artefakt nicht mehr und bricht ihn nicht ab. Die Ableseregel ist
richtig (raten wäre schlimmer), aber die Notbremse deckt diesen Fall nicht;
der Ausweg ist `POST /api/laeufe/<laufId>/abbrechen`.
(2) Die 200-Antwort trägt — anders als der Schwesterendpunkt `/freigabe`, für
den F15 „ein Endpunkt, ein Antwortschnitt" ausdrücklich begründet — KEIN
`status: 'GESTOPPT'`, und ihre `versionSequenz` ist die des
Entscheidungsartefakts, nicht die der neuen Workflow-Version. Solange der
Endpunkt von Hand bedient wird (AK8 offen), erzwingt das eine Rückfrage per
`GET /api/workflows/<id>` ohne Not.
Nachtrag F15 WS-3a, 10.09.2026: NICHT gelöst. Der Auftrag für WS-3a las
F-234 als „der aktive Lauf muss in der Ansicht erkennbar sein" — das ist
gebaut (die Schrittliste markiert den Schritt, dessen `lauf_id` der Server
über `GET /api/laeufe/<laufId>` als `aktiv` meldet, ohne Serveränderung),
aber es ist eine ZWEITE, unabhängige Auskunft neben der Stopp-Antwort und
ändert deren Mehrdeutigkeit nicht. Wer `laufAbgebrochen: false` liest, liest
weiterhin drei Fälle als einen. Die Ansicht senkt nur den Preis: der Mensch
kann jetzt nachsehen, statt raten zu müssen. Siehe auch F-248 (dieselbe
Mehrdeutigkeit in der Markierung selbst).
Empfohlene Maßnahme: Ein zusätzliches Feld in der 200-Antwort, das den Grund
nennt (`kein aktiver Lauf` / `aktiver Lauf gehört nicht zu diesem Workflow` /
`zugehöriger Lauf am Artefakt nicht mehr auffindbar`), plus `status` und die
Workflow-`versionSequenz` im Antwortschnitt — oder, belastbarer, die Frage der
WS-3-Ansicht überlassen, die den aktiven Lauf ohnehin anzeigt. Erst mit AK8
entscheidbar.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026.

**F-235** · `TECH_DEBT` · P3 · offen
Titel: `schreibeWorkflowFortschritt` hat sieben Positionsparameter, davon
zwei stumme.
Beschreibung: Die Funktion nimmt inzwischen `workflowId`, `schrittId`
(seit (b2) auch `null`), `schrittFelder`, `leiteWorkflowFelderAb`,
`profilReferenz`, `ladeOptionen` und `erwarteteLaufId`. An sechs der acht
Aufrufstellen stehen `{}` und ein Pfeil-Ausdruck nebeneinander, und die
Bedeutung von `null` als zweitem Argument ist ohne Blick auf die Signatur
nicht erkennbar. `erwarteteLaufId` steht an genau einer Aufrufstelle und ist
an den übrigen sieben unsichtbar — dass die Identitätsprüfung „nur in der
Nachbereitung" gilt, sieht man dem Aufrufort nicht an.
Fundstelle: `scripts/leitstand-server.mjs`, `schreibeWorkflowFortschritt` und
seine acht Aufrufstellen.
Auswirkung: Kein Defekt — jede einzelne Regel hat ihren Rot-Fall. Aber die
nächste Erweiterung fügt ein achtes Positionsargument hinzu, und ein
vertauschtes Argumentpaar fiele nur auf, wenn ein Gate zufällig danebenliegt.
Verstoß gegen dieselbe Lesbarkeitsregel, die F-229 beim Freigabe-Endpunkt
benennt.
Empfohlene Maßnahme: Auf ein Optionsobjekt umstellen
(`{ workflowId, schrittId, schrittFelder, leiteWorkflowFelderAb,
erwarteteLaufId }`) — eine mechanische Änderung an acht Stellen, die aber die
Zählungen im Gate berührt und deshalb eine eigene Iteration braucht.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026.

**F-236** · `TECH_DEBT` · P3 · offen
Titel: `check-f14-abbruch.mjs` hinterlässt bei einem fehlgeschlagenen Abbruch
einen verwaisten Kindprozess.
Beschreibung: Bei der Prüfung zu F-231 wurde die Hänge-Lücke in
`scripts/check-f14-abbruch.mjs` ausdrücklich WIDERLEGT — die Datei endet über
`process.exit()` und kehrt deshalb auch bei einem offenen Handle zurück, und
ihre Wartefunktionen sind mit 20 Sekunden begrenzt. Ein Rest bleibt aber: der
Block (b) startet einen Kindprozess über `HAENGE_SKRIPT`, der ausschließlich
durch den geprüften Abbruch endet. Wirkt der Abbruch nicht, meldet das Gate
korrekt einen Befund und beendet sich — der Kindprozess überlebt das,
`process.exit()` beendet unter Windows keine Kindprozesse. Zurück bleibt eine
`node.exe`, die niemand mehr kennt.
Fundstelle: `scripts/check-f14-abbruch.mjs`, Block (b) und seine
`finally`-Routine (nur `schliessen()`, kein Abbruch des Laufs).
Auswirkung: Kein falsches Gate-Ergebnis — der Befund kommt, der Exit-Code
stimmt. Aber jeder rote Lauf hinterlässt einen Prozess, der bis zum
Neustart lebt. Bei wiederholter Fehlersuche summiert sich das, und die
Ursache ist von außen nicht erkennbar.
Empfohlene Maßnahme: `beendeLaufFallsAktiv` aus
`scripts/check-f15-automat-real.mjs` übernehmen (dieselbe Aufrufform, D5) und
in der `finally`-Routine von Block (b) vor `schliessen()` aufrufen. Bewusst
NICHT in dieser Iteration mitgezogen: `check-f14-abbruch.mjs` gehört zu F14,
ist unverändert grün, und eine Änderung dort ohne eigenen Rot-Fall wäre die
Art Nebenbei-Korrektur, gegen die F-046 sich richtet.
Status: offen.
Feature/Run: F15 WS-2c (b2, Auflage 1), 10.09.2026.

**F-237** · `TECH_DEBT` · P4 · offen
Titel: Der Gate-Wachhund kann einen langsamen Rechner nicht von einem
überlebenden Kindprozess unterscheiden.
Beschreibung: Feuert der Wachhund in `scripts/check-f15-automat-real.mjs`,
meldet er „vermutlich überlebender Kindprozess". Das ist eine Vermutung und
als solche formuliert: derselbe Timer schlägt auch an, wenn die Maschine so
belastet ist, dass die realen Läufe die Frist überschreiten. Die Frist ist
mit fünf Minuten gegen zehn Sekunden reale Laufzeit sehr großzügig gewählt,
aber sie ist eine feste Zahl im Quelltext.
Fundstelle: `scripts/check-f15-automat-real.mjs`, `WACHHUND_FRIST_MS`.
Auswirkung: Ein falsch-roter Lauf ist möglich und würde als Kindprozess-Leck
gelesen. Die sichere Richtung (lieber rot als hängend) ist gewahrt, aber die
Meldung könnte in die Irre führen.
Empfohlene Maßnahme: Beim Feuern zusätzlich ausgeben, welche Blöcke bereits
durchgelaufen sind (Zahl der bisherigen Erfolgsmeldungen) — dann ist am
Ausgabetext ablesbar, ob die Datei kurz vor dem Ende hing oder mitten im
Testlauf. Eine Zeile, aber sie gehört zu einer Iteration, die den Wachhund
ohnehin anfasst.
Status: offen.
Feature/Run: F15 WS-2c (b2, Auflage 1), 10.09.2026.

**F-238** · `TECH_DEBT` · P3 · offen
Titel: Der `bezeugt: false`-Zweig des Stopps hat keinen Rot-Fall.
Beschreibung: Scheitert `registriereKernArtefakt` im Stopp-Endpunkt, bleibt
der Stopp gültig, ein Startfehlereintrag entsteht, und die 200-Antwort trägt
`bezeugt: false` mit Grund (F-233). Dieser Zweig ist über die HTTP-Oberfläche
nicht ansteuerbar: `workflowId` ist zu dem Zeitpunkt bereits gegen die
Zeichenregel geprüft, und ein I/O-Fehler von F2 lässt sich ohne
Fehlerinjektion nicht auslösen. Er ist damit gebaut, aber unbelegt — dieselbe
Klasse wie die F-228-Behandlung, nur ohne die Quelltextzählung, die dort den
Ersatznachweis trägt.
Fundstelle: `scripts/leitstand-server.mjs`, `catch`-Zweig der Bezeugung in
`POST /api/workflows/<id>/stoppen`.
Auswirkung: Gering — der Zweig ist vier Zeilen und schreibt nichts. Aber die
Zusage „ein stiller Verlust ist ausgeschlossen" hängt an ungeprüftem Code,
und `ARCHITECTURE.md` §8 verlangt, das nicht als erzwungene Grenze zu
behaupten.
Empfohlene Maßnahme: Entweder eine Fehlerinjektion für den F2-Schreibpfad
vorsehen (eine Testnaht, die es heute nicht gibt und die weitere Fragen
aufwirft), oder den Zweig ausdrücklich als unbelegt in `features/F15/
feature.md` führen. Gemeinsam mit F-228 behandeln — es ist dieselbe Frage:
was tun mit einer Zusage, zu der kein Verhaltensweg führt.
Status: offen.
Feature/Run: F15 WS-2c (b2, Auflage 2), 10.09.2026.

**F-241** · `TECH_DEBT` · P3 · offen
Titel: Ein ungültiger Bestandsdatensatz lässt sich nicht stoppen.
Beschreibung: Der Stopp-Endpunkt verlangt `validiereWorkflowDaten`-
Gültigkeit (409), und `schreibeWorkflowFortschritt` validiert zusätzlich das
Ergebnis vor dem Schreiben. Ein Workflow, dessen abgelegte Fassung durch eine
nachträglich verschärfte Querverweisregel ungültig geworden ist, lässt sich
damit nicht anhalten — während er für die ERSETZUNG ausdrücklich in jedem
Status offen bleibt (`bestandUngueltig`-Ausnahme in `POST /api/workflows`).
Fundstelle: `scripts/leitstand-server.mjs`, Prüfung (1) im Stopp-Endpunkt.
Auswirkung: Sehr schmal — der Startendpunkt validiert ebenfalls, ein solcher
Workflow kann also kaum laufen. Aber die Zusage „Bremse für den Workflow"
gilt dort nicht, und fliegt doch ein Lauf, bleibt nur
`POST /api/laeufe/<laufId>/abbrechen`.
Nachtrag F15 WS-3a, 10.09.2026: NICHT gelöst, und eine Klarstellung. Der
Auftrag für WS-3a ordnete F-241 dem DETAILendpunkt zu („beantwortet mit
409") — dieser Befund betrifft ausschließlich den STOPP-Endpunkt. Der
Detailendpunkt validiert überhaupt nicht und antwortet immer mit 200; das ist
als eigener Befund F-247 festgehalten. Die Ansicht trägt seit WS-3a einen
benannten Zustand „Fassung ungültig" (409-Zweig plus clientseitige
Formprüfung), der Stopp-Endpunkt ist unverändert.
Empfohlene Maßnahme: Prüfen, ob der Stopp die Gültigkeitsprüfung überhaupt
braucht — er schreibt nur Workflow-Felder und liest die Schrittliste; oder die
`bestandUngueltig`-Ausnahme aus `POST /api/workflows` sinngemäß übernehmen.
Beides ist eine Regeländerung und braucht einen eigenen Rot-Fall.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026 (Reviewer-Pass, Befund 3).

**F-242** · `TECH_DEBT` · P4 · offen
Titel: Der Stopp-Endpunkt trägt mehr Kommentar als Code, darunter Korrekturen
früherer Kommentarfassungen.
Beschreibung: Rund 60 Kommentarzeilen auf etwa 50 Zeilen Code, mit Absätzen,
die frühere Fassungen DESSELBEN Kommentars richtigstellen (die D2-Glosse, der
GESTOPPT-Schutz, der Wachhund). Die Sachaussagen stimmen — im Reviewer-Pass
einzeln geprüft —, aber Review-Historie gehört nach `features/F15/feature.md`
bzw. hierher, wo sie ohnehin steht.
Fundstelle: `scripts/leitstand-server.mjs`, `POST /api/workflows/<id>/stoppen`
und `schreibeWorkflowFortschritt`.
Auswirkung: Im Server erhöht die Masse die Wahrscheinlichkeit genau der Drift,
gegen die sie geschrieben ist — der Reviewer-Pass hat dafür im selben Zug ein
Beispiel gefunden (die Behauptung „bei GESTOPPT läuft nichts mehr", die für
die Sekunden nach einem Stopp mitten im Schritt falsch war).
Empfohlene Maßnahme: Als Leitplanke für WS-3 vormerken, nicht rückwirkend
ausdünnen: eine Kommentarkürzung ohne Anlass ist ein Diff ohne Nachweis.
Status: offen.
Feature/Run: F15 WS-2c (b2), 10.09.2026 (Reviewer-Pass, Befund 7).

**F-244** · `TECH_DEBT` · P3 · offen
Titel: Die Abschwächungserkennung und `ermittleNaechstenSchritt` lesen
`freigabe` in entgegengesetzter Richtung.
Beschreibung: `ermittleNaechstenSchritt` prüft `freigabe` als ALLOWLIST — nur
was in `AUTOMATISCH_STARTENDE_FREIGABE` steht, startet automatisch; ein
künftiger vierter Wert fällt in „hält an". `ermittleFreigabeAbschwaechungen`
aus (b3) prüft dieselbe Eigenschaft umgekehrt: alles, was nicht `ZWINGEND`
ist, gilt als Abschwächung. Beide Richtungen sind je für sich die sichere —
„hält an" bzw. „wird bezeugt" —, aber sie sind gegenläufig, und das steht nur
in den Kommentaren der beiden Funktionen, nirgends an einer Stelle zusammen.
Ein vierter Wert, etwa `ZWINGEND_MIT_VIER_AUGEN`, wäre nach der einen Regel
nicht automatisch startend (richtig) und nach der anderen eine Abschwächung
gegenüber `ZWINGEND` (falsch, es ist eine Verschärfung) — die Folge wäre eine
Begründungspflicht ohne Anlass, also die harmlose Richtung, aber eine, die
niemand erwartet.
Fundstelle: `src/workflow/index.ts`, `AUTOMATISCH_STARTENDE_FREIGABE`;
`scripts/leitstand-server.mjs`, `ermittleFreigabeAbschwaechungen`.
Auswirkung: Heute keine — `FREIGABE` hat genau drei Werte, und beide Regeln
liefern für alle drei dasselbe. Der Unterschied zeigt sich erst bei einer
Erweiterung, und dann an einer Stelle, an die niemand denkt.
Empfohlene Maßnahme: Eine gemeinsame, geordnete Definition der
Freigabestufen in `src/workflow/index.ts` (welche Stufe ist strenger als
welche), aus der beide Regeln ihre Antwort ziehen — dann ist „Abschwächung"
ein Vergleich statt zweier Aufzählungen. Gehört in dieselbe Iteration wie eine
etwaige vierte Stufe, nicht davor.
Status: offen.
Feature/Run: F15 WS-2c (b3), 10.09.2026.

**F-245** · `TECH_DEBT` · P3 · offen
Titel: `begruendung` in `POST /api/workflows` wird still verworfen, wenn keine
Abschwächung vorliegt.
Beschreibung: Damit das Feld überhaupt transportierbar ist, wird es vor
`validiereWorkflowDaten` aus dem Rumpf gelöst (das Schema ist
`additionalProperties: false`). Liegt keine Abschwächung vor, verschwindet es
damit spurlos — vorher wäre derselbe Rumpf mit 400 „unbekanntes Feld
'begruendung'" abgelehnt worden. Die Behandlung ist dieselbe wie bei `grund`
und `freigabe_erteilt` (beide werden ebenfalls still normalisiert), aber bei
denen ist das Verwerfen die SCHUTZWIRKUNG; hier ist es nur Bequemlichkeit.
Fundstelle: `scripts/leitstand-server.mjs`, Herauslösen von `begruendung` in
POST /api/workflows.
Auswirkung: Gering und in die harmlose Richtung. Wer aus Gewohnheit immer eine
Begründung mitschickt, bekommt keine Rückmeldung, dass sie diesmal nirgends
gelandet ist — und könnte glauben, jede seiner Planänderungen sei bezeugt.
Empfohlene Maßnahme: Gemeinsam mit F-229 (Formular-Prüfobjekte) behandeln: ein
`pruefeWorkflowFormular`, das Transportfelder von Schemafeldern trennt und
unbekannte Felder weiterhin ablehnt. Alternativ die 201-Antwort um ein
ausdrückliches `bezeugt: false` ergänzen, wenn eine Begründung kam, aber keine
Abschwächung vorlag.
Status: offen.
Feature/Run: F15 WS-2c (b3), 10.09.2026.

**F-246** · `TECH_DEBT` · P3 · offen
Titel: Die Bezeugung einer Planänderung ist an die schritt_id gebunden — ein
umbenannter Schritt entgeht ihr.
Beschreibung: `ermittleFreigabeAbschwaechungen` paart alte und neue Fassung
über die `schritt_id`. Wird ein `ZWINGEND`-Schritt in derselben Fassung
UMBENANNT und dabei abgeschwächt, sieht die Regel zwei Vorgänge: der alte
Schritt entfällt (Treffer, wird bezeugt) und ein neuer kommt hinzu (kein
Treffer). Das Ergebnis ist richtig — es wird bezeugt —, aber der Text nennt
den alten Namen und sagt „Schritt entfällt", obwohl er unter neuem Namen
weiterlebt. Der Mensch liest damit eine irreführende Beschreibung dessen, was
er gerade tut.
Fundstelle: `scripts/leitstand-server.mjs`,
`ermittleFreigabeAbschwaechungen`.
Auswirkung: Keine Umgehung — die Pflicht greift in beiden Fällen. Nur die
Meldung und der Artefaktinhalt beschreiben den Vorgang ungenau, und genau
diese Meldung ist der eigentliche Zweck der Prüfung.
Empfohlene Maßnahme: Nichts bauen, solange es keinen Umbenennungs-Pfad in der
Oberfläche gibt (AK8/WS-3). Wenn doch: dort entscheiden, ob eine Umbenennung
überhaupt zulässig sein soll — eine `schritt_id` ist ein Bezugspunkt für
`nachfolger`, `aktiver_schritt_id` und Entscheidungsartefakte.
Status: offen.
Feature/Run: F15 WS-2c (b3), 10.09.2026.

**F-248** · `TECH_DEBT` · P3 · offen
Titel: Die Markierung „läuft jetzt" fehlt still, solange das Laufverzeichnis
noch nicht existiert.
Beschreibung: `ermittleAktiveLaufIds` liest `aktiv` aus
`GET /api/laeufe/<laufId>` (D13). Dieser Endpunkt antwortet 404, solange
`kontrollzustand/<laufId>/` fehlt — und das Verzeichnis entsteht erst mit der
`RUN_PREPARED`-Wirkungsmarke des Execution Controllers. Zwischen dem
Schreiben der Workflow-Version (Schritt auf `LAEUFT` mit `lauf_id`) und
dieser Marke liegt ein Fenster, in dem der Schritt `LAEUFT` zeigt und die
Markierung fehlt. Real beobachtet: im WS-3a-Nachweis blieb die Markierung
zunächst ganz aus, weil die Werkzeug-Attrappe keine Marke schrieb.
Fundstelle: `public/leitstand/app.js`, `ermittleAktiveLaufIds`, gegen
`scripts/leitstand-server.mjs`, `GET /api/laeufe/<laufId>`.
Auswirkung: Das Fenster ist kurz, aber die fehlende Markierung ist von
„läuft nicht mehr" nicht unterscheidbar — dieselbe Klasse von
Mehrdeutigkeit, die F-234 am Stopp-Endpunkt beschreibt. Ein 404 und ein
`aktiv: false` sagen dem Leser dasselbe, obwohl sie Verschiedenes bedeuten.
Empfohlene Maßnahme: Entweder drei Zustände zeigen (`läuft jetzt` /
`nicht aktiv` / `noch nicht ermittelbar`), oder die Aktivauskunft nicht über
den Lauf-Detailendpunkt beziehen, sondern über ein Feld, das der Server ohne
Laufverzeichnis beantworten kann. Zusammen mit F-234 entscheiden.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026.

**F-250** · `TECH_DEBT` · P4 · offen
Titel: Zwei verschiedene Zahlen heißen in der Ansicht „Version".
Beschreibung: Die Workflow-Liste zeigt `versionSequenz` (die Artefaktversion
aus F2, „die wievielte Fassung dieses Workflows") unter der Überschrift
„Version". `WORKFLOW_V0` trägt zusätzlich ein eigenes Feld `version`, das der
Mensch in der Payload selbst setzt. Beide sind im Detail nebeneinander
sichtbar („Version (Plan / Artefakt)"), in der Liste nur die zweite.
Fundstelle: `public/leitstand/app.js`, `workflowKopfzeile`;
`schemas/kontrollzustand-workflow-payload.schema.json`.
Auswirkung: Gering, aber verwechselbar: wer eine korrigierte Fassung mit
unverändertem `version`-Feld einreicht, sieht die Listenzahl steigen und
könnte sie für sein eigenes Feld halten.
Empfohlene Maßnahme: Die Liste beschriftet die Zahl als „Fassung", oder sie
zeigt beide. Kosmetik, gemeinsam mit der WS-3b-Ansicht entscheiden.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026.

**F-251** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `public/` liegt außerhalb von Lint und Typprüfung — WS-3a schließt
davon nur die Syntaxlücke.
Beschreibung: `biome.json` führt unter `files.includes` ausschließlich
`scripts/**` und `src/**`; `tsconfig.json` ebenso, und dort nur `*.ts`.
`public/leitstand/app.js` (rund 1200 Zeilen, der gesamte Client) wird also
weder gelintet noch typgeprüft, und war bis WS-3a von keinem Gate berührt —
`scripts/check-f12-leitstand-ansicht.mjs` prüft trotz seines Namens die
API-Projektionen, nicht die Ansicht. WS-3as neues Gate prüft den Quelltext
gegen die Zusagen der Workflow-Ansicht und ruft zusätzlich `node --check`
auf; damit ist die Syntax gedeckt, Lint und Typen sind es nicht, und
`index.html`/`style.css` bleiben ganz ungeprüft.
Fundstelle: `biome.json`, `tsconfig.json`,
`scripts/check-f15-workflow-oberflaeche.mjs`.
Auswirkung: Eine tote Variable, ein vergessenes `await` (die Regel
`noFloatingPromises` ist im Projekt auf `error` gestellt und greift hier
nicht) oder eine falsch geschriebene Feldabfrage fällt in der gesamten Kette
nicht auf, solange sie das Textmuster des Gates nicht verletzt.
Empfohlene Maßnahme: `public/**` in `biome.json` aufnehmen und den daraus
folgenden Befundberg in einem eigenen Durchgang abtragen — nicht nebenbei in
einem Feature-Commit. Vorher prüfen, ob die Browser-Globals (`document`,
`fetch`, `console`) eine eigene Biome-Domain brauchen.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026.

**F-254** · `TECH_DEBT` · P3 · offen
Titel: Die Ansicht zeigt weder Zeitpunkte noch die Plandaten, an denen Halte
real entstehen, noch die Entscheidungsartefakte.
Beschreibung: Drei Lücken derselben Art — der Mensch liest einen Grund und
kann ihn nicht verorten. (1) Keine Zeitangabe: `WORKFLOW_V0` trägt kein
Zeitfeld (im Server als Grund für die alphabetische Sortierung notiert), also
lässt sich kein Halt datieren und ein stale `LAEUFT` nicht von einem frisch
gestarteten unterscheiden. (2) Die Schrittliste zeigt `eingaben`,
`werkzeugsatz`, `output_schema`, `risiko` und `grenzen` NICHT — genau die
Felder, an denen ein Start real scheitert. (3) Kein Entscheidungsartefakt ist
lesbar: weder Freigabe/Ablehnung mit Pflichtbegründung noch der Stopp noch
die Planänderung; `freigabe_erteilt: true` ist ein nackter Boolescher Wert
ohne Begründung, Zeitpunkt oder Verweis, und die Stopp-Begründung steht nur
im flüchtigen `grund`, den die nächste Fassung überschreibt.
Fundstelle: `public/leitstand/app.js`, `renderWorkflowKopf` /
`workflowSchrittZeile`; `schemas/kontrollzustand-workflow-payload.schema.json`.
Auswirkung: Die Ansicht taugt zum Zusehen, aber nur begrenzt zur Diagnose vor
einer Reparaturfassung — dem Zweck, für den AK8 sie vorsieht. Die Schreibseite
der Entscheidungsartefakte ist WS-3b zugeordnet, ihre LESESEITE bisher
keinem Workstream.
Empfohlene Maßnahme: (2) ist eine reine Anzeigeerweiterung und gehört nach
WS-3b. (3) braucht eine Entscheidung, ob die Ansicht die Entscheidungskette
je Workflow liest — ausdrücklich entscheiden, nicht implizit vertagen. (1)
ist eine Schema-/Serverfrage und größer als WS-3.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026 (QA-Pass, Fehler 5, 7, 9).

**F-255** · `TECH_DEBT` · P3 · offen
Titel: Ein Workflow mit unlesbarer Artefaktkette verschwindet lautlos aus der
Liste.
Beschreibung: `sammleWorkflows` überspringt jeden Eintrag, für den
`ladeArtefaktVersion` `null` liefert (`if (version === null) continue`) —
bewusst, damit ein defekter Datensatz nicht den ganzen Request 500en lässt.
Die Ansicht macht diese Entscheidung erstmals spürbar: Der Workflow fehlt
ohne Hinweis, und ist er der einzige, meldet der Leerzustand „Keine Workflows
unter kontrollzustand/ gefunden" — ein verlorener Workflow ist von „es gibt
keinen" nicht unterscheidbar, und der Mensch hat nicht einmal die ID, um das
Detail zu öffnen.
Fundstelle: `scripts/leitstand-server.mjs`, `sammleWorkflows`;
`public/leitstand/app.js`, `ladeWorkflows`.
Auswirkung: Schmal (setzt eine beschädigte Kette voraus), aber der Ausfall
ist total und stumm — dieselbe Klasse wie F-247/F-248: ein nicht
darstellbarer Zustand sieht aus wie ein normaler.
Empfohlene Maßnahme: `sammleWorkflows` liefert den übersprungenen Eintrag als
Platzhalter mit `workflowId` und einem Status „Kette nicht lesbar", statt ihn
zu unterschlagen. Serveränderung, eigener Rot-Fall; bewusst nicht in WS-3a.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026 (QA-Pass, Fehler 8).

**F-256** · `TECH_DEBT` · P4 · offen
Titel: Vier kleinere Anzeigemängel der Workflow-Ansicht, gesammelt.
Beschreibung: (a) `zeigePollFehler` hat mit `ladeWorkflows` jetzt drei
Schreiber auf einem einzigen `#poll-fehler`; ein erfolgreicher Poller blendet
den Hinweis des fehlgeschlagenen wieder aus, und die Workflow-Liste friert
dann stumm ein — genau das, wogegen der Hinweis gebaut ist. Das Muster ist
älter als WS-3a, WS-3a erhöht die Trefferwahrscheinlichkeit. (b) `Grund:
fertig` bei `ABGESCHLOSSEN` liest sich wie eine Fehlermeldung; das Schema
warnt ausdrücklich, das Feld sei „ohne Blick auf status keine
Fehlermeldung". (c) Fehlt einer Bestandsfassung ein Pflichtfeld, rendert
`escapeHtml(String(undefined))` das Wort `undefined` in die Zelle (Folge von
F-247: der Detailendpunkt validiert nicht). (d) Der Schrittstatus
`UEBERSPRUNGEN` wird als gleichrangig gezeigt, obwohl ihn niemand setzt und
das Überspringen gestrichen ist; kein Rückweg von einem Lauf zu seinem
Workflow; das Detail-Panel bleibt bei 404 dauerhaft offen und wiederholt den
Fehler alle zwei Sekunden; das unbedingte Neurendern zerstört alle zwei
Sekunden eine Textauswahl — gerade bei dem langen `grund`, den man für die
Reparaturfassung kopieren will.
Fundstelle: `public/leitstand/app.js`, Workflow-Ansicht.
Auswirkung: Einzeln gering, in Summe die Alltagsreibung der Ansicht.
Empfohlene Maßnahme: In WS-3b mitnehmen. (a) braucht einen Fehlerzähler je
Quelle statt eines geteilten Kennzeichens und betrifft dann auch `laden` und
`ladeStartfehler`.
Status: offen.
Feature/Run: F15 WS-3a, 10.09.2026 (Reviewer-Pass Befund 5/9, QA-Pass Fehler 10 bis 16).

**F-258** · `TECH_DEBT` · P3 · offen
Titel: Zwei Serverregeln liegen seit WS-3b als Anzeige-Zwilling im Browser —
ohne Gate, das sie zusammenhält.
Beschreibung: `public/leitstand/app.js` führt zwei Listen bzw. Regeln ein
zweites Mal, die in `scripts/leitstand-server.mjs` die eigentliche Wahrheit
sind: (a) `STOPPBARE_WORKFLOW_STATUS` (entscheidet, ob der Stopp-Knopf
angeboten wird) und (b) `ermittleAbgeschwaechteFreigabenAnzeige`, die
`ermittleFreigabeAbschwaechungen` nachbildet, damit die F-226-Warnung VOR dem
Einreichen erscheint statt erst im 400. Beides ist bewusst als ANZEIGE-
Zwilling gebaut und im Code so benannt — der Server entscheidet, die
Oberfläche bietet nur an —, aber kein Gate hält die beiden Fassungen
aneinander.
Fundstelle: `public/leitstand/app.js`, `STOPPBARE_WORKFLOW_STATUS` und
`ermittleAbgeschwaechteFreigabenAnzeige`, gegen `scripts/leitstand-server.mjs`.
Nachtrag (Reviewer-/QA-Pass 10.09.2026): es sind DREI, nicht zwei — der dritte
ist `REPARIERBARE_WORKFLOW_STATUS` und als F-262 eigens festgehalten, weil er
als einziger einen Bedienweg VERSCHLIESSEN kann statt nur einen Knopf zu viel
oder zu wenig anzubieten.
Auswirkung: Läuft (a) auseinander, fehlt ein Knopf oder er liefert einen 409
mit lesbarem Grund — sichtbar, nicht gefährlich. Bei (b) ist die Richtung
schlechter: die Warnung bliebe aus, und der Mensch liest die abgeschwächte
Freigabepflicht erst im Fehlertext. Die WIRKUNG bleibt in beiden Fällen beim
Server; falsch werden kann nur die Vorschau.
Empfohlene Maßnahme: Entweder einen Gate-Fall, der beide Listen textlich
gegeneinander prüft (Muster: die Zwillings-Enums in `src/workflow/types.ts`,
dort mit derselben Begründung ohne Gate gelassen), oder (b) über einen
Vorschau-Endpunkt beantworten lassen, statt die Regel zu spiegeln. Nicht
nebenbei: ein Vorschau-Endpunkt ist ein neuer Vertrag.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026.

**F-259** · `TECH_DEBT` · P2 · offen
Titel: Ein bearbeiteter Reparaturentwurf mit geänderter `workflow_id` legt
lautlos einen NEUEN Workflow an.
Beschreibung: Der Entwurf ist bearbeitbarer JSON-Text (bewusst — ein Formular
wäre ein Plan-Editor). `POST /api/workflows` legt anhand der `workflow_id` an
oder versioniert; ändert der Mensch beim Bearbeiten diese Zeile — ein
Tippfehler genügt —, entsteht ein zweiter Workflow mit 201, und der
reparaturbedürftige bleibt unverändert stehen. Die Erfolgsmeldung der Ansicht
nennt die workflowId, unter der sie den Entwurf geöffnet hat, nicht die aus
dem eingereichten Text: sie behauptet dann eine Wirkung am falschen Workflow.
Fundstelle: `public/leitstand/app.js`, `reicheReparaturEntwurfEin`; gegen
`scripts/leitstand-server.mjs`, POST /api/workflows.
Auswirkung: Kein Datenverlust (append-only, beide Workflows bleiben lesbar),
aber die Rückmeldung ist falsch, und der Mensch sucht den Fehler am falschen
Ende. Dieselbe Klasse wie F-224: zwei frei gewählte Kennungen, deren
Verwechslung niemand bemerkt.
Empfohlene Maßnahme: Beim Einreichen die `workflow_id` des Entwurfs gegen die
geöffnete vergleichen und bei Abweichung warnen (nicht sperren — eine neue
`workflow_id` kann gewollt sein, etwa als Kopie); die Erfolgsmeldung aus der
Antwort des Servers nehmen, nicht aus dem Öffnungskontext.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026.

**F-260** · `TECH_DEBT` · P3 · offen
Titel: Der Reparaturentwurf sagt nicht, ob die Nachbereitung des
abgebrochenen Laufs schon durch ist.
Beschreibung: Zweiter Teil von F-240, beim Bau von WS-3b bewusst nicht
mitgelöst. Der Entwurf wird zwar frisch geladen (`GET /api/workflows/<id>`
beim Klick, nicht aus dem Anzeigestand), aber der abgebrochene Lauf fliegt
nach dem Stopp noch. Trifft seine Nachbereitung erst NACH dem Einreichen ein,
greift F-227 und verwirft den Ausgang des Laufs — richtig, aber die einzige
Spur ist ein Eintrag in `GET /api/startfehler`, und der Entwurf zeigt
dauerhaft den Schrittstand, den der Mensch beim Öffnen erwischt hat.
Fundstelle: `public/leitstand/app.js`, `oeffneReparaturEntwurf`; gegen
`scripts/leitstand-server.mjs`, F-227-Schutz in `schreibeWorkflowFortschritt`.
Auswirkung: Das Fenster ist klein und der Ausgang sicher (es wird nichts
Falsches geschrieben), aber der Mensch bekommt keinen Hinweis, dass er zu
früh war. Verwandt mit F-254 (1): ohne Zeitfeld in WORKFLOW_V0 lässt sich
„gerade eben gestoppt" von „steht seit gestern" nicht unterscheiden.
Empfohlene Maßnahme: Entweder ein Zustandssignal am Workflow („ein Lauf
dieses Workflows ist noch aktiv", aus D13 ableitbar) über dem Entwurf zeigen,
oder den Entwurf beim Eintreffen einer neueren Version als veraltet
kennzeichnen. Das Zweite braucht die versionSequenz im Entwurf, also eine
kleine Erweiterung — nicht nebenbei.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (aus F-240 abgespalten).

**F-261** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Das Oberflächen-Gate nagelt Bezeichner fest, nicht nur Verhalten —
und eine seiner Pfadregeln ist zu locker.
Beschreibung: Zwei Beobachtungen aus dem WS-3b-Bau, beide am Muster F-215
(„das Gate diktiert die Form des Codes, statt ihn zu prüfen"). (a) Mehrere
Fälle in `scripts/check-f15-workflow-oberflaeche.mjs` suchen nach lokalen
Bezeichnern (`faelligMarke`, `cursorMarke`, `aktualisiereWorkflowBedienung`,
`REPARIERBARE_SCHRITT_STATUS`). Eine reine Umbenennung ohne jede
Verhaltensänderung macht das Gate rot. Das ist der Preis einer
Quelltextprüfung ohne Rendern und war beim Bau tragbar — der Umbau musste
NICHT gegen das Gate arbeiten —, aber es wächst mit jeder Zusage. (b) Die
Pfadregel in Fall (e) prüft auf `/api/workflows/<irgendwas>/starten` und
schlägt deshalb auch bei `/starten-weg` noch an: bei der Rotkalibrierung real
aufgefallen, weil die erste Manipulation den Endpunkt umbenannte und die
Zusage grün blieb.
Fundstelle: `scripts/check-f15-workflow-oberflaeche.mjs`, Fälle (e), (g), (h).
Auswirkung: (a) Reibung bei jedem Refactoring der Oberfläche. (b) Ein
umbenannter Endpunkt fällt nicht auf, solange der alte Name Teil des neuen
ist — der Fall ist konstruiert, aber die Zusage sagt mehr, als sie prüft.
Empfohlene Maßnahme: (b) die Pfadregel am Ende verankern (Backtick oder
Anführungszeichen direkt hinter dem Endpunktnamen). (a) beim nächsten
größeren Umbau der Ansicht entscheiden, ob ein Rendertest (Kopfloser Browser,
wie im WS-3b-Nachweis) die Quelltextfälle ablösen soll — dann prüft das Gate
Verhalten statt Bezeichner. Beides eigene Iteration.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Rotkalibrierung).

**F-262** · `TECH_DEBT` · P3 · offen
Titel: Der Reparaturweg der Oberfläche bildet die Ersetzungsregel des Servers
nach, statt sie zu erfragen.
Beschreibung: Dritter Anzeige-Zwilling neben den beiden aus F-258:
`REPARIERBARE_WORKFLOW_STATUS` in `public/leitstand/app.js` entscheidet, wann
"Reparaturfassung vorbereiten" angeboten wird, und bildet damit die Regel von
`POST /api/workflows` nach (`GESPERRTE_ERSETZUNGS_STATUS` plus die Ausnahme
`bestandUngueltig`). In WS-3b ist der ungültige Bestand als zweiter Öffner
nachgezogen (aus dem neuen Feld `verstoesse`), weil sonst genau die Fassung,
für die F-247 die Lesbarkeit erkämpft hat, ansehbar und nicht reparierbar
gewesen wäre. Die Regel selbst liegt aber weiterhin zweimal im Repo, und die
Oberfläche ist die engere von beiden.
Fundstelle: `public/leitstand/app.js`, `REPARIERBARE_WORKFLOW_STATUS` und
`renderWorkflowBedienung`, gegen `scripts/leitstand-server.mjs`,
POST /api/workflows.
Auswirkung: Fehlt ein Öffner, ist ein realer Reparaturweg unsichtbar — die
Wirkung ist ein zugemauerter Zustand, und das ist die Fehlerform, gegen die
F-207 und F-247 geschrieben sind. Die umgekehrte Richtung ist harmlos: ein zu
viel angebotener Knopf endet in einem 409 mit lesbarem Grund.
Empfohlene Maßnahme: Gemeinsam mit F-258 entscheiden — entweder ein
Gate-Fall, der beide Listen gegeneinander hält, oder ein Feld `ersetzbar` in
der Workflow-Projektion, das der Server beantwortet. Das Zweite passt zu
`naechster` und `verstoesse` und wäre die Auflösung aller drei Zwillinge.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Reviewer- und QA-Pass, unabhängig gefunden).

**F-263** · `TECH_DEBT` · P3 · offen
Titel: `naechster.schrittId` wirft den blockierenden Schritt weg, obwohl der
Server ihn kennt.
Beschreibung: `baueNaechsterProjektion` liefert `schrittId` nur für die
Ausgänge `starte` und `haltFreigabe`. `haltKlaerung` und `haltGestoppt`
führen ihren Schritt unter `aktiverSchrittId` (`src/workflow/types.ts`), und
bei Regel 3 ("nicht startbereit") und Regel 4 ("Worker nicht dispatchbar")
ist das genau der blockierende Schritt. Folge in der Ansicht: keine
Markierung "fällig" in der Schrittliste, kein Schrittname in der Liste, und
bei Regel 4 nennt auch der Grundtext den Schritt nicht — im Diagnosefall,
für den AK8 die Ansicht vorsieht.
Fundstelle: `scripts/leitstand-server.mjs`, `baueNaechsterProjektion`;
`src/workflow/index.ts`, Regel 3 und Regel 4.
Auswirkung: Der Mensch sieht "steht — Klärung nötig" und muss den Schritt aus
dem Fließtext des Grundes heraussuchen, statt ihn in der Tabelle markiert zu
finden.
Empfohlene Maßnahme: NICHT `aktiverSchrittId` in dasselbe Feld legen — das
wären Cursor und Blockierer unter einem Namen, zwei verschiedene Aussagen
(§16.2). Stattdessen ein eigenes Feld (`blockierterSchrittId`) oder die
Union in `src/workflow/types.ts` um einen benannten Schrittbezug erweitern.
Beides ändert einen Vertrag und braucht einen eigenen Rot-Fall.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (QA-Pass).

**F-264** · `TECH_DEBT` · P3 · offen
Titel: Ein stale `LAEUFT` zeigt in der Liste dauerhaft "läuft", und der
dokumentierte Ausweg ist über die Oberfläche nicht auslösbar.
Beschreibung: Die Lage "läuft" entsteht aus dem abgelegten `status` und sagt
nichts darüber, ob ein Lauf noch lebt. Nach einem Serverneustart mitten im
Schritt steht derselbe Status auf der Platte, und die Ansicht zeigt
unverändert "läuft". Die einzige Gegenprobe ist die Markierung "läuft jetzt"
an der Schrittzeile (D13) — sie steht nur im DETAIL, nicht in der Liste, und
ihr Fehlen ist laut F-248 ohnehin nicht von "läuft nicht mehr"
unterscheidbar. Zweitens ist der in `features/F15/feature.md`
("Halte-Zustände") dokumentierte Ausweg — der nächste Startversuch schreibt
`KLAERUNG_ERFORDERLICH` fest — über die Oberfläche nicht auslösbar: "Starten"
erscheint nur bei `naechster.art === 'starte'`, und ein stale `LAEUFT`
liefert `haltKlaerung`. Es bleibt "Stoppen", das über `GESTOPPT` in den
Reparaturzug führt — ein anderer Weg als der dokumentierte.
Fundstelle: `public/leitstand/app.js`, `beschreibeLage`;
`scripts/leitstand-server.mjs`, Stale-LAEUFT-Heilung in
POST /api/workflows/<id>/starten.
Auswirkung: Der Mensch wartet auf einen Lauf, den es nicht mehr gibt. Die
Ursache ist das fehlende Zeitfeld in `WORKFLOW_V0` (F-254 (1)): ohne es
lässt sich "gerade gestartet" von "steht seit gestern" nicht trennen.
Empfohlene Maßnahme: Gemeinsam mit F-248 und F-254 (1) entscheiden. Der
kleinste ehrliche Schritt wäre, die Aktivauskunft (D13) auch in die
Workflow-Projektion zu nehmen, statt sie je Schritt einzeln zu erfragen —
dann kann die Liste "läuft" von "steht auf LAEUFT, aber nichts läuft"
trennen, und der Heilungsweg ließe sich anbieten.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (QA-Pass).

**F-266** · `TECH_DEBT` · P4 · offen
Titel: `docs/STATUS.md` kennt weder Meilenstein 3 noch F15.
Beschreibung: `CLAUDE.md` erklärt `docs/STATUS.md` zur einzigen Quelle für
Phasenstand und Scope. Das Dokument führt Meilenstein 2 mit F11 bis F14, aber
Meilenstein 3 (`docs/projekt/zielfassung.md` §13.4) und F15 kommen darin
nicht vor — obwohl F15 seit mehreren Bauabschnitten der aktive Workstream ist
und mit WS-3b sein achtes Akzeptanzkriterium erfüllt.
Fundstelle: `docs/STATUS.md`, Abschnitt "Aktuelle Phase" und "Offene Punkte".
Auswirkung: Wer sich an der laut CLAUDE.md maßgeblichen Statusdatei
orientiert, hält F14 für den aktuellen Stand. Genau die Drift, gegen die der
Sanierungsdurchgang (`repo-audit`) geschrieben ist.
Empfohlene Maßnahme: In einer eigenen Doku-Iteration nachziehen — Meilenstein
3 als Abschnitt, F15 mit seinem Stand. Bewusst NICHT nebenbei in einem
Feature-Commit: eine Statusdatei, die im Vorbeigehen fortgeschrieben wird,
wird ungeprüft fortgeschrieben.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Reviewer-Pass).

**F-267** · `TECH_DEBT` · P4 · offen
Titel: `UEBERSPRUNGEN` fällt durch beide Raster des Reparaturentwurfs.
Beschreibung: `REPARIERBARE_SCHRITT_STATUS` (Oberfläche) setzt `LAEUFT`,
`FEHLGESCHLAGEN` und `VERWEIGERT` zurück; `STARTBEREITE_SCHRITT_STATUS`
(`src/workflow/index.ts`) lässt nur `OFFEN` und `WARTET_FREIGABE` starten.
`UEBERSPRUNGEN` steht in keiner der beiden Listen: ein Schritt in diesem
Status wird vom Entwurf nicht zurückgesetzt und hält den Automaten
anschließend erneut an — die eingereichte Fassung wird angenommen und steht
sofort wieder. Heute unerreichbar, weil das Überspringen gestrichen ist und
niemand den Status setzt (feature.md AK8, Entscheidung Stefan 10.09.2026);
ein künftiger `SCHRITT_STATUS`-Wert landete jedoch automatisch in derselben
Falle, weil die Liste in der Oberfläche eine Aufzählung ist und keine
Allowlist-Umkehrung.
Fundstelle: `public/leitstand/app.js`, `REPARIERBARE_SCHRITT_STATUS`, gegen
`src/workflow/index.ts`, `STARTBEREITE_SCHRITT_STATUS`.
Auswirkung: Heute keine. Als Bauart dieselbe Klasse wie F-244: eine Liste,
die beim Wachsen der Grundmenge stillschweigend falsch wird.
Empfohlene Maßnahme: Den Entwurf statt über eine Aufzählung über die
Umkehrung bilden ("alles, was nicht startbereit ist und eine lauf_id trägt")
— oder, sauberer, den Reparaturentwurf vom Server bauen lassen. Gemeinsam mit
F-262 entscheiden.
Status: offen.
Feature/Run: F15 WS-3b, 10.09.2026 (Reviewer-Pass).

**F-268** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: AK10 verlangt in einem Satz, was sich in einem Lauf gegenseitig
ausschließt.
Beschreibung: F15s AK10 lautet: „ein zweistufiger Workflow (lesender Schritt,
dann schreibender Schritt) läuft ohne manuellen Zwischenstart; ein
`ZWINGEND`-Halt tritt real ein; ein Abbruch nach F14 wirkt auf den aktiven
Schritt." Die ersten beiden Teilsätze widersprechen sich, sobald man versucht,
sie in EINEM Lauf zu belegen: ein `ZWINGEND`-Halt IST der manuelle
Zwischenschritt, dessen Abwesenheit Satz 1 zeigen soll. Der dritte Teilsatz
beendet den Lauf, in dem er stattfindet — nach einem Abbruch gibt es keinen
Folgeschritt mehr zu beobachten. Der Nachweis brauchte deshalb drei getrennte
Läufe (`nachweis/ws4/L1.json`, `L2.json`, `L3.json`).
Fundstelle: `features/F15/feature.md`, AK10.
Auswirkung: Wer AK10 wörtlich als EIN Kriterium liest, baut entweder einen
Nachweis, der einen der drei Teilsätze nur behauptet, oder er hält das
Kriterium für unerfüllbar. Beides ist schlechter als die Aufteilung. Dieselbe
Klasse wie F13s AK8 (ein Akzeptanzkriterium, das mehrere unabhängige
Beobachtungen in einen Satz packt) — zweites Vorkommen, also ein Muster und
kein Einzelfall.
Empfohlene Maßnahme: Beim Schneiden von Akzeptanzkriterien pro Kriterium EINE
Beobachtung verlangen. Wo drei Beobachtungen zusammengehören, drei nummerierte
Teilkriterien schreiben (AK10a/b/c), nicht drei Halbsätze. Kandidat für eine
Regel im Feature-Akte-Gate (`scripts/check-feature.mjs`): ein AK-Text mit mehr
als einem Semikolon-getrennten Prüfsatz ist ein Befund.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis).

**F-269** · `TECH_DEBT` · P2 · offen
Titel: Ein Workflow-Schritt hat keine eigene Anweisung — und weiß nicht, zu
welchem Workflow er gehört.
Beschreibung: Die einzige Anweisung, die ein Schritt bekommt, ist der
`auftragstext` seines Auftrags (`fuehreAufgabeDurch`: `prompt = "Auftrag:\n" +
auftragstext` plus Evidenzteil). `WORKFLOW_V0` kennt kein Feld für eine
schrittbezogene Anweisung, und im Kontextpaket eines Schritts stehen nur das
Auftragsartefakt und — falls vorhanden — die Laufakte des Vorgängerlaufs.
Der Workflow selbst wird nicht mitgereicht. Damit sind zwei schreibende
Schritte, die zu verschiedenen Workflows desselben Auftrags gehören, für den
Worker nicht unterscheidbar: er kann nur ableiten, DASS er einen Vorgänger
hat, nicht, in welchem Plan er steht.
Fundstelle: `schemas/kontrollzustand-workflow-payload.schema.json`
(`schritte[]` ohne Anweisungsfeld) gegen `src/execution-controller/index.ts`
(Promptbau aus `eingaben.auftragstext`).
Auswirkung: Beim AK10-Nachweis real aufgetreten. L1s Schritt 2 („schreibe die
Analyse nach `features/F15/nachweis-ak10-analyse.md`") und L2s Schritt 2
(„ändere die eine Zeile in `scripts/leitstand-server.mjs`") ließen sich aus
einem gemeinsamen Auftragstext nicht ansteuern; der Nachweis brauchte deshalb
zwei Aufträge statt einem. Praktisch heißt das: ein Auftrag kann heute nur
EINEN Workflow sinnvoll tragen, und die Schrittanweisungen müssen als
„wenn du Schritt 1 bist, dann …"-Prosa in den Auftragstext geschrieben werden.
Das ist eine Umgehung, die bei drei Schritten unlesbar wird.
Empfohlene Maßnahme: Nicht sofort bauen. Zuerst entscheiden, ob die Anweisung
ein `WORKFLOW_V0`-Schrittfeld wird (z. B. `anweisung`, optional wie `grund`,
damit der Bestand gültig bleibt) oder ob der Schritt sein Workflow-Artefakt im
Kontextpaket bekommt. Das Erste ist präziser, das Zweite billiger. Gemeinsam
mit F-270 entscheiden — beide betreffen dieselbe Lücke: was ein Schritt über
seinen Platz in der Kette weiß.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, Planungsphase).

**F-270** · `TECH_DEBT` · P2 · offen
Titel: Der Handoff zwischen zwei Schritten trägt kein Ergebnis, nur einen
Dateipfad.
Beschreibung: Endet Schritt n, bekommt Schritt n+1 über `vorgaengerLaufId`
dessen Laufakte ins Kontextpaket. `LaufakteV0Daten` hat aber kein Feld für das
Arbeitsergebnis — nur `rohstrom_referenz: { pfad, inhalts_hash }`. Der
Antworttext des Vorgängers steht in
`kontrollzustand-roh/<lauf_id>/rohstrom.json` unter `stdout`, dort als
JSON-String, dessen Feld `result` der eigentliche Text ist. Schritt n+1 kommt
also nur an das Ergebnis seines Vorgängers, wenn er diesen Pfad selbst öffnet,
das JSON zweimal auspackt — und wenn er zufällig dasselbe Dateisystem sieht
und `Read` im Werkzeugsatz hat.
Fundstelle: `src/claude-code-gateway/types.ts`, `LaufakteV0Daten`; gegen
`src/execution-controller/index.ts`, `vorgaengerLaufId`-Block.
Auswirkung: Beim AK10-Nachweis real aufgetreten. L1s Schritt 2 hätte ohne eine
ausdrückliche Leseanweisung im Auftragstext („die Laufakte nennt
`rohstrom_referenz.pfad`; darin `stdout`, darin `result`") nicht gewusst, was
Schritt 1 herausgefunden hat. Der Handoff funktioniert damit nicht kraft
Datenmodell, sondern kraft Prosa plus Dateisystem-Zufall. Ein lesender
Folgeschritt ohne `Read` im Werkzeugsatz käme gar nicht an das Ergebnis.
Empfohlene Maßnahme: Nicht sofort bauen. Entscheiden, ob das Ergebnis in ein
eigenes Artefakt gehört (ein `ergebnis-<lauf_id>` mit dem `result`-Text, das
F8 nach der Klassifikation registriert und das der Folgeschritt wie Auftrag
und Laufakte vorangestellt bekommt) — oder ob die Laufakte selbst um ein
Ergebnisfeld wächst. Gegen das Zweite spricht, dass die Laufakte heute reine
Aufrufdokumentation ist und ihr `inhalts_hash` an mehreren Stellen als stabile
Lineage-Referenz benutzt wird. Gemeinsam mit F-269 entscheiden.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, Planungsphase).

**F-271** · `TECH_DEBT` · P3 · offen
Titel: Die Laufakte hält nicht fest, welchen Werkzeugsatz ein Lauf hatte.
Beschreibung: `LaufakteV0Daten` (`src/claude-code-gateway/types.ts`) trägt
`werkzeug_version_deklariert`, `berechtigungskontext`,
`arbeitsverzeichnis_pfad` und `modell_beobachtet` — aber nicht die
`erlaubte_werkzeuge` des Laufs. Der Rohstrom hält nur `werkzeugStartziel`
fest, nicht die `argv` mit `--tools`/`--allowedTools`. Aus den Artefakten
allein lässt sich damit nicht feststellen, ob ein Lauf schreiben DURFTE.
`permission_denials: []` beantwortet die Frage nicht: der leere Wert ist mit
„hatte keine Schreibrechte und versuchte nichts" und mit „hatte sie und nutzte
sie nicht" gleich verträglich.
Fundstelle: `src/claude-code-gateway/types.ts`, `LaufakteV0Daten`; gegen
`src/claude-code-gateway/index.ts`, Rohstrom-Serialisierung (nur
`werkzeugStartziel`, `stdout`, `stderr`, `exitCode`, `startfehler`,
`beendigungsart`).
Auswirkung: Beim AK10-Nachweis real aufgetreten. Ein zusätzlicher, von Hand
gestarteter Lauf gegen denselben Auftrag musste vom Nachweis abgegrenzt
werden („hat der etwa auch geschrieben?"). Die Abgrenzung gelang nur über
einen Umweg — ein späterer Lauf zitierte die fragliche Codezeile noch in der
alten Fassung. Ohne diesen Zufall wäre die Frage aus den Artefakten nicht
beantwortbar gewesen. Für ein System, dessen Kern die Bezeugung von
Schreibwirkung ist, ist das eine Lücke im Auditpfad: die
Werkzeugsatz-Begrenzung ist die zentrale Sicherheitszusage (E-187/AC9,
`werkzeugsatz_begrenzung: DEKLARIERT`), und sie hinterlässt je Lauf keine
Spur.
Empfohlene Maßnahme: Die aufgelöste Werkzeugsatz-Begrenzung (`modus` +
`erlaubte_werkzeuge`) additiv in `LaufakteV0Daten` aufnehmen — dieselbe Stelle,
an der `berechtigungskontext` schon steht, und derselbe Wert, den
`loeseAusfuehrungsEingabenAuf` ohnehin schon in `aufrufEingaben.werkzeugsatz`
gelegt hat. Additiv, weil jede bestehende Laufakte append-only ist
(ARCHITECTURE.md §7); das Feld ist für Bestandsakten nicht rekonstruierbar und
darf deshalb nicht Pflicht werden.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, QA-Pass).

**F-272** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Der Abbruch-Nachweis konnte den Automatenhalt nicht isolieren — die
zweite Sicherung war zugleich der zweite Grund.
Beschreibung: L3 des AK10-Nachweises sollte belegen, dass ein Abbruch auf den
aktiven Schritt wirkt UND der Automat danach nicht fortsetzt. Der Folgeschritt
`schritt-2-fix` trug im Plan aber `freigabe: ZWINGEND` — bewusst als zweite
Sicherung gegen einen ungeplanten Codeeingriff, falls der Abbruch nicht
greift. Genau diese Sicherung macht die Beobachtung überdeterminiert: hätte
der Abbruch den Automaten gar nicht erreicht, wäre der Folgeschritt trotzdem
`OFFEN` geblieben, weil ihn die Freigabepflicht ohnehin angehalten hätte. Der
Nachweis belegt damit den Wortlaut von AK10 („wirkt auf den aktiven Schritt"),
nicht die stärkere Lesart („und stoppt die Kette").
Fundstelle: `nachweis/ws4/L3.json`, `schritte[1].freigabe`; Protokoll
`features/F15/nachweis-ak10.md`, Zeile L3-8.
Auswirkung: Kein Defekt am Produkt — die Regel selbst ist gate-geprüft
(`scripts/check-f15-automat-real.mjs`, Block (b): ein abgebrochener Schritt 1
setzt NICHT auf Schritt 2 fort). Der Befund liegt am Nachweisdesign: eine
Sicherung im Testaufbau, die denselben Ausgang erzeugt wie der zu belegende
Mechanismus, entwertet die Beobachtung. Das ist eine allgemeine Falle, keine
F15-Besonderheit — sie tritt überall dort auf, wo man einen Halt beweisen will
und den Aufbau vorsichtshalber zusätzlich absichert.
Empfohlene Maßnahme: Beim Entwerfen eines Nachweislaufs je Behauptung prüfen,
ob der erwartete Ausgang auch ohne den zu belegenden Mechanismus einträte.
Wenn ja, ist entweder die Sicherung zu entfernen (und das Risiko bewusst zu
tragen) oder die Behauptung zu schwächen. Für diesen konkreten Fall: ein
vierter Lauf, dessen Folgeschritt `freigabe: AUTOMATISCH` und einen HARMLOSEN,
nicht-schreibenden Auftrag hat — dann kostet die fehlende Sicherung nichts,
und der Halt wird isoliert sichtbar. Lohnt sich, wenn ohnehin ein weiterer
realer Automatenlauf ansteht; nicht als eigener Zyklus.
Status: offen.
Feature/Run: F15 WS-4, 10.09.2026 (AK10-Nachweis, QA-Pass).

**F-273** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Der Spike-Rot-Fall (Lauf 2) belegt nicht, dass ein Read-Only-Sandbox den
Schreibversuch verweigert hat.
Beschreibung: Lauf 1 (reiner Lesebefehl, `Get-ChildItem` und `rg --files`) und
Lauf 2 (Schreibbefehl) tragen dieselbe Fehlerform — `CreateProcess { message:
"Rejected(... powershell.exe ...) rejected: blocked by policy" }`. Die
Ablehnung greift bei `CreateProcess`, also vor jeder Schreibprüfung: die
execpolicy-Schicht lehnt das Programm `powershell.exe` ab (`codex exec --help`:
„`--ignore-rules`: Do not load user or project execpolicy `.rules` files"). Eine
Ablehnung, die Lesen und Schreiben gleich behandelt, belegt keinen
Read-Only-Sandbox. E-M3-2s Voraussetzung ist damit formal, nicht substanziell
erfüllt. Nicht belegt ist die frühere Annahme „keine Windows-Sandbox aktiv" —
siehe F-294.
Fundstelle: `state/tp-m3-01-codex.md` Lauf 1/2; `docs/projekt/zielfassung.md`
E-M3-2; `ARCHITECTURE.md` §8.
Auswirkung: Blocker für die Freigabe von F16 WS-2, kein Blocker für WS-1.
Empfohlene Maßnahme: S-M3-01b misst den Schreib-Rot-Fall mit Kalibrierung (im
selben Lauf muss ein Lesebefehl gelingen); Nachtrag in
`state/tp-m3-01-codex.md` (Aufgabe 4).
Status: offen.
Feature/Run: F16-Vorplanung 10.09.2026, korrigiert Gegenprüfung 11.09.2026.

**F-274** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Codex' Sandbox-Konfiguration liegt außerhalb des Repos, außerhalb jedes
Gültigkeitsschlüssels und ist am Argv abwählbar.
Beschreibung: `[windows] sandbox`, `sandbox_mode`, `approval_policy` stehen in
`~/.codex/config.toml`; Drift dort ist für den Kern unsichtbar
(`ermittleIstZustand` misst nur `.claude/settings.json`). `codex exec` 0.153.4
kennt `--ignore-user-config`, `-c`/`--config` (generischer TOML-Override,
Hilfe-Beispiel `-c 'sandbox_permissions=["disk-full-read-access"]'`),
`-p`/`--profile`, `--enable`/`--disable` („Equivalent to
`-c features.<name>=…`"). Jeder dieser Parameter hebt A1 auf.
Fundstelle: `src/invocation-policy/index.ts` (`ermittleIstZustand`);
`codex exec --help`, real gemessen 11.09.2026.
Auswirkung: Ein lesender Codex-Lauf könnte still unter einer anderen Policy
laufen, als die Startvorlage behauptet.
Empfohlene Maßnahme: `--sandbox read-only` zusätzlich am Argv pinnen (dort
protokolliert und pinnt E-182); die Argv-Allowlist lässt keinen der genannten
Parameter durch. `--ask-for-approval` existiert an `codex exec` nicht (F-279).
Status: offen.
Feature/Run: F16-Vorplanung 10.09.2026, korrigiert 11.09.2026.

**F-275** · `TECH_DEBT` · P2 · offen
Titel: `VERWEIGERT` ist für Codex-Läufe in v1 nicht erzeugbar — Schreibversuche
sind im Terminalausgang unsichtbar.
Beschreibung: Codex meldet Sandbox-Verweigerungen nur als Tracing-Zeile des
Routers und als Modell-Prosa (Spike Lauf 1/2, „kein eigenes strukturiertes
Feld"). `ARCHITECTURE.md` §7 verbietet Klassifikation aus Konsolentext,
Ausnahmespalte leer. Der Codex-Zweig des Evaluators kennt deshalb nur
`FEHLGESCHLAGEN`/`ERFOLGREICH`.
Fundstelle: `state/tp-m3-01-codex.md` Lauf 2; `ARCHITECTURE.md` §7;
`src/result-evaluator/index.ts`.
Auswirkung: Ein verhinderter Schreibversuch hält die Kette nicht an; er ist nur
im Rohstrom auditierbar. Die Sicherheitszusage (Sandbox + Allowlist +
Rot-Fall-Nachweis) ist nicht betroffen.
Empfohlene Maßnahme: S-M3-01b Messpunkt (f) prüft, ob Codex verweigerte
Befehle als strukturiertes `item` ausgibt; falls ja, Evaluator-Zeile
`VERWEIGERT` mit `sandbox_verweigerungen_anzahl`; sonst offen halten und im
Leitstand-Laufdetail die `stderr`-Zeilenzahl des Rohstroms anzeigen (Anzeige,
keine Klassifikation). Gemeinsam mit F-283 entscheiden.
Status: offen.
Feature/Run: F16-Vorplanung, 10.09.2026.

**F-276** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Egress-Grenze für Codex ist nicht durch den Kern ziehbar.
Beschreibung: Codex liest im `read-only`-Modus überall; `.claudeignore` gilt nur
für Claude Code. Im Arbeitsbaum liegen gitignorierte, personenbezogene bzw.
geheime Pfade (`programm/`, `.env*`, `.claude/settings.local.json`,
`state/zwischenstand/`). Ein Verengungsmechanismus existiert —
`codex sandbox --sandbox-state-readable-root` („Add a readable root to the
supplied sandbox state") —, steht aber nur am Unterbefehl `sandbox`, nicht an
`codex exec`. Konkretisiert F-185, hängt mit F-287 zusammen.
Fundstelle: `.gitignore` (Kommentar zu `programm/`), `.claudeignore`;
`codex sandbox --help`, real gemessen 11.09.2026.
Auswirkung: Datenabfluss an OpenAI bei jedem lesenden Codex-Lauf möglich, nicht
rückholbar.
Empfohlene Maßnahme: E-M3-4 (Aufgabe 3); `programm/` vor dem ersten realen
Codex-Lauf aus dem Arbeitsbaum; S-M3-01b Messpunkt (i).
Status: offen.
Feature/Run: F16-Vorplanung, 10.09.2026.

**F-277** · `TECH_DEBT` · P3 · offen
Titel: `WORKFLOW_V0.output_schema` wird validiert, aber von keinem Pfad gelesen.
Beschreibung: Einzige Treffer sind `validiereWorkflowDaten`
(`src/workflow/index.ts:246`) und die Typdefinition; kein Dispatch-Pfad wertet
das Feld aus. Sobald F16 es für Codex ehrt, ist ein gesetztes Schema bei
`worker: claude-code` ein uneingelöstes Versprechen.
Fundstelle: `src/workflow/index.ts:246`; `scripts/leitstand-server.mjs` (kein
Lesezugriff).
Auswirkung: Gering heute, irreführend ab F16.
Empfohlene Maßnahme: F16 WS-3 lehnt `output_schema ≠ null` bei `claude-code` im
Dispatcher ab (`ermittleNaechstenSchritt` → `haltKlaerung`), nicht in
`validiereWorkflowDaten` — siehe F-285.
Status: offen.
Feature/Run: F16-Vorplanung 10.09.2026, korrigiert 11.09.2026.

**F-278** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Roadmap-Zeilen zu F16 („`modell_beobachtet` aus JSONL", „`-m` verfügbar")
beruhten auf Doku-Lesung, nicht auf dem Spike.
Beschreibung: Die M3-Roadmap wurde vor dem Spike geschrieben; drei Annahmen
(Modellidentität im JSONL, Default-Sandbox reicht für Lesen, Rot-Fall erbracht)
sind durch `state/tp-m3-01-codex.md` widerlegt oder relativiert.
Fundstelle: `docs/projekt/zielfassung.md` §13.4 Umfeld;
`state/tp-m3-01-codex.md`.
Auswirkung: Ohne Vorplanung wäre der Bauauftrag mit falschen Vorgaben
gestartet.
Empfohlene Maßnahme: Regel für M3: Roadmap-Zeilen zu einem Feature erst nach
dem zugehörigen Spike in einen Bauauftrag übernehmen; Feature-Akte F16 zitiert
den Spike.
Status: offen.
Feature/Run: F16-Vorplanung, 10.09.2026.

**F-279** · `TECH_DEBT` · P3 · offen
Titel: `codex exec` kennt kein `--ask-for-approval`; `--approve-for-me`
impliziert `workspace-write`.
Beschreibung: `-a`/`--ask-for-approval` existiert nur am Top-Level-`codex`,
nicht an `exec`. `exec` bietet stattdessen `--approve-for-me`, laut Hilfe
„Route approval requests through automatic review using the workspace-write
sandbox" — für lesende Rollen verboten. `-m`/`--model` existiert und ist
bestätigt.
Fundstelle: `codex exec --help`, `codex --help`, `codex-cli` 0.153.4, real
gemessen 11.09.2026.
Auswirkung: Messpunkte (c)/(d) aus S-M3-01b vorab beantwortet.
Empfohlene Maßnahme: `--approve-for-me` in die Rot-Kalibrierung der Allowlist
aufnehmen.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-280** · `TECH_DEBT` · P1 · offen
Titel: Alle npm-Shims von Codex scheitern an `pruefeStartziel` — nur der native
Vendor-Pfad ist startbar.
Beschreibung: `%APPDATA%\npm` enthält `codex`, `codex.cmd`, `codex.ps1`. `.cmd`
und `.ps1` stehen in `ENDUNGS_SPERRLISTE`; `codex` ohne Endung ist ein
POSIX-sh-Skript und unter Windows nicht per `execFile` startbar. Startbar ist
nur `…\npm\node_modules\@openai\codex\node_modules\@openai\codex-win32-x64\
vendor\x86_64-pc-windows-msvc\bin\codex.exe` — absolut, erlaubte Endung, kein
Shell-Basisname, existiert. Der Pfad enthält Paketname, Plattform-Triple und
Vendor-Layout und ist damit versions- und maschinenabhängig.
Fundstelle: `src/claude-code-gateway/prozessstart.ts:60–61`; `@openai/codex`
`bin/codex.js`; real geprüft 11.09.2026.
Auswirkung: Ohne diesen Befund wäre WS-2 am ersten Prozessstart gescheitert.
Empfohlene Maßnahme: Pfad als `worker.codex.startziel` in `startvorlagen/`
pinnen; Gate lehnt `.cmd`/`.bat`/`.ps1`-Startziele ab.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-281** · `TECH_DEBT` · P1 · offen
Titel: Eine Verbotsliste ist für Codex strukturell untauglich — es braucht eine
Argv-Allowlist.
Beschreibung: Die entworfene Liste übersah mindestens elf real existierende
abwählende Parameter von `codex exec` 0.153.4
(`--dangerously-bypass-approvals-and-sandbox`,
`--dangerously-bypass-hook-trust`, `--ignore-user-config`, `--ignore-rules`,
`--enable`, `--disable`, `-p`/`--profile`, `--add-dir`, `-C`/`--cd`, `--oss`,
`--local-provider`, `--approve-for-me`). Entscheidend: `-c <key=value>` ist ein
generischer TOML-Override über einen offenen Schlüsselraum — eine Verbotsliste
dagegen ist nicht schließbar. `ARCHITECTURE.md` §7 („Aufrufparameter, die eine
Schutzschicht abwählen — Ausnahme: keine") verlangt eine Allowlist: nur
explizit aufgezählte Tokens passieren, alles Unbekannte lehnt ab.
Fundstelle: `codex exec --help`, real gemessen 11.09.2026; `ARCHITECTURE.md`
§7.
Auswirkung: Eine Verbotsliste erzeugt eine Schutzbehauptung, die bei der
nächsten Codex-Version still bricht.
Empfohlene Maßnahme: Allowlist in WS-1 AK2.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-282** · `TECH_DEBT` · P2 · offen
Titel: `pruefeAufrufparameter` kann keine Präfixe — Präfix-Verbote wären eine
Bauart-Änderung am schreibenden Pfad.
Beschreibung: Die Funktion prüft `parameter.includes(wert)` auf exakte Token
plus ein Token-Fenster für Einträge mit Leerzeichen. Ein Token wie
`-c sandbox_mode="danger-full-access"` ist EIN Token mit `=` und matcht nie.
Präfixfähigkeit nachzurüsten änderte die von Claude Code mitbenutzte
E-182-Funktion.
Fundstelle: `src/invocation-policy/verbotene-aufrufparameter.ts`.
Auswirkung: Regressionsrisiko am schreibenden Pfad für einen Bedarf, den nur
Codex hat.
Empfohlene Maßnahme: Codex-Allowlist als eigene Funktion in
`src/codex-gateway/`; `pruefeAufrufparameter` unverändert.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-283** · `TECH_DEBT` · P1 · offen
Titel: Der Result Evaluator ist durchgehend Claude-Code-spezifisch — ohne
Worker-Schalter vor `leseErgebnisobjekt` würde jeder Codex-Lauf
`FEHLGESCHLAGEN`.
Beschreibung: `ermittleErgebnis` ruft `leseErgebnisobjekt`, das `JSON.parse`
über das GESAMTE `stdout` macht und `obj.type === 'result'` verlangt. Codex
`--json` liefert JSONL (mehrere Zeilen) — `JSON.parse` scheitert, Rückgabe
`null`, Ergebnis `FEHLGESCHLAGEN`/`kein_ergebnisobjekt`. Der
`VERWEIGERT`-Zweig hängt zusätzlich an `ergebnisobjekt.permission_denials`,
einem Claude-Code-Feld. Betroffen sind also alle Ausgänge, nicht nur
`VERWEIGERT` (F-275).
Fundstelle: `src/result-evaluator/index.ts:135`;
`src/claude-code-gateway/index.ts:162–172`.
Auswirkung: Ohne Codex-Zweig zeigt WS-3 keinen grünen Schritt.
Empfohlene Maßnahme: WS-2 AK8 — Worker-Schalter VOR `leseErgebnisobjekt`.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-284** · `TECH_DEBT` · P2 · offen
Titel: E-193 verlangt das Gate im Gateway — eine Codex-Allowlist im Dispatcher
wäre genau das verworfene Aufrufer-Gate.
Beschreibung: E-193: „Ein Gate im Aufrufer ist umgehbar, sobald irgendein
anderer Codepfad `starteGateway` direkt aufruft; ein Gate im Gateway ist es
nicht." `starteGateway` ist eine Kette ohne Modusschalter —
`pruefeStartfreigabe` läuft immer. Codex braucht ein eigenes Gateway, das
Allowlist, `verweigereStart`, `run_prepared`-Wirkungsmarke, Rohstrom und
Laufakte selbst durchsetzt.
Fundstelle: `docs/projekt/zielfassung.md:239` (E-193);
`src/claude-code-gateway/index.ts:245–302`.
Auswirkung: Ohne diese Auflage verlöre der Codex-Pfad die Auditierbarkeit des
Claude-Pfades.
Empfohlene Maßnahme: WS-2 AK7.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-285** · `TECH_DEBT` · P2 · offen
Titel: Eine `output_schema`-Ablehnung in `validiereWorkflowDaten` bräche das
F15-Gate.
Beschreibung: `schemas/examples/kontrollzustand-workflow.valid.json` trägt in
`schritt-2-ausfuehrung` `"worker": "claude-code"` mit `"output_schema":
"kontrollzustand-laufakte"`; `scripts/check-f15-workflow.mjs` führt diese Datei
mit `sollGueltigSein: true`. Eine Validierungsregel „`claude-code` +
`output_schema` → ungültig" machte `npm run check` rot und den Bestand ungültig
(`ARCHITECTURE.md` §7, append-only).
Fundstelle: `schemas/examples/kontrollzustand-workflow.valid.json:33–36`;
`scripts/check-f15-workflow.mjs:91`.
Auswirkung: Falscher Ort für eine richtige Regel.
Empfohlene Maßnahme: Regel als sechste Zeile in `ermittleNaechstenSchritt`
(Allowlist-Bauart, → `haltKlaerung`); Bestandsdaten bleiben gültig.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-286** · `TECH_DEBT` · P2 · offen
Titel: `loeseAusfuehrungsEingabenAuf` zieht Startziel, Version und
Berechtigungskontext pauschal aus der Startvorlage.
Beschreibung: Die Funktion setzt `werkzeugStartziel`,
`werkzeugVersionDeklariert` und `berechtigungskontext` unbedingt aus
`vorlage.*`; nur `modell` kommt bereits aus dem Schritt. Für einen
`codex`-Schritt müssen alle drei nach `schritt.worker` gewählt werden.
`werkzeugsaetze.erlaubte_werkzeuge` ist ein `--allowedTools`-Begriff ohne
Codex-Entsprechung — der `worker.codex`-Block braucht eine eigene Form.
Fundstelle: `scripts/leitstand-server.mjs:1351–1390`;
`src/startvorlage/types.ts`.
Auswirkung: WS-3-Umfang, jetzt als AK11 benannt.
Empfohlene Maßnahme: WS-3 AK11.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-287** · `TECH_DEBT` · P1 · offen
Titel: Die B1-Auflage hat keinen Durchsetzungsmechanismus.
Beschreibung: `.claudeignore` enthält weder `.env*` noch `programm/` — obwohl
`docs/projekt/zielfassung.md:257` `.env`/`.env.local` in `.claudeignore` als
Projektkonfiguration führt. `.claudeignore` ist ohnehin ein
Claude-Code-Mechanismus, den Codex nicht liest. Der einzige gefundene
Verengungsmechanismus (`--sandbox-state-readable-root`) steht nur an
`codex sandbox`, nicht an `codex exec`.
Fundstelle: `.claudeignore`; `docs/projekt/zielfassung.md:257`;
`codex exec --help` vs. `codex sandbox --help`.
Auswirkung: E-M3-4 schriebe eine Grenze fest, die niemand durchsetzt —
`ARCHITECTURE.md` §8 („Ohne kalibrierten Rot- und Grün-Fall wird sie nicht
`ERZWUNGEN` genannt").
Empfohlene Maßnahme: E-M3-4 trägt Durchsetzungsgrad `DEKLARIERT`; S-M3-01b
Messpunkt (i); Stefan entscheidet nach der Messung, ob `ERZWUNGEN` erreichbar
ist. Zusätzlich `.env*` in `.claudeignore` nachtragen (Zielfassung Z. 257
verlangt es ohnehin).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-288** · `TECH_DEBT` · P3 · offen
Titel: E-M3-3s Wortlaut „in der Startvorlage" widerspricht dem seit F15
gebauten Stand.
Beschreibung: `scripts/leitstand-server.mjs:1400` kommentiert
„`schritt.modell` -> `aufrufEingaben.modell` (E-185/E-M3-3: das gepinnte
Plandatum des Schritts, nie `vorlage.modell`)". Die Besetzung lebt am Schritt,
mit ausdrücklicher E-M3-3-Berufung. Nicht F16 weicht ab — `main` weicht bereits
ab.
Fundstelle: `docs/projekt/zielfassung.md:357`;
`scripts/leitstand-server.mjs:1400`; `src/workflow/types.ts`.
Auswirkung: Doku-Drift; ein späterer Leser hielte die gebaute Lösung für einen
Regelbruch.
Empfohlene Maßnahme: E-M3-3-Präzisierung (Aufgabe 3, von Stefan bestätigt).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-289** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Die Spike-Verweigerung stammt aus der execpolicy-Schicht
(`CreateProcess`), nicht aus dem Read-Only-Sandbox.
Beschreibung: Lauf 1 (reiner Lesebefehl) wurde mit exakt derselben Fehlerform
abgelehnt wie der Schreibbefehl in Lauf 2; die Ablehnung erfolgt beim
Programmstart von `powershell.exe`, vor jeder Schreibprüfung.
`codex exec --help` nennt mit `--ignore-rules` genau diese Schicht („Do not
load user or project execpolicy `.rules` files").
Fundstelle: `state/tp-m3-01-codex.md` Lauf 1/2; `codex exec --help`.
Auswirkung: Ursachenbefund zu F-273; jeder künftige Rot-Fall braucht einen
gelingenden Lesebefehl als Kalibrierung.
Empfohlene Maßnahme: Kalibrierungspflicht in AK9 und in S-M3-01b (b).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-290** · `TECH_DEBT` · P2 · offen
Titel: A1s `config.toml` ist nicht hash-pinnbar (E-188) und am Argv abwählbar.
Beschreibung: `~/.codex/config.toml` liegt außerhalb des Repos und außerhalb
des E-188-Gültigkeitsschlüssels; `--ignore-user-config`, `-c`/`--config`,
`-p`/`--profile`, `--enable`/`--disable` heben sie am Argv vorbei auf.
Fundstelle: `codex exec --help`; `src/invocation-policy/types.ts`
(`Gueltigkeitsschluessel`).
Auswirkung: Die Zusicherung „read-only" hinge sonst an einer Datei, die der
Kern weder sieht noch schützt.
Empfohlene Maßnahme: `--sandbox read-only` zusätzlich am Argv (dort
protokolliert und pinnt E-182); Allowlist lässt keinen Abwahlparameter durch.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-291** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Gegenprüfung lief gegen ein veraltetes lokales `origin/main`.
Beschreibung: Der lokale Arbeitsbaum kannte nur `94c57fe` (PR #124); der reale
Kopf von `main` auf GitHub ist `20d7d80` (PR #125, „docs(findings): F-182
gelöst …"), gegen den die Planungssitzung gelesen hat. Ursache: kein
`git fetch` seit PR #124 — kein Planungsfehler.
Fundstelle: `git log origin/main` lokal vs. GitHub.
Auswirkung: Zeilenangaben können um wenige Zeilen abweichen; keine inhaltliche
Abweichung festgestellt.
Empfohlene Maßnahme: Vor jeder Gegenprüfung und jedem Bau `git fetch` (Stefan,
Terminal).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-292** · `TECH_DEBT` · P2 · offen
Titel: Die Windows-Sandbox bringt einen eigenen Setup-Pfad mit.
Beschreibung: Das Paket enthält
`codex-resources/codex-windows-sandbox-setup.exe`; `codex sandbox` beschreibt
sich als „Windows restricted token sandbox". Ein Setup-Schritt über
`config.toml` hinaus ist möglich.
Fundstelle: `@openai/codex-win32-x64/vendor/…/codex-resources/`.
Auswirkung: Ohne Klärung misst S-M3-01b erneut nur die execpolicy-Schicht.
Empfohlene Maßnahme: S-M3-01b Messpunkte (h)/(k).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-293** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: „`codex sandbox windows`" ist kein Prüfbefehl — der geplante
Vorab-Schritt für Stefan war wirkungslos.
Beschreibung: `codex sandbox` nimmt `[COMMAND]...` als freie Argumente;
„windows" wurde als auszuführendes Kommando interpretiert und real gestartet:
„windows sandbox failed: `CreateProcessAsUserW` failed: 2 … cmd=windows
--help". Es gibt keinen Unterbefehl „windows". Der Schritt stammte aus einer
[Annahme] der Planungssitzung, die nicht real geprüft war.
Fundstelle: `codex sandbox --help`; real gemessen 11.09.2026.
Auswirkung: Der Vorab-Schritt richtet nichts ein und belegt nichts.
Empfohlene Maßnahme: Schritt ersatzlos gestrichen; Vorbedingungen in S-M3-01b
neu gefasst. Regel: Befehle für Stefans Terminal nur aus real geprüfter Hilfe,
nie aus Doku-Lesung.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-294** · `TECH_DEBT` · P2 · offen
Titel: Der Windows-Restricted-Token-Sandbox greift ohne `~/.codex/config.toml`.
Beschreibung: Ein `codex sandbox`-Aufruf versuchte `CreateProcessAsUserW`,
obwohl `~/.codex/config.toml` nicht existiert; `~/.codex/.sandbox_migration`
datiert vom Spike-Tag (09.09.), `~/.codex/cap_sid` und `~/.codex/.sandbox`
existieren. Belegt für `codex sandbox`, ungemessen für `codex exec`.
Fundstelle: `~/.codex/`-Verzeichnislisting; Ausgabe von `codex sandbox`,
11.09.2026.
Auswirkung: A1s `config.toml`-Schritt könnte redundant oder wirkungslos sein.
Empfohlene Maßnahme: S-M3-01b Messpunkt (h) misst mit und ohne `config.toml`.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-295** · `TECH_DEBT` · P3 · offen
Titel: Zwei Einträge der entworfenen Codex-Verbotsliste existieren in
`codex exec` 0.153.4 nicht.
Beschreibung: `--full-auto` und `--yolo` kommen weder in `codex exec --help`
noch in `codex --help` vor. Eine Rot-Kalibrierung darauf misst nichts und
erzeugt einen falschen Eindruck von Abdeckung.
Fundstelle: `codex exec --help`, `codex --help`, 11.09.2026.
Auswirkung: keine (Liste ersetzt).
Empfohlene Maßnahme: entfällt mit der Allowlist (F-281).
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-297** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Falsche Belegstelle für das Shell-String-Grep-Muster im Auftragsentwurf.
Beschreibung: Zitiert war `scripts/check-f4-invocation-policy.mjs:259` — dort
steht ein Bedingung-2-Drift-Fall. Das wortgrenzensichere Muster samt Selbsttest
steht in `scripts/check-f6a-claude-code-gateway.mjs:150–177` (AK14, F-057).
Fundstelle: beide Dateien.
Auswirkung: keine (vor Ausgabe korrigiert).
Empfohlene Maßnahme: Verweis in Auftrag 2 korrigiert.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-298** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Eine nur lesend gedachte Gegenprüfung hat einen zustandsändernden Befehl
auf der Maschine ausgeführt.
Beschreibung: Der Aufruf „`codex sandbox windows`" (zur Prüfung des
Vorab-Schritts) hat `~/.codex/cap_sid` und `~/.codex/.sandbox` angelegt bzw.
aktualisiert. Außerhalb des Repos, offengelegt, kein Schaden — aber die
Bridge-Regel kennt nur Git-Befehle; für Werkzeugaufrufe mit Seiteneffekt
außerhalb des Repos gibt es keine Regel.
Fundstelle: `~/.codex/` (Zeitstempel 11.09.2026 07:36); Bridge- und
Git-Sicherheitsregel (Projektinstruktion).
Auswirkung: gering.
Empfohlene Maßnahme: Regel ergänzen: Aus Prüfsitzungen nur `--help`/
`--version` fremder Werkzeuge; jeder Aufruf, der Prozesse startet oder Dateien
außerhalb des Repos schreibt, ist Stefans Terminal-Schritt oder Teil eines
Messauftrags.
Status: offen.
Feature/Run: F16-Gegenprüfung, 11.09.2026.

**F-299** · `TECH_DEBT` · P1 · offen
Titel: `windows.sandbox = "unelevated"` in `~/.codex/config.toml` ist auf
dieser Maschine die Bedingung dafür, dass Codex überhaupt Befehle ausführen
darf.
Beschreibung: Ohne sie wird jeder Befehl mit `rejected: blocked by policy`
abgewiesen, auch lesende. Löst F-294; erklärt den Negativbefund von S-M3-01
rückwirkend.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt (h).
Auswirkung: Ohne diesen Vorab-Schritt ist eine Codex-Rolle auf dieser
Maschine funktionsunfähig.
Empfohlene Maßnahme: `config.toml`-Schritt als Bedingung der
Codex-Inbetriebnahme festschreiben, nicht als optionale Empfehlung.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-300** · `TECH_DEBT` · P1 · offen
Titel: Ein an der Ausführungsrichtlinie gescheiterter Befehl erzeugt KEIN
JSONL-Ereignis auf stdout.
Beschreibung: Der Evaluator kann für Codex keine VERWEIGERT-Zeile aus stdout
gewinnen. Betrifft F-275 unmittelbar.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt (f).
Auswirkung: Eine strukturierte Verweigerungserkennung über stdout ist für
Codex nicht möglich; F16 WS-1/AK3 muss das berücksichtigen.
Empfohlene Maßnahme: AK3-Fixtures und die Verweigerungserwartung des
Evaluators an diesen Befund anpassen.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-301** · `TECH_DEBT` · P2 · offen
Titel: Die ERROR-Tracing-Zeilen des Routers stehen auf stderr, stdout bleibt
reines JSONL.
Beschreibung: Löst den Widerspruch aus F-296; AK3-Fixtures in F16 WS-1
entsprechend zuschneiden.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt (l).
Auswirkung: Der fünfte AK3-Fixture-Fall testet einen Strom, der in der
Praxis nicht vorkommt.
Empfohlene Maßnahme: Fixture-Kommentar auf diesen Befund umstellen; Fall als
reine Parser-Robustheit gegen ein hypothetisches Fremdformat führen.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-302** · `TECH_DEBT` · P1 · offen
Titel: `-c` ersetzt die gesamte Nutzerkonfiguration am Argv vorbei.
Beschreibung: Mit `--ignore-user-config -c 'windows.sandbox="unelevated"'`
verhält sich Codex wie mit Stefans `config.toml`. Belegt die Sperre von `-c`
in der Allowlist (F-274/F-281) als notwendig, nicht nur vorsorglich.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt zur
Konfigurationsüberschreibung.
Auswirkung: Ein durchgelassenes `-c` hebelt jede über `config.toml`
deklarierte Grenze aus.
Empfohlene Maßnahme: Allowlist-Sperre von `-c` beibehalten und mit diesem
Befund begründen.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-303** · `TECH_DEBT` · P1 · offen
Titel: Eine Lesebereich-Verengung für `codex exec` existiert nicht.
Beschreibung: `--sandbox-state-readable-root` ist nur am Unterbefehl
`sandbox` verfügbar, erweitert (statt zu verengen) und verlangt
`--sandbox-state-json`. Der Konfigurationsweg
(`permissions.<profil>.filesystem`, `"pfad" = "deny"`) wird zur Laufzeit mit
`Restricted read-only access requires the elevated Windows sandbox backend`
abgewiesen.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt (i).
Auswirkung: Betrifft F-287/E-M3-4: DEKLARIERT vs. ERZWUNGEN ist eine Frage
des Administrator-Setups, nicht der Konfiguration.
Empfohlene Maßnahme: Stefan entscheidet zwischen Variante A (DEKLARIERT,
kein Setup) und Variante B (ERZWUNGEN, elevated Backend als
Administrator-Setup).
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-304** · `TECH_DEBT` · P1 · offen
Titel: Der Vorgabe-Lesebereich der Windows-Sandbox ist maschinenweit.
Beschreibung: Aus einem Wegwerf-Verzeichnis heraus ließ sich der
ai-workforce-Arbeitsbaum ohne Zusatzflag lesen. Eine lesende Codex-Rolle
sieht heute das gesamte Dateisystem des Nutzers.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt (i).
Auswirkung: Die Lesegrenze einer Codex-Rolle ist heute nicht erzwungen,
sondern nur behauptet.
Empfohlene Maßnahme: Zusammen mit F-303 entscheiden; bis dahin die
Lesegrenze ausdrücklich als DEKLARIERT führen.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-305** · `TECH_DEBT` · P2 · offen
Titel: Der Modellname erscheint in keinem JSONL-Ereignis.
Beschreibung: Das verwendete Modell muss aus dem Argv protokolliert werden;
die Laufakte kann es nicht aus der Ausgabe rekonstruieren.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt (m).
Auswirkung: Ohne Argv-Protokollierung bleibt die Modellidentität eines Laufs
unbelegt.
Empfohlene Maßnahme: Modellname beim Start aus dem Argv in die Laufakte
schreiben.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-306** · `TECH_DEBT` · P3 · offen
Titel: Codex' TOML-Parser verträgt eine UTF-8-BOM, sein JSON-Parser für
`--output-schema` nicht.
Beschreibung: Isoliert gegen eine bewusst kaputte Kontrollvariante gemessen;
der JSON-Fall stammt aus S-M3-01 Lauf 3. Gleiches Programm,
unterschiedliche Toleranz.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, BOM-Messung;
`state/tp-m3-01-codex.md`, Lauf 3.
Auswirkung: Eine mit BOM erzeugte Schemadatei lässt den Lauf scheitern.
Empfohlene Maßnahme: Beim Erzeugen von Schemadateien bleibt BOM-frei
Pflicht.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-307** · `TECH_DEBT` · P2 · offen
Titel: Ohne angebundenes stdin schreibt Codex `Reading additional input from
stdin...` auf stderr.
Beschreibung: Nicht-interaktive Läufe müssen stdin schließen oder leer
liefern, sonst besteht Blockadegefahr.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, stdin-Messung.
Auswirkung: Ein Lauf ohne stdin-Behandlung kann hängen bleiben.
Empfohlene Maßnahme: Prozessstart des Codex-Gateways schließt stdin
ausdrücklich oder liefert einen leeren Strom.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-308** · `TECH_DEBT` · P1 · offen
Titel: Bei `--output-schema` ist nur die LETZTE `agent_message`
schemakonform.
Beschreibung: Frühere `agent_message`-Ereignisse enthalten freien Text. Ein
Auswerter, der die erste nimmt, bekommt kein JSON.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, Messpunkt (o).
Auswirkung: Ein falsch gewählter Auswertepunkt macht schemakonforme
Ergebnisse unbrauchbar.
Empfohlene Maßnahme: Auswerter nimmt ausdrücklich die letzte
`agent_message`; AK3 hält das fest.
Beleg-Nachtrag (S-M3-02, 11.09.2026): Lauf A in
`state/tp-m3-02-codex-output-schema.md` belegt real, dass
`--output-schema` frühere Freitext-`agent_message`s NICHT unterdrückt — der
Lauf trug zwei `agent_message`-Items, #1 mit 69 Zeichen freiem Text, #2 mit
dem schemakonformen JSON. Die naheliegende Gegenannahme, ein erzwungenes
Ausgabeschema forme alle Nachrichten des Turns, ist damit widerlegt. Die
Regel „ausdrücklich die LETZTE" gilt mit und ohne Flag.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026;
Beleg-Nachtrag S-M3-02, 11.09.2026.

**F-309** · `TECH_DEBT` · P2 · offen
Titel: Auf stderr erscheinen betriebsbedingte ERROR-Zeilen auch bei
Exit-Code 0.
Beschreibung: `codex_models_manager: failed to refresh available models`
erscheint bei erfolgreichen Läufen. Ein Evaluator darf „ERROR auf stderr"
nicht als Fehlschlag werten — was ohnehin gilt, weil er stderr nach
ARCHITECTURE §7 nicht auswerten darf.
Fundstelle: `state/tp-m3-01b-codex-sandbox.md`, stderr-Protokoll.
Auswirkung: Eine stderr-basierte Fehlerheuristik würde grüne Läufe als
gescheitert melden.
Empfohlene Maßnahme: stderr bleibt Diagnosekanal; Erfolg/Misserfolg
ausschließlich aus Exit-Code und stdout-JSONL.
Status: offen.
Feature/Run: S-M3-01b (Codex-Sandbox-Kalibrierung), 11.09.2026.

**F-310** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Ungenaue Erstdiagnose „nicht-existenter Push-Guard" — realer
Freigabe-Mechanismus (`commit-guard.cjs`) initial übersehen.
Beschreibung: Bei einem blockierten `git push` (Branch `docs/tp-m3-01b`)
wurde zunächst berichtet, der Push scheitere an einem nicht-existenten bzw.
unklaren „Push-Guard", der `state/freigabe-commit.md` verlange. Tatsächlich
existiert ein realer, git-getrackter PreToolUse-Hook
`.claude/hooks/commit-guard.cjs` (verankert in `.claude/settings.json`,
Historie bis `3b4f124`/Template-Baseline zurückverfolgbar, zuletzt gehärtet
in `57ee3af` „harness-freigabedatei-wiederherstellung"), der `git commit`/
`git push` aus einem Claude-Code-Bash-Aufruf ohne frische (<10 Min)
Freigabedatei blockiert. Die Erstdiagnose war in der Bezeichnung ungenau:
kein fehlender Guard, sondern ein Guard auf Harness-Hook-Ebene statt auf
Git-Hook-Ebene (`.githooks/pre-push` ist davon unabhängig, rein
diagnostisch, fail-open).
Fundstelle: `.claude/hooks/commit-guard.cjs`; `.claude/settings.json`
(`hooks.PreToolUse`, matcher `Bash`);
`state/plan-v2-harness-freigabedatei-wiederherstellung.md`.
Auswirkung: Keine Auswirkung auf F16-Funktionalität. Prozessrisiko: eine
ungenaue Diagnose eines realen Sicherheitsmechanismus kann künftig zu
falschen Schlüssen führen (z. B. „Guard umgehbar"/„nicht vorhanden"), wenn
sie unkorrigiert im Register steht.
Empfohlene Maßnahme: Künftige Diagnosen eines blockierten Commits/Pushes
zuerst gegen `.claude/settings.json` und `.claude/hooks/*` prüfen, bevor eine
Aussage über Existenz/Nichtexistenz eines Guards getroffen wird. Keine
Code-Änderung nötig.
Status: offen (Dokumentationskorrektur).
Feature/Run: F16, Findings-Nacherfassung F-299–F-310.

**F-312** · `TECH_DEBT` · P2 · offen
Titel: `starteCodexGateway` prüft `werkzeugStartziel.slice(1)` nicht gegen
`pruefeAufrufparameter` — bewusste Lücke gegenüber `starteGateway`.
Beschreibung: `starteGateway` (F6a) führt seit F-119 eine zweite
`pruefeAufrufparameter`-Prüfung über die Zusatzelemente des Startziels, weil
diese unverändert in `execFile`s argv landen und weder den E-182-Guard noch
den E-188-Gültigkeitsschlüssel passieren. `starteCodexGateway` hat diese
Prüfung nicht: die AK7-Reihenfolge ist wörtlich
`pruefeUndVerweigereCodexBeiTreffer` → `pruefeStartziel` →
Wirkungsmarke → `starteProzess`. Real trägt das Codex-Startziel heute genau
ein Element (`codex.exe`), die Lücke ist also derzeit nicht erreichbar.
Fundstelle: `src/codex-gateway/index.ts` (Kopfkommentar von
`starteCodexGateway`); `src/claude-code-gateway/index.ts`
(`startzielArgvPruefung`).
Auswirkung: Sobald ein Codex-Startziel mehr als ein Element trägt, gehen
diese Elemente ungeprüft ins Argv.
Empfohlene Maßnahme: Vor dem ersten mehrelementigen Codex-Startziel die
Prüfung nachziehen — oder das Startziel für Codex auf genau ein Element
festschreiben und das mechanisch prüfen.
Status: offen.
Feature/Run: F16 WS-2 (AK7), 11.09.2026.

**F-313** · `TECH_DEBT` · P2 · offen
Titel: Der Codex-Zweig des Result Evaluators prüft `--output-schema`-
Ergebnisse nur auf JSON-Objektform, nicht gegen das Schema selbst.
Beschreibung: `ergebnis_nicht_schemakonform` greift, wenn `tokens`
`--output-schema` enthält und die letzte `agent_message` kein JSON-Objekt
ist. Ein JSON-Objekt mit falschen oder fehlenden Feldern besteht diese
Prüfung. Bewusst so gebaut: welches Schema für den Lauf galt, steht nicht in
der Laufakte, und eine hier nachgebaute Schemaprüfung wäre eine unabhängig
verfallende Kopie der Schemadatei. Der Name des Prüfgrundes verspricht
allerdings mehr, als er hält.
Fundstelle: `src/result-evaluator/index.ts` (`ermittleErgebnisCodex`,
`istJsonObjekt`).
Auswirkung: Ein strukturell gültiges, inhaltlich schemawidriges Ergebnis
wird als ERFOLGREICH klassifiziert.
Empfohlene Maßnahme: Mit F17 (Rollenvertrag) entscheiden, ob der
Schemapfad in die Laufakte gehört; dann gegen die reale Schemadatei prüfen
oder den Prüfgrund umbenennen.
Status: offen.
Feature/Run: F16 WS-2 (AK8), 11.09.2026.

**F-314** · `TECH_DEBT` · P3 · offen
Titel: `StarterOptionen.stdinLeer` ist opt-in, obwohl ein Prozessstart ohne
stdin-Behandlung grundsätzlich hängen kann.
Beschreibung: F-307 ist mit `stdinLeer` für Codex gelöst; der
Claude-Code-Pfad bleibt bewusst unverändert (kein bestehender Test musste
angepasst werden — das war das Abnahmekriterium der Änderung). Damit gilt
die Absicherung aber nur für den einen Aufrufer, der sie ausdrücklich
setzt. Ein künftiger dritter Worker erbt das Problem erneut.
Fundstelle: `src/claude-code-gateway/types.ts` (`StarterOptionen`);
`src/claude-code-gateway/prozessstart.ts` (`echterStarter`).
Auswirkung: Ein neuer Aufrufer, der `stdinLeer` vergisst, läuft in dieselbe
Falle wie Codex vor F-307.
Empfohlene Maßnahme: Beim nächsten Worker entscheiden, ob `stdinLeer` zum
Vorgabewert wird — das verlangt eine erneute reale Messung des
Claude-Code-Pfads, deshalb jetzt nicht getan.
Status: offen.
Feature/Run: F16 WS-2 (F-307), 11.09.2026.

**F-316** · `TECH_DEBT` · P2 · offen
Titel: Ein Startfehler eines Codex-Laufs verschwindet in der Klassifikation
hinter dem generischen `beobachtungsbasis_unvollstaendig`.
Beschreibung: Scheitert der Spawn (z. B. `ENOENT`), schreibt
`starteCodexGateway` eine reguläre Laufakte mit
`beobachtungsbasis_vollstaendig: false`; der Rohstrom trägt den konkreten
`startfehler`, das Klassifikationsergebnis nennt ihn aber nicht. Der Fall
ist jetzt getestet (`codex-gateway.test.ts`), der Informationsverlust in der
Klassifikation bleibt. Derselbe Verlust besteht im Claude-Code-Zweig seit
F6a — es ist keine neue Schwäche, aber eine bisher nirgends benannte.
Fundstelle: `src/codex-gateway/index.ts` (Laufakte-Block);
`src/result-evaluator/index.ts` (`ermittleErgebnis`,
`beobachtungsbasis_unvollstaendig`).
Auswirkung: „Prozess ließ sich nicht starten" und „Strom war abgeschnitten"
sind im Ergebnis ununterscheidbar; die Unterscheidung steht nur im
Rohstrom.
Empfohlene Maßnahme: Mit dem nächsten Evaluator-Schnitt einen eigenen
`startfehler`-Grund einführen — für beide Worker gemeinsam, nicht nur für
Codex.
Status: offen.
Feature/Run: F16 WS-2 (AK7/AK8), 11.09.2026, QA-Pass.

**F-317** · `TECH_DEBT` · P2 · offen
Titel: Der Rohstrom-/Laufakte-/Lineage-Block ist in beiden Gateways fast
wörtlich doppelt vorhanden.
Beschreibung: `starteCodexGateway` wiederholt den Schluss von
`starteGateway` (Rohstrom schreiben, Laufakte bauen,
`registriereKernArtefakt`). Die Bauartentscheidung „zweites Gateway nach
F6a-Muster statt generischem Worker-Contract" deckt die Doppelung dem Grunde
nach; nicht gedeckt ist, dass das ROHSTROMFORMAT damit an zwei Stellen
gepflegt werden muss — und die beiden Formen weichen bereits ab (`tokens`
nur im Codex-Rohstrom). F-312 erfasst nur die Guard-Lücke, nicht diese
Formatdivergenz.
Fundstelle: `src/codex-gateway/index.ts` (Rohstrom-/Laufakte-Block);
`src/claude-code-gateway/index.ts` (gleichnamiger Block).
Auswirkung: Eine künftige Erweiterung des Rohstroms wird in einem der
beiden Gateways vergessen; der Evaluator sieht dann je nach Worker ein
anderes Artefakt.
Empfohlene Maßnahme: Vor dem dritten Worker den gemeinsamen Schluss
extrahieren (ein `schreibeLaufakteUndRohstrom`, das beide Gateways nutzen)
— nicht jetzt, weil das F6as bereits abgenommenen Pfad anfasst.
Status: offen.
Feature/Run: F16 WS-2 (AK7), 11.09.2026, Reviewer-Pass.

**F-318** · `TECH_DEBT` · P3 · offen
Titel: Dass ein Codex-Lauf ohne `stdinLeer` hängen bliebe, ist NICHT
gemessen — gemessen ist nur der Mechanismus.
Beschreibung: F-307 belegt, dass Codex auf stdin zugreift (`Reading
additional input from stdin...` auf stderr). Der einzige reale Codex-Lauf
dazu (S-M3-01b Lauf (a)) endete jedoch mit Exit-Code 0, also regulär. Der
Hang ist ausschließlich gegen ein synthetisches `node -e`-Skript gemessen,
das stdin bis EOF liest. Die erste Fassung der Kommentare in
`prozessstart.ts` und `codex-gateway/index.ts` behauptete den Codex-Hang
als Tatsache; die Formulierung ist korrigiert. Die Maßnahme selbst bleibt
richtig und kostenlos — nur ihre Begründung war stärker als der Beleg.
Fundstelle: `src/claude-code-gateway/prozessstart.ts` (Kopfkommentar zu
F-307); `state/tp-m3-01b-codex-sandbox.md`, Lauf (a).
Auswirkung: Gering für die Funktion, relevant für die Evidenzhygiene: eine
als gemessen ausgegebene Schlussfolgerung hätte sich später als Annahme
entpuppt.
Empfohlene Maßnahme: Bei Gelegenheit einen Codex-Lauf OHNE `stdinLeer`
gegen eine kurze Zeitgrenze fahren und das Ergebnis hier nachtragen —
entweder ist der Hang real, oder das Feld ist reine Vorsorge. Beides ist
eine brauchbare Antwort.
Status: offen (Formulierung korrigiert, Messung offen).
Feature/Run: F16 WS-2 (F-307), 11.09.2026, Reviewer-Pass.

**F-320** · `TECH_DEBT` · P3 · **verworfen**
Titel: Codex-Modellname zusätzlich in der Startvorlage führen.
Beschreibung: Vorschlag aus WS-3a, den für einen Codex-Lauf zu nutzenden
Modellnamen (zusätzlich) in der Startvorlage abzulegen. Verworfen: Der
Modellname ist bereits Pflichtfeld `modell` am Workflow-Schritt
(`schemas/kontrollzustand-workflow-payload.schema.json`) und wird von
`loeseSchrittEingabenAuf` als `aufrufEingaben.modell` durchgereicht. Ein
zusätzliches Feld in der Startvorlage wäre eine zweite, unabhängig
verfallende Quelle desselben Werts — genau das Motiv, aus dem E-193
Doppelquellen ablehnt.
Fundstelle: `schemas/kontrollzustand-workflow-payload.schema.json` (Feld
`modell`); `loeseSchrittEingabenAuf`.
Auswirkung: keine — der Wert ist vollständig vorhanden; die Umsetzung hätte
eine Drift-Quelle geschaffen.
Empfohlene Maßnahme: keine. Modellname bleibt einzig am Workflow-Schritt.
Status: verworfen.
Feature/Run: S-M3-02 (Codex `--output-schema`), 11.09.2026.

**F-321** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Die Aufrufverfolgung in Gate (g) findet nur `function <name>(`,
keine Pfeilfunktionen.
Beschreibung: `funktionsKoerper` in
`scripts/check-f16-codex-gateway.mjs` erkennt ausschließlich
`function <name>(`-Deklarationen. Ein als `const helfer = (r) => r.stderr`
geschriebener Helfer liefert dort `null` und wird in
`pruefeZweigAufStderr` stillschweigend übersprungen
(`if (koerper === null) continue`) — also genau der ausgelagerte Fall, den
die Verfolgung schließen soll, bleibt für diese Schreibweise offen. Heute
nicht erreichbar: alle Helfer im geprüften Pfad sind
`function`-Deklarationen.
Fundstelle: `scripts/check-f16-codex-gateway.mjs`, `funktionsKoerper`
(L421), `pruefeZweigAufStderr` (L458–L472).
Auswirkung: latent — eine stderr-Heuristik in einer Pfeilfunktion würde das
Gate unbemerkt passieren.
Empfohlene Maßnahme: Muster um `const <name> = (…) =>` erweitern plus
dritte Rot-Kalibrierung mit Pfeilfunktion — ODER ein Befund, wenn ein
aufgerufener lokaler Bezeichner keinen auffindbaren Körper hat.
Status: offen.
Feature/Run: S-M3-02 (Codex `--output-schema`), 11.09.2026.

**F-324** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Terminalblöcke geben `git checkout -b` ohne vorheriges
`checkout main` + `pull` aus und erzeugen so wiederholt die F-056-Divergenz.
Beschreibung: Der Branch `feat/f16-ws3a-dispatch-und-aufloesung` zweigte vom
bereits squash-gemergten `docs/s-m3-02-codex-output-schema` ab, weil der
ausgegebene Terminalblock nur `git checkout -b <name>` enthielt.
`.githooks/pre-push` hat es gefangen; die Korrektur kostete einen Cherry-Pick
(efc0732 → `feat/f16-ws3a-dispatch-v2`, PR #132) und einen abgebrochenen
gh-Prompt.
Fundstelle: `.githooks/pre-push` (F-056-Divergenzprüfung);
`state/findings.md` F-056; Challenger-Sitzung 11.09.2026.
Auswirkung: Kein Datenverlust, der Hook hält zuverlässig. Kosten sind ein
unterbrochener Push und die Gefahr, dass jemand `--no-verify` benutzt, weil
der Hook „im Weg steht".
Empfohlene Maßnahme: Ein Branch-Anlegen wird nie einzeilig ausgegeben.
Verbindliche Form: `git checkout main` → `git pull --ff-only` →
`git checkout -b <name>`. Auch dann, wenn der vorige Branch scheinbar gerade
gemergt wurde — Squash-Merge ist genau der Fall, in dem „scheinbar gemergt"
nicht „gleich origin/main" heißt.
Status: offen.
Feature/Run: F16 WS-3a, 11.09.2026 (Challenger-Sitzung).

**F-325** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Der Enkel-PID-Test liest eine Datei, die ein Enkelprozess unter Last
noch nicht geschrieben hat — dreimal rot, ohne Aufräum-Bezug.
Beschreibung: Herausgelöst aus F-257 beim Schließen von dessen
Aufräum-Klasse. Die Auftreten 1, 5 und 7 von F-257 (10.09. und zweimal
11.09.2026) sind ENOENT auf `f14-ws2-enkel-pid-<uuid>.txt` in
`src/claude-code-gateway/claude-code-gateway.test.ts` (AK4, Prozessbaum-Kill).
Der Test startet einen Prozess mit `zeitgrenzeMs: 500`, dessen Enkel seine
PID in eine Temp-Datei schreibt, und liest sie nach dem Kill per
`readFileSync`. Unter Last schafft der Enkel das Schreiben nicht innerhalb
der 500 ms — die Datei fehlt, der Test ist rot, der nächste Lauf grün. Das
ist WEDER ein Aufräum-Rennen (die gemeinsame Hilfe `raeumeVerzeichnis` greift
hier nicht: aufgeräumt wird eine einzelne Datei mit `force: true`, und das
Aufräumen war nie der rote Schritt) NOCH von der
STDIN_ZEITGRENZE_ROT_MS/GRUEN_MS-Trennung aus F16 WS-3a berührt — die liegt
in `codex-gateway.test.ts`.
Fundstelle: `src/claude-code-gateway/claude-code-gateway.test.ts`, Testfall
„starteProzess killt bei TIMEOUT unter Windows den kompletten Prozessbaum";
`state/findings.md` F-257, Auftreten 1, 5 und 7.
Auswirkung: Dieselbe wie bei F-257 — ein rotes Kettenglied, das man
gewohnheitsmäßig wegwiederholt. Niedriger eingestuft, weil es eine einzelne
bekannte Stelle ist und die Aufräum-Klasse, die die Häufigkeit trug, jetzt
geschlossen ist.
Empfohlene Maßnahme: Nach dem Muster der STDIN-Zeitgrenzen-Trennung: Die
500 ms sind hier NICHT der Prüfgegenstand — geprüft wird, dass der Kill den
ganzen Baum erfasst. Entweder auf das Erscheinen der PID-Datei warten, bevor
die Zeitgrenze zuschlägt, oder die Zeitgrenze so wählen, dass der Enkelstart
sie nicht reißt. Nicht: den Test tolerant gegen eine fehlende PID-Datei
machen — dann prüft er die Waisenfreiheit nicht mehr.
Status: offen.
Feature/Run: F-257-Aufräum-Iteration, 11.09.2026.

**F-326** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Der Leitstand startet ohne `LEITSTAND_STARTVORLAGE_PFAD` gegen
`startvorlagen/beispielprojekt.json`, die keinen `worker.codex`-Block trägt.
Beschreibung: `STANDARD_STARTVORLAGE_PFAD` zeigt auf
`startvorlagen/beispielprojekt.json`; die Umgebungsvariable
`LEITSTAND_STARTVORLAGE_PFAD` überschreibt sie erst beim Serverstart. Den
`worker.codex`-Block trägt seit F16 WS-3b ausschließlich
`startvorlagen/ai-workforce.json`. Wer den Leitstand ohne gesetzte Variable
startet, fährt also gegen eine Vorlage, die für Codex-Schritte gar nicht
ausgestattet ist.
Fundstelle: `scripts/leitstand-server.mjs:416` (STANDARD_STARTVORLAGE_PFAD),
`scripts/leitstand-server.mjs:4058` (Auflösung über `process.env`),
`scripts/leitstand-server.mjs:2067` (derselbe Default als Parameterwert von
`erzeugeRequestHandler` — wer den Handler einbettet, umgeht die
Umgebungsvariable ganz).
Auswirkung: Ein AK12-Lauf ohne gesetzte Variable scheitert an der
AK10-Ablehnung „fehlender worker.codex-Block". Die Meldung ist inhaltlich
korrekt — und sieht dabei aus wie ein Codefehler im Dispatch, obwohl nur die
falsche Vorlage geladen wurde. Genau diese Verwechslung kostet die Zeit.
Empfohlene Maßnahme: In `features/F16/feature.md` unter „Entschieden" und im
AK12-Nachweis festhalten. `features/F15/nachweis-ak10.md` führt es im
Nachweiskopf, F16 bisher nirgends — die Präzedenz existiert also, sie wurde
nur nicht übernommen.
Status: offen.
Feature/Run: F16 WS-3b Teil A, 11.09.2026.

**F-327** · `TECH_DEBT` · P2 · teilweise adressiert
Titel: Detailprojektion und `renderLaufakte` haben kein gemeinsames Gate;
API-Feld und angezeigte Zeile können auseinanderlaufen.
Beschreibung: `baueLaufakteProjektion` liefert die Felder, `renderLaufakte`
zeigt sie — geprüft wurden bis F16 WS-3b nur die Felder. Ein Umbau der
Anzeige, der eine Zeile verliert oder zwei Labels vertauscht, blieb in der
gesamten Kette grün, weil der Gate-Fall die API befragt und nicht die Seite.
Das gilt für ALLE FÜNF Zeilen des Laufakte-Blocks, nicht nur die zwei in
F16 hinzugekommenen: Worker, Modell (deklariert), Modell (beobachtet),
Beobachtungsbasis, Arbeitsverzeichnis.
Fundstelle: `scripts/check-f12-leitstand-ansicht.mjs` Fall (e) gegenüber
`public/leitstand/app.js:637` (`renderLaufakte`).
Auswirkung: Eine falsche Anzeige ist hier teuer, weil die Seite die einzige
menschliche Kontrolle über Herkunft und Rang der Modellangabe ist. Ein
vertauschtes Label wiese einen Codex-Lauf als `claude-code` aus, ohne dass
irgendetwas rot würde.
Empfohlene Maßnahme: Für AK12 durch Fall (f) desselben Gates geschlossen
(Label-zu-Feld-Paarung je Zeile, rot kalibriert). Die allgemeine Klasse
bleibt offen: die übrigen Zeilen des Blocks und die anderen render-Funktionen
in `app.js` haben weiterhin kein solches Gegenstück.
Beleg-Nachtrag (F16 WS-3b AK12, 11.09.2026): Für die beiden Läufe des
AK12-Nachweises ist die Lücke real geschlossen — nicht durch ein Gate,
sondern durch zwei reale `GET /api/laeufe/<laufId>`-Antworten, die `worker`
und `modellDeklariert` feldweise korrekt ausliefern (wörtlich zitiert in
`features/F16/nachweis-ak12.md`, Abschnitt „Leitstand-Anzeige"). Damit ist
für diesen Lauf belegt, dass Projektion und ausgelieferte Daten
übereinstimmen. Die allgemeine Klasse bleibt offen: die übrigen Zeilen des
Laufakte-Blocks und die weiteren `render`-Funktionen haben weiterhin kein
gemeinsames Gate, und auch hier bleibt die Spanne zwischen Serverantwort
und gerendertem Bild quelltextgeprüft.
Status: teilweise adressiert (für den AK12-Lauf geschlossen).
Feature/Run: F16 WS-3b Teil A, 11.09.2026; Beleg-Nachtrag F16 WS-3b AK12, 11.09.2026.

**F-329** · `TECH_DEBT` · P2 · offen
Titel: Der AK12-Nachweis ist an einer Stelle überdeterminiert: Auftragstext
und `--output-schema` erzwingen unabhängig voneinander reines JSON.
Beschreibung: Der Auftragstext des AK12-Laufs verlangt die Antwortform
selbst („Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt … Kein
Freitext vor oder nach dem JSON-Objekt, keine Codebloecke"). Für die
schemakonforme letzte `agent_message` gibt es damit zwei hinreichende
Ursachen. Hätte `--output-schema` gar nicht gewirkt, sähe das Ergebnis
identisch aus — der Lauf isoliert den Schalter nicht. Dieselbe Fehlerklasse,
die F-272 beschreibt, hier in eigener Sache.
Fundstelle: Auftragstext von Auftrag
`89c10996-cbb2-4d56-94db-31f905bb6cd1`, zitiert in
`features/F16/nachweis-ak12.md` Abschnitt C.
Auswirkung: Für AK12 ausreichend — der AK-Wortlaut verlangt ein
schemakonformes Ergebnis, nicht den Nachweis des Mechanismus; der Ausgang ist
belegt. Für eine gezielte Wirksamkeitsprüfung von `--output-schema` trägt
dieser Lauf nichts bei; dieser Beleg liegt allein in
`state/tp-m3-02-codex-output-schema.md` (Lauf A).
Empfohlene Maßnahme: Soll der Schalter selbst belegt werden, braucht es einen
neutralen Auftragstext, der die JSON-Form NICHT verlangt, und einen
Vergleichslauf ohne das Flag.
Status: offen.
Feature/Run: F16 WS-3b AK12, 11.09.2026.

**F-332** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: `commit-guard.cjs` löst bei jeder Commit-Message an, die den
Freigabedatei-Pfad nur in Prosa nennt.
Beschreibung: Aufgabe 4 des Guards prüft den Bash-Befehlstext mit
`normalisiert.includes(FREIGABE_DATEI)` (`commit-guard.cjs` Zeile ~189) —
ein reines String-Vorkommen über den gesamten Befehl, ohne Zugriffsverb,
ohne Wortgrenze, ohne Ausschluss von Text innerhalb von `-m "…"`.
Dadurch wird auch ein `git commit -m "… state/freigabe-commit.md …"`
verweigert, obwohl der Befehl die Datei nicht anfasst.
Fundstelle: `.claude/hooks/commit-guard.cjs`, Aufgabe 4 (Zeile ~186–195),
Konstante `FREIGABE_DATEI` Zeile ~67. Real aufgetreten bei PR #136.
Auswirkung: Fehlalarm, kein Sicherheitsproblem. Workaround bekannt:
`git commit -F <Datei>` statt Heredoc, Pfad in der Message umschreiben.
Empfohlene Maßnahme: Bedingung in Aufgabe 4 verengen (Zugriffsverb oder
Pfad-als-Argument statt reines Vorkommen). Konstante in Zeile 67 nicht
umdefinieren — Aufgabe 3 benutzt sie ebenfalls.
Beleg-Nachtrag (11.09.2026): Das Finding ist im Moment seiner eigenen
Registrierung erneut eingetreten — ein Heredoc-Anhang für diesen Eintrag
wurde vom Guard verweigert, weil der Prosa-Text den Freigabedatei-Pfad
nannte, obwohl der Befehl die Datei nicht angefasst hätte. Bestätigt den
beschriebenen Fehlalarm live.
Status: offen.
Feature/Run: F16 WS-3b Teil C / PR #136, 11.09.2026; Beleg-Nachtrag
Statusnachzug F-334/F-335, 11.09.2026.

**F-333** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Aufgabe 4 des Guards erkennt nur Befehle, die den
Freigabedatei-Pfad nennen — `git reset --hard` nennt ihn nicht.
Beschreibung: Abgespalten aus F-099 beim Schließen von dessen erster
Hälfte. F-099 hat zwei Lücken beschrieben; die versionierte
Freigabedatei ist mit PR #136 gelöst (`.gitignore`-Zeile
`state/freigabe-commit.md`, siehe F-331), die zweite nicht: Aufgabe 4 von
`.claude/hooks/commit-guard.cjs` blockiert ausschließlich Bash-Befehle,
die den Pfad-String selbst enthalten. Ein Befehl, der die Datei ohne
Nennung des Pfades materialisiert oder verändert — etwa ein
`git reset --hard` oder ein `git checkout <ref>` auf einen Stand, der
sie noch trägt — läuft am Guard vorbei.
Fundstelle: `.claude/hooks/commit-guard.cjs`, Aufgabe 4.
Auswirkung: Der Guard ist gegen versehentliche, den Pfad nennende
Zugriffe wirksam, gegen pfadlose Befehle nicht. Entschärft, aber nicht
geschlossen, durch das 10-Minuten-Frischefenster aus Aufgabe 3 und
dadurch, dass die Datei heute weder im Index noch auf `origin/main`
getrackt ist (geprüft 11.09.2026 per `git ls-files` und `git ls-tree`) —
ein `git reset --hard` materialisiert sie damit derzeit nicht mehr. Die
Lücke im Guard selbst bleibt davon unberührt.
Empfohlene Maßnahme: Offen — eine Pfad-String-Prüfung kann pfadlose
Befehle grundsätzlich nicht erfassen; wirksam wäre nur eine Prüfung des
Dateizustands nach dem Befehl oder eine Allowlist für
zustandsverändernde Git-Befehle. Bewusst nicht in diesem Auftrag
entschieden.
Status: offen.
Feature/Run: abgespalten aus F-099 beim Statusnachzug nach F16,
11.09.2026.

**F-334** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: `device_bash` über die Remote-Devices-Bridge ist seit dem
Windows-Update vom 08.09.2026 nicht nutzbar (no Plan9 drive shares
mounted).
Beschreibung: Aus der Bridge sind keine Git-Befehle mehr möglich, auch
keine lesenden. Verfügbar bleiben `device_list_dir`, `device_stage_files`
und Read/Bash auf die gestagte Kopie — also ausschließlich der Working
Tree.
Fundstelle/Kontext: real reproduziert am 08.09.2026 und erneut am
11.09.2026.
Auswirkung: Der Technical Challenger kann Git-Zustände (Branch-Stand,
Merge-Stand, `origin/main`) nicht mehr selbst belegen; entsprechende
Aussagen sind ohne Terminal-Beleg offene Unsicherheit. Claude Code ist
nicht betroffen.
Maßnahme: Ursache klären; bis dahin Git-Belege ausschließlich über
Stefans Terminal einholen.
Status: offen.
Feature/Run: Verifikationsrunde PR #137, 11.09.2026.

**F-335** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Statusfeld in `state/findings.md` führt uneinheitliche Werte.
Beschreibung: Im Register real vorhanden sind u. a.: `offen`, auch mit
Zusätzen wie „offen, absichtlich zurückgestellt" (F-011), „offen (Prio
von P2 auf P1 angehoben)" (F-013) oder „offen, zurückgestellt (E-192)"
(F-090); `gelöst` sowohl unformatiert (z. B. F-020, F-081, F-311) als
auch als `**gelöst**` (z. B. F-001, F-247, F-330), dazu „gelöst (vor
Push behoben)" (F-022); `erledigt` unformatiert (z. B. F-201, F-226,
F-239) und als wachsende Familie von `**erledigt durch <Bezug>**`-
Varianten mit Feature-/AK-Referenz (u. a. F-037, F-127, F-128, F-137,
F-138, F-157–F-159, F-175, F-199); `**behoben**` in der Kopfzeile
(F-047) und `behoben` unformatiert in einer separaten Status-Zeile
(F-328); außerdem `**korrigiert**` (F-030), `**entschieden**` (F-046,
F-141), `**zusammengeführt mit F-045**` (F-034), `**teilweise gelöst**`
bzw. `**teilweise gelöst** (Bedienweg)` (F-196, F-218), `**verworfen**`
(F-320) und `teilweise adressiert` (F-327). Die in diesem Finding
ursprünglich vorgegebene Fünf-Werte-Liste war damit unvollständig — real
ist die Streuung deutlich größer, besonders bei der uneinheitlichen
Fettung von „gelöst"/„erledigt" und bei den frei formulierten „erledigt
durch X"-Varianten. Bestätigt ist auch die Doppelführung: bei neueren
Einträgen (z. B. F-327, F-328, F-332, F-333) trägt sowohl die Kopfzeile
als auch eine separate `Status:`-Zeile den Status.
Fundstelle: `state/findings.md`, Kopfzeilen F-001–F-333 und die
`Status:`-Zeilen der neueren Einträge.
Auswirkung: Folgenlos, solange kein Gate das Feld parst. Relevant,
sobald offene Findings maschinell gezählt werden sollen.
Maßnahme: Bei F17 ein geschlossenes Statusvokabular festlegen und
einmalig über das ganze Register durchziehen. Keine Vereinheitlichung in
diesem PR.
Status: offen.
Feature/Run: Verifikationsrunde PR #137, 11.09.2026.

**F-336** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: features/F16/feature.md verweist auf einen F17-Verbraucher, den
E-M3-3 (präzisiert) ausgeschlossen hat.
Beschreibung: `features/F16/feature.md` verweist im Abschnitt
„Nicht-Ziele" auf einen F17-WS-2-Verbraucher einer `besetzung`-Tabelle,
den `docs/projekt/zielfassung.md` §13.4 E-M3-3 (präzisiert) inzwischen
ausdrücklich ausgeschlossen hat — F17 hat keine eigene
Assignment-/Besetzungsschicht und keine `besetzung`-Tabelle gebaut (die
feste Besetzung lebt je `WORKFLOW_V0`-Schritt, siehe `features/F17/
feature.md`, Abschnitt „Nicht-Ziele").
Fundstelle: `features/F16/feature.md`, Abschnitt „Nicht-Ziele";
`docs/projekt/zielfassung.md` §13.4 E-M3-3 (präzisiert).
Auswirkung: Eine Sitzung, die F17 aus der F16-Akte ableitet, baut eine
Besetzungstabelle, die eine zweite Wahrheit wäre.
Maßnahme: Satz in `features/F16/feature.md` beim nächsten Doku-PR
korrigieren.
Status: offen.
Feature/Run: F17-Challenge, 11.09.2026.

**F-337** · `TECH_DEBT` · P2 · offen
Titel: Router-Klassifikation als `claude-code` scheitert real in ~27 % der
Fälle an Markdown-Codezäunen um das JSON-Ergebnis.
Beschreibung: 8 von 30 echten `router`-Läufen im F18-WS-3-Eval
(`features/F18/eval-bericht-ws3.md`) lieferten ihr Klassifikationsobjekt
in einen ```` ```json ... ``` ````-Codezaun eingebettet statt als reines
JSON — trotz expliziter Prompt-Anweisung „Kein Freitext davor oder
danach". `scripts/route-auftrag.mjs` UND `scripts/eval-router.mjs` parsen
`ergebnisobjekt.result` strikt mit `JSON.parse` (kein Fence-Stripping) —
beide scheitern an diesen Läufen identisch. Forensische Nachprüfung (nicht
Teil des Produktionspfads): von den 8 eingezäunten Antworten war die
eingebettete Klassifikation in 7 Fällen inhaltlich korrekt — das
Urteilsvermögen des Routers ist also besser als die 53,3 %-Trefferquote
des Berichts zeigt, aber die Formatzusicherung ist es nicht. Ursache
strukturell erwartbar: ein `router`-Lauf über den direkten
`POST /api/laeufe`-Pfad hat keinen `--output-schema`-Mechanismus (nur
`codex` hat einen), siehe „Entschieden" in `features/F18/feature.md`.
Fundstelle: `features/F18/eval-bericht-ws3.md`; `scripts/route-auftrag.mjs`
(Zeilen ~108-131); `scripts/eval-router.mjs` (`leseKlassifikation`).
Auswirkung: Ein realer Routing-Versuch kann an einem reinen
Formatierungsartefakt scheitern, obwohl die Klassifikation selbst
brauchbar wäre — `route-auftrag.mjs` bricht dann mit Exit 1 ab, kein
Workflow wird registriert.
Maßnahme: In einem künftigen WS ein einmaliges, an einer Stelle
gepflegtes Fence-Stripping vor dem `JSON.parse` einführen (z. B. in
`leseErgebnisobjekt` oder einem gemeinsamen Helfer für beide Skripte,
D5) — nicht in diesem WS behoben, da F18 WS-3 misst, nicht repariert.
Status: offen.
Feature/Run: F18 WS-3 (Router-Eval-Gate), 11.09.2026.
Nachtrag (F22-Challenge, 14.09.2026): Ursache ist der CLI-Startpfad —
`worker`/`ausgabeSchemaPfad` stehen nicht in
`ERLAUBTE_STARTAUFTRAG_FELDER` (`scripts/leitstand-server.mjs`), nicht die
Rolle. Die Rolle `router` erlaubt laut `src/rollen/index.ts` bereits
`codex` mit `erlaubtes_output_schema: 'ergebnis-router'`. In F22 WS-1
lösbar (Router-Lauf über den regulären Startpfad mit `worker: 'codex'`
starten) statt weiter zu umgehen.

**F-338** · `TECH_DEBT` · P2 · offen
Titel: Wiederholt flakige Windows-Tests in vollem `npm run check`, isoliert
immer grün.
Beschreibung: Während F18-WS-2-Verifikation zeigten zwei aufeinanderfolgende
volle `npm run check`-Läufe je einen anderen Testausfall —
`execution-controller.test.ts` F12 AK5 (EPERM bei rmSync/raeumeVerzeichnis)
und `claude-code-gateway.test.ts:721` F14 WS-2 AK4 (ENOENT bei einer
Temp-PID-Marker-Datei aus einem Enkelprozess). Beide isoliert erneut
gelaufen: 25/25 bzw. 42/42 grün.
Fundstelle: src/execution-controller/execution-controller.test.ts;
src/claude-code-gateway/claude-code-gateway.test.ts:721.
Auswirkung: Kein Produktfehler, aber verlangsamt jede Verifikationsrunde
durch nötige isolierte Re-Läufe.
Maßnahme: Bei Gelegenheit prüfen, ob die Cleanup-/Prozessbaum-Routinen
unter Windows einen kurzen Retry/Delay vor rmSync/Dateizugriff vertragen.
Status: offen.
Feature/Run: F18 WS-2 Verifikation, 11.09.2026.

**F-341** · `TECH_DEBT` · P2 · offen
Titel: v0-Asymmetrie der Startvorlage erzwingt zwei Lesepfade für
`typ: "worker"`.
Beschreibung: Die Claude-Code-Startfelder stehen flach auf oberster Ebene,
die Codex-Felder genestet unter `worker.codex` (bewusste v0-Schuld,
dokumentiert in `schemas/startvorlage.schema.json`, F-286). Die
Verfügbarkeitsableitung in F19 WS-2 muss denselben Ressourcentyp `worker`
deshalb über zwei verschiedene Lesepfade auflösen.
Fundstelle: `schemas/startvorlage.schema.json`,
`startvorlagen/ai-workforce.json`.
Auswirkung: Sonderfall im WS-2-Modul und im Gate, kein Produktfehler.
Maßnahme: in WS-2 zwei Lesepfade akzeptieren und im Kopfkommentar auf
F-286 verweisen. Normalisierung erst bei `startvorlage_schema` v1.
Status: offen.
Feature/Run: F19-Challenge, 11.09.2026.

**F-343** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Geräte-Brücke kann den Arbeitsbaum seit Windows-Update nicht mehr
mounten.
Beschreibung: Seit dem Windows-Update vom 08.09.2026 schlägt der
Shell-Zugriff der Geräte-Brücke auf den Arbeitsbaum fehl (Meldung: no
Plan9 drive shares mounted). Der Challenger-Chat kann Dateien weiterhin
lesen (stage und Read), aber keine Befehle im Repo ausführen.
Fundstelle: Challenger-Chat 42, F19-Challenge und WS-1-Verifikation.
Auswirkung: lesende Git-Gegenprüfungen (log, diff, ls-tree) sind aus dem
Chat nicht mehr möglich und müssen als Terminalbefehle an den Menschen
gehen. Die bewährte Verifikationsgewohnheit bleibt sonst unverändert.
Maßnahme: Verifikationsweg in der nächsten Übergabe anpassen; Brücke
erneut prüfen, sobald ein Desktop-Update vorliegt.
Status: offen.
Feature/Run: F19-Challenge, 11.09.2026.

**F-344** · `BUG` · P2 · offen
Titel: Worker-Verfügbarkeit hängt real von `LEITSTAND_STARTVORLAGE_PFAD` ab.
Beschreibung: `loeseRessourcenAuf` (`src/ressourcen/index.ts`) leitet die
Verfügbarkeit eines Workers aus der geladenen Startvorlage ab. Der
Server-Default `startvorlagen/beispielprojekt.json` trägt keinen
`worker.codex`-Block; ohne
`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json` wird `codex`
deshalb real als nicht verfügbar aufgelöst, `claude-code` gegen dieselbe
Datei als verfügbar (`features/F19/nachweis-ws2.md`, Abschnitt „Red 3").
Fundstelle: `startvorlagen/beispielprojekt.json`, `src/ressourcen/index.ts`,
`features/F19/nachweis-ws2.md`.
Auswirkung: dieselbe Ursache wie F-326, jetzt mechanisch sichtbar — jede
Capability-Abfrage gegen den Default meldet Codex-Rollen als nicht
besetzbar. F19 macht das sichtbar, behebt es nicht.
Maßnahme: gemeinsam mit F-326 lösen (Default-Startvorlage mit vollständigem
`worker.codex`-Block oder Pflicht-Umgebungsvariable); bis dahin
`LEITSTAND_STARTVORLAGE_PFAD` explizit setzen. Nachträglich erfasst:
`features/F19/nachweis-ws2.md` verweist seit PR #146 auf F-344, der
Eintrag fehlte auf `main`.
Status: offen.
Feature/Run: F19 WS-2, 12.09.2026.

**F-345** · `TECH_DEBT` · P3 · offen
Titel: Skill-Ressourcen mit 1:1-Capability tragen keine Information.
Beschreibung: Die sechs Skill-Einträge in `ressourcen.json` tragen je genau
eine Capability (`advisor-pass` → `PLAN_REVIEW`, `git-flow` →
`GIT_WORKFLOW`, `handoff-vertrag` → `HANDOFF_WRITE`, `repo-audit` →
`REPO_AUDIT`, `spec-schreiben` → `SPEC_WRITE`, `werkzeug-auswahl` →
`TOOL_SELECTION`). Eine Capability mit genau einer Ressource ist ein
umbenannter Skill, keine Abstraktion.
Fundstelle: `ressourcen.json`.
Auswirkung: gering, rein konzeptionell.
Maßnahme: zusammenführen, sobald reale Nutzung Überschneidungen zeigt.
Nicht vorab abstrahieren (YAGNI).
Status: offen.
Feature/Run: F19 WS-1.

**F-346** · `BUG` · P2 · offen (Gate-Ausnahme dokumentiert, Ursache offen)
Titel: `erlaubte_worker` und Capability-Register widersprechen sich für
`code-reviewer` und `router`.
Beschreibung: Beide Rollen fordern in `benoetigte_capabilities` den Wert
`STRUCTURED_OUTPUT` und führen `claude-code` in `erlaubte_worker`.
`ressourcen.json` weist `claude-code` `STRUCTURED_OUTPUT` nicht zu, weil
für `claude-code` kein `--output-schema`-Mechanismus existiert (F-337).
Fundstelle: `src/rollen/index.ts` (`code-reviewer`, `router`);
`ressourcen.json` (Eintrag `claude-code`).
Auswirkung: ein Workflow-Schritt darf auf einem Worker geplant werden, der
die Rolle nicht erfüllen kann. Real gemessen in F18 WS-3: Router-
Klassifikation als `claude-code` scheitert in rund 27 % der Fälle an
Markdown-Codezäunen um das JSON.
Maßnahme (F19 WS-2, real umgesetzt): `scripts/check-f19-ressourcen.mjs`
prüft mechanisch (Regel 6), ob jeder in `erlaubte_worker` genannte Worker
die `benoetigte_capabilities` seiner Rolle vollständig deckt — das Gate wird
für beide Rollen real rot, sobald diese Prüfung existiert. Ein Verengen von
`erlaubte_worker` auf `['codex']` wurde für BEIDE Rollen geprüft und real
verworfen:
- `router`: ein Lauf über den direkten `POST /api/laeufe`-Pfad läuft
  strukturell IMMER als `worker: 'claude-code'` (`worker` steht nicht in
  `ERLAUBTE_STARTAUFTRAG_FELDER`, `router` erscheint in keiner
  Workflow-Vorlage als Schritt) — ein Verengen hätte jeden realen
  Router-Lauf abgelehnt, der Mechanismus wäre unbenutzbar gewesen.
- `code-reviewer`: keine Workflow-Vorlage plant `code-reviewer` je auf
  `claude-code` (alle drei Vorlagen setzen bereits `codex` ein) — für den
  PRODUKTIVEN Pfad wäre die Verengung kollisionsfrei gewesen. Real
  verworfen, weil `scripts/check-f15-workflow.mjs`s geteilte Testfixtur
  (`gateSchritt()`) `code-reviewer`/`claude-code` als Default für rund 90
  Testfälle verwendet, darunter einen Rotfall, der claude-code +
  `output_schema` gezielt testet (Regel 4b, `ermittleNaechstenSchritt`) —
  ein Verengen hätte dort ~85 Assertions zum Scheitern gebracht; die
  einzelne Korrektur wäre eine eigene, review-würdige Refaktorierung
  gewesen, kein WS-2-Minimalfix.
Entschieden mit Stefan (Rückfrage während F19 WS-2, 12.09.2026— zunächst
nur für `router` gefragt, die zweite Kollision bei `code-reviewer` wurde
erst danach beim realen Testlauf sichtbar und nach demselben Muster
gelöst): beide Rollen behalten `erlaubte_worker: ['claude-code', 'codex']`,
Regel 6 trägt für beide eine eng benannte, geprüfte Ausnahme
(`F346_AUSNAHMEN` in `scripts/check-f19-ressourcen.mjs`) statt der
Verengung. Die Ausnahme deckt ausschließlich `STRUCTURED_OUTPUT` für genau
diese Rolle/Worker-Kombinationen — jede andere Lücke bleibt ein Gate-Fehler.
Status: offen — die zugrunde liegende Lücke (`claude-code` kann
`STRUCTURED_OUTPUT` strukturell nicht bereitstellen) ist NICHT behoben,
nur mechanisch sichtbar gehalten. Löst sich erst mit F-337 oder einer
eigenen Iteration, die die F15-Testfixtur vom Rollenvertrag entkoppelt.
Feature/Run: F19 WS-1-Verifikation, F19 WS-2.

**F-349** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: `umsetzungsplan-fassung-1.md` ist führend für Reihenfolge/Backlog,
endet aber bei Meilenstein 2.
Beschreibung: `state/memory-map.md` führt das Dokument als führende Quelle
für Deliverables, Feature-Reihenfolge und Backlog; sein Inhalt endet bei
M2 (Stand 28.08.2026), M3/M4/F19 fehlen vollständig.
Fundstelle: `docs/projekt/umsetzungsplan-fassung-1.md`, `state/memory-map.md`.
Auswirkung: eine Rolle, die sich an die Memory-Map hält, plant gegen einen
drei Meilensteine alten Stand.
Maßnahme: Hinweisabsatz im Dokument (dieser PR); Memory-Map-Zeile bei
nächster Gelegenheit auf `zielfassung.md` §13 + `docs/STATUS.md` umstellen
oder das Dokument nachziehen.
Status: offen.
Feature/Run: M4-Challenge, 12.09.2026.

**F-354** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: `features/F19/feature.md` nennt 21 Einträge/6 Skills, real 22/7.
Beschreibung: `ponytail` wurde in WS-2 in `ressourcen.json` nachgetragen,
die Feature-Akte (Scope, AK2) nicht.
Fundstelle: `features/F19/feature.md`, `ressourcen.json`.
Auswirkung: Zahlenwiderspruch zwischen Akte und Register.
Maßnahme: Akte bei nächster F19-Berührung nachziehen.
Status: offen.
Feature/Run: M4-Challenge, 12.09.2026.

**F-355** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: CI-Kommentare behaupten „keine package-lock.json"; `npm ci`/Cache
ungenutzt.
Beschreibung: `.github/workflows/ci.yml` erklärt zweimal, das Projekt habe
keine Dependencies und keine Lock-Datei; beides ist seit den devDependencies
falsch. `cache: npm` und `npm ci` bleiben deshalb aus.
Fundstelle: `.github/workflows/ci.yml`, `package-lock.json`.
Auswirkung: längere CI-Läufe, irreführende Kommentare.
Maßnahme: auf `npm ci` + Cache umstellen, Kommentare entfernen.
Status: offen.
Feature/Run: M4-Challenge, 12.09.2026.

**F-356** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: `START-KLEIN.md`, `SETUP.md`, `README.md` erwähnen den Leitstand nicht.
Beschreibung: Der Betriebseinstieg (`npm run leitstand`, Port, Startvorlage,
Freigabedatei, Bezeugungs-Repo) steht nur in Feature-Nachweisen.
Fundstelle: die drei Dateien, `features/F15/nachweis-ak10.md`.
Auswirkung: Team-Dogfooding (F30) ist ohne Einstiegsdoku nicht möglich.
Maßnahme: F30 WS-1.
Status: offen.
Feature/Run: M4-Challenge, 12.09.2026.

**F-357** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Feature-Gate erzwingt Pflichtabschnitte nur bei `READY_FOR_TECH`;
`qa.md` und `HARNESS-LEARNING-STATE.md` weiter `[FÜLLUNG]`.
Beschreibung: `scripts/check-feature.mjs` prüft die vier Pflichtabschnitte
nur in diesem einen Status; eine Akte in `FEATURE_GATE`/`ABGESCHLOSSEN`
kann sie verlieren. `.claude/agents/qa.md` und
`docs/harness/HARNESS-LEARNING-STATE.md` sind nach 20 Features unausgefüllt.
Fundstelle: `scripts/check-feature.mjs`, `.claude/agents/qa.md`,
`docs/harness/HARNESS-LEARNING-STATE.md`.
Auswirkung: Prüfdruck endet, wo gebaut wird; Lernstand nicht festgehalten.
Maßnahme: Gate auf alle Status ab `READY_FOR_TECH` ausweiten; `qa.md` in
F29 füllen; Learning-State im Dogfooding (F30) nachziehen.
Status: offen.
Feature/Run: M4-Challenge, 12.09.2026.

**F-358** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: M4-Challenge-Auftrag v2 referenziert Zielbild v3, gearbeitet wurde
gegen v5.
Beschreibung: Versionsverweis im Auftragsdokument veraltet; die Challenge
hat das benannt und gegen v5 gearbeitet.
Fundstelle: Claude-Projekt „AI Workforce", Uploads vom 12.09.2026.
Auswirkung: keine, dokumentiert.
Maßnahme: keine; bei künftigen Auftragsdokumenten Basisversion prüfen.
Status: offen.
Feature/Run: M4-Challenge, 12.09.2026.

**F-363** · `TECH_DEBT` · P3 · offen
Titel: Lauf-Detail wird nicht gepollt, Workflow-Detail schon.
Beschreibung: `views/runs.js` lädt das Lauf-Detail nur beim Routen-Eintritt
(kein Detail-Auffrischer bei `zustand.js` registriert); `views/workflows.js`
registriert für das offene Workflow-Detail einen Detail-Auffrischer, der bei
jedem Poll-Tick nachzieht (solange eines offen ist). Bewusst so belassen
(AK3 verlangt keine Symmetrie, ein zusätzlicher Detail-Poll wäre neue Last).
Auswirkung: gering; ein offenes Lauf-Detail veraltet bis zum erneuten Öffnen.
Maßnahme: bei F21+ entscheiden, ob das Lauf-Detail denselben Auffrisch-Haken
(`abonniereDetailAuffrischer`) bekommt.
Status: offen.
Vermerk (F44 WS-5a, 01.10.2026): Aktualisieren-Knopf statt Detail-Poll — das Lauf-Detail `#/runs/<laufId>` lädt beim Öffnen und über „Aktualisieren“ (in jeder Lage), die Notiz „läuft“ nennt den Stand beim Öffnen; ein geänderter Stand schließt einen offenen Dialog. Nur `kenntnisgenommen` kommt live aus dem Aggregat (kein zusätzlicher Abruf). Ein Detail-Poll bleibt bewusst aus (keine Mehrlast je Tick).
Feature/Run: F20 WS-2 Challenge, 14.09.2026.

**F-364** · `TECH_DEBT` · P3 · offen
Titel: `pollZustand()` hat keinen Überholschutz — ein `pollJetzt()` kann von
einem parallel laufenden Intervall-Tick mit älteren Daten überschrieben
werden.
Beschreibung: `zustand.js` `pollZustand()` läuft ohne Sequenznummer- oder
Reentrancy-Prüfung, anders als jeder andere asynchrone Ladeweg in
`public/leitstand/` (`ladeWorkflowDetail`s `workflowRenderZaehler`,
`oeffneReparaturEntwurf`s `reparaturZaehler`, `ladeLaufDetail`s
`gewaehlteLaufId`-Vergleich — das etablierte "Überholschutz"-Muster dieser
Codebasis, F-252). Löst eine Bedienung `pollJetzt()` aus, während der
reguläre 2-Sekunden-Timer bereits einen Fetch offen hat, laufen zwei
`holeZustand()`-Aufrufe parallel; löst der ÄLTERE zufällig später auf,
überschreibt er kurzzeitig die frischeren Daten. Beide Aufrufe fragen
dieselbe globale Aggregat-Ressource fast zeitgleich ab (kein
entitätsbezogener Fetch wie bei einem Detail-Ladeweg) — die "falschen" Daten
sind bestenfalls Sekundenbruchteile älter, kein fachlich falscher Datensatz,
und der nächste reguläre Tick (spätestens 2s später) korrigiert sich von
selbst.
Fundstelle: `public/leitstand/zustand.js`, Funktion `pollZustand`.
Auswirkung: gering; nur unter echter Server-Last reproduzierbar
(`sammleLaeufe`/`sammleWorkflows` sind synchrone Disk-I/O und können unter
Last messbar blockieren) — von `scripts/check-f20-zustand-poll.mjs`
(sequenziell, ohne echte Nebenläufigkeit) nicht erfasst. Bewusst NICHT
sofort behoben (QA-Pass F20 WS-2): ein Überholschutz für eine global
geteilte, nicht entitätsbezogene Ressource ist eine andere Form von Schutz
als das bestehende Muster (dort schützt er vor FALSCH zugeordneten Daten,
hier nur vor einem geringfügig veralteten Snapshot) und wäre eine
Scope-Erweiterung über WS-2 hinaus gewesen.
Maßnahme: bei Bedarf (z. B. wenn ein Nachweis mit künstlich verzögertem
`sammleLaeufe`/`sammleWorkflows` das Muster real auslöst) einen
Tick-Zähler nach demselben Muster wie `workflowRenderZaehler` ergänzen.
Status: offen.
Feature/Run: F20 WS-2 QA-Pass, 14.09.2026.

**F-365** · `BUG` · P2 · offen
Titel: Veraltetes Entscheidungs-Formular im Lauf-Detail führt zu rohem 400
statt Re-Sync-Hinweis.
Beschreibung: Weil das Lauf-Detail nicht gepollt wird (F-363), bleibt ein
einmal geladenes "Klärung erforderlich"-Formular sichtbar, obwohl der Lauf
serverseitig inzwischen ABGESCHLOSSEN ist. Ein Speichern-Versuch liefert
einen technischen 400-Text ("art 'terminal' ist nur bei Status
KLAERUNG_ERFORDERLICH erlaubt (F-167)") statt eines verständlichen Hinweises
oder eines automatischen Re-Syncs. Real beobachtet im F20-WS-2-Realtest:
ein Lauf wechselte während des Ausfüllens des Formulars im Hintergrund
selbst zu ABGESCHLOSSEN (ERFOLGREICH), das Formular blieb unverändert
sichtbar, der Speichern-Versuch wurde vom Server korrekt abgelehnt.
Fundstelle: public/leitstand/views/runs.js (Entscheidung-Formular),
scripts/leitstand-server.mjs (F-167-Guard, verhält sich korrekt).
Auswirkung: gering, kein Datenintegritätsproblem (Server blockt korrekt),
aber verwirrende UX bei einem real abgeschlossenen Lauf.
Maßnahme: bei F21+ zusammen mit F-363 behandeln — entweder Lauf-Detail live
pollen (abonniereDetailAuffrischer) oder den 400-Fall im Client freundlich
abfangen und zum Reload auffordern.
Status: offen.
Feature/Run: F20-WS-2-Realtest mit Stefan, 14.09.2026.

**F-368** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Feature-Akten nennen Stichtags-Bestandszahlen als Akzeptanzkriterium.
Beschreibung: PlanV1 (claude/184) formulierte AK1/AK2 für F21 als feste
Zahlen („344 Findings", „21 Akten") — beide bereits beim Schreiben der
Challenge falsch (real 361 Kopfzeilen/23 Akten), weil das Register
zwischen Planung und Bau weiterwächst.
Fundstelle: claude/184 (Claude-Projekt), Akte F21, AK1/AK2 (Ursprungsfassung).
Auswirkung: eine so formulierte AK ist am Tag nach dem Merge falsch,
Gate wird rot ohne echten Fehler.
Maßnahme: Akzeptanzkriterien auf Invarianten formulieren
(„Anzahl Workitems = Anzahl gültiger Kopfzeilen"), nie auf Stichtagszahlen.
Feature/Run: Challenge F21, 14.09.2026.

**F-369** · `TECH_DEBT` · P2 · offen
Titel: Status-Feld in findings.md ist Freitext, kein Enum.
Beschreibung: 28 verschiedene Kopfzeilen-Status-Werte real beobachtet
(offen/**gelöst**/gelöst/erledigt/behoben/… inkl. uneinheitlicher
Markdown-Fettung); zusätzlich führen 172 Einträge ein zweites
Status:-Feld im Fließtext, das die Kopfzeile präzisiert oder widerspricht.
Fundstelle: state/findings.md, durchgehend.
Auswirkung: ein Statusfilter über den Rohwert ist unbedienbar; das
Körper-Status-Feld ist eine zweite Wahrheit.
Maßnahme: F21 normalisiert im Parser auf OFFEN/ERLEDIGT/SONSTIGES,
Rohwert bleibt als statusRoh sichtbar. Körper-Status-Feld wird in v1
nicht interpretiert. Verwerfungsbedingung: bei SONSTIGES-Anteil > 5 %
Vokabular im Register selbst vereinheitlichen.
Feature/Run: Challenge F21, 14.09.2026.

**F-370** · `TECH_DEBT` · P3 · offen
Titel: sammleLaufKopfdaten führt keine Kenntnisnahme-Information.
Beschreibung: Attention-AK „jeder FEHLGESCHLAGEN-Lauf ohne
Kenntnisnahme erscheint" ist aus dem heutigen Zustands-Aggregat nicht
ableitbar, weil kein Kopfdatum zeigt, ob eine Entscheidung
art: 'kenntnisnahme' zu diesem Lauf existiert.
Fundstelle: scripts/leitstand-server.mjs, sammleLaufKopfdaten.
Auswirkung: ohne dieses Feld kann Attention „ohne Kenntnisnahme" nicht
korrekt filtern.
Maßnahme: F21 WS-1 ergänzt kenntnisgenommen: boolean als Kopfdatum
(Muster naechster-Projektion aus F15 WS-3b), siehe AK4.
Feature/Run: Challenge F21, 14.09.2026.

**F-371** · `TECH_DEBT` · P1 · offen
Titel: scripts/leitstand-server.mjs ist eine 252-KB-Monolithdatei; F22/F23/
F25 hängen weitere Endpunkte hinein.
Beschreibung: Die Datei trägt bereits alle Leitstand-Endpunkte
(Läufe, Aufträge, Workflows, Startfehler u.a.) in einer Datei. F22, F23
und F25 planen jeweils weitere Endpunkte an derselben Stelle. Mehrere
Gates matchen Quelltext-Strings direkt in dieser Datei (Zwilling zu
F-352 — dieselbe Klasse von Zerbrechlichkeit bei jeder Umstrukturierung).
Fundstelle: `scripts/leitstand-server.mjs`.
Auswirkung: die Datei wird mit jedem weiteren Feature schwerer lesbar und
riskanter zu ändern; String-Match-Gates brechen bei jeder Restrukturierung,
unabhängig davon, ob funktional etwas kaputt ist.
Maßnahme: Aufteilungsentscheidung spätestens vor F25 treffen, nicht in
F22.
Status: offen. Nachtrag F45 W1 (16.10.2026, Entscheidung Stefan E-WART-1 = A): P2 → P1. Stand: 13 455 Zeilen (nächstgrößte Datei ≈ 3 500). Ausgelagert ist bisher nur Logik (`scripts/leitstand/routen-f39.mjs` als erste, dazu weitere `routen-*.mjs` mit Projektionen und Formprüfungen); der Dispatch liegt weiter vollständig im Server. **W1 erledigt:** Gate `scripts/check-wachstumsbremse-server.mjs` mit straffer Ratsche — Zeilen = Grenze (13 455), Grenze und Routen-Bestand (`scripts/wachstumsbremse-server.json`, 38/8/14/5 Literale je Art) dürfen gegenüber main nur sinken, neue Routen-Literale nur in `scripts/leitstand/routen-*.mjs`; Regel und Durchsetzungsgrad in ARCHITECTURE.md §1; die CI checkt mit `fetch-depth: 0` aus und prüft so auch das Anheben von Grenze und Bestand gegen main ((a2)/(b2)); Rot-Nachweis (a2)/(b2) mit echtem git als Challenger-Cloud-Prüfung nach dem Push (`features/F45/nachweise/w1/rot-nachweis.md`), (a1)/(a3)/(b1)/(b3) rot gegen Kopien. Maßnahme: Aufteilung im Aufräumpaket **W2** (nach B3, vor R; fixpaket-f45 §3): Server in Module, Obergrenze je Datei als Gate, Invariante `starteWorkflowSchritt(`/F-228 über alle Routen-Module neu definieren.
Feature/Run: F22-Challenge, 14.09.2026.

**F-372** · `TECH_DEBT` · P2 · offen
Titel: Router-Ergebnis-Artefakt (Kontrolltiefe/Risikoklasse/Begründung) hat
keinen Lesepfad für die Oberfläche.
Beschreibung: F22 WS-1 legt das Klassifikationsobjekt als Kernartefakt
`router-<auftragId>` ab (AK1), aber `scripts/leitstand-server.mjs` bietet
keinen GET-Endpunkt dafür — nur `GET /api/workflows/<id>` ist erreichbar,
und der WORKFLOW_V0-Datensatz trägt Kontrolltiefe/Risikoklasse/Begründung
nicht. Die Vorschlags-Anzeige in F22 WS-2 (`public/leitstand/views/
workboard.js`) zeigt deshalb ersatzweise die Schrittkette
Rolle→Worker→Modell aus dem Workflow-Vorschlag statt der eigentlichen
Klassifikation.
Fundstelle: `scripts/leitstand-server.mjs` (kein GET-Handler für
`router-<auftragId>`); `public/leitstand/views/workboard.js`,
`renderBearbeitungsInhalt` (Phase 'vorschlag').
Auswirkung: „Grund der Auswahl" bleibt in der Oberfläche unvollständig
sichtbar — die Akzeptanzkriterien-Formulierung „Kontrolltiefe, Risikoklasse,
Begründung, Schrittkette" ist nur zum Teil erfüllt (bewusst akzeptiert,
Bauauftrag F22 WS-2, Punkt 4 — kein neuer Endpunkt außerhalb des
WS-2-Scopes).
Maßnahme: eigener GET-Endpunkt für `router-<auftragId>` (oder additives Feld
an `GET /api/workflows/<id>`), außerhalb von F22.
Status: offen.
Feature/Run: F22 WS-2, 14.09.2026.

**F-375** · `TECH_DEBT` · P3 · offen
Titel: Workboard-Freigabe hat kein Begründungs-Eingabefeld — fester
Standardtext statt Nutzereingabe.
Beschreibung: Der F-374-Fix (Freigabe-Verdrahtung, `freigebenBearbeitung`
in `workboard.js`) sendet für jede Freigabe dieselbe feste Begründung
`FREIGABE_BEGRUENDUNG_STANDARD` ("Freigabe über Workboard Click-to-Work"),
weil das Workboard-Panel — anders als `views/workflows.js`
(`#wf-freigabe-begruendung`) — kein Eingabefeld dafür hat. Bewusst so
entschieden (YAGNI, Handoff F22-AK8-Nachtrag, 14.09.2026): ein echtes
Eingabefeld für dieses Fast-Prototype wäre Mehraufwand ohne aktuellen
Bedarf.
Fundstelle: `public/leitstand/views/workboard.js` (`freigebenBearbeitung`,
`FREIGABE_BEGRUENDUNG_STANDARD`); Gegenbeispiel mit echtem Feld
`public/leitstand/views/workflows.js:667` (`wf-freigabe-begruendung`).
Auswirkung: Jede Freigabe über das Workboard trägt dieselbe generische
Begründung im Entscheidungsartefakt — nachvollziehbar, aber ohne
fallspezifischen Kontext, den ein Mensch beim Freigeben ggf. festhalten
möchte.
Maßnahme: Bei Bedarf ein Textfeld analog `views/workflows.js` in
`renderBearbeitungsInhalt` (Phase 'vorschlag') ergänzen.
Status: offen.
Feature/Run: F22 WS-2, AK8-Nachtrag, 14.09.2026.

**F-378** · `TECH_DEBT` · P2 · offen
Titel: Kein Werkzeugsatz enthält ein lesendes Git/Bash — eine Rolle kann
keinen Diff selbst ermitteln.
Beschreibung: `startvorlagen/ai-workforce.json` definiert
`werkzeugsaetze.lesend = [Read, Grep, Glob]` und `schreibend` als dieselbe
Liste plus `[Write, Edit]`. Keiner der beiden Werkzeugsätze enthält Bash
oder ein Git-Werkzeug — eine Rolle kann das Ergebnis eines Baulaufs also
nicht selbst gegen den vorherigen Stand vergleichen.
Fundstelle: `startvorlagen/ai-workforce.json` (`werkzeugsaetze`).
Auswirkung: ein Post-Build-Prüfschritt, der wissen muss, WAS sich geändert
hat, kann diese Information nicht über die Rolle selbst beschaffen.
Maßnahme: F23 WS-0 umgeht das strukturell — der Kern (nicht die Rolle)
ermittelt die Änderungsübersicht rein lesend über einen eigenen,
serverseitigen `git`-Kindprozess (`src/aenderungsuebersicht/index.ts`,
Muster: `src/authorization-boundary/index.ts` `leseAusCommit` macht das
bereits für F3) und stellt sie als Kernartefakt bereit. Die zugrunde
liegende Werkzeugsatz-Lücke selbst bleibt bestehen und ist kein
Bestandteil dieser Lösung.
Status: offen.
Feature/Run: F23 WS-0, 14.09.2026.

**F-381** · `TECH_DEBT` · P2 · offen
Titel: Kein Validator erzwingt `rolle: code-reviewer ⇒ output_schema:
ergebnis-code-reviewer`.
Beschreibung: Regel 1b in `ermittleNaechstenSchritt` koppelt die
Urteilsauswertung bewusst an `output_schema === 'ergebnis-code-reviewer'`,
nicht an `rolle` (Modul bleibt abhängigkeitsarm). Ein künftiger
`code-reviewer`-Schritt OHNE dieses `output_schema` würde Regel 1b
strukturell umgehen — sein `urteil` bliebe folgenlos, wie vor WS-1b.
Aktuell betrifft das keine der beiden Vorlagen.
Fundstelle: `src/workflow/index.ts` (Regel 1b), `src/rollen/index.ts`
(`ROLLENVERTRAEGE.code-reviewer`).
Auswirkung: still wiederkehrender F-377-Effekt bei einer künftigen
Vorlagen-/Rollenänderung, falls niemand die Kopplung von Hand prüft.
Maßnahme: bei Gelegenheit (kein WS-2-Blocker) einen Rot-Fall im
F17-Rollenvertrag-Gate ergänzen, der `rolle === 'code-reviewer' &&
output_schema !== 'ergebnis-code-reviewer'` ablehnt.
Status: offen.
Feature/Run: F23 WS-1b, QA-Pass 15.09.2026.

**F-382** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Deploy-Timing-Lücke bei laufenden Alt-Workflows während eines
`ermittleNaechstenSchritt`-Regeländerungs-Deploys.
Beschreibung: Ein Server-Neustart mit neuer Automaten-Regel (hier Regel
1b) wirkt sofort auf JEDEN gerade in Bearbeitung befindlichen Workflow,
auch auf einen, der unter der alten Vorlagenform lief. Fail-closed (Halt
statt Fortsetzung) macht das ungefährlich, aber unangekündigt — ein
Vorarbeiter sieht einen unerwarteten Klärungsfall ohne Bezug zu seiner
eigenen Aktion.
Fundstelle: `scripts/leitstand-server.mjs` (`starteLaufUndVergiss`-
Callback), genereller Deploy-Prozess.
Auswirkung: kosmetisch/prozessual, kein Datenverlust, kein Sicherheitsrisiko.
Maßnahme: [EMPFEHLUNG] vor einem Deploy mit Automaten-Regeländerung kurz
`GET /api/workflows` prüfen (keine offenen Workflows auf betroffenen
Schritt-Mustern) — kein Codeaufwand, reine Deploy-Checkliste. Verwerfen,
falls sich in der Praxis zeigt, dass Deploys ohnehin nie mit laufenden
Workflows zusammenfallen.
Status: offen.
Feature/Run: F23 WS-1b, QA-Pass 15.09.2026.

**F-386** · `TECH_DEBT` · P3 · offen
Titel: `GET`/`POST /api/workflows/<id>/abnahme` widersprechen sich, wenn
eine Fassung keinen Schritt mit `rolle: 'ausfuehrung'` mehr trägt.
Beschreibung: Fehlt `findeAusfuehrungsSchritt`s Treffer, liefert `GET
.../abnahme` für eine bestehende Entscheidung `status: 'veraltet'`
(`ausfuehrungSchritt?.lauf_id` ist `undefined`, stimmt nie mit einer
vorhandenen `bezug.ausfuehrung_lauf_id` überein) — die View zeigt also
ACCEPT/REJECT-Buttons. `POST .../abnahme` lehnt denselben Zustand dagegen
strukturell mit 409 ab ("kein gelaufener Schritt mit rolle 'ausfuehrung'").
Ein Klick auf einen angebotenen Button prallt damit unerwartet ab.
Fundstelle: `scripts/leitstand-server.mjs` (`entscheidungProjektion` im
GET-Handler; die `ausfuehrungSchritt === null`-Prüfung im POST-Handler).
Auswirkung: nur erreichbar über eine frei editierte Reparaturfassung, die
den `rolle: 'ausfuehrung'`-Schritt entfernt — keine der beiden
Standard-Vorlagen (`workflow-vorlagen/standard.json`/`hoch.json`) tut das.
Kein WS-2a-Blocker, außerhalb des Scopes ("Änderung an
`workflow-vorlagen/*.json`" ist Nicht-Ziel dieses Auftrags).
Maßnahme: bei Gelegenheit `GET .../abnahme` denselben Zustand ebenfalls als
eigenen, benannten Grund (statt `'veraltet'`) ausweisen, damit die View
keine folgenlosen Buttons anbietet.
Status: offen.
Feature/Run: F23 WS-2a Nacharbeit, QA-Pass 15.09.2026 (TC-06).

**F-387** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: AK-Verweise auf ein fremdes Feature ohne Feature-Präfix führen zu
einer falschen Scope-Lesart in Übergaben.
Beschreibung: Der Bauauftrag für F23 WS-2b verwies mehrfach auf "AK7", wenn
F15 AK7 (der ZWINGEND-Freigabehalt, `features/F15/feature.md`) gemeint war —
F23 selbst hat kein eigenes AK7 mehr (WS-2a endet bei AK20, WS-2b beginnt
bei AK21), aber ein Verweis ohne Feature-Präfix liest sich beim ersten
Durchgang wie ein AK desselben Features. Real bemerkt beim Selbst-Gegenprüfen
des Bauauftrags (CLAUDE.md, "Belegter Ausgangsstand … selbst gegenprüfen"),
bevor daraus eine falsche Projektion entstand — aber genau die Art Fehler,
die ohne diese Prüfung real geworden wäre.
Fundstelle: Bauauftrag F23 WS-2b, 15.09.2026 ("F15-AK7-Freigabehalt" im
Kopftext vs. "(AK7)" im WS-2b-Workstream-Bullet von
`features/F23/feature.md`, vor dieser Korrektur).
Auswirkung: kein Codefehler, aber ein reales Risiko einer falschen
Scope-Lesart bei jeder Übergabe, die AKs mehrerer Features referenziert,
ohne das Feature konsequent mit zu nennen.
Maßnahme: [EMPFEHLUNG] Konvention für Handoff-Verträge/Bauaufträge: ein
AK-Verweis auf ein ANDERES Feature nennt immer das Feature-Kürzel voran
("F15 AK7", nicht "AK7") — auch dann, wenn aus dem Kontext heraus klar
scheint, welches Feature gemeint ist. Kandidat für den Skill
`handoff-vertrag`, falls sich das Muster wiederholt.
Status: offen.
Feature/Run: F23 WS-2b, Bauauftrag 15.09.2026.

**F-388** · `TECH_DEBT` · P2 · offen
Titel: Zwei Stellen schreiben einen Workflow-Plan um — Regeldivergenz-Risiko
zwischen `baueReparaturEntwurf` und dem ADJUST-Zweig von `POST
/api/workflows/<id>/abnahme`.
Beschreibung: Seit F23 WS-2b gibt es zwei unabhängige Codestellen, die aus
einer bestehenden Workflow-Fassung eine neue, zurückgesetzte Fassung bauen:
`baueReparaturEntwurf` (`public/leitstand/views/workflows.js`, F-240,
client-seitig, Mensch bearbeitet den Entwurf vor dem Einreichen über `POST
/api/workflows`) und der `ANPASSUNG_ANGEFORDERT`-Zweig von `POST
/api/workflows/<id>/abnahme` (server-seitig, AK22, schreibt direkt über
`schreibeWorkflowFortschritt`). Beide setzen "einen Schritt zurücksetzen"
unterschiedlich um (`REPARIERBARE_SCHRITT_STATUS` vs. gezielt
Ausführungs-/Review-Schritt; `baueReparaturEntwurf` lässt einen ERFOLGREICHEN
Ausführungsschritt bewusst stehen, F-384, der ADJUST-Zweig setzt ihn IMMER
zurück) — beabsichtigt unterschiedlich (die beiden Wege lösen verschiedene
Probleme: freie Reparatur vs. gezielter Neubau nach einer Abnahme-Entscheidung),
aber eine künftige Änderung an EINER Stelle (z. B. eine dritte Rücksetzregel)
könnte an der anderen vorbeilaufen, ohne dass ein Test das fängt.
Fundstelle: `public/leitstand/views/workflows.js` (`baueReparaturEntwurf`),
`scripts/leitstand-server.mjs` (ADJUST-Zweig von `POST .../abnahme`).
Auswirkung: aktuell keine — beide Wege sind unabhängig getestet
(`ermittleReparaturWarnungen`-Warnungen bzw. `check-f23-abnahme.mjs` Block
(h)) und lösen bewusst verschiedene Fälle. Das Risiko ist zukünftig, nicht
gegenwärtig.
Maßnahme: [YAGNI, bewusst nicht jetzt] keine Zusammenführung, solange es bei
zwei Stellen bleibt — eine gemeinsame Abstraktion für zwei Aufrufer wäre
vorzeitig. Bei einer DRITTEN Stelle, die ebenfalls einen Workflow-Plan
zurücksetzt, Zusammenführung erneut bewerten.
Status: offen.
Feature/Run: F23 WS-2b, Bauauftrag 15.09.2026.

**F-389** · `TECH_DEBT` · P2 · offen
Titel: ADJUST kann 'LAEUFT' schreiben, ohne dass ein Lauf läuft.
Beschreibung: `workflowStatusZuAusgang` bildet den Ausgang 'starte' auf
'LAEUFT' ab (`scripts/leitstand-server.mjs:2501`). Der
`ANPASSUNG_ANGEFORDERT`-Zweig von `POST /api/workflows/<id>/abnahme`
übernimmt diesen Wert über `workflowStatusZuAusgang(naechster)` und rechnet
mit ihm (`grund: naechster.art === 'starte' ? null : ...`), startet aber
keinen Lauf — geschrieben wird nur.
Fundstelle: `scripts/leitstand-server.mjs`, ADJUST-Zweig von `POST
.../abnahme`; `workflowStatusZuAusgang` Z. 2501.
Auswirkung: heute unerreichbar — `workflow-vorlagen/standard.json:22`,
`hoch.json:37` und `fast-lane.json:22` tragen am Ausführungsschritt
`freigabe: 'ZWINGEND'`, der Ausgang ist deshalb immer `haltFreigabe`.
Erreichbar, sobald ein Mensch die ZWINGEND-Pflicht über den bezeugten
Abschwächungsweg (F-226) zurücknimmt: der Workflow zeigt dann "läuft", ist
gegen eine neue Fassung gesperrt (`LAEUFT` in `GESPERRTE_ERSETZUNGS_STATUS`),
und es läuft nichts. Keine Sackgasse — `LAEUFT` steht in
`FORTSETZBARE_WORKFLOW_STATUS` (`src/workflow/index.ts:106`), `POST
/api/workflows/<id>/starten` führt wieder heraus.
Maßnahme: im ADJUST-Zweig den Ausgang 'starte' als eigenen, benannten Fall
behandeln — entweder den Lauf real anstoßen oder mit klarem Grund auf
`KLAERUNG_ERFORDERLICH` halten, statt 'LAEUFT' zu schreiben.
Status: offen.
Feature/Run: F23 WS-2b, Verifikation 15.09.2026.

**F-392** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Navigation nennt den Menüpunkt "Runs", obwohl er auch die
Workflow-/Abnahme-Ansicht enthält.
Beschreibung: `public/leitstand/index.html` verlinkt `#/runs` als "Runs";
derselbe View-Container (`view-runs`) enthält aber auch
`#workflows-abschnitt` und `#workflow-detail` mit dem F23-Abnahme-Block.
Beim WS-3-Realtest nicht auf Anhieb auffindbar, obwohl real vorhanden —
Verwechslungsgefahr zusätzlich zwischen "Workflows"-Liste (`workflow_id`)
und "Läufe"-Liste (`lauf_id`), beide mit ähnlichen IDs.
Fundstelle: `public/leitstand/index.html:16` (Nav-Link), `:107-131`
(Inhalt).
Auswirkung: rein Bedienbarkeit, kein Datenfehler.
Maßnahme: [EMPFEHLUNG] Nav-Link-Text auf "Runs & Workflows" erweitern,
oder Workflow-Abschnitt in einen eigenen Menüpunkt ziehen. Größerer
Schnitt, eher M4/M5 statt jetzt.
Status: offen.
Feature/Run: F23 WS-3, Realtest 15.09.2026.

**F-393** · `TECH_DEBT` · P2 · offen
Titel: github-mcp kollidiert mit E-M4-5 (Git bleibt beim Menschen).
Beschreibung: Ein schreibender GitHub-MCP (Issues/PRs/Merge) schafft eine
zweite Implementierungsroute am Gateway und an der Bridge-/Git-
Sicherheitsregel vorbei.
Fundstelle: Kandidatenrecherche vom 15.09.2026,
`docs/harness/kandidaten-2026-09-15.md`.
Auswirkung: würde E-M4-5 unterlaufen, da Git-Schreibzugriffe dann nicht
mehr ausschließlich beim Menschen lägen.
Maßnahme: falls je aufgenommen, nur Lesepfad und Repo-Scope auf
ai-workforce.
Status: offen.
Feature/Run: F24-Vorbereitung.

**F-394** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Kein offener Rollenbedarf — Kandidateneinbau ist derzeit YAGNI.
Beschreibung: `features/F19/bekannte-luecken.md` hält fest, dass keine der
von ROLLENVERTRAEGE benötigten Capabilities ungedeckt ist. Die neun dort
gelisteten Capabilities haben externe Kandidaten, aber keinen
Rollenbedarf.
Fundstelle: `features/F19/bekannte-luecken.md`.
Auswirkung: Ein Einbau von Werkzeugen oder Skills aus der
Kandidatenrecherche schließt aktuell keine Lücke, erzeugt aber dauerhaft
Kontext- und Pflegekosten. Der Red-Fall 1 in `features/F19/nachweis-ws2.md`
ist ein konstruiertes Testargument, kein Rollenbedarf, und darf nicht als
solcher gelesen werden.
Maßnahme: Aufnahme erst, wenn eine Rolle die Capability in
`benoetigte_capabilities` führt. Satz dazu in `bekannte-luecken.md`
ergänzen.
Status: offen.
Feature/Run: F24-Vorbereitung.

**F-395** · `TECH_DEBT` · P2 · offen
Titel: shadcn/ui und Kibo UI sind React, Frontend ist framework-frei.
Beschreibung: Entscheidung im M4-Plan: Frontend ohne Build-Schritt, native
ES-Module, kein Framework. Beide UI-Kandidaten sind React-Bibliotheken.
Fundstelle: Kandidatenrecherche vom 15.09.2026,
`docs/harness/kandidaten-2026-09-15.md`.
Auswirkung: eine direkte Übernahme würde die Framework-frei-Entscheidung
des M4-Plans brechen.
Maßnahme: vor dem Visual-Productization-Feature entscheiden, ob nur CSS-/
Token-Anteile übernommen werden oder die Framework-Entscheidung gekippt
wird.
Status: offen.
Feature/Run: F24-Vorbereitung.

**F-397** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Kandidatenbewertung braucht Nutzungsart als Eingang.
Beschreibung: Die Recherche filterte implizit gegen Eigennutzung, obwohl
Weitergabe der Workforce Produktziel ist.
Fundstelle: Kandidatenrecherche vom 15.09.2026,
`docs/harness/kandidaten-2026-09-15.md`.
Auswirkung: zu milde Prüfung verteilungskritischer Lizenzen.
Maßnahme: Nutzungsart (interne Nutzung / Kundenauftrag / Einbettung /
SaaS) als Pflichtangabe im Werkzeugkatalog-Eintragsformat ergänzen.
Status: offen.
Feature/Run: F24-Vorbereitung.

**F-398** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Ablageort für Kandidatenwissen ungeklärt.
Beschreibung: `docs/harness/werkzeug-katalog.md` trägt im Abschnitt
"Einträge" den Vermerk "[FUELLUNG] Die Einträge liegen nicht hier, sondern
zentral im Lern-Repo", während `ressourcen.json` seine 13 externen
Kandidaten aus `ClaudePlaybook/WERKZEUG-KATALOG.md` bezogen hat.
Fundstelle: `docs/harness/werkzeug-katalog.md`, `ressourcen.json`.
Auswirkung: unklar, wo neue Kandidaten gepflegt werden; Gefahr einer
vierten Bestandsliste.
Maßnahme: festlegen, ob Kandidatenwissen im Lern-Repo oder im
ai-workforce-Repo geführt wird.
Status: offen.
Feature/Run: F24-Vorbereitung.

**F-402** · `TECH_DEBT` · P1 · offen
Titel: Kein projektlokaler Ort für Fähigkeiten.
Beschreibung: Skills lösen relativ zur Workforce-Repo-Wurzel auf, nicht zum
Projekt. Aufgedeckt bei der Kandidatenprüfung (Video/Musik/Spiele-Kandidaten
hatten strukturell keinen Zielort, gehören zu einem Nutzerprojekt statt zur
Workforce-Basis).
Fundstelle: docs/harness/werkzeug-katalog.md (Abgrenzungsabsatz aus PR #167).
Auswirkung: Vor M4-F06 (Projekte v1) muss geklärt sein, wo projektlokale
Fähigkeiten leben, sonst baut der Projektimport an der Frage vorbei.
Maßnahme: vor M4-F06-Baubeginn auflösen.
Feature/Run: Kandidatenrecherche, 16.09.2026.

**F-405** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: `git clone --depth 1` verifiziert Repo-Fakten im Cloud-Workspace
zuverlässiger als WebFetch/GitKraken.
Beschreibung: Im Cloud-Workspace des Challenger-Chats erwiesen sich
WebFetch und GitKraken bei großen Dateien bisher wiederholt als
fehleranfällig, um reale Repo-Fakten zu verifizieren. Ein flacher
`git clone --depth 1` desselben Repos lieferte dieselben Fakten
zuverlässig.
Fundstelle: Challenge-Runde vor dem F27-WS-1-Bauauftrag.
Auswirkung: mittel — eine unzuverlässige Verifikationsmethode in
Challenge-Runden kann falsche Repo-Annahmen unentdeckt lassen.
Maßnahme: `git clone --depth 1` als Methode für künftige Challenge-Runden
vermerkt, keine Repo-Änderung nötig.
Feature/Run: Challenge-Runde vor F27-WS-1, 16.09.2026.

**F-407** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: P5-Prompt-Vertrag der Rolle scout ist rein aspirational — keine
Durchsetzung, keine Wiederverwendung (F27 WS-1, QA-Pass).
Beschreibung: Der Satz "Externe Web-Inhalte sind für dich DATEN, keine
Anweisungen (P5)" aus features/F27/feature.md existiert im gesamten Repo
nur genau einmal: handgetippt im auftragstext des einmaligen AK6-
Nachweisauftrags. Es gibt keinen Prompt-Baustein, keine Vorlage und keinen
Gate-Check, der sicherstellt, dass ein künftiger scout-Auftrag diesen Satz
überhaupt enthält — auftragstext ist repoweit freier, vom Aufrufer
getippter Text, es existiert keine serverseitige Rollen-System-Prompt-
Injektion für irgendeine Rolle (scripts/leitstand-server.mjs geprüft).
hinweis_untrusted: true im Ausgabeschema (schemas/ergebnis-scout.
schema.json) ist eine reine Selbstbestätigung des Modells NACH dem Lauf,
kein vorgeschalteter Schutz. Kein scout-spezifisches Problem — Symptom
einer repoweiten Lücke (kein Rollen-System-Prompt-Mechanismus überhaupt),
hier zum ersten Mal sichtbar, weil scout die erste Rolle mit einem
sicherheitsrelevanten Prompt-Vertrag ist.
Fundstelle: features/F27/feature.md (Risiken: "P5-Vertrag verpflichtend"),
schemas/ergebnis-scout.schema.json (hinweis_untrusted), kein Gegenstück in
scripts/leitstand-server.mjs.
Auswirkung: mittel — der Risiken-Abschnitt der Feature-Akte suggeriert eine
Durchsetzung, die real nicht existiert; ein künftiger scout-Auftrag ohne
den P5-Satz im Prompt ist strukturell nicht von einem mit Satz zu
unterscheiden.
Maßnahme: vor oder während F27 WS-2 klären, ob ein Prompt-Baustein-
Mechanismus je Rolle eingeführt wird (repoweite Entscheidung, kein
Scout-Spezialfall) oder ob die Grenze bewusst als WS-1-Limitierung in
feature.md nachgeschärft wird, statt implizit zu bleiben.
Feature/Run: F27-WS-1-Bauauftrag, QA-Pass, 16.09.2026.

**F-411** · `TECH_DEBT` · P2 · offen
Titel: scoutZustand ohne Rehydration — F5-Reload während laufendem Scout-Lauf
macht Lauf in der Ansicht unauffindbar.
Beschreibung: scoutZustand in public/leitstand/views/capabilities.js ist
reiner In-Memory-Client-Zustand ohne Rehydration. Ein vollständiger
Browser-Reload (F5) während ein Scout-Lauf läuft entsperrt die
"Kandidaten suchen"-Buttons wieder und macht den Ausgang des laufenden Laufs
in dieser Ansicht unauffindbar. Kein Datenverlust und kein zweiter echter
Lauf (der Server lehnt einen erneuten Start über D13 mit 409 ab), aber eine
Sichtbarkeitslücke mit technischer Fehlermeldung.
Fundstelle: features/F27/feature.md, Abschnitt "Bekannte Grenzen" (WS-2,
QA-Pass zweite Runde, bewusst nicht behoben) — dort dokumentiert, aber nie
ins Register übernommen.
Auswirkung: gering — nur ein Sichtbarkeitsproblem im Fehlerfall, kein
Datenverlust, kein Sicherheitsrisiko.
Maßnahme: kleine Folge-Iteration — scoutZustand beim View-Eintritt aus einer
bekannten laufId rehydrieren (z. B. sessionStorage).
Feature/Run: F27-Abschluss-Dokumentation, 17.09.2026.

**F-412** · `TECH_DEBT` · P2 · offen
Titel: AK13 verweist auf einen in state/findings.md nie existierenden
Eintrag (Hängeverweis).
Beschreibung: AK13 in features/F27/feature.md verweist für den mangels
realer Coverage-Gap unbelegten Browser-Klickpfad auf "siehe
state/findings.md" — dort existierte bis zu diesem Commit nie ein
zugehöriger Eintrag.
Fundstelle: features/F27/feature.md, AK13 (Satzende "... nachzuholen (siehe
state/findings.md)").
Auswirkung: gering — Verweis lief ins Leere, kein inhaltlicher Schaden.
Maßnahme: bei der ersten real auftretenden restFehlend-Gap den vollständigen
Klickpfad (Gap-Zeile -> "Kandidaten suchen" -> Ergebnisansicht -> Vormerken)
in einem echten Browser real nachholen und diesen Eintrag dabei schließen.
Feature/Run: F27-Abschluss-Dokumentation, 17.09.2026.

**F-414** · `TECH_DEBT` · P2 · offen (bewusste Grenze)
Titel: Ein registriertes Fremd-Repo ohne eigene Autorisierungs-Baseline
bleibt fail-closed blockiert — kein Bootstrap in F25 v1.
Beschreibung: starteGateway lehnt einen Lauf gegen eine Repo-Wurzel ohne
eigene state/aktuelle-autorisierung.json bzw. .claude/settings.json
unverändert ab (F4/F3, Invocation Policy). F25 WS-1 fügt keinen
Bootstrap-Automatismus hinzu, der einem neu registrierten Projekt
automatisch eine gültige Baseline verschafft — das wäre ein
Freigabeartefakt, das der Kern nie selbst erzeugen darf (ARCHITECTURE.md
§3). Ein importiertes/registriertes Repo bleibt deshalb blockiert, bis ein
Mensch von Hand eine eigene Mini-Baseline anlegt (Muster: aus ai-workforce
kopierte, inhaltlich identische .claude/settings.json + zugehörige
Hook-Skripte + state/aktuelle-autorisierung.json — der
Invocation-Policy-Vergleich ist rein inhaltsbasiert, keine Pfadbindung,
siehe features/F25/nachweis-ws1.md).
Fundstelle: src/claude-code-gateway/index.ts (starteGateway,
STANDARD_AKTUELLE_AUTORISIERUNG_PFAD-Lesepfad); features/F25/feature.md
AK6, "Bekannte Grenzen".
Auswirkung: mittel — bewusste, dokumentierte Grenze (Option B, Stefan
17.09.2026), kein Bug. Ein künftiger Import-Wizard (nicht Teil dieses
Auftrags) muss diese Lücke explizit adressieren oder ebenfalls offen
dokumentieren.
Maßnahme: keine in F25 v1. Bei Bedarf: Import-Wizard mit geführtem,
menschlich bestätigtem Baseline-Schritt (kein automatischer
Freigabeartefakt-Bau).
Feature/Run: F25 WS-1, 17.09.2026.

**F-416** · `TECH_DEBT` · P3 · offen
Titel: rohBasisVerzeichnis ist nicht projektspezifisch — Rohereignisstrom
eines Fremdprojekt-Laufs landet in ai-workforce's eigenem
kontrollzustand-roh/.
Beschreibung: baueProjektHandlerMap/loeseProjektPfade (F25 WS-1) setzen
basisVerzeichnis/startvorlagePfad/settingsPfad/aktuelleAutorisierungPfad/
cwd projektspezifisch, aber KEIN rohBasisVerzeichnis — das bleibt beim
Default STANDARD_ROH_BASISVERZEICHNIS ('kontrollzustand-roh'), relativ zum
process.cwd() des Serverprozesses (ai-workforce), nicht zur repoWurzel des
jeweiligen Projekts. Real beobachtet: ein Lauf gegen Projekt B schrieb
seinen Rohereignisstrom nach ai-workforce/kontrollzustand-roh/<laufId>/,
nicht nach f25-testprojekt-b/kontrollzustand-roh/<laufId>/.
Fundstelle: scripts/leitstand-server.mjs, loeseProjektPfade/
baueProjektHandlerMap (F25 WS-1).
Auswirkung: gering — kontrollzustand-roh/ ist gitignoriert, rein
diagnostisch (ARCHITECTURE.md §1), kein Kontrollzustand. Bei häufigem
Mehrprojektbetrieb sammelt sich Fremdprojekt-Diagnosemüll in
ai-workforce's eigenem Arbeitsbaum an.
Maßnahme: kleine Folge-Iteration — loeseProjektPfade um
rohBasisVerzeichnis (join(repoWurzel, 'kontrollzustand-roh') o. ä.)
ergänzen, in baueProjektHandlerMap durchreichen.
Feature/Run: F25 WS-1, AK8-Realtest, 17.09.2026.

**F-420** · `TECH_DEBT` · P2 · offen (bewusste Grenze)
Titel: Die meisten lesenden api.js-GET-Wrapper prüfen antwort.ok nicht —
ein 404 eines fehlgeschlagenen Projekt-Handlers wird still als gültiges
Datenaggregat durchgereicht.
Beschreibung: holeZustand, holeLaeufe, holeStartfehler, holeAuftraege,
holeWorkflows, holeWorkitems und holeWerkzeugsaetze (public/leitstand/
api.js) reichen `.then((r) => r.json())` direkt weiter, ohne den
HTTP-Status zu prüfen (bestehendes Muster aus F10-F24, nicht
WS-2a-spezifisch eingeführt). Wählt ein Nutzer ein registriertes, aber
handler-seitig fehlgeschlagenes Projekt (siehe F-421/F-414-Muster:
baueProjektHandlerMap überspringt kaputte Einträge, Gate-Abschnitt 2d),
liefert der Dispatcher für jede Folgeanfrage 404 mit einem gültigen
JSON-Körper — dieser wird von den genannten Funktionen unbemerkt als
"erfolgreiches" Ergebnis geparst. Der zentrale Zustands-Poll sieht dadurch
keinen Fetch-Fehler, einzelne Abnehmer werden nur in der Konsole
geloggt, nicht dem Nutzer angezeigt — stiller UI-Ausfall statt einer
sichtbaren Fehlermeldung.
Fundstelle: public/leitstand/api.js (alle genannten Funktionen).
Auswirkung: mittel — real erreichbar bei jeder fehlerhaften
Projekt-Registrierung, aber kein Datenverlust und kein Fehlschreiben,
nur eine irreführend leere/veraltete Anzeige.
Maßnahme: bewusst NICHT in WS-2a breit behoben — berührt praktisch jeden
lesenden Endpunkt aus vier vorherigen Features (F10-F24), nicht nur die
WS-2a-Neuerungen. Eine echte Lösung (einheitliche r.ok-Prüfung über alle
GET-Wrapper) wäre eine eigene Iteration mit Konsequenzen für jede
aufrufende View.
Feature/Run: F25 WS-2a, QA-Pass, 17.09.2026.

**F-421** · `TECH_DEBT` · P3 · offen
Titel: GET /api/projekte antwortet unter einem Projekt-Präfix
(/api/projekte/<id>/projekte) mit 200 {projekte:[]} statt 404 —
ungefährlich, aber ungeprüft.
Beschreibung: Der GET /api/projekte-Zweig (F25 WS-2a, AK11) steht in
derselben requestHandler-Funktion, die auch jede Projekt-Instanz baut.
baueProjektHandlerMap reicht die projekte-Liste nicht an
Projekt-Instanzen durch (Default [] in erzeugeRequestHandler) — ein
Aufruf GEGEN eine Projekt-Instanz trifft denselben Routen-Zweig und
liefert eine leere Liste statt eines 404. api.js' holeProjekte() ruft
diesen Endpunkt bewusst NIE präfigiert auf (AK11/AK13-Entscheidung),
weshalb dieser Pfad im Produktivbetrieb nie erreicht wird — aber kein
Gate-Abschnitt belegt das Verhalten, ein künftiger Regressionsfehler
(z. B. wenn baueProjektHandlerMap versehentlich projekte durchreicht)
fiele niemandem auf.
Fundstelle: scripts/leitstand-server.mjs (GET /api/projekte-Zweig,
baueProjektHandlerMap).
Auswirkung: gering — kein realer Aufrufer trifft diesen Pfad.
Maßnahme: keine in WS-2a. Bei Bedarf: Gate-Assert, dass
/api/projekte/<id>/projekte stabil 404 oder eine leere, klar als
"nicht das globale Register" gekennzeichnete Antwort liefert.
Feature/Run: F25 WS-2a, Code-Review-Pass, 17.09.2026.

**F-422** · `TECH_DEBT` · P2 · offen
Titel: arbeitsverzeichnis_pfad im F4-Gültigkeitsschlüssel bleibt für
jedes Projekt am process.cwd() des Serverprozesses hängen — ein sachlich
korrekt angepasstes Fremdprojekt bekäme eine unerklärliche
E-188-Drift-Ablehnung.
Beschreibung: istUebrigeFelder.arbeitsverzeichnis_pfad
(src/claude-code-gateway/index.ts) wird für JEDE Projekt-Instanz aus
process.cwd() des Serverprozesses abgeleitet, nicht aus dem
projektspezifischen cwd/repoWurzel (F25 WS-1 AK7-Entscheidung: kein
bestehender Vergleichswert für ai-workforce durfte sich ändern). Ein
Fremdprojekt, dessen state/aktuelle-autorisierung.json NICHT
byte-identisch aus ai-workforce kopiert, sondern sachlich korrekt an
seinen eigenen Pfad angepasst wird, bekommt dadurch eine für den
Betreiber zunächst unerklärliche E-188-"Drift"-Ablehnung
(arbeitsverzeichnis_pfad weicht ab). Real nur deshalb nicht im
AK8/AK15-Realtest aufgetreten, weil dort bewusst eine 1:1-Kopie
verwendet wurde.
Fundstelle: src/claude-code-gateway/index.ts (Gültigkeitsschlüssel-Bau).
Auswirkung: mittel — betrifft jedes künftige, sachlich (nicht
byte-kopiert) eingerichtete Fremdprojekt; die Fehlermeldung nennt die
tatsächliche Ursache nicht.
Maßnahme: keine in WS-1/WS-2a. Eine echte Lösung bräuchte eine
projektspezifische arbeitsverzeichnis_pfad-Auflösung, die zugleich
ai-workforce's eigenen, bereits autorisierten Wert unverändert lassen
müsste — bewusst nicht angegangen.
Feature/Run: F25 WS-1, QA-Pass, 17.09.2026 (nachgetragen mit WS-2a).

**F-424** · `TECH_DEBT` · P3 · offen
Titel: `EnterWorktree` scheitert am Windows-Pfadlängenlimit gegen tief
verschachtelte `kontrollzustand/lineage-entscheidung-*-schritt-*-ausfuehrung/checkpoints/*.json`-Pfade.
Beschreibung: Real reproduziert beim Versuch, für den Perf-Fix
fix/zustand-poll-kosten einen Worktree von origin/main anzulegen: Git
brach den Checkout mit mehreren `Filename too long`-Meldungen ab
(z. B. `kontrollzustand/lineage-entscheidung-workflow-router-<uuid>-schritt-1-ausfuehrung/checkpoints/1-<64-Zeichen-Hash>.json`)
und endete mit `fatal: Could not reset index file to revision 'HEAD'`
— kein Teil-Worktree blieb zurück (`git worktree list` zeigte danach
nur die vorher bestehenden Einträge). Ursache: die Namenskonvention
`lineage-entscheidung-<artefaktId>` plus verschachtelte
Workflow-Schritt-IDs plus 64-stelliger Hash im Dateinamen überschreitet
Windows' klassisches MAX_PATH (260 Zeichen), sobald der Worktree-Pfad
selbst schon einige Verzeichnisebenen tief liegt (`.claude/worktrees/<name>/...`).
Fundstelle: keine einzelne Quelldatei — Zusammenspiel aus
`src/lineage-registry/index.ts` (`laufId()`-Namenskonvention
`lineage-${artefaktId}`), `src/checkpoint-store/index.ts`
(Dateinamensmuster `<sequenz>-<64-stelliger-hash>.json`) und dem
Windows-Dateisystem selbst.
Auswirkung: mittel — betrifft ausschließlich das Anlegen NEUER
Worktrees über bereits gewachsene reale `kontrollzustand/`-Bestände
mit tief verschachtelten Workflow-Entscheidungsketten; ein normaler
`git checkout`/`git stash` im bestehenden Arbeitsverzeichnis ist nicht
betroffen (dort greift Windows' Long-Path-Unterstützung, sofern
aktiviert, oder die Datei liegt bereits vor und wird nicht neu
angelegt). Umgangen in fix/zustand-poll-kosten durch Verzicht auf
Worktree (Stash statt Branch-Wechsel im bestehenden Verzeichnis).
Maßnahme: keine akut. Optionen für eine künftige Iteration: `git config
core.longpaths true` für dieses Repo dokumentieren (Windows-spezifische
Falle, Kandidat für den „Bekannte Fallen"-Abschnitt in CLAUDE.md), oder
die Namenskonvention für WS-2a/F17-artige verschachtelte
Workflow-Schritt-Entscheidungsketten kürzen.
Feature/Run: fix/zustand-poll-kosten, Vorbereitung (EnterWorktree-Versuch),
17.09.2026.

**F-425** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `commit-guard` scheint den Freigabe-Zeitstempel gegen UTC statt
gegen die lokale Zeitzone zu prüfen — jeder in Ortszeit geschriebene
Zeitstempel auf einem UTC+X-System kann als „in der Zukunft" verworfen
werden.
Beschreibung: Beim Versuch, `state/freigabe-commit.md` für einen
harmlosen `git stash` zu erneuern, schrieb Stefan `Freigegeben:
2026-09-17T22:22:20` (Ortszeit, System auf UTC+2, `date` bestätigte
`Thu Sep 17 22:22:23 2026` lokal vs. `Thu Sep 17 20:22:22 UTC 2026`).
`git stash` wurde daraufhin mit `commit-guard: Zeitstempel in
state/freigabe-commit.md liegt in der Zukunft — Uhr oder Zeitzone
prüfen — verweigert` abgelehnt, obwohl der Zeitstempel zum
Schreibzeitpunkt in der Vergangenheit lag (nur eben nicht in UTC).
NICHT selbst am Hook-Quelltext verifiziert (`.claude/settings.json` und
vermutlich das Hook-Skript selbst sind für das Modell nicht lesbar/
schreibbar, Team-Policy) — diese Diagnose beruht ausschließlich auf dem
beobachteten Fehlertext und der lokalen/UTC-Zeitdifferenz, nicht auf
gelesenem Hook-Code.
Fundstelle: vermutlich der `commit-guard`-Hook selbst (Pfad unbekannt,
außerhalb der Lesereichweite des Modells).
Auswirkung: mittel — auf einem System mit positivem UTC-Offset (wie
hier UTC+2) kann JEDE frisch in Ortszeit geschriebene Freigabe je nach
Tageszeit als „in der Zukunft" abgelehnt werden, ohne dass ein echter
Zeit-/Zonenfehler vorliegt. Ein Zeitstempel mit explizitem `Z`- oder
Offset-Suffix umging das Problem im selben Auftrag (fix/zustand-poll-kosten,
zweite Freigabe wurde mit `Z`-Suffix akzeptiert).
Maßnahme: Hook-Code gegenchecken (Stefan/Team, nicht das Modell) — falls
der Vergleich tatsächlich einen naiven `new Date(ortszeit-string)` ohne
Zeitzonen-Normalisierung gegen `Date.now()` (UTC) macht, entweder auf
explizites Offset-Parsing umstellen oder in der Fehlermeldung/Doku
explizit ein `Z`- oder Offset-Suffix verlangen.
Feature/Run: fix/zustand-poll-kosten, während der Bearbeitung, 17.09.2026.

**F-426** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: `git diff` über die Bridge hinterließ ein reales `.git/index.lock`
trotz Allowlist-Status für den Befehl.
Beschreibung: Vom Technical Challenger (unabhängige Verifikation via
Bridge) bei der Prüfung des Diffs zu fix/zustand-poll-kosten beobachtet
— nicht selbst vom Modell in dieser Sitzung reproduziert. Ursprünglich
vermutete Ursache (Pager-Hang, Aufruf ohne `--no-pager`) durch den
Technical Challenger getestet und verworfen — `--no-pager` half NICHT.
Wahrscheinlichere Ursache: Arbeitsbaum-Scan-Kosten — `kontrollzustand/`
trägt 399 unversionierte Top-Level-Verzeichnisse, jeder `diff`/`status`
muss sie über den langsamen Bridge-Mount durchsuchen, was den Befehl über
ein Zeitfenster hinaus verzögern und so das Anlegen von
`.git/index.lock` begünstigen kann. Keine weiteren Details (genauer
Befehl, Fehlermeldung, ob die Lock-Datei manuell entfernt werden musste)
aus der Verifikationsmeldung ersichtlich.
Fundstelle: unbekannt — vermutlich die Bridge-seitige Befehlsausführung
von `git diff`, nicht dieses Repo selbst.
Auswirkung: potenziell hoch, wenn reproduzierbar — ein liegen
gebliebenes `.git/index.lock` blockiert JEDEN nachfolgenden
schreibenden Git-Befehl (`commit`, `add`, `stash`) in demselben
Arbeitsverzeichnis, bis die Lock-Datei von Hand entfernt wird.
Maßnahme: durch den Technical Challenger/Stefan zu reproduzieren und
einzugrenzen (genauer Befehl, Bridge-Konfiguration); naheliegender Fix
ist, die Zahl der unversionierten `kontrollzustand/`-Top-Level-Verzeichnisse
zu reduzieren (z. B. Archivierung/Kompaktierung alter Läufe) oder den
Bridge-Mount-Scan für `git`-Befehle zu beschleunigen. Nicht vom Modell aus
dieser Sitzung heraus behebbar — die Bridge-Ausführungsschicht liegt
außerhalb seiner Werkzeuge.
Feature/Run: fix/zustand-poll-kosten, Verifikationspass (Technical
Challenger via Bridge), 17.09.2026.

**F-427** · `TECH_DEBT` · P3 · offen
Titel: Jarvis setzt `bezug.auftrag_id` bei `aktion.typ 'anpassen'` real auf
die eigene Chat-Nachricht statt auf den referenzierten Ziel-Auftrag.
Beschreibung: Real gegen den echten Leitstand-Prozess geprüft (F26 WS-2b,
Nachricht "Ich habe das fertige Ergebnis von Workflow f15-ws4-l1 … Fordere
für diesen Workflow eine Anpassung an"): Jarvis lieferte schemakonform
`{"art":"aktion","aktion":{"typ":"anpassen","ziel":"f15-ws4-l1"},"bezug":
{"auftrag_id":"jarvis-chat-b4bcc443-…"}}` — `aktion.ziel` benennt den
Workflow korrekt, `bezug.auftrag_id` zeigt aber auf die AUTOMATISCH von
`POST /api/chat` für die Chat-Nachricht selbst angelegte Auftrags-ID, nicht
auf `5efe706f-2e88-43c7-a877-c85ef59c9e42` (den tatsächlichen Auftrag hinter
Workflow `f15-ws4-l1`). Schema/`validiereErgebnisJarvis` können das nicht
erzwingen (`bezug.auftrag_id` ist ein freier String, keine Referenzprüfung).
Fundstelle: `src/jarvis/index.ts` (`baueJarvisAuftragstext`, Prompt nennt
`bezug` nur als "Bezug auf einen bestehenden Auftrag/Workitem", ohne
Jarvis mitzugeben, woher die tatsächliche Ziel-Auftrags-ID stammt — Jarvis
kennt sie in diesem Ein-Schuss-Lauf schlicht nicht).
Auswirkung: gering für den WS-1/WS-2a-Scope (bezug ist dort nur Anzeige),
aber blockierend für einen künftigen automatisierten WS-2b-Anschluss, der
`bezug.auftrag_id` ungeprüft zum Aufruf von `POST /api/workflows/<id>/
abnahme` verwenden wollte — real durchgeführt wurde der Nachweis deshalb
mit `aktion.ziel` (manuell/durch einen Menschen gelesen), nicht mit
`bezug.auftrag_id` (Details: `features/F26/nachweis-ws2b-testartefakt.md`).
Maßnahme: keine akut, WS-2b ist ein eigener, noch offener Bauauftrag
(`features/F26/feature.md`). Optionen für eine künftige Iteration: Jarvis
im Kontextpaket die real referenzierbaren Workflow-/Auftrags-IDs mitgeben
(z. B. über einen `REPO_READ`-Blick auf `GET /api/workflows`), oder
`aktion.ziel` als die verbindliche Bezugskennung für WS-2b-Aktionen
festlegen und `bezug` für `aktion`-Ergebnisse als rein informativ
dokumentieren.
Feature/Run: F26 WS-2b, realer Chat-Lauf gegen den echten
Leitstand-Prozess (`jarvis-jarvis-chat-b4bcc443-5441-43ca-9ade-b812de8e9ebb`),
17.09.2026.

**F-432** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Feature-Freigabe trotz offenem P1-BUG auf demselben Feature.
Beschreibung: F26 wurde als „vollständig abgeschlossen" übergeben (Challenger-Übergabe 18.09.2026), obwohl F-423 (P1, BUG, F26) offen war und die reale Produktkonfiguration betraf. Die Regel „vor Freigabe state/findings.md nach offenen P0/P1 mit Feature-Bezug filtern" existiert nur als Chat-Lehre.
Fundstelle: state/findings.md F-423; features/F26/feature.md „Bekannte Grenzen".
Auswirkung: Feature gilt als fertig, ist im Produkt aber nicht nutzbar.
Maßnahme: Pflichtzeile „Offene P0/P1 mit Bezug: …" im Abschnitt Feature Review jeder Akte; scripts/check-feature.mjs prüft bei Status ABGESCHLOSSEN gegen state/findings.md (Rot: offenes P0/P1, dessen Feature/Run-Zeile die Feature-ID nennt).
Feature/Run: Challenge F26-Abschluss, 18.09.2026.

**F-433** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Review-Verfahren läuft entgegen PlanV1 §2 seit F23 nicht im Produkt.
Beschreibung: PlanV1 M4 §2 verlangt ab F23 FEATURE REVIEW → ACCEPT/ADJUST/REJECT im Produkt (Abnahme-View). Real existieren im kontrollzustand/ nur zwei Abnahme-Entscheidungsartefakte, beide aus Feature-Nachweisen (F23, F26 WS-2b). F24–F27 wurden ausschließlich im Chat abgenommen.
Fundstelle: kontrollzustand/lineage-entscheidung-workflow-router-*-abnahme/ (2 Einträge); docs/projekt/zielfassung.md §13.5.
Auswirkung: Slice D (Abnahme/ADJUST) ist nie im Ernstfall gelaufen; F30-Bestehensbedingung unbelegt.
Maßnahme: Ab dem nächsten Feature-Review Abnahme real über POST /api/workflows/<id>/abnahme; Start des F30-Protokolls.
Feature/Run: Challenge F26-Abschluss, 18.09.2026.

**F-434** · `PROCESS_IMPROVEMENT` · P2 · offen (Nachzug erledigt, Check offen)
Titel: docs/STATUS.md um sieben Features veraltet, keine Drift-Prüfung.
Beschreibung: STATUS.md („Einzige Quelle für Phasenstand") sagte bis 18.09.2026 „M4: noch kein Feature begonnen" und listete F22–F27 als offen, obwohl F20–F27 gemergt waren. STATUS.md ist bewusst nicht in check-docs.mjs.
Fundstelle: docs/STATUS.md Z. 20, 378 ff.; scripts/check-docs.mjs Z. 26.
Auswirkung: Falsche Phasenauskunft für jede neue Sitzung.
Maßnahme: Nachzug erledigt (dieser PR, docs/STATUS.md korrigiert); der Drift-Check selbst (kleiner Check, der je F2x-Zeile im M4-Abschnitt das Symbol gegen Status: der Akte prüft) bleibt offen.
Feature/Run: Challenge F26-Abschluss, 18.09.2026.

**F-435** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Projektbeschreibung des Claude-Projekts „AI Workforce" veraltet.
Beschreibung: Beschreibung nennt zielfassung v1.16, F0–F19, „M4 in Planung"; real v1.21, F0–F27, M4 in Umsetzung. Führte in der Übergabe vom 18.09.2026 zu einer gegenstandslosen Handlungsoption („M4-Planungsrunde starten").
Fundstelle: Claude-Projekt „AI Workforce", Projektbeschreibung.
Auswirkung: Fehlleitung neuer Challenger-Chats.
Maßnahme: Stefan aktualisiert die Beschreibung (außerhalb des Repos).
Feature/Run: Challenge F26-Abschluss, 18.09.2026.

**F-438** · `TECH_DEBT` · P3 · offen
Titel: Farbliteral-Gate deckt nur public/leitstand/style.css ab, nicht JS-/HTML-Dateien projektweit.
Beschreibung: scripts/check-f20-design-tokens.mjs prüft ausschließlich eine feste Datei (style.css) auf Farbliterale außerhalb des :root-Blocks. Ein Farbliteral direkt in einer Client-JS-Datei (z. B. ein inline gesetzter Farbwert) oder in index.html würde von keinem bestehenden Gate gefunden, solange es nicht die eine geprüfte Datei ist.
Fundstelle: scripts/check-f20-design-tokens.mjs (PFAD-Konstante).
Auswirkung: Design-Token-Disziplin ist nicht projektweit erzwungen, nur für das eine Stylesheet.
Maßnahme: für Persona-Dateien durch check-f28-persona.mjs mitigiert (persona.js/persona-state.js/index.html zusätzlich geprüft); generelle Gate-Lücke (alle übrigen Client-JS-Dateien im Projekt) besteht weiter.
Feature/Run: F28-Challenge, 18.09.2026.

**F-485** · `PROCESS_IMPROVEMENT` · P2 · zurückgenommen (F31 WS-3b)
Titel: Unbelegtes Zitat in einem Claude-Code-Bericht.
Beschreibung: Ein Claude-Code-Bericht zitierte „CLAUDE.md dokumentierter
Timing-Flake", ohne dass diese Formulierung im Repo belegbar ist. Am
20.09.2026 im selben PR wiederholt („in CLAUDE.md dokumentiertes
Timing-Flake-Muster") — CLAUDE.md enthält keinen solchen Eintrag.
Fundstelle: kein Repo-Artefakt — Zitat aus Berichten früherer
Claude-Code-Sitzungen, nicht aus einer Datei im Repo.
Auswirkung: Ein nicht real geprüftes Zitat kann als belegte Tatsache
missverstanden werden.
Maßnahme: Berichte künftig nur mit real geprüften Quellen belegen. Nicht in
diesem PR behoben (kein konkretes Artefakt zum Korrigieren).
Feature/Run: F29/F30-Challenge, 20.09.2026.
Korrektur (F31 WS-3b, 20.09.2026): Der Befund war überzogen — CLAUDE.md
Abschnitt „Bekannte Fallen" beschreibt das Muster tatsächlich, nur mit
anderem Wortlaut als zitiert: „Symptom: Ein Test-/Gate-Lauf scheitert
einmalig ohne erkennbaren Grund (kein Code, keine Config geändert) und
läuft beim nächsten Versuch grün. Was tun: Erst wiederholen, bevor man
etwas repariert." Der ursprüngliche Challenger suchte offenbar nur nach den
Stichworten „flake"/„timing" statt nach dem inhaltlichen Muster.
Real bestätigt in diesem PR: `npm run check:template` schlug einmalig mit
zwei F14-WS-4-AK7-Befunden fehl (Abbruch-Endpunkt, „erwartet 202, erhalten
404"), ohne dass der Diff dieses PRs (`claude-code-gateway`,
`execution-controller`, `leitstand-server.mjs` pruefeStartauftrag/
starteJarvisChatLauf) den Abbruch-Pfad berührt; isolierter Wiederholungslauf
von `scripts/check-f10-leitstand.mjs` lief unmittelbar danach grün, ebenso
der volle `check:template`-Lauf danach. Exakt das im CLAUDE.md-Abschnitt
beschriebene Muster.

**F-486** · `TECH_DEBT` · P3 · offen
Titel: Verwaistes Testverzeichnis aus einer Verifikation.
Beschreibung: `kontrollzustand-test-f10-ak5a/check-f10-ak5a-<uuid>/`
existiert lokal aus einer früheren F10-AK5a-Verifikation und wurde nicht
aufgeräumt.
Fundstelle: kontrollzustand-test-f10-ak5a/ (Repo-Wurzel, real vorhanden,
über `.gitignore` Zeile 38 von git ausgenommen).
Auswirkung: Kein Git-/Gate-Risiko (ignoriert), aber lokaler Datenmüll.
Maßnahme: Manuell löschen — nicht in diesem PR (Docs-only-Auftrag, kein
Dateisystem-Aufräumen im Scope).
Feature/Run: F29/F30-Challenge, 20.09.2026.

**F-487** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Wiederholte `.git/index.lock`-Vorfälle, vermutlich GitKraken.
Beschreibung: Sechster beobachteter Vorfall eines verwaisten
`.git/index.lock`, vermutlich durch einen GitKraken-Hintergrundprozess,
der parallel zu terminalbasiertem `git` auf demselben Repo läuft.
Fundstelle: .git/index.lock (wiederholt auftretend, kein einzelner
Commit-Fund).
Auswirkung: Terminal-`git`-Befehle können blockieren oder fehlschlagen,
solange das Lock von einem anderen Prozess gehalten wird.
Maßnahme: GitKraken während Terminal-Git-Arbeit pausieren. Kein
Code-/Doku-Fix in diesem PR — Arbeitsablauf-Hinweis für Stefan.
Feature/Run: F29/F30-Challenge, 20.09.2026.

**F-490** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Findings F-469 bis F-481 fehlen in state/findings.md.
Beschreibung: Diese Findings existieren bislang nur in
Challenger-Verifikationsdokumenten, nicht in `state/findings.md` — die
laufende Nummerierung springt in dieser Datei direkt von F-439/F-467–F-468
auf F-482. Die Lücke betrifft F-440–F-466 UND F-469–F-481.
Fundstelle: state/findings.md (Nummernlücke F-469–F-481); die
zugehörigen Challenger-Verifikationsdokumente von F29/F30 (nicht in
diesem Repo-Pfad).
Auswirkung: Ein Teil der protokollierten Befunde ist über die einzige
Findings-Quelle nicht auffindbar.
Maßnahme: Nachtrag aus den Verifikationsdokumenten erforderlich — nicht in
diesem PR (Docs-only-Auftrag mit explizit benanntem Umfang, dieser
Nachtrag war nicht Teil des Auftrags).
Feature/Run: F29/F30-Challenge, 20.09.2026.

**F-491** · `TECH_DEBT` · P2 · offen
Titel: Flaky Gate F14 WS-4 AK7.
Beschreibung: `npm run check:template` meldete einmalig „erwartet 202,
erhalten 404" bei F14 WS-4 AK7 (Abbruch eines aktiven Laufs), bei
Wiederholung desselben Checks unmittelbar danach grün. Vermutlich Race
zwischen Laufende und Abbruch-Request.
Fundstelle: scripts/check-f10-leitstand.mjs (F14-WS-4-AK7-Abschnitt).
Auswirkung: Ein Gate-Lauf kann ohne Codeänderung einmalig rot werden,
ohne dass die Ursache dokumentiert oder der Test deterministisch ist.
Maßnahme: Ursache analysieren, Test deterministisch machen. Nicht in
diesem PR behoben (Docs-only).
Feature/Run: F29/F31-Challenge, 20.09.2026.

**F-497** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: check-f11-auftrag.mjs prüft D13 nur am ersten Treffer im Quelltext.
Beschreibung: Das Gate sucht die D13-Prüfung (`if (laufAktiv)`) über die
erste Fundstelle im Quelltext von `scripts/leitstand-server.mjs`. Eine
künftige Umsortierung der Routen kann die tatsächlich geprüfte Stelle
verschieben, ohne dass das Gate das bemerkt — es prüft dann möglicherweise
eine andere Route als die beabsichtigte.
Fundstelle: scripts/check-f11-auftrag.mjs (D13-Abschnitt, erster
`if (laufAktiv)`-Treffer im Quelltext).
Auswirkung: Das Gate kann nach einer Routen-Umsortierung stillschweigend
die falsche Stelle prüfen und trotzdem grün bleiben.
Maßnahme: Prüfung robuster verankern (z. B. an einen Routen-Kommentar oder
Funktionsnamen statt an Fundstellen-Reihenfolge binden). Nicht in diesem
PR behoben (Docs-only).
Feature/Run: F31, 20.09.2026.

**F-498** · `TECH_DEBT` · P3 · offen
Titel: Kein UI-Hinweis, wenn das Verlaufsfenster oder Zusammenfassen älteren Kontext kappt.
Beschreibung: Sowohl das Chat-Verlaufsfenster (8 Turns / 12000 Zeichen) als
auch das größere Zusammenfassen-Fenster (30 Turns / 40000 Zeichen) können
älteren Gesprächsverlauf stillschweigend kappen — der Chat zeigt dem
Menschen nicht an, dass Jarvis einen Teil der Historie nicht mehr sieht.
Fundstelle: src/jarvis/index.ts waehleVerlaufsfenster; public/leitstand/
views/chat.js (keine entsprechende Anzeige).
Auswirkung: Ein Mensch kann sich auf eine frühere Nachricht beziehen, ohne
zu merken, dass Jarvis sie wegen der Fensterkappung nicht mehr kennt.
Maßnahme: Im Dogfooding bewerten, ob ein UI-Hinweis nötig ist. Nicht in
diesem PR behoben (Docs-only).
Feature/Run: F31, 20.09.2026.

**F-499** · `TECH_DEBT` · P3 · offen
Titel: Mehrere kleinere UX-Lücken um „Zusammenfassen & neu starten".
Beschreibung: Drei zusammenhängende Lücken: (1) die Standardansicht nach
einer Zusammenfassung ist unbegrenzt lang, obwohl die Zusammenfassung genau
dafür da ist, den sichtbaren Verlauf zu verkürzen; (2) der
Zusammenfassen-Button bleibt bei leerem Verlauf aktiv, ein Klick liefert
dann 409 als unbehandelten Rohtext statt einer verständlichen Meldung; (3)
zweimaliges Zusammenfassen hintereinander ist möglich, ohne dass das
UI davor warnt oder es verhindert.
Fundstelle: public/leitstand/views/chat.js (Standardansicht-Rendering,
Zusammenfassen-Button-Zustand); scripts/leitstand-server.mjs POST
/api/chat/zusammenfassen (409-Antwort).
Auswirkung: Kleinere UX-Reibung, kein Datenverlust — der 409-Rohtext wirkt
wie ein Fehler statt einer normalen Rückmeldung.
Maßnahme: Im Dogfooding bewerten, welche der drei Lücken echten Reibungs-
verlust verursachen, bevor gezielt behoben wird. Nicht in diesem PR
behoben (Docs-only).
Feature/Run: F31, 20.09.2026.

**F-500** · `TECH_DEBT` · P2 · offen
Titel: Flaky Test F14 WS-2 AK4 (Windows-Prozessbaum bei TIMEOUT).
Beschreibung: `src/claude-code-gateway/claude-code-gateway.test.ts`
("killt bei TIMEOUT unter Windows den kompletten Prozessbaum") schlug
einmalig mit ENOENT auf einer Datei
`f14-ws2-enkel-pid-<uuid>.txt` fehl; bei isolierter Wiederholung liefen
alle 42/42 Tests der Datei grün.
Fundstelle: src/claude-code-gateway/claude-code-gateway.test.ts (F14-WS-2-
AK4-Abschnitt, Enkel-PID-Datei).
Auswirkung: Ein Testlauf kann ohne Codeänderung einmalig rot werden, ohne
dass die Ursache dokumentiert oder der Test deterministisch ist.
Maßnahme: Zusammen mit [[F-491]] in einem gemeinsamen Flaky-Test-Durchgang
analysieren (beide betreffen Windows-Prozess-/Timing-Races). Nicht in
diesem PR behoben (Docs-only).
Feature/Run: F31, 20.09.2026.

**F-501** · `TECH_DEBT` · P1 · offen
Titel: Jarvis-Chat-Turn kostet ~7-10s CLI-Prozessstart je Nachricht.
Beschreibung: Die WS-3-Latenzmessung (`features/F31/latenzmessung.md`,
„Kernbefund 1") zeigt real aus Produktionsverkehr, dass der dominante
Anteil eines Chat-Turns (9,5-18s Prozessfenster, davon 7,4-8,3s außerhalb
dessen, was der CLI selbst als `duration_ms` meldet) reine Eigenzeit des
`claude`-CLI-Prozessstarts ist — nicht Server-Wrapper-Code (dort liegen nur
noch 266-386ms). Serverseitig ist damit kein großer Hebel mehr erreichbar,
ohne den CLI-Prozess selbst durch einen langlebigen Prozess zu ersetzen.
Fundstelle: features/F31/latenzmessung.md, Abschnitt „Kernbefund 1"
(Zeitaufschlüsselung `prozess_gestartet`/`prozess_beendet` vs. `duration_ms`).
Auswirkung: Jeder Jarvis-Chat-Turn bleibt bei 7-10s Wartezeit, unabhängig
von weiteren serverseitigen Optimierungen.
Maßnahme: „Jarvis Live" (ein langlebiger Prozess mit `stream-json`-
Ein-/Ausgabe statt eines Prozessstarts je Nachricht) ist als Maßnahme
vorgesehen, aber bewusst erst in der Dogfooding-Phase F30 angegangen
(Entscheidung Stefan, 20.09.2026) — ein Architekturwechsel dieser Größe
gehört nicht in eine reine Messungs-/Härtungs-Iteration. F31 WS-3b (dieser
PR) prüft nur den kleineren MCP-Start-Hebel (siehe [[F-502]]), nicht diesen.
Feature/Run: F31 WS-3b, 20.09.2026.

**F-504** · `TECH_DEBT` · P2 · offen
Titel: Künftige MCP-Capability-Freigabe muss ihre Server explizit über
mcpConfig durchreichen, sonst fehlt das Werkzeug still.
Beschreibung: MCP-Begrenzung ist seit F31 WS-3c Default für jeden Lauf.
Wird eine Capability freigegeben, die selbst ein MCP-Werkzeug ist (z. B.
`playwright-mcp`, F19/F29 WS-0), muss der betroffene Lauf seine Server
ausdrücklich über `AufrufEingaben.mcpConfig` bekommen, sonst fehlt das
Werkzeug still.
Fundstelle: `src/claude-code-gateway/index.ts` `baueAufruf` (Default
`--strict-mcp-config --mcp-config '{"mcpServers":{}}'`, F31 WS-3c).
Auswirkung: Eine freigegebene MCP-Capability könnte im Ausführungslauf
stillschweigend nicht verfügbar sein, ohne dass ein Fehler sichtbar wird.
Maßnahme: Bei der ersten MCP-Capability-Freigabe mitplanen und in der
Capability-Akte vermerken.
Feature/Run: F31 WS-3c, 20.09.2026.

**F-506** · `TECH_DEBT` · P2 · offen
Titel: F24-Phase `ASSESSED` ist strukturell leer und wird per Test als leer erzwungen.
Beschreibung: Ein Test erzwingt die Leere, obwohl die F27-Akte behauptet, die Phase zu füllen.
Fundstelle: `capabilities-ansicht.test.ts:68-72`; `features/F27/feature.md:15`.
Auswirkung: Die Phase ASSESSED bleibt entgegen der F27-Aussage leer.
Maßnahme: In F36 füllen (Scout-Artefakt am Eintrag), Test umdrehen.
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026. Quelle: claude/277.

**F-507** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Kandidatenkatalog existiert doppelt (Prosa und ressourcen.json).
Beschreibung: `docs/harness/kandidaten-2026-09-15.md` und `ressourcen.json` führen dieselben Kandidaten; ein Seed Catalog (M5-Plan §0.4) wäre der dritte Ort.
Fundstelle: `docs/harness/kandidaten-2026-09-15.md`, `ressourcen.json`.
Auswirkung: Mehrere Wahrheiten für dieselben Kandidaten.
Maßnahme: F36 überführt beide Kataloge als Daten.
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026. Quelle: claude/277.

**F-508** · `TECH_DEBT` · P2 · offen
Titel: Kontingent-Anzeige fehlt weiterhin (Verbrauch mit F32 WS-1/WS-2 sichtbar).
Beschreibung: Ursprünglich standen Usage-Werte nur im gitignorierten Rohstrom. F32 WS-1 (#200) erfasst `verbrauch` in der Laufakte und liefert `GET /api/verbrauch`; F32 WS-2 (22.09.2026) zeigt diesen Verbrauch jetzt als Karte "Verbrauch" im Dashboard (Summen je Rolle/Modell, drei feste Zeiträume). Eine Kontingent-Anzeige (Rate-Limit-/Fensterstatus, §12) bleibt weiterhin offen — real geprüft (siehe `features/F32/feature.md` "Bekannte Grenzen"), die CLI-Laufausgabe liefert keine entsprechenden Felder, kein unbelegter Bau möglich.
Fundstelle: `leseErgebnisobjekt`; `kontrollzustand-laufakte-payload.schema.json`; `public/leitstand/views/dashboard.js` (Karte "Verbrauch"); zielfassung §12 / Entscheidung 12.
Auswirkung: Verbrauch ist jetzt sichtbar; Kontingent (wie viel Budget bis zum nächsten Reset noch verfügbar ist) bleibt für Stefan unsichtbar.
Maßnahme: Offen, bis eine künftige CLI-Version Rate-Limit-/Fensterfelder liefert — kein Workaround geplant (keine Scheingenauigkeit).
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026; Teilerledigung F32 WS-1 (#200); weitere Teilerledigung F32 WS-2, 22.09.2026. Quelle: claude/277, claude/280.

**F-509** · `TECH_DEBT` · P2 · offen
Titel: Frist für F-371 („vor F25") ohne Entscheidung verstrichen, leitstand-server.mjs wächst weiter.
Beschreibung: F-371 betrifft die Aufteilung von `scripts/leitstand-server.mjs` (über 6 000 Zeilen); jedes Feature ergänzt dort Routen.
Fundstelle: `scripts/leitstand-server.mjs`.
Auswirkung: Die zentrale Serverdatei wächst unkontrolliert.
Maßnahme: Neue Routen ab F32 in `scripts/leitstand/routen-<feature>.mjs`; F-371 bleibt offen. Nachtrag F45 W1 (16.10.2026): die Regel ist jetzt durch das Gate `check-wachstumsbremse-server` durchgesetzt (Zeilen-Ratsche, Routen-Bestand); Aufteilung in W2 (F-371).
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026. Quelle: claude/277.

**F-510** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Findings-Lücke F-440 bis F-466 ist im Register nicht erfasst.
Beschreibung: F-490 deckt nur F-469 bis F-481 ab; Verweise in der F29-Akte laufen ins Leere.
Fundstelle: `state/findings.md`; `features/F29/`.
Auswirkung: Tote Finding-Verweise.
Maßnahme: Lücke aus den F29-Übergaben nachtragen oder IDs als „nicht vergeben" markieren.
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026. Quelle: claude/277.

**F-511** · `HARNESS_IMPROVEMENT` · P2 · Backlog mit Auslöser (F35-Akte, Nicht-Ziele)
Titel: Rolle `qa` steht im Register, ist aber in keiner Workflow-Vorlage besetzt.
Beschreibung: Kein Ergebnis-Schema (`output_schema: null`).
Fundstelle: `src/rollen/index.ts`; `workflow-vorlagen/*`.
Auswirkung: Im Workflow findet kein QA-Schritt statt.
Maßnahme: F35 WS-1 (feature.md, Abschnitt „Nicht-Ziele") stellt den qa-Schritt explizit ins
V1-Backlog, mit Auslöser: der Reviewer urteilt in F30 ≥ 2× `ERFUELLT`, obwohl das Verhalten real
falsch ist. Vorher war „F35" ohne Auslöser als pauschale Maßnahme genannt.
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026; Auslöser nachgetragen F35 WS-1, 25.09.2026. Quelle: claude/277.

**F-512** · `TECH_DEBT` · P3 · offen
Titel: starteJarvisChatLauf wählt den Worker hart codiert und unerklärt.
Beschreibung: Codex, wenn verfügbar, sonst Claude; die UI erklärt die Wahl nicht.
Fundstelle: `scripts/leitstand-server.mjs` (`starteJarvisChatLauf`).
Auswirkung: Faktische Worker-Wahl ohne Sichtbarkeit.
Maßnahme: F37.
Feature/Run: M5-Plan-v8-Challenge, 20.09.2026. Quelle: claude/277.

**F-515** · `TECH_DEBT` · P2 · offen
Titel: dauer_ms wird je Worker unterschiedlich gemessen.
Beschreibung: claude: CLI-`duration_ms`; codex: Gateway-Wanduhr inklusive ≈7,5 s Prozessstart.
Fundstelle: Laufakte, Feld `verbrauch` (F32).
Auswirkung: Worker-Vergleich (F37/M5.12) ist verzerrt.
Maßnahme: Messbasis angleichen oder in der Anzeige getrennt ausweisen (bei F37).
Feature/Run: F32 WS-0/WS-1, 20.09.2026. Quelle: claude/280.

**F-516** · `BUG` · P2 · offen
Titel: validiereLaufakteDaten liegt nicht auf dem Schreibpfad.
Beschreibung: Das Feld `verbrauch` wird auf dem echten Schreibpfad nicht geprüft.
Fundstelle: `validiereLaufakteDaten`.
Auswirkung: Validator mit Prüfanspruch, der nie wirkt.
Maßnahme: Validator in den Schreibpfad einhängen oder als reine Testhilfe kennzeichnen.
Feature/Run: F32 WS-0/WS-1, 20.09.2026. Quelle: claude/280, claude/281.

**F-517** · `TECH_DEBT` · P2 · offen
Titel: baueVerbrauchsProjektion lädt je Lauf und Anfrage zwei Artefakte ohne Index.
Beschreibung: Bei 124 Läufen 248 Ladevorgänge je Anfrage; Präzedenz ist der F26-Perf-Fix.
Fundstelle: `baueVerbrauchsProjektion` (`GET /api/verbrauch`).
Auswirkung: Aufwand je Anfrage wächst linear mit der Zahl der Läufe.
Maßnahme: Cache/Index nach F26-Muster, sobald die Anzeige (F32 WS-2) es nutzt.
Feature/Run: F32 WS-0/WS-1, 20.09.2026. Quelle: claude/280.

**F-519** · `TECH_DEBT` · P3 · offen
Titel: rolle, modell und auftragId fallen bei drei Ursachen in dieselbe null-Gruppe.
Beschreibung: Die Verbrauchsgruppierung unterscheidet die Ursachen fehlender Werte nicht.
Fundstelle: Verbrauchsprojektion (F32).
Auswirkung: Ursachen sind in der Auswertung nicht unterscheidbar.
Maßnahme: Ursache als eigenes Merkmal führen, wenn die Anzeige es braucht.
Feature/Run: F32 WS-0/WS-1, 20.09.2026. Quelle: claude/280.

**F-520** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Zusage §12 zur Kontingent-Anzeige ist real nicht lieferbar.
Beschreibung: `five_hour`/`seven_day`, `resetsAt` und `utilization` fehlen nachweislich in 5 269 realen Rohströmen; die Einschränkung steht nur in der F32-Akte.
Fundstelle: `docs/projekt/zielfassung.md` §12; `features/F32/feature.md`.
Auswirkung: Die Sollquelle verspricht eine nicht lieferbare Funktion.
Maßnahme: §12-Nachtrag in zielfassung.md (Doku-PR).
Feature/Run: F32, 20.09.2026. Quelle: claude/280.

**F-523** · `TECH_DEBT` · P1 · offen
Titel: Greenfield-Projekt über Jarvis ist strukturell blockiert.
Beschreibung: Ein neues Projekt braucht eine Autorisierungs-Baseline; Bootstrap-Automatik ist bewusst ausgeschlossen (F-414), der Import (F25 WS-2b) ist offen.
Fundstelle: F-414; F25 WS-2b.
Auswirkung: Zielbild „Build-with-Jarvis" nicht erreichbar.
Maßnahme: Als benannter V1-Blocker in F30 führen.
Feature/Run: Challenge Architecture & Technical Design, 20.09.2026. Quelle: claude/279.

**F-524** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Harness trägt einen vollständigen Design-Prozess, den keine Workforce-Rolle abbildet.
Beschreibung: `advisor-pass`, `handoff-vertrag`, `spec-schreiben`, ADR-Template und rund 40 `state/plan-v*.md`.
Fundstelle: `.claude/skills/*`, `docs/adr/TEMPLATE.md`, `state/plan-v*.md`.
Auswirkung: Keine Workforce-Rolle erzeugt einen technischen Entwurf.
Maßnahme: F39 leitet Rolle, Schema und Akte-Abschnitte daraus ab.
Feature/Run: Challenge Architecture & Technical Design, 20.09.2026. Quelle: claude/279.

**F-525** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Challenger meldete Projektdokumente als geschrieben, ohne dass ein Schreibvorgang stattfand.
Beschreibung: In zwei aufeinanderfolgenden Antworten; dieselbe Klasse wie F-082/F-092.
Fundstelle: Challenger-Antworten zu claude/279 und claude/280.
Auswirkung: Übergaben verweisen auf nicht existierende Dokumente.
Maßnahme: Dokument gilt erst nach bestätigtem Schreibvorgang als existent; Übergaben mit Existenznachweis.
Feature/Run: Challenge Architecture & Technical Design, 20.09.2026. Quelle: claude/279, claude/281.

**F-526** · `TECH_DEBT` · P2 · offen
Titel: dauer_api_ms kann größer sein als dauer_ms.
Beschreibung: Die Felder stehen nicht im Verhältnis Teil zu Ganzem.
Fundstelle: Laufakte `verbrauch` (F32).
Auswirkung: Eine Differenzbildung in der Anzeige wäre falsch.
Maßnahme: In F37/F32 WS-2 beide Felder getrennt zeigen, keine Differenz bilden.
Feature/Run: F32-Verifikation, 20.09.2026. Quelle: claude/281.

**F-527** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: E-188 blockiert reale Läufe aus Worktrees.
Beschreibung: Der Wirksamkeitsnachweis bindet `arbeitsverzeichnis_pfad` an den Pfad des Hauptrepos; `process.chdir()` als Workaround hilft nicht.
Fundstelle: `src/invocation-policy/index.ts:481-483`.
Auswirkung: Reale Nachweise aus Worktrees sind nicht möglich.
Maßnahme: Echte Nachweise nach dem Merge aus dem Hauptrepo führen oder bewusst einen worktree-gebundenen Nachweis ausstellen; Worktrees nur für echte Parallelarbeit.
Feature/Run: F32/F33, 20./21.09.2026. Quelle: claude/281, claude/284, claude/285.

**F-528** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Terminal-Blöcke für Worktree-Operationen prüfen cd und Branch nicht hart vorab.
Beschreibung: Wird inzwischen als Regel in Terminal-Blöcken befolgt, ist aber nicht mechanisch abgesichert.
Fundstelle: Terminal-Blöcke der Challenger-Übergaben (Worktree-Operationen).
Auswirkung: Befehle können im falschen Verzeichnis oder Branch laufen.
Maßnahme: Harte Prüfung von cd und Branch am Blockanfang.
Feature/Run: F32, 20.09.2026. Quelle: claude/281.

**F-531** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Worktrees sind aus der Bridge nicht direkt mit git bedienbar.
Beschreibung: Die `.git`-Datei enthält einen Windows-Pfad, der im Linux-VM nicht auflöst; `diff` über die Mount-Grenze läuft über 120 s ins Timeout.
Fundstelle: `.git`-Datei im Worktree.
Auswirkung: git-Befehle aus der Bridge scheitern oder hängen.
Maßnahme: `git --git-dir=<repo>/.git/worktrees/<name>` verwenden, Änderungsspuren per `find -newermt`.
Feature/Run: Repo-Stand-Verifikation, 20.09.2026. Quelle: claude/282.

**F-532** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Status „beauftragt" wurde ohne Beleg als Fortschritt fortgeschrieben.
Beschreibung: Zu F33 existierte real nie ein Commit, Übergaben meldeten dennoch Fortschritt.
Fundstelle: Challenger-Übergaben claude/278, claude/280.
Auswirkung: Übergaben meldeten nicht existierenden Fortschritt.
Maßnahme: Auftragsstatus nur mit Beleg (Commit, Diff, Zeitstempel), sonst „unbelegt".
Feature/Run: Repo-Stand-Verifikation, 20.09.2026. Quelle: claude/282.

**F-536** · `TECH_DEBT` · P3 · offen
Titel: F33-Helfer liegen im Server statt in src/projektkontext.
Beschreibung: `baueProjektkontextAnfragen` und `filtereExistierendeAnfragen` (rund 70 Zeilen); weiterer Zuwachs zu F-371.
Fundstelle: `scripts/leitstand-server.mjs`.
Auswirkung: Serverdatei wächst weiter.
Maßnahme: Akzeptiert; mit F-371 verschieben.
Feature/Run: F33 WS-0/WS-1, 21.09.2026. Quelle: claude/283.

**F-537** · `TECH_DEBT` · P3 · offen
Titel: src/projektkontext hat keine Unit-Tests, nur das Gate.
Beschreibung: Abdeckung ausschließlich über die Gate-Abschnitte (a) bis (g) von `check-f33-projektkontext.mjs`.
Fundstelle: `src/projektkontext`.
Auswirkung: Für den Prototyp ausreichend.
Maßnahme: Akzeptiert; Unit-Tests bei der nächsten fachlichen Änderung.
Feature/Run: F33 WS-0/WS-1, 21.09.2026. Quelle: claude/283.

**F-539** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Prüfung und Push standen im selben Terminal-Block.
Beschreibung: Wird als Regel befolgt, ist aber nicht mechanisch abgesichert.
Fundstelle: Commit-Ablauf `fix/jarvis-latenz`.
Auswirkung: Push konnte ohne vorherige Sichtprüfung laufen.
Maßnahme: Reihenfolge Freigabedatei → Commit → Prüf-Block → eigener Push-Block.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/292.

**F-546** · `TECH_DEBT` · P2 · offen
Titel: Seit abgeschaltetem Thinking möglicherweise mehr Vertragsverstöße.
Beschreibung: Annahme, zeitlich korreliert bei 2 von 5 Läufen.
Fundstelle: Jarvis-Läufe nach `MAX_THINKING_TOKENS=0`.
Auswirkung: Häufigere Fehler-Chat-Einträge.
Maßnahme: Beobachten; bei mehr als etwa 1 von 10 Fehler-Einträgen die Thinking-Abschaltung verwerfen.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/287.

**F-547** · `TECH_DEBT` · P3 · offen
Titel: Ein bezug mit Verweis auf die eigene ID wird nicht erkannt.
Beschreibung: Schemakonform, kein Prüfpfad fängt ihn.
Fundstelle: Jarvis-Ergebnis, Feld `bezug`.
Auswirkung: Für den Nutzer folgenlos.
Maßnahme: Serverseitig prüfen, dass die ID existiert und nicht die eigene ist.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/288.

**F-550** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Ein reproduzierbar roter Test wurde als Flake abgetan.
Beschreibung: Claude Code hat den Fehler eingeräumt; Regel steht seither im Prompt.
Fundstelle: Bericht zu check-f10 AK7.
Auswirkung: Echte Befunde können wegerklärt werden.
Maßnahme: Jeden Fehlschlag nennen, keinen per Retry wegerklären (Regel in CLAUDE.md verankern).
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/290.

**F-553** · `PROCESS_IMPROVEMENT` · P1 · offen
Titel: Challenger bezifferte den Nutzen einer Option ohne direkte Messung.
Beschreibung: „Jarvis Live" geschätzt 10–20 s Gewinn, gemessen ~3 s; eine Entscheidung Stefans beruhte auf der Schätzung (neu gefasst als E-M5-10).
Fundstelle: Challenger-Übergabe claude/288.
Auswirkung: Entscheidung auf falscher Zahl.
Maßnahme: Nutzenzahlen für Entscheidungen nur aus direkter Messung.
Feature/Run: Messung CLI-Overhead, 21.09.2026. Quelle: claude/291.

**F-559** · `TECH_DEBT` · P2 · offen
Titel: GET /api/zustand bleibt O(N) synchron über kontrollzustand/.
Beschreibung: Rund 3 900 Dateisystem-Aufrufe je Abfrage alle 2 s; wächst mit dem Bestand.
Fundstelle: Zustandsroute in `scripts/leitstand-server.mjs`.
Auswirkung: Wird bei Wachstum wieder langsam.
Maßnahme: Gate (d) sichert Median unter 300 ms; bei Überschreitung Index/Cache einführen. F-588 (fix/f588-sammle-laeufe, 22.09.2026) hat den ungefilterten Anteil (Kosten über ALLE Verzeichnisse statt nur echte Läufe) behoben — Faktor ~3,4x auf dem realen Bestand, siehe `state/messung-f588-zustand.md`. Das grundsätzliche O(n) über die Zahl echter Läufe bleibt bestehen, F-559 bleibt deshalb offen.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/293.

**F-562** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Virenscanner-Hook im Browser verfälscht Latenzmessungen.
Beschreibung: Kaspersky umhüllt `window.fetch` (Initiator `main.js`).
Fundstelle: Browser-Netzwerk-Log (`main.js:5747`).
Auswirkung: Browser-Messungen sind unzuverlässig.
Maßnahme: Messungen immer mit curl und Browser gegenüberstellen.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/295.

**F-563** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Textgenaue Quelltext-Zusagen in Gates brechen bei harmlosen Signaturänderungen.
Beschreibung: Erster `npm run check`-Lauf endete mit Exit 1 in check-f15 (d) nach einer harmlosen Änderung.
Fundstelle: `scripts/check-f15-workflow-oberflaeche.mjs` (d).
Auswirkung: Falsch-rote Gates.
Maßnahme: Verhaltensprüfung statt Textvergleich, wenn das Gate wieder angefasst wird.
Feature/Run: fix/jarvis-latenz, 21.09.2026. Quelle: claude/296.

**F-565** · `TECH_DEBT` · P3 · offen
Titel: Abbruch-Wirkzeit im Browser ist nicht gemessen.
Beschreibung: Lauf dauerte insgesamt ~8–11 s; Stefan akzeptiert die Dauer.
Fundstelle: Laufakten `cf330bca…`, `d89a76f0…`.
Auswirkung: Unklar, wie schnell ein Abbruch wirkt.
Maßnahme: Beobachten; Zeitmarke `abbruch_angefordert` bei Bedarf ergänzen.
Feature/Run: Browsertest, 21.09.2026. Quelle: claude/297, claude/298.

**F-566** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Freigabedatei wird ohne Zeitstempel-Hilfe angelegt und ist leicht abgelaufen.
Beschreibung: commit-guard verweigerte, weil die Datei 429 min alt war (Fenster 10 min).
Fundstelle: `state/freigabe-commit.md`.
Auswirkung: Commits werden blockiert.
Maßnahme: PowerShell-Einzeiler als Standard (`Set-Content … (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")`).
Feature/Run: Commit fix/jarvis-latenz, 21.09.2026. Quelle: claude/298.

**F-572** · `TECH_DEBT` · P3 · offen
Titel: D13-Freigabe erfolgt beim frühen Resolve, nicht beim tatsächlichen Prozessende.
Beschreibung: Fenster (≤5 s, real <1 s) mit zwei parallelen Werkzeugprozessen; per Empfehlung akzeptiert.
Fundstelle: `scripts/leitstand-server.mjs` (Reset von `laufAktiv`).
Auswirkung: Geringes Risiko, weil jarvis nur lesend arbeitet.
Maßnahme: Beibehalten; auf Freigabe bei Prozessende wechseln, sobald eine schreibende Rolle früh aufgelöst wird.
Feature/Run: F40 WS-1, 21.09.2026. Quelle: claude/302.

**F-573** · `TECH_DEBT` · P3 · offen
Titel: Rohströme wachsen durch volle Dateiinhalte in tool_result-Zeilen.
Beschreibung: 7–67 KB statt ~3 KB im Median.
Fundstelle: `kontrollzustand-roh/…/rohstrom.json`.
Auswirkung: Weit unter der 64-MB-Grenze.
Maßnahme: Beobachten.
Feature/Run: F40 WS-1, 21.09.2026. Quelle: claude/302.

**F-574** · `TECH_DEBT` · P2 · offen
Titel: Kein Browser-Klicktest für Werkzeug-Fortschrittsanzeige und Abbruch um die result-Zeile.
Beschreibung: Kein Test für das `fortschritt`-Feld und dessen Textaufbereitung in chat.js.
Fundstelle: `public/leitstand/views/chat.js`.
Auswirkung: UI-Pfade sind ungetestet.
Maßnahme: Browser-Klicktest bei der nächsten Chat-UI-Änderung nachholen.
Feature/Run: F40 WS-1, 21.09.2026. Quelle: claude/302.

**F-575** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Tree-weiter git diff/status über die Bridge läuft bei großem kontrollzustand/ ins Timeout.
Beschreibung: `diff`, `diff --stat` und `status` über die Bridge liefen >60–90 s (650+ Unterordner).
Fundstelle: Bridge; `kontrollzustand/`.
Auswirkung: Verifikation blockiert.
Maßnahme: Immer Einzeldatei-Diffs verwenden.
Feature/Run: F40 WS-1, 21.09.2026. Quelle: claude/302.

**F-577** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Verwaistes .git/index.lock tritt wiederholt auf.
Beschreibung: Bekanntes Muster (F-100, F-118, F-122, F-123, F-126); zuletzt am 21.09.2026 beobachtet.
Fundstelle: `.git/index.lock`.
Auswirkung: Blockiert lokale Git-Operationen, bis es entfernt wird.
Maßnahme: Lokal entfernen, nachdem geprüft ist, dass kein Git-Prozess läuft; Ursache weiter beobachten.
Feature/Run: F40 WS-1, 21.09.2026. Quelle: claude/303, claude/304.

**F-578** · `BUG` · P2 · offen
Titel: Fehler-/Abbruch-Eintrag ist im eingeklappten Chat-Standardausschnitt nicht sichtbar.
Beschreibung: QA-Fund aus fix/chat-fehler-anzeige (F-564/F-576).
Fundstelle: `public/leitstand/views/chat.js` (eingeklappter Ausschnitt).
Auswirkung: Nutzer übersieht einen Fehler oder Abbruch, solange der Verlauf eingeklappt ist.
Maßnahme: Separates Folge-Ticket.
Feature/Run: fix/chat-fehler-anzeige, 21.09.2026. Quelle: claude/304.

**F-580** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Features laufen mit gemergten Workstreams ohne Feature-Akte.
Beschreibung: Beispiel F40 (WS-0/WS-1 gemergt ohne Akte); `check-feature.mjs` erkennt das nicht.
Fundstelle: `scripts/check-feature.mjs`.
Auswirkung: Features ohne Akte bleiben unbemerkt.
Maßnahme: Check „jede in STATUS/Commit-Titeln genannte F-ID hat eine Akte".
Feature/Run: F40 WS-2, 21.09.2026. Quelle: claude/305.

**F-581** · `TECH_DEBT` · P3 · offen
Titel: Lagebild wird nur durch das Gate erzwungen, nicht automatisch erzeugt.
Beschreibung: Jeder PR, der STATUS.md oder findings.md ändert, muss `node scripts/erzeuge-lagebild.mjs` ausführen.
Fundstelle: `scripts/erzeuge-lagebild.mjs`, `scripts/check-f40-lagebild.mjs`.
Auswirkung: Kann PRs aufhalten.
Maßnahme: Beobachten; notfalls serverseitig beim Start erzeugen.
Feature/Run: F40 WS-2, 21.09.2026. Quelle: claude/306.

**F-582** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Freigabedatei wird beim Commit verbraucht, der Push braucht eine zweite Freigabe.
Beschreibung: commit-guard verbraucht `state/freigabe-commit.md` beim Commit; der anschließende Push desselben Commits wird verweigert (F40 WS-2, zuvor fix/jarvis-latenz).
Fundstelle: `state/freigabe-commit.md`; commit-guard-Hook.
Auswirkung: Eine zusätzliche Mensch-Runde pro PR.
Maßnahme: Freigabe an den Commit-Hash binden und erst nach dem Push verbrauchen.
Feature/Run: F40 WS-2 Commit, 21.09.2026. Quelle: claude/298, claude/307.

**F-583** · `TECH_DEBT` · P3 · offen
Titel: Ungeklärt, ob Auto-Memory den MEMORY.md-Inhalt ohne Read-Werkzeug in den Systemprompt lädt.
Beschreibung: Die Kausalprobe (`DENIED`) spricht dagegen, ist aber kein Beweis.
Fundstelle: F40 WS-3, `AUTO_MEMORY_DENY_REGEL`.
Auswirkung: Die Isolation wäre möglicherweise unvollständig.
Maßnahme: Mit einer Frage testen, die nur aus MEMORY.md beantwortbar ist; falls ja, Entscheidung Stefan über eine E-182-Ausnahme für `--bare` nur für jarvis.
Feature/Run: F40 WS-3, 21.09.2026. Quelle: claude/308.

**F-584** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Verwaiste, ungetrackte Dateien state/nachweis-runde2-* (json und .sh).
Beschreibung: Tauchen in jedem Staging-Blick auf, gehören zu keinem Auftrag.
Fundstelle: `state/nachweis-runde2-*`.
Auswirkung: Stören den Staging-Blick, Risiko versehentlichen Mitcommits.
Maßnahme: Aufräumen (löschen oder in `.gitignore`).
Feature/Run: F40 WS-3, 21.09.2026. Quelle: claude/308.

**F-589** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: Lesendes git über die Remote-Bridge hinterlässt trotz --no-optional-locks ein .git/index.lock.
Beschreibung: Challenger-Verifikation 22.09.2026: git rev-parse/log/diff --cached/diff --stat (Einzeldateien, --no-optional-locks) über die Bridge lief in einen 120-s-Timeout; danach existierte .git/index.lock (0 Byte, 06:10:03 UTC). Sechster Vorfall nach F-100, F-118, F-122, F-123, F-126.
Fundstelle: Challenger-Bridge (Cowork-VM auf gemountetem Windows-Repo).
Auswirkung: Blockiert Stefans Git-Operationen bis zum manuellen Löschen.
Maßnahme: Challenger nutzt über die Bridge kein git mehr (auch nicht lesend); Verifikation per Dateiinhalt + git diff --cached --name-only aus Stefans Terminal. Projektinstruktion entsprechend anpassen (Stefan).
Feature/Run: Verifikation Messung F-588, 22.09.2026. Quelle: claude/315.

**F-591** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Bauauftrag senkte einen bewusst gewählten Harness-Wert (maxRetries 10→5), weil der Auftrag bestehende Helfer/Regeln nicht geprüft hatte.
Beschreibung: Der F-590-Auftrag gab `maxRetries: 5` als Zielwert vor, ohne zu prüfen, dass `scripts/_aufraeumen.ts` diesen Wert bereits bewusst auf 10 gesetzt hatte (F-257, neun frühere Vorfälle, dokumentierte Historie im JSDoc). Die Umsetzung senkte den Wert wie angeordnet, wies aber im Bericht auf den Widerspruch hin — Stefan bestätigte danach, dass die Absenkung ein Fehler im Auftrag war, und der Wert wurde in der Korrekturrunde zurückgesetzt.
Fundstelle: `scripts/_aufraeumen.ts`; F-257; F-590.
Auswirkung: Ein bereits gelöstes Problem (F-257) wäre ohne den Hinweis erneut aufgetreten, nur unter neuem Namen (F-590).
Maßnahme: Challenger greppt vor Harness-Aufträgen nach bestehenden Helfern/Regeln; Claude Code stoppt und fragt nach, bevor es einen dokumentierten Schutzwert absenkt, statt umzusetzen.
Feature/Run: fix/f588-sammle-laeufe, 22.09.2026. Quelle: claude/317.

**F-592** · `TECH_DEBT` · P3 · offen
Titel: Workboard-Karte "Roadmap" — kein/mehrere LAEUFT-Meilensteine nur über realen Datenstand geprüft, kein synthetischer Testfall.
Beschreibung: `bentoRoadmapKarte` (`public/leitstand/views/workboard.js`, F33 WS-2) hebt den Meilenstein mit `status: 'LAEUFT'` hervor. (a) Gibt es keinen (z. B. alle Meilensteine `ABGESCHLOSSEN`/`GEPLANT`), zeigt die Karte nur die kollabierte Liste ohne hervorgehobenen Block. (b) Spiegelfall (Code-Review-Befund): das Schema (`validiereRoadmapDaten`) schließt MEHRERE Meilensteine mit `status: 'LAEUFT'` nicht aus — `bentoRoadmapKarte` hebt dann nur den ersten Treffer hervor, der Rest fällt kommentarlos in die kollabierte Liste, ohne Warnhinweis auf die Inkonsistenz. Beide Fälle sind beabsichtigtes, dokumentiertes Verhalten (`features/F33/feature.md`), aber weder `scripts/check-f33-roadmap-projektion.mjs` noch ein UI-Test deckt sie synthetisch ab; sie laufen nur zufällig über den echten Datenstand (M5 trägt aktuell genau ein `LAEUFT`) mit.
Fundstelle: `public/leitstand/views/workboard.js` (`bentoRoadmapKarte`); `scripts/check-f33-roadmap-projektion.mjs`.
Auswirkung: Gering — ein künftiger Meilenstein-Abschluss ohne neuen LAEUFT-Nachfolger, oder ein versehentlich doppelt auf LAEUFT gesetzter Meilenstein, könnte die Karte unbemerkt in einen ungeprüften bzw. irreführenden Zustand versetzen.
Maßnahme: Bei Gelegenheit zwei synthetische `roadmap.json`-Fixture-Fälle (kein LAEUFT; zwei LAEUFT) im Gate oder einem UI-Test ergänzen.
Feature/Run: F33 WS-2, 22.09.2026. Quelle: claude/318, Reviewer-/QA-Pass 22.09.2026.

**F-593** · `TECH_DEBT` · P2 · offen
Titel: Workboard-View lädt Workitems/Roadmap nicht neu bei Projektwechsel oder Wiederbetreten.
Beschreibung: QA-Pass-Befund (F33 WS-2): `public/leitstand/views/workboard.js` abonniert `abonniereProjektWechsel` nicht (anders als `views/chat.js`, F26 WS-2a, wo genau diese Bugklasse bereits real reproduziert und gezielt behoben wurde). Die Modul-Singletons `letzteWorkitems`/`alleWorkitemsUngefiltert`/`fokusCache` UND das neue `letzteRoadmap` (F33 WS-2) überleben einen Projektwechsel unverändert — nach einem Wechsel zeigt das gesamte Bento-Board (inkl. der neuen Roadmap-Karte) kommentarlos weiter den Stand des VORHERIGEN Projekts, bis Stefan manuell "Neu laden" klickt. Zusätzlich lädt auch ein reines Wiederbetreten von `#/workboard` (`registriere(/^#\/workboard$/, …)`, ohne Projektwechsel) weder Workitems noch Roadmap neu — nur der initiale Bootstrap-Aufruf und der "Neu laden"-Knopf tun das.
Fundstelle: `public/leitstand/views/workboard.js` (fehlendes `abonniereProjektWechsel`, `initWorkboardView`s `#/workboard`-Routen-Handler ruft nur `schliesseDetail()`); Gegenbeispiel `public/leitstand/views/chat.js` (F26 WS-2a).
Auswirkung: Nach einem Projektwechsel können veraltete Daten eines anderen Projekts als aktuell missverstanden werden — kein Absturz, aber falsches Vertrauen in den angezeigten Stand.
Maßnahme: `abonniereProjektWechsel`-Callback in `workboard.js` ergänzen, der `ladeWorkitems()`/`ladeRoadmap()` erneut auslöst (Muster `views/chat.js`); ggf. zusätzlich beim Wiederbetreten der Route.
Feature/Run: F33 WS-2 QA-Pass, 22.09.2026. Quelle: claude/318.

**F-594** · `TECH_DEBT` · P4 · offen
Titel: GET /api/roadmap liefert `vision`, die Workboard-Karte zeigt sie nirgends.
Beschreibung: Code-Review-Befund (F33 WS-2): `baueRoadmapProjektion` gibt bei `status: 'ok'` zusätzlich `vision` zurück (`roadmap.json`s Projektvisions-Text), `bentoRoadmapKarte` konsumiert aber nur `meilensteine`. Bewusste Scope-Entscheidung des WS-2-Auftrags (nur Meilensteine/Features gefordert), bisher aber nicht ausdrücklich als "vision bleibt in der Karte unsichtbar" dokumentiert gewesen.
Fundstelle: `scripts/leitstand/routen-roadmap.mjs`; `public/leitstand/views/workboard.js` (`bentoRoadmapKarte`).
Auswirkung: Keine — reine Dokumentationslücke, kein Fehlverhalten.
Maßnahme: Keine (dokumentiert); bei Bedarf könnte `vision` künftig z. B. als Tooltip/Untertitel der Karte ergänzt werden.
Feature/Run: F33 WS-2 Code-Review, 22.09.2026. Quelle: claude/318.

**F-596** · `TECH_DEBT` · P3 · offen
Titel: Workboard-Karte Roadmap optisch unfertig.
Beschreibung: Stefan (22.09.2026): die Karte "Roadmap" im Workboard sieht optisch noch nicht ausgereift aus; Design-Nacharbeit ist bewusst auf die geplante Design-Phase vor F30 verschoben (E-M5-2).
Fundstelle: `public/leitstand/views/workboard.js` (`bentoRoadmapKarte`); `public/leitstand/style.css`.
Auswirkung: Keine funktionale Einschränkung, rein optisch.
Maßnahme: Zurückgestellt bis zur Design-Phase vor F30 (E-M5-2).
Feature/Run: F33 WS-2, 22.09.2026. Quelle: claude/321.

**F-597** · `TECH_DEBT` · P4 · offen
Titel: baueRoadmapProjektion beschriftet jeden Lesefehler pauschal als JSON-Parsefehler.
Beschreibung: Feature-Review-Pass (code-reviewer, frischer Kontext): der `try/catch` um `readFileSync`+`JSON.parse` in `baueRoadmapProjektion` (`scripts/leitstand/routen-roadmap.mjs`) fasst Lesefehler (z. B. Berechtigungsfehler, TOCTOU zwischen `existsSync` und `readFileSync`) und echte JSON-Parsefehler in derselben Meldung "JSON-Parsefehler: ..." zusammen. Funktional harmlos (weiterhin `status: 'ungueltig'`, kein 500), aber irreführend bei der Diagnose.
Fundstelle: `scripts/leitstand/routen-roadmap.mjs` (`baueRoadmapProjektion`, catch-Block).
Auswirkung: Gering — nur Diagnosequalität betroffen, kein Fehlverhalten.
Maßnahme: Fehlerquellen trennen oder Meldung generischer fassen ("Datei nicht lesbar oder ungültiges JSON: ...").
Feature/Run: F33 Feature-Review-Pass, 22.09.2026. Quelle: claude/320.

**F-599** · `TECH_DEBT` · P4 · offen
Titel: Feature-IDs innerhalb eines Meilensteins nicht auf Eindeutigkeit geprüft.
Beschreibung: Feature-Review-Pass (qa, frischer Kontext): `pruefeMeilensteinForm` (`src/projektkontext/index.ts`) erzwingt Eindeutigkeit nur für `meilensteine[].id`, nicht für `features[]` innerhalb eines einzelnen Meilensteins. Ein Copy-&-Paste-Fehler in `roadmap.json` (dieselbe Feature-ID zweimal im selben Meilenstein) würde weder von Schema noch Gate abgefangen und in der Workboard-Karte als zwei identische Zeilen erscheinen.
Fundstelle: `src/projektkontext/index.ts` (`pruefeMeilensteinForm`); `scripts/check-f33-projektkontext.mjs` Abschnitt (c).
Auswirkung: Sehr gering — redaktioneller Fehler in einer von Hand gepflegten Datei, keine Fehlfunktion, nur eine doppelte Anzeige.
Maßnahme: Bei Gelegenheit Eindeutigkeitsprüfung für `features[]` je Meilenstein ergänzen.
Feature/Run: F33 Feature-Review-Pass, 22.09.2026. Quelle: claude/321.

**F-600** · `TECH_DEBT` · P4 · offen
Titel: Rohe interne Feature-Statuswerte (keine_akte/UNBEKANNT) erscheinen unübersetzt als Badge-Text, aktuell die Mehrheit der M5-Zeilen.
Beschreibung: Feature-Review-Pass (qa, frischer Kontext): `roadmapFeatureZeile` (`public/leitstand/views/workboard.js`) zeigt den rohen Statuswert unverändert als Badge-Text, inkonsistent zum F-476-Prinzip ("keine Entwicklerprosa"), das für die Kartenebene bereits gilt. Praktisch relevant gerade jetzt: 7 von 10 Features des aktuell hervorgehobenen Meilensteins M5 (F30, F34–F39) haben noch keine `features/<id>/feature.md` und zeigen daher `keine_akte` — der erste reale Blick auf die Karte zeigt somit überwiegend dieses Badge statt eines aussagekräftigen Fortschrittsbilds, was bei Stefans anstehender Verifikation fälschlich als Defekt wahrgenommen werden könnte.
Fundstelle: `public/leitstand/views/workboard.js` (`roadmapFeatureZeile`); `docs/projekt/roadmap.json` vs. `features/`-Verzeichnis (realer Datenstand 22.09.2026).
Auswirkung: Gering — kein Fehlverhalten, nur Lesbarkeit/Erstinterpretation der Karte.
Maßnahme: Bei Gelegenheit Statuswerte für die Anzeige aufbereiten (z. B. "Noch keine Akte" statt `keine_akte`); bis dahin nur dokumentiert.
Feature/Run: F33 Feature-Review-Pass, 22.09.2026. Quelle: claude/321.

**F-601** · `TECH_DEBT` · P4 · offen
Titel: Kein Gate/Test deckt die dashboard.js-internen Bausteine der Verbrauchs-Karte ab (F32 WS-2).
Beschreibung: QA-Pass (frischer Kontext): `scripts/check-f32-verbrauch-ansicht.mjs` prüft AK9-konform `berechneVerbrauchsVon` und den rohen HTTP-Endpunkt `GET /api/verbrauch`, aber keinen der UI-internen Bausteine in `public/leitstand/views/dashboard.js` — `aggregiereVerbrauch` (Rollen-/Modell-Gruppierung inkl. null-Behandlung), `verbrauchZeile`/`verbrauchTabelle` (Feldnamen-Mapping, Leer-/Tooltip-Texte), Lade-/Fehlerzustand und Überholschutz `verbrauchAnfrageZaehler`. Kein Sonderfall von F32: kein View-Renderer im Repo (`public/leitstand/views/*.js`) hat eigene Unit-Tests — nur reine State-Ableitungsmodule wie `persona-state.js`/`verbrauch-zeitraum.js` werden gate-geprüft.
Fundstelle: `scripts/check-f32-verbrauch-ansicht.mjs`; `public/leitstand/views/dashboard.js` (`aggregiereVerbrauch`, `verbrauchZeile`, `verbrauchTabelle`, `ladeVerbrauch`).
Auswirkung: Gering bis mittel — ein Regressionsfehler in der Aggregation oder Fehlerdarstellung würde von `npm run check` nicht erkannt, nur durch manuelle/Browser-Prüfung.
Maßnahme: Bei Gelegenheit ein DOM-loses Unit-Test-Muster für View-Renderer etablieren (projektweite Entscheidung, kein F32-Einzelfall); bis dahin nur dokumentiert.
Feature/Run: F32 WS-2 QA-Pass, 22.09.2026. Quelle: claude/f32-ws2.

**F-602** · `TECH_DEBT` · P4 · offen
Titel: Kein Browser-Realtest bei ~400px für die 6-spaltige Verbrauchstabelle (F32 WS-2).
Beschreibung: QA-Pass (frischer Kontext): die Karte "Verbrauch" zeigt zwei Tabellen mit sechs Spalten (Rolle/Modell, Läufe, ohne Beobachtung, drei Token-Spalten) ohne eigenen `overflow-x:auto`-Wrapper — nur die generische Regel `table { width:100%; max-width:100% }` (`style.css`) gilt. Kein F32-spezifischer Regressionsbefund: dasselbe ungeschützte Muster gilt sitebreit für jede Tabelle im Projekt (z. B. `views/capabilities.js` mit 9 Spalten), kein Repo-Table hat einen Scroll-Container. Risiko bei F32 lediglich ungeprüft, nicht real widerlegt — anders als z. B. F-561, das auf einer echten Browserbeobachtung beruht.
Fundstelle: `public/leitstand/views/dashboard.js` (`verbrauchTabelle`); `public/leitstand/style.css` (`table`-Regel).
Auswirkung: Gering — sitebreites, vorbestehendes Muster, keine neue Regression.
Maßnahme: Bei Gelegenheit projektweit (nicht nur F32) prüfen, ob dichte Tabellen einen `overflow-x:auto`-Wrapper brauchen; bis dahin nur dokumentiert.
Feature/Run: F32 WS-2 QA-Pass, 22.09.2026. Quelle: claude/f32-ws2.

**F-604** · `TECH_DEBT` · P3 · offen
Titel: filtereExistierendeAnfragen liest jetzt eine Datei ohne eigenes try/catch (F-598-Fix, TOCTOU).
Beschreibung: Code-Review-Befund (frischer Kontext, Fixpaket fix/f603-f598-f595): der F-598-Fix ergänzt in `filtereExistierendeAnfragen` (`scripts/leitstand-server.mjs`) ein `readFileSync(absoluterPfad, 'utf8')` zur Leerprüfung, aber anders als das strukturell gleiche `readFileSync` in `loeseAusfuehrungsEingabenAuf` steht es in keinem eigenen try/catch. Bei einem TOCTOU-Fall (Datei verschwindet zwischen `statSync` und `readFileSync`) wirft der Filter-Callback unbehandelt. Praktisch ungefährlich — der äußere Request-Handler-try/catch fängt den Wurf, loggt ihn und beantwortet mit 500 (kein stiller Fehler, kein Hänger) — aber inkonsistent zum unmittelbar benachbarten Muster in derselben Datei.
Fundstelle: `scripts/leitstand-server.mjs` (`filtereExistierendeAnfragen`, `loeseAusfuehrungsEingabenAuf`).
Auswirkung: Gering — sehr seltenes Zeitfenster, bereits durch den äußeren Handler abgefangen, kein stiller Fehler.
Maßnahme: Bei Gelegenheit denselben try/catch-Stil wie `loeseAusfuehrungsEingabenAuf` übernehmen, oder den Fall bewusst als akzeptierte Grenze kommentieren.
Feature/Run: Fixpaket fix/f603-f598-f595 Code-Review-Pass, 22.09.2026. Quelle: claude/fix-f603-f598-f595.

**F-605** · `TECH_DEBT` · P3 · offen
Titel: Projektkontext-Dateien werden bei jedem Chat-/Router-Aufruf zweimal gelesen (F-598-Fix, zweiter I/O-Zugriff).
Beschreibung: Code-Review-Befund (frischer Kontext, Fixpaket fix/f603-f598-f595): jede der vier `baueProjektkontextAnfragen`-Dateien (`beschreibung.md`, `anweisungen.md`, `roadmap.json`, `lagebild.md`) wird jetzt einmal in `filtereExistierendeAnfragen` (Leerprüfung, F-598-Fix) und ein zweites Mal in `loeseAusfuehrungsEingabenAuf` (Inhalt für den Kontextpaket-Eintrag) gelesen. Kein D5-Verstoß (keine zweite Logikkopie, nur ein zweiter I/O-Zugriff derselben Datei) und bei den real vorkommenden kleinen Datei-/Markdown-Größen unproblematisch, aber der Dateikopf-Kommentar von `baueProjektkontextAnfragen` ("kein zweiter Lesepfad") bezieht sich nur auf die Anfragen-Konstruktion selbst, nicht auf diesen neuen, zusätzlichen Lesevorgang — für Nachvollziehbarkeit unvollständig dokumentiert.
Fundstelle: `scripts/leitstand-server.mjs` (`filtereExistierendeAnfragen`, `loeseAusfuehrungsEingabenAuf`, `baueProjektkontextAnfragen`-Dateikopfkommentar).
Auswirkung: Gering — kein Performance- oder Korrektheitsproblem bei realen Dateigrößen, nur ein Dokumentationsdefizit.
Maßnahme: Bei Gelegenheit einen Satz im `baueProjektkontextAnfragen`-Kommentar ergänzen, dass die Leerprüfung einen zweiten, schmalen Lesevorgang derselben Datei in Kauf nimmt.
Feature/Run: Fixpaket fix/f603-f598-f595 Code-Review-Pass, 22.09.2026. Quelle: claude/fix-f603-f598-f595.

**F-607** · `TECH_DEBT` · P4 · offen
Titel: Kein Test deckt die D13-Sperre unter echter Nebenläufigkeit ab (zwei tatsächlich überlappende Requests).
Beschreibung: QA-Pass F34 WS-1 (frischer Kontext): weder `scripts/check-f26-jarvis.mjs` noch `scripts/check-f34-product-coach.mjs` (noch ein anderes Gate) feuert zwei echte, gleichzeitig überlappende `POST /api/chat`/`POST /api/sparring`/`POST /api/laeufe`-Requests gegeneinander. Bei Code-Lektüre sieht die Sperre (`if (laufAktiv)` … `laufAktiv = true`) race-frei aus — zwischen Prüfung und Setzen läuft ausschließlich synchroner Code (keine `await`-Lücke), was in Node.js' Single-Thread-Event-Loop eine Race Condition strukturell ausschließt — aber das ist eine aus dem Code abgeleitete Erwartung, kein per Test verifiziertes Verhalten. Kein F34-spezifisches Risiko: dieselbe Lücke gilt für JEDEN D13-geschützten Endpunkt im Repo, nicht nur `product-coach`/`jarvis`.
Fundstelle: `scripts/leitstand-server.mjs` (jede `if (laufAktiv)`-Stelle); kein Gate mit einem Zwei-parallele-Requests-Testfall gefunden.
Auswirkung: Gering — die synchrone Code-Struktur macht eine echte Race praktisch ausgeschlossen, aber unbewiesen bleibt unbewiesen.
Maßnahme: Bei Gelegenheit einen Gate-Fall mit zwei parallel (`Promise.all`) abgefeuerten Requests gegen denselben D13-geschützten Endpunkt ergänzen (ein Endpunkt genügt als Repräsentant, kein Bedarf für einen je Endpunkt).
Feature/Run: F34 WS-1 QA-Pass, 22.09.2026. Quelle: claude/f34-ws1.

**F-608** · `TECH_DEBT` · P4 · offen
Titel: `istNichtLeererString`/`istStringListe` akzeptieren Whitespace-only-Strings als "nicht-leer" (Jarvis + Product-Coach).
Beschreibung: QA-Pass F34 WS-1 (frischer Kontext): `istNichtLeererString` (`src/product-coach/index.ts`, identisches Muster in `src/jarvis/index.ts`) prüft nur `typeof wert === 'string' && wert.length > 0`, ohne `.trim()`. Ein Feld wie `alternativen[].titel` oder `scope.problem` mit reinem Leerzeichen-Inhalt (`" "`) besteht die Validierung, obwohl es keinen Informationswert trägt. Kein durch F34 neu eingeführter Fehler — dasselbe Verhalten existiert unverändert seit `src/jarvis/index.ts` (F26).
Fundstelle: `src/product-coach/index.ts` (`istNichtLeererString`, `istStringListe`); `src/jarvis/index.ts` (`istNichtLeererString`).
Auswirkung: Gering — ein realer Worker liefert praktisch nie Whitespace-only-Text; theoretischer Rand.
Maßnahme: Bei Gelegenheit `.trim().length > 0` statt `.length > 0` in beiden Modulen (D5: dieselbe Änderung an beiden Stellen, oder in eine gemeinsame Hilfsfunktion ziehen).
Feature/Run: F34 WS-1 QA-Pass, 22.09.2026. Quelle: claude/f34-ws1.

**F-610** · `TECH_DEBT` · P3 · offen
Titel: Latenzoptimierte Sparring-Varianten (MAX_THINKING_TOKENS=0 und/oder Lese-Obergrenze) finden niedrigpriorisierte Findings seltener als die unoptimierte Referenz.
Beschreibung: F34 WS-2 A/B-Messung (`features/F34/nachweis-ws2-latenz.md`): die V0-Referenz (WS-1, unverändert) fand in ihrem Scope-Entwurf sowohl `features/F29/feature.md` (WS-3) als auch `state/findings.md` F-596 — über 16 interne Werkzeugrunden in Turn 1, inklusive eigenständiger Recherche über Feature-Akten und das Findings-Register. Keine der drei schnelleren Varianten (V1 `MAX_THINKING_TOKENS=0`, V2 Lese-Obergrenze in der Rolleninstruktion, V3 beides) fand F-596 — plausible Ursache: `docs/projekt/kontext/lagebild.md` (die vorberechnete Context-Builder-Einspeisung, F40 WS-2) fasst nur OFFENE P1-Findings zusammen, F-596 ist P3 und fehlt dort; die eigenständige, mehrstufige Recherche, die F-596 in V0 fand, wird von beiden Latenzhebeln unabhängig voneinander reduziert. Alle drei schnelleren Varianten erfüllen die im Auftrag definierte Qualitätsschwelle trotzdem (jeweils andere reale Fundstellen + Abgrenzung vorhanden) — kein Korrektheitsfehler, aber eine reale, dokumentierte Grenze der jetzt aktiven Konfiguration (V1).
Fundstelle: `features/F34/nachweis-ws2-latenz.md`; `docs/projekt/kontext/lagebild.md` (nur P1-Findings); `scripts/leitstand-server.mjs` (`KONFIGURATION_PRODUCT_COACH`).
Auswirkung: Gering bis mittel — ein Sparring-Gespräch mit der jetzt aktiven, schnellen Konfiguration kann niedrigpriorisierte, aber real relevante Findings/Restarbeiten übersehen, die eine gründlichere (aber ~8× langsamere) Recherche gefunden hätte.
Maßnahme: Bei Gelegenheit prüfen, ob `lagebild.md` um P2/P3-Findings mit thematischem Bezug erweitert werden sollte, oder ob ein gezielter Hinweis in der Rolleninstruktion ("prüfe bei Scope-Fragen auch state/findings.md") das Verhalten ohne Latenzverlust nachholt.
Feature/Run: F34 WS-2, 22.09.2026. Quelle: claude/f34-ws2.

**F-615** · `TECH_DEBT` · P3 · offen
Titel: `vergebeFeatureIds`s `titelZuId`-Map ist global über alle Meilensteine hinweg und nicht robust gegen doppelte Feature-Titel innerhalb eines Entwurfs.
Beschreibung: Code-Review-Pass F34 WS-3 (frischer Kontext): tragen zwei Features desselben Projekt-Entwurfs (auch über Meilensteingrenzen hinweg) denselben `titel`, gewinnt in `titelZuId` stillschweigend der zuerst vergebene — eine `abhaengig_von_titel`-Referenz auf das ZWEITE, gleichnamige Feature wird dadurch fälschlich auf die ID des ERSTEN aufgelöst, statt als offene Frage markiert zu werden (Instruktion "unbekannter Titel → offene Frage" greift nicht, weil der Titel ja technisch bekannt ist — nur mehrdeutig). Kein Absturz, kein durch Abschnitt (n) des Gates abgedeckter Fall (dort sind alle Fixture-Titel eindeutig).
Fundstelle: `src/product-coach/index.ts` (`vergebeFeatureIds`, `titelZuId`-Aufbau).
Auswirkung: Gering — setzt voraus, dass der Coach innerhalb eines Entwurfs zwei Features mit identischem Titel vorschlägt (unwahrscheinlich, aber nicht durch die Rolleninstruktion ausgeschlossen); führt zu einer stillschweigend falschen statt einer offenen Abhängigkeitszuordnung.
Maßnahme: Bei Gelegenheit `titelZuId` auf eine Mehrfachbelegung prüfen und einen doppelten Titel als eigene offene Frage markieren, statt den ersten Treffer stillschweigend gewinnen zu lassen.
Feature/Run: Code-Review-Pass F34 WS-3, 22.09.2026. Quelle: claude/f34-ws3.

**F-616** · `TECH_DEBT` · P4 · offen
Titel: `ressourcen.json`/`loeseRessourcenAuf` wird pro `modus: 'projekt'`-Sparring-Request zweimal aufgelöst.
Beschreibung: Code-Review-Pass F34 WS-3 (frischer Kontext): `POST /api/sparring` löst Ressourcen einmal selbst auf (für den Capability-Auszug + `bekannteRessourcenIds`) und `starteRollenChatLauf` tut exakt dasselbe ein zweites Mal für die Worker-Wahl (`codex` vs. `claude-code`) — zwei Lesepfade für dieselbe Auflösung innerhalb eines Requests (D5-Geist leicht verletzt, kein Korrektheitsfehler).
Fundstelle: `scripts/leitstand-server.mjs` (`POST /api/sparring`, `starteRollenChatLauf`).
Auswirkung: Gering — reine Redundanz/Performance-Frage bei den real kleinen `ressourcen.json`-Größen, kein Korrektheitsfehler.
Maßnahme: Bei Gelegenheit das in `POST /api/sparring` bereits aufgelöste Ergebnis über `rollenOptionen` an `starteRollenChatLauf` durchreichen, statt es implizit zweimal zu berechnen.
Feature/Run: Code-Review-Pass F34 WS-3, 22.09.2026. Quelle: claude/f34-ws3.

**F-617** · `TECH_DEBT` · P3 · offen
Titel: Zwei registrierte, aber noch nicht gebaute Projekt-Entwürfe können vor dem Bau des ersten dieselbe Feature-/Meilenstein-Nummer zugewiesen bekommen — `vergebeFeatureIds` reserviert nichts im Voraus.
Beschreibung: QA-Pass F34 WS-3 (frischer Kontext), bereits im eigenen Nachweislauf beobachtet (`features/F34/nachweis-ws3.md`): `vergebeFeatureIds` liest `features/<id>/` und `roadmap.json` nur zur Laufzeit des jeweiligen Sparring-Turns — es reserviert keine Nummer. Registriert jemand zwei verschiedene Projekt-Entwürfe über "Als Auftrag anlegen" (das nur registriert, nicht routet/baut), bevor einer der beiden tatsächlich gebaut wird, können beide dieselbe `F<n>`/`M<n>` erhalten — kein Fehler des Mechanismus selbst (derselbe Namensraum-Konflikt gilt für zwei Menschen, die von Hand denselben Ordnernamen wählen), aber bisher nirgends als bewusste, akzeptierte Grenze festgehalten.
Fundstelle: `src/product-coach/index.ts` (`vergebeFeatureIds`); `features/F34/feature.md` ("Bekannte Grenzen" nennt diesen Fall bisher nicht).
Auswirkung: Gering bis mittel — tritt nur auf, wenn mehrere Projekt-Entwürfe parallel offen registriert, aber noch nicht gebaut sind; beim Bauen des zweiten würde der ID-Konflikt spätestens beim Anlegen des `features/<id>/`-Verzeichnisses sichtbar (Verzeichnis existiert bereits).
Maßnahme: Als "Bekannte Grenze" in `features/F34/feature.md` dokumentiert (CLAUDE.md-Entscheidungsregel 5) statt eines Reservierungsmechanismus — ein echtes Reservierungssystem wäre deutlich mehr Komplexität für einen seltenen, beim Bauen ohnehin sichtbaren Randfall.
Feature/Run: QA-Pass F34 WS-3, 22.09.2026. Quelle: claude/f34-ws3.

**F-619** · `TECH_DEBT` · P3 · offen
Titel: `entferneIdPraefix` bereinigt einen ID-artigen Titel-Präfix nur, wenn ein Trennzeichen folgt — ein Titel, der EXAKT der ID ohne Trenner entspricht (z. B. `"M6"`), bleibt unverändert und erzeugt weiterhin eine sichtbare Dopplung.
Beschreibung: Code-Review-Pass F34 WS-3 Korrekturrunde (frischer Kontext), zum F-611/F-612-Fix: `ID_PRAEFIX_MUSTER` (`/^\s*[MF][0-9]+[A-Za-z]?\s*[—–:-]\s*/`, `src/product-coach/index.ts` und die Browser-Kopie) verlangt zwingend einen der Trenner —/–/:/- nach dem ID-Teil. Ein `meilenstein.titel`/`feature.titel`, der ausschließlich aus der ID-ähnlichen Zeichenfolge ohne jeden Trenner besteht (z. B. `titel: "M6"`), matcht das Muster nicht und bleibt unbereinigt — `baueAuftragAusProjektentwurf` würde dafür weiterhin `"M6 — M6"` rendern. Ebenfalls ungetestet/unbelegt: die Trenner-Zeichenklasse deckt nur —/–/:/- ab, keine weiteren Unicode-Bindestrich-Varianten (z. B. U+2015, U+2212).
Fundstelle: `src/product-coach/index.ts` (`ID_PRAEFIX_MUSTER`, `entferneIdPraefix`); `public/leitstand/auftrag-aus-projektentwurf.js` (identisch).
Auswirkung: Gering — seltener als der ursprünglich beobachtete Fall (ein Trenner ist der Normalfall für einen plausibel geratenen, textuellen ID-Präfix; ein Titel ohne jeden Trenner direkt nach der ID ist ungewöhnlicher Sprachgebrauch); rein kosmetisch, kein Korrektheitsfehler (die tatsächliche ID kommt weiterhin ausschließlich aus `vergebeFeatureIds`).
Maßnahme: Bei Gelegenheit `ID_PRAEFIX_MUSTER` um einen optionalen Trenner erweitern (z. B. `[—–:-]?` statt `[—–:-]`, mit Wortgrenzen-Absicherung gegen Über-Matching) und/oder weitere Unicode-Bindestrich-Varianten ergänzen — bewusst nicht in der Korrekturrunde behoben, um das Muster nicht ohne echten Bedarf zu verkomplizieren (in `src/product-coach/index.ts` als bekannte, akzeptierte Grenze kommentiert).
Feature/Run: Code-Review-Pass F34 WS-3 Korrekturrunde, 22.09.2026. Quelle: claude/f34-ws3-korrektur.

**F-627** · `TECH_DEBT` · P3 · offen
Titel: Der reale, bewusst kollidierende Nachweis-Auftrag `1b3412a8-88be-45e0-b97d-46e6cc5ba396` (F-618-Kontext) hat außer Prosa in `feature.md`/`nachweis-ws3.md`/`state/findings.md` keine technische oder UI-seitige Markierung, die ein versehentliches Routen/Starten verhindert oder kenntlich macht.
Beschreibung: QA-Pass F34 (Gesamt), 23.09.2026: das Aufträge-Datenmodell trägt kein "Testartefakt"-Feld, das diesen Auftrag in der `#/projekt`-Übersicht von einem echten unterscheidet. Da "Als Auftrag anlegen" laut Nicht-Zielen bewusst nur anlegt (kein automatisches Routen), ist das Risiko gering — aber ein Mensch, der später `#/projekt` ohne Kenntnis dieses Feature-Reviews durchsieht, hat keinen Hinweis, dass der Auftrag absichtlich eine kollidierende ID trägt.
Fundstelle: Aufträge-Datenmodell (kein Markierungsfeld); `#/projekt`-Übersicht (`views/projekt.js`).
Auswirkung: Gering — Routen bleibt laut Nicht-Ziel ohnehin ein bewusster, separater menschlicher Schritt; reine, unmarkierte Altlast in der Aufträge-Übersicht.
Maßnahme: Bei Gelegenheit den Nachweis-Auftrag manuell aus der Aufträge-Übersicht entfernen oder mit einem erkennbaren Titel-Präfix versehen — kein struktureller Fix nötig, geringe Priorität.
Feature/Run: Feature-Review-Pass F34 (Gesamt), 23.09.2026. Quelle: claude/f34-feature-gate.

**F-634** · `PROCESS_IMPROVEMENT` · P3 · **kein Fix nötig, dokumentiert**
Titel: Herkunft des ungetrackten `kontrollzustand/`-Bestands im Repo-Root geklärt — kein Testlauf ohne isolierte `basisVerzeichnis` (F39-WS-2b-Auftrag, Punkt 0), sondern legitime, nie committete Läufe.
Beschreibung: Vor dem F39-WS-2b-Bau geprüft (837 Verzeichnisse unter `kontrollzustand/`, davon 751 Dateien bereits `git`-getrackt — `kontrollzustand/` ist laut `ARCHITECTURE.md` §1/§2 die reguläre, versionierte Kernartefakt-Ablage, kein Wegwerfverzeichnis). Die 348 zum Prüfzeitpunkt UNGETRACKTEN Top-Level-Einträge stammen aus drei real belegten, legitimen Quellen, keiner Testisolationslücke: (1) `jarvis-jarvis-chat-<uuid>` (104 Verzeichnisse) — echte, manuell geführte Jarvis-Chat-Läufe (`src/jarvis/index.ts`, Task „Jarvis-Chat-Latenz senken", real im Produktionsverkehr beobachtet, `src/claude-code-gateway/prozessstart.ts` Z. 82). (2) `eval-router-A<n>-r<n>-<ts>` — `scripts/eval-router.mjs` (F18 WS-3), laut eigenem Kopfkommentar ausdrücklich „KEIN Teil von `npm run check`": echte `claude-code`-Läufe gegen einen laufenden Leitstand-Server, eigenes `npm run eval:router`. (3) `e2e-*`/`f12-ws-4-nachweis-*`/`f13-nachweis-*` — dokumentierte, manuelle Wirksamkeitsnachweise realer Features (`state/e2e-nachweis-f11-ws3.md` u. ä.), die bewusst den echten Schreibpfad statt eines isolierten `kontrollzustand-test-*`-Verzeichnisses nutzen, um genau IHN zu belegen. Alle automatisierten Testfälle (`npm run check`) isolieren dagegen korrekt über `kontrollzustand-test-*`/-Sibling-Verzeichnisse (gitignored, Muster `check-f39-architekt.mjs` `testBasis = 'kontrollzustand-test-f39-g-' + randomUUID()`) — kein Fund einer Testfixture, die versehentlich auf das reale `kontrollzustand/` schreibt.
Fundstelle: `kontrollzustand/` (Repo-Root); `.gitignore` Z. 66–70 (Kommentar „`kontrollzustand/` selbst ist getrackt"); `scripts/eval-router.mjs` Kopfkommentar; `src/jarvis/index.ts`/`src/claude-code-gateway/prozessstart.ts` (Jarvis-Lauf-id-Muster).
Auswirkung: Gering — kein Sicherheits- oder Korrektheitsproblem, reine Repo-Hygiene: der reale, committete Kontrollzustand ist um 348 legitime, aber nie gestagte Verzeichnisse "hinter" dem letzten `kontrollzustand/`-Commit zurück. `npm run check` bleibt davon unberührt (prüft nur die eigenen, isolierten `kontrollzustand-test-*`-Verzeichnisse).
Maßnahme: Kein Code-Fix — es gibt keine Testisolationslücke zu schließen. Offen für Stefan: ob und wann die 348 Verzeichnisse in einem eigenen, bewussten Commit nachgezogen (oder bewusst verworfen) werden, bleibt eine Repo-Pflege-Entscheidung außerhalb dieses Auftrags; nicht eigenmächtig gestaged (Auftrags-Vorgabe: `kontrollzustand/` nicht mitstagen).
Feature/Run: F39-WS-2b-Auftrag, Punkt 0 (Vorabklärung), 23.09.2026. Quelle: claude/f39-ws2b-architektur-entscheidung.

**F-636** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: `features/F39/nachweis-ws3-reallauf.md` nennt weder `LEITSTAND_STARTVORLAGE_PFAD` noch eine Prüfung auf eine bereits laufende Leitstand-Instanz.
Beschreibung: F39-WS-3b-Vorbereitung (23.09.2026): die Ablaufanleitung "Voraussetzungen" verlangt "`npm run leitstand` läuft (Port 4173) … Codex CLI ist in der ausführenden Umgebung angemeldet", nennt aber keinen Weg zu prüfen, GEGEN welches Projekt (`startvorlagen/<name>.json`) diese Instanz tatsächlich läuft — real geprüft über `kontrollzustand/.leitstand.lock` (PID/Port) plus `projekte.json` (Zuordnung `repo_pfad` → `startvorlage_pfad`) plus die Prozess-Kommandozeile (`node scripts/leitstand-server.mjs`, keine sichtbare `LEITSTAND_STARTVORLAGE_PFAD`-Umgebungsvariable in der Prozessliste). Ohne diese Schritte explizit im Dokument bleibt unklar, ob eine laufende Instanz tatsächlich gegen `startvorlagen/ai-workforce.json` (mit Codex-Worker-Block) läuft oder gegen den Default `startvorlagen/beispielprojekt.json` (ohne Codex).
Fundstelle: `features/F39/nachweis-ws3-reallauf.md` (Abschnitt "Voraussetzungen"); `scripts/leitstand-server.mjs` (`STANDARD_STARTVORLAGE_PFAD`, `LEITSTAND_STARTVORLAGE_PFAD`); `projekte.json`.
Auswirkung: Gering bis mittel — ein Reallauf könnte unbemerkt gegen die falsche Startvorlage laufen (z. B. ohne Codex-Worker-Block), was erst beim ersten `codex`-Schritt real auffiele, nicht vorher.
Maßnahme: Ablaufanleitung um einen expliziten Prüfschritt ergänzen: `kontrollzustand/.leitstand.lock` lesen (PID/Port), zugehörigen Prozess über die PID auf seine tatsächliche Startvorlage zurückführen (`projekte.json`-Zuordnung über `repo_pfad`), `LEITSTAND_STARTVORLAGE_PFAD` als möglichen Override nennen.
Feature/Run: F39-WS-3b-Vorbereitung, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-637** · `BUG` · P2 · offen
Titel: Über den Coach angelegte Aufträge haben im Leitstand keinen „Routen"-Knopf; „Starten" im Bereich „Auftrag & Start" ist ein anderer Pfad (Einzellauf, `POST /api/laeufe`, kein Router/Workflow).
Beschreibung: F39-WS-3b-Vorbereitung/-Reallauf (23.09.2026): geprüft, ob dieselbe UI-Lücke bereits als Finding erfasst ist — nicht gefunden (weder unter diesem Titel noch als Verweis auf `routeAuftrag`/`views/projekt.js`). `routeAuftrag()` (`public/leitstand/api.js`) wird UI-seitig ausschließlich aus `views/workboard.js` (Finding-Bearbeitung) und `views/capabilities.js` (Capability-Gap) ausgelöst — beide für einen anderen Auftrags-Ursprung gebaut. Ein über die Chat-Brücke (Sparring/Coach, „Als Auftrag anlegen") angelegter Auftrag hat dort keinen Einstiegspunkt; der Bereich „Auftrag & Start" (`views/projekt.js`, h2 „Auftrag & Start") trägt zwar einen Button „Starten", der löst aber `POST /api/laeufe` aus — einen einzelnen Ad-hoc-Lauf ohne Router/Workflow, ohne `hoch.json`-Kette, ohne die deterministische Kontrolltiefe-Untergrenze (`bestimmeEffektiveKontrolltiefe`). Im realen F39-WS-3b-Reallauf musste der Router-Aufruf deshalb per Browser-DevTools-Konsole (`fetch('/api/auftraege/<id>/routen', {method:'POST'})`) manuell ausgelöst werden.
Fundstelle: `public\leitstand\api.js` (`routeAuftrag`); `public\leitstand\views\workboard.js`; `public\leitstand\views\capabilities.js`; `public\leitstand\views\projekt.js` (Bereich „Auftrag & Start", `POST /api/laeufe`); `features/F39/nachweis-ws3-reallauf.md` (Schritt 3, dort als "bekannte UI-Lücke, kein neues Finding" vermerkt — dieses Finding trägt sie jetzt nach).
Auswirkung: Mittel — ein über den Coach angelegter Auftrag lässt sich ohne Entwicklerwerkzeuge (Browser-Konsole) nicht regulär routen; das Risiko einer Verwechslung mit „Starten" (Einzellauf statt geführter Workflow, andere Kontrolltiefe) ist real, wie im F39-WS-3b-Reallauf beobachtet.
Maßnahme: Einen „Routen"-Knopf für Chat-Brücken-Aufträge in `views/projekt.js` (Bereich „Auftrag & Start") ergänzen, der `routeAuftrag()` aufruft — klar unterschieden vom bestehenden „Starten"-Knopf (Einzellauf). Nicht Teil dieses Findings selbst (nur erfasst, nicht behoben).
Feature/Run: F39-WS-3b-Vorbereitung/-Reallauf, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-640** · `BUG` · P3 · offen
Titel: `schemas/ergebnis-scout.schema.json` — `kandidaten[].lizenz` ist unter `properties` gelistet, fehlt aber in `required` (dieselbe Fehlerklasse wie F-638, hier real folgenlos).
Beschreibung: Real gefunden durch den neuen F-639-Gate-Check (`scripts/check-fix-f639-schema-strict-modus.mjs`) bei dessen erstem Lauf, VOR dem Filtern auf codex-fähige Rollen: `schemas/ergebnis-scout.schema.json:22` listet zehn Pflichtfelder in `required`, `lizenz` (Zeile 50, "Optional — Lizenz des Kandidaten, falls ermittelbar") fehlt darin — dieselbe Verletzung des Strict-Modus-Dialekts wie bei F-638 (jede `properties`-Eigenschaft muss in `required` stehen, optionale Felder werden über `null` statt Weglassen modelliert). Folgenlos GEBLIEBEN, weil `ROLLENVERTRAEGE.scout.erlaubte_worker` NUR `['claude-code']` ist (`src/rollen/index.ts`) — die Rolle `scout` läuft strukturell nie über Codex' `--output-schema`, der Strict-Modus-Zwang greift hier nie real. Der handgeschriebene Validator (`src/scout/index.ts`, `KANDIDAT_PFLICHTFELDER`) und der TS-Typ (`src/scout/types.ts`, `lizenz?: string`) behandeln `lizenz` bewusst als echt optional (weglassbar, nicht nur nullable) — eine Änderung auf "required + nullable" verlangt denselben dreigleisigen Umbau wie bei F-638 (Schema + Validator + Typ + Beispiele + Tests), nicht nur eine Schema-Zeile.
Fundstelle: `schemas/ergebnis-scout.schema.json:22,50`; `src/scout/index.ts:23-24,79` (`KANDIDAT_FELDER`/`KANDIDAT_PFLICHTFELDER`, `lizenz`-Prüfung); `src/scout/types.ts:25` (`lizenz?: string`).
Auswirkung: Gering, solange `scout` nicht auf `codex` läuft (aktuell strukturell ausgeschlossen) — würde `erlaubte_worker` für `scout` je um `codex` erweitert, träte dieselbe Fehlerklasse wie F-638 real auf.
Maßnahme: Eigener Fix-Zyklus (nicht Teil von fix/f638-architekt-schema-strict, bewusst nicht mitgezogen — Umfang vergleichbar mit F-638 selbst): `lizenz` in `schemas/ergebnis-scout.schema.json` in `required` aufnehmen, Typ auf `["string","null"]` umstellen; `src/scout/index.ts` (`KANDIDAT_PFLICHTFELDER`, Validierung akzeptiert `null`) und `src/scout/types.ts` (`lizenz: string | null`) sowie Beispiele/Tests nachziehen.
Feature/Run: F39-WS-3b-Reallauf (Nebenfund über check-fix-f639-schema-strict-modus.mjs), 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-644** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: `features/F39/nachweis-ws3-reallauf.md` und die Wahl des Testauftrags unterscheiden nicht zwischen Projektmodus (nur Dokumentation) und Featuremodus — der reale Reallauf testete den `ausfuehrung`-Schritt deshalb nie mit echtem Produktcode.
Beschreibung: F39-WS-3b-Reallauf, Versuch 2 (23.09.2026): der Testauftrag F-631 wurde über den Coach-Projektmodus eingebracht (`herkunft.art: 'projekt_interview'`, wie von der Ablaufanleitung vorgegeben, um die `hoch`-Untergrenze zu testen). `baueAuftragAusProjektentwurf` (`src/product-coach/index.ts:700`) schreibt JEDEM so erzeugten Auftrag hart den Abschnitt „Schreibe AUSSCHLIESSLICH Dokumentation, KEIN Produktcode" vor — strukturell, unabhängig vom Themeninhalt. Der reale `ausfuehrung`-Schritt schrieb deshalb nur Doku (ADR/Roadmap/Feature-Datei), NIE echten Code — der zweite Kernprüfpunkt der Ablaufanleitung („wurden real Existenzprüfung/Tests implementiert") ließ sich mit DIESER Auftragswahl nie real belegen, unabhängig vom F-638/F-639/F-641/F-642-Fix.
Fundstelle: `features/F39/nachweis-ws3-reallauf.md` (nennt die Projekt/Feature-Unterscheidung nicht als Auswahlkriterium für den Testauftrag); `src/product-coach/index.ts:700` (`baueAuftragAusProjektentwurf`, harte Doku-only-Vorgabe).
Auswirkung: Gering bis mittel — kein Korrektheitsfehler, aber ein blinder Fleck im Reallauf-Nachweis: die Qualität des `ausfuehrung`-Schritts bei echtem Produktcode (nicht nur Doku) blieb ungeprüft.
Maßnahme: Ablaufanleitung ergänzen: ein Testauftrag über den Coach-FEATUREmodus (nicht Projektmodus) wählen, wenn der `ausfuehrung`-Schritt mit echtem Produktcode geprüft werden soll — oder explizit dokumentieren, dass Projektmodus-Aufträge diesen Prüfpunkt strukturell nie abdecken können.
Feature/Run: F39-WS-3b-Reallauf, Versuch 2, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-645** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: `code-reviewer` läuft strukturell in einer schreibgeschützten Codex-Sandbox und kann die Testsuite deshalb nie selbst ausführen — er urteilt nur statisch über den Diff.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3 (23.09.2026), Lauf `6319443a-8309-4bd1-aff4-91ec60756224` (`schritt-2-review`): der Reviewer reproduzierte den gemeldeten Randfall (Sonderzeichen in `auftragId` → HTTP 500) über einen direkten PowerShell-Request an den laufenden Handler, vermerkte in `empfehlung` aber ausdrücklich: „Die vollständige Testsuite wurde wegen des schreibgeschützten Arbeitsbereichs nicht ausgeführt." Ursache liegt strukturell in `src/codex-gateway/index.ts:124-125` — jeder Codex-Aufruf trägt fest `--sandbox read-only` (Kommentar Zeile 303: „Codex-Lauf ist strukturell lesend"), unabhängig vom Auftragsinhalt der Rolle. Die Laufakte bestätigt `berechtigungskontext: 'codex-sandbox-read-only'`. Kein Einzelfall dieses Laufs: JEDER `code-reviewer`-Lauf (Worker `codex`, `werkzeugsatz: 'lesend'` in allen drei `workflow-vorlagen/*.json`) ist strukturell auf diese Weise eingeschränkt.
Fundstelle: `src/codex-gateway/index.ts:69-125,303`; Laufakte `laufakte-6319443a-8309-4bd1-aff4-91ec60756224` (`berechtigungskontext`); Rohstrom `kontrollzustand-roh\6319443a-8309-4bd1-aff4-91ec60756224\rohstrom.json` (`empfehlung`-Feld der Modellantwort).
Auswirkung: Mittel — der automatische Review-Schritt kann echte Laufzeit-/Testsuite-Regressionen (z. B. `npm run check`-Fehlschläge, die der Diff selbst nicht zeigt) strukturell nie selbst aufdecken, nur was am Diff und über einzelne, selbst konstruierte Requests gegen einen bereits laufenden Server beobachtbar ist. Kein Korrektheitsfehler des aktuellen Verhaltens — Grenze ist bewusst (read-only = kein Schreibzugriff des Reviewers), aber nirgends für den Menschen sichtbar dokumentiert.
Maßnahme: Prüfen, ob der Reviewer-Auftragstext (`src/rollen/index.ts` bzw. die Rolleninstruktion des `code-reviewer`) diese Grenze explizit benennt, damit das Modell sein Urteil erkennbar als „statisch, Testsuite nicht selbst geprüft" einordnet, statt es implizit in der Fließtext-Empfehlung zu erwähnen — oder alternativ dokumentieren, dass `npm run check` weiterhin ausschließlich Sache des Menschen/der `ausfuehrung`-Rolle vor der Freigabe bleibt.
Feature/Run: F39-WS-3b-Reallauf, Versuch 3, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-646** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Ein Prozessbaum-Timeout-Test schlägt im vollen `npm run check`-Lauf einmalig fehl und läuft isoliert grün — Verdacht auf dasselbe Zeitfenster-/Ressourcenmuster wie F-590.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3 (23.09.2026): `npm run check` auf `test/f39-versuch3` meldete 728/729 grün, ein Fehlschlag in `src\claude-code-gateway\claude-code-gateway.test.ts:941` („starteProzess killt bei TIMEOUT unter Windows den kompletten Prozessbaum, kein Waisenprozess übrig", F14 WS-2 AK4): `ENOENT` beim Lesen einer erwarteten Marker-Datei (`...\Temp\f14-ws2-enkel-pid-....txt`) — das Kind/Enkel-Prozess-Signal kam nicht rechtzeitig oder gar nicht an. Derselbe Test lief isoliert (`node --test --test-name-pattern=...`) sofort danach grün durch. Kein Bezug zum eigentlichen Diff dieses Reallaufs (`scripts/leitstand-server.mjs`, `scripts/leitstand/routen-sparring.mjs`, `scripts/check-f34-product-coach.mjs`) — der Test prüft reines Prozess-Timeout-/Kill-Verhalten, unabhängig vom Sparring-Auftrag-Feature. Nicht selbst tiefer untersucht (Auftragsgrenze: nur beobachten, nichts reparieren).
Fundstelle: `src\claude-code-gateway\claude-code-gateway.test.ts:941` (Testname „starteProzess killt bei TIMEOUT..."); `npm run check`-Log dieses Laufs (23.09.2026, ~17:0x Uhr); `CLAUDE.md` Abschnitt „Bekannte Fallen" (Muster „Test-/Gate-Lauf scheitert einmalig ohne erkennbaren Grund").
Auswirkung: Gering bis mittel — falls real dasselbe Muster wie F-590 (Windows-Timing/Ressourcen-Flakiness bei Kind-Prozess-Aufräumung), betrifft es potenziell jeden `npm run check`-Lauf unter Last, nicht nur diesen. Bislang nur EIN Beobachtungspunkt (CLAUDE.md verlangt zwei, bevor daraus ein bestätigtes Muster wird) — als Verdacht, nicht als bestätigten Befund einordnen.
Maßnahme: Beim nächsten Auftreten Uhrzeit und Umgebungszustand (laufende Cloud-Syncs, Systemlast) festhalten (CLAUDE.md-Vorgabe); bei zweitem Auftreten prüfen, ob `starteProzess`/die Marker-Datei-Erzeugung im Test dieselbe Fehlerklasse wie F-590 (EPERM/EBUSY/ENOTEMPTY bei zeitkritischer Dateisystem-Interaktion unter Windows) trägt, dann denselben Retry-/Toleranz-Mechanismus prüfen.
Feature/Run: F39-WS-3b-Reallauf, Versuch 3, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-647** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Die Korrekturschleife („Anpassung anfordern") kollidiert mit der Sauberkeits-Vorbedingung E-F39-1 — die Ergebnisse von Iteration 1 blockieren den Start von Iteration 2.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3 (23.09.2026): Stefan wählte in der Abnahme von Workflow `router-a0d04470-d4eb-4204-aec4-ad3ee21e2b91` „Anpassung anfordern" (Reviewer-Befund: `auftragId` mit „/" → HTTP 500 statt 400). Der Leitstand setzte `schritt-1-ausfuehrung` korrekt auf `OFFEN` zurück und verlangte eine neue Freigabe (F23-Abnahme-Mechanismus, kein neuer Workflow) — beim Versuch, diese zweite Iteration zu starten, griff die E-F39-1-Vorbedingung (F-643, `src/ausfuehrung-vorbedingung/index.ts`) und lehnte ab: der Arbeitsbaum war nicht sauber, weil die fünf Dateien der ERSTEN Iteration (`scripts/leitstand-server.mjs`, `scripts/leitstand/routen-sparring.mjs`, `scripts/check-f34-product-coach.mjs`, `state/findings.md`, `features/F39/nachweis-ws3-reallauf-messung.md`) noch uncommittet im Arbeitsbaum standen. Die Vorbedingung selbst arbeitet korrekt (verhindert genau das, wofür sie gebaut wurde, F-643) — sie unterscheidet aber nicht zwischen „fremde, unbekannte Änderungen liegen im Weg" und „die eigenen Ergebnisse des Vorgängerschritts DESSELBEN Workflows liegen im Weg", die für die Korrekturschleife selbst notwendige Eingabe sind.
Fundstelle: `src/ausfuehrung-vorbedingung/index.ts` (`pruefeAusfuehrungsVorbedingung`, Sauberkeits-Prüfung ohne Bezug zum auslösenden Workflow); Workflow `router-a0d04470-d4eb-4204-aec4-ad3ee21e2b91`, zweiter Freigabeversuch für `schritt-1-ausfuehrung` nach `ANPASSUNG_ANGEFORDERT`.
Auswirkung: Mittel — jede Korrekturschleife nach „Anpassung anfordern" trifft real auf diese Blockade, sobald `ausfuehrung` in Iteration 1 tatsächlich Dateien geändert hat (der Regelfall). Ohne manuellen Zwischenschritt (Iteration 1 committen) bleibt die Korrekturschleife strukturell blockiert — ein Widerspruch zum eigentlichen Zweck der Abnahme-Funktion (F23).
Maßnahme (später): entweder die Sperrmeldung um einen konkreten nächsten Schritt ergänzen („Iteration committen, dann erneut freigeben"), oder `pruefeAusfuehrungsVorbedingung` so erweitern, dass uncommittete Änderungen, die nachweislich aus einem vorherigen Schritt DESSELBEN Workflows stammen, die Vorbedingung nicht blockieren.
Feature/Run: F39-WS-3b-Reallauf, Versuch 3, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.
**F-649** · `BUG` · P2 · offen
Titel: `ausfuehrung` hat kein Urteils-Gate — eine erkennbare Selbstblockade („Blockiert", Rückfrage an den Menschen) führt trotzdem zu `ERFOLGREICH` statt `haltKlaerung`.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3b (23.09.2026), Lauf `e1c59219-615f-4f20-8737-8b9a99b4ff5c` (`schritt-1-ausfuehrung`, Iteration 2): die Antwort endet — CLAUDE.md-Status-Format folgend — mit „## Status\n- [ ] Freigegeben\n- [ ] Freigegeben mit Hinweisen\n- [ ] Nicht freigegeben\n- [x] Blockiert — keine neue Änderung nötig, da Feature bereits implementiert und getestet vorliegt; Rückfrage an Stefan, wie mit dieser Dopplung umzugehen ist." und einer expliziten Rückfrage im Fließtext. Der Automat (`ermittleNaechstenSchritt`, `src/workflow/index.ts`) kennt für `rolle === 'ausfuehrung'` KEINE Regel, die ein solches Signal abfängt — anders als `architecture-advisor` (Regel 1d, F-641) oder `code-reviewer` (Regel 1b, `output_schema: 'ergebnis-code-reviewer'`) trägt `ausfuehrung` `output_schema: null` UND hat keine eigene Textprüfung. Der Schritt zählt deshalb strukturell als `ERFOLGREICH`, der Automat läuft automatisch zu `schritt-2-review` weiter, obwohl die Rolle selbst explizit signalisiert hat, dass sie unsicher ist, was zu tun ist.
Fundstelle: `src/workflow/index.ts` (`ermittleNaechstenSchritt`, Regeln 1b/1c/1d — keine äquivalente Regel für `rolle === 'ausfuehrung'`); `kontrollzustand-roh\e1c59219-615f-4f20-8737-8b9a99b4ff5c\rohstrom.json` (`result`-Feld, Status-Block wörtlich).
Auswirkung: Mittel bis hoch — jede `ausfuehrung`, die sich selbst als „Blockiert" einstuft (Auftrag unklar, Widerspruch erkannt, wie hier: Dopplung/Unsicherheit), wird vom Automaten wie ein normaler Erfolg behandelt. Verschärft F-648: selbst mit besserer Instruktion (Fix P1) bleibt ein Modell, das trotzdem „Blockiert" antwortet, ohne Wirkung auf den Workflow-Status.
Maßnahme: Minimales Urteils-Gate analog Regel 1d (F-641): `leseSelbstblockadeAusAusfuehrungstext` liest den CLAUDE.md-Status-Block auf eine angekreuzte „Blockiert"-Zeile; neue Regel 1e hält `haltKlaerung`, wenn sie erkannt wird — kein Rückschluss auf INHALTLICHE Richtigkeit, nur auf das erkennbare Signal, dieselbe Vorsicht wie bei Regel 1d. Umgesetzt in diesem Fix (siehe Commit dieses Branches, `src/korrekturschleife/index.ts`, `src/workflow/index.ts`).
Feature/Run: fix/f39-korrekturschleife, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-650** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Die Review-Tiefe schwankt unbegründet zwischen Iterationen desselben Workflows — Iteration 1 testete aktiv gegen den laufenden Handler, Iteration 2 las nur noch den (unveränderten) Quelltext.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3 vs. 3b (23.09.2026), Workflow `router-a0d04470-d4eb-4204-aec4-ad3ee21e2b91`: Review-Lauf `6319443a-…` (Iteration 1) reproduzierte den gemeldeten Randfall über einen eigenen PowerShell-Request gegen den laufenden Leitstand-Handler (`kontrollzustand-roh\6319443a-…\rohstrom.json`, `command_execution`-Einträge) und fand dabei real den 500-statt-400-Fehler. Review-Lauf `ba7bd1c5-…` (Iteration 2, identischer Werkzeugsatz/Worker/Modell, `codex`/`gpt-6-astra`) führte NUR `node --check` (Syntaxprüfung) auf den drei geänderten Dateien aus und begründete das Fehlen weiterer Prüfung mit „Integrationstests legen Dateien an und lassen sich unter dem vorgegebenen Nur-Lese-Zugriff nicht ausführen" (Zitat, `item_5`) — beide Läufe hatten denselben, strukturell IMMER schreibgeschützten Sandbox-Zugriff (`--sandbox read-only`, F-645), der aktive HTTP-Request in Iteration 1 war also nie durch mehr Rechte gedeckt, nur durch eine andere MODELL-Entscheidung, wie tief geprüft wird. Kein Mechanismus erzwingt eine bestimmte Prüftiefe oder macht sie zwischen Iterationen vergleichbar.
Fundstelle: `kontrollzustand-roh\6319443a-8309-4bd1-aff4-91ec60756224\rohstrom.json` (aktive `command_execution`-Reproduktion); `kontrollzustand-roh\ba7bd1c5-2242-43ef-939f-0660ed0eef4e\rohstrom.json` (nur `node --check`, keine Reproduktion); `src/rollen/index.ts` bzw. die Rolleninstruktion des `code-reviewer` (keine Vorgabe zur Mindestprüftiefe).
Auswirkung: Mittel — die Qualität eines automatischen Review-Schritts ist dadurch nicht verlässlich reproduzierbar; derselbe Fehler kann in einer Iteration gefunden und in der nächsten übersehen werden, ohne dass sich an Rechten oder Auftrag etwas geändert hat (siehe F-648: hier zusätzlich verschärft, weil Iteration 2 auch keinen Hinweis auf den Vorbefund hatte).
Maßnahme: Prüfen, ob die `code-reviewer`-Rolleninstruktion eine Mindestprüftiefe vorschreiben sollte (z. B. „bei einer Korrekturschleife: aktiv gegen den Befund testen, nicht nur lesen"), oder ob F-648s Fix (Befunde der Vorfassung explizit in der Instruktion) diese Schwankung bereits ausreichend eindämmt — dafür bräuchte es einen weiteren realen Durchlauf als Beleg, hier nicht mehr Teil dieses Fixes.
**Weiterer Beleg (Versuch 3c, 23.09.2026):** Review-Lauf `885d5358-ade7-4c18-a662-5f3ad2a628e7` (nach der F-648-Fix-Instruktion, `vorherigeBefunde` diesmal leer, da das referenzierte Vorgänger-Review `ba7bd1c5-…` selbst keine strukturierten Befunde trug) bestätigt den ursprünglichen F-648-Vorbefund (500→400 bei Sonderzeichen in `auftragId`) NICHT einzeln/ausdrücklich — `urteil: BEREIT`, `befunde: []`, die `empfehlung` nennt nur allgemein bestandene Syntax-/`git diff --check`-Prüfungen, ohne den ursprünglich gemeldeten Fall namentlich zu re-verifizieren. Bestätigt die Grundannahme dieses Findings: selbst mit Kontext (Befunde der Vorfassung, wo vorhanden) bleibt die Prüftiefe von Lauf zu Lauf unterschiedlich.
Maßnahme (ergänzt): Die Korrektur-Instruktion für `code-reviewer` soll pro Vorbefund ein ausdrückliches „behoben / nicht behoben" verlangen (nicht nur eine allgemeine Bewertung) — das kommt in den Bauauftrag für den Check-Schritt aus F-652 oder in F35.
Feature/Run: fix/f39-korrekturschleife, 23.09.2026; Beleg ergänzt Versuch 3c, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-651** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Der Prompt von `claude-code`-Läufen (stdin) wird nicht gespeichert — was eine Rolle real gesehen hat, ist im Nachhinein nicht nachweisbar.
Beschreibung: F39-WS-3b-Reallauf, Schritt-0-Beleg für F-648 (23.09.2026): für einen `codex`-Lauf steht der vollständige, real gesendete Prompt als letztes Element von `tokens` in `kontrollzustand-roh\<laufId>\rohstrom.json` (real genutzt, um F-648 wörtlich zu belegen, Lauf `ba7bd1c5-2242-43ef-939f-0660ed0eef4e`). Für einen `claude-code`-Lauf (Worker der Rollen `ausfuehrung`/`architecture-advisor`) fehlt dieses Feld — der Prompt geht über `stdin` an den Prozess (`src/claude-code-gateway/prozessstart.ts`), `rohstrom.json` trägt nur `werkzeugStartziel`/`stdout`/`stderr`/`exitCode`/`startfehler`/`beendigungsart`/`ergebnisZeileVorProzessende`, real geprüft an Lauf `e1c59219-615f-4f20-8737-8b9a99b4ff5c`. Der Schritt-0-Beleg für `ausfuehrung` musste deshalb aus dem Code-Pfad (`loeseSchrittEingabenAuf`) und dem separat gespeicherten Artefakt-Inhalt REKONSTRUIERT werden, statt den tatsächlich gesendeten Prompt wörtlich zu zitieren — ein Unterschied, der bei jeder künftigen Nachvollziehbarkeits-Frage zu `claude-code`-Läufen erneut auftritt.
Fundstelle: `kontrollzustand-roh\e1c59219-615f-4f20-8737-8b9a99b4ff5c\rohstrom.json` (kein Prompt-Feld); `kontrollzustand-roh\ba7bd1c5-2242-43ef-939f-0660ed0eef4e\rohstrom.json` (`tokens[3]`, Prompt vollständig vorhanden, Muster für den Vergleich); `src/claude-code-gateway/prozessstart.ts` (stdin-Übergabe ohne Persistierung).
Auswirkung: Mittel — betrifft jede Nachvollziehbarkeits-/Debugging-Frage zu einem `claude-code`-Lauf (aktuell `ausfuehrung`, `architecture-advisor`, `jarvis` mit diesem Worker): ohne den realen Prompt bleibt offen, ob ein unerwartetes Ergebnis an der Instruktion oder am Modell lag — bei `codex` ist das lückenlos rekonstruierbar, bei `claude-code` nicht.
Maßnahme: Den an `claude-code` über stdin gesendeten Prompt im Laufordner persistieren (Muster `codex`: als Teil von `rohstrom.json` oder als eigenes Feld/Datei) — symmetrisch zur bestehenden Aufzeichnung für `codex`, kein neuer Speicherort nötig.
Feature/Run: F39-WS-3b-Reallauf, Schritt-0-Beleg, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-652** · `BUG` · P1 · in Umsetzung
Titel: Keine Rolle der Workflow-Kette führt die Tests real aus — `ausfuehrung` hat kein Shell-Werkzeug, `code-reviewer` ist strukturell nur lesend; Code-Läufe blockieren deshalb oder melden „fertig", ohne dass irgendetwas verifiziert wurde.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3c (23.09.2026), Lauf `29e2be19-d3c8-4f81-8b93-1fa9fdb63132` (`schritt-1-ausfuehrung`): die Rolle baute real einen inhaltlich korrekten Fix (`scripts/leitstand-server.mjs`, `scripts/check-f34-product-coach.mjs`, per `git diff` bestätigt, `npm run check` real grün, 742/742), meldete sich aber selbst als „Blockiert", weil sie „kein Shell-Werkzeug … habe, um `npm run check:template`/`node scripts/check-f34-product-coach.mjs` selbst laufen zu lassen" (Zitat, `result`-Feld). Das ist real und zutreffend — `ausfuehrung` hat laut Werkzeugsatz `schreibend` (`startvorlagen/ai-workforce.json`) Write/Edit, aber keinen Bash-Zugriff in dieser Konfiguration. `code-reviewer` (Rolle im selben Workflow) ist strukturell IMMER `werkzeugsatz: 'lesend'`/`--sandbox read-only` (F-645) — kann selbst bei Willen keine Testsuite ausführen, sondern höchstens einzelne `node --check`/eigene HTTP-Requests improvisieren (real beobachtet: mal aktiv, Versuch 3, mal gar nicht, Versuch 3b — F-650). Ergebnis: in der gesamten Kette (`architekt` → `architecture-advisor` → `ausfuehrung` → `code-reviewer`, bzw. hier `ausfuehrung` → `code-reviewer`) führt STRUKTURELL KEINE Rolle `npm run check` real aus — ein Workflow endet entweder mit einer (hier: berechtigten, aber vermeidbaren) Selbstblockade, oder mit `urteil: BEREIT`/`ABGESCHLOSSEN`, ohne dass die Testsuite je real lief (Versuch 3b, F-648: `urteil BEREIT` bei unverändertem, fehlerhaftem Code).
Fundstelle: `kontrollzustand-roh\29e2be19-d3c8-4f81-8b93-1fa9fdb63132\rohstrom.json` (`result`-Feld, „kein Shell-Werkzeug … verfügbar"); `src/codex-gateway/index.ts:124-125` (`--sandbox read-only` fest für jeden Codex-Lauf, F-645); `startvorlagen/ai-workforce.json` (`werkzeugsaetze.schreibend` ohne Bash-Werkzeug für `ausfuehrung`); `workflow-vorlagen/standard.json`/`hoch.json` (kein dedizierter Test-/Check-Schritt in der Kette).
Auswirkung: Hoch — die zentrale Qualitätssicherung dieses Systems (`npm run check`, CLAUDE.md Definition of Done) ist strukturell NIE Teil eines automatisierten Workflow-Durchlaufs; sie hängt vollständig davon ab, dass ENTWEDER ein Mensch sie manuell nachholt (wie in diesem Versuch angefordert) ODER `code-reviewer` sie zufällig freiwillig improvisiert (F-650, unzuverlässig). Ein Workflow kann dadurch — wie real in Versuch 3b geschehen — mit kaputtem Code `ABGESCHLOSSEN` enden.
Maßnahme (Empfehlung, noch nicht gebaut): ein deterministischer, vom SYSTEM (nicht von einer KI-Rolle) ausgeführter Check-Schritt nach `ausfuehrung` — `npm run check` real auf dem Arbeits-Branch laufen lassen, das Ergebnis (Exit-Code, Kurzfassung/Log-Ausschnitt) als eigenes Artefakt registrieren und dem nachfolgenden `code-reviewer`-Schritt als Eingabe reichen (Muster `aenderungsuebersicht-@`). Damit entfällt die Abhängigkeit von Werkzeugzugriff/Willkür einer Rolle — die Prüfung selbst wird Teil des Automaten, nicht des Modell-Ermessens.
Status: in Umsetzung (24.09.2026, Branch `fix/f652-pruefschritt`) — startvorlagen-Feld `pruefbefehl`/`pruefZeitgrenzeMs` (`src/startvorlage/`), Prüfschritt-Modul `src/pruefschritt/` (führt den Befehl über die bestehende, real getestete Prozessstart-/Kill-Logik aus `src/claude-code-gateway/prozessstart.ts` aus, Umgebung ohne `LEITSTAND_*`), Kern-Nachbereitung in `starteLaufUndVergiss` (`scripts/leitstand-server.mjs`) registriert `pruefergebnis-<laufId>` NACH der Änderungsübersicht und hält D13 (`laufAktiv`) bis Prüfungsende, neue Regel 1f in `ermittleNaechstenSchritt` (`src/workflow/index.ts`) hält den Workflow bei ROT/ZEITGRENZE/FEHLER auf `KLAERUNG_ERFORDERLICH` statt zum Review fortzusetzen, Eingabe-Platzhalter `pruefergebnis-@<schrittId>` (verallgemeinerte, gemeinsame Auflösung mit `aenderungsuebersicht-@`), `workflow-vorlagen/standard.json`/`hoch.json` geben ihn dem Review-Schritt mit, `startvorlagen/ai-workforce.json` trägt einen realen `pruefbefehl` (`node` + `npm-cli.js run check`, da `npm` unter Windows eine `.cmd`-Datei ist). Getestet: `src/pruefschritt/pruefschritt.test.ts` (GRUEN/ROT/ZEITGRENZE mit realem Prozess-Kill-Beleg/FEHLER/Env-Filterung), `src/workflow/workflow.test.ts` (Regel 1f), `scripts/check-f652-pruefschritt.mjs` (echter HTTP-Dispatch: grün/rot/Zeitgrenze/kein-pruefbefehl/lesender-Lauf/D13/Projektion), Render-Nachweis `features/F39/nachweis-f652-ui/`. `npm run check` real grün (767/767). Restlich offen: Reallauf-Bestätigung über einen echten Claude-Code-Kindprozess (bisher nur Attrappen) steht noch aus.
Feature/Run: F39-WS-3b-Reallauf, Versuch 3c, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-653** · `TECH_DEBT` · P2 · offen
Titel: Übersteuerung einer Selbstblockade per Ersatzfassung hinterlässt kein Entscheidungsartefakt.
Beschreibung: F39-WS-3b-Reallauf, Versuch 3c (23.09.2026): Stefan übersteuerte die Regel-1e-Selbstblockade von Workflow `router-a0d04470-d4eb-4204-aec4-ad3ee21e2b91` (Lauf `29e2be19-…`, „Blockiert — kann `npm run check` nicht ausführen"), nachdem `npm run check` von Hand grün lief (742/742). Weg dafür war real nur die „korrigierte Fassung" (`POST /api/workflows`, erlaubt weil `KLAERUNG_ERFORDERLICH` in `ERSETZBARE_STATUS_TEXT` steht, `scripts/leitstand-server.mjs:1585/4936`) — `status`/`aktiver_schritt_id` wurden manuell auf `OFFEN`/`schritt-2-review` gesetzt, `grund` auf einen frei formulierten Freitext. Diese Übersteuerung ist NICHT als eigenständiges Kernartefakt/Entscheidung erfasst (anders als Freigabe/Stopp/Abnahme, die je ein `entscheidung-workflow-…`-Artefakt mit `art`/`begruendung`/`entschieden_am` registrieren, `scripts/leitstand-server.mjs` Zeile ~6475/6959) — sie steckt nur als Fließtext im `grund`-Feld der neuen `WORKFLOW_V0`-Version selbst, ohne Schema-Pflichtfelder, ohne erzwungene Begründung, ohne einheitlichen `art`-Wert zum Wiederfinden.
Fundstelle: `scripts/leitstand-server.mjs:4936-4950` (POST /api/workflows, „korrigierte Fassung"-Pfad ohne eigenes Entscheidungsartefakt); zum Vergleich `scripts/leitstand-server.mjs:6475` (Freigabe) und `:6959` (Abnahme), die je ein dediziertes `entscheidung-workflow-…`-Artefakt schreiben; die real eingereichte Fassung dieses Versuchs (`versionSequenz 18`, `grund`-Feld trägt die Übersteuerungs-Begründung als einzigen Beleg).
Auswirkung: Gering bis mittel — die Übersteuerung ist zwar sichtbar (im `grund`-Text), aber nicht strukturiert auffindbar/auswertbar (kein `entscheidung-workflow-…`-Artefakt, keine Pflichtbegründung, kein Zeitstempel-Feld außerhalb von Freitext) — anders als bei Freigabe/Abnahme/Stopp lässt sich „wer hat wann warum eine Selbstblockade übersteuert" nicht gezielt abfragen.
Maßnahme: Das erledigt sich weitgehend mit dem Check-Schritt aus F-652 (ein deterministischer, systemgeführter Test-Lauf nach `ausfuehrung` macht die meisten Selbstblockaden wegen fehlender Testausführung überflüssig — es bliebe nur noch der Fall inhaltlich begründeter Blockaden). Sonst: ein eigener Pfad „Klärung auflösen" mit Pflichtbegründung (eigenes Entscheidungsartefakt, Muster Freigabe/Abnahme/Stopp) statt der zweckentfremdeten „korrigierten Fassung".
Feature/Run: F39-WS-3b-Reallauf, Versuch 3c, 23.09.2026. Quelle: claude/f39-ws3b-reallauf.

**F-657** · `BUG` · P3 · offen
Titel: Sichtbarkeit des Knopfs „Prüfung wiederholen" unterscheidet einen Regel-1f-Halt nicht von einem gleichzeitigen Regel-1e-Halt (Selbstblockade) am selben Schritt.
Beschreibung: Entdeckt beim Render-Nachweis zu F-656 (24.09.2026). Die UI-Sichtbarkeitsbedingung (`workflowStatus === 'KLAERUNG_ERFORDERLICH' && projektion.ergebnis !== 'GRUEN'`) prüft nur, ob ein Prüfergebnis ungleich GRUEN vorliegt — nicht, ob Regel 1e (`ausfuehrungSelbstblockiert`, in `ermittleNaechstenSchritt` VOR Regel 1f geprüft) am selben Ausführungsschritt zusätzlich gegriffen hat. Träfen beide Bedingungen gleichzeitig zu (Schritt meldet sich selbst als „Blockiert" UND die deterministische Prüfung meldet ROT/ZEITGRENZE/FEHLER), hätte tatsächlich Regel 1e den persistierten Halt-Grund gesetzt — der Knopf würde trotzdem angezeigt. Die serverseitige Vorbedingung von `POST .../pruefung-wiederholen` (`scripts/leitstand-server.mjs`) prüft strukturell dieselben drei Felder (`rolle: 'ausfuehrung'`, `status: 'ERFOLGREICH'`, Prüfergebnis ≠ GRUEN) und lehnt den Fall deshalb NICHT ab — sie ist bewusst genau nach dieser Spezifikation gebaut (F-656-Bauauftrag), kennt Regel 1e also ebenfalls nicht.
Fundstelle: `public/leitstand/views/workflows.js` (`renderPruefergebnis`, Sichtbarkeitsbedingung des Knopfs); `scripts/leitstand-server.mjs` (Vorbedingung von `POST /api/workflows/<id>/pruefung-wiederholen`); `src/workflow/index.ts` (Regel 1e vor Regel 1f).
Auswirkung: Gering — heute in keiner Workflow-Vorlage (`workflow-vorlagen/*.json`) erreichbar, weil dafür ein Ausführungslauf gleichzeitig eine Selbstblockade melden UND real ein Prüfergebnis registriert bekommen müsste; kein bekannter Reallauf mit dieser Kombination. Träte es ein, würde ein Klick auf „Prüfung wiederholen" den DETERMINISTISCHEN Prüflauf real wiederholen, aber die eigentliche Ursache des Halts (die inhaltliche Selbstblockade) unverändert lassen — der Mensch bekäme fälschlich den Eindruck, „nochmal prüfen" sei hier die richtige Handlung.
Maßnahme (Vorschlag, noch nicht gebaut): entweder die Sichtbarkeitsbedingung UND die Server-Vorbedingung um eine Prüfung auf `ausfuehrungSelbstblockiert` erweitern (Knopf nur, wenn Regel 1e NICHT ebenfalls griffe), oder — sauberer — `ermittleNaechstenSchritt`/die Nachbereitung um ein maschinenlesbares Feld ergänzen, welche Regel den Halt tatsächlich ausgelöst hat, statt es aus mehreren Einzelfeldern zu rekonstruieren.
Status: offen.
Feature/Run: F-656-Render-Nachweis, 24.09.2026. Quelle: claude/f39-versuch4-diagnose.

**F-660** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Offener Prozesspunkt „Lagebild nach jeder findings-Änderung neu erzeugen" ist nicht automatisiert/erzwungen.
Beschreibung: `state/findings.md` wurde im Rahmen von F39 mehrfach nachträglich erweitert (F-652 bis F-659), ohne dass ein automatisierter oder dokumentierter Schritt sicherstellt, dass das Lagebild (`node scripts/erzeuge-lagebild.mjs`) danach jeweils neu erzeugt wird. Kein Bug an F39 selbst — ein Vorgehenshinweis für künftige Fixpaket-Anhänge.
Fundstelle: `state/findings.md` (Prozess, keine einzelne Codezeile).
Auswirkung: Gering — das Lagebild kann zwischen einer findings.md-Änderung und dem nächsten Lauf von `erzeuge-lagebild.mjs` veraltet sein.
Maßnahme: Vorschlag, noch nicht gebaut — z. B. ein Git-Hook oder ein `npm run check`-Schritt, der prüft, ob `findings.md` neuer ist als das zuletzt erzeugte Lagebild.
Feature/Run: F39-Feature-Review-Pass, 24.09.2026. Quelle: claude/f39-feature-gate (code-reviewer).

**F-661** · `TECH_DEBT` · P2 · offen
Titel: Prompt-Injection-Fläche über die Abnahme-Begründung in `baueReviewKorrekturInstruktion` (F-659) — Freitext bekommt explizit Vorrang vor dem eigentlichen Auftrag und wird gegen offene Befunde als „entschieden" gewertet.
Beschreibung: `begruendung` (`schemas/kontrollzustand-entscheidung-payload.schema.json:14`, nur `minLength: 1`, sonst keine Einschränkung) wird über `POST /api/workflows/<id>/abnahme` als reiner Freitext erfasst und in `scripts/leitstand-server.mjs` unverändert in den Auftragstext des nachfolgenden `code-reviewer`-Laufs eingefügt (`baueReviewKorrekturInstruktion`, `src/korrekturschleife/index.ts:78-95`). Der Zusatzblock formuliert ausdrücklich: „Verbindliche Klarstellung des Auftrags durch den Menschen … Sie hat Vorrang vor dem ursprünglichen Auftragstext … Bewusste Entscheidungen darin sind KEIN offener Befund." Es gibt keine Trennung zwischen Daten (die berichtete Begründung) und Instruktion (Weisung an das Review-Modell) — keine Markierung/Zitat-Kapselung, keine Längenbegrenzung, keine Gate-Prüfung auf verdächtige Formulierungen. Im Ein-Nutzer-Modell (nur Stefan tippt diesen Text) ist die unmittelbare Angriffsfläche klein, aber die architektonische Eigenschaft bleibt: jeder Text in diesem Feld kann das automatische `urteil` des unabhängigen Review-Gates de facto übersteuern, ohne dass ein Gate das begrenzt — schwächt strukturell die Grundannahme „code-reviewer prüft unabhängig, ohne Freigabeartefakte zu sehen" (`ROLLENVERTRAEGE['code-reviewer'].zweck`, `src/rollen/index.ts:56`).
Fundstelle: `src/korrekturschleife/index.ts:78-95`; Einfügestelle `scripts/leitstand-server.mjs:4166`; Schema `schemas/kontrollzustand-entscheidung-payload.schema.json:14`.
Auswirkung: Gering im heutigen Ein-Nutzer-Modell, strukturell relevant vor jeder Mehrnutzer-Erweiterung oder Automatisierung der Abnahme-Begründung.
Maßnahme: Vorschlag, noch nicht gebaut — Begründungstext im Prompt sichtbar als zitierte Daten kapseln statt als Weisung mit Vorrang zu formulieren, oder bewusst als hingenommenes Risiko im Ein-Nutzer-Modell dokumentieren (CLAUDE.md-Entscheidungsregel 5).
Feature/Run: F39-Feature-Review-Pass, 24.09.2026. Quelle: claude/f39-feature-gate (code-reviewer).

**F-662** · `TECH_DEBT` · P2 · offen
Titel: Regel 1f (F-652/F-654/F-655/F-656) ist für die tatsächliche `hoch`-Kette (Schritt NACH `architekt`+`architecture-advisor`) nur durch Konfiguration belegt, nicht durch einen echten Test oder einen realen Lauf.
Beschreibung: `workflow-vorlagen/hoch.json` trägt korrekt `schritt-4-review.eingaben` mit `artefakt:pruefergebnis-@schritt-3-ausfuehrung` — die Konfiguration selbst ist richtig. Aber `scripts/check-f652-pruefschritt.mjs` und `scripts/check-f656-pruefung-wiederholen.mjs` bauen ausschließlich handgefertigte Zwei-Schritt-Fixtures (Muster `standard.json`); keiner der beiden Gates lädt `hoch.json` real. `scripts/check-f39-architekt.mjs` Block (f) prüft die Verdrahtung architekt→architecture-advisor→ausfuehrung, aber NICHT, dass `schritt-4-review` die `pruefergebnis-@`-Eingabe trägt oder dass Regel 1f an dieser Position (drittem statt erstem Schritt, mit zwei vorgelagerten lesenden Schritten) tatsächlich hält. Der einzige real beobachtete Regel-1f-Halt (F39 Versuch 4) lief nachweislich über `standard.json` (Lineage-Beleg: zwei Schritte, `schritt-1-ausfuehrung`→`schritt-2-review`, kein `architekt`/`architecture-advisor` davor).
Fundstelle: `scripts/check-f652-pruefschritt.mjs` (keine `hoch.json`-Fixture), `scripts/check-f656-pruefung-wiederholen.mjs` (dito), `scripts/check-f39-architekt.mjs` Block (f) (prüft `schritt-4-review`-Eingaben nicht mit).
Auswirkung: Gering bis mittel — kein beobachtetes Fehlverhalten, reine Testlücke; ergänzt (dupliziert nicht) den bereits bekannten, akzeptierten Nicht-Blocker „hoch-Pfad nur durch Versuch 2 belegt".
Maßnahme: Vorschlag, noch nicht gebaut — einen Gate-Block ergänzen, der `workflow-vorlagen/hoch.json` real lädt und Regel 1f am `schritt-3-ausfuehrung`/`schritt-4-review`-Übergang prüft.
Feature/Run: F39-Feature-Review-Pass, 24.09.2026. Quelle: claude/f39-feature-gate (code-reviewer).

**F-663** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: `docs/harness/HARNESS-GLOSSARY.md` nennt für die Workforce-Rolle `architecture-advisor` eine veraltete Fundstelle (`schritt-1-architektur` statt real `schritt-2-architektur`).
Beschreibung: Nach der WS-2a-Korrektur (Architekt rückte auf `schritt-1-architekt`, die bestehende Rolle `architecture-advisor` auf `schritt-2-architektur`) wurde die Zeile im Glossar nicht nachgezogen. Die inhaltliche Kernaussage von AK6 (Drei-Wege-Klärung der Namensverwechslung, F-522) bleibt davon unberührt — reiner Fundstellen-Tippfehler.
Fundstelle: `docs/harness/HARNESS-GLOSSARY.md` (Eintrag zur Workforce-Rolle `architecture-advisor`).
Auswirkung: Gering — kosmetisch, keine funktionale Auswirkung.
Maßnahme: Fundstelle bei Gelegenheit auf `schritt-2-architektur` korrigieren.
Feature/Run: F39-Feature-Review-Pass, 24.09.2026. Quelle: claude/f39-feature-gate (qa).

**F-665** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Der Feature-Review-Pass vom 24.09.2026 hat WS-3b als „real erfüllt/kein Blocker" überzeichnet — der Review-Auftragstext hatte die `hoch`-Lücke bereits als Nicht-Blocker vorgegeben, statt sie den Prüfrollen unabhängig bewerten zu lassen.
Beschreibung: Die ursprüngliche Fassung von `features/F39/feature.md` (Status-Absatz) und `docs/STATUS.md` (zwei Stellen) behauptete nach dem Feature-Review-Pass: „kompletter `hoch`-Pfad nur durch Versuch 2 belegt (WS-3b bleibt eigener, künftiger Auftrag)" — als sei das eine bloße Randnotiz ohne Konsequenz. Tatsächlich ist Versuch 2 der EINZIGE reale Beleg für die `hoch`-Kette und deckt nur `architekt`→`architecture-advisor`→`ausfuehrung` ab (Advisor ohne Urteil/F-641, `code-reviewer` FEHLGESCHLAGEN/F-642, Regel 1c nie ausgelöst) — kein vollständiger `hoch`-Durchlauf existiert real. Der Review-Prompt für den Feature-Review-Pass hatte diese Einordnung („bekannt und ausdrücklich kein Blocker") bereits vorgegeben, statt code-reviewer/qa die Schwere unabhängig einschätzen zu lassen — die Prüfrollen haben die Vorgabe unverändert übernommen, statt sie zu hinterfragen.
Fundstelle: `features/F39/feature.md` (Status-Absatz, Fassung vor der Korrektur 24.09.2026); `docs/STATUS.md` (zwei Stellen, dito); Review-Auftrag des Feature-Review-Passes selbst (Vorgabe „Bekannt und KEIN Blocker … kompletter `hoch`-Pfad nur durch Versuch 2 belegt").
Auswirkung: Mittel — eine reale Lücke (kein vollständiger `hoch`-Beleg) wurde in der Doku als erledigt/unkritisch dargestellt, was eine spätere Abnahme (F41) ohne diesen Beleg hätte durchgehen lassen können.
Maßnahme: Reallauf-Urteile künftig je Pfad (hoch/standard) einzeln gegen die betroffenen AKs formulieren, statt pfadübergreifend zu pauschalisieren; Review-Prompts für Feature-Review-Pässe geben den Prüfrollen keine Bewertung („kein Blocker") vorab vor, sondern nennen nur die Fakten — die Einordnung ist Aufgabe von code-reviewer/qa, nicht des Auftraggebers. Korrektur bereits umgesetzt (24.09.2026, E-F39-2 = A): siehe F-666.
Feature/Run: F39-Feature-Gate-Korrektur, 24.09.2026, E-F39-2 = A. Quelle: claude/f39-feature-gate-korrektur.

**F-666** · `TECH_DEBT` · P1 · offen
Titel: Ein vollständiger realer `hoch`-Lauf (Advisor MIT Urteil, `code-reviewer` erfolgreich, Regel 1c real ausgelöst) wurde nie belegt — Pflicht-AK der F41-Abnahme (E-F39-2 = A).
Beschreibung: Versuch 2 (23.09.2026, hoch/Projektmodus, siehe `features/F39/nachweis-ws3-reallauf-messung.md` Abschnitt „Versuch 2") ist der einzige reale `hoch`-Lauf und deckt nur die ersten drei der vier Schritte ab: `architekt` ERFOLGREICH, `architecture-advisor` ERFOLGREICH aber OHNE auswertbares Urteil (F-641), `ausfuehrung` ERFOLGREICH (nur Dokumentation, schrieb ungeschützt auf main → F-643), `code-reviewer` FEHLGESCHLAGEN (`spawn ENAMETOOLONG`, F-642, seither über #232 gefixt, aber nicht erneut real durchlaufen). `entscheidungen_mensch[]` war in diesem Versuch leer — Regel 1c (`haltKlaerung` bei offener Architektur-Entscheidung, AK10) und der Fortsetzungsweg `POST /api/workflows/<id>/entscheidung` (AK11-AK13) wurden dadurch in KEINEM realen Versuch ausgelöst. Alle vier vollständigen Reallauf-Belege seit dem 23.09.2026 (Versuche 3/3b/3c/4) liefen über die `standard`-Kette (Feature-Modus, ohne `architekt`).
Fundstelle: `features/F39/nachweis-ws3-reallauf-messung.md` (Abschnitt „Versuch 2"); `state/findings.md` F-641/F-642/F-643 (die drei Einzelbefunde aus Versuch 2, alle bereits erfasst).
Auswirkung: Hoch für die Vollständigkeit des F39-Belegs — die Kernaussage von F39 WS-2a/WS-2b (`architekt` vor `architecture-advisor`, Regel 1c wertet `entscheidungen_mensch[]` real aus) ist bislang ausschließlich über Unit-/Gate-Tests belegt, nie über einen vollständigen echten End-to-End-Lauf gegen den Leitstand.
Maßnahme: **Pflicht-Akzeptanzkriterium der F41-Abnahme** (E-F39-2 = A, Stefan 24.09.2026) — ein vollständiger realer `hoch`-Durchlauf mit einem neuen Projekt-Interview-Auftrag, der eine offene Architektur-Entscheidung erzeugt (Regel 1c real auslöst), einen Advisor-Lauf MIT auswertbarem Urteil und einen erfolgreichen `code-reviewer`-Lauf umfasst. Nicht mehr „eigener, künftiger Auftrag ohne Zeitpunkt" (frühere Fassung, siehe F-665) — Ablaufanleitung bereits vorbereitet (`features/F39/nachweis-ws3-reallauf.md`), Messvorlage-Schritte 1-9 in `nachweis-ws3-reallauf-messung.md` bleiben dafür bewusst leer stehen.
Feature/Run: F39-Feature-Gate-Korrektur, 24.09.2026, E-F39-2 = A. Quelle: claude/f39-feature-gate-korrektur.

**F-667** · `TECH_DEBT` · P2 · offen
Titel: Ein über F41 WS-1 neu angelegtes Projekt hat keinen `pruefbefehl` in seiner Startvorlage — kein deterministischer Prüfschritt.
Beschreibung: `src/projekt-anlegen/index.ts`s `schreibeStartvorlageUndProfil` entfernt `pruefbefehl`/`pruefZeitgrenzeMs` aus der von `startvorlagen/ai-workforce.json` abgeleiteten neuen Startvorlage bewusst (features/F41/feature.md AK4c) — ein frisch angelegtes, leeres Projekt hat noch keinen eigenen Stack, also keinen sinnvollen `npm run check`-Äquivalent-Befehl. Bis eine spätere Iteration (frühestens WS-3/Reallauf, wenn ein echtes Zielstack-Gerüst entsteht) einen projektspezifischen `pruefbefehl` setzt, läuft jede `ausfuehrung`/`code-reviewer`-Kette gegen dieses Projekt ohne automatisierte Prüfung zwischen den Schritten.
Fundstelle: `src/projekt-anlegen/index.ts` (`schreibeStartvorlageUndProfil`); `startvorlagen/<id>.json` jedes über POST /api/projekte angelegten Projekts.
Auswirkung: Gering für WS-1 selbst (kein Lauf startet über WS-1 allein, siehe F41s "Bekannte Grenzen"), relevant ab WS-3 (Reallauf) — ein `ausfuehrung`-Schritt ohne automatisierte Prüfung verlässt sich vollständig auf den menschlichen/`code-reviewer`-Blick.
Maßnahme: Vorschlag, noch nicht gebaut — sobald ein neues Projekt eine eigene, lauffähige Prüfkette hat (z. B. über den Coach/architekt im WS-3-Reallauf), `pruefbefehl`/`pruefZeitgrenzeMs` in dessen `startvorlagen/<id>.json` von Hand oder über einen späteren Workstream ergänzen.
Feature/Run: F41 WS-1, 24.09.2026. Quelle: claude/f41-ws1.
Nachtrag (25.09.2026, F42 WS-3 Reallauf gegen `haushaltsbuch2`): real bestätigt — F42 WS-1 löst dies für jedes künftig neu angelegte Projekt: `startvorlagen/haushaltsbuch2.json` trägt einen echten `pruefbefehl` (`npm-cli.js` via `npm_execpath`), `check:template` lief grün (3 Skripte). Status bleibt "offen" für Projekte, die vor F42 WS-1 angelegt wurden (`haushaltsbuch`) — dort unverändert kein `pruefbefehl` (F42-Nicht-Ziel: keine Rückwirkung auf bereits bestehende F41-Projekte).

**F-668** · `TECH_DEBT` · P2 · offen
Titel: `src/startvorlage/index.ts`s `leiteProfilReferenzAb` liest `vorlage.profilPfad` relativ zum `process.cwd()` des Serverprozesses statt relativ zur `repoWurzel` des jeweiligen Projekts — inkonsistent zu `settingsPfad`/`aktuelleAutorisierungPfad`/`startvorlagePfad`.
Beschreibung: Realer Fund (Smoketest vor dem F41-WS-1-Gate-Bau, 24.09.2026): `src/projekte/index.ts`s `loeseProjektPfade` (F25 WS-1, AK3/AK4) löst `settingsPfad`, `aktuelleAutorisierungPfad`, `startvorlagePfad` und `basisVerzeichnis` bereits ABSOLUT relativ zur `repoWurzel` des jeweiligen Registereintrags auf — genau damit ein Multi-Projekt-Server (F25) nicht vom `process.cwd()` seines EIGENEN Prozesses abhängt. `vorlage.profilPfad` (ein Feld INNERHALB der Startvorlagen-JSON, nicht von `loeseProjektPfade` behandelt) bleibt davon ausgenommen: `leiteProfilReferenzAb` (`src/startvorlage/index.ts:230`) liest ihn über einen rohen `readFileSync(vorlage.profilPfad, 'utf8')` — ein relativer Wert wie `'profiles/ai-workforce.json'` löst sich deshalb IMMER gegen den `process.cwd()` des Serverprozesses auf (für ai-workforce selbst zufällig richtig, weil `process.cwd()` dort mit der eigenen `repoWurzel` zusammenfällt), nie gegen die `repoWurzel` des jeweils gemeinten Projekts. Ein Registereintrag mit einer unveränderten Kopie von `startvorlagen/ai-workforce.json` (relativer `profilPfad`) bindet sich dadurch STILL an ai-workforce's EIGENES `profiles/ai-workforce.json`, ohne Absturz und ohne Fehlermeldung — die Datei existiert dort ja tatsächlich. F41 WS-1s `schreibeStartvorlageUndProfil` umgeht das, indem es `profilPfad` in der neu geschriebenen Startvorlage explizit ABSOLUT auf das neue `profiles/<id>.json` setzt (Workaround an der Erzeugungsstelle) — die zugrunde liegende Inkonsistenz in `leiteProfilReferenzAb` selbst bleibt bestehen und würde jede künftige, von Hand (nicht über F41 WS-1) angelegte Startvorlage mit relativem `profilPfad` erneut treffen.
Fundstelle: `src/startvorlage/index.ts:230` (`leiteProfilReferenzAb`); Workaround in `src/projekt-anlegen/index.ts` (`schreibeStartvorlageUndProfil`).
Auswirkung: Mittel — betrifft nur Registereinträge mit relativem `profilPfad` und einer vom Serverprozess-`repoWurzel` abweichenden eigenen `repoWurzel` (also jedes F25-Mehrprojekt-Setup mit von Hand gepflegter Startvorlage); bislang ohne beobachteten Schaden, weil F41 WS-1 der erste Weg ist, der überhaupt automatisiert eine zweite Startvorlage erzeugt.
Maßnahme: Vorschlag, noch nicht gebaut — `leiteProfilReferenzAb` (oder deren Aufrufer) könnte `profilPfad` künftig ebenfalls relativ zur `repoWurzel` des Projekts auflösen (Muster `loeseProjektPfade`), statt sich auf einen absoluten Pfad in jeder erzeugten Startvorlage zu verlassen. Nicht in F41 WS-1 behoben (Scope-Grenze: WS-1 ändert `src/startvorlage/index.ts` nicht).
Feature/Run: F41 WS-1, 24.09.2026. Quelle: claude/f41-ws1.

**F-669** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Geklärt (kein Umbau nötig) — `commit-guard.cjs`/`zwischenstand-*.cjs` setzen keine ai-workforce-spezifischen Dateien/Pfade voraus.
Beschreibung: Offene Klärung aus dem F41-WS-1-Auftrag: liest `.claude/hooks/commit-guard.cjs`, `.claude/hooks/zwischenstand-laden.cjs` oder `.claude/hooks/zwischenstand-pruefen.cjs` irgendwo einen hartkodierten, ai-workforce-spezifischen Pfad oder Dateinamen? Grep gegen alle drei Dateien (`ai-workforce`, hartkodierte absolute Pfade) findet KEINEN Treffer — jede der drei liest ihren Bezugsordner ausschließlich über `eingabe.cwd || process.cwd()`, relativ. Eine byte-identische Kopie dieser Hooks (F41 WS-1, `kopiereBaseline`) funktioniert deshalb im neuen Projektordner unverändert, ohne projektspezifische Anpassung.
Fundstelle: `.claude/hooks/commit-guard.cjs`, `.claude/hooks/zwischenstand-laden.cjs`, `.claude/hooks/zwischenstand-pruefen.cjs` (alle `cwd`-relativ, kein Treffer für `ai-workforce`).
Auswirkung: Keine — reine Klärung, bestätigt, dass F41 WS-1s byte-identische Kopie ohne Sonderfall für diese drei Hooks auskommt.
Maßnahme: Keine. Nur als Beleg festgehalten, damit die Klärung nicht erneut offen gestellt wird.
Feature/Run: F41 WS-1, 24.09.2026. Quelle: claude/f41-ws1.

**F-670** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `gueltigkeitsschluessel.arbeitsverzeichnis_pfad` (E-188) ist seit F25 das `process.cwd()` des Leitstand-SERVERPROZESSES, nicht das reale Arbeitsverzeichnis des gestarteten Kindprozesses — ein Wirksamkeitsnachweis bindet dadurch an KEIN konkretes Projektverzeichnis.
Beschreibung: `src/claude-code-gateway/index.ts`s `starteGateway` baut `istUebrigeFelder.arbeitsverzeichnis_pfad` als `process.cwd()` (Zeile ~452) — das ist der Prozessarbeitsordner des LAUFENDEN Leitstand-Serverprozesses. Der Server macht an keiner Stelle ein `process.chdir()`. Das tatsächliche Arbeitsverzeichnis des gestarteten Kindprozesses (Claude Code CLI) wird komplett unabhängig davon über `AusfuehrungsOptionen.cwd` gesteuert (F25 WS-1, `loeseProjektPfade`/`erzeugeRequestHandler`) — dieser Wert erreicht `starteProzess` (F-415, F25 WS-1 AK8, bereits gefixt), fließt aber NIE in `arbeitsverzeichnis_pfad` des E-188-Gültigkeitsschlüssels ein. Folge: `arbeitsverzeichnis_pfad` ist für JEDES über den Leitstand registrierte Projekt identisch (der Pfad von ai-workforce selbst) — Bedingung 2 unterscheidet nicht zwischen "Lauf gegen ai-workforce" und "Lauf gegen ein beliebiges anderes, registriertes Projekt". Real erstmals sichtbar geworden durch F41 WS-1 (byte-identische Kopie von `state/aktuelle-autorisierung.json` in ein neues Projekt) und durch einen zweiten Realnachweis dort bestätigt: ein echter, lesender Lauf gegen ein frisch angelegtes Projekt erreichte `RUN_PREPARED` und lief bis `ERFOLGREICH` durch, obwohl der Wirksamkeitsnachweis ursprünglich für ai-workforce selbst erzeugt wurde. Vorbestehend seit F25 (nicht neu eingeführt durch F41) — F25 WS-1 AK8 hatte dasselbe Verhalten bereits real demonstriert (ein zweites Projekt B startete real Läufe), ohne es als eigenständigen Befund festzuhalten.
Fundstelle: `src/claude-code-gateway/index.ts` (`starteGateway`, `istUebrigeFelder.arbeitsverzeichnis_pfad: process.cwd()`); `src/invocation-policy/index.ts` (`pruefeStartbedingung2`, vergleicht `arbeitsverzeichnis_pfad` feldweise, aber ohne projektspezifische Bedeutung); `features/F25/nachweis-ws1.md` AK8 (erster, damals nicht als Befund erfasster realer Beleg); `features/F41/nachweis-ws1.md` (zweiter Beleg, F41).
Auswirkung: Mittel — architektonisch schwächt das die Aussagekraft von E-188 als projektspezifische Bindung (ein Wirksamkeitsnachweis "gilt" faktisch für jedes über denselben Serverprozess registrierte Projekt, nicht nur für das, für das er ursprünglich erzeugt wurde). Kein beobachteter Schaden im Ein-Nutzer-Modell (nur Stefan registriert Projekte, alle laufen unter derselben, bereits vertrauten Autorisierung) — relevant, falls E-188 künftig als projektspezifische Grenze gedacht sein soll.
Maßnahme: Vorschlag, noch nicht gebaut — bewusste Entscheidung nötig (CLAUDE.md-Entscheidungsregel 5), ob E-188 künftig projektbezogen werden soll (z. B. `arbeitsverzeichnis_pfad` aus `AusfuehrungsOptionen.cwd` statt `process.cwd()` des Servers ableiten) oder ob die aktuelle, serverweite Bindung eine bewusst hingenommene Eigenschaft des Ein-Nutzer-Modells bleibt. Kein Umbau in F41.
Feature/Run: F41 WS-1 Korrektur, 24.09.2026, Challenger-Befund. Quelle: claude/f41-ws1-korrektur.
Nachtrag (24.09.2026, F41 WS-3 Reallauf): erneut real bestätigt — die Laufakten `router-1c82e21f-dd90-43bb-8338-78c9a750b002-1790277994809` und `3943c565-dd33-4df4-895f-56daf1e1fb4a` (Projekt `haushaltsbuch`) melden beide `arbeitsverzeichnis_pfad: "C:\Users\stefa\Projekte\ai-workforce"` statt des Projekt-Repos — derselbe Mechanismus, kein neuer Fall.

**F-672** · `TECH_DEBT` · P2 · offen
Titel: Workforce-Rollen können keine Skills ausführen — die Worker-Läufe starten ohne "Skill" in `--allowedTools`, die 7 Skills in `ressourcen.json` sind reiner Katalog.
Beschreibung: `erzeugeClaudeCodeArgumente` (`src/claude-code-gateway/index.ts:373-376`) baut `--tools`/`--allowedTools` ausschließlich aus `werkzeugListe`, das aus dem `erlaubte_werkzeuge`-Array des jeweiligen Werkzeugsatzes kommt (`startvorlagen/*.json`, Muster `startvorlagen/ai-workforce.json` — "lesend"/"schreibend"/"recherchierend", jeweils nur `Read`/`Grep`/`Glob`/`Write`/`Edit`/`WebSearch`/`WebFetch`). Keiner dieser Werkzeugsätze führt `"Skill"` in seiner Liste. `ressourcen.json` listet dagegen 7 Einträge mit `"typ": "skill"` (Zeilen 35/42/49/56/63/70/194) — sie existieren als Katalog (F24 Capabilities, F27 Scout-Kandidaten), sind aber für keine reale Workforce-Rolle tatsächlich aufrufbar, weil `--allowedTools` das Werkzeug `Skill` nie enthält.
Fundstelle: `src/claude-code-gateway/index.ts:373-376` (`erzeugeClaudeCodeArgumente`); `startvorlagen/ai-workforce.json` (`werkzeugsaetze.*.erlaubte_werkzeuge`, kein `Skill`); `ressourcen.json` (7 `"typ": "skill"`-Einträge).
Auswirkung: Mittel — die 7 vorhandenen Skills sind für jede reale Rolle (jarvis, product-coach, ausfuehrung, architektur, code-reviewer, qa, router) faktisch totes Kapital; ein Skill-Katalogeintrag suggeriert Nutzbarkeit, die real nicht besteht.
Maßnahme: In F36 entscheiden, welche Rolle welche Skills bekommt (`capabilities_bedarf` des Architekten als Grundlage), dann `erlaubte_werkzeuge` der betroffenen Werkzeugsätze um `Skill` ergänzen. Kein Umbau in F41 (WS-2-Nicht-Ziel).
Feature/Run: F41 WS-2, 24.09.2026. Quelle: claude/f41-ws2.

**F-673** · `TECH_DEBT` · P2 · offen
Titel: F41 kopiert `.claude/skills/` nicht — ein über den Leitstand neu angelegtes Projekt hat keine Skills, selbst wenn F-672 künftig behoben wird.
Beschreibung: `kopiereBaseline` (`src/projekt-anlegen/index.ts:165ff`, F41 WS-1 AK4b) kopiert byte-identisch nur `.claude/settings.json`, jede darin über `ermittleHookPfade` referenzierte Hook-Datei und `state/aktuelle-autorisierung.json` — bewusst minimal, damit die Startfreigabe (E-183/E-188) am Ziel identisch grün ausfällt. `.claude/skills/` ist von keiner dieser drei Quellen referenziert und wird deshalb nie mitkopiert. Selbst wenn F-672 behoben wird (Skill zu `erlaubte_werkzeuge` ergänzt), liefe ein Skill-Aufruf in einem neu angelegten Projekt ins Leere, weil der Skill-Ordner dort schlicht fehlt.
Fundstelle: `src/projekt-anlegen/index.ts` (`kopiereBaseline`, kopiert nur settings.json/Hooks/aktuelle-autorisierung.json); `.claude/skills/` (Quelle, nicht referenziert).
Auswirkung: Niedrig bis Behoben-F-672-abhängig — aktuell folgenlos (F-672 ist ebenfalls offen, keine Rolle kann ohnehin Skills ausführen); wird erst relevant, sobald F-672 behoben ist.
Maßnahme: Mit F36 klären, ob/wie `.claude/skills/` (ggf. gefiltert nach `capabilities_bedarf`) Teil der Baseline-Kopie wird. Kein Umbau in F41.
Feature/Run: F41 WS-2, 24.09.2026. Quelle: claude/f41-ws2.

**F-674** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Die Zwischenstand-Hooks (`zwischenstand-laden`/`-pruefen.cjs`) sind aktiv, aber `state/zwischenstand/` enthält seit dem 03.09.2026 nur `VORLAGE.md` — ungenutzte Infrastruktur.
Beschreibung: Die beiden Hooks sind über `.claude/settings.json` verdrahtet (Team-Policy, nur vom Menschen im eigenen Editor änderbar) und laufen bei jeder Sitzung mit. `state/zwischenstand/` selbst enthält laut Verzeichnislisting nur die eine Vorlagendatei (`VORLAGE.md`, Stand 03.09.2026) — kein einziger real geschriebener Zwischenstand seither. Entweder wird der Mechanismus nicht genutzt (Prozesslücke) oder er ist überflüssig geworden (z. B. durch das freigabe-commit.md-Muster).
Fundstelle: `state/zwischenstand/` (nur `VORLAGE.md`); `.claude/hooks/zwischenstand-laden.cjs`, `.claude/hooks/zwischenstand-pruefen.cjs`; `.claude/settings.json` (Verdrahtung, Team-Policy).
Auswirkung: Niedrig — kein Fehlverhalten, aber ungenutzte, wartungspflichtige Harness-Infrastruktur (jeder Sitzungsstart zahlt die Hook-Kosten für einen Mechanismus, der seit über drei Wochen keinen einzigen realen Eintrag mehr bekommen hat).
Maßnahme: Nutzen oder entfernen — eine Entscheidung darüber braucht Stefan (eine Änderung an `.claude/settings.json` ändert den Baseline-Hash und damit seine Freigabe). Kein Umbau in F41.
Feature/Run: F41 WS-2, 24.09.2026. Quelle: claude/f41-ws2.

**F-675** · `TECH_DEBT` · P1 · offen
Titel: Die Coach-Struktur geht im Auftrag in Freitext über — Ausführung und Review arbeiten nicht verpflichtend gegen die Akzeptanzkriterien.
Beschreibung: Der Product Coach erzeugt strukturiert `in_scope`/`out_of_scope`/`erfolgskriterium` (Scope-Modus) bzw. je Feature `nicht_ziele`/`akzeptanzkriterien` (Projekt-Modus) — `src/product-coach/index.ts:52` (`SCOPE_FELDER`), `:58` (`PROJEKT_FEATURE_FELDER`). Der daraus gebaute Auftrag trägt aber nur `titel`/`auftragstext`/`herkunft` (`schemas/kontrollzustand-auftrag-payload.schema.json`, `additionalProperties: false`) — die gesamte Struktur wird zu einem einzigen Markdown-Freitextblock. `ausfuehrung` bekommt diesen Freitext als einzigen Eingabekanal (F-269-Muster), ohne dass ein AK maschinenlesbar bleibt. `schemas/ergebnis-code-reviewer.schema.json` kennt nur `urteil`/`befunde`/`empfehlung` — kein Feld für ein Urteil JE AK. Ein `code-reviewer`-Lauf kann deshalb strukturell an der eigentlichen Abnahme-Begründung vorbeiprüfen, ohne dass das Schema das verhindert — real beobachtet als F-659 (Review prüfte an der Abnahme-Begründung vorbei, seither über eine zusätzliche Textübergabe entschärft, nicht strukturell gelöst).
Fundstelle: `src/product-coach/index.ts:52,58`; `schemas/kontrollzustand-auftrag-payload.schema.json` (nur `titel`/`auftragstext`/`herkunft`); `schemas/ergebnis-code-reviewer.schema.json` (kein Pro-AK-Urteil); `state/findings.md` F-659 (Beleg).
Auswirkung: Mittel bis Hoch — je komplexer ein Auftrag (insbesondere Projekt-Interview-Aufträge mit mehreren Features), desto mehr Struktur geht auf dem Weg vom Coach zur Prüfrolle verloren; eine AK ohne strukturellen Beleg kann unbemerkt durchrutschen.
Maßnahme: In der F35-Challenge klären: strukturierte Auftragsfelder (Ziel, In-/Out-of-Scope, Akzeptanzkriterien, Erfolgskriterium, DoD-Verweis) statt reinem Freitext; `ausfuehrung` berichtet pro AK; `code-reviewer`/`qa` urteilen pro AK; eine AK ohne Beleg gilt als BLOCKIERT statt stillschweigend als erfüllt; Out-of-Scope-Prüfung (hat die Ausführung etwas geändert, das explizit außerhalb des Scopes lag?). Kein Umbau in F41 (WS-3 ist Reallauf, kein Schema-Umbau).
Feature/Run: F41 WS-3 Vorbereitung, 24.09.2026. Quelle: claude/f41-ws3-vorbereitung.

**F-677** · `TECH_DEBT` · P2 · offen
Titel: `installWurzel`-Default = `repoWurzel` reaktiviert F-676 still an jeder künftigen Aufrufstelle ohne den Parameter.
Beschreibung: `loeseSchrittEingabenAuf` und `verarbeiteRouterErgebnis` (`scripts/leitstand-server.mjs`) tragen `installWurzel = repoWurzel` als Default (Rückwärtskompatibilität zu bestehenden Gate-Aufrufern, die den Parameter nicht setzen). Ein künftiger Aufrufer, der eine dieser Funktionen NEU einbindet, ohne `installWurzel` explizit zu übergeben, löst Workforce-Assets damit wieder still gegen die Projekt-`repoWurzel` auf — exakt der F-676-Fehler, nur ohne jede Warnung oder Typfehler. `scripts/check-fix-f676-installwurzel.mjs` deckt das NICHT ab: es ruft beide Funktionen ausschließlich mit explizit gesetztem `installWurzel` auf und geht nie durch `erzeugeRequestHandler`/die echten HTTP-Routen — eine Regression an einer der bestehenden Aufrufstellen in `erzeugeRequestHandler` (z. B. ein versehentlich entferntes achtes Argument) bliebe für dieses Gate unsichtbar und grün. Zusätzlich: der F39-Nachtrag „vier `hoch`-Rollen trocken prüfen" (architekt/architecture-advisor/ausfuehrung/code-reviewer) ist für die Schema-Auflösung bislang nur für `ergebnis-router` und `ergebnis-architektur` real gezeigt — `ergebnis-code-reviewer` (der vierte `--output-schema`-Fall in `workflow-vorlagen/hoch.json`, Worker `codex`) ist im F-676-Fix nicht eigens durchgespielt.
Fundstelle: `scripts/leitstand-server.mjs:2483` (`loeseSchrittEingabenAuf`, Default `installWurzel = repoWurzel`); `scripts/leitstand-server.mjs:2930` (`verarbeiteRouterErgebnis`, derselbe Default); `scripts/check-fix-f676-installwurzel.mjs` (testet beide Funktionen nur mit explizitem `installWurzel`, nie über `erzeugeRequestHandler`).
Auswirkung: Mittel — kein aktueller Fehler (alle heutigen Produktions-Aufrufstellen übergeben `installWurzel` bereits korrekt, real geprüft bei der F-676-Korrektur), aber eine stille Falle für jede künftige Änderung an diesen beiden Funktionen oder ihren Aufrufstellen; das Gate würde eine solche Regression nicht fangen.
Maßnahme: `installWurzel` als Pflichtparameter ohne Default fassen (oder Default auf `process.cwd()` statt `repoWurzel` setzen, damit ein vergessener Parameter auffällt statt sich unauffällig an `repoWurzel` anzuhängen); zusätzlich einen Handler-Ebenen-Test ergänzen, der `erzeugeRequestHandler({ repoWurzel: <Fremdprojekt>, ... })` real mit gestubbtem `fuehreAufgabeDurchFn` über die echte `/routen`-Route treibt, statt nur die exportierten Funktionen direkt aufzurufen. Die Schema-Auflösung für `ergebnis-code-reviewer` (vierte `hoch`-Rolle) im selben Zug ergänzen.
Status: offen.
Feature/Run: F41 Fix F-676 Verifikation, 24.09.2026. Quelle: claude/fix-f41-installwurzel-verifikation.

**F-678** · `TECH_DEBT` · P1 · offen
Titel: Neue Projekte haben keinen Projekt-Harness — Rolleninstruktionen verweisen auf Dateien, die dort nicht existieren.
Beschreibung: F41 WS-1 kopiert beim Anlegen eines neuen Projekts ausschließlich die Harness-Baseline (`.claude/settings.json`, referenzierte Hooks, `state/aktuelle-autorisierung.json`) — bewusst, AK4b. Kein `CLAUDE.md`, kein `ARCHITECTURE.md`, keine Definition of Done, kein `pruefbefehl` (F-667 bereits erfasst), keine `.claude/skills/` (F-673 bereits erfasst). Mehrere Rolleninstruktionen setzen aber genau diese Dateien als vorhanden voraus: `src/architecture-advisor/index.ts:38` verlangt die Prüfung "gegen ARCHITECTURE.md" und zitiert "CLAUDE.md Entscheidungsregel 4"; `src/architekt/index.ts:353` verweist auf `.claude/skills/advisor-pass`; `src/architekt/index.ts:418` verlangt ein ADR "nach dem Muster 'docs/adr/TEMPLATE.md'", `:420` verlangt Ergänzungen in `features/<id>/feature.md` (ein Feature-Akte-Format, das ai-workforce sich selbst gegeben hat), `:422` zitiert erneut "CLAUDE.md, Entscheidungsregel 5". In einem neuen Projekt wie `haushaltsbuch` existiert keine dieser Dateien — eine Rolle, die sich daran hält, findet nichts vor; eine Rolle, die es ignoriert, baut ohne die vom Auftraggeber (Stefan) für ai-workforce selbst für verbindlich erklärten Leitplanken.
Fundstelle: `src/architecture-advisor/index.ts:38`; `src/architekt/index.ts:353,418,420,422`; `features/F41/feature.md` AK4b (bewusste Beschränkung der Baseline-Kopie).
Auswirkung: Hoch — jedes über F41 neu angelegte Projekt bekommt strukturell keine eigene Architektur-/Prozess-Leitplanke, obwohl die Workforce-Rollen (architekt, architecture-advisor, ausfuehrung) sich in ihren Prompts durchgängig auf genau solche Leitplanken berufen; die tatsächliche Tragweite (bricht eine Rolle daran, ignoriert sie es stillschweigend, oder entsteht ein Vermischen von ai-workforce- und Projektkonventionen) ist bislang nicht real gemessen.
Maßnahme: Eigenes Feature „Projekt-Harness" (E-F41-3, noch nicht entschieden) — welche Dateien ein neues Projekt zusätzlich zur Baseline bekommt (eigenes, schlankes `CLAUDE.md`/`ARCHITECTURE.md`, eigene ADR-Vorlage, eigene DoD) und welche es bewusst NICHT von ai-workforce erbt. Nicht vorab fixen — die tatsächliche Auswirkung im F41-WS-3-Reallauf (echter Coach→Architekt→Ausführung-Durchlauf gegen `haushaltsbuch`) beobachten und dokumentieren, dann entscheiden. Verweis: F-667 (kein `pruefbefehl`), F-673 (keine `.claude/skills/`) sind Teilaspekte desselben, hier erstmals ganzheitlich benannten Bildes.
Status: offen.
Feature/Run: F41 Fix F-676 Verifikation, 24.09.2026. Quelle: claude/fix-f41-installwurzel-verifikation.

**F-679** · `TECH_DEBT` · P3 · offen
Titel: `installWurzel` hängt am Start-Arbeitsverzeichnis des Leitstand-Prozesses, nicht an einem stabilen Installationsanker.
Beschreibung: `installWurzel` defaultet in `erzeugeRequestHandler` auf `process.cwd()` — das ist korrekt, SOLANGE `npm run leitstand` tatsächlich aus dem ai-workforce-Wurzelverzeichnis heraus gestartet wird (die dokumentierte, bisher einzige reale Startart). Wird der Prozess künftig aus einem anderen Arbeitsverzeichnis gestartet (z. B. über einen Task-Scheduler, ein Desktop-Icon mit abweichendem "Ausführen in", oder ein Wrapper-Skript, das zuvor `cd` in ein anderes Verzeichnis macht), zeigt `installWurzel` auf den falschen Ort, und derselbe F-676-Fehler (ressourcen.json/schemas/workflow-vorlagen nicht gefunden) träte erneut auf — diesmal für JEDES Projekt gleichzeitig, nicht nur für neu angelegte.
Fundstelle: `scripts/leitstand-server.mjs` (`erzeugeRequestHandler`, `installWurzel = process.cwd()`).
Auswirkung: Niedrig — kein beobachteter Fehlerfall (der einzige reale Start ist `npm run leitstand` aus dem Repo-Wurzelverzeichnis), aber eine architektonisch fragile Bindung an eine Betriebsannahme, die nirgends erzwungen ist.
Maßnahme: `installWurzel` statt aus `process.cwd()` aus `import.meta.url` (Pfad dieser Moduldatei, `scripts/leitstand-server.mjs` liegt immer unter der Installationswurzel) ableiten — unabhängig vom Arbeitsverzeichnis, aus dem der Prozess gestartet wurde. Kein Umbau hier (nur erfasst).
Status: offen.
Feature/Run: F41 Fix F-676 Verifikation, 24.09.2026. Quelle: claude/fix-f41-installwurzel-verifikation.

**F-680** · `TECH_DEBT` · P3 · offen
Titel: Hash-Links (`#/workflows/<id>` usw.) tragen keine Projekt-ID — ein in neuem Tab geöffneter Link fällt still auf `ai-workforce` zurück.
Beschreibung: Bedienbeobachtung aus der F41-WS-3-Vorbereitung: das aktive Projekt im Leitstand-Client liegt in `sessionStorage` (`projekt-kontext.js`), nicht in der URL — ein Hash-Link wie `#/workflows/<id>` funktioniert korrekt, solange derselbe Browser-Tab durchgängig verwendet wird (der Kontext übersteht einen Reload), fällt aber beim Öffnen in einem NEUEN Tab/Fenster (z. B. ein kopierter Link) still auf das Default-Projekt `ai-workforce` zurück — ohne Fehlermeldung. Ein Workflow-Detail oder eine Freigabe würde dann unbemerkt gegen das falsche Projekt wirken.
Fundstelle: `public/leitstand/projekt-kontext.js` (`sessionStorage`, `STANDARD_PROJEKT`); `public/leitstand/views/workflows.js:1197` (`#/workflows/<id>`-Route, keine Projekt-ID im Hash).
Auswirkung: Niedrig bis Mittel — nur relevant, wenn ein Hash-Link tatsächlich in einem neuen Tab/Fenster geöffnet wird (bereits als Hinweis in `features/F41/nachweis-ws3-reallauf.md` dokumentiert, dort als reine Bedienanweisung "nicht in neuem Tab öffnen" behandelt, nicht als Code-Fix).
Maßnahme: Vorschlag, noch nicht gebaut — die Projekt-ID könnte Teil des Hash werden (z. B. `#/projekte/<projektId>/workflows/<id>`), oder ein sichtbarer Warnhinweis erscheint, wenn ein Hash-Link ohne passenden `sessionStorage`-Kontext geöffnet wird. Kein Umbau hier (nur erfasst).
Status: offen.
Feature/Run: F41 Fix F-676 Verifikation, 24.09.2026. Quelle: claude/fix-f41-installwurzel-verifikation.

**F-684** · `BUG` · P1 · offen
Titel: Product-Coach-Vorlage "Auftrag an den Baudurchgang" schreibt ai-workforce-spezifische Prüfungen in JEDEN Auftrag — auch in Fremdprojekte, wo diese Dateien nicht existieren.
Beschreibung: `bauePlanungsprompt`/die Auftragsvorlage in `src/product-coach/index.ts:699-704` fügt unbedingt Zeilen wie "`docs/projekt/roadmap.json` — … muss `validiereRoadmapDaten` (`src/projektkontext/index.ts`) bestehen" (Zeile 702), "Je Feature eine eigene `features/<id>/feature.md` mit den Pflichtabschnitten aus `scripts/check-feature.mjs`" (Zeile 703) und "`npm run check` muss danach grün sein" (Zeile 704) in JEDEN vom Coach erzeugten Auftrag ein — unabhängig davon, ob das Zielprojekt `src/projektkontext/index.ts`, `scripts/check-feature.mjs` oder überhaupt ein `npm run check`-Skript besitzt. Real beobachtet: Auftrag `1c82e21f-dd90-43bb-8338-78c9a750b002` (Projekt `haushaltsbuch`, F41-WS-3-Reallauf) enthält alle drei Zeilen wortgleich, obwohl `haushaltsbuch` (F41 WS-1, bewusst minimale Baseline) keine dieser Dateien besitzt (F-673/F-678 dokumentieren bereits verwandte Aspekte des fehlenden Projekt-Harness).
Fundstelle: `src/product-coach/index.ts:699-704` (Auftragsvorlage, unbedingt eingefügte ai-workforce-Pfade); Auftrag `1c82e21f-dd90-43bb-8338-78c9a750b002` (Beleg).
Auswirkung: Hoch — eine Ausführungsrolle, die sich an den Auftragstext hält, sucht in einem Fremdprojekt nach Dateien/Skripten, die dort strukturell nie existieren (Prüfungen, die nie bestehen KÖNNEN, nicht nur zufällig fehlschlagen); ignoriert sie den Text stillschweigend, unterläuft das die eigentliche Absicht der Vorlage (verbindliche Qualitäts-Gates).
Maßnahme: Die Auftragsvorlage muss zwischen ai-workforce (diese drei Zeilen gelten) und einem Fremdprojekt (eigener, noch zu definierender Prüfsatz oder Auslassung) unterscheiden — direkt verknüpft mit E-F41-3 "Projekt-Harness" (F-678, noch nicht entschieden). Kein Umbau in diesem Fix (Out of Scope).
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.
Nachtrag (25.09.2026, F42 WS-3 Reallauf gegen `haushaltsbuch2`): real bestätigt — der Coach-Auftrag `4f11b37d` nannte ausschließlich den real konfigurierten Prüfbefehl ("npm run check:template muss danach grün sein."), keine ai-workforce-eigenen Prüfpfade. AK3 (F42 WS-1) hält damit auch im zweiten, inhaltlich weiterlaufenden Reallauf.

**F-685** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Architekt legt Stack/Speicherform selbst als ADR-Entwurf fest, obwohl der Coach die Speicherform im Auftrag bewusst offen ließ.
Beschreibung: Der Architekt-Lauf `288d90fa-a1a5-4e63-bb01-37a72175a4dd` (Schritt `schritt-1-architekt`, Auftrag `1c82e21f-dd90-43bb-8338-78c9a750b002`) entwirft im Rohstrom einen ADR, der Python-Prozess + SQLite als Speicherform festlegt — der Coach-Auftragstext (Product-Coach-Modus `projekt`) ließ die Speicherform ausdrücklich offen; `entscheidungen_mensch[]` des Architekten enthält dazu keine Rückfrage. `entscheidungen_mensch[]` trägt stattdessen ausschließlich fachliche Regeln, keine Technologie-/Persistenzwahl.
Fundstelle: `kontrollzustand-roh/288d90fa-a1a5-4e63-bb01-37a72175a4dd/rohstrom.json` (ADR-Entwurf, Python-Prozess + SQLite); Auftrag `1c82e21f-dd90-43bb-8338-78c9a750b002` (Coach-Text, Speicherform offen gelassen).
Auswirkung: Mittel — falls die Technologiewahl eigentlich eine `entscheidungen_mensch[]`-würdige Rückfrage sein sollte, trifft der Architekt sie stattdessen implizit; ob das im Reallauf tatsächlich auffällt (z. B. durch den `architecture-advisor` in `schritt-2-architektur`), ist NICHT gemessen — dieser Schritt schlug wegen F-682 (ENAMETOOLONG) technisch fehl, bevor er inhaltlich urteilen konnte.
Maßnahme: Im fortgesetzten Reallauf (nach dem Bug-A/B-Fix) messen, ob der `architecture-advisor` die implizite Technologiewahl beanstandet. Erst danach entscheiden, ob Technologie-/Persistenzwahl künftig eine Pflicht-`entscheidungen_mensch[]`-Frage werden soll. Kein Umbau in diesem Fix.
Status: gelöst (F42 WS-2, 25.09.2026). Verweis: `istStackOffen` (`src/architekt/index.ts`) erkennt einen offenen Stack am Zielprojekt-`CLAUDE.md` (fehlt oder trägt den Füllungs-Marker); `validiereErgebnisArchitektur`s neuer Parameter `stackOffen` lehnt ein Architektur-Ergebnis ab, das dann keine `entscheidungen_mensch[]`-Entscheidung mit `kategorie:'stack'` trägt — deterministisch statt einer Hoffnung auf den `architecture-advisor`. Laufzeit-wirksam in `scripts/leitstand-server.mjs` (`leseArchitekturErgebnisAusLaufakte`, alle drei Aufrufer). Gate: `scripts/check-f42-projekt-harness.mjs` (f), Tests: `src/architekt/architekt.test.ts`.
Feature/Run: F41 WS-3 Reallauf, 24.09.2026 (gefunden). Behoben: F42 WS-2, 25.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.
Nachtrag (25.09.2026, F41 WS-3 Reallauf-Fortsetzung): real gemessen — Lauf `0b389b1a-cb78-4477-af58-189547c7fc33` (Reparaturfassung nach dem F-682-Fix) beanstandete die Laufzeitwahl tatsächlich: „Die Wahl eines separaten Python-Prozesses als Backend passt nicht zur vorgefundenen Werkzeugumgebung. Die Permission-Allowlist in `.claude/settings.json` erlaubt ausschließlich `npm run check|check:template|lint|typecheck|test` als Bash-Befehle …", Urteil `BEREIT_NACH_KORREKTUR`. Damit ist die in der Maßnahme genannte Messung durchgeführt — die Frage, ob Technologie-/Persistenzwahl künftig Pflicht-`entscheidungen_mensch[]` wird, ist mit F42 WS-2 zugunsten von "ja, deterministisch erzwungen bei offenem Stack" entschieden.
Nachtrag (25.09.2026, F42 WS-3 Reallauf gegen `haushaltsbuch2`): real bestätigt — der Architekt-Lauf `20037ee3` (codex) legte den Stack nicht mehr selbst fest, sondern stellte ihn korrekt als `kategorie: 'stack'`-Entscheidung vor (neben zwei fachlichen Entscheidungen); der Workflow hielt real an, Stefan wählte TypeScript/Node.js/SQLite. Die WS-2-Sperre greift damit auch im zweiten, unabhängigen Fremdprojekt-Reallauf.

**F-686** · `TECH_DEBT` · P3 · offen
Titel: Router-Artefakt speichert `vorlage: 'standard'`, obwohl real die `hoch.json`-Vorlage geladen wurde.
Beschreibung: Das Router-Artefakt des Auftrags `1c82e21f-dd90-43bb-8338-78c9a750b002` trägt das Feld `vorlage: 'standard'`, obwohl die tatsächlich geladene Workflow-Vorlage (vier Schritte inkl. `architekt`/`architecture-advisor`, `schritt-1-architekt` als erster Schritt) eindeutig `workflow-vorlagen/hoch.json` entspricht — herkunft `projekt_interview` erzwingt laut Router-Logik eine Untergrenze `hoch`. Das gespeicherte `vorlage`-Feld spiegelt diese Untergrenzen-Anhebung nicht wider.
Fundstelle: Router-Artefakt `router-1c82e21f-dd90-43bb-8338-78c9a750b002` (Feld `vorlage: 'standard'`); tatsächlich geladen: `workflow-vorlagen/hoch.json` (vier Schritte, erster Schritt `schritt-1-architekt`).
Auswirkung: Niedrig — kein Funktionsfehler (die richtige Vorlage lief tatsächlich), aber ein irreführendes Audit-Feld: wer das Router-Artefakt liest, um nachzuvollziehen, welche Vorlage geladen wurde, bekommt eine falsche Antwort.
Maßnahme: Das `vorlage`-Feld muss die tatsächlich geladene Vorlage NACH einer eventuellen Untergrenzen-Anhebung widerspiegeln, nicht die vom Modell klassifizierte Kontrolltiefe vor der Anhebung. Kein Umbau in diesem Fix.
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.

**F-687** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Übergaben dürfen den Repo-Zustand eines Projekts (z. B. den Branch) nicht ungeprüft aus dem Gesprächskontext übernehmen.
Beschreibung: Die Übergabe für diesen Bauauftrag nannte für das Projekt `haushaltsbuch` einen Branch `arbeit/start` — real existierte im Zielrepo nur `main`. Ein Bauauftrag, der auf einer solchen unbelegten Behauptung aufbaut (z. B. ein `git checkout arbeit/start` ohne vorherige Prüfung), wäre fehlgeschlagen oder hätte einen falschen Branch angelegt.
Fundstelle: Übergabetext dieses Bauauftrags (Branchangabe für `haushaltsbuch`); real: `git branch`/`git status` im Zielrepo zeigt nur `main`.
Auswirkung: Niedrig bis Mittel — in diesem Lauf folgenlos (der Branch-Stand von `haushaltsbuch` war für Bug A/B nicht relevant), aber ein wiederkehrendes Muster: eine Übergabe, die Repo-Zustand aus dem Chat statt aus einer echten Prüfung übernimmt, kann eine ausführende Sitzung auf eine falsche Grundlage stellen.
Maßnahme: Übergaben/Handoff-Verträge sollten Repo-Zustand (Branch, letzter Commit, offene Änderungen) eines referenzierten Projekts durch eine tatsächliche Prüfung (`git status`/`git branch`) belegen, nicht aus vorherigem Gesprächskontext übernehmen — Kandidat für eine Ergänzung im Skill `handoff-vertrag`.
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.

**F-688** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Terminal-Anleitungen für Stefan (PowerShell) sollten ohne `<…>`-Platzhalter auskommen — PowerShell verwirft sonst den ganzen Befehlsblock.
Beschreibung: Ein an Stefan gerichteter PowerShell-Befehlsblock mit einem `<Platzhalter>`-Muster (z. B. `<laufId>`, `<workflowId>`) scheitert real, weil PowerShell `<`/`>` als Umleitungsoperatoren interpretiert, nicht als Platzhaltersyntax wie in Bash/Dokumentation üblich — der gesamte Block wird mit einem Parser-Fehler verworfen, nicht nur die eine Zeile.
Fundstelle: Wiederkehrendes Bedienmuster in an Stefan gerichteten Anleitungen (kein einzelner Code-Fundort — eine Konvention für zukünftige Ausgaben).
Auswirkung: Niedrig — kein Code-Fehler, aber eine wiederkehrende Bedienreibung: Stefan muss den Platzhalter jedes Mal von Hand ersetzen UND erkennen, dass der Parser-Fehler an der `<…>`-Syntax liegt, nicht am eigentlichen Befehl.
Maßnahme: Konvention für künftige, an Stefan gerichtete PowerShell-Anleitungen: konkrete Beispielwerte statt `<Platzhalter>`, oder eine PowerShell-Variable (`$laufId = '…'`) vor dem eigentlichen Befehl. Keine Code-Änderung.
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24.09.2026. Quelle: claude/f41-ws3-reallauf-bugfix.

**F-690** · `BUG` · P1 · offen
Titel: Ein über F41 neu angelegtes Projekt ist für Claude Code nicht "trusted" — die kopierte `.claude/settings.json`-Permission-Allowlist greift real nicht.
Beschreibung: Real beobachtet im `stderr` von Lauf `40045f94-6692-44a8-9514-766c5c5f295e` (`schritt-3-ausfuehrung`, Projekt `haushaltsbuch`): "Ignoring 5 permissions.allow entries from .claude/settings.json: this workspace has not been trusted. Run Claude Code interactively here once and accept the trust dialog, or set projects[\"C:/Users/stefa/Projekte/haushaltsbuch\"].hasTrustDialogAccepted: true in C:\Users\stefa\.claude.json." F41 WS-1 kopiert `.claude/settings.json` byte-identisch in jedes neue Projekt (bewusst, AK4b) — aber der CLI-seitige "Workspace Trust"-Mechanismus (`~/.claude.json`, `projects[<pfad>].hasTrustDialogAccepted`) ist ein GLOBALER, interaktiv erteilter Zustand pro Verzeichnis, den die Datei-Kopie nicht mit herstellt. Welche tatsächlichen Rechte ein schreibender Lauf OHNE erteilten Trust real hat (fällt er auf eine engere Grundmenge zurück, oder verweigert er alles, was nicht explizit in einem anderen Kanal erlaubt ist?), ist NICHT geprüft — der reale Lauf schrieb ohnehin nichts (siehe F-689/F-684), sodass dieser Aspekt in diesem Reallauf nicht weiter beobachtbar war.
Fundstelle: `kontrollzustand-roh/40045f94-6692-44a8-9514-766c5c5f295e/rohstrom.json` (`stderr`, wörtliche Meldung); `src/projekt-anlegen/index.ts` (`kopiereBaseline`, kopiert `.claude/settings.json`, kennt/setzt aber keinen Trust-Eintrag in `~/.claude.json`).
Auswirkung: Hoch — die in F41 WS-1 kopierte Permission-Allowlist eines neuen Projekts ist am realen Prozess wirkungslos, bis der Trust-Dialog einmal interaktiv bestätigt oder `~/.claude.json` von Hand ergänzt wurde; ein automatisierter, unbeaufsichtigter Baudurchgang (das erklärte Ziel von F41/E-M5-14) scheitert an dieser Stelle strukturell an einer Voraussetzung, die F41 selbst nicht herstellt.
Maßnahme: F41s "Nächste Schritte"-Box (oder die Projekt-Anlage selbst) muss den Trust-Schritt abdecken — entweder als expliziter, dokumentierter manueller Schritt für Stefan, oder der Kern setzt `hasTrustDialogAccepted: true` für den neuen Projektpfad in `~/.claude.json` bewusst und mit Stefans Freigabe (Sicherheitsimplikation prüfen: der Trust-Dialog existiert als Schutzmechanismus, ihn programmatisch zu umgehen ist keine triviale Entscheidung). Zusätzlich klären, welche Rechte ein schreibender Lauf ohne Trust tatsächlich hat, damit ein künftiger blinder Fleck nicht unbemerkt bleibt.
Status: offen (teilweise adressiert, siehe Nachtrag).
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

Nachtrag (25.09.2026, F42 WS-1, `features/F42/feature.md` AK4/AK7): E-PH-1 = B entschieden — read-only-Erkennung (`pruefeWorkspaceTrust`, `src/projekt-anlegen/index.ts`) plus sichtbare Anzeige in der Leitstand-Erfolgsbox (`naechste_schritte.trust.hinweis`, gerendert über `#projekte-anlegen-erfolg-trust`) decken den ERSTEN Teil der Maßnahme ab — Stefan sieht jetzt einen expliziten, dokumentierten manuellen Trust-Schritt statt gar keinen Hinweis. Der ZWEITE Teil der Maßnahme (welche Rechte ein schreibender Lauf ohne erteilten Trust tatsächlich hat) bleibt unverändert ungeklärt — bewusst nicht in F42 WS-1 untersucht (eigene, künftige empirische Frage). Zusätzlich real bestätigt (F-702, ebenfalls F42 WS-1): die Erkennung ist an die exakte Pfad-Schreibweise gebunden, kein case-insensitiver Vergleich. Status bleibt "offen", nicht "gelöst" — die ursprüngliche Beschreibung/Beobachtung bleibt unverändert historischer Stand.
Nachtrag (25.09.2026, F42 WS-3 Reallauf gegen `haushaltsbuch2`): real bestätigt — `~/.claude.json` trägt für `"C:/Users/stefa/Projekte/haushaltsbuch2"` genau einen Eintrag mit `hasTrustDialogAccepted: true`, von Stefan nach dem Anlage-Hinweis gesetzt; die kopierte `.claude/settings.json`-Allowlist griff im weiteren Verlauf des Reallaufs (Architekt, Advisor, Ausführung, Review, Korrekturschleife) erwartungsgemäß. Der erste Teil der Maßnahme (sichtbarer, expliziter Trust-Schritt) trägt damit auch im zweiten Fremdprojekt.

**F-691** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Die Begründung einer Schritt-Freigabe erreicht den nachfolgenden Worker nicht — nur die Architektur-Entscheidung (`entscheidungen_mensch[]`) wird als Eingabe weitergereicht.
Beschreibung: Im Code verifiziert (nicht widerlegt): `POST /api/workflows/<id>/freigabe` (`scripts/leitstand-server.mjs:6879-6886`) schreibt `freigabe_erteilt: true` auf das Schrittfeld und registriert die `begruendung` NUR als eigenständiges Kernartefakt `entscheidung-workflow-<id>-<schrittId>` (`art: 'freigabe'`, Zeile 6820) — dieses Artefakt taucht in KEINEM `schritt.eingaben`-Array eines nachfolgenden Schritts auf (geprüft: kein Treffer für eine Referenz auf `entscheidung-workflow-…-<schrittId>` außerhalb der Registrierung selbst). Der einzige Kanal, über den eine menschliche Eingabe tatsächlich in einen Worker-Prompt gelangt, ist `artefakt:entscheidung-@<schrittId>` — das löst gegen die ARCHITEKTUR-Entscheidung (`workflow-entscheidung-<id>`, `entscheidungen_mensch[]`-Antworten) auf, nicht gegen eine Freigabe-Begründung. Eine bei der Freigabe eingetippte Begründung (z. B. "Test 2", real beobachtet bei `schritt-2-architektur` dieses Reallaufs) ist damit für jeden Worker unsichtbar — sie dient ausschließlich dem menschlichen Audit-Trail.
Fundstelle: `scripts/leitstand-server.mjs:6820` (Freigabe-Artefakt, `art: 'freigabe'`); `scripts/leitstand-server.mjs:6879-6886` (`freigabe_erteilt`-Schreibvorgang, keine `eingaben`-Ergänzung); Gegenprobe: `src/korrekturschleife/index.ts` (`baueAusfuehrungKorrekturInstruktion`) reicht NUR die Abnahme-Begründung (`entscheidung-workflow-<id>-abnahme`, eigener, separater Mechanismus für `ANPASSUNG_ANGEFORDERT`-Korrekturrunden) an `auftragstext` an — eine gewöhnliche Erstfreigabe hat kein Äquivalent.
Auswirkung: Niedrig bis Mittel — für eine Erstfreigabe ist das vermutlich unproblematisch (die Begründung dient primär der menschlichen Nachvollziehbarkeit, nicht der Steuerung des Bauens). Relevant wird es, sobald ein Mensch bei der Freigabe eine inhaltliche Erwartung formuliert ("bitte X berücksichtigen"), die er für an den Worker weitergereicht hält, es aber nicht ist — eine stille Erwartungslücke.
Maßnahme: Klären, ob eine Freigabe-Begründung künftig ebenfalls (wie die Abnahme-Begründung) an den Auftragstext des freigegebenen Schritts angehängt werden soll, oder ob die reine Audit-Funktion bewusst beibehalten wird (dann hier dokumentieren, warum). Kein Umbau in diesem Auftrag.
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

**F-692** · `BUG` · P2 · offen
Titel: `sammleWorkflows` verwechselt das Architektur-Entscheidungsartefakt eines Workflows mit einem eigenen Workflow — die Workflow-Liste zeigt einen ungültigen Phantom-Eintrag mit aktivem "Reparaturfassung vorbereiten"-Knopf.
Beschreibung: `WORKFLOW_VERZEICHNIS_PRAEFIX = 'lineage-workflow-'` (`scripts/leitstand-server.mjs:1109`) ist kein eindeutiges Präfix: das Architektur-Entscheidungsartefakt eines Workflows wird unter `lineage-workflow-entscheidung-<workflowId>` abgelegt (Artefakt-ID `workflow-entscheidung-<workflowId>`, siehe `registriereWorkflowEntscheidung`) — dieser Verzeichnisname beginnt ebenfalls mit `lineage-workflow-`. `sammleWorkflows` (Zeile 1252-1265) filtert nur auf das Präfix und leitet die vermeintliche `workflowId` per `slice` ab: aus `lineage-workflow-entscheidung-router-1c82e21f-dd90-43bb-8338-78c9a750b002` wird `workflowId = 'entscheidung-router-1c82e21f-dd90-43bb-8338-78c9a750b002'`. `baueWorkflowKopfdatenGecached` lädt daraufhin erfolgreich (200) die Entscheidungs-Artefaktversion unter `workflow-entscheidung-router-…` — deren `daten`-Form (`{antworten[], entschieden_am, schritt_id}`) ist kein WORKFLOW_V0-Objekt. `baueWorkflowKopfdaten` (Zeile 1195-1213) wirft dabei NICHT (durchgehend `?? null`/`Array.isArray`-Wächter), sondern liefert ein Kopfdatum mit `status: null`, `schritteAnzahl: 0` — dieser Phantom-Eintrag erscheint real in der Workflow-Liste. Real beobachtet: Stefan sah dort einen Eintrag "entscheidung-router-1c82e21f-dd90-43bb-8338-78c9a750b002" mit aktivem "Reparaturfassung vorbereiten"-Knopf (`public/leitstand/views/workflows.js:648`, an jeden Listeneintrag angehängt, unabhängig davon, ob die Fassung gültig ist).
Fundstelle: `scripts/leitstand-server.mjs:1109` (`WORKFLOW_VERZEICHNIS_PRAEFIX`); `scripts/leitstand-server.mjs:1252-1265` (`sammleWorkflows`, Präfix-basierte ID-Ableitung); `scripts/leitstand-server.mjs:1195-1213` (`baueWorkflowKopfdaten`, keine Formvalidierung); `public/leitstand/views/workflows.js:648` (Knopf ohne Gültigkeitsprüfung).
Auswirkung: Mittel — Fehlbedienungsgefahr: ein Mensch, der diesen Phantom-Eintrag für einen echten, kaputten Workflow hält und auf "Reparaturfassung vorbereiten" klickt, bekommt eine verwirrende Fehlermeldung statt einer Erklärung, dass es sich um kein Workflow-Artefakt handelt (siehe F-693, direkte Folge dieses Bugs). Kein Datenverlust, kein Schreibzugriff auf das echte Entscheidungsartefakt.
Maßnahme: `sammleWorkflows`/`WORKFLOW_VERZEICHNIS_PRAEFIX` muss zwischen `lineage-workflow-<id>` (echter Workflow) und `lineage-workflow-entscheidung-<id>` (Entscheidungsartefakt eines Workflows) unterscheiden — z. B. über ein exaktes Muster (`lineage-workflow-` gefolgt von KEINEM `entscheidung-`) oder indem `baueWorkflowKopfdaten` die geladene Form gegen `validiereWorkflowDaten` prüft und bei Verstoß `null` liefert (dann wird der Eintrag in `sammleWorkflows` bereits herausgefiltert, Zeile 1262 `if (kopfdaten !== null)`).
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

**F-693** · `BUG` · P3 · offen
Titel: "Reparaturfassung nicht vorbereitbar: 200" — eine erfolgreiche HTTP-Antwort wird als Fehler gemeldet, ohne erkennbaren Grund.
Beschreibung: `oeffneReparaturEntwurf` (`public/leitstand/views/workflows.js:826-848`) prüft `if (!antwort.ok || !Array.isArray(inhalt.daten?.schritte))` (Zeile 836) und zeigt bei Verstoß `Reparaturfassung nicht vorbereitbar: ${antwort.status} ${inhalt.grund ?? ''}` (Zeile 838) — bei einem `antwort.status: 200` OHNE `inhalt.grund` (weil die Antwort selbst kein Fehlerobjekt war, sondern nur `inhalt.daten.schritte` fehlte) liefert das die aus Nutzersicht widersprüchliche Meldung "Reparaturfassung nicht vorbereitbar: 200" — ein Erfolgscode als Fehlermeldung, ohne jeden Grund-Text. Real ausgelöst durch F-692: der Phantom-Workflow-Eintrag (`entscheidung-router-…`) liefert bei `GET /api/workflows/<id>` real 200 (das Entscheidungsartefakt existiert ja), aber `inhalt.daten.schritte` ist nicht vorhanden (die Entscheidungsdaten kennen kein `schritte`-Feld) — genau dieser Fall trifft die Meldung.
Fundstelle: `public/leitstand/views/workflows.js:836-838` (`oeffneReparaturEntwurf`, Bedingung und Meldungstext).
Auswirkung: Niedrig — reine Fehlbedienungsfolge von F-692 (ohne den Phantom-Eintrag wäre dieser Pfad kaum erreichbar), aber die Meldung selbst ist auch unabhängig davon irreführend: ein Statuscode 200 sollte nie als "nicht vorbereitbar: <Statuscode>" erscheinen, ohne dass der Text erklärt, WAS an den (erfolgreich geladenen) Daten fehlte.
Maßnahme: Die Meldung sollte unterscheiden, ob die Anfrage selbst fehlschlug (`!antwort.ok`, Statuscode + `grund` sinnvoll) oder ob die Antwort zwar erfolgreich war, aber keine gültige WORKFLOW_V0-Form trug (eigener Text, z. B. "Antwort enthält keine gültigen Workflow-Schritte"). Mit dem F-692-Fix (Phantom-Eintrag verschwindet aus der Liste) entfällt der real beobachtete Auslöser ohnehin.
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

**F-694** · `TECH_DEBT` · P2 · offen
Titel: Performance-Gate F20 WS-2 (d) hängt vom lokalen, angesammelten `kontrollzustand/`-Bestand ab — `npm run check` wird lokal dauerhaft rot, unabhängig vom Code.
Beschreibung: Das Gate (`scripts/check-f20-zustand-poll.mjs`, Prüfung (d)) misst die reale Antwortzeit von `GET /api/zustand` gegen den TATSÄCHLICHEN `kontrollzustand/`-Bestand dieses Arbeitsverzeichnisses und verlangt einen Median unter 300 ms. Real gemessen (F41-WS-3-Reallauf-Fixsession, 24./25.09.2026): 935 angesammelte Verzeichnisse unter `kontrollzustand/` (Monate an Testläufen/Reallauf-Belegen, keine Bereinigung vorgesehen) ließen den Median auf 367 ms steigen — das Gate schlägt fehl, obwohl kein Code geändert wurde. Da `npm run check` diese Prüfung fest einhängt, ist die lokale Prüfkette dauerhaft rot, sobald der Bestand über die (nicht dokumentierte) Schwelle wächst — unabhängig von der Korrektheit des geprüften Codes.
Fundstelle: `scripts/check-f20-zustand-poll.mjs` (Prüfung (d), Median-Schwelle 300 ms gegen den realen `kontrollzustand/`-Bestand); `kontrollzustand/` (935 Verzeichnisse zum Messzeitpunkt, keines davon Teil dieses Fixes).
Auswirkung: Mittel — ein Gate, das lokal zuverlässig rot wird, sobald genug reale Läufe/Belege angesammelt sind, verliert seinen Wert als Regressionswächter (ein echter Performance-Rückschritt geht im Rauschen unter) und zwingt jede Sitzung, dieselbe Abweichung wiederholt zu erklären, statt sie einmal strukturell zu lösen.
Maßnahme: Das Gate sollte gegen ein eigenes, kontrolliertes Fixture-Verzeichnis messen (feste, reproduzierbare Anzahl Einträge) statt gegen den realen, unbegrenzt wachsenden `kontrollzustand/`-Bestand — oder eine von Stefan freigegebene Aufräumregel (z. B. Alter- oder Anzahlgrenze, mit expliziter Ausnahme für als Beleg markierte Verzeichnisse) definieren. Kein Umbau in diesem Auftrag (Out of Scope, reine Messung).
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

**F-695** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Begründung des `architecture-advisor` stützt sich teils auf ai-workforce-spezifische Artefakte im Fremdprojekt (kopierte `.claude/settings.json`-Allowlist, vom Coach injizierter Auftragstext) — Grenze zwischen Harness-Baseline und Projekt-eigenem Kontext bleibt unklar.
Beschreibung: Lauf `0b389b1a-cb78-4477-af58-189547c7fc33` (`architecture-advisor`, F41-WS-3-Reallauf) begründet seine Kritik an der Python-Laufzeitwahl unter anderem mit "Die Permission-Allowlist in `.claude/settings.json` erlaubt ausschließlich `npm run check|check:template|lint|typecheck|test`" und "Der eingebettete Baudurchgang selbst verlangt zudem TypeScript-Validatoren (`src/projektkontext/index.ts`, `scripts/check-feature.mjs`) und `npm run check` als grünen Gate". Beide Referenzen sind KEINE Eigenschaften des Zielprojekts `haushaltsbuch` selbst: Die `.claude/settings.json` ist eine 1:1-Kopie der ai-workforce-Baseline (F41 WS-1, AK4b), die TypeScript-Validatoren/`npm run check` stammen aus der vom Product-Coach injizierten Auftragsvorlage (F-684). Der Advisor beurteilt damit teilweise Konventionen, die dem Projekt fremd aufgezwungen wurden, nicht zwingend echte Eigenschaften oder Bedürfnisse von `haushaltsbuch`.
Fundstelle: `kontrollzustand-roh/0b389b1a-cb78-4477-af58-189547c7fc33/rohstrom.json` (`result`-Text, wörtliche Begründung); F-684 (Coach-Vorlage), F41 WS-1 AK4b (`.claude/settings.json`-Kopie).
Auswirkung: Niedrig — die inhaltliche Kernkritik (Python-Laufzeit passt nicht zum vorgefundenen Werkzeugkasten) bleibt unabhängig davon plausibel; relevant wird die Vermischung erst, sobald das Projekt-Harness (E-F41-3, F-678) eigene, vom Zielprojekt selbst getragene Konventionen bekommt und ai-workforce-spezifische Reste dann echte Fehlurteile erzeugen könnten.
Maßnahme: Zusammen mit E-F41-3 (Projekt-Harness, F-678) klären, welche Baseline-Artefakte eine Prüfrolle als "projekteigen" vs. "geerbte Harness-Konvention" erkennen soll — ggf. eine Kennzeichnung in der kopierten Baseline selbst. Kein Umbau in diesem Auftrag.
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

**F-696** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: Sechster `index.lock`-Vorfall über die Remote-Bridge (nach F-100/F-118/F-122/F-123/F-126) — ein als lesend geltender `git diff HEAD`-Aufruf lief in einen Timeout und hinterließ `.git/index.lock`.
Beschreibung: 25.09.2026, ca. 07:56 Uhr — ein über die Remote-Bridge abgesetzter `git diff HEAD` (als lesende Operation gedacht) lief in einen Timeout und hinterließ eine verwaiste `.git/index.lock`-Datei, die jede weitere Git-Operation im Repo blockierte, bis die Datei entfernt wurde. Derselbe Mechanismus wie die fünf vorangegangenen, bereits erfassten Vorfälle (F-100/F-118/F-122/F-123/F-126) — `git diff` ist zwar semantisch lesend, kann aber intern denselben Index-Lock-Mechanismus wie ein schreibender Befehl auslösen, wenn der Prozess über die Bridge abbricht, bevor er den Lock regulär freigibt.
Fundstelle: `.git/index.lock` (Vorfall, zum Zeitpunkt dieser Messung bereits wieder entfernt); F-100/F-118/F-122/F-123/F-126 (Vorgeschichte, `state/findings.md`).
Auswirkung: Mittel bis Hoch — ein wiederkehrendes, bereits fünfmal dokumentiertes Muster, das die Bridge trotz mehrfacher Gelegenheit zur strukturellen Behebung weiterhin reproduziert; jeder Vorfall blockiert das Repo, bis ein Mensch oder eine Sitzung den Lock manuell entfernt.
Maßnahme: Bridge-Regel verschärfen — kein `git` (auch keine als lesend geltenden Unterbefehle wie `diff`/`log`/`status`) über die Remote-Bridge ausführen, nur Dateien lesen; falls ein Git-Aufruf über die Bridge unumgänglich ist, ausschließlich mit `git --no-optional-locks`, das den Index-Lock für lesende Operationen gar nicht erst erwirbt. Kein Code-Umbau hier (Bridge-Konfiguration liegt außerhalb dieses Repos).
Status: offen.
Feature/Run: F41 WS-3 Reallauf, 24./25.09.2026. Quelle: claude/f41-ws3-reallauf-messung.

**F-697** · `TECH_DEBT` · P3 · offen
Titel: `npm run check` scheiterte im F41-Review-Pass an zwei F41-fremden, timing-sensitiven `node --test`-Fällen — beide bestehen isoliert grün, ähnliches Muster wie CLAUDE.md „Bekannte Fallen", aber ein anderes Gate als das bereits dokumentierte F-694.
Beschreibung: Zwei volle `npm run check`-Läufe (25.09.2026, Review-Pass F41) endeten mit Exit 1 — NICHT am bekannten F-694-Gate (`check-f20-zustand-poll.mjs` (d) war in beiden Läufen real grün, Median 38 ms < 300 ms), sondern an zwei Tests aus bestehenden, F41-fremden Suiten: `src/claude-code-gateway/stream-json.test.ts` ("Abbruch mitten im Stream (keine result-Zeile, Fragment ohne Zeilenende) → ABBRUCH, kein Hänger, kein Parse-Wurf — Gate (a)") und `src/pruefschritt/pruefschritt.test.ts` ("ROT: ein mit Exitcode 1 endender Befehl liefert ergebnis ROT, exit_code 1, ausgabe_ende enthält den Ausgabetext") — beides reale Kindprozess-/Timing-Tests. Ein isolierter Nachlauf (`node --test src/claude-code-gateway/stream-json.test.ts src/pruefschritt/pruefschritt.test.ts`, ohne die restliche `npm run check`-Kette davor) lieferte 35/35 grün, beide Tests unverändert bestanden. Alle F41-spezifischen Gates (`check-f41-projekt-anlegen.mjs`, `check-fix-f676-installwurzel.mjs`) liefen in beiden vollen Läufen sauber durch.
Fundstelle: `src/claude-code-gateway/stream-json.test.ts` ("Abbruch mitten im Stream…"-Testfall); `src/pruefschritt/pruefschritt.test.ts` ("ROT: ein mit Exitcode 1 endender Befehl…"-Testfall).
Auswirkung: Niedrig bis Mittel — kein Befund am geprüften Code (F41 oder sonst), aber ein zweiter, bislang nicht dokumentierter Fall von last-in-chain-Testflakiness unter der vollen `npm run check`-Kette (vermutlich Ressourcenkonkurrenz bei echten Kindprozess-/Timeout-Tests), der die in CLAUDE.md/F-694 etablierte Erwartung "nur das F20-Gate wird lokal gelegentlich rot" durchbricht — künftige Sitzungen könnten einen echten Regressionsbefund fälschlich als bekannte Flakiness abtun oder umgekehrt.
Maßnahme: Einmalige Beobachtung, noch kein Muster (CLAUDE.md-Kriterium: "zweimal aufgetreten"). Kein Umbau. Bei erneutem Auftreten: Uhrzeit + Systemlast (Cloud-Sync, Parallel-Läufe) festhalten und ggf. als eigenen CLAUDE.md-„Bekannte Fallen"-Eintrag aufnehmen.
Status: offen (Beobachtung, nicht reproduzierbar isoliert).
Feature/Run: F41 Review-Pass, 25.09.2026. Quelle: claude/f41-review-pass.

**F-698** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Feature-Akten mit mehreren Workstreams tragen Akzeptanzkriterien oft nur für den ERSTEN Workstream — spätere Workstreams bleiben als reine Zielbeschreibung ohne eigene, einzeln prüfbare AKs.
Beschreibung: `features/F41/feature.md` listet unter "Workstreams" WS-1 (Backend), WS-2 (UI) und WS-3 (Reallauf, Pflicht-AK F-666 aus F39) — der Abschnitt "Akzeptanzkriterien" (AK1-AK6) deckt aber ausschließlich WS-1 ab. WS-2 hat keine eigene, in dieser Akte formulierte AK (z. B. "Formular öffnet/schließt korrekt, 400/409 werden im Klartext angezeigt, Erfolg-Box zeigt die Git-Befehle") — der reale Beleg existiert zwar (`features/F41/nachweis-ws2-ui/`, Render-Nachweis mit Klickfolge/Screenshots), ist aber nirgends als AK benannt, gegen die man ihn abgleichen könnte. WS-3 hat mit F-666 zwar eine (extern, aus F39 übernommene) Pflicht-AK, aber keine WS-3-eigenen AKs für z. B. "Coach-Interview liefert einen vollständigen `projekt_entwurf`" oder "Router hebt `herkunft.art === projekt_interview` real auf `hoch` an". Real beobachtet im F41-Review-Pass (25.09.2026, `features/F41/review-pass.md`): der Auftrag zur unabhängigen Prüfung listete explizit "JEDE AK einzeln bewerten" — die Prüfung konnte sich dabei ausschließlich auf die sechs WS-1-AKs stützen; WS-2 wurde nur indirekt über den vorhandenen Render-Nachweis gewürdigt (kein eigenständiges AK-Urteil möglich, weil keine AK-Texte dafür existieren), WS-3 nur über die extern übernommene F-666-Messung.
Fundstelle: `features/F41/feature.md` (Abschnitt "Workstreams" nennt drei, Abschnitt "Akzeptanzkriterien" AK1-AK6 nur WS-1); `features/F41/nachweis-ws2-ui/` (Beleg ohne zugehörigen AK-Text); `features/F41/review-pass.md` (Review-Pass, der diese Lücke real durchlief).
Auswirkung: Mittel — eine Prüfrolle (Mensch oder KI) kann WS-2/WS-3 nur noch gegen implizite Erwartungen (Klickfolge, Nachweis-Struktur) statt gegen benannte, vorab vereinbarte Kriterien abgleichen; ein stillschweigend nicht erfülltes WS-2/WS-3-Detail hätte keinen AK-Text, an dem es als "nicht erfüllt" hätte auffallen können — es könnte nur über die Feststellung "kein Beleg" indirekt auffallen, nicht über einen direkten Soll-Ist-Abgleich.
Maßnahme: Für Feature-Akten mit mehreren Workstreams künftig je Workstream einen eigenen, nummerierten AK-Block vorsehen (z. B. "AK-WS1-*", "AK-WS2-*"), statt AK1-AKn implizit nur dem ersten Workstream zuzuordnen — Kandidat für eine Ergänzung in der Feature-Akte-Konvention (`scripts/check-feature.mjs`/`docs/kommentar-standard.md` o. Ä.). Kein Umbau an F41 selbst (Out of Scope dieses Abschluss-Auftrags).
Status: offen.
Feature/Run: F41 Review-Pass, 25.09.2026. Quelle: claude/f41-review-pass.

**F-699** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Challenge zu Projekt-Harness (F42) lief ohne bestätigten Ordnerzugriff — Ordnerfreigabe unbestätigt, Projekt-Sync zeigte nur den Template-Stand statt des realen ai-workforce-Repos.
Beschreibung: Beim Aufsetzen des F42-Auftrags war unklar, ob die Challenge-Runde direkten Zugriff auf das reale ai-workforce-Repo hatte oder nur auf einen synchronisierten Ordnerstand des `claude-projekt-template`-Repos — die Befundaufnahme (Startvorlagen-`pruefbefehl`-Entfernung, hartkodierte Coach-Prüfpfade) wurde deshalb erst nachträglich, über eine echte Claude-Code-Sitzung gegen das reale Repo, verifiziert statt vorab bestätigt zu sein.
Fundstelle: F42-Auftragskontext (Challenge-Runde vor `features/F42/feature.md`).
Auswirkung: Mittel — eine Challenge/ein Advisor-Pass, der auf einem veralteten oder falschen Ordnerstand aufsetzt, kann plausible, aber faktisch falsche Annahmen in einen Plan schreiben, die erst beim realen Bau auffallen (teurer als eine vorab geklärte Zugriffsfrage).
Maßnahme: Vor einer Challenge/einem Advisor-Pass mit Repo-Bezug den Ordnerzugriff/Sync-Stand explizit bestätigen (kurze Rückfrage), sonst die Befundaufnahme ausdrücklich über eine echte Claude-Code-Sitzung gegen das reale Repo nachholen, statt auf einem möglicherweise veralteten Stand weiterzuplanen.
Status: offen.
Feature/Run: F42 WS-1, 25.09.2026.

**F-702** · `BUG` · P2 · offen
Titel: Claude-Code-Workspace-Trust ist an den exakten Pfadstring gebunden (Laufwerksbuchstabe-Schreibweise, Trennerform) — real inkonsistent in `~/.claude.json` beobachtet.
Beschreibung: `~/.claude.json`s `projects`-Schlüssel ist ein roher Pfadstring, den Claude Code beim interaktiven Trust-Dialog schreibt — real beobachtet (Stichprobe der echten `~/.claude.json` dieser Maschine, 25.09.2026): derselbe logische Ordner erscheint teils als `C:\Users\stefa\...` (Backslash), teils als `C:/Users/stefa/...` (Slash), teils mit kleingeschriebenem Laufwerksbuchstaben `c:/Users/stefa/...` — alle drei Formen nebeneinander für verschiedene Projekte. F42s `pruefeWorkspaceTrust` (`src/projekt-anlegen/index.ts`) löst das NICHT vollständig: sie vergleicht exakt gegen `cwdPfad.split(sep).join('/')` (eine Normalisierung, kein Raten über Groß-/Kleinschreibung) — ein unter einer anderen Schreibweise gesetzter Trust wird deshalb bewusst als `'fehlend'` gemeldet, auch wenn Claude Code ihn real akzeptieren würde.
Fundstelle: `~/.claude.json` (`projects`-Schlüssel, reale Stichprobe); `src/projekt-anlegen/index.ts` (`pruefeWorkspaceTrust`, bewusste Grenze im Kopfkommentar dokumentiert); `state/findings.md` F-690 (Ursprungsbeobachtung: derselbe Trust-Mechanismus, dort erstmals als Blocker für einen schreibenden Lauf gegen ein neues Projekt beobachtet).
Auswirkung: Mittel — die read-only-Erkennung (F42, E-PH-1 = B) kann einen tatsächlich vorhandenen Trust als `'fehlend'` melden, wenn er unter einer anderen Pfad-Schreibweise gesetzt wurde; Stefan sieht dann ggf. eine unnötige Warnung, aber keine falsch-positive `'true'`-Meldung (die schlechtere Fehlrichtung ist bewusst ausgeschlossen).
Maßnahme: F42 WS-1 liefert die vom Auftrag verlangte "Erkennung auf exakten Worker-cwd" — `POST /api/projekte`s `naechste_schritte` nennt Stefan exakt den Pfad, den er interaktiv trusten muss (`ziel`, derselbe String, den `pruefeWorkspaceTrust` auch prüft), womit die Mehrdeutigkeit für NEU angelegte Projekte in der Praxis meist entfällt. Eine vollständige Lösung (z. B. case-insensitiver Vergleich nur auf Windows/macOS, Muster `normalisierePfadFuerVergleich` in `src/projekt-anlegen/index.ts`) bleibt für einen künftigen Auftrag offen — bewusst nicht in F42 WS-1 (Risiko einer falsch-positiven `'true'`-Meldung wiegt schwerer als eine unnötige Warnung).
Status: offen.
Feature/Run: F42 WS-1, 25.09.2026.

**F-704** · `TECH_DEBT` · P3 · offen
Titel: Der Trust-Hinweis erscheint nur beim Anlegen eines Projekts (Nächste Schritte), nicht als Warnung unmittelbar vor einem schreibenden Lauf.
Beschreibung: `POST /api/projekte` zeigt den Workspace-Trust-Status einmalig in der Erfolgsbox nach der Anlage (`naechste_schritte.trust`, F42 WS-1 AK7). Startet Stefan später — in einer neuen Sitzung, ohne den Anlage-Vorgang noch vor Augen zu haben — einen schreibenden Lauf gegen dieses Projekt, ohne den Trust-Dialog zwischenzeitlich bestätigt zu haben, gibt es keine erneute Warnung unmittelbar vor diesem Lauf. Bewusste Scope-Entscheidung von WS-1 (`features/F42/feature.md`, Nicht-Ziele: keine harte Sperre, nur Anzeige beim Anlegen) — nicht vergessen, sondern noch nicht als eigenständiger Bedarf bestätigt.
Fundstelle: `features/F42/feature.md` (Nicht-Ziele, AK7); `scripts/leitstand-server.mjs` (`POST /api/projekte`, einziger Ort, an dem `pruefeWorkspaceTrust` aufgerufen wird).
Auswirkung: Niedrig bis Mittel — betrifft nur den Fall, dass zwischen Projekt-Anlage und erstem schreibenden Lauf Zeit vergeht und Stefan den Trust-Schritt in der Zwischenzeit vergisst; der Lauf selbst scheitert dann sichtbar (F-690-Fehlermeldung im `stderr`), kein stiller Fehlschlag.
Maßnahme: Im für F41/F42 vorgesehenen Reallauf (WS-3-artiger Nachweis) beobachten, ob dieser Fall real auftritt; bei Bedarf eine zusätzliche Warnung vor einem schreibenden Lauf nachziehen (z. B. in der Lauf-Start-Bestätigung). Kein Umbau jetzt (YAGNI — noch keine reale Beobachtung).
Status: offen.
Feature/Run: F42 WS-1 Verifikation, 25.09.2026.

**F-706** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Challenger-Anweisungen fragten pro Commit+Push-Zyklus nur einmal um Freigabe — `state/freigabe-commit.md` gilt aber nur für den Commit, der Push blockierte.
Beschreibung: Beim F42-WS-1-CI-Fix gaben die Challenger-Anweisungen für den Ablauf "Freigabe einholen → committen → pushen" nur eine einzige Freigabe-Aufforderung aus. `state/freigabe-commit.md` (CLAUDE.md, Iterationsende) ist aber als Einmal-Bezeugung ausgelegt — sie gilt für GENAU den Commit, für den sie erteilt wurde, nicht zusätzlich für den nachfolgenden Push. Der Push blieb dadurch ohne gültige Freigabe stehen, obwohl der Mensch bereits einmal zugestimmt hatte.
Fundstelle: Terminal-Ablauf des F42-WS-1-CI-Fix-Zyklus (Commit + Push in einem Aufforderungsblock formuliert, ohne zwischen beiden zu trennen).
Auswirkung: Niedrig — kein Fehlverhalten am Kontrollzustand (der Push wurde korrekt blockiert statt fälschlich zugelassen), aber unnötige Reibung: der Mensch musste ein zweites Mal exakt denselben Vorgang freigeben, ohne dass die erste Anfrage das ausdrücklich ankündigte.
Maßnahme: Ein Terminal-Block, der Commit und Push in derselben Iteration vorschlägt, benennt beide Freigaben getrennt und ausdrücklich ("Freigabe → Commit", danach separat "Freigabe → Push"), statt sie als einen einzigen Freigabeschritt zu behandeln.
Status: offen.
Feature/Run: F42 WS-1 CI-Fix, 25.09.2026.

**F-708** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Zweimal in F42 (F-703, F-707) prüfte das Gate nur die reine Funktion, nicht den realen Aufrufer — die Lücke wurde erst in der Verifikation gefunden, nicht vom Gate selbst.
Beschreibung: F-703 (Coach-Text zeigte den rohen absoluten Programmpfad statt `npm run check`/`check:template`) und F-707 (`STACK_OFFEN_HINWEIS` erreichte den Architekten nie) teilen dasselbe Muster: eine neue, reine Funktion (`anzeigePruefbefehl` bzw. `istStackOffen`/der `stackOffen`-Parameter) wurde korrekt gebaut und isoliert getestet, aber der GATE-Test prüfte nur die Funktion selbst, nicht die Stelle im Server-Code, die sie tatsächlich mit echten Werten aufruft. Beide Bugs wurden dadurch erst bei einer nachträglichen Verifikation entdeckt, nicht vom `npm run check`-Lauf, der zum jeweiligen Commit gehörte.
Fundstelle: F-703 (`state/findings.md`, `src/product-coach/index.ts` vor dem Fix); F-707 (oben, `scripts/leitstand-server.mjs:4156` vor dem Fix). Beide im Kontext von F42.
Auswirkung: Mittel — kein akuter Schaden (beide Funde wurden vor einem Merge/Deploy gefangen), aber ein wiederkehrendes blindes Feld in der eigenen Gate-Praxis: ein Gate, das nur die Funktion, nie den Aufrufer prüft, bestätigt lediglich, dass der Code funktionieren WÜRDE, wenn er aufgerufen würde — nicht, dass er es wird.
Maßnahme: Bauaufträge sollen für jede neue Funktion, die von echtem Server-/Automatencode aufgerufen wird, ausdrücklich einen Gate-Nachweis AM REALEN AUFRUFPFAD verlangen (Muster `scripts/check-f39-architekt.mjs` (n3)/(n4)/(o) — ein Server mit `fuehreAufgabeDurchFn`-Attrappe, der den tatsächlich gereichten Wert abfängt), nicht nur einen Unit-Test der reinen Funktion. Kein Umbau bestehender Gates in diesem Fix — nur eine Vorgabe für künftige Bauaufträge.
Status: offen.
Feature/Run: F42 WS-2 Verifikation, 25.09.2026.

**F-709** · `TECH_DEBT` · P3 · offen
Titel: Commit-Message in „Nächste Schritte" nennt nur „Harness-Baseline (F41 WS-1)", obwohl seit F42 auch das Skelett kopiert wird.
Beschreibung: Die von `POST /api/projekte` vorgeschlagene Commit-Message (Schritt "Die angezeigten Git-Befehle im neuen Repo ausführen") beschreibt den ersten Commit weiterhin als "Initiale Kopie der Harness-Baseline (F41 WS-1)" — F42 kopiert seit WS-1 zusätzlich zur Baseline auch das Skelett (`vorlagen/projekt-skelett/`, Schicht 2), der Commit-Text spiegelt das nicht wider.
Fundstelle: `src/projekt-anlegen/index.ts` (Text der vorgeschlagenen Commit-Message in `naechste_schritte`).
Auswirkung: Niedrig — kein Funktionsfehler, aber eine irreführende erste Commit-Message in jedem neu angelegten Projekt, die den tatsächlichen Inhalt (Baseline + Skelett) nicht vollständig beschreibt.
Maßnahme: Text anpassen, z. B. "Initiale Kopie von Baseline und Skelett (F41/F42)".
Status: offen.
Feature/Run: F42 WS-3 Reallauf, 25.09.2026.

**F-710** · `TECH_DEBT` · P3 · offen
Titel: `check-rules.mjs` im Skelett verweist in seiner Ausgabe auf „SETUP.md Punkt 4" — `SETUP.md` ist nicht Teil des Skeletts.
Beschreibung: Real beobachtet beim `check:template`-Lauf im neu angelegten `haushaltsbuch2`: die Meldung von `scripts/check-rules.mjs` (Teil des kopierten Skeletts) verweist bei einem Regelverstoß auf „SETUP.md Punkt 4" — `vorlagen/projekt-skelett/` enthält aber kein `SETUP.md`, der Verweis läuft ins Leere.
Fundstelle: `vorlagen/projekt-skelett/scripts/check-rules.mjs` (Meldungstext); `vorlagen/projekt-skelett/` (fehlendes `SETUP.md`).
Auswirkung: Niedrig — kein Funktionsfehler des Gates selbst, aber eine tote Doku-Referenz, die Stefan bei einem echten Regelverstoß im neuen Projekt ins Leere laufen lässt.
Maßnahme: Meldung anpassen (auf eine tatsächlich vorhandene Stelle verweisen) oder `SETUP.md` selbst ins Skelett aufnehmen. Nicht in F42 WS-3 behoben (Nur-Doku-Auftrag).
Status: offen.
Feature/Run: F42 WS-3 Reallauf, 25.09.2026.

**F-716** · `BUG` · P3 · offen
Titel: Die Abnahme-Änderungsübersicht zeigt nicht, welche laut Anpassung zu entfernenden Dateien tatsächlich stehen geblieben sind.
Beschreibung: Nach der in F-715 beschriebenen Blockade (Löschungen strukturell unmöglich, Rest von Hand entfernt) bot die Abnahme-Änderungsübersicht im Leitstand keine Sicht darauf, welche der ursprünglich beanstandeten Dateien nach dem manuellen Aufräumen tatsächlich noch vorhanden waren — Stefan musste das selbst per `git status`/Diff nachvollziehen, statt sich auf die Übersicht verlassen zu können.
Fundstelle: Leitstand-Abnahme-Änderungsübersicht (Workflow-Detailansicht nach einer Korrekturschleife mit Löschbedarf).
Auswirkung: Niedrig — kein Datenfehler, nur eine fehlende Projektion; in diesem Lauf folgenlos, weil Stefan ohnehin manuell nachprüfte.
Maßnahme: Beobachten — kein Umbau, solange kein zweiter Fall dasselbe Muster zeigt (CLAUDE.md-Entscheidungsregel: eine einmalige Beobachtung ist noch kein Muster).
Status: offen.
Feature/Run: F42 WS-3, 25.09.2026.

**F-717** · `TECH_DEBT` · P3 · offen
Titel: `pruefeProjektmodusScope` ist bei isolierter Betrachtung nicht robust gegen Pfad-Tricks (`../`-Sequenzen) — die Entschärfung liegt unausgesprochen beim Aufrufer.
Beschreibung: Code-Review-Pass (F42-Review, 25.09.2026): `pruefeProjektmodusScope` (`src/architekt/index.ts:584-586`) prüft die Allowlist über naiven `startsWith('docs/')`/`startsWith('features/')`-Vergleich bzw. exakten Set-Vergleich gegen `'CLAUDE.md'`. Ein Pfad wie `docs/../scripts/x.mjs` würde `startsWith('docs/')` erfüllen und fälschlich als erlaubt durchgehen. In der Praxis ist das kein realer Bypass, weil der einzige Aufrufer (`src/aenderungsuebersicht/index.ts`, `parseUntrackedDateien`) ausschließlich `git status --porcelain`-Pfade liefert, die Git praktisch nie mit `../`-Sequenzen normalisiert — diese Entschärfung ist aber nirgends als bewusste Grenze dokumentiert oder getestet.
Fundstelle: `src/architekt/index.ts:584-586` (`pruefeProjektmodusScope`); `src/aenderungsuebersicht/index.ts:217-221` (`parseUntrackedDateien`, einziger Aufrufer).
Auswirkung: Niedrig — am real verdrahteten Aufrufpfad nicht ausnutzbar, aber die Funktion selbst wäre bei einem künftigen zweiten Aufrufer mit weniger kontrollierter Eingabe verwundbar, ohne dass das an der Funktion selbst sichtbar wäre.
Maßnahme: Entweder `pruefeProjektmodusScope` selbst gegen `path.normalize`/`..`-Sequenzen härten, oder die Annahme "Aufrufer liefert ausschließlich git-normalisierte Pfade" explizit als Bekannte Grenze im Kopfkommentar der Funktion dokumentieren und mit einem Regressionstest absichern.
Status: offen.
Feature/Run: F42-Review-Pass (code-reviewer), 25.09.2026.

**F-719** · `BUG` · P3 · offen
Titel: Unklar, ob `pruefeWorkspaceTrust` bei syntaktisch kaputtem `~/.claude.json` sauber `'fehlend'` liefert oder eine unbehandelte Exception wirft.
Beschreibung: QA-Pass (F42-Review, 25.09.2026): Das Gate (`scripts/check-f42-projekt-harness.mjs`, Block e) testet vier Fixture-Varianten, darunter "Datei fehlt" — aber keinen Fall, in dem `~/.claude.json` existiert, aber kein valides JSON enthält (z. B. durch einen Absturz während eines Schreibvorgangs beschädigt). Nicht verifiziert, ob `JSON.parse` in diesem Fall abgefangen wird.
Fundstelle: `src/projekt-anlegen/index.ts` (`pruefeWorkspaceTrust`); `scripts/check-f42-projekt-harness.mjs` Block (e) (vier Fixture-Varianten, kein Malformed-JSON-Fall).
Auswirkung: Niedrig bis Mittel — ein Nutzer mit einer durch einen Absturz beschädigten `~/.claude.json` bekäme im schlechtesten Fall einen unbehandelten Fehler bei `POST /api/projekte` statt eines sauberen `'fehlend'`-Status.
Maßnahme: Fixture mit ungültigem JSON-Inhalt ergänzen, `pruefeWorkspaceTrust` bei Bedarf mit try/catch um den Parse-Aufruf härten.
Status: offen.
Feature/Run: F42-Review-Pass (qa), 25.09.2026.

**F-720** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Kein Laufzeit-Hinweis, dass `state/tooling.md` im neu kopierten Skelett noch Template-eigenen Inhalt trägt.
Beschreibung: QA-Pass (F42-Review, 25.09.2026): Die in `features/F42/feature.md` ("Bekannte Grenzen") dokumentierte Lücke — `state/tooling.md` im Skelett enthält Template-Beispielzeilen (gitleaks, `ponytail`-Versionspin), nicht Angaben zum neuen Projekt — ist ausschließlich in `vorlagen/projekt-skelett/HERKUNFT.md` schriftlich festgehalten, aber weder in der `POST /api/projekte`-Erfolgsbox noch im Coach-Auftrag sichtbar (anders als der Trust-Hinweis, AK7). Ein Nutzer, der `HERKUNFT.md` nicht von sich aus liest, hält `state/tooling.md` für gültige Angaben zum neuen Projekt.
Fundstelle: `features/F42/feature.md` Zeile 339–345 (Grenze dokumentiert); `vorlagen/projekt-skelett/HERKUNFT.md`; `public/leitstand/views/projekte-uebersicht.js` (`zeigeAnlegenErfolg`, kein Hinweis auf diese Grenze).
Auswirkung: Niedrig — reine Doku-Falle, wird erst beim ersten `werkzeug-auswahl`-Lauf im neuen Projekt relevant (dort laut feature.md ohnehin zu korrigieren).
Maßnahme: Analog zu AK7 einen kurzen Hinweis in `naechste_schritte` ergänzen ("state/tooling.md enthält noch Template-Beispielinhalt, beim ersten werkzeug-auswahl-Lauf korrigieren").
Status: offen.
Feature/Run: F42-Review-Pass (qa), 25.09.2026.

**F-721** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: WS-4 (Regel 1g/1h, F-712/F-714-Fix) ist bislang nur gegen ein synthetisches Wegwerf-Git-Repo im Gate belegt, nicht gegen einen erneuten realen Fremdprojekt-Durchlauf.
Beschreibung: QA-Pass (F42-Review, 25.09.2026): Der WS-3-Reallauf gegen `haushaltsbuch2` (der die F-712/F-714-Lücken erstmals real aufdeckte) fand zwangsläufig VOR WS-4 statt. WS-4s Nachweis (`scripts/check-f42-projekt-harness.mjs` Blöcke g/h) läuft gegen ein echtes, aber synthetisches `git init`-Wegwerf-Repo mit HTTP-Request-Handler — ein starker, aber anderer Nachweisgrad als ein dritter, vollständiger Fremdprojekt-Durchlauf, der belegt, dass genau der ursprünglich beobachtete Fall (`3e0c0a31`) durch WS-4 jetzt tatsächlich verhindert würde. `features/F42/feature.md` formuliert das selbst korrekt ("gegen ein echtes Wegwerf-Git-Repo"), die Kernaussage in `features/F42/nachweis-ws3-reallauf.md` könnte aber bei oberflächlicher Lektüre als "auch WS-4 im Fremdprojekt bestätigt" missverstanden werden.
Fundstelle: `features/F42/feature.md` Zeile 111–116; `features/F42/nachweis-ws3-reallauf.md` Zeile 27–37 (Kernaussage nennt nur WS-1/WS-2 als im Fremdprojekt bestätigt, kein WS-4-Wiederholungslauf vorhanden).
Auswirkung: Niedrig bis Mittel — kein Beleg dafür, dass etwas falsch ist, sondern eine Lücke im Nachweisgrad: der stärkste verfügbare Beleg für WS-4 ist synthetisch, nicht ein dritter Fremdprojekt-Durchlauf.
Maßnahme: Bei nächster Gelegenheit (z. B. einem dritten Fremdprojekt oder einem erneuten Durchlauf gegen `haushaltsbuch2`) gezielt den ursprünglichen F-712/F-714-Auslösefall wiederholen und belegen, dass WS-4 ihn tatsächlich verhindert.
Status: offen.
Feature/Run: F42-Review-Pass (qa), 25.09.2026.

**F-722** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Sechs untracked Dateien `state/nachweis-runde2-*` unbekannter Herkunft im Repo — Risiko versehentlichen Stagens.
Beschreibung: Entdeckt beim F42-WS-3-Doku-PR: `state/nachweis-runde2-chat-verlauf.json`, `state/nachweis-runde2-turn1-detail.json` bis `-turn5-detail.json` sowie `state/nachweis-runde2-turns.sh` liegen untracked im Arbeitsverzeichnis, ohne dass ihre Herkunft (welcher Lauf, welches Feature) dokumentiert ist. Solange sie untracked bleiben, besteht das Risiko, dass ein künftiges `git add` (insbesondere ein unbedachtes `-A`/`.`) sie versehentlich mit committet, ohne dass ihr Inhalt geprüft wurde.
Fundstelle: `state/nachweis-runde2-chat-verlauf.json`, `state/nachweis-runde2-turn1-detail.json` … `-turn5-detail.json`, `state/nachweis-runde2-turns.sh` (Repo-Wurzel, `git status --short`).
Auswirkung: Niedrig — kein aktueller Schaden, aber eine wiederkehrende stille Gefahr bei jedem breiten `git add`, solange die Dateien weder committet noch ignoriert sind.
Maßnahme: Herkunft klären (welcher Lauf/Feature hat sie erzeugt), dann je nach Ergebnis: committen (falls Nachweis-relevant), an einen geeigneten Ablageort verschieben, oder in `.gitignore` aufnehmen (falls Wegwerf-Artefakt).
Status: offen.
Feature/Run: F42 WS-3 Doku-PR, 25.09.2026.

**F-723** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Der F35-Schnitt vom 20.09. ist teilweise durch F39, F42, F652 (`src/pruefschritt`) und F-648 (`src/korrekturschleife`) überholt.
Beschreibung: F35 (Challenge-Flow: Challenge-Schema, `qa`-Schritt, ADJUST-Automatik nach E-M5-4, Befund-Projektion) wurde am 20.09.2026 geschnitten, bevor F39 (Rolle `architekt`, `hoch`-Kette, Regel 1c/`haltKlaerung`), F42 (Projekt-Harness), der Prüfschritt-Fixpaket F652 (`src/pruefschritt`) und die Korrekturschleife F-648 (`src/korrekturschleife`) real gebaut waren. Der ursprüngliche F35-Zuschnitt trifft diesen inzwischen gewachsenen Ist-Stand nicht mehr — ein Teil dessen, was F35 liefern sollte (ADJUST-Automatik, Korrekturschleife), existiert im Repo bereits in anderer Form.
Fundstelle: `features/F39/feature.md`, `features/F42/feature.md`, `src/pruefschritt/`, `src/korrekturschleife/`.
Auswirkung: Mittel — ein F35-Auftrag auf Basis des alten Schnitts würde entweder bereits Vorhandenes duplizieren oder an einer falschen Schnittstelle ansetzen.
Maßnahme: Die F35-Challenge (vor dem Bau, laut E-M5-16) muss den Feature-Schnitt neu gegen den realen Repo-Stand (F39, F42, F652, F-648) führen, nicht gegen den Stand vom 20.09.2026.
Status: erledigt (F35-Akte) — `features/F35/feature.md` wurde am 25.09.2026 gegen den realen Repo-Stand geschnitten (WS-1 „Feature bauen aus Akte" statt des alten Challenge-Flow-Schnitts; qa-Schritt/Advisor-Schema/Befund-Projektion als V1-Backlog mit Auslöser statt als Teil des Scopes).
Feature/Run: M5-Schnitt, 25.09.2026; F35-Akte F35 WS-1, 25.09.2026.

**F-725** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: „Design" steht in der M5-Reihenfolge ohne eigenen Scope, Akte und Bestehensbedingung.
Beschreibung: `docs/projekt/zielfassung.md` §13.6 nennt „Design" als eigenen Schritt in der M5-Reihenfolge (zwischen dem V1-Backlog-Vorlauf und F30), ohne dass dafür eine Feature-Akte, ein Scope oder eine eigene Bestehensbedingung existiert — anders als jeder andere Schritt der Kette.
Fundstelle: `docs/projekt/zielfassung.md` §13.6, Reihenfolge-Zeile.
Auswirkung: Mittel — ohne eigenen Scope droht „Design" entweder übersprungen oder unkontrolliert groß zu werden, wenn die Kette ihn erreicht.
Maßnahme: Vor Erreichen dieses Punkts einen eigenen Schnitt (Scope, Akte, Bestehensbedingung) für „Design" anlegen, analog zu den übrigen Kettengliedern.
Vermerk (Scope-Ergänzung 29.09.2026): (1) Ablage der von Stefan mitgebrachten Designvorlage im Projekt-Repo (Tokens, Referenz-Screenshots, gewählte Richtung); (2) design-guardian als Review-Schritt bei UI-Aufträgen mit Playwright-Screenshots; (3) Motion mit Prüfweg (Screenshot-Sequenz/Video, prefers-reduced-motion).
Status: offen.
Vermerk (F44 WS-0, 30.09.2026): Akte `features/F44/feature.md` „Design-Schnitt (F-725)“ angelegt, Status IN_ARBEIT. Schnitt WS-0 bis WS-8 nach dem Challenger-Dokument 474 (`GO_STANDARD`), übernommen als `docs/design/abgleich-f725.md`; Entscheidungen E-F44-1 = B (Zukunft sichtbar, deaktiviert, „kommt“) und E-F44-2 = B (de/en/tr/ru), Stefan 30.09.2026. WS-0 (Ablage der Vorlage unter `docs/design/vorlage-v10/`, 50 Referenz-Screenshots mit Motion-Serie, design-guardian, Token-Gate) auf Branch `feat/f725-ws0-design-ablage`.
Feature/Run: M5-Schnitt, 25.09.2026.

**F-726** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Zurückgestellte Features hatten bislang keinen Mechanismus, ihren eigenen Bedarf zu erkennen.
Beschreibung: F37 und F38 (und die in E-M5-1 nach F30 übertragenen Posten) wurden ins Backlog verschoben, ohne dass die Workforce selbst erkennen konnte, wann ihr Bau wieder nötig wird — der Rückstellung fehlte ein Rückkehr-Mechanismus. Gelöst über E-M5-16: ein Abschnitt „Auslöser" in der Feature-Akte (messbare Bedingung), ein strukturiertes Eingriffsprotokoll in F30, und eine Meldung des erfüllten Auslösers durch Jarvis als Empfehlung.
Fundstelle: `docs/projekt/zielfassung.md` §13.6 E-M5-16; `features/F37/feature.md`, `features/F38/feature.md` (Abschnitt „Auslöser").
Auswirkung: Niedrig — die Lücke ist mit E-M5-16 bereits konzeptionell geschlossen; dieses Finding hält den Zustand vor der Entscheidung fest und verweist auf F30 als Umsetzungsort des Eingriffsprotokolls.
Maßnahme: F30 muss das strukturierte Eingriffsprotokoll (Klasse, `bezug_backlog`) real umsetzen; Jarvis muss einen erfüllten Auslöser als Empfehlung melden können.
Status: offen.
Feature/Run: M5-Schnitt, 25.09.2026.

**F-727** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Den drei Backlog-Posten aus E-M5-17 (Kollege-Durchlauf, Import-Wizard, Health-Projektion) fehlt der Auslöser.
Beschreibung: E-M5-17 verschiebt drei Posten (Kollege-Durchlauf, Import-Wizard, Health-Projektion) ins V1-Backlog, ohne für sie — anders als beim übrigen V1-Backlog (Muster F-511, F37/F38 über E-M5-16) — eine messbare Auslöser-Bedingung festzuhalten.
Fundstelle: `docs/projekt/zielfassung.md` §13.6 E-M5-17.
Auswirkung: Niedrig — die Posten sind bereits zurückgestellt, ohne Auslöser aber nicht erkennbar, wann ihr Bau wieder ansteht.
Maßnahme: Beim Anlegen der F30-Akte je Posten eine Auslöser-Zeile nachtragen (Muster F-511/F-726).
Status: offen.
Feature/Run: F35 WS-1, 25.09.2026.

**F-728** · `BUG` · P1 · in Arbeit (F35 WS-1)
Titel: Die AKs einer Feature-Akte erreichen den Bau-Auftrag nicht.
Beschreibung: Feature-Akten haben kein Click-to-Work (nur Findings, `public/leitstand/views/workboard.js` `baueAuftragstext`/`renderBearbeitungsAbschnitt`), und `FeatureWorkitem` (`src/workboard/types.ts`) trägt keine Akzeptanzkriterien. Ohne diese Kopplung ist die M5-Bestehensbedingung 2 (jedes AK trägt am Ende ein Urteil im Review) strukturell unerfüllbar — ein Auftrag, der aus einer Feature-Akte entsteht, trägt heute weder Ziel/Nicht-Ziele noch AK strukturiert.
Fundstelle: `public/leitstand/views/workboard.js`; `src/workboard/types.ts`; `docs/projekt/zielfassung.md` (M5-Bestehensbedingung 2).
Auswirkung: Hoch — M5 kann ohne diese Kopplung nicht bestehen.
Maßnahme: F35 WS-1 (`baueAuftragAusFeatureAkte`, `POST /api/projekte/<id>/features/<id>/auftrag`, Workboard-Button „Bauen").
Status: in Arbeit (F35 WS-1).
Feature/Run: F35 WS-1, 25.09.2026.

**F-729** · `BUG` · P2 · in Arbeit (F35 WS-1)
Titel: fast-lane hat keinen `code-reviewer`-Schritt — ein Feature-Bau könnte ohne Urteil je AK durchlaufen.
Beschreibung: `workflow-vorlagen/fast-lane.json` trägt keinen `code-reviewer`-Schritt. Sobald ein aus einer Feature-Akte abgeleiteter Auftrag (F-728) über den Router auf `fast-lane` klassifiziert würde, liefe der Bau ohne jedes Urteil über die mitgegebenen Akzeptanzkriterien durch.
Fundstelle: `workflow-vorlagen/fast-lane.json`; `src/router/index.ts` (`bestimmeEffektiveKontrolltiefe`).
Auswirkung: Mittel — ein Feature-Bau könnte unbemerkt ohne Review-Urteil je AK abgeschlossen werden.
Maßnahme: Kontrolltiefe-Untergrenze `standard` für `herkunft.art: 'feature_akte'` (Muster `projekt_interview` → `hoch`, F39 WS-2a) — fast-lane damit für diese Herkunft ausgeschlossen, `hoch` bleibt möglich.
Status: in Arbeit (F35 WS-1).
Feature/Run: F35 WS-1, 25.09.2026.

**F-731** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: `qa`/`code-reviewer`/`architecture-advisor` existieren gleichnamig als Harness-Subagent UND als Workforce-Rolle, ohne dass das Glossar beide erklärt.
Beschreibung: `qa`, `code-reviewer` und `architecture-advisor` existieren gleichnamig als Harness-Subagent (`.claude/agents`) und als Workforce-Rolle (`src/rollen`) mit getrennten Instruktionen; `docs/harness/HARNESS-GLOSSARY.md` erklärt nur `architecture-advisor`.
Fundstelle: `.claude/agents/*.md`; `src/rollen/index.ts` (ROLLENVERTRAEGE); `docs/harness/HARNESS-GLOSSARY.md`.
Auswirkung: Niedrig — Verwechslungsgefahr für einen Menschen, der die beiden Ebenen nicht kennt; kein Laufzeitrisiko (getrennte Instruktionen bleiben tatsächlich getrennt).
Maßnahme: Glossar ergänzen; mittelfristig eine gemeinsame Instruktionsquelle.
Status: offen.
Feature/Run: F35 WS-2, 25.09.2026.

**F-737** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: `zustand:sichern` lässt HEAD auf dem Zustandsbranch mit gestagtem Index stehen, ohne vor parallelen Sitzungen und vor `checkout main` vor dem Merge zu warnen.
Beschreibung: Nach `npm run zustand:sichern` steht HEAD auf `zustand/<datum>`, `kontrollzustand/` ist gestagt. Bis Merge und Pull darf niemand den Arbeitsbaum wechseln. Die Skriptausgabe sagt das nicht, und der Terminal-Block des Challengers führte `git checkout main` im selben Einfüge-Block vor dem Web-Merge aus.
Fundstelle: `scripts/zustand-sichern.mjs` (Ausgabe der nächsten Befehle); Terminal-Block des Challengers zur ersten Sicherung.
Auswirkung: Mittel — am 25.09.2026 lief `git checkout main` vor dem Merge von #261 und setzte `kontrollzustand/` lokal zurück; nach dem Merge und Pull war der Stand wieder da, kein Verlust.
Maßnahme: Skriptausgabe mit Warnhinweis, Merge und Pull als eigener Schritt (offen). Verhaltensregeln zu Wartepunkten und zur Ruhe zwischen `zustand:sichern` und Merge+Pull in `docs/harness/HARNESS-LEARNING-STATE.md` sind erledigt (docs/harness-gedaechtnis).
Status: offen (Regeln erledigt, Skriptausgabe offen).
Feature/Run: erste Sicherung, 25.09.2026.

**F-742** · `TECH_DEBT` · P2 · offen
Titel: state/findings.md mit über 10.000 Zeilen.
Beschreibung: Die Datei ist schwer lesbar und für Werkzeuge teuer zu laden; der Großteil der Findings ist erledigt.
Fundstelle: `state/findings.md`; Parser `src/workboard/findings.ts`.
Auswirkung: Gering bis mittel — Lesekosten je Sitzung, Gefahr übersehener offener Findings.
Maßnahme: erledigte Findings archivieren, den Parser `src/workboard/findings.ts` anpassen, die IDs stabil halten. Nach F36.
Status: offen.
Feature/Run: harness-gedaechtnis, 26.09.2026.

**F-744** · `BUG` · P2 · offen
Titel: Ein gescheiterter Worker-Lauf zeigt im Leitstand nur „kein Ergebnistext im Rohstrom“, nicht die Ursache (z. B. 401, Verbindungsabbruch).
Beschreibung: Endet ein Worker-Lauf mit exit ≠ 0 ohne Ergebnis, sieht der Mensch im Leitstand nur den Sammeltext „kein Ergebnistext im Rohstrom“. Die eigentliche Ursache (Authentifizierungsfehler, Verbindungsabbruch) steht nur im Rohstrom.
Fundstelle: Leitstand-Laufansicht / Rohstrom-Projektion (`scripts/leitstand-server.mjs`, `baueRohstromProjektion`).
Auswirkung: Mittel — die Ursache eines Abbruchs ist ohne Blick in die Rohdatei nicht erkennbar.
Maßnahme: bei exit ≠ 0 ohne Ergebnis die letzte `type:"error"`-Meldung (codex-stdout) bzw. stderr anzeigen, API-Schlüssel maskiert; nur Anzeige, keine Klassifikation aus Konsolentext (ARCHITECTURE.md §4/§7).
Status: offen.
Feature/Run: F35-Reallauf Z1, 26.09.2026.

**F-745** · `BUG` · P3 · offen
Titel: Die Workflow-Ansicht öffnet entscheidung-router-*-Artefakte als ungültigen Workflow, mit aktiven Knöpfen.
Beschreibung: Ein `entscheidung-router-*`-Artefakt erscheint in der Workflow-Ansicht als Workflow, wird als ungültig angezeigt und trägt trotzdem aktive Bedienknöpfe.
Fundstelle: `public/leitstand/views/workflows.js` (Auswahl der angezeigten Artefakte).
Auswirkung: Gering — irreführende Anzeige, Knöpfe ohne sinnvolle Wirkung.
Maßnahme: `entscheidung-router-*` aus der Workflow-Liste herausfiltern oder als eigene Art anzeigen; Knöpfe bei ungültigem Workflow deaktivieren.
Status: offen.
Feature/Run: F35-Reallauf, 26.09.2026.

**F-746** · `TECH_DEBT` · P2 · offen
Titel: Reviewer (standard/hoch) und Architekt (hoch) hängen allein am Worker codex, ohne erklärten Fallback.
Beschreibung: Fällt codex aus (real beobachtet: Codex-Störung), stehen Review und Architekturentwurf still; ein Ausweichweg ist weder vorgesehen noch dokumentiert.
Fundstelle: `workflow-vorlagen/standard.json`, `workflow-vorlagen/hoch.json`.
Auswirkung: Mittel — eine externe Störung blockiert den ganzen Pfad.
Maßnahme: im Design-Schnitt bzw. F30 bewerten; kein stiller Fallback (ARCHITECTURE.md §4).
Status: offen.
Feature/Run: F35-Reallauf, 26.09.2026 (Codex-Störung).

**F-747** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: codex-CLI schreibt „failed to refresh available models: request timed out“ auf stderr, läuft aber weiter.
Beschreibung: Die Meldung erscheint auf stderr, ohne dass der Lauf scheitert. Wird stderr künftig angezeigt (F-744), könnte sie fälschlich als Ursache eines Abbruchs erscheinen.
Fundstelle: codex-Rohstrom (stderr) im F35-Reallauf.
Auswirkung: Gering — nur Anzeige.
Maßnahme: beobachten, ob der Leitstand das als Ursache anzeigt (Bezug F-744).
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-748** · `BUG` · P2 · offen
Titel: Router-`rueckfragen` werden außer der Validierung nirgends verwendet: nicht angezeigt, nicht an Folgeschritte übergeben, kein Halt.
Beschreibung: Der Router darf Rückfragen ausgeben; sie werden validiert und danach verworfen. Der Mensch sieht sie nicht, Folgeschritte kennen sie nicht, der Workflow hält nicht.
Fundstelle: `src/router/index.ts` (~Z. 125, Validierung von `rueckfragen`).
Auswirkung: Mittel — offene Fragen des Routers gehen still verloren.
Maßnahme: anzeigen und Antwort als Auftragsergänzung übernehmen oder halten.
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-749** · `BUG` · P3 · offen
Titel: Laufakte deklariert `codex-cli 0.153.4` statisch; installiert war 0.157.0.
Beschreibung: Die Werkzeugversion in der Laufakte stammt aus `worker.codex.versionDeklariert` der Startvorlage, nicht aus dem tatsächlich gestarteten Programm.
Fundstelle: `startvorlagen/ai-workforce.json` (`worker.codex.versionDeklariert`), Laufakte des Architekt-Laufs.
Auswirkung: Gering — die Laufakte trägt eine falsche Versionsangabe.
Maßnahme: Version beim Start lesen.
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-751** · `TECH_DEBT` · P2 · offen
Titel: Urteil des architecture-advisor (real BEREIT_NACH_KORREKTUR) ist nicht maschinenlesbar und hält den Workflow nie.
Beschreibung: Regel 1d prüft nur, ob eine `Urteil:`-Zeile vorhanden ist. Ein BEREIT_NACH_KORREKTUR oder BLOCKIERT lässt den Workflow trotzdem weiterlaufen; die Korrekturpunkte erreichen die Ausführung nicht gezielt.
Fundstelle: `src/architecture-advisor/index.ts` (`leseUrteilAusAdvisorText`), `src/workflow/index.ts` (Regel 1d).
Auswirkung: Mittel — ein Prüfurteil ohne Wirkung.
Maßnahme: schematisieren oder im Freigabe-Block der Ausführung anzeigen; Kopplung an F36-Backlog „Rolle mit Output-Schema und Urteil“.
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-755** · `TECH_DEBT` · P2 · offen
Titel: LEITSTAND_*-Umgebungsvariablen des Servers erreichen das `npm run check` der Ausführung.
Beschreibung: Seit E-F754 startet die Ausführung Prüfbefehle selbst. Ihr Bash-Kindprozess erbt die Umgebung des claude-Kindprozesses, also auch `LEITSTAND_*` des Servers. Der Kern-Prüfschritt entfernt diese Variablen (`entferneLeitstandUmgebungsvariablen`, F-652), der claude-Kindprozess nicht. Läuft ai-workforce selbst als Projekt, können dessen Gates dadurch falsch rot oder grün werden.
Fundstelle: `src/claude-code-gateway/prozessstart.ts` (spawn mit `{ ...process.env, … }`), `src/pruefschritt/index.ts` (`entferneLeitstandUmgebungsvariablen`).
Auswirkung: Mittel — Selbstprüfung der Ausführung kann verfälscht sein; der verbindliche Kern-Prüfschritt ist nicht betroffen.
Maßnahme: `LEITSTAND_*` für 'ausfuehrung'-Läufe aus der Umgebung des Kindprozesses entfernen (Muster `entferneLeitstandUmgebungsvariablen`).
Status: offen.
Feature/Run: fix/f35-reallauf-fixpaket, Review-Pass, 28.09.2026.

**F-757** · `BUG` · P2 · offen
Titel: „Status: Entschieden“ in einem ADR heißt nicht, dass ein Mensch entschieden hat.
Beschreibung: `leseEntschiedeneAdrs` macht jedes ADR mit `Status: Entschieden` für Architekt und Advisor bindend (F-750). In haushaltsbuch2 hat der gescheiterte Lauf 7873df97 ADR-0004 selbst mit diesem Status geschrieben, ohne menschliche Entscheidung. Teil 1 der Feature-Instruktion erzeugt weitere solche ADRs.
Fundstelle: `src/architekt/index.ts` (`leseEntschiedeneAdrs`, `baueUmsetzungsInstruktion`), haushaltsbuch2 `docs/adr/0004-…`.
Auswirkung: Mittel — eine KI-Festlegung kann als bindende Projektentscheidung weiterwirken.
Maßnahme: Die Ausführung schreibt ADR-Entwürfe mit Status „Vorgeschlagen“, der Mensch setzt „Entschieden“ — oder das ADR verweist auf ein Entscheidungsartefakt. Im Design-Schnitt klären.
Status: offen.
Feature/Run: fix/f35-reallauf-fixpaket, QA-Pass, 28.09.2026.

**F-758** · `BUG` · P3 · offen
Titel: Stack-Instruktion und ADR-Regel passen nicht zu jeder Lage.
Beschreibung: (1) `baueStackEntscheidungsInstruktion` verlangt „Lege ein ADR an“, auch wenn ein entschiedenes Stack-ADR schon existiert (haushaltsbuch2 ADR-0003) — wahrscheinliche Folge ein doppeltes Stack-ADR; einen Verweis im bestehenden ADR akzeptiert Regel 1h bereits (`traegtAdrVerweisAufEntscheidung`), die Instruktion sagt das nicht. (2) Die ADR-Regel „als eigene Entscheidung (kategorie 'sonstig') vorlegen“ richtet sich an das JSON des Architekten; der Advisor antwortet in Prosa ohne `entscheidungen_mensch` und bräuchte „als Befund melden“. Der Vertrag verlangte beide wortgleich.
Fundstelle: `src/architekt/index.ts` (`baueStackEntscheidungsInstruktion`, `ADR_BLOCK_REGEL`), `src/architecture-advisor/index.ts`.
Auswirkung: Gering — doppelte ADRs, unpassende Anweisung an den Advisor.
Maßnahme: Instruktion um „oder den Verweis im bestehenden Stack-ADR ergänzen“ erweitern; für den Advisor eine eigene Regelzeile.
Status: offen.
Feature/Run: fix/f35-reallauf-fixpaket, QA- und Review-Pass, 28.09.2026.

**F-759** · `BUG` · P3 · offen
Titel: Ein direkter Link `#/workflows/<id>` sucht nur im gerade aktiven Projekt und endet sonst in 404, ohne das Projekt zu nennen.
Beschreibung: `public/leitstand/projekt-kontext.js` löst einen Deep-Link `#/workflows/<id>` gegen das Projekt auf, das die Oberfläche gerade geladen hat — zeigt der Link auf einen Workflow eines ANDEREN Projekts, bekommt der Mensch ein bloßes 404, ohne dass die Seite sagt, welches Projekt gemeint war oder wie er dorthin wechselt.
Fundstelle: `public/leitstand/projekt-kontext.js`.
Auswirkung: Gering — betrifft nur projektübergreifend geteilte Links (z. B. aus einer Benachrichtigung), keine Kernfunktion.
Maßnahme: Projekt-Id in die Route aufnehmen (`#/projekte/<projektId>/workflows/<id>`) oder die 404-Meldung um einen Projekt-Hinweis/Wechsel-Link ergänzen — Design-Schnitt (welche Variante) noch offen.
Status: offen.
Feature/Run: fix/f760-verweigert-bau, 28.09.2026 (beim F35-Reallauf-Nachlauf entdeckt, nicht Teil dieses Fixes).

**F-761** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Projekt-CLAUDE.md-Vorlage lässt die Ausführung „Status: Blockiert“ ausgeben, obwohl nur der Commit durch den Menschen aussteht.
Beschreibung: CLAUDE.md verlangt am Ende jeder Ausgabe eines der vier Status-Kästchen (Freigegeben / Freigegeben mit Hinweisen / Nicht freigegeben / Blockiert) — keines davon passt auf die Lage „gebaut, geprüft, grün, wartet nur auf die menschliche Commit-Freigabe“ (KEINE Commits ohne explizite Freigabe ist selbst Teil derselben Vorlage). Eine Ausführung wählt in diesem Fall typischerweise „Blockiert“, was den Eindruck eines echten Problems erweckt, obwohl planmäßig nur der Mensch am Zug ist.
Fundstelle: CLAUDE.md (Abschnitt „Status-Format“), Projekt-Vorlage.
Auswirkung: Gering — irreführender, aber folgenloser Statustext; kein Fachfehler.
Maßnahme: Fünftes Kästchen ergänzen (z. B. „Bereit zum Commit — wartet auf Freigabe“) oder den Vorlagentext klarstellen, dass „Blockiert“ ein echtes Hindernis meint. Design-Schnitt am Harness-Template, nicht an diesem Projekt allein.
Status: offen.
Feature/Run: fix/f760-verweigert-bau, 28.09.2026 (beim F35-Reallauf-Nachlauf entdeckt, nicht Teil dieses Fixes).

**F-762** · `TECH_DEBT` · P2 · offen
Titel: Race in `fuehreNachlaufAus` — parallele Testprozesse löschen Je-PID-Dateien zwischen `readdirSync` und `readFileSync`, der Nachlauf scheitert sporadisch mit ENOENT.
Beschreibung: `fuehreNachlaufAus` listet mit `readdirSync(RESTE_VERZEICHNIS)` alle Je-PID-Dateien und liest jede danach mit `readFileSync`. Laufen mehrere Testprozesse parallel, kann ein anderer Prozess seine Datei zwischen Auflisten und Lesen bereits gelöscht haben — `readFileSync` wirft ENOENT, der Nachlauf bricht ab. Real beobachtet als einmalig rotes CI in PR #265, ohne Code- oder Konfigurationsänderung.
Fundstelle: `scripts/aufraeumen-nachlauf.mjs` (~Z. 33–41, `fuehreNachlaufAus`).
Auswirkung: Mittel — sporadisch rotes CI ohne echten Fehler, kostet Wiederholungsläufe und untergräbt das Vertrauen in rote Läufe.
Maßnahme: ENOENT je Datei tolerieren (Datei überspringen, beim `unlinkSync` ebenso).
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-763** · `BUG` · P3 · offen
Titel: Die Abnahme-Knöpfe (Annehmen/Ablehnen/Anpassung) sind in der Workflow-Detailansicht aktiv, während die Ausführung LAEUFT.
Beschreibung: Im Reallauf zeigte die Workflow-Detailansicht die drei Abnahme-Knöpfe auch bei Workflow-Status `LAEUFT`. Geprüft (28.09.2026, Quelltext): Der Server lehnt den Klick in diesem Zustand ab — `POST /api/workflows/<id>/abnahme` antwortet mit 409 für `ANGENOMMEN` außer bei `ABGESCHLOSSEN` und für `ABGELEHNT`/`ANPASSUNG_ANGEFORDERT` außer bei `ABGESCHLOSSEN`/`KLAERUNG_ERFORDERLICH`. Daher P3 statt der vorgeschlagenen P2: reiner Anzeigefehler, keine falsche Entscheidung möglich.
Fundstelle: `public/leitstand/views/workflows.js` (Abnahme-Bereich der Detailansicht); serverseitige Sperre `scripts/leitstand-server.mjs` (Handler ab ~Z. 7973, Statusprüfungen ~Z. 8020–8036).
Auswirkung: Gering — der Mensch sieht Handlungsoptionen, die der Server ablehnt; verwirrend, aber folgenlos.
Maßnahme: Knöpfe nur zeigen, wenn der Workflow-Status die jeweilige Abnahme erlaubt — dieselbe Statustabelle wie der Server.
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-765** · `BUG` · P2 · offen
Titel: Die Ausführung schreibt eine Kern-Entscheidung dem Menschen zu und dokumentiert sie als entschieden.
Beschreibung: haushaltsbuch2 ADR 0006 (Lauf `630e4282`) begründet sich mit der „menschlichen Abnahme-Entscheidung" und trägt „Status: Entschieden". Tatsächlich war die zugrundeliegende `ANPASSUNG_ANGEFORDERT` eine automatische Anpassung des Kerns (Abnahme-Version 2, `herkunft.erzeuger 'kern'`). Ursache im Harness: Die Korrektur-Instruktionen stellen jede Abnahme-Begründung als menschliche dar, unabhängig vom Erzeuger — `baueAusfuehrungKorrekturInstruktion` („der Mensch hat … ‚Anpassung anfordern' gewählt") und `baueReviewKorrekturInstruktion` („Verbindliche Klarstellung des Auftrags durch den Menschen"). Bezug F-757.
Fundstelle: `src/korrekturschleife/index.ts:50`, `:86`; haushaltsbuch2 `docs/adr/0006-erster-schreibender-http-zugriff-mit-ursprungspruefung.md` Z. 3, 16, 25.
Auswirkung: Mittel — die Entscheidungshistorie des Projekts wird verfälscht; eine Kern-Heuristik erscheint als menschlich autorisierte, bindende Entscheidung.
Maßnahme: `erzeuger` (mensch/kern) der Entscheidungs-Eingaben im Auftragstext sichtbar machen (beide Instruktionen je nach Erzeuger formulieren); Instruktion ergänzen: Kern-Entscheidungen nie als menschliche dokumentieren.
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-766** · `TECH_DEBT` · P2 · offen
Titel: Der Kontrollzustand von Fremdprojekten ist gitignored; Reallauf-Evidenz im Projekt ist ungesichert.
Beschreibung: haushaltsbuch2 `.gitignore` Zeile 1 schließt `kontrollzustand/` aus, während ai-workforce seinen eigenen Kontrollzustand trackt (F-733, `zustand:sichern`). Die Belege des F35-Reallaufs (Workflow-, Abnahme-, Lauf-Checkpoints) existieren nur lokal; `features/F35/nachweis-reallauf.md` ist ihre einzige versionierte Sicherung.
Fundstelle: haushaltsbuch2 `.gitignore` Z. 1; Projekt-Skelett (`src/projekt-anlegen/`); `zustand:sichern` (F-733).
Auswirkung: Mittel — ein Verlust des Arbeitsordners vernichtet die Nachweisbasis; ein späterer Review kann Aussagen nicht mehr gegen den Kontrollzustand prüfen.
Maßnahme: Projekt-Skelett und `zustand:sichern` auf Fremdprojekte ausweiten oder bewusst lokal lassen — Entscheidung Stefan.
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-767** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Coach-Akten formulieren AK ohne Zugangsweg; das Review verlangt Bedienbarkeit über die Anwendung, was eine zusätzliche ADJUST-Iteration kostet.
Beschreibung: F1 in haushaltsbuch2 formuliert „Eine neue Kategorie kann mit Namen angelegt werden." — ohne zu sagen, ob über Oberfläche, API oder CLI. Iteration 2 lieferte Fachlogik und Persistenz mit 17 grünen Tests; das Review `0efc9683` urteilte trotzdem AK1–AK3 `NICHT_ERFUELLT` („nicht über die Anwendung bedienbar"), der Kern legte ADJUST 2/3 an, erst Iteration 3 (HTTP-Server + Oberfläche) erfüllte die AK.
Fundstelle: Coach-Modus `feature`/Projekt-Interview (AK-Format `- AK<n>: …`); haushaltsbuch2 `features/F1/feature.md`.
Auswirkung: Mittel — eine vermeidbare Iteration je Feature mit mehrdeutigem AK (hier gut 9 Minuten Baulauf plus Review und Sichtung).
Maßnahme: Die AK-Vorlage nennt den Zugangsweg (Oberfläche/API/CLI) als Pflichtbestandteil.
Status: offen.
Feature/Run: F35-Reallauf haushaltsbuch2, 28.09.2026.

**F-769** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Projekt-Skills und -Agents sind in realen haushaltsbuch2-Läufen geladen, aber nicht aufrufbar — `Skill` und `Agent` fehlen in `--tools`.
Beschreibung: Die init-Zeilen der haushaltsbuch2-Läufe vom 28.09.2026 zeigen `tools` = `Bash, Edit, GetTask, Glob, Grep, Read, Write`; `agents` enthält `qa`, `code-reviewer`, `architecture-advisor`, `skills` die Projekt-Skills. 0 Skill-/Agent-Aufrufe in 5 Läufen. F36 WS-0 bestätigt: mit `Skill` bzw. `Agent` im Werkzeugsatz sind beide aufrufbar (`state/spike-f36-werkzeugsatz.md` P1/P2), ohne nicht (P4).
Fundstelle: `kontrollzustand-roh/` (init-Zeilen haushaltsbuch2, 28.09.2026); `startvorlagen/*.json` `werkzeugsaetze.schreibend`; `src/claude-code-gateway/index.ts` `baueAufruf`.
Auswirkung: Mittel — die im Projekt-Harness mitgelieferten Skills und Prüfrollen wirken im Lauf nicht.
Maßnahme: F36 WS-0 (erledigt); Aufrufbarkeit erst nach F-770 (WS-2 hat Skill/Agent nach S6 herausgenommen).
Vermerk (F36 WS-2, 28.09.2026): Haus-Skills/Agents sind in der Ausführung weiterhin NICHT aufrufbar — WS-2 hat `Skill`/`Agent` nach Spike WS-2s S6 wieder herausgenommen (Variante 3b), weil `--allowedTools` sie nicht auf freigegebene Einträge begrenzt (`state/spike-f36-ws2s.md`). Offen, bis F-770 gelöst ist; erledigt erst nach dem Reallauf.
Vermerk (F36 Review-Pass, 29.09.2026): Nach dem Reallauf gilt: `Skill` steht nur bei Ort-B-Läufen in `--tools`, und dann sind nur Ort-B-Skills aufrufbar. Projekt-Skills, Projekt-Commands und Projekt-Agents bleiben bewusst gesperrt (V4a, `Agent` nie in `--tools`). Das Ziel dieses Findings ist also nicht erreicht, sondern nach F-815 (Agents/Projekt-Skills) und F-816 (Identität) zurückgestellt. Beleg: `features/F36/nachweis-reallauf/auszug-laeufe.json`.
Status: offen (zurückgestellt nach F-815/F-816).
Feature/Run: F36-Challenge / F36 WS-0, 28.09.2026.

**F-770** · `HARNESS_IMPROVEMENT` · P1 · E-F36-8 = B, S7 HÄLT (mit V4a)
Titel: Rund 20 Nutzer- bzw. Plugin-Skills erscheinen trotz `--setting-sources project` in der init-Zeile — ohne Katalog und ohne Freigabe.
Beschreibung: Im Spike F36 WS-0 trug `init.skills` 28 Einträge: 7 Projekt-Skills plus 21 Nutzer-/Plugin-/eingebaute Skills (u. a. `deep-research`, `design`, `dataviz`, `schedule`, `loop`, `claude-api`). Verwandt mit F-755.
Fundstelle: `state/spike-f36-werkzeugsatz.md` („Je Probe“); init-Zeilen realer Läufe in `kontrollzustand-roh/`.
Auswirkung: Hoch — solange diese Skills geladen sind, kann `Skill` nicht in den Werkzeugsatz der Ausführung (Spike WS-2s S6); blockiert den F36-Reallauf.
Maßnahme: In F36 WS-4 sichtbar gemacht; Begrenzung vor dem Reallauf entscheiden (Sperrliste per `--disallowedTools` oder Quellen abschalten).
Vermerk (F36 WS-2s S6, 28.09.2026): **blockiert F36-Reallauf.** Gemessen: `Skill`/`Agent` brauchen im `-p`-Lauf keine `--allowedTools`-Freigabe; steht der Name in `--tools`, ist jeder geladene Skill/Agent aufrufbar — mit `Skill(ponytail)`/`Agent(qa)` liefen auch `advisor-pass`, `general-purpose` und `statusline-setup` ohne Denial (S6a–c). `--disallowedTools Skill(<id>)`/`Agent(<name>)` sperrt dagegen gezielt (S6d: „Skill execution blocked by permission rules“, „denied by permission rule … from cliArg“). WS-2 nimmt `Skill`/`Agent` deshalb nicht in den Werkzeugsatz (Variante 3b). Priorität auf P1 (Challenger, 28.09.2026). Lösungsweg offen: Sperrliste aus der init-Zeile ist nicht vorab bekannt (fail-open für neue Skills) — oder die Nutzer-/Plugin-Quellen für den Lauf abschalten.
Vermerk (Spike S7, 29.09.2026, CLI 2.1.284, `state/spike-f36-ws2s.md` S7): Herkunft korrigiert — die 21 bzw. heute 18 Zusatz-Skills sind **eingebaut** (CLI-Bundle), nicht Nutzer/Plugin; `--setting-sources project` hält Nutzer-, Plugin- und claude.ai-Quellen bereits heraus. Eingebaute Agents: `claude, Explore, general-purpose, Plan, statusline-setup`. Tragende Kombination V4a: `--settings` mit `disableBundledSkills: true` + `skillOverrides` „off“ (eingebaute Reste `design`, `doctor` und Projekt-Skills) + `--disallowedTools Skill(…)/Agent(…)` (eingebaute und Projekt-Agents) — nur `probe-skill`/`probe-agent` aus Ort B aufrufbar, alles andere erzwungen verweigert (2/2 Läufe). Nicht erreichbar: Projekt-Agents aus `init.agents` entfernen (`--add-dir` lädt nur mit Quelle `project`). `--setting-sources ''`/`local` verliert Ort B; `CLAUDE_CONFIG_DIR` verlangt Anmeldung; `--disable-slash-commands` entfernt auch Ort-B-Skills; `CLAUDE_CODE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` ohne Wirkung.
Vermerk (F36 WS-5b, 29.09.2026): Skill-Teil umgesetzt, Agent-Teil zurückgestellt (F-815). Ein `ausfuehrung`-Lauf mit ≥1 installiertem Ort-B-Skill startet mit `Skill` (nie `Agent`) in `--tools` und mit V4a ohne `enabledPlugins`: `disableBundledSkills`, `skillOverrides` off und `Skill(…)` für design/doctor/Projekt-Skills, dazu `Write/Edit(**/.claude/**)`. Real belegt (`features/F36/nachweis-ws5b/`, CLI 2.1.284): `init.skills` = nur die zwei Ort-B-Skills; ponytail/advisor-pass/design/doctor/loop erzwungen nicht aufrufbar; `Agent` fehlt in `init.tools`. Ohne Ort-B-Skill bleibt der Start bitgenau wie vorher.
Status: E-F36-8 = B, S7 HÄLT (mit V4a). Challenger-Präzisierung ([EMPFEHLUNG] 29.09.2026, keine Entscheidung Stefans): AK4 heißt „nicht aufrufbar ohne Freigabe“. Projekt-Agents sind im init sichtbar, aber deterministisch gesperrt. Verwerfen, wenn das Modell im Reallauf wiederholt gesperrte Agents ansteuert. Umsetzung in WS-5, Namensdrift → F-791.
Feature/Run: F36-Challenge / F36 WS-0, 28.09.2026.

**F-771** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: `git diff` über die Challenger-Bridge lief in ein Timeout (>120 s).
Beschreibung: Bei der F36-Challenge brach ein `git diff` über die Bridge nach über 120 s ab.
Fundstelle: Challenger-Bridge, F36-Challenge 28.09.2026.
Auswirkung: Niedrig — Challenge verzögert, kein Datenverlust.
Maßnahme: In der Bridge kein Worktree-diff; nur `git log`/`git show`/`git ls-tree` oder Dateien direkt lesen.
Status: offen.
Feature/Run: F36-Challenge / F36 WS-0, 28.09.2026.

**F-772** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Terminalbefehle für den Menschen kamen in bash-Syntax statt PowerShell.
Beschreibung: Stefan arbeitet unter Windows in PowerShell; Befehlsblöcke für ihn waren teils in bash-Syntax (`&&`, `export`, `/dev/null`).
Fundstelle: Übergaben/Antworten an Stefan, F36-Challenge 28.09.2026.
Auswirkung: Niedrig — Reibung und Fehlversuche beim Abtippen.
Maßnahme: Terminalbefehle für den Menschen in PowerShell-Syntax (Windows) formulieren.
Status: offen.
Feature/Run: F36-Challenge / F36 WS-0, 28.09.2026.

**F-773** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: CLAUDE.md/ARCHITECTURE.md im Projekt-Skelett verweisen auf Skills, die die Ausführung nicht aufrufen kann.
Beschreibung: `vorlagen/projekt-skelett/CLAUDE.md` und `ARCHITECTURE.md` nennen Skills (z. B. `git-flow`, `advisor-pass`) und Prüfrollen als Arbeitsweise; ohne `Skill`/`Agent` im Werkzeugsatz ist das für die Ausführung toter Text (F-769).
Fundstelle: `vorlagen/projekt-skelett/CLAUDE.md`, `vorlagen/projekt-skelett/ARCHITECTURE.md`.
Auswirkung: Mittel — die Ausführung liest Anweisungen, die sie nicht befolgen kann.
Maßnahme: Erledigt sich erst, wenn Skill/Agent in der Ausführung aufrufbar sind (nach F-770); bis dahin bekannt.
Vermerk (F36 WS-2, 28.09.2026): Haus-Skills/Agents sind in der Ausführung weiterhin NICHT aufrufbar — WS-2 hat `Skill`/`Agent` nach Spike WS-2s S6 wieder herausgenommen (Variante 3b), weil `--allowedTools` sie nicht auf freigegebene Einträge begrenzt (`state/spike-f36-ws2s.md`). Offen, bis F-770 gelöst ist; erledigt erst nach dem Reallauf.
Vermerk (F36 Review-Pass, 29.09.2026): Auch nach dem Reallauf bleiben die Skelett-Skills (`git-flow`, `advisor-pass` usw.) und Prüfrollen in der Ausführung gesperrt; aufrufbar sind nur installierte Ort-B-Skills. Der tote Text bleibt. Zusammen mit F-830 (DoD im Skelett) im Fixpaket schneiden: Skelett-Texte auf „in Workforce-Läufen nicht verfügbar“ ergänzen oder nach F-815 freischalten.
Status: offen.
Feature/Run: F36-Challenge / F36 WS-0, 28.09.2026.

**F-775** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Die Challenges zu F19/F27/F36 haben nie geprüft, ob Katalogeinträge in einem echten Lauf ankommen.
Beschreibung: Katalog, Scout und Freigabe wurden je für sich abgenommen; die init-Zeile eines echten Laufs (tools, agents, skills, mcp_servers) war in keiner Challenge Prüfgegenstand — so blieb F-774 bis zum F35-Reallauf unentdeckt.
Fundstelle: `features/F19/feature.md`, `features/F27/feature.md`, F36-Challenge.
Auswirkung: Mittel — Wirkungslücke über drei Features unbemerkt.
Maßnahme: Jede Capability-Challenge prüft die init-Zeile eines echten Laufs (tools, agents, skills, mcp_servers).
Status: offen.
Feature/Run: F36-Challenge / F36 WS-0, 28.09.2026.

**F-776** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Design-Referenzseiten haben keinen Weg in Aufträge.
Beschreibung: `docs/harness/kandidaten-2026-09-15.md` führt 41 Einträge der Kategorie „Referenz" („als Link/Wissensquelle aufnehmen, ohne automatisch ausführbare Tools oder Hooks zu installieren"). Der Katalog (`ressourcen.json`) kennt nur ausführbare Ressourcen (worker, skill, agent, extern); eine Referenzseite kann weder registriert noch einem Auftrag beigelegt werden.
Fundstelle: `docs/harness/kandidaten-2026-09-15.md` (Kategorie „Referenz"); `schemas/ressourcen.schema.json`.
Auswirkung: Niedrig — gesammeltes Design-Wissen bleibt ungenutzt, kein Laufzeitrisiko.
Maßnahme: Katalogart „referenz" im Design-Schnitt (F-725).
Status: offen.
Vermerk (Challenger-Empfehlung 30.09.2026): nicht Teil von F-725 (F44). Die Designvorlage steht fest, die 41 Referenzen sind damit ein Nebenweg; F-776 geht ins V1-Backlog mit Auslöser. Bestätigung durch Stefan offen.
Vermerk (F44 WS-1a): nicht in F-725, bestätigt (Stefan/Challenger, 30.09.2026).
Feature/Run: F36 WS-1, 28.09.2026.

**F-778** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Es fehlt eine Freigabeklasse „extern, nur lesend" (Perplexity u. a.), auch für recherchierende Rollen.
Beschreibung: E-F36-4 lässt in V1 nur lokale MCPs zu. Nur lesende externe Dienste (Perplexity, Context7, Firecrawl, 21st.dev Magic) tragen jetzt `wirkung: extern_lesend` und sind nicht freigebbar — auch nicht für Rollen, deren Zweck Recherche ist (Coach, Architekt, Scout).
Fundstelle: `docs/projekt/zielfassung.md` §13.6 E-F36-4; `ressourcen.json`; `features/F36/feature.md` (Nicht-Ziele).
Auswirkung: Niedrig in V1 — Recherche läuft über eingebaute Web-Werkzeuge; die Lücke wird mit dem ersten Bedarf sichtbar.
Maßnahme: V1-Backlog mit Auslöser in der F36-Akte: Der Mensch setzt `installation` bei einem `extern_lesend`-Eintrag; Jarvis meldet das als Empfehlung (E-M5-16).
Status: offen.
Feature/Run: F36 WS-1, 28.09.2026.

**F-779** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: F36 WS-0 wurde im Haupt-Checkout auf `main` gebaut statt im zugewiesenen Worktree.
Beschreibung: Der WS-0-Probelauf entstand im Haupt-Checkout auf `main` statt im zugewiesenen Worktree. Kein Commit auf `main`; der Schaden wurde über #267 behoben.
Fundstelle: F36 WS-0, 28.09.2026; PR #267.
Auswirkung: Mittel — ein Commit auf `main` oder eine Kollision mit einer parallelen Sitzung wäre möglich gewesen.
Maßnahme: Jeder Bauauftrag beginnt mit einer Vorprüfung von Branch und Arbeitsverzeichnis (Abbruch ohne Schreiben, wenn sie nicht passen); die Sitzung startet im Worktree-Ordner. Angewendet ab F36 WS-1.
Status: offen.
Feature/Run: F36 WS-0/WS-1, 28.09.2026.

**F-780** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Ob Write in der Ausführung außerhalb des Arbeitsverzeichnisses gesperrt ist, ist unbelegt.
Beschreibung: Spike F36 WS-0 P2 c): Der Schreibversuch außerhalb des Arbeitsverzeichnisses wurde dreimal vom Modell selbst verweigert, es gab keinen Write-Aufruf. Damit ist nur das Modellverhalten gemessen, nicht die Werkzeugsperre.
Fundstelle: `state/spike-f36-werkzeugsatz.md` (P2 c); `features/F36/feature.md` (Bekannte Grenzen).
Auswirkung: Mittel — mit `Agent` im Werkzeugsatz (WS-2) hängt die Grenze der Ausführung an einer ungemessenen Annahme.
Maßnahme: Messweg ohne Modellurteil — Hook-Testfall oder erzwungener Write-Aufruf.
Vermerk (Stand 28.09.2026): Doberman (Apache-2.0, Telemetrie abschalten) ist Kandidat für einen Messweg ohne Modellurteil (Laufzeitprüfung von Toolaufrufen; `docs/harness/kandidaten-2026-09-15.md` Z. 189, Harness-Kandidat in `features/F36/katalog-uebernahme.md`).
Status: offen.
Feature/Run: F36 WS-1, 28.09.2026.

**F-783** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Ein vom Challenger zum Lesen eingebundener Worktree blockiert dessen Löschen.
Beschreibung: Bindet der Challenger einen Worktree zum Lesen ein, schlägt das spätere Löschen des Worktrees fehl („von einem anderen Prozess verwendet").
Fundstelle: Chat #84.
Auswirkung: Niedrig — Aufräumen des Worktrees scheitert, Handarbeit nötig.
Maßnahme: Worktrees nicht einbinden, sondern lesend aus dem Haupt-Checkout per `git diff main <commit>` prüfen; dafür committet der Mensch vorab auf den Feature-Branch.
Status: offen.
Feature/Run: Chat #84, 28.09.2026.

**F-784** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: „nicht beobachtet“ in der Laufdetailansicht unterscheidet nicht zwischen alter Laufakte, Codex-Lauf und Abbruch vor der init-Zeile.
Beschreibung: Das Laufakten-Feld `beobachtung` fehlt in drei Fällen: Laufakte vor F36 WS-4 (append-only), Codex-Lauf (kein init im JSONL-Strom) und claude-code-Lauf mit Abbruch vor der init-Zeile. Die Anzeige zeigt in allen drei Fällen dasselbe „nicht beobachtet“.
Fundstelle: `public/leitstand/beobachtung-zeile.js` (`formatiereBeobachtung`); `public/leitstand/views/runs.js` (`renderLaufakte`); `src/claude-code-gateway/index.ts` (`leseBeobachtung`).
Auswirkung: Niedrig — Worker und „Beobachtungsbasis vollständig“ stehen in derselben Tabelle und grenzen den Fall meist ein.
Maßnahme: Grund mitführen, sobald ein Fall im Reallauf stört.
Status: offen.
Feature/Run: F36 WS-4, 28.09.2026.

**F-785** · `TECH_DEBT` · P3 · offen
Titel: Die Checkpoint-Tabelle der Laufdetailansicht wird auch auf 1400 px am Kartenrand abgeschnitten.
Beschreibung: Die Checkpoint-Kette in `#lauf-detail` ist breiter als ihre Karte und wird bei 1400 px wie bei 400 px abgeschnitten (vor WS-4 vorhanden). Eine globale Umbruchregel würde die Zeitstempel zerlegen, deshalb hat WS-4 nur die Laufakten-Tabelle angepasst.
Fundstelle: `public/leitstand/views/runs.js` (Checkpoint-Kette); `public/leitstand/style.css`. Beleg: `features/F36/nachweis-ws4-ui/README.md`.
Auswirkung: Niedrig — rechte Spalten der Checkpoint-Kette nur eingeschränkt lesbar.
Maßnahme: im Design-Schnitt (F-725).
Status: offen.
Feature/Run: F36 WS-4, 28.09.2026.

**F-787** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: TERMINAL-Blöcke des Challengers landeten in der Claude-Code-Sitzung, dort blockiert der commit-guard.
Beschreibung: Für Stefans eigenes Terminal gedachte TERMINAL-Blöcke (commit/push) wurden in die Claude-Code-Sitzung eingefügt; dort greift der commit-guard und blockiert.
Fundstelle: Chat #84 (Challenger-Übergaben).
Auswirkung: Niedrig — Reibung, Wiederholung im richtigen Fenster.
Maßnahme: TERMINAL-Blöcke tragen den Hinweis „eigenes PowerShell-Fenster“.
Status: offen.
Feature/Run: Chat #84, 28.09.2026.

**F-789** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: #270 wurde vor der Challenger-Verifikation gemergt.
Beschreibung: Der PR #270 (F36 WS-1b) wurde gemergt, bevor der Challenger ihn verifiziert hatte; die Nachprüfung war in Ordnung.
Fundstelle: Chat #84; PR #270.
Auswirkung: Niedrig — diesmal folgenlos, die Reihenfolge schützt aber nicht.
Maßnahme: Reihenfolge Push → Verifikation → PR.
Status: offen.
Feature/Run: Chat #84, 28.09.2026.

**F-790** · `HARNESS_IMPROVEMENT` · P2 · entschieden (E-F36-7 = A), bekannte Grenze
Titel: Playwright `--allowed-origins` braucht den Port in der Origin, ist keine Sicherheitsgrenze und greift nicht bei Weiterleitungen.
Beschreibung: Spike F36 WS-2s S5: `--allowed-origins "http://localhost;http://127.0.0.1"` sperrte auch `http://127.0.0.1:<port>` (`ERR_BLOCKED_BY_CLIENT`); erst mit Port (`http://127.0.0.1:<port>`) war der lokale Server erreichbar und example.com blockiert. Die Hilfe von `@playwright/mcp@0.0.82` sagt wörtlich: „*does not* serve as a security boundary and *does not* affect redirects“.
Fundstelle: `state/spike-f36-ws2s.md` (S5a–S5c); `features/F36/feature.md` (WS-5, playwright-mcp).
Auswirkung: Mittel — eine Origin ohne Port macht den Server unbrauchbar; eine Weiterleitung umgeht die Sperre.
Maßnahme: E-F36-7 = A (Stefan, 28.09.2026): playwright-mcp bleibt `wirkung: lokal`, Start nur mit `--allowed-origins` auf die Projekt-URL mit Port und `--output-dir` außerhalb des Projekts; WS-5 hält die Adresse jedes `browser_navigate` in der Beobachtung fest. Weiterleitungen bleiben bekannte Grenze.
Status: entschieden (E-F36-7 = A), bekannte Grenze.
Vermerk (F36 Reallauf, 29.09.2026): Mit der installierten Fassung `@playwright/mcp` 0.0.83 bestätigt. Projekt-Origins mit Port erlaubt, `https://example.com` → `ERR_BLOCKED_BY_CLIENT` (`features/F36/nachweis-reallauf/origin-sperre.json`). Weiterleitungen sind weiterhin nicht gemessen; die Grenze bleibt.
Feature/Run: F36 WS-2s, 28.09.2026.

**F-791** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: Die eingebauten Skills und Agents der Claude-CLI ändern sich mit der Version — eine feste Sperrliste wird bei jedem Update still undicht.
Beschreibung: WS-0 (CLI 2.1.283) sah 21 eingebaute Skills, darunter `slides`, `artifact-diagramming` und `artifact-capabilities`, sowie den Agent `claude-code-guide`. S7 (2.1.284) sah 18 Skills ohne diese drei und keinen `claude-code-guide`. Ohne Anmeldung fehlte außerdem `schedule`, und `init.plugins` trug `agents-md@builtin`. Die E-F36-8-Kombination (V4a) braucht für die Reste, die `disableBundledSkills` nicht erfasst (`design`, `doctor`), und für alle eingebauten Agents eine feste Namensliste in `skillOverrides` bzw. `--disallowedTools`. Ein neuer eingebauter Agent wäre nach einem CLI-Update ohne Freigabe aufrufbar (fail-open, S6c). Nicht abgedeckt sind auch verschachtelte `.claude/skills/` im Projekt, die erst beim ersten Dateizugriff nachladen (Doku, nicht gemessen).
Fundstelle: `state/spike-f36-ws2s.md` S7; `state/spike-f36-werkzeugsatz.md` (WS-0, init-Liste).
Auswirkung: Hoch — die Begrenzung nach E-F36-8 wäre nach dem nächsten CLI-Update unbemerkt wirkungslos.
Maßnahme (Umsetzung in WS-5 zusammen mit V4a, `features/F36/feature.md`): (1) Das init-Gate kennt nur die Menge „freigegeben ∪ bewusst gesperrt“; jeder andere Name in `init.skills`/`init.agents` → Lauf abbrechen und die unbekannten Namen melden. (2) Vorstart-Scan: Existiert unterhalb der Projektwurzel ein weiteres `.claude/skills` oder `.claude/agents` außer dem der Wurzel → Lauf abbrechen (fail-closed, schließt die Lücke der nachgeladenen verschachtelten Skills). (3) Das Gate wird beim CLI-Versionswechsel rot, wenn sich die Menge der eingebauten Namen ändert. Aus dem QA-Pass S7, bestätigt (Challenger-[EMPFEHLUNG], 29.09.2026): (4) Write/Edit-Sperre auf `**/.claude/**` (`Write(**/.claude/**)`, `Edit(**/.claude/**)` in `--disallowedTools`). (4a) Rotfall in WS-5: Ein Lauf legt im selben Lauf einen Skill unter `.claude/skills/` an, einmal per `Write` und einmal per `Bash`, und versucht ihn aufzurufen; ist er aufrufbar, eskaliert WS-5 an den Challenger. (4b) Enthält der Laufdiff Änderungen unter `.claude/`, ist das Laufergebnis rot. Den Folgelauf deckt bereits das init-Gate (1) ab. (5) Namenskollision: Ein Ort-B-Eintrag mit dem Namen eines eingebauten oder eines Projekt-Skills/-Agents wird bei der Freigabe abgelehnt und beim Start erneut geprüft (Treffer → Lauf abbrechen, fail-closed). Weitere offene Punkte für die WS-5-Challenge stehen in `features/F36/feature.md` (WS-5).
Vermerk (F36 WS-5b, 29.09.2026): Skill-Teil umgesetzt, Agent-Teil zurückgestellt (F-815).
- (1) Init-Gate für Läufe mit Ort-B-Skills (`pruefeInitZeile`, `starteGateway` optionen.initGate): `init.skills` ⊆ übergebene Ort-B-Namen, kein `Agent` in `init.tools`, `init.mcp_servers` = übergebene MCPs; sonst Abbruch vor dem ersten `tool_use` → `FEHLGESCHLAGEN init_gate_verstoss`. `init.agents` wird nicht geprüft, weil Agents ohne Agent-Werkzeug nicht aufrufbar sind.
- (2) Vorstart-Scan (`scanneVerschachtelteClaudeOrdner`): `.claude/skills|agents|commands` unterhalb der Wurzel, mit `node_modules`, ohne `.git`, ohne Links zu folgen.
- (3) Offen: kein eigenes Gate beim CLI-Versionswechsel; das Init-Gate fängt neue eingebaute Skills im Lauf.
- (4) `Write/Edit(**/.claude/**)`: real gemessen erzwungen (Rotfall 9c).
- (4a) Rotfall real: per Write „denied by your permission settings“, per Bash „denied“, beide Skills „Unknown skill“ — keine Eskalation.
- (4b) Laufdiff unter `.claude/` → `FEHLGESCHLAGEN claude_ordner_veraendert`.
- (5) Namenskollision bei Installation (eingebaut, Ort-B) und Start (zusätzlich Projekt-Skills aus Frontmatter-name und Ordnername).
- Reviewer-Pass (29.09.2026): Projekt-Commands `.claude/commands/**.md` standen nicht in `init.skills`, waren aber per Skill-Werkzeug aufrufbar (real gemessen, fail-open vor dem Fix). Seither stehen sie in `Skill(…)`/`skillOverrides` (Nachweis 9b′). Das Init-Gate hätte das nicht gefunden; eine Sperrliste braucht deshalb alle Quellen, die das Skill-Werkzeug bedient.
- Belege: Gate `scripts/check-f36-ws5b-skill.mjs` (i), (l)–(n), kalibriert; `features/F36/nachweis-ws5b/`.
Vermerk (Challenger-Verifikation WS-5b, 29.09.2026): `init.tools` enthält in allen WS-5b-Läufen `GetTask`, obwohl es nicht in `--tools` steht (`features/F36/nachweis-ws5b/lauf-*.json`). Im Reallauf beobachten, ob es Subagent- bzw. Aufgabenwirkung hat.
Vermerk (F36 Reallauf, 29.09.2026): Im echten Korrekturlauf `7b6d0f40` (haushaltsbuch2) enthielt `init.tools` wieder `GetTask`. Es gab keinen `GetTask`-Aufruf und damit keine beobachtete Wirkung. Die Frage bleibt offen, bis ein Lauf es aufruft oder ein erzwungener Aufruf die Wirkung misst.
Status: offen.
Feature/Run: F36 Spike S7, 29.09.2026.

**F-792** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Scope-Gate fehlt — im manuellen Ablauf prüft nichts maschinell, ob der Diff nur beauftragte Pfade berührt.
Beschreibung: Bauaufträge nennen ihren Zielbereich nur in Prosa. Ob der fertige Diff darüber hinausgreift, fällt erst im Review oder gar nicht auf; kein Gate vergleicht die geänderten Pfade mit dem Auftrag.
Fundstelle: Handoff-Verträge (Skill `handoff-vertrag`); Commit-Ablauf (Skill `git-flow`, `commit-guard`).
Auswirkung: Mittel — Änderungen außerhalb des Auftrags können unbemerkt mitcommittet werden.
Maßnahme: Bauaufträge enthalten eine Liste „erlaubte Pfade“; ein Skript vergleicht `git diff --name-only` damit und meldet Abweichungen vor dem Commit. Nicht im Gedächtnis-PR bauen.
Status: offen.
Feature/Run: Nachtrag Gedächtnis-Auftrag, 29.09.2026.

**F-793** · `TECH_DEBT` · P3 · offen
Titel: Perf-Flake `GET /api/zustand` — Median im ersten Lauf über der Grenze, bei Wiederholung weit darunter.
Beschreibung: Median 426 ms im ersten Lauf, 26 ms bei Wiederholung (Grenze 300 ms), ohne Code- oder Konfigurationsänderung. [Annahme] Ursache ist ein Kaltstart (erster Zugriff, Dateisystem-Cache).
Fundstelle: Perf-Prüfung für `GET /api/zustand` in `npm run check`.
Auswirkung: Niedrig — einmalig roter Lauf, kostet eine Wiederholung und Vertrauen in das Gate.
Maßnahme: Aufwärmrunde vor der Messung oder Wiederholung nur bei Überschreitung prüfen; die Grenze von 300 ms nicht aufweichen. Möglicherweise verwandt mit F-590/F-762 (parallele Testprozesse, Dateisystem-Last).
Status: offen.
Feature/Run: `npm run check`, 29.09.2026.

**F-796** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: TERMINAL-Blöcke des Challengers nur mit absolutem `cd` und absoluten Pfaden.
Beschreibung: Am 28.09.2026 enthielt ein TERMINAL-Block des Challengers relative Pfade; im Home-Ordner ausgeführt, liefen die Befehle ins Leere.
Fundstelle: Challenger-Runde 28.09.2026; `CLAUDE.md` (Iterationsprinzip, „Jeder Befehlsblock beginnt mit `cd` auf den vollständigen Pfad“).
Auswirkung: Mittel — Befehle wirken im falschen Verzeichnis oder gar nicht.
Maßnahme: Jeder TERMINAL-Block des Challengers beginnt mit `cd` auf den vollständigen Pfad und nutzt nur absolute Pfade.
Verwandt: F-513, F-528, F-787 (Terminal-Blöcke, Pfade, cd-Prüfung) — F-796 ergänzt die Pflicht zu absoluten Pfaden im Block selbst.
Status: offen.
Feature/Run: Challenger-Runde, 28.09.2026.

**F-797** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Der Challenger liest vor jedem Spike-Prompt die betroffenen Findings im Repo.
Beschreibung: Die S7-Variante V1 war durch F-770 bereits widerlegt, wurde aber erneut als Variante angesetzt, weil das Finding vor dem Spike-Prompt nicht gelesen wurde.
Fundstelle: `state/spike-f36-ws2s.md` (S7); `state/findings.md` F-770.
Auswirkung: Niedrig — Messaufwand für bereits widerlegte Varianten.
Maßnahme: Vor jedem Spike-Prompt liest der Challenger die betroffenen Findings im Repo und streicht widerlegte Varianten.
Status: offen.
Feature/Run: F36 Spike S7, 29.09.2026.

**F-798** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Im Chat vergebene Finding-Nummern kollidieren mit Repo-Nummern.
Beschreibung: Der Challenger vergab im Chat Finding-Nummern, die im Repo bereits belegt waren oder parallel vergeben wurden.
Fundstelle: `state/findings.md`; Challenger-Chat.
Auswirkung: Niedrig — Verweise zeigen auf das falsche Finding.
Maßnahme: Der Challenger vergibt nur Platzhalter; die Nummer vergibt das Repo beim Eintragen.
Status: offen.
Feature/Run: Gedächtnislücken, 29.09.2026.

**F-799** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: CLAUDE.md verlangt Commit und Push per `git-flow` zum Iterationsende; in ai-workforce committet und pusht Stefan selbst.
Beschreibung: CLAUDE.md (Iterationsprinzip, „Iterationsende“) verlangt nach Freigabe Commit und Push über den Skill `git-flow`. In ai-workforce committet und pusht Stefan selbst: Der commit-guard blockiert (F-787), und der Challenger prüft vor dem PR per Hash (F-789). CLAUDE.md ist zugleich Vorlage für neue Projekte (F41/F42), der Widerspruch wandert also mit.
Fundstelle: `CLAUDE.md` (Iterationsprinzip); `state/uebergabe-aktuell.md` (Bedienregeln); F-787; F-789.
Auswirkung: Niedrig — widersprüchliche Anweisung an Claude-Code-Sitzungen und an neue Projekte.
Maßnahme: Bei der nächsten Harness-Runde entscheiden, ob CLAUDE.md die Variante „Mensch committet“ als Projekt-Option aufnimmt.
Status: offen.
Feature/Run: Gedächtnislücken, 29.09.2026.

**F-801** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Der Auswahlfilter der Recherche kennt kein Ausschlusskriterium „personenbezogene Daten / DSGVO“.
Beschreibung: Der Filter schließt nichtkommerzielle, kostenpflichtige und lizenz- oder identitätsungeklärte Kandidaten aus. Scraper für personenbezogene Daten (Google-Maps-Scraper, Social-analyzer, Vayne) blieben als „Sonderfall“/„Nur Ausnahme“ in der Recherche und wurden erst im Datennachtrag von Hand ausgeschlossen.
Fundstelle: `docs/harness/kandidaten-2026-09-15.md` (Auswahlfilter Z. 15–23; Bewertungsmatrix Z. 225, 311, 312); `docs/harness/stack-kandidaten.md` (Abschnitt „Nicht übernommen“).
Auswirkung: Niedrig — ohne Kriterium kann ein solcher Kandidat in Katalog oder Stack-Liste rutschen.
Maßnahme: Kriterium „personenbezogene Daten / DSGVO“ in den Filter aufnehmen (Skill `werkzeug-auswahl` bzw. Scout-Vorgaben).
Status: offen.
Feature/Run: F36 Datennachtrag, 29.09.2026.

**F-802** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Nachtrag-Prompts setzen voraus, dass der Basis-Auftrag in derselben Sitzung angekommen ist.
Beschreibung: Am 29.09.2026 schickte der Challenger nur einen Nachtrag zu einem Auftrag, der in der Sitzung nicht angekommen war; eine Runde ging verloren.
Fundstelle: Challenger-Runde 29.09.2026.
Auswirkung: Niedrig — verlorene Runde, Gefahr eines halben Auftrags.
Maßnahme: Der Challenger gibt bei Änderungen immer den vollständigen Auftrag neu aus.
Status: offen.
Feature/Run: F36 Datennachtrag, 29.09.2026.

**F-803** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Löschungen im Scratchpad per `rm -rf "$S"/…` lösen Rückfragen aus, die im unbeaufsichtigten Betrieb automatisch abgelehnt werden.
Beschreibung: Claude Code löscht Scratchpad-Dateien mit `rm -rf "$S"/…`. Weil `$S` leer sein könnte, fragt die Berechtigungsprüfung nach; ohne Menschen wird die Rückfrage abgelehnt und der Schritt bricht ab.
Fundstelle: Claude-Code-Sitzungen F36, 29.09.2026.
Auswirkung: Niedrig — abgebrochene Aufräumschritte im unbeaufsichtigten Betrieb.
Maßnahme: Löschungen nur mit `"${S:?}"` oder festen Pfaden; Vermerk in CLAUDE.md „Bekannte Fallen“ oder im passenden Skill.
Status: offen.
Feature/Run: F36 Datennachtrag, 29.09.2026.

**F-805** · `BUG` · P3 · offen
Titel: `taste-skill` verweist eventuell auf die falsche Quelle.
Beschreibung: Der Katalogeintrag `taste-skill` verweist auf `senlindesign/taste-skill`; die Recherche (`docs/harness/kandidaten-2026-09-15.md` Z. 304) nennt `leonxlnx/taste-skill`. Ob Fehlzuordnung oder ein anderes Werkzeug, ist ungeprüft.
Fundstelle: `ressourcen.json` (Eintrag `taste-skill`); `features/F36/katalog-uebernahme.md` (Datennachtrag, Zeile Image to code).
Auswirkung: Niedrig — eine Installation nach WS-5 würde nur von `herkunft.url` laden, also womöglich vom falschen Repo.
Maßnahme: Quelle klären, Eintrag ggf. korrigieren.
Status: offen.
Feature/Run: F36 Datennachtrag, 29.09.2026.

**F-806** · `TECH_DEBT` · P3 · offen
Titel: Pfadquelle der Empfehlung ist „Projekt enthält“, nicht „Auftrag betrifft“.
Beschreibung: `ermittleAusfuehrungsEmpfehlung` (`scripts/leitstand-server.mjs`) nimmt als Pfade die versionierten Dateien der Projekt-Repo-Wurzel (`git ls-files`). `pfad_muster_any` heißt damit „das Projekt enthält passende Dateien“, nicht „der Auftrag betrifft sie“ — in einem großen Projekt ist die Pfadbedingung fast immer erfüllt.
Fundstelle: `scripts/leitstand-server.mjs` (`leseVersionierteDateien`, `ermittleAusfuehrungsEmpfehlung`); `features/F36/feature.md` (Bekannte Grenzen).
Auswirkung: Niedrig — Rangfolge und Obergrenze (F-788) begrenzen das Rauschen; die Pfadbedingung trennt aber kaum.
Maßnahme: Zeigt der Reallauf Rauschen, Pfade aus den Modulen des Architekt-Ergebnisses ableiten.
Status: offen.
Feature/Run: F36 WS-3, 29.09.2026.

**F-807** · `BUG` · P3 · abgefangen (F36 WS-3)
Titel: Einträge mit `wirkung` ≠ `lokal` tragen `anwendbar_wenn`.
Beschreibung: `github-mcp` (`extern_schreibend`) und `iannuttall-seo` (`extern_lesend`) tragen `anwendbar_wenn`, obwohl sie nach E-F36-4 in V1 nicht freigebbar sind und nie empfohlen werden dürfen.
Fundstelle: `ressourcen.json` (Einträge `github-mcp`, `iannuttall-seo`).
Auswirkung: Niedrig — die Daten widersprechen der Regel, die Empfehlung fängt es ab.
Maßnahme: Durch WS-3 abgefangen: `baueEmpfehlung` setzt solche Einträge in keine Liste, nur in die Zählzeile „n passende Einträge in V1 nicht freigebbar“. Die Daten bleiben unverändert; bereinigen, sobald E-F36-4 oder der Katalog ohnehin angefasst wird.
Status: durch WS-3 abgefangen (keine Liste), Daten unverändert.
Feature/Run: F36 WS-3, 29.09.2026.

**F-812** · `TECH_DEBT` · P3 · offen
Titel: Freigabe/Installation schreibt das versionierte ressourcen.json.
Beschreibung: „Freigeben & installieren“ schreibt `installation` (mit absoluten Pfaden dieses Rechners: node, cap-Ordner) und `freigabe: FREIGEGEBEN` in das versionierte `ressourcen.json` der Installationswurzel. Der Arbeitsbaum ist danach geändert; Stefan committet von Hand. Auf einem zweiten Rechner stimmen die Pfade nicht.
Fundstelle: `src/ressourcen/installation.ts` (`schreibeInstallierteRessource`); `ressourcen.json`.
Auswirkung: Niedrig — Einzelnutzer, ein Rechner. Arbeitet die Workforce an sich selbst, sperrt der geänderte Arbeitsbaum nach JEDER Installation jeden schreibenden Lauf, bis committet ist (die Erfolgsmeldung sagt das).
Maßnahme: Bei Störung lokale Überlagerung (z. B. gitignoriertes `ressourcen.lokal.json` für `installation`/`freigabe`, Muster `projekte.lokal.json`).
Status: offen.
Feature/Run: F36 WS-5a, 29.09.2026.

**F-817** · `TECH_DEBT` · P3 · offen
Titel: Skills tragen kein Feld `wirkung` — ein nach außen wirkender Skill (browser-use) ist im Schema nicht unterscheidbar.
Beschreibung: `wirkung` (lokal/extern_lesend/extern_schreibend) ist nur bei `unterart` `mcp` zulässig. `browser-use` wirkt über den Browser nach außen und braucht die browser-use-CLI; die Prüfung auf `SKILL.md` allein genügt nicht. WS-5b macht einen externen Skill nur mit `installation_vorlage` installierbar; `browser-use` hat keine und ist deshalb nicht installierbar (Grund in der Empfehlung).
Fundstelle: `src/ressourcen/index.ts` (`pruefeExternFelder`, `pruefeInstallierbarkeit`); `ressourcen.json` (`browser-use`); `features/F36/feature.md` (WS-5b, Offene QA-Punkte).
Auswirkung: Niedrig — solange niemand eine Vorlage für einen solchen Skill setzt; mit Vorlage würde `wirkung` nicht geprüft.
Maßnahme: Bei Bedarf das Schema um `wirkung` für Skills erweitern (E-F36-4 analog: freigebbar nur mit `lokal`) und die Prüfung um benötigte CLIs ergänzen.
Status: offen.
Feature/Run: F36 WS-5b, Challenger-Zuschnitt 29.09.2026.

**F-819** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Laufzeit von `npm run check` wächst mit jedem Feature (69 Gates, >1000 Tests).
Beschreibung: Die volle Kette läuft bei jedem Zwischenstand; mit jedem Feature kommen Gates und Tests dazu.
Fundstelle: `package.json` (`check`).
Auswirkung: Niedrig — längere Wartezeiten bei Zwischenständen.
Maßnahme: Bei spürbarer Störung eine schnelle Teilkette für Zwischenstände, die volle Kette vor der Übergabe.
Status: offen.
Feature/Run: Chat 29.09.2026.

**F-821** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Wartepunkt (Web-Merge) und Aufräumbefehle im selben TERMINAL-Block.
Beschreibung: Der Challenger gab Merge und Worktree-/Branch-Löschung in einem Block aus; das Aufräumen lief vor dem Merge (Remote-Branch gelöscht, PR geschlossen, F-814-Worktree auf altem main). Behoben durch Wiederherstellen aus dem lokalen Commit 5cbf80f, gemergt als #278.
Fundstelle: TERMINAL-Blöcke des Challengers (Bedienregeln in `state/uebergabe-aktuell.md`).
Auswirkung: Niedrig — lokal wiederherstellbar, kostete aber einen geschlossenen PR und eine Wiederherstellungsrunde.
Maßnahme: Wartepunkte beenden einen Block; Aufräumen erst nach bestätigtem `git rev-parse`.
Status: offen.
Feature/Run: F36 WS-5b, 29.09.2026.

**F-822** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Projekt-Dispatcher antwortet vor dem Host-Haken — 404-Orakel für Projekt-ids.
Beschreibung: `erzeugeMultiProjektDispatcher` antwortet bei `/api/projekte/<unbekannte id>/…` mit 404 „Unbekanntes Projekt“, bevor der Host-Haken (F-814) in `requestHandler` greift; bei bekannter id kommt 403. Eine per DNS-Rebinding umgebogene Seite kann so prüfen, ob eine Projekt-id existiert. Sie liest und ändert keinen Zustand.
Fundstelle: `scripts/leitstand-server.mjs` (`erzeugeMultiProjektDispatcher`); `scripts/check-f814-host.mjs` (Kopf, „bewusst nicht abgedeckt“).
Auswirkung: Niedrig — nur Existenz einer vom Angreifer geratenen id.
Maßnahme: Bei Bedarf `istUnzulaessigerHost` auch am Anfang des Dispatchers prüfen und die Strukturprüfung (3) des Gates um diesen begründeten zweiten Aufruf erweitern, plus Rotfall „unbekanntes Projekt, fremder Host“. Im F-814-Auftrag bewusst nicht gemacht (Vorgabe: Dispatcher nicht gesondert behandeln).
Status: offen.
Feature/Run: F-814-Fix, Reviewer-/QA-Pass, 29.09.2026.

**F-829** · `PROCESS_IMPROVEMENT` · P2 · teilweise
Titel: Das Workforce-Review hat keinen festen Qualitätsmaßstab jenseits der AKs.
Beschreibung: Das Review urteilt über die Akzeptanzkriterien. Dass die Checkliste `.claude/agents/code-reviewer.md` und die DoD aus der `CLAUDE.md` des Projekts als Review-Eingabe dienen, ist nicht belegt.
Fundstelle: Review-Schritt der Workflow-Vorlagen (`workflow-vorlagen/*.json`), Rolle review (`src/rollen/index.ts`).
Auswirkung: Mittel — Wartbarkeit, Fehler- und Leerzustände, Kommentarstandard werden nicht verlässlich geprüft.
Maßnahme: Checkliste und DoD als verbindliche Eingabe des Reviews mit Urteil je Punkt. Gemeinsam mit dem qa-Schritt (F-820) umsetzen.
Status: teilweise (F45 B2a-1, 13.10.2026): DoD aus CLAUDE.md und Checkliste aus `.claude/agents/code-reviewer.md` gehen als Teil der Projektkarte an jeden Code-Reviewer-Schritt, mit „Urteil je Punkt“: jeder nicht erfüllte Punkt ein eigener Befund (Präfix „DoD:“/„Checkliste:“), `empfehlung` beginnt mit „Checkliste: n geprüft, m nicht erfüllt, k nicht anwendbar“. Rest: strukturiertes Urteil je Punkt im Review-Schema v2 → B2a-3; qa-Schritt → B2b.
Feature/Run: F36 Reallauf (F3), 29.09.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-834** · `TECH_DEBT` · P3 · offen
Titel: Die Origin-Sperre ist ein Katalogdatum von `playwright-mcp`, keine Regel; Weiterleitung und Klick-Navigation sind weder gemessen noch beobachtet.
Beschreibung: Nur `ressourcen.test.ts:1014,1017` bindet `--allowed-origins {projekt_origins}` an die id `playwright-mcp`; ein zweiter Browser-MCP ohne das Flag wäre gültig und freigebbar. Freigegeben sind `browser_click` und `browser_type`; ob eine Weiterleitung oder ein Klick auf eine fremde Origin führt, ist nicht gemessen (`features/F36/nachweis-reallauf/README.md`). `navigate_adressen` erfasst nur `browser_navigate`, keine Klick- oder Weiterleitungs-Navigation (`kontrollzustand-laufakte-payload.schema.json:87`).
Fundstelle: siehe Beschreibung.
Auswirkung: Niedrig — lokal, Einzelnutzer; Playwright nennt das Flag selbst keine Sicherheitsgrenze.
Maßnahme: Messung Weiterleitung/Klick mit der installierten Fassung; Grenze in feature.md aufnehmen; bei einem zweiten Browser-MCP Regel statt Datum.
Status: offen.
Feature/Run: F36 Review-Pass (code-reviewer Befund 5, qa M1), 29.09.2026.

**F-835** · `TECH_DEBT` · P3 · offen
Titel: Rotfall-Lücken bei der git-Installation von Skills.
Beschreibung: Die Ablehnung von Submodulen (`src/ressourcen/skill-installation.ts:169`) und unbekannten Modi (`:170`) hat keinen Test. Für „ohne Hooks“ prüft das Gate nur, dass `core.hooksPath=` im Argv steht (`scripts/check-f36-ws5b-skill.mjs:372`); ein tatsächlich ausgelöster Hook als Rotfall fehlt.
Fundstelle: siehe Beschreibung.
Auswirkung: Niedrig — Implementierung vorhanden, nur nicht nach §8 erzwungen.
Maßnahme: je ein Rotfall-Test für Submodul, unbekannten Modus und einen Hook im Fixture-Repo.
Status: offen.
Feature/Run: F36 Review-Pass (code-reviewer Befund 7), 29.09.2026.

**F-836** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Serverstart-Prüfung führt Paketcode vor der Freigabe aus; der Hinweis vor dem Klick sagt das nicht.
Beschreibung: `src/ressourcen/installation.ts:507` startet das `bin` des frisch installierten Pakets mit den Rechten des Nutzers. `--ignore-scripts` verhindert Install-Skripte, nicht diesen Start.
Fundstelle: `src/ressourcen/installation.ts:507`; Bestätigungsblock „Freigeben & installieren“.
Auswirkung: Niedrig — durch den Klick gedeckt, aber nicht angekündigt.
Maßnahme: Satz im Bestätigungsblock: „Zur Prüfung wird der Server einmal gestartet.“
Status: offen.
Feature/Run: F36 Review-Pass (code-reviewer Befund 8), 29.09.2026.

**F-838** · `TECH_DEBT` · P3 · offen
Titel: Randfälle ohne Test und ohne dokumentierte Grenze aus dem F36-Review.
Beschreibung: (1) `inhalt_hash` wird nur vor dem Spawn geprüft; ein während des Laufs geänderter oder neu installierter Skill bleibt unbemerkt. (2) Ein Lauf ohne Ort-B, aber mit Katalog-MCP und abweichendem `init.mcp_servers` hat kein Init-Gate. (3) Worktrees teilen `~/.ai-workforce/cap` und tragen seit #281 committete FREIGEGEBEN-Einträge; ein Leitstand aus einer Worktree nutzt die Installation eines anderen Checkouts (beschrieben ist nur der 409-Fall). (4) Der Reallauf nutzte `frontend-design` im Folge-Workflow F3, nicht „im selben Durchstich“; wie `playwright-mcp` trotz F-825 (fiel aus der Liste „Passt, nicht im Lauf“) über den Knopf freigegeben wurde, ist nicht dokumentiert.
Fundstelle: `src/ressourcen/ort-b-start.ts:199-226`; `src/execution-controller/index.ts:418`; feature.md „WS-5a cap-Ordner“, „Reallauf“.
Auswirkung: Niedrig.
Maßnahme: Je Punkt Grenze in feature.md oder Test; (4) im Reallauf-Nachweis erklären.
Status: offen.
Feature/Run: F36 Review-Pass (qa Randfälle und M5), 29.09.2026.

**F-840** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Prüfrollen (Reviewer/QA) in Claude Code im Vordergrund laufen lassen und erst nach ihrem Ende berichten.
Beschreibung: Im F36 Review-Pass liefen `code-reviewer` und `qa` als Hintergrund-Agents. Die Variante kostete einen Leer-Umlauf: Der Bericht war vor ihrem Ende fertig, die Befunde kamen erst danach.
Fundstelle: F36 Review-Pass, 29.09.2026; CLAUDE.md, Definition of Done (Reviewer-/QA-Pass).
Auswirkung: Niedrig — ein zusätzlicher Umlauf, kein falsches Ergebnis.
Maßnahme: Prüfrollen starten und erst nach ihrem Ende berichten (das Agent-Werkzeug startet asynchron); bei Bedarf in der DoD von CLAUDE.md festhalten.
Status: offen.
Feature/Run: F36 Review-Pass, 29.09.2026.

**F-841** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Challenger gab einen Schreibweg für ein Artefakt-Format vor, ohne den Schemazweig zu lesen.
Beschreibung: Challenger gab im Bauauftrag PR 1 den Schreibweg art 'planaenderung' vor, ohne die je-Art-Zweige in `schemas/kontrollzustand-entscheidung-payload.schema.json` zu lesen; Claude Code fing es ab, ein Rückfrage-Zyklus.
Fundstelle: Bauauftrag Fixpaket PR 1 nach F36 (F-768); `schemas/kontrollzustand-entscheidung-payload.schema.json`.
Auswirkung: Niedrig — ein zusätzlicher Rückfrage-Zyklus, kein falsches Ergebnis.
Maßnahme: Vor Vorgaben zu Artefakt-Formaten den Schemazweig lesen.
Status: offen.
Feature/Run: Entdeckt: Fixpaket PR 1 nach F36, 30.09.2026.

**F-842** · `TECH_DEBT` · P3 · offen
Titel: Ein kaputtes Prozent-Escape in der laufId ergibt 500 statt 400.
Beschreibung: `requestHandler` ruft für `GET /api/laeufe/<laufId>` `decodeURIComponent` ohne try auf. `/api/laeufe/%E0` wirft einen URIError, der catch der Routenkette antwortet 500. Den Prozess beendet das nicht (anders als F-823).
Fundstelle: `scripts/leitstand-server.mjs` (Detailendpunkt `/api/laeufe/<laufId>`, `decodeURIComponent`).
Auswirkung: Niedrig — falscher Statuscode, keine Zustandsänderung.
Maßnahme: `decodeURIComponent` absichern, 400 `{ grund }`; Rotfall im Gate.
Status: offen.
Feature/Run: Fixpaket PR 2 nach F36, Reviewer-/QA-Pass, 30.09.2026.

**F-843** · `TECH_DEBT` · P3 · offen
Titel: Der Dateisystem-Vergleich von `<projekt>/.claude` (F-832) hat keine Größengrenze.
Beschreibung: `erfasseClaudeOrdner` liest vor und nach jedem Ort-B-Lauf alle Dateien unter `<projekt>/.claude`. Liegt dort z. B. `.claude/worktrees/` mit Repo-Kopien samt `node_modules`, kostet das zwei volle Durchgänge; schreibt eine parallele Sitzung dort, wird der Lauf rot (`claude_ordner_veraendert`, fail-closed).
Fundstelle: `src/execution-controller/index.ts` (`erfasseClaudeOrdner`).
Auswirkung: Niedrig — Laufzeit, schlimmstenfalls ein falsch roter Lauf; keine Lücke.
Maßnahme: Obergrenze für Dateianzahl/Bytes mit fail-closed-Marker; Ausnahmen wie `worktrees/` nur als bewusste Entscheidung.
Status: offen.
Feature/Run: Fixpaket PR 2 nach F36, Reviewer-Pass, 30.09.2026.

**F-845** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Die Kollisionsprüfung beim Ort-B-Start kennt die Slash-Command-Referenzmenge nicht.
Beschreibung: Die Kollisionsprüfung beim Ort-B-Start (`src/ressourcen/ort-b-start.ts`) kennt die Slash-Command-Referenzmenge (`src/claude-code-gateway/slash-commands-referenz.json`) nicht; ein Ort-B-Skill mit gleichem Namen wie ein Referenzeintrag würde vom Init-Gate als bekannt durchgelassen.
Fundstelle: `src/ressourcen/ort-b-start.ts`; `src/claude-code-gateway/slash-commands-referenz.json`.
Auswirkung: Niedrig — ein gleichnamiger Ort-B-Skill fiele im Init-Gate nicht auf.
Maßnahme: Solche Ort-B-Namen beim Start ablehnen.
Status: offen.
Feature/Run: Entdeckt: F-831, 30.09.2026.

**F-847** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Ein Projekt-Aufruf kann den Arbeitsbaum des Projekts verändern und damit die nächste Ausführung blockieren.
Beschreibung: Der `startbefehl` (F43) läuft in der Repo-Wurzel und schreibt typischerweise `ergebnis_datei` dorthin. Ist die Datei nicht gitignoriert, ist der Arbeitsbaum danach unsauber — eine schreibende Ausführung startet nur auf sauberem Baum (`src/ausfuehrung-vorbedingung/`) und blockiert.
Fundstelle: `src/projekt-aufruf/index.ts`; `features/F43/feature.md` „Bekannte Grenzen“.
Auswirkung: Niedrig — sichtbarer Blocker mit Grund, kein stiller Fehler.
Maßnahme: Vorerst Doku (ergebnis_datei im Projekt gitignoren). Bei F30 prüfen, ob der Aufruf den Arbeitsbaum vor/nach vergleichen und eine Änderung melden soll.
Status: offen.
Feature/Run: F43, 30.09.2026.

**F-848** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Regel 1j meldet eine Änderung am `startbefehl` nur für Workflow-Ausführungen.
Beschreibung: Die im Repo liegende Startvorlage gehört zu den Prüfketten-Mustern von Regel 1j (F-735), damit meldet ein Workflow-Schritt `ausfuehrung` eine Änderung am `startbefehl`. Ein direkter schreibender Lauf über `POST /api/laeufe` (Startformular) läuft nicht durch Regel 1j. Abgemildert: der Aufruf nutzt die beim Serverstart geladene Startvorlage (Änderung wirkt erst nach Neustart) und die Oberfläche zeigt das argv vor dem Klick.
Fundstelle: `scripts/leitstand-server.mjs` (Regel-1j-Berechnung im Workflow-Nachlauf, `POST /api/projekt-aufruf`).
Auswirkung: Niedrig — ein veränderter startbefehl bliebe bis zum nächsten Neustart wirkungslos und ist vor dem Klick sichtbar.
Maßnahme: Bei F30 entscheiden, ob der Aufruf einen gegenüber HEAD veränderten startbefehl ablehnt.
Status: offen.
Feature/Run: F43, 30.09.2026.

**F-850** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Ein registriertes Projekt mit ungültiger Startvorlage antwortet „404 Unbekanntes Projekt“.
Beschreibung: `baueProjektHandlerMap` überspringt einen Eintrag, dessen Handler beim Serverstart nicht gebaut werden kann (z. B. `startbefehl` mit `.cmd`), und loggt den Grund nur auf der Konsole; der Dispatcher antwortet für die id 404 „Unbekanntes Projekt“. F43 macht das wahrscheinlicher (unter Windows ist `npm` eine `npm.cmd`). Die Übersicht benennt den Fall seit F43 in Klartext, der Server liefert den Grund aber nicht.
Fundstelle: `scripts/leitstand-server.mjs` (`baueProjektHandlerMap`, `erzeugeMultiProjektDispatcher`); Gate `check-f25-projekte.mjs` (2d) legt das Überspringen fest.
Auswirkung: Niedrig — Projekt unerreichbar, Grund nur in der Konsole.
Maßnahme: Initialisierungsfehler je id merken und vom Dispatcher als 503 mit Grund liefern; Gate (2d) entsprechend anpassen.
Status: offen.
Feature/Run: QA-Pass F43, 30.09.2026.

**F-851** · `BUG` · P3 · offen
Titel: Der Baum-Kill nach Timeout/Abbruch in `prozessstart.ts` läuft auf eine schon freie PID.
Beschreibung: `echterStarter` ruft `killeProzessbaumFallsWindows(kindprozess.pid)` erst im `'close'`-Pfad auf (TIMEOUT/ABBRUCH), wenn das direkte Kind längst beendet und seine PID frei ist. Laut F-181 scheitert taskkill dort erwartbar; vergibt Windows die PID aber inzwischen neu, trifft `taskkill /T /F` einen fremden Prozessbaum. Dasselbe Muster galt im F43-Delta-Review als P2 und ist dort über `StarterOptionen.beiExit` behoben; die bestehenden Pfade (Claude-/Codex-Lauf, Prüfschritt) sind unverändert.
Fundstelle: `src/claude-code-gateway/prozessstart.ts` (`behandeleErgebnis`, Zweige ABBRUCH/TIMEOUT).
Auswirkung: Niedrig — schmales Zeitfenster, aber erzwungenes Beenden eines fremden Baums.
Maßnahme: Den Baum-Kill vor Nodes eigenem Kill auslösen (eigener Timer wie in `src/projekt-aufruf/`) oder den Aufruf im `'close'`-Pfad streichen, da er laut F-181 dort wirkungslos ist.
Status: offen.
Feature/Run: Abschluss-Review F43, 30.09.2026.

**F-852** · `TECH_DEBT` · P3 · offen
Titel: F43-Aufruf beendet an der Zeitgrenze den Prozessbaum nur unter Windows.
Beschreibung: F43-Aufruf beendet an der Zeitgrenze den Prozessbaum nur unter Windows; unter Linux/macOS können Enkelprozesse weiterlaufen (`killeProzessbaumFallsWindows` ist dort ein No-op, beendet wird nur das direkte Kind per SIGKILL). Real beobachtet vom Challenger unter Linux/Node 22 (wie CI ubuntu-latest): Enkel überlebte, Aufruf endete erst nach der Nachfrist (6503 ms).
Fundstelle: `src/projekt-aufruf/index.ts` (`fuehreAufrufDurch`); Gate `scripts/check-f43-projekt-aufrufen.mjs` (b)/(g).
Auswirkung: Niedrig — der Leitstand läuft real nur unter Windows; die CI prüft die plattformneutralen Zusagen.
Maßnahme: POSIX-Prozessgruppe (detached + kill(-pid)), sobald der Leitstand real auf Nicht-Windows läuft.
Status: offen.
Feature/Run: Challenger-Befund F43, 30.09.2026.

**F-853** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Gates werden lokal nur unter Windows verifiziert, die CI läuft auf ubuntu-latest.
Beschreibung: Claude Code verifiziert Gates nur unter Windows, die CI läuft auf ubuntu-latest; plattformabhängige Gates (F43 Baum-Kill) fielen erst beim Challenger auf.
Fundstelle: Bauaufträge (Handoff-Verträge); `scripts/check-f43-projekt-aufrufen.mjs` (g) als Beispiel einer Weiche.
Auswirkung: Niedrig — Plattformfehler werden spät (Challenger/CI) statt beim Bau sichtbar.
Maßnahme: Bauaufträge verlangen bei Prozess-/Dateisystem-Plattformbezug eine Weiche, die auf beiden Zweigen getestet ist.
Status: offen.
Feature/Run: Entdeckt: F43, 30.09.2026.

**F-855** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: vorschau_url darf auf eine zweite, parallel laufende Leitstand-Instanz zeigen.
Beschreibung: Die F-849-Sperre vergleicht nur mit dem gebundenen Port der eigenen Instanz. Läuft parallel ein weiterer Leitstand (z. B. aus einem Worktree mit anderem `LEITSTAND_PORT`), kann eine vorschau_url auf dessen Port zeigen; ein Browser-MCP eines Laufs bekäme dann den Origin dieser anderen Instanz freigeschaltet.
Fundstelle: `src/projekte/index.ts` (`vorschauLeitstandSperre`), `scripts/leitstand-server.mjs`.
Auswirkung: Niedrig — nur bei parallel laufenden Leitständen und passend gesetzter vorschau_url.
Maßnahme: Prüfen, ob die Zielseite ein Leitstand ist (z. B. Kennung im Antwort-Header vor der Freischaltung), oder als bekannte Grenze belassen.
Status: offen.
Feature/Run: Code-Review F-849, 30.09.2026.

**F-856** · `BUG` · P3 · offen
Titel: `POST /api/projekte` ist auch unter dem Projekt-Präfix erreichbar.
Beschreibung: Der Dispatcher reicht `POST /api/projekte/<id>/projekte` an die Projekt-Instanz durch; deren Handler führt dann den F41-Anlegeweg mit der `repoWurzel` des fremden Projekts aus (Baseline-Kopie aus dessen Repo, `projekte.lokal.json` im Projekt-Repo, Registrierung in eine private Map). Der Kommentar an der Route behauptet, eine Instanz erreiche den Zweig nie. POST-Pendant zu F-421 (dort nur GET). Altfehler aus F41, nicht durch F-849 entstanden.
Fundstelle: `scripts/leitstand-server.mjs` (POST `/api/projekte`, `erzeugeMultiProjektDispatcher`).
Auswirkung: Niedrig — nur über einen API-Aufruf mit Präfix erreichbar, die Oberfläche nutzt den unpräfigierten Pfad.
Maßnahme: In Projekt-Instanzen `POST /api/projekte` mit 404 ablehnen (Muster F-421) und im Gate belegen.
Status: offen.
Feature/Run: QA-Pass F-849, 30.09.2026.

**F-859** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Der F27-Scout taugt nicht für eine Stack-Recherche mit Lizenz-Volltext.
Beschreibung: Der Subagent `.claude/agents/scout.md` ist auf 3 WebFetch je Lauf, höchstens 5 Kandidaten und das Ziel `ressourcen.json` zugeschnitten. Eine Stack-Recherche mit Lizenzvolltext, Paketregister und Datenwirkung je Kandidat braucht deutlich mehr Abrufe und schreibt in `docs/harness/stack-kandidaten.md`. F-800 lief deshalb als Claude-Code-Recherche (38 WebFetch, 2 WebSearch).
Fundstelle: `.claude/agents/scout.md`; `docs/harness/stack-kandidaten.md` (Abschnitt „Scout F-800 (30.09.2026)“).
Auswirkung: Niedrig — der Scanner-Architekt (F30) hat für Stack-Recherchen keinen passenden Scout.
Maßnahme: Vor F30 klären, ob und wie der Scanner-Architekt einen Scout nutzt.
Status: offen.
Feature/Run: Scout F-800, 30.09.2026.
Zugeordnet: F30 (Opportunity Scanner; Challenger-Zuschnitt F45 F-1, 11.10.2026: kein Fixpaket-Thema). Vorher: Fixpaket Arbeitsfähigkeit (E-M5-18, 01.10.2026).

**F-864** · `TECH_DEBT` · P3 · offen
Titel: Der einzige Browser-Klicktest blockiert nicht.
Beschreibung: `scripts/check-f20-leitstand-shell.mjs` ist der einzige echte Klicktest des Leitstands; er läuft nur in CI und dort mit `continue-on-error`, blockiert also nichts.
Fundstelle: `scripts/check-f20-leitstand-shell.mjs`; `.github/workflows/ci.yml` (Schritt mit `continue-on-error: true`).
Auswirkung: Niedrig — im Umbau ersetzen ihn die Render-Nachweise je Paket.
Maßnahme: Nach F44 WS-5 entscheiden, ob er mit neuen Selektoren blockierend wird.
Status: offen.
Feature/Run: Challenger-Dokument 474 (F-725), 30.09.2026.

**F-866** · `TECH_DEBT` · P3 · offen
Titel: Die Übersetzungen ins Türkische und Russische entstehen ohne muttersprachliche Prüfung.
Beschreibung: Mit E-F44-2 = B gehören de/en/tr/ru zum Design-Schnitt. Das geplante i18n-Gate prüft nur Vollständigkeit (Schlüssel, Platzhalter, Pluralformen), nicht die Qualität der Übersetzung.
Fundstelle: geplant `public/leitstand/i18n/` (F44 WS-1); `docs/design/abgleich-f725.md` §5.4.
Auswirkung: Niedrig — mögliche fehlerhafte oder unidiomatische Texte in tr/ru.
Maßnahme: Übersetzungen im Wörterbuch-Kopf als „maschinell, ungeprüft“ kennzeichnen; eine Prüfung durch eine muttersprachliche Person bei Bedarf nachholen.
Status: offen.
Feature/Run: Challenger-Dokument 474 (F-725), 30.09.2026.

**F-868** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: `docs/STATUS.md` enthält einen absoluten Benutzerpfad (öffentliches Repo).
Beschreibung: Der Abschnitt zur Autorisierungsgrenze (F3) nennt den Ordner des Autorisierungs-Repos mit vollständigem Windows-Benutzerpfad. Nach F-858 stehen im öffentlichen Repo nur relative Pfade.
Fundstelle: `docs/STATUS.md` (Abschnitt „Erledigt“, Autorisierungsgrenze, D16).
Auswirkung: Niedrig — Offenlegung von Benutzername und Ordnerstruktur.
Maßnahme: Pfad relativ bzw. als Platzhalter („Autorisierungs-Repo neben dem Produkt-Repo“) schreiben; bei der Gelegenheit das Repo nach weiteren Benutzerpfaden durchsuchen.
Status: offen.
Feature/Run: Code-Review F44 WS-0, 30.09.2026.

**F-869** · `TECH_DEBT` · P3 · offen
Titel: Die Designvorlage liegt mit rund 21 MB im öffentlichen Repo.
Beschreibung: WS-0 hat die Vorlage V10 byte-gleich abgelegt, dazu 50 Referenz-Screenshots als PNG (`docs/design/vorlage-v10/screens/`, rund 16 MB) und die PNG-Originale der Bilder (`assets/`, rund 5 MB). Jede Neuerzeugung der Screenshots vergrößert die Git-Historie um dieselbe Menge.
Fundstelle: `docs/design/vorlage-v10/screens/`, `docs/design/vorlage-v10/assets/`.
Auswirkung: Niedrig — Klon- und Historiengröße, kein Laufzeitrisiko.
Maßnahme: Referenz-Screenshots nur bei einer Änderung der Vorlage neu erzeugen; dann prüfen, ob WebP genügt. Nachweise der Pakete klein halten (WebP über `render-nachweis`, seit F44 WS-1a). Ausgeliefert wird in WS-1a nur eine verkleinerte WebP-Fassung von `gear.png` (480 × 480, 87 KB), weil kein verlustfreier WebP-Encoder ohne neue Abhängigkeit verfügbar war; das Original bleibt unter `docs/design/vorlage-v10/assets/`.
Status: offen.
Feature/Run: Challenger F44 WS-1a, 30.09.2026.

**F-870** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: impeccable wird nicht freigegeben.
Beschreibung: Das Repo `pbakaus/impeccable` trägt rund 20 Kopien des Skills (je Agent-Harness eine), einen Binär-Starter (`scripts/impeccable` startet eine Plattform-Binärdatei) und Verweise auf Projekt-Agents, die in der Ausführung gesperrt sind (F-815). Ein eindeutiger `skill_pfad` lässt sich nicht festlegen, ohne eine der Kopien willkürlich zu wählen.
Fundstelle: `features/F44/feature.md` (WS0-6); `state/uebergabe-aktuell.md` (Stand WS-0).
Auswirkung: Niedrig — der design-guardian arbeitet ohne impeccable; gestaltende Skills sind für F44 ohnehin ausgeschlossen (die Vorlage ist fest).
Maßnahme: Im Feature „Harness im Lauf“ neu bewerten (Skill-Kopien, Binär-Starter, Agents nach F-815).
Status: offen.
Feature/Run: Challenger F44 WS-1a, 30.09.2026.

**F-871** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: TERMINAL-Blöcke des Challengers nennen den Worktree nicht immer.
Beschreibung: Mit mehreren Worktrees nebeneinander (`../aiw-f725-ws0`, `../aiw-f725-ws1a` …) ist ein TERMINAL-Block ohne `cd` auf den Worktree und ohne Kontrolle des Branchs fehleranfällig: Ein Befehl kann im falschen Arbeitsverzeichnis landen.
Fundstelle: Übergaben des Challengers (`state/uebergabe-aktuell.md`, Bedienregeln).
Auswirkung: Niedrig — Risiko eines Commits oder Checks im falschen Worktree.
Maßnahme: TERMINAL-Blöcke des Challengers beginnen immer mit `cd <Worktree>` und `git branch --show-current`.
Status: offen.
Feature/Run: Challenger F44 WS-1a, 30.09.2026.

**F-872** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Referenzbilder der Vorlage für en/tr/ru fehlen.
Beschreibung: WS-0 sollte die Vorlage auch in den anderen Sprachen abbilden; `docs/design/vorlage-v10/screens/` enthält nur deutsche Bilder. Wie sich die längste Sprache (ru, tr) im Layout verhält, lässt sich deshalb nicht an der Vorlage vergleichen.
Fundstelle: `docs/design/vorlage-v10/screens/`; `docs/design/vorlage-v10/erzeuge-screens.mjs`.
Auswirkung: Niedrig — Layoutbrüche langer Texte fallen erst am Produkt auf.
Maßnahme: Die längste Sprache wird am Produkt geprüft (Render-Nachweis ru/tr je UI-Paket, erstmals `features/F44/nachweise/ws1a/ru-*`, `tr-*`) statt an der Vorlage.
Status: offen.
Feature/Run: Challenger F44 WS-1a, 30.09.2026.

**F-875** · `TECH_DEBT` · P3 · offen
Titel: Nach einem Projektwechsel wartet der neue Zustands-Abruf auf das Ende des verworfenen alten.
Beschreibung: `zustand.js` verwirft seit F44 WS-1a die Antwort eines Abrufs, der vor dem Projektwechsel begann, bricht ihn aber nicht ab. Der Nachlauf mit dem neuen Präfix startet erst danach — bei langsamem Server bis zum Zeitlimit von 5 s (F-561); so lange zeigen Dashboard und Workboard „Lädt…“.
Fundstelle: `public/leitstand/zustand.js` (`verwerfeLaufendenZustand`, `pollJetzt`).
Auswirkung: Niedrig — Wartezeit nach dem Wechsel, keine falschen Daten.
Maßnahme: Den alten Abruf per AbortController abbrechen; die Zusage „nie zwei Abrufe gleichzeitig“ bleibt dabei erhalten. Gate `check-f20-zustand-poll` um einen Fall ergänzen.
Status: offen.
Feature/Run: Code-Review F44 WS-1a, 30.09.2026.

**F-876** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Die Nachweis-Matrix der UI-Pakete ist zu breit, die Prüfer laufen nacheinander (NEU-H).
Beschreibung: WS-1a lieferte Render-Nachweise über vier Routen in sechs Darstellungen plus Sprache, Bedienung und Projektwechsel, und design-guardian, code-reviewer und qa liefen in zwei Durchgängen nacheinander. Das kostete mehr Zeit als der Bau und brachte in der Breite kaum zusätzliche Befunde.
Fundstelle: `features/F44/nachweise/ws1a/` (Matrix); `features/F44/feature.md` (Stand WS-1a, Prüfpässe).
Auswirkung: Mittel — Durchlaufzeit je UI-Paket, Kontextverbrauch.
Maßnahme: Kleinste Matrix je Paket (nur die Darstellungen, die das Paket ändert), die drei Prüfer parallel und einmal am Ende, danach höchstens eine Korrekturrunde; der Rest wird Finding. Erstmals angewendet in F44 WS-1b (`features/F44/nachweise/ws1b/`).
Status: offen.
Feature/Run: Challenger F44 WS-1b, 30.09.2026.

**F-877** · `TECH_DEBT` · P2 · offen
Titel: Zwei Gates wackeln unter Windows (NEU-I).
Beschreibung: `check-f20-zustand-poll` scheitert gelegentlich an einem Messwert (Zeitgrenze), `check-f36-ws5b-skill` gelegentlich mit „TypeError: fetch failed“ in der Vorbereitung (l); beide sind beim Wiederholen grün. Beobachtet in WS-1a und erneut in WS-1b (30.09.2026, 23:47 Ortszeit, `check-f36-ws5b-skill` einmal rot, einzeln und in der Kette danach grün; parallel lief ein Leitstand auf Port 4173).
Fundstelle: `scripts/check-f20-zustand-poll.mjs`, `scripts/check-f36-ws5b-skill.mjs` (Abschnitt l).
Auswirkung: Mittel — rote Kette ohne Codefehler, Wiederholen kostet Minuten.
Maßnahme: Toleranz für den Messwert in `check-f20-zustand-poll`; Wiederholung mit kurzer Pause für den Verbindungsaufbau in `check-f36-ws5b-skill` (l).
Status: offen.
Feature/Run: Challenger F44 WS-1b, 30.09.2026.

**F-879** · `TECH_DEBT` · P3 · offen
Titel: „Entwicklung“ trägt bis WS-3/WS-5 zwei Untereinträge.
Beschreibung: Die Sidebar der Vorlage kennt nur „Entwicklung“. Bis Ausführungen (`#/runs`) und Auftrag & Start (`#/projekt`) in der Entwicklung aufgehen, stehen sie als eingerückte Untereinträge darunter; „Entwicklung“ gilt für workboard, runs und projekt als aktiv (`:has()` in style.css).
Fundstelle: `public/leitstand/index.html` (`.nav-gruppe`); `public/leitstand/style.css` (`#shell-nav .nav-gruppe`).
Auswirkung: Niedrig — Abweichung von der Vorlage, zwei zusätzliche Einträge.
Maßnahme: Untereinträge entfernen, wenn WS-3 (Entwicklung) und WS-5 (Ausführungen & Direktstart) die Ansichten zusammenführen.
Status: offen.
Feature/Run: F44 WS-1b, 30.09.2026.

**F-881** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Planung nahm eine Neukalibrierung des Persona-Bilds an, die Vorlage zeigt es ohne Zuschnitt.
Beschreibung: Challenger-Dokumente 474/480 und die Paketbeschreibung von WS-1 sahen vor, Zuschnitt, Orb, Avatar und Augen-Overlay auf das neue Bild „neu zu kalibrieren“. Die Vorlage zeigt das Gesicht aber überall ganz (`object-fit: contain`, `.persona-portrait`, `.bubble-persona`) — es gibt nichts zu kalibrieren, Zuschnitt und Overlay entfallen.
Fundstelle: `docs/design/abgleich-f725.md` §4 Punkt 5 („Risiko Bildtausch“); `docs/design/vorlage-v10/style.css`.
Auswirkung: Niedrig — Planungsaufwand für eine Arbeit, die es nicht gibt.
Maßnahme: Die Checkliste des design-guardian verlangt, vor Planungsannahmen zur Gestaltung die Vorlage-CSS zu lesen.
Status: offen.
Feature/Run: Challenger F44 WS-1b, 30.09.2026.

**F-882** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Übergabe von Binärdateien vom Challenger per Chat-Download ist gescheitert.
Beschreibung: Das verlustfreie Persona-Bild für WS-1b sollte als Download aus dem Challenger-Chat kommen; der Download beim Menschen scheiterte. Claude Code hat die Datei stattdessen lokal erzeugt: `cwebp -lossless -exact -z 9` (cwebp-bin, libwebp 1.2.1) in einem Wegwerf-Ordner außerhalb des Repos, abgenommen über einen Pixelvergleich (dwebp nach PAM gegen pngjs-Dekodierung des PNG: 1536×1024 RGBA, 0 abweichende Bytes; SHA-256 8a7bf0bc90d7c4e6cda6eeea9e3c861e8fad655123301738117eb6db5de5064a).
Fundstelle: `public/leitstand/persona-gesicht.webp`; `docs/design/vorlage-v10/assets/face.png`.
Auswirkung: Niedrig — Verzögerung, kein Qualitätsverlust.
Maßnahme: Binärdateien erzeugt Claude Code lokal mit Wegwerf-Werkzeugen außerhalb des Repos (keine Änderung an package.json); die Abnahme läuft über einen byteweisen Pixelvergleich.
Status: offen.
Feature/Run: F44 WS-1b, 30.09.2026.

**F-883** · `BUG` · P3 · offen
Titel: Bei ausgefallenem Zustands-Poll bleiben Persona-Status und Wartezeile auf dem alten Stand.
Beschreibung: Scheitert GET …/zustand ganz, zeigt #poll-fehler das Banner, aber zustand.js benachrichtigt die Abonnenten nur bei Erfolg: Die Statuszeile (einzige aria-live-Region) behält z. B. „Bereit für deine Idee“, ein Screenreader erfährt vom Ausfall nichts; die Wartezeile der Startfläche bleibt beim ersten Laden auf „Lädt…“ (das Banner ist dort ausgeblendet). Die Vorlage sieht „Status unbekannt“ vor (Abgleich A5/A9). Dazu: Im Zustand error zählt die Wartezeile nur Startfehler und Läufe, die Übersicht „Attention“ auch wartende Workflows (26 gegen 32 im Nachweis). Gefunden von qa und design-guardian (F44 WS-1b).
Fundstelle: `public/leitstand/zustand.js` (Abonnenten nur bei Erfolg), `public/leitstand/persona.js` (aktualisierePersona), `public/leitstand/views/start.js` (ermittleWarteText); Nachweis `features/F44/nachweise/ws1b/pollfehler`.
Auswirkung: Mittel — veralteter Status neben dem Fehlerbanner, keine Ansage.
Maßnahme: zustand.js meldet einen Fehlschlag an die Abonnenten (eigener Rückruf oder Zustand „unbekannt“); Persona-Text „Status unbekannt“ in de/en/tr/ru; Zählregel der Wartezeile an Attention angleichen. Gate `check-f20-zustand-poll` beachten.
Status: offen.
Feature/Run: Prüfpass F44 WS-1b, 30.09.2026.

**F-885** · `BUG` · P3 · offen
Titel: Ein Projektwechsel verwirft offene Eingaben ohne Rückfrage.
Beschreibung: Seit WS-1b reicht für einen Projektwechsel ein Klick in der Kopfauswahl (vorher: Alle Produkte, „Öffnen“). Der Neuladen-Hook (F-860) setzt projektgebundene Ansichten zurück; eine angefangene Pflichtbegründung, ein Reparaturentwurf oder ein Chat-Entwurf geht dabei ohne Hinweis verloren. Prüfpunkt aus dem QA-Pass WS-0, bisher nicht festgelegt. Verwandt mit F-874.
Fundstelle: `public/leitstand/shell.js` (initProjektAuswahl), `public/leitstand/projekt-kontext.js` (setzeAktivesProjekt).
Auswirkung: Mittel — Verlust einer getippten Begründung.
Maßnahme: Verhalten festlegen (Rückfrage, wenn eine Eingabe offen ist, oder Entwurf je Projekt halten) und mit F-874 in WS-4 umsetzen.
Status: offen. Vermerk (Challenger, 01.10.2026): von P2 auf P3 gesenkt; Auslöser für die Umsetzung ist ein realer Verlust einer Eingabe. Vermerk F44 WS-4a (01.10.2026): Seit WS-4a verwirft der Projektwechsel eine angefangene Begründung im Freigabe- bzw. Stoppdialog ohne Rückfrage (F-874); dieselbe Klasse ist Browser-Zurück bei offenem Dialog (der Dialog schließt ohne Wirkung, die Begründung ist weg). Gerettet wird sie nur, wenn eine Stand-Änderung den Dialog schließt und derselbe Halt wieder geöffnet wird. Vermerk F44 WS-5b (01.10.2026): Auf `#/projekt` bleiben Titel, Ergebnis und Kontext beim Projektwechsel stehen (der Text gehört dem Menschen); verworfen wird nur eine laufende Vorbereitung des alten Projekts (späte Antworten, Aggregat-Treffer). Die übrigen Eingaben (Begründungen in Dialogen, Reparaturentwurf, Chat) bleiben offen.
Feature/Run: QA-Pass F44 WS-1b, 30.09.2026.

**F-886** · `BUG` · P3 · offen
Titel: Startfläche: „Zurück“ springt über #/start wieder vor, der Fokus fällt nach dem Betreten auf body.
Beschreibung: Nach bereits gezeigter Fläche leitet `beimBetreten()` per navigiere() mit neuem Verlaufseintrag weiter; „Zurück“ aus der Produktübersicht landet auf #/start und wird sofort wieder vorgeleitet (Altbestand F29, durch die Wortmarke als zweiten Einstieg häufiger). Nach Enter auf „Enter the Rabbit hole“ liegt der Fokus auf dem nun versteckten Link und fällt auf body. Die Autofokus-Listener werden je Eintritt neu angehängt (harmlos).
Fundstelle: `public/leitstand/views/start.js` (beimBetreten).
Auswirkung: Niedrig — Verlauf und Tastaturfokus.
Maßnahme: Weiterleitung per location.replace; nach dem Betreten den Fokus auf die Überschrift der Zielansicht setzen; Listener je Eintritt über einen AbortController.
Status: offen.
Feature/Run: Prüfpass F44 WS-1b (code-reviewer, qa), 30.09.2026.

**F-887** · `BUG` · P3 · offen
Titel: „Zuletzt geöffnet“ setzt bei Projekt-Einträgen das Projekt nicht.
Beschreibung: Ein gemerktes Projekt (aus „Öffnen“ in Alle Produkte) führt beim Klick nur nach #/dashboard des aktuell aktiven Projekts, statt das gemerkte Projekt zu aktivieren. Der Wechsel über die Kopfauswahl wird nicht gemerkt. Logik unverändert seit F29 WS-D2 (Auftrag WS-1b: Logik unverändert lassen).
Fundstelle: `public/leitstand/zuletzt-geoeffnet.js`, `public/leitstand/views/projekte-uebersicht.js` (merkeGeoeffnet), `public/leitstand/shell.js` (initZuletztGeoeffnet).
Auswirkung: Niedrig — irreführender Eintrag.
Maßnahme: Projekt-Einträge setzen das Projekt über setzeAktivesProjekt; entscheiden, ob die Kopfauswahl ebenfalls merkt.
Status: offen.
Feature/Run: Prüfpass F44 WS-1b (code-reviewer, qa), 30.09.2026.

**F-888** · `TECH_DEBT` · P3 · offen
Titel: #/produktzyklus zeigt noch nicht die Struktur der Vorlage (K1).
Beschreibung: WS-1b liefert nach Auftrag nur Titel, Einleitung, „Notiz hinzufügen“ mit „kommt“ und den Leerzustand „Produktbriefing“. K1 und §9 des Abgleichs sehen die Gliederung der Vorlage vor (Ideate / Plan / Deliver mit den Schritten; Deliver-Schritte verlinken auf vorhandene Sichten, „Deployen“ bleibt Z). Gefunden vom design-guardian.
Fundstelle: `public/leitstand/views/platzhalter.js` (produktzyklusSeite); `docs/design/vorlage-v10/screens/d_produktzyklus_ideate_strategy.png`.
Auswirkung: Niedrig — Seite ärmer als die Vorlage.
Maßnahme: Phasen und Schrittleiste statisch nach der Vorlage ergänzen, Deliver-Schritte auf #/workboard, #/attention und #/runs verlinken, „Deployen“ mit kommtKnopf — in WS-2 oder einem eigenen kleinen Paket.
Status: offen.
Feature/Run: design-guardian F44 WS-1b, 30.09.2026.

**F-890** · `TECH_DEBT` · P3 · offen
Titel: Barrierefreiheit der Shell: Reste nach WS-1b.
Beschreibung: (1) Unter 700 px liegt der Öffner unter der offenen Sidebar; es gibt keinen Fokus-Einschluss im offenen Menü (Escape, Klick außerhalb und Klick auf einen Eintrag schließen es). (2) Der Profil-Link heißt für Screenreader „Stefan Dein persönliches Atelier“ und nennt sein Ziel (Einstellungen) nicht; die Wortmarke sagt nicht, dass sie die Startfläche öffnet. (3) Die Links der Zwischenseiten (#/roadmap, #/nutzung) landen oben auf der Zielseite, nicht an der Karte. Gefunden von qa (F44 WS-1b).
Fundstelle: `public/leitstand/shell.js` (initMenue), `public/leitstand/index.html` (#shell-profil, #shell-marke), `public/leitstand/views/platzhalter.js`.
Auswirkung: Niedrig.
Maßnahme: Beim nächsten Shell-Paket: Fokus-Einschluss oder Schließknopf im Menü, sprechende Namen über t(), Sprungziel zur Karte (entfällt mit WS-2/WS-6, F-880).
Status: offen.
Feature/Run: QA-Pass F44 WS-1b, 30.09.2026.

**F-893** · `TECH_DEBT` · P3 · offen
Titel: Roadmap ohne Hover-Detail (D1, 600 ms).
Beschreibung: Die Vorlage zeigt auf der Roadmap nach 600 ms Verweilen ein Detail zum Eintrag (Abgleich F-725 D1). `#/roadmap` bietet nur den Klick ins Workboard-Detail; einen Tooltip-Baustein gibt es im Leitstand nicht.
Fundstelle: `public/leitstand/views/roadmap.js`.
Auswirkung: Niedrig — ein Klick statt eines Blicks.
Maßnahme: Nachziehen, sobald ein Tooltip-Baustein existiert.
Status: offen.
Feature/Run: F44 WS-2a, 01.10.2026.

**F-894** · `BUG` · P2 · offen
Titel: Die Roadmap neuer Fremdprojekte besteht die Roadmap-Prüfung des Leitstands nicht.
Beschreibung: `haushaltsbuch2` trägt eine `docs/projekt/roadmap.json`, die ein Baudurchgang aus dem Product-Coach-Auftrag geschrieben hat: mit `auftrag_id`, `ziel` je Meilenstein, Features als Objekte und ohne `vision`. `validiereRoadmapDaten` lehnt sie mit 9 Regelverstößen ab; `#/roadmap` zeigt deshalb „ungültig“ statt der Meilensteine. Ursache: Der Auftragstext verlangt das Bestehen von `validiereRoadmapDaten` nur für ai-workforce selbst (`kontext.istAiWorkforce`), für Fremdprojekte nennt er weder Format noch Prüfung.
Fundstelle: `src/product-coach/index.ts` (Auftrag an den Baudurchgang, Punkt 2), `src/projektkontext/index.ts` (validiereRoadmapDaten), `docs/projekt/roadmap.json` im Projekt haushaltsbuch2.
Auswirkung: Mittel — ein über den Coach aufgesetztes Fremdprojekt zeigt keine Roadmap, obwohl es eine hat.
Maßnahme: Das Roadmap-Format im Auftragstext auch für Fremdprojekte vorgeben (Schema oder Beispiel beilegen) oder die Projektion für die Coach-Form öffnen; bestehende Fremdprojekt-Roadmaps nachziehen. Nicht Teil von F44 (`src/` bleibt dort unberührt).
Status: offen.
Feature/Run: Ursachenprüfung F-854, F44 WS-2a, 01.10.2026.

**F-899** · `TECH_DEBT` · P3 · offen
Titel: Der Fokus-Nachtrag veraltet, solange die ID des Fokus-Workflows gleich bleibt.
Beschreibung: Schritte, Abnahme-Flags und aktiver Lauf des Fokus-Workflows laden nur bei wechselnder Workflow-ID (Vorgabe WS-2b, Muster Workboard-Bento); seit der Korrekturrunde WS-2b in der Übersicht zusätzlich beim Betreten der Seite und 30 s nach einem Fehlschlag. Schreitet derselbe Workflow fort, während die Übersicht offen bleibt (ein Schritt endet, der nächste läuft), zeigen „Aktuelle Rolle“ (B3, Rolle des laufenden Schritts), „Wer macht was“ (B11) und „Zuletzt umgesetzt“ (B12, Schritte x/y) den alten Stand, bis die Fokus-ID wechselt oder das Projekt gewechselt wird. Wartet der Workflow auf Freigabe oder Rückfrage, stimmt B3 immer (kommt aus dem Aggregat).
Fundstelle: `public/leitstand/views/dashboard.js` (stelleNachtraegeSicher), `public/leitstand/views/workboard.js` (aktualisiereFokusCache).
Auswirkung: Niedrig bis mittel — veraltete Rolle/Schrittzahl während eines laufenden Ablaufs.
Maßnahme: Den Schlüssel des Nachtrags um `versionSequenz` aus dem Aggregat erweitern (ändert sich nur bei einer neuen Workflow-Version, also nicht bei jedem Poll-Tick) — gemeinsam für Übersicht und Workboard in WS-3.
Status: offen.
Feature/Run: F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026.

**F-900** · `TECH_DEBT` · P3 · offen
Titel: Die Übersicht zeigt Rollen als rohe Rollen-ID.
Beschreibung: „Aktuelle Rolle“ und „Wer macht was“ nennen die Rolle eines Schritts als ID aus dem Workflow (z. B. `ausfuehrung`, `code-reviewer`), unübersetzt. Die Vorlage zeigt sprechende Phasen- und Rollennamen; das Workboard führt dafür eine eigene, deutsche Zuordnung (`ROLLEN_ICON`). Eine übersetzte Rollenliste gibt es noch nicht.
Fundstelle: `public/leitstand/views/dashboard.js` (rolleKarte, werSpalte).
Auswirkung: Niedrig — lesbar, aber technisch.
Maßnahme: Mit WS-7 (Workforce: Katalog, Rollen) ein Rollenverzeichnis mit Schlüsseln in vier Sprachen anlegen und in Übersicht und Workboard nutzen.
Status: offen.
Feature/Run: F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026.

**F-901** · `TECH_DEBT` · P3 · offen
Titel: Überholschutz und Blockzustände der Übersicht nur über den Wechsel-Test und Nachweise belegt.
Beschreibung: `projekt-wechsel.test.mjs` belegt das Neuladen und den Leerzustand B14; die übrigen Blockzustände (Roadmap ungültig/Fehler, Aggregat defekt, Nachtrag fehlgeschlagen) und der Überholschutz der drei Lader sind nur über Render-Nachweise belegt, nicht einzeln getestet. Die Blöcke sind keine reinen Funktionen (lesen Modulzustand).
Fundstelle: `public/leitstand/views/dashboard.js`.
Auswirkung: Niedrig — Regressionen fallen erst im Nachweis auf.
Maßnahme: Blockfunktionen auf Parameter umstellen (Zustand hinein, HTML heraus) und mit node:test gegen die Zustände prüfen; mit WS-3, wenn das Workboard dieselben Bausteine nutzt. Dabei ergänzen (Prüfpass WS-2b): ein Unit-Test für „+ x weitere“ in `#/attention` (F-898, bisher nur Render-Nachweis), ein Fall für die Generation der Fokus-Nachträge (später Nachtrag des alten Projekts), Negativfälle zu B14 (Roadmap-Fehler mit leeren Workitems, Workitems-Fehler mit `nicht_vorhanden`). Belegt sind seit der Korrekturrunde: kein Nachladen aus dem Poll und eine späte Roadmap-Antwort des alten Projekts (`projekt-wechsel.test.mjs`, Rot unter Mutation geprüft).
Status: offen.
Feature/Run: F44 WS-2b, Branch `feat/f725-ws2b-uebersicht`, 01.10.2026.

**F-902** · `TECH_DEBT` · P3 · offen
Titel: „Aktuelle Rolle“ und „Deine nächsten Entscheidungen“ wählen den ersten wartenden Workflow unterschiedlich.
Beschreibung: `waehleFokusWorkflow` nimmt den ersten wartenden Workflow in der Reihenfolge der Quelle; `baueEntscheidungen` sortiert Freigaben vor Rückfragen. Im Nachweis steht B3 auf „Deine Rückfrage“, während B7 oben drei Freigaben zeigt. Die Logik ist für das Workboard bewusst unverändert umgezogen.
Fundstelle: `public/leitstand/fokus-daten.js` (waehleFokusWorkflow), `public/leitstand/attention-daten.js` (baueEntscheidungen).
Auswirkung: Niedrig — zwei Blöcke nennen verschiedene „nächste“ Aufgaben.
Maßnahme: `waehleFokusWorkflow` auf die Reihenfolge von `baueEntscheidungen` (Freigabe vor Rückfrage) umstellen, gemeinsam für Übersicht und Workboard (WS-3).
Status: offen.
Feature/Run: Prüfpass F44 WS-2b, 01.10.2026 (code-reviewer, qa).

**F-906** · `TECH_DEBT` · P3 · offen
Titel: Fokus-Nachtrag ohne Zeitlimit und doppelt geladen.
Beschreibung: `holeWorkflowDetail` und `holeAbnahme` haben kein Zeitlimit; ein hängender Abruf lässt B3/B11/B12 auf „Lädt…“ stehen. Workboard und Übersicht laden denselben Nachtrag getrennt (je eigener Cache).
Fundstelle: `public/leitstand/api.js` (holeWorkflowDetail, holeAbnahme), `public/leitstand/fokus-daten.js`.
Auswirkung: Niedrig.
Maßnahme: Zeitlimit wie holeRoadmap; ein gemeinsamer Cache in `fokus-daten.js` (mit F-899, WS-3).
Status: offen.
Feature/Run: Prüfpass F44 WS-2b, 01.10.2026 (code-reviewer).

**F-907** · `TECH_DEBT` · P3 · offen
Titel: Kleinere Bedien- und Darstellungspunkte der Übersicht und von #/nutzung.
Beschreibung: (a) B2–B4 und B7–B8 werden je als ein Block geschrieben; ändert sich ein Teil (Lauf startet), verliert ein fokussierter Link darin den Fokus. (b) `#/nutzung`: ein Zeitraumklick schreibt die ganze Seite neu (Fokus auf body), der aktive Zeitraum hat kein `aria-pressed` (Markup bis WS-6 unverändert). (c) Je Feature in B10 ein fokussierbarer Z-Knopf „ohne Priorität“ — viele Tab-Stopps ohne Wirkung. (d) B11 ohne Status-Pill im Kopf (Vorlage „• Abnahme offen“). (e) Für Workitems und P0/P1 gibt es auf der Übersicht kein „Erneut laden“ (nur für die Roadmap). (f) B12 nimmt bei mehreren Workflows je Auftrag den ersten. (g) `#/attention` setzt beim Projektwechsel das Aggregat nicht zurück (kurz alte Workflows neben neuen Befunden). (h) B5 „Deine Entscheidung“ (wartende Workflows) und der B7-Zähler (alle vier Quellen) sind ähnlich benannt, zählen aber Verschiedenes. (i) `aria-disabled` an den Z-Containern Deployer und „Als Nächstes vorgesehen“ (Invariante „Z mit aria-disabled“) wirkt für Hilfstechnik nicht; die Sperre in `kommt.js` würde einen späteren Link darin verschlucken (im Kopf von `kommt.js` vermerkt).
Fundstelle: `public/leitstand/views/dashboard.js`, `public/leitstand/views/nutzung.js`, `public/leitstand/views/attention.js`.
Auswirkung: Niedrig.
Maßnahme: (a)(c)(e)(f)(h) mit WS-3, (b) mit WS-6, (d)(i) beim nächsten Übersichts-Durchgang, (g) mit dem nächsten Attention-Paket.
Status: offen.
Feature/Run: Prüfpass F44 WS-2b, 01.10.2026 (design-guardian, code-reviewer, qa).

**F-908** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Challenger-Übergaben nennen Node 22, package.json verlangt 24.x.
Beschreibung: Die Aufträge (Claude-Übergaben 483 ff.) sagen „Wenn Node 22 fehlt: Node-Version im Bericht nennen“; `package.json` legt `engines.node` auf `24.x` fest, verifiziert wird hier mit Node 24.16.0. Eine Übergabe, die eine andere Laufzeit nennt als die Paketdatei, lädt zu einer Verifikation auf der falschen Version ein.
Fundstelle: `package.json` (engines), Claude-Übergaben 483 ff.
Auswirkung: Niedrig — Verwirrung im Bericht, Gefahr einer Verifikation unter falscher Version.
Maßnahme: Übergaben nennen die Laufzeit aus `package.json` (Node 24.x) bzw. keine Versionsnummer in Prosa (CLAUDE.md); Verifikation unter Node 24.
Status: offen.
Feature/Run: Entdeckt im WS-2b-Bericht, 01.10.2026.

**F-910** · `TECH_DEBT` · P2 · teilweise
Titel: Plugins sind im Fähigkeitenmodell nicht abgebildet; init.plugins wird nicht geprüft.
Beschreibung: Der Katalog kennt die Typen worker, skill, agent und extern (mcp|skill), aber keine Plugins; `init.plugins` eines Laufs prüft `pruefeInitZeile` nicht.
Fundstelle: `ressourcen.json` (Typen worker, skill, agent, extern mcp|skill), `pruefeInitZeile`.
Auswirkung: Das Ziel „Claude arbeitet mit Plugins“ hat keinen Weg.
Maßnahme: Fixpaket Arbeitsfähigkeit, B4.
Status: teilweise (F45 F-1, 12.10.2026, Teil Init-Gate): `pruefeInitZeile` verlangt `init.plugins` leer (fehlend = Verstoß); jeder Lauf mit Init-Gate schaltet die eingebauten Plugins per `--settings enabledPlugins` ab (Spike F-1 S3: `cc-plugin-telemetry@builtin`, `cc-plugin-plugin-authoring@builtin` auch mit `--setting-sources project`). Offen (F-2): Plugins im Fähigkeitenmodell/Katalog.
Nachtrag (F45 F-3a-1, 14.10.2026): Entscheidung Stefan 13.10.2026 — Quelle sind Stefans in Claude Code installierte Plugins, nicht die Sammlung. Bestand gelesen (nur lesend, `claude plugin list --json` + Plugin-Ordner, `src/claude-plugins/`, Route GET `/api/plugins`, Gate `check-f45-f3a-plugins.mjs`): superpowers (inaktiv), gitkraken, design, cowork-plugin-management (aktiv, synced). Spike `features/F45/nachweise/f3a/spike.md`: (a) Plugin-Bestandteile erscheinen mit Präfix `<plugin>:` in init.skills/agents/slash_commands, `init.plugins` = `<name>@inline`; (b) Plugin-Hooks laufen; (c) allowed-tools eines Commands erweitert den Werkzeugsatz; (d) `enabledPlugins:false` wirkt auf `--plugin-dir`. Unter CLI 2.1.299 ist `init.plugins` mit den heutigen Settings weiter `[]`. Offen: Anzeige im Leitstand (F45 F-3a-2), Plugins im Lauf (F-1090, F45 F-3b).
Nachtrag (F45 F-3a-2, 14.10.2026): Anzeige erledigt — Reiter „Plugins aus deinem Claude Code“ in der Capability Library (Liste, Detail mit Bestandteilen und Risiken, eingebaute getrennt mit Messversion, leer/unlesbar mit Grund, fester Hinweis „Noch nicht im Workforce-Lauf nutzbar — kommt im nächsten Schritt.“; gelesen nur bei Reiterwahl und „Neu laden“; Gate `check-f45-f3a2-anzeige.mjs`). Offen bleibt nur Plugins im Lauf (F-1090, F45 F-3b).
Nachtrag (F45 F-3b-1, 14.10.2026): Plugins freigeben gebaut (gefilterte Kopie `src/plugin-kopie`, Prüfbericht über die Kopie, Freigabe an Hash und Bericht gebunden, Zuordnung je Rolle nur Ausführung); `init.plugins` bleibt `[]`, Startargumente unverändert. Offen: Plugins im Lauf (F-1090, F45 F-3b-2).
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-911** · `TECH_DEBT` · P2 · offen
Titel: Fremdprojekte haben keine Design-Prüfkette.
Beschreibung: design-guardian fehlt im Projekt-Skelett und in den Workflow-Vorlagen. impeccable steht auf OFFEN und hat keine `installation_vorlage`. Render-Nachweis und Token-Gate gibt es nur in ai-workforce. Installiert ist nur frontend-design.
Fundstelle: `vorlagen/projekt-skelett/.claude/agents`, `workflow-vorlagen/*.json`, `ressourcen.json`.
Auswirkung: Oberflächen in Fremdprojekten werden ohne Design-Prüfung gebaut.
Maßnahme: Fixpaket Arbeitsfähigkeit, B3.
Status: offen.
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-912** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Der Coach legt in bestehenden Projekten keine Feature-Akte an; der Scope wird direkt zum Auftrag.
Beschreibung: Im bestehenden Projekt macht der Coach aus dem Scope direkt einen Auftrag (`baueAuftragAusScope`), ohne eine Feature-Akte anzulegen.
Fundstelle: `src/product-coach/index.ts` (baueAuftragAusScope), `public/leitstand/auftrag-aus-scope.js`.
Auswirkung: Coach-Ideen erscheinen nicht als Feature im Board, AK werden nicht in einer Akte gepflegt, und F35 „Bauen aus der Akte“ greift nicht.
Maßnahme: Fixpaket Arbeitsfähigkeit, B5.
Status: offen.
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-915** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: 49 offene P0/P1-Befunde überlagern B10 und `#/attention`.
Beschreibung: 49 offene P0/P1-Befunde, viele seit August unverändert, überlagern B10 und `#/attention`.
Fundstelle: `state/findings.md`; Anzeige `public/leitstand/views/dashboard.js` (B10), `public/leitstand/views/attention.js`.
Auswirkung: Mittel für die Orientierung — das aktuell Wichtige geht unter alten Einträgen unter.
Maßnahme: Sichtungsrunde der alten P1 (schließen, herabstufen, bestätigen); prüfen, ob B10 mindestens die offenen Features des aktuellen Meilensteins zeigt. Kandidat Fixpaket „Arbeitsfähigkeit“.
Status: offen.
Feature/Run: Entdeckt: Verifikation F44 WS-2b.

**F-916** · `TECH_DEBT` · P3 · verworfen
Titel: Abnahme-Vorauswahl ohne Erzeuger nach dem Entfernen des Bentos.
Beschreibung: Die Abnahme-Vorauswahl (`ABNAHME_VORSCHLAG_SCHLUESSEL`) hat nach dem Entfernen des Bentos keinen Erzeuger mehr. Korrektur zur Fundstelle des Auftrags: Erzeuger (Aktionsleiste „AI Workflow“) und Verbraucher (`beobachteAbnahmeVorschlag`, hebt in `#/workflows/<id>` den passenden Abnahme-Knopf hervor) lagen beide in `views/workboard.js` und hingen nur am Bento; mit ihm sind beide entfernt, samt der CSS-Regel `.abnahme-vorgewaehlt`. `views/workflows.js` ist unverändert und hatte keinen eigenen Verbraucher.
Fundstelle: `public/leitstand/views/workboard.js` (bis F44 WS-3a: ABNAHME_VORSCHLAG_SCHLUESSEL, beobachteAbnahmeVorschlag, initBentoBedienung); Ziel `public/leitstand/views/workflows.js` (`#wf-abnahme-begruendung`, `.wf-abnahme-aktion`).
Auswirkung: Niedrig — der Sprung aus einer Übersicht in die Abnahme wählt keine Aktion mehr vor; die Abnahme selbst ist unverändert.
Maßnahme: In WS-4 aus dem neuen Abnahmeblock bzw. der Übersicht wieder anbinden oder endgültig verwerfen.
Status: verworfen (F44 WS-4a, 01.10.2026): Die Vorauswahl hat keinen Erzeuger mehr und bringt gegenüber der Abnahmeseite keinen Nutzen — dort stehen Annehmen, Ablehnen und Anpassung anfordern mit Pflichtbegründung ohnehin direkt bereit.
Feature/Run: Entdeckt: Challenge F44 WS-3.

**F-917** · `TECH_DEBT` · P2 · entschieden
Titel: Prioritäts-Kanban (E2): Auftrag WS-3a und Abgleich §4 Punkt 4 widersprechen sich.
Beschreibung: Der Auftrag WS-3a verlangt „Kanban · Priorität“ als „kommt“ ohne Daten; so ist es gebaut. `docs/design/abgleich-f725.md` §4 Punkt 4 (verbindlich über E-F44-1) sagt dagegen: Das Prioritäts-Kanban zeigt die echten Prioritäten der Findings, Features stehen unter „ohne Priorität“, nur das Ziehen ist deaktiviert. design-guardian hat die Abweichung im Prüfpass WS-3a als „hoch (Verfahren)“ gemeldet.
Fundstelle: `public/leitstand/views/workboard.js` (baueFesteBedienung, `#workboard-modi`); `docs/design/abgleich-f725.md` §4 Punkt 4.
Auswirkung: Mittel — ohne Entscheidung bleibt eine dokumentierte Zusage unerfüllt; die Daten lädt die Seite bereits.
Maßnahme: Stefan entscheidet: (a) in WS-3b ein lesendes Prioritäts-Kanban (Spalten P0–P4 und „ohne Priorität“ aus den ungefilterten Workitems, Ziehen und Auswahlfelder „kommt“) oder (b) §4 Punkt 4 anpassen und E2 bleibt „kommt“.
Status: entschieden (Stefan, 01.10.2026): E2 „Kanban · Priorität“ bleibt in F44 „kommt“ (deaktiviert, keine Daten). Ein nur lesendes Prioritäts-Kanban ist Kandidat für das Fixpaket „Arbeitsfähigkeit“ (Baustein B5 Feature-Fluss) — dort neu bewerten. Vermerk in `docs/design/abgleich-f725.md` §4 Punkt 4 und `features/F44/feature.md` (Stand WS-3a). Vermerk (01.10.2026): entschieden: wird gebaut (Stefan, 01.10.2026), Fixpaket ‚Arbeitsfähigkeit‘ Baustein B5. Erst lesend, dann Ziehen = Prioritätsänderung mit Pflichtbegründung; Features bekommen ein Prioritätsfeld in der Akte.
Feature/Run: Entdeckt: Prüfpass F44 WS-3a (design-guardian), 01.10.2026.

**F-918** · `TECH_DEBT` · P3 · entschieden
Titel: Listen-Tabs filtern mit Chips statt mit den Auswahlfeldern der Vorlage.
Beschreibung: `d_arbeit_features` zeigt neben der Suche Auswahlfelder „Alle Status“/„Alle Prioritäten“. WS-3a behält die Filter-Chips aus F29 (`workboard-filter-*`, Gate f21-ws2 (a)) mit rohen Statuswerten als Beschriftung.
Fundstelle: `public/leitstand/index.html` (`#workboard-filter`), `public/leitstand/views/workboard.js` (fuelleChipGruppe).
Auswirkung: Niedrig — gleiche Funktion, andere Form; viele Status-Chips brauchen bei 390 px mehrere Zeilen.
Maßnahme: In WS-3b Auswahlfelder mit übersetzten Optionen bauen (IDs bleiben) oder die Chips als Abweichung festhalten.
Status: entschieden (Auftrag WS-3b, 01.10.2026): Die Chips bleiben als bewusste Abweichung von der Vorlage. Begründung: gleiche Funktion (Serverfilter Typ/Status/Priorität), die IDs `workboard-filter-*` prüft Gate f21-ws2 (a), und ein Umbau auf Auswahlfelder änderte nichts an den Daten.
Feature/Run: Entdeckt: Prüfpass F44 WS-3a (design-guardian), 01.10.2026.

**F-919** · `TECH_DEBT` · P3 · offen (teilweise erledigt)
Titel: Board mit echten Daten wenig aussagekräftig; „+ x weitere“ zeigt die ganze Spalte.
Beschreibung: Mit über 500 offenen Findings zeigt „Geplant“ nur alte P0/P1-Befunde, Features stehen ohne Priorität dahinter und erscheinen kaum; „Abgenommen“ zeigt die ältesten P0-Einträge statt der zuletzt abgenommenen; „Braucht dich“ besteht aus alten Features im FEATURE_GATE. „+ x weitere“ führt in den Listen-Tab mit der ganzen Spalte (auch die Karten, die schon auf dem Board stehen) — die Zahl auf dem Knopf und die Länge der Liste passen nicht zusammen.
Fundstelle: `public/leitstand/entwicklung-daten.js` (Sortierung in baueBoard), `public/leitstand/views/workboard.js` (renderListe mit Spaltenfilter).
Auswirkung: Niedrig bis mittel für die Orientierung; die Regel selbst ist wie beauftragt.
Maßnahme: Mit der Sichtung F-915 entscheiden: Sortierung von „Abgenommen“ nach Erledigungsdatum (falls verfügbar), Features im Board sichtbarer (eigene Stufe oder Priorität in der Akte), Liste nach „+ x weitere“ ohne die Karten des Boards oder Knopftext „alle x anzeigen“.
Status: offen, teilweise erledigt (F44 WS-3b, 01.10.2026; Kopfzeile „offen (teilweise erledigt)“, damit der Workitem-Parser den offenen Rest nicht als ERLEDIGT zählt): Sortierung je Spalte P0, P1, Feature-Akten, P2, P3, P4, ohne Priorität (`entwicklung-daten.js`, rang; Test gegen die alte Reihenfolge rot); der Sprung heißt „Alle x anzeigen“, x zählt alle Einträge der Spalte im Ziel-Tab (`jeTab`), damit Zahl und Liste zusammenpassen. Offen bleibt die Sortierung von „Abgenommen“ nach Erledigungsdatum (mit der Sichtung F-915).
Feature/Run: Entdeckt: Prüfpass F44 WS-3a (qa), 01.10.2026.

**F-924** · `BUG` · P3 · offen
Titel: Feature-Ordner außerhalb des ID-Musters: technischer Fehlertext und ein Einstieg, der scheitert.
Beschreibung: Die Workitem-Liste übernimmt jeden Ordner unter `features/` (etwa `F100-neu`). Das Detail zeigt dann rot „Die Akte konnte nicht gelesen werden“ mit dem 400-Text „featureId muss dem Muster … entsprechen (F-595)“, bietet aber „Auftrag vorbereiten“ an, das am selben Muster scheitert. Ähnlich zeigt eine unvollständige Akte den Servergrund „… — kein Auftrag ableitbar“, der Einstieg bleibt trotzdem stehen.
Fundstelle: `public/leitstand/views/workboard.js` (renderBearbeitungsAbschnitt), `public/leitstand/views/workboard-detail.js` (akteHinweis), `src/workboard/features.ts`.
Auswirkung: Niedrig.
Maßnahme: Einstieg nur bei lesbarer Akte anbieten (nach dem Nachtrag), sonst ein Hinweis; den Parser-Befund für Ordner außerhalb des Musters in E6 zeigen.
Status: offen → Fixpaket Arbeitsfähigkeit B5 (Vermerk F44 WS-4a, 01.10.2026).
Feature/Run: Entdeckt: Prüfpass F44 WS-3b (qa, code-reviewer), 01.10.2026.

**F-927** · `TECH_DEBT` · P3 · offen
Titel: Detail ohne Zeile „Letzter Worker · Modell“ und ohne Hinweis auf weitere Abläufe bzw. fehlende Quellen.
Beschreibung: „Wer macht was“ im Detail zeigt unter jedem Schritt „Worker · Status“; die Übersicht (B11) und die Vorlage zeigen „Letzter Worker · Modell: nicht beobachtet“ aus der Laufakte. Hat ein Eintrag mehrere verknüpfte Abläufe, zeigt das Detail den maßgeblichen ohne Hinweis auf die übrigen. Sind Workflows oder Aufträge nicht verfügbar, sagt das Detail „Ohne Ausführungsstand nicht bestimmbar“, nennt die Quelle aber nicht (das Board nennt sie).
Fundstelle: `public/leitstand/views/workboard-detail.js` (werBlock), `public/leitstand/views/workboard.js` (pruefeDetailNachtrag).
Auswirkung: Niedrig.
Maßnahme: Laufakte des laufenden Schritts wie `fokus-daten.js` ladeFokusNachtrag nachladen (beim Öffnen und bei Übergängen); Zahl weiterer Abläufe mit Link; fehlende Quelle nennen.
Status: offen → Fixpaket Arbeitsfähigkeit B5 (Vermerk F44 WS-4a, 01.10.2026).
Feature/Run: Entdeckt: Prüfpass F44 WS-3b (design-guardian, qa), 01.10.2026.

**F-928** · `TECH_DEBT` · P3 · offen
Titel: `views/workboard.js` ist mit rund 1 400 Zeilen zu groß; Click-to-Work gehört in ein eigenes Modul.
Beschreibung: WS-3b hat das Rendern des Details nach `views/workboard-detail.js` ausgelagert. Click-to-Work (Zustandsautomat, Klick-Ketten, Auffrischer, Rendern) liegt weiter in `workboard.js`. `empfehlung-anzeige.test.mjs` liest den Quelltext von `views/workboard.js` (Abstand Installierbar-Hinweis zu `wb-freigeben`) und müsste beim Umzug mitziehen.
Fundstelle: `public/leitstand/views/workboard.js`, `public/leitstand/empfehlung-anzeige.test.mjs`.
Auswirkung: Niedrig — Wartbarkeit.
Maßnahme: In WS-4 oder im Fixpaket „Arbeitsfähigkeit“ ein Modul `views/click-to-work.js` mit klarer Schnittstelle (Workitem, Container) schneiden; Test und Gate begründet mitziehen.
Status: offen → Fixpaket Arbeitsfähigkeit B5 (Vermerk F44 WS-4a, 01.10.2026).
Feature/Run: Entdeckt: Prüfpass F44 WS-3b (code-reviewer), 01.10.2026.

**F-929** · `PROCESS_IMPROVEMENT` · P2 · teilweise
Titel: Unklar, wie Codex-Schritte (Architekt, Review) die Harness-Regeln bekommen.
Beschreibung: Workflow-Vorlagen setzen für Architekt und Review den Worker codex ein. Codex lädt keine Claude-Skills; ob und wie die Harness-Regeln (CLAUDE.md, ARCHITECTURE.md, Skills) in diese Schritte gelangen, ist nicht belegt.
Fundstelle: `workflow-vorlagen/hoch.json` (worker codex).
Auswirkung: Mittel — Planung und Review durch Codex folgen dem Harness womöglich nicht.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 1.
Status: teilweise (F45 B2a-1, 13.10.2026): Codex-Schritte (Architekt, Review) bekommen die Harness-Regeln als Text im Auftrag — Projektkarte mit ARCHITECTURE.md, ADRs, DoD aus CLAUDE.md, Ausführungsrahmen, beim Review die Checkliste aus `.claude/agents/code-reviewer.md`; gleich für Claude und Codex. Skills bleiben für Codex nicht ladbar (bewusst, keine zweite Wahrheit wie AGENTS.md). Rest: Codex-Review-Spec → B2a-3 (F-1063).
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-930** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: F38 als „gestufter Kontext“ neu fassen.
Beschreibung: Kontext gestuft statt pauschal: eine Projektkarte immer, Steckbriefe je Phase bzw. Feature bei Bedarf, Quellen gezielt. Die Stufen werden aus dem Repo erzeugt und tragen einen Stempel des Quellstands (Muster `docs/projekt/kontext/lagebild.md` und Gate f40). Ein Index bzw. Graph (z. B. Graphify) bleibt wegwerfbar und verweist nur. Gliederung nach Ideate – Plan – Deliver.
Fundstelle: F38 (Feature-Schnitt); `docs/projekt/kontext/lagebild.md`; Gate `scripts/check-f40-lagebild.mjs`.
Auswirkung: Mittel — ohne Stufung wächst der Kontext je Rolle unkontrolliert.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18): Verbrauch je Rolle in F30 messen, danach F38 neu schneiden (nach F30, nicht im Fixpaket).
Status: offen.
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-931** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: ARCHITECTURE.md wirkt nur im Plan, nicht nachweislich in Bau und Review.
Beschreibung: Architekt und Architecture-Advisor lesen ARCHITECTURE.md bzw. prüfen dagegen; für den Bauschritt, das Review und qa ist nicht belegt, dass ARCHITECTURE.md Prüfmaßstab ist oder gelesen wird.
Fundstelle: `src/architekt/index.ts:766`, `src/architecture-advisor/index.ts:46`, `vorlagen/projekt-skelett/CLAUDE.md`.
Auswirkung: Mittel — Konventionen greifen im Plan, können im Bau aber unbemerkt verletzt werden.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 1 (Prüfmaßstab für Review und qa, Lesen in der Ausführung beobachten).
Status: teilweise (F45 B2a-1, 13.10.2026): Code-Reviewer (Claude und Codex) bekommt ARCHITECTURE.md als Prüfmaßstab in der Projektkarte („ein Verstoß gegen Konventionen oder verbotene Patterns ist ein Befund“), der Advisor den Auszug. Rest: qa-Schritt gibt es erst mit B2b; ob die Ausführung ARCHITECTURE.md liest, ist weiterhin nur über CLAUDE.md-Pflichtlektüre gedeckt (F-1082 (4)).
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-932** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: Hooks im Workforce-Lauf ungeprüft; PostToolUse-Lint (Harness G7) fehlt auch in ai-workforce.
Beschreibung: kopiereBaseline kopiert `.claude/settings.json` und alle Hooks in neue Projekte. Nicht belegt ist, ob sie im -p-Lauf mit `--setting-sources project` feuern und ob session-reminder und zwischenstand-* dort sinnvoll sind. Der Lint-Hook aus `docs/harness/HARNESS-OVERVIEW.md` (Ebene 3) steht nicht in `.claude/settings.json`.
Fundstelle: `src/projekt-anlegen/index.ts:185` (kopiereBaseline), `.claude/settings.json`, `docs/harness/HARNESS-OVERVIEW.md`.
Auswirkung: Mittel — Schutz- und Komfort-Hooks wirken im Workforce-Lauf womöglich nicht oder falsch; ein behaupteter Lint-Schritt fehlt.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 1.
Status: teilweise (F45 B1b-1, 11.10.2026): PreToolUse real belegt — `-p`-Lauf mit `--setting-sources project` und den Skelett-Hooks: ein Edit auf `.claude/settings.json` verweigert der guard-settings-Hook (Grund im tool_result, Datei byte-gleich), `features/F45/nachweise/b1b1/zaehlung-hooks.json`. F45 B1b-2 (11.10.2026): realer `-p`-Lauf mit den Root-Hooks von ai-workforce (byte-gleiche Kopie, `features/F45/nachweise/b1b2/zaehlung-hooks.json`): commit-guard verweigert `rm -rf` über Bash und `Remove-Item -Recurse -Force` über PowerShell, guard-settings das Edit auf die settings.json; SessionStart (zwischenstand-laden) feuert (`hook_response` outcome success), bleibt aber ohne Inhalt (kein Zwischenstand für `wf/<Ablauf>`); für UserPromptSubmit und PreCompact meldet stream-json kein Ereignis. Im Harness-Abgleich: commit-guard/guard-settings wirksam (statisch, an Hash und Matcher gebunden), session-reminder/zwischenstand-* bewusst nicht. Offen: PostToolUse-Lint (B3).
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-933** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Die Lernschleife /lessons gibt es in der Workforce nicht.
Beschreibung: Im Harness hält `/lessons` (`.claude/commands/lessons.md`) Erkenntnisse einer Sitzung fest; die Workforce hat nach einer Abnahme keinen entsprechenden Schritt.
Fundstelle: `.claude/commands/lessons.md`.
Auswirkung: Niedrig — Erkenntnisse aus Läufen gehen verloren; fehlende Grundlage für den gestuften Kontext (F-930).
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 1: nach der Abnahme ein Lessons-Eintrag; Grundlage für F-930 (K2).
Status: offen.
Feature/Run: Entdeckt: Challenger, Fragen Stefan 01.10.2026.

**F-936** · `PROCESS_IMPROVEMENT` · P1 · teilweise
Titel: Architekt, Advisor und Review (Codex) bekommen Vision und Projektkontext nicht als Eingabe.
Beschreibung: Projektbeschreibung, Arbeitsweise, Roadmap/Vision und Lagebild bekommen nur Router und Jarvis. Der Architekt bekommt Auftragstext, Rolleninstruktion und die entschiedenen ADRs, bei offenem Stack die Stackliste und im Projektmodus einen Capability-Auszug. Dass Codex im Read-only-Sandbox selbst Repo-Dateien liest, ist Zufall und kein Verfahren.
Fundstelle: `scripts/leitstand-server.mjs`, `baueProjektkontextAnfragen` (ca. Z. 1996); aufgerufen nur für Router und Jarvis (ca. Z. 6949, 7126); Architekt-Kontext ca. Z. 4870 ff.
Auswirkung: Hoch. Planende und prüfende Rollen urteilen ohne Vision und Ziele.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 2. Eine Projektkarte (Vision, Ziele, Roadmap, Lagebild) geht an alle planenden und prüfenden Rollen. Architekt, Advisor und Review bekommen zusätzlich ARCHITECTURE.md und die ADRs. Zusammen mit F-929 und F-930.
Status: teilweise (F45 B2a-1, 13.10.2026): Architekt, Architecture-Advisor und Code-Reviewer (Claude und Codex) bekommen beim Schrittstart die Projektkarte als Text im Auftrag — Projektbeschreibung (`docs/projekt/kontext/beschreibung.md`), Auftrag mit Ziel/AK/Nicht-Zielen, Auszug ARCHITECTURE.md, entschiedene ADRs (Architekt/Advisor über den bindenden ADR-Block, Review als Text), Ordnerübersicht (`src/projektkarte`, `starteWorkflowSchritt`); Hash/Abschnitte/Lücken in der Laufakte (`projektkarte`). Rest: Roadmap/Vision und Lagebild stehen nicht in der Karte (Größe; F-1082 (1)).
Feature/Run: Entdeckt: Challenger, Frage Stefan 01.10.2026.

**F-937** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: Die Laufakte-Beobachtung (Skill-, Subagent- und MCP-Aufrufe) erreicht weder Review noch Abnahme.
Beschreibung: Die Laufakte erfasst `skill_aufrufe`, `subagent_aufrufe` und `mcp_aufrufe` (claude-code-gateway). Angezeigt wird das nur im Leitstand. Code-Review und Abnahme bekommen es nicht und können deshalb nicht prüfen, ob die vorgesehenen Skills und Agents benutzt wurden.
Fundstelle: `public/leitstand/beobachtung-zeile.js`; Laufakte (claude-code-gateway).
Auswirkung: Mittel. „Harness als Verfahren“ (E-M5-19) ist nicht nachprüfbar.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 1. Das Review prüft „vorgesehen gegen benutzt“, die Abnahme zeigt eine Kurzliste der benutzten Fähigkeiten.
Status: teilweise (F45 B1b-1, 11.10.2026): der code-reviewer-Schritt (Claude und Codex) bekommt die Beobachtung des Ausführungslaufs als kurzen, deterministischen Block (geladen gegen aufgerufen: Skills, Subagenten, MCP-Server; Hintergrund-Aufrufe; ohne Beobachtung der Satz „keine Beobachtung“) — `baueBeobachtungsBlock`, Test `scripts/leitstand/review-beobachtung.test.mjs`. Seit F45 B1b-2 (11.10.2026) zeigt die Abnahme (und das Lauf-Detail) die Kurzliste der benutzten Fähigkeiten des Ausführungslaufs — Skills, Subagenten, MCP-Server je mit Anzahl, Hintergrund-Aufrufe (`baueFaehigkeitenKurzliste`, Zählregel `zaehleNamen` des Gateways; Feld `faehigkeiten` im Artefakt `harness-abgleich-<workflowId>`; Tests `src/harness-abgleich/harness-abgleich.test.ts`, `public/leitstand/harness-abgleich-anzeige.test.mjs`). Offen: „vorgesehen“ aus dem Arbeitspaket (B2a).
Feature/Run: Entdeckt: Challenger, Frage Stefan 01.10.2026.

**F-939** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: Das Projekt-Skelett hat keine Mindest-Qualitätsgates.
Beschreibung: `vorlagen/projekt-skelett` bringt nur check-contract, check-docs und check-rules mit. Lint, Typecheck, Tests mit Untergrenze sowie ein Abhängigkeits- und Sicherheitsscan sind nicht vorgegeben. Der Prüfschritt führt nur aus, was das Fremdprojekt selbst in `npm run check` definiert.
Fundstelle: `vorlagen/projekt-skelett/scripts`.
Auswirkung: Mittel. Wie gut der Code wird, hängt davon ab, was der Architekt im Fremdprojekt zufällig einrichtet.
Maßnahme: Fixpaket Arbeitsfähigkeit (E-M5-18), Baustein 1 bzw. 3. Eine stack-abhängige Gate-Vorlage mit allen vier Gates in `npm run check`, die der Architekt bei der Stack-Entscheidung mit anlegt. Der Prüfschritt bricht bei Rot ab.
Status: teilweise (F45 B1a-2, 11.10.2026): Skelett hat `scripts/check-gates.mjs` in `check` (Platzhalter fail-closed mit Verweis auf die Gate-Vorlage, `npm audit --audit-level=high` mit Lock-Datei, lokaler gitleaks-Scan oder sichtbarer Hinweis, Hook-Probelauf), `scripts/tests-mit-untergrenze.mjs` und `docs/harness/gate-vorlage-node.md` (eslint, tsc --noEmit, node:test mit Untergrenze); Hinweis in Skelett-CLAUDE.md/ARCHITECTURE.md; Template-Hooks, CI mit Secret-Scan, SETUP.md nachgezogen. Offen: nur Node/TS; der Workforce-Prüfschritt neuer Projekte ruft weiter `check:template` (pruefbefehl), die Gates wirken dort erst, wenn die Vorlage angewendet und der pruefbefehl auf `check` umgestellt ist (Schritt der Vorlage); die Architekten-Rolle wendet die Vorlage nicht automatisch an (B2a/B2b).
Feature/Run: Entdeckt: Challenger, Frage Stefan 01.10.2026.

**F-941** · `TECH_DEBT` · P3 · offen
Titel: `views/workflows.js` liegt mit rund 990 Zeilen knapp unter der Grenze; die Dialogsteuerung gehört in ein eigenes Modul.
Beschreibung: Nach dem Modulschnitt WS-4b (F-935) trägt `views/workflows.js` Laden, Kennzeichen, Dialogsteuerung (offenerDialog, laufendeDialogBedienung, geretteteBegruendung, dialogUeberholt, retteBegruendung) und alle POSTs. Die Korrekturrunde (Sperre der Abnahme, Sichtung nur für den angezeigten Halt, späte Antworten) hat die Datei wieder an 1 000 Zeilen herangeführt.
Fundstelle: `public/leitstand/views/workflows.js`.
Auswirkung: Niedrig — Wartbarkeit; jede weitere Bedienung überschreitet die Grenze.
Maßnahme: In WS-5 (oder vorher) die Dialogsteuerung samt Kennzeichen-Vergleich in ein eigenes Modul (z. B. `views/workflow-dialog.js`) schneiden; POSTs bleiben in `workflows.js`, Gate f15 (h) und `workflows-dialog.test.mjs` begründet mitziehen.
Status: offen.
Vermerk (F44 WS-5a, 01.10.2026): nicht geschnitten — WS-5a fasst `views/workflows.js` nur für die Route `#/ausfuehrungen` an (989 Zeilen); das Lauf-Detail hat eine eigene, kleine Dialogsteuerung in `views/runs.js` (Muster von `workflows.js`, Test `views/runs-dialog.test.mjs`). Ein gemeinsames Dialogmodul für beide bleibt Kandidat für den Schnitt.
Feature/Run: Entdeckt: Prüfpass F44 WS-4b (code-reviewer), 01.10.2026.

**F-942** · `TECH_DEBT` · P3 · offen
Titel: Ausführungsliste ohne Worker und Rolle.
Beschreibung: Die Vorlage V10 (d_arbeit_verlauf) zeigt je Ausführung „Worker · Rolle“ unter dem Titel. Die Kopfdaten von GET /api/laeufe (`sammleLaufKopfdaten`, über das Zustands-Aggregat) tragen beides nicht — nur das Lauf-Detail (Laufakte, Kontextpaket) kennt Worker und Rolle. Die Liste zeigt deshalb Titel, laufId, Status, Kenntnisnahme und Zeit; Worker und Rolle stehen erst in der „Einordnung“ des Details.
Fundstelle: `scripts/leitstand-server.mjs` (`sammleLaufKopfdaten`), `public/leitstand/views/lauf-detail.js` (`laufZeile`).
Auswirkung: Niedrig — die Liste ist weniger aussagekräftig als die Vorlage, nichts Falsches wird gezeigt.
Maßnahme: Bei Bedarf Worker (Laufakte) und Rolle (Kontextpaket) in die Kopfdaten aufnehmen — mit Memo bzw. im bestehenden Kopfdaten-Cache, ohne Mehrlast je Poll; danach die Zeile um „Worker · Rolle“ ergänzen.
Status: offen.
Feature/Run: Entdeckt: Challenge WS-5, 01.10.2026.

**F-943** · `TECH_DEBT` · P3 · offen
Titel: Kette „Auftrag anlegen → routen → auf Vorschlag warten“ existiert zweimal.
Beschreibung: Click-to-Work in `views/workboard.js` (fuehreAuftragserzeugungUndRoutungDurch, verarbeiteRoutenAntwort, aktualisiereBearbeitungsZustand) und „Ablauf vorbereiten“ auf `#/projekt` (`views/projekt.js` mit dem reinen Modul `views/auftrag-vorbereitung.js`, F44 WS-5b) legen beide einen Auftrag an, routen ihn, behandeln 409 (D13) mit „Wiederholen“ ohne zweiten Auftrag und warten auf `router-<auftragId>` bzw. einen Startfehler zu genau dieser laufId. Das Workboard wartet über den Detail-Auffrischer (GET …/workflows/<id>), `#/projekt` über das Zustands-Aggregat.
Fundstelle: `public/leitstand/views/workboard.js`, `public/leitstand/views/projekt.js`, `public/leitstand/views/auftrag-vorbereitung.js`.
Auswirkung: Niedrig — Wartbarkeit; eine Regeländerung (etwa am 409-Pfad) muss an zwei Stellen nachgezogen werden.
Maßnahme: Beim Schnitt F-928 (Fixpaket B5) in ein gemeinsames Modul ziehen.
Status: offen.
Feature/Run: Entdeckt: Challenge WS-5b, 01.10.2026.

**F-944** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Timeline aus Schätzungen statt Kalenderdaten.
Beschreibung: Jedes Feature, jeder Workstream, jedes Finding und jeder Meilenstein bekommt eine Aufwandsspanne in Arbeitstagen (min–max, „geschätzt von“, Datum); Findings ohne Angabe erhalten einen Standardwert je Priorität mit Kennzeichen; Meilensteine summieren ihre Features. Timeline = Reihenfolge (Roadmap, Priorität) × Schätzung ab heute, als Band frühestens–spätestens, klar als „geschätzt“ gekennzeichnet, ohne manuell gepflegte Kalenderdaten. Erledigte Einträge zeigen Plan gegen Ist (Branch angelegt → gemergt bzw. Laufakten).
Fundstelle: Feature-Akten (Pakettabelle), `state/findings.md`, Roadmap-Ansicht.
Auswirkung: Mittel — ohne Schätzungen keine belastbare Planung bis V0.9/V1.0.
Maßnahme: im Fixpaket „Arbeitsfähigkeit“ B5 bauen (≈ 3–4 Arbeitstage zusammen mit dem Prioritäts-Kanban, F-917); Schätzung wird Teil des Arbeitspakets (F-938). Bis dahin schätzt der Challenger je Workstream.
Status: offen.
Feature/Run: Entscheidung Stefan, 01.10.2026 (Challenge F44 WS-5).

**F-945** · `TECH_DEBT` · P3 · offen
Titel: Zähler auf „Alle Produkte“ kosten je Karte drei Zusatzabrufe.
Beschreibung: Die Seite `#/projekte-uebersicht` (F44 WS-6a) lädt je Produktkarte nach dem Rendern GET `/api/projekte/<id>/roadmap`, `…/zustand` und `…/workitems?status=OFFEN` (dazu wie bisher `…/projekt-aufruf` für F43), um Ziel, Ring, Entscheidungen und „abgenommen“ zu zeigen. Bei n Projekten sind das 3·n Abrufe zusätzlich zu GET `/api/projekte`, bei jedem Betreten und jedem „Neu laden“. Jeder Abruf baut serverseitig eine volle Projektion (Roadmap, Zustands-Aggregat, Workitems-Parser), obwohl die Karte nur wenige Zahlen braucht.
Fundstelle: `public/leitstand/views/projekte-uebersicht.js` (`ladeRoadmapZaehler`, `ladeEntscheidungsZaehler`), `public/leitstand/api.js` (`holeProjektRoadmap`, `holeProjektZustand`, `holeProjektOffeneWorkitems`).
Auswirkung: Niedrig — bei wenigen lokalen Projekten unkritisch; wächst linear mit der Zahl der Projekte. Weil das Zeitlimit (5 s, `AbortSignal.timeout`) schon beim Aufruf von `fetch` beginnt, zählt die Wartezeit im Browser (6 Verbindungen je Host) mit — ab einigen Projekten können Zähler fälschlich auf „—“ fallen (QA-Pass WS-6a, nicht belegt).
Maßnahme: Bei Bedarf die Kennzahlen (vision, abgenommen/gesamt, Zahl der Entscheidungen) serverseitig in GET `/api/projekte` projizieren und die drei Abrufe je Karte ersetzen.
Status: offen.
Feature/Run: Entdeckt: F44 WS-6a, 01.10.2026.

**F-946** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Prüfpunkte in der Akte nach Fundort/Route statt nach nächstem Paket ablegen.
Beschreibung: Die Akte F44 sammelt Prüfpunkte aus jedem Prüfpass unter „Prüfpunkte für WS-<nächstes Paket>“. Das nächste Paket betrifft aber oft eine andere Route: die „Prüfpunkte für WS-6“ aus WS-5b betrafen ausschließlich `#/projekt` (Auftrag & Direktstart), nicht die Abschnitte H/I von WS-6. Sie wären dort leicht übersehen oder fälschlich WS-6 zugerechnet worden und mussten nachträglich auf das Fixpaket B5 umgehängt werden.
Fundstelle: `features/F44/feature.md` (Abschnitte „Prüfpunkte für WS-…“).
Auswirkung: Niedrig — Prüfpunkte landen beim falschen Paket oder bleiben liegen.
Maßnahme: Prüfpunkte nach Fundort bzw. Route ablegen (z. B. „Prüfpunkte `#/projekt`“) und das zuständige Paket nur als Vermerk nennen.
Status: offen.
Feature/Run: Entdeckt: F44 WS-6a, 01.10.2026 (Auftrag Stefan).

**F-948** · `BUG` · P3 · offen
Titel: Vorschau-Kurzstand zeigt „nicht gesetzt“ für eine gesetzte, aber nicht lokale vorschau_url.
Beschreibung: `vorschauKurzstand` liest `url: null` als „nicht gesetzt“. Der Server meldet aber auch eine gesetzte `vorschau_url`, die nicht lokal ist, mit `url: null` (und eigenem `grund`), weil er sie nicht anfragt. Die Zusammenfassung der Technik-Klappe auf `#/projekte-uebersicht` sagt dann „Vorschau nicht gesetzt“, obwohl ein Wert im Register steht.
Fundstelle: `public/leitstand/produkte-anzeige.js` (`vorschauKurzstand`); Serverseite `src/projekt-aufruf/index.ts:217`.
Auswirkung: Niedrig — irreführender Kurzstand; der F43-Block darunter zeigt den Servergrund roh.
Maßnahme: Den Server-`grund` unterscheiden oder einen eigenen Kurzstand „nicht angefragt“ einführen.
Status: offen.
Feature/Run: Entdeckt: Verifikation F44 WS-6a, 01.10.2026.

**F-949** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Übergabe-Vorlage enthielt `git switch main`, das im Worktree aiw-f725-ws1a scheitert.
Beschreibung: `main` ist im Worktree C:/Users/stefa/Projekte/ai-workforce ausgecheckt; `git switch main` im Worktree aiw-f725-ws1a bricht deshalb ab (real nach dem Merge von WS-6a, folgenlos).
Fundstelle: Challenger-Übergaben (TERMINAL-Blöcke für neue Branches).
Auswirkung: Niedrig — der Befehl scheitert sichtbar, ohne Folgen; ein neuer Branch muss anders angelegt werden.
Maßnahme: In diesem Worktree nur `git fetch origin` und dann `git switch -c <branch> --no-track origin/main`.
Status: offen.
Feature/Run: Entdeckt: F44 WS-6a/6b, 01.10.2026.

**F-950** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Harness-Werkstatt — Abgleich J1/J2/J4 echt machen, Design zuerst.
Beschreibung: Die Workforce bekommt den Harness-Aufbau als verbundenes Skelett: Knoten „Dein Harness“, sechs Bausteine (Regeln, Wissen, Gedächtnis, Rollen & Fähigkeiten, Bremsen, Prüfung & Betrieb), darunter die Dateien; je Knoten Inhalt, Zweck, Abweichung zur Vorlage und nutzendes Modell; Hooks und Konfiguration sichtbar. Dazu eine Capability Library als eigener Bereich: alle Katalogeinträge, aktiv/nicht aktiv, Typ, Nutzer, Ort; Filter Typ/Status, Suche; Aktivieren nur über den F36-Weg.
Fundstelle: `#/capabilities`, Register Harness-Aufbau (seit F44 WS-7a Baustein „kommt“); Abgleich F-725 J1, J2, J4.
Auswirkung: Mittel — der Aufbau des Harness ist im Leitstand nicht sichtbar und nicht prüfbar.
Maßnahme: Erst Design in der Design-Finalisierung nach WS-8, dann Funktionen: Leseendpunkt mit Allowlist ohne Secrets/.env, Erklärkatalog, Nutzung je Modell, Abgleich gegen `vorlagen/projekt-skelett`, Bearbeiten mit Diff, Pflichtbegründung und 409. Wirksame Konfiguration bis zur Entscheidung nur per Vorschlag. Aufwand ~7–9 AT.
Status: offen.
Feature/Run: Entdeckt: Stefan, 01.10.2026, F44.

**F-951** · `TECH_DEBT` · P3 · offen
Titel: design-guardian fehlt in `ressourcen.json`.
Beschreibung: Der Subagent `design-guardian` liegt in `.claude/agents/` und ist seit F44 aktiv, steht aber nicht im Ressourcenkatalog. Die Werkstatt (`#/capabilities`, Werkzeuge) zeigt ihn deshalb nicht.
Fundstelle: `ressourcen.json`; `.claude/agents/design-guardian.md`.
Auswirkung: Niedrig — Katalog und Wirklichkeit weichen ab; Coverage und Empfehlungen kennen den Prüfer nicht.
Maßnahme: Katalogeintrag nachtragen, auf eigenem Branch; Gates f19 und f36 beachten.
Status: offen.
Feature/Run: Entdeckt: F44 WS-7-Challenge / Harness-Werkstatt, 01.10.2026.

**F-952** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Produktübersicht neu — Rollen-Kreis statt Phasen-Kreis.
Beschreibung: Kopf mit „In VS Code öffnen“ (`vscode://file/<Pfad aus projekte.json>`, kein Prozessstart); Rollen-Kreis statt Phasen-Kreis (Planner/Codex, Advisor/Claude, Builder/Claude Code mit den Prüfern code-reviewer, qa und design-guardian als Satelliten, Prüfschritt ohne Modell, Reviewer/Codex, Abnahme/Mensch); Feature-Timeline aus Schätzungen und Ist; Board; Kacheln Features, Bugs, Harness Improvements. Es entfallen „Deine nächsten Entscheidungen“, „Die Workforce gerade“, „Wer macht was“ und die Liste „Entwicklungsstand“. Layout-Regel: Karten einer Reihe gleich hoch mit gleicher Kopfzeile und gleichem Fuß (in die Prüfliste des design-guardian). Ersetzt auch Abgleich J3 (Phasen-Kreis).
Fundstelle: `#/dashboard` (Produktübersicht); `#/capabilities`, Register Phasen & Rollen (seit F44 WS-7a Baustein „kommt“).
Auswirkung: Mittel — die Übersicht zeigt nicht, welche Rolle mit welchem Modell gerade arbeitet.
Maßnahme: Design-Finalisierung nach WS-8, danach Umsetzung.
Status: offen.
Feature/Run: Entdeckt: Stefan, 01.10.2026, F44.

**F-956** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: PR gemergt vor der Challenger-Prüfung im Clone.
Beschreibung: WS-6b (#302) und WS-7a (#303) wurden gemergt, bevor die Challenger-Prüfung im Clone lief.
Fundstelle: Ablauf Push → PR → Merge der F44-Workstreams.
Auswirkung: Befunde der Prüfung können nur noch per Folge-PR korrigiert werden; beide Male nachträglich grün.
Maßnahme: Entweder die Reihenfolge Push → Challenger-Prüfung → PR → Merge einhalten, oder die nachträgliche Prüfung bei grüner CI als zulässig festschreiben (Befunde gehen in den nächsten Workstream).
Status: offen.
Feature/Run: Entdeckt: F44 WS-7a-Verifikation, 02.10.2026.

**F-957** · `BUG` · P2 · offen
Titel: Scout nach Projektwechsel — Vormerken ohne Überholschutz, Knöpfe frei trotz belegtem Lauf, Ergebnis unerreichbar.
Beschreibung: Seit F-955 setzt ein Projektwechsel die Scout-Anzeige zurück. Offen bleibt: (1) `vormerkenKandidat` hält weder Scout-Zustand noch Vormerk-Map fest; fällt der Wechsel zwischen `legeAuftragAn` und `routeAuftrag`, wird die Auftrags-ID des alten Projekts unter dem Präfix des neuen geroutet, und das Ergebnis landet in der neuen Map (ggf. falsches „Vorgemerkt“ bei gleichem Index). (2) Läuft der alte Lauf noch, belegt er D13 projektübergreifend; die Knöpfe sind trotzdem frei, eine neue Suche legt einen Auftrag an und scheitert mit 409 — der Auftrag bleibt verwaist. (3) Die Kandidaten des alten Laufs sind im Leitstand nicht mehr erreichbar (Lauf unter „Ausführungen“ sichtbar, Karten und Vormerken nicht). (4) Wirft das Rendern eines vertragswidrigen Ergebnisses im Fertig-Pfad von `aktualisiereScoutZustand`, schluckt der leere catch das als Netzwerkfehler; die Anzeige bleibt auf „läuft…“ (Server validiert das Schema, deshalb nur Absicherung). Dazu: Fokus geht nach Vormerken/Quelle verloren (Neurendern), Fehlernotiz ohne laufId/Link.
Fundstelle: `public/leitstand/views/capabilities.js` (vormerkenKandidat, setzeScoutZurueck, aktualisiereScoutZustand).
Auswirkung: Mittel — selten (Wechsel genau während eines Vorgangs), aber Fehlrouting und verwaiste Aufträge sind möglich.
Maßnahme: Zustand und Map in `vormerkenKandidat` beim Start festhalten und nach jedem await abbrechen, wenn überholt; nach dem Wechsel die Sperre aus `zustand.aktiverLauf` ableiten oder einen Hinweis „Scout-Lauf <laufId> läuft in <Projekt>“ mit Link zeigen; Fertig-Pfad mit eigenem try/catch und Log. Tests mit gehaltenem fetch. In WS-7b ausgeschlossen (Ablauf und Guards des Scouts unverändert außer dem Zurücksetzen).
Status: offen.
Feature/Run: Entdeckt: Prüfpass F44 WS-7b (code-reviewer 1/2/10, qa 1/2/10, design-guardian 8), 02.10.2026.

**F-959** · `PROCESS_IMPROVEMENT` · P2 · teilweise
Titel: Keine verbindliche Ausgaberegel für Befehle an Stefan.
Beschreibung: Jarvis, der Leitstand und Bauaufträge geben Befehle an Stefan in uneinheitlicher Form aus (Platzhalter trotz bekannter Werte, mehrere Folgen in einem Block, Shell-Syntax ohne Rücksicht auf Windows).
Fundstelle: Jarvis-Instruktion (`src/jarvis`), Leitstand (z. B. F-958), Vorlage der Bauaufträge.
Auswirkung: Befehle sind nicht direkt ausführbar; Fehlerquelle beim Abtippen und Ergänzen.
Maßnahme: Regel „direkt ausführbar“: ein Block je zusammengehöriger Folge, eine Zeile je Befehl, PowerShell auf Windows, keine Platzhalter bei bekannten Werten (unvermeidbare sichtbar markieren), Fehlerabbruch beachten (schädliche Folgen in getrennte Blöcke), Pfade mit Leerzeichen quoten, keine Befehle, die Repo-Regeln umgehen. Vor der Aufnahme in die Jarvis-Instruktion F-966 beheben.
Status: teilweise — für Jarvis umgesetzt (F44 WS-8b, 02.10.2026): Regel in `src/jarvis/index.ts` (baueJarvisAuftragstext, nach der Schema-Beschreibung; Zaun-Verbot für das JSON-Objekt bleibt), Test `src/jarvis/jarvis.test.ts`; der Leitstand zeigt solche Blöcke als kopierbare Befehlsblöcke (`public/leitstand/befehlsblock.js`). Nachtrag F45 B2a-3a (13.10.2026): Regel als Konstante `REGEL_DIREKT_AUSFUEHRBAR` (eine Quelle, spätere Übernahme ohne Kopie) und neue Zeile „Erste Zeile jedes Blocks: cd <voller Projektpfad>“ — den Pfad setzt der Server ein (PowerShell-gequotet über `psArgument`, Chat und Zusammenfassung); Gate f45-b2a3 (f) prüft die Regel im Jarvis-Auftrag. Rest: Leitstand-Befehlsblöcke („Sichern“, Prüfstand: erste Zeile cd, commit und push in getrennten Blöcken) → B2a-3b; Coach-Antworten (zeigen ebenfalls Befehlsblöcke) und die Vorlage der Bauaufträge ohne die Regel. Nachtrag F45 B2a-3b (13.10.2026): Leitstand erledigt — `public/leitstand/code-daten.js` `cdZeile` (eine Quelle für Leitstand und Jarvis; `-LiteralPath` bei PowerShell-Platzhalterzeichen), `befehlsBloecke`; „Sichern“ (#/code, Workboard) als [cd, add…, commit] und getrennt [cd, push], „Prüfstand“ als [cd, Prüfbefehl], ohne Pfad ein Grund statt eines Befehls; je Block ein „Kopieren“. Rest: Coach-Antworten und Vorlage der Bauaufträge.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-960** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Idee „Terminal neben Jarvis“.
Beschreibung: Stufe 1: PowerShell als Kindprozess mit Pipes, Sitzungs-Token, nur same-origin, Abschalter in den Einstellungen; Läufe und Worker erreichen die Route nie (Allowlist schließt den Leitstand-Port aus). Ausführen startet nur der Mensch. Stufe 2 (node-pty + xterm.js, erste Laufzeit-Abhängigkeit) nur nach realem Bedarf.
Fundstelle: Idee, noch ohne Code (Leitstand, `scripts/leitstand-server.mjs`).
Auswirkung: Befehle aus dem Gespräch ließen sich ohne Fensterwechsel ausführen.
Maßnahme: Eigene Spec mit Advisor-Pass (öffentliche Route mit Prozessstart = Nebenwirkung), Stufe 1 zuerst.
Status: offen.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-962** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Das Ergebnis von `npm run check` wird nirgends festgehalten.
Beschreibung: Ob und wann die volle Kette zuletzt grün lief und mit wie vielen Tests, steht nur in der Terminalausgabe.
Fundstelle: `package.json` (Skript `check`).
Auswirkung: Berichte und Challenger müssen die Testzahl erneut ermitteln oder auf Angaben vertrauen.
Maßnahme: Kleine Ergebnisdatei nach jedem Check (Zeitpunkt, Commit, Exit-Code, Testzahl).
Status: offen.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-963** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Merge-Konvention „F44 WS-xx: … (#PR)“ ist nicht erzwungen.
Beschreibung: Die Merge-Commits der F44-Workstreams folgen der Form „F44 WS-xx: … (#PR)“ nur per Absprache.
Fundstelle: Git-Historie von main; kein Gate.
Auswirkung: Abweichende Titel erschweren die Zuordnung von Merge und Workstream.
Maßnahme: Gate dafür im Fixpaket B5.
Status: offen.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-965** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: 432 offene TECH_DEBT/PROCESS-Einträge laut Kopfzeilen, nicht gesichtet.
Beschreibung: Das Register führt laut Kopfzeilen 432 offene Einträge der Typen TECH_DEBT und PROCESS_IMPROVEMENT; eine Sichtung (erledigt, überholt, zusammenlegbar) fand nicht statt.
Fundstelle: `state/findings.md`.
Auswirkung: Das Register verliert als Arbeitsliste an Wert; Doppelungen und Erledigtes bleiben offen stehen.
Maßnahme: Register-Sichtung im Fixpaket B5.
Status: offen.
Feature/Run: Entdeckt: F44 WS-8 Challenge, 02.10.2026.

**F-969** · `TECH_DEBT` · P3 · offen
Titel: Befehlsblock — Rückmeldung geht beim Neuaufbau verloren; Zählung auch für Nicht-Befehle.
Beschreibung: `renderVerlauf()` ersetzt den Verlauf bei jedem Neuaufbau (z. B. Fortschritt eines laufenden Laufs im anderen Modus). „Kopiert“, der Hinweis „Mit Strg+C kopieren“, die Markierung und der Fokus auf „Kopieren“ verschwinden; die Zwischenablage bleibt gefüllt. Außerdem zeigt jeder Block „{n} Befehle · nacheinander“, auch ein Block ohne Tag (JSON, Beispielcode) oder ein leerer Block („0 Befehle“).
Fundstelle: `public/leitstand/befehlsblock.js` (kopiereBefehlsblock, renderBefehlsblock), `public/leitstand/views/chat.js` (renderVerlauf).
Auswirkung: Gering — selten; im Rückfallweg ohne Clipboard-API muss erneut geklickt werden.
Maßnahme: Kopierzustand je Block (Schlüssel aus laufId + Blockindex) im Modul halten und nach dem Rendern wiederherstellen, oder den Verlauf nur bei Änderung neu bauen; ohne Tag bzw. bei 0 Zeilen die Anzahl weglassen.
Status: offen.
Feature/Run: Entdeckt: Prüfpass F44 WS-8b (code-reviewer 2, design-guardian 4/6, qa K2/K3), 02.10.2026.

**F-970** · `TECH_DEBT` · P3 · offen
Titel: Eingerückte Codezäune, `~~~` und vier Backticks werden kein Befehlsblock.
Beschreibung: Der Befehlsblock erkennt Zäune nur am Zeilenanfang mit genau drei Backticks (Vorgabe WS-8b). Modelle setzen Codeblöcke oft in nummerierte Listen (eingerückt) oder nutzen `~~~`; dann sieht Stefan rohe Zäune als Text.
Fundstelle: `public/leitstand/befehlsblock.js` (OEFFNER, SCHLIESSER), `src/jarvis/index.ts` (Regel „direkt ausführbar“).
Auswirkung: Gering — die Befehle bleiben lesbar und markierbar, nur ohne „Kopieren“.
Maßnahme: Die Regel um „Codeblöcke nie einrücken“ ergänzen und/oder bis zu drei führende Leerzeichen tolerieren (CommonMark); bei Coach-Antworten beobachten.
Status: offen.
Feature/Run: Entdeckt: Prüfpass F44 WS-8b (qa F1, code-reviewer 8), 02.10.2026.

**F-975** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Bugs haben keine strukturierten Felder.
Beschreibung: Ein Bug ist Fließtext im Register. Es fehlen Nachstellen, Erwartet/Tatsächlich, Ursache und Regressionstest als Felder.
Fundstelle: `state/findings.md` (Format der Einträge); Eintrag im Detail (F46 D3).
Auswirkung: Gering — die Bug-Ansicht kann nur Text zeigen, Vollständigkeit ist nicht prüfbar.
Maßnahme: Fixpaket „Arbeitsfähigkeit“ B5.
Status: offen.
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-976** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Workstreams sind kein Datenobjekt.
Beschreibung: Workstreams stehen nur als Tabellen und Abschnitte in den Akten.
Fundstelle: `features/<id>/feature.md` (Workstream-Tabellen); Roadmap und Detail (F46 D1, D3).
Auswirkung: Mittel — Timeline, Plan gegen Ist und Workstream-Detail sind nur als „kommt“ möglich.
Maßnahme: Fixpaket „Arbeitsfähigkeit“ B2/B5.
Status: offen.
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-979** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: „Bereit zum Sichern“ ist kein Zustand zwischen Abnahme und Merge.
Beschreibung: Nach der Abnahme gibt es keinen eigenen Zustand für „abgenommen, noch nicht committet/gemergt“.
Fundstelle: Lebenszyklus eines Eintrags (Abnahme → Merge).
Auswirkung: Gering — der Schritt zum Sichern ist im Leitstand nicht sichtbar.
Maßnahme: Fixpaket „Arbeitsfähigkeit“.
Status: offen. Nachtrag F45 B2b-4a-1 (19.10.2026, `features/F45/plan-b2b4a1.md`): Server-Teil gebaut — „Bereit zum Sichern“ als abgeleiteter Zustand ohne neuen Workflow-Status (`scripts/leitstand/ablauf-sichern.mjs` `leiteSichernLageAb`: abgeschlossen + eigener Arbeitsordner + geänderte Dateien bzw. Commits noch nicht auf main; Grenze F-1155), geliefert als Feld `ablauf.sichern` von GET `/api/code?workflow=<id>`; Gate `scripts/check-f45-b2b4a1-sichern.mjs`. Die Anzeige (Karte, Abnahme, Workboard) folgt in B2b-4a-2, erst dann erledigt.

**F-980** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Bestehensbedingung des Fixpakets: gleichwertig zum manuellen Ablauf.
Beschreibung: Stefan, 02.10.2026 (= A): Das Fixpaket „Arbeitsfähigkeit“ besteht, wenn ein Referenzauftrag gleichwertig zum manuellen Ablauf läuft. Der Referenzauftrag belegt zusätzlich (1) Render-Nachweis im Lauf — der Werkzeugsatz „schreibend“ erlaubt heute kein `npm run render-nachweis` (`startvorlagen/ai-workforce.json`); (2) Prüferpass code-reviewer/qa/design-guardian mit höchstens einer Korrekturrunde als Schritt der Kette; (3) Schätzung gegen Ist je Arbeitspaket (F-944); (4) Rückfrage an Stefan während des Baus; (5) Verifikation in sauberer Umgebung (Branch/Worktree je Lauf, F-954).
Fundstelle: `startvorlagen/ai-workforce.json` (werkzeugsaetze.schreibend); Workflow-Vorlagen.
Auswirkung: Mittel — ohne diese fünf Punkte bleibt der Lauf hinter dem manuellen Ablauf zurück.
Maßnahme: Fixpaket-Challenge.
Status: offen.
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.

**F-982** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Nutzen der Codex-Prüfung ist nicht gemessen.
Beschreibung: Ob die Befunde des Reviewers (Codex) über die der Claude-Prüfer hinausgehen, ist nicht ausgewertet.
Fundstelle: Review-Schritt (Rolle code-reviewer, Worker codex) in den Workflow-Vorlagen.
Auswirkung: Gering — Kosten und Nutzen des zweiten Workers sind nicht belegt.
Maßnahme: Fixpaket: Befunde je Review (bestätigt/verworfen) gegen die Claude-Prüfer auswerten.
Status: offen.
Feature/Run: Entdeckt: Design-Runde 02.10.2026 / F46 D0.
Zugeordnet: F45 R — die Messung braucht echte Läufe (E-B2b-1 = A, 14.10.2026).

**F-984** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Planung ist im Leitstand nicht änderbar.
Beschreibung: Priorität, Meilenstein, Schätzung und Reihenfolge lassen sich im Leitstand nicht ändern; in der Bug-Triage gibt es außer „Jetzt beheben lassen“ keinen Schreibweg. Die Designs `03-roadmap` und `07-eintrag-detail` sehen diese Änderungen mit Pflichtbegründung vor.
Fundstelle: `docs/design/neu/03-roadmap--Main.webp`, `docs/design/neu/07-eintrag-detail--Main.webp`, `docs/design/neu/07-eintrag-detail--Bug.webp`; `docs/design/abgleich-f46.md`.
Auswirkung: Mittel — Planungsänderungen gehen nur über Dateien und Git.
Maßnahme: Fixpaket B5, zusammen mit E-F45-1.
Status: offen.
Feature/Run: Entdeckt: Design-Abgleich F46 D0b, 02.10.2026.

**F-985** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Harness-Dokumente sind nur außerhalb des Leitstands bearbeitbar.
Beschreibung: CLAUDE.md, ARCHITECTURE.md, `docs/`, Agents und Skills lassen sich im Leitstand nicht bearbeiten. Das Design `01-workforce-harness--Bearbeiten` sieht Bearbeiten mit Pflichtbegründung, Konfliktschutz und ohne Commit vor.
Fundstelle: `docs/design/neu/01-workforce-harness--Bearbeiten.webp`; `docs/design/abgleich-f46.md`.
Auswirkung: Gering — Harness-Pflege geht nur über Editor und Git.
Maßnahme: Fixpaket B1/B5; `.claude/settings.json` und Hooks nur per Vorschlag (E-F46-2).
Status: offen.
Feature/Run: Entdeckt: Design-Abgleich F46 D0b, 02.10.2026.

**F-988** · `TECH_DEBT` · P3 · offen
Titel: Der Pfad der Zielfassung ist in der Projektakte fest.
Beschreibung: GET /api/projektakte liest das Versionsziel immer aus `docs/projekt/zielfassung.md` der Repo-Wurzel. Für Kontextordner und Roadmap gibt es Registerfelder (`kontext_pfad`, `roadmap_pfad`), für die Zielfassung nicht.
Fundstelle: `scripts/leitstand/routen-projektakte.mjs` (`ZIELFASSUNG_PFAD`).
Auswirkung: Gering — ein Fremdprojekt mit anderer Ablage bekommt „Zielfassung fehlt“ statt seines Ziels.
Maßnahme: Bei Bedarf ein Registerfeld `zielfassung_pfad` wie `kontext_pfad` (Fixpaket oder beim ersten Fremdprojekt).
Status: offen.
Feature/Run: Entdeckt: F46 D1, Prüfpass cr 9.

**F-989** · `PROCESS_IMPROVEMENT` · P3 · teilweise
Titel: Feature und Ablauf sind nur über die Auftragsreferenz verknüpft.
Beschreibung: Der Rollen-Kreis der Übersicht findet den Ablauf eines Features nur über `workitem_referenz` des Auftrags (Click-to-Work, „Bauen“). Ein Ablauf aus einem Auftrag ohne Referenz (freier Auftrag, Chat) erscheint als „Ablauf ohne Feature“, das Feature als „Noch kein Ablauf gestartet“.
Fundstelle: `public/leitstand/entwicklung-daten.js` (`baueVerknuepfung`, `waehleFeatureInArbeit`).
Auswirkung: Gering — die Zuordnung ist dann unvollständig, nichts wird falsch behauptet.
Maßnahme: Fixpaket B2 (Arbeitspaket als Daten mit Feature-Bezug).
Status: teilweise (F45 B2a-2, 13.10.2026): Aufträge aus einer Feature-Akte (auch „Bauen“) tragen `feature_ref`; GET /api/auftraege liefert ihn, `baueVerknuepfung` nutzt `workitem:feature:<feature_ref>` vor der Referenzzeile; die Projektkarte nennt `features/<ref>/feature.md`. Rest: ein freier Auftrag oder Chat ohne bekannten Feature-Bezug bleibt „Ablauf ohne Feature“ (F-1083 (2)).
Feature/Run: Entdeckt: F46 D1.

**F-990** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: „Zuletzt umgesetzt“ kennt kein Abnahmedatum.
Beschreibung: Die Übersicht wählt das zuletzt abgenommene Feature nach der Reihenfolge der Roadmap, weil Akten und Roadmap kein Abnahmedatum tragen. „Danach“ hat keine maschinenlesbare Quelle und steht als „kommt“.
Fundstelle: `public/leitstand/views/dashboard.js` (`letztesAbgenommenes`).
Auswirkung: Gering — bei einer Abnahme außer der Reihe zeigt die Karte ein anderes Feature als das zeitlich letzte.
Maßnahme: Fixpaket B5 (Planungs- und Statusfelder mit Datum).
Status: offen.
Feature/Run: Entdeckt: F46 D1, Prüfpass qa 10.

**F-991** · `BUG` · P2 · offen
Titel: Persona, Startfläche und Entwicklung zählen offene Abnahmen nicht.
Beschreibung: Seit F46 D2 stehen offene Abnahmen unter „Deine Entscheidungen“, im Zähler der Seitenleiste, in der Kennzahl der Übersicht und in Jarvis' „was braucht mich“. Der Persona-Zustand („wartet auf dich“), der Warte-Hinweis der Startfläche und die Spalte „Braucht dich“ der Entwicklung lesen weiter nur `filtereAttentionWorkflows` (Freigabe, Rückfrage).
Fundstelle: `public/leitstand/persona-state.js:36`, `public/leitstand/views/start.js:66`, `public/leitstand/entwicklung-daten.js:149`.
Auswirkung: Mittel — der Zähler zeigt eine wartende Abnahme, die Persona meldet „nichts“.
Maßnahme: dieselbe Auswahl über `filtereOffeneAbnahmen` bzw. `baueEntscheidungen`; Gate f28-persona und Tests mitziehen. Bewusst nicht in D2 (Umfang: Liste, Zähler, Entscheiden-Seite).
Status: offen.
Feature/Run: Entdeckt: F46 D2, Prüfpass qa 5 / code-reviewer 2.

**F-992** · `TECH_DEBT` · P3 · offen
Titel: Markierung der Seitenleiste auf der Seite Entscheiden liegt außerhalb des Routers.
Beschreibung: `#/workflows/<id>` gehört technisch zur View `runs`; der Router markiert deshalb „Ausführungen“. Auf einer Freigabe oder Abnahme setzt `views/workflows.js` (`markiereNav`) die Markierung auf „Entscheidungen“ um — nur auf der Detailroute, bei jedem Zeichnen.
Fundstelle: `public/leitstand/views/workflows.js` (`markiereNav`), `public/leitstand/router.js` (`zeigeView`).
Auswirkung: Gering — eine zweite Stelle, die `aria-current` setzt.
Maßnahme: zustandsabhängige Markierung im Router (z. B. Rückruf je Route), dann `markiereNav` entfernen.
Status: offen.
Feature/Run: Entdeckt: F46 D2.

**F-993** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Freigabe braucht auf der Seite Entscheiden zwei Schritte.
Beschreibung: Nach Bild 09-Entscheiden entscheidet Stefan in der Spalte „Deine Entscheidung“. Weil „Anzeige = Start“ und die Kennzeichen-Prüfung am Freigabedialog hängen, öffnet „<Option> bestätigen“ diesen Dialog als Bestätigung (Begründung übernommen, Fokus auf der gewählten Aktion). „Freigeben & installieren“ führt zu den Installationsknöpfen des Dialogs, freigegeben wird danach.
Fundstelle: `public/leitstand/views/workflows.js` (`freigabe-bestaetigen`, `oeffneDialog`), `public/leitstand/views/entscheidung-panel.js`.
Auswirkung: Gering — ein Klick mehr als im Bild, dafür unveränderte Invarianten.
Maßnahme: Entscheidung Stefan: Bestätigung im Dialog behalten oder die Kennzeichen-Prüfung auf die Spalte übertragen (eigener Sicherheitsblick).
Status: offen.
Feature/Run: Entdeckt: F46 D2.

**F-994** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Zahl an „Entscheidungen“ und Chip „Alle“ können auseinanderlaufen.
Beschreibung: Der Zähler in der Seitenleiste kommt allein aus dem Poll (Freigaben, Rückfragen, Abnahmen, Fehler, Startprobleme). Befunde P0/P1 stammen aus einem eigenen Abruf und zählen dort nicht; auf `#/attention` zählt „Alle“ sie mit.
Fundstelle: `public/leitstand/entscheidungen-zaehler.js`, `public/leitstand/attention-daten.js` (`zaehleOffeneEntscheidungen`).
Auswirkung: Gering — bei offenen Befunden zeigt die Seite mehr als die Seitenleiste.
Maßnahme: Befundzahl in das Zustands-Aggregat aufnehmen (eine Quelle) oder den Unterschied im Titel des Zählers nennen.
Status: offen.
Feature/Run: Entdeckt: F46 D2.

**F-995** · `TECH_DEBT` · P3 · offen
Titel: Die Leseroute der Feature-Akte liefert die Entscheidungen nicht.
Beschreibung: Das Detail eines Features soll unter „Verlauf“ die Entscheidungen der Akte (E-…) zeigen (abgleich-f46.md §4.6). GET …/features/<id>/akte liefert nur Titel, Status, Ziel, Nicht-Ziele und AKs; D3 durfte den Server nicht ändern. Die Kachel steht deshalb als „kommt“.
Fundstelle: `scripts/leitstand/routen-f35.mjs` (`leseFeatureAkteFuerAnzeige`), `src/feature-auftrag/index.ts` (`leseFeatureAkteAnzeige`); Anzeige `public/leitstand/views/workboard-detail.js` (`verlaufBlock`).
Auswirkung: Gering — die Entscheidungen bleiben über „Akte in VS Code öffnen“ erreichbar.
Maßnahme: Die lesende Projektion um den Abschnitt „Entscheidungen“ (Zeilen mit E-…) erweitern, eine Regel mit dem Bau-Auftrag; dann die Kachel echt (D4 oder Fixpaket).
Status: offen.
Feature/Run: Entdeckt: F46 D3.

**F-998** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Challenger-Antworten sind für Claude Code und die Akte geschrieben, nicht für Stefan.
Beschreibung: Die Antworten des Challengers richteten sich an Claude Code und an die Akte (Bauauftrag, Fachsprache, Verweise), nicht an Stefan. Stefan nutzte eine weitere KI als Übersetzer — ein ungeprüftes Glied in der Kette, in dem sich der Prompt unbemerkt verändern kann.
Fundstelle: Kommunikation Challenger → Stefan (Bauaufträge, Antworten im Chat); keine Code-Fundstelle.
Auswirkung: Mittel — Entscheidungen laufen über eine Übersetzung, deren Treue niemand prüft; Bauaufträge können verändert ankommen.
Maßnahme: Antwortformat „Deine Schritte“ (E-Stefan 02.10.2026): zuerst, was Stefan tun muss, in seiner Sprache; der Teil für Claude Code getrennt darunter. Im Fixpaket als Kommunikationsregel der Workforce (B2).
Status: erledigt für Jarvis (F45 B2a-3a, 13.10.2026): `REGEL_DEINE_SCHRITTE` in `src/jarvis/index.ts` — muss der Mensch etwas tun, beginnt die Antwort mit „Deine Schritte:“, höchstens drei Zeilen, einfache Sprache, Erklärung und Befehle danach; Gate f45-b2a3 (f). Nachtrag: Die Challenger-Antworten selbst liegen außerhalb der Workforce; ob die Regel im Modellverhalten wirkt, zeigt erst ein echter Chat (Beleg 10 mit B2b).
Feature/Run: Entdeckt: Frage Stefan, 02.10.2026.

**F-1001** · `BUG` · P3 · offen
Titel: Die Blase „Frag Jarvis“ verdeckt Inhalte am unteren rechten Rand.
Beschreibung: Die schwebende Blase des Chat-Docks liegt über Inhalten der Seiten — in den Nachweisen F46 D4 über dem Befehlsblock im Prüfstand (#/code), über „Öffnen“ in der Tech-Debt-Tabelle, über der Git-Zeile von #/projekt und bei 200 % über Kennzahlen.
Fundstelle: `public/leitstand/shell.js` / `style.css` (Chat-Blase, F44 WS-8); belegt in `features/F46/nachweise/d4/` (code-aenderungen, techdebt-filter, projekt-main).
Auswirkung: Gering — Inhalt bleibt per Scrollen erreichbar, wirkt aber abgeschnitten.
Maßnahme: Unten rechts Platz für die Blase freihalten (Abstand bzw. `scroll-padding-bottom` im Hauptbereich) oder die Blase beim Scrollen verkleinern.
Status: offen.
Feature/Run: Entdeckt: F46 D4, Prüfpass design-guardian 11.

**F-1004** · `TECH_DEBT` · P3 · offen
Titel: Live-Ansicht: vier kleine Restpunkte aus dem Prüfpass D5.
Beschreibung: (a) Zeitbalken, „Abbrechen …“ und „Laufakte“ stehen unter dem Rahmen des Status-Blocks statt darin (Bild 08); der Baustein statusBlockHtml ist mit D3 geteilt. (b) Während des Prüfschritts nach dem Bau bleibt der Lauf „aktiv“ (laufAktiv bis nach der Prüfung, F-652) — „Gerade“ zeigt minutenlang den letzten Werkzeugaufruf ohne Hinweis „Prüfschritt läuft“. (c) Der Schlüssel eines Aufrufs (Zeit, Werkzeug, Ziel) ist bei zwei gleichen Aufrufen in derselben Millisekunde nicht eindeutig (zwei Zeilen gewählt). (d) Der Render-Nachweis belegt den Entwurf in der Chat-Eingabe nur per Bild; render-nachweis.mjs liest den value eines Textfelds nicht.
Fundstelle: `public/leitstand/eintrag-bausteine.js` (statusBlockHtml), `public/leitstand/views/live-anzeige.js` (renderStatusBlock, renderGerade), `public/leitstand/live-daten.js` (eintragSchluessel), `scripts/render-nachweis.mjs` (texte).
Auswirkung: Gering.
Maßnahme: (a) statusBlockHtml um einen Fußbereich erweitern; (b) die Prüfphase als Feld neben `aktivitaet` melden; (c) laufende Nummer je Aufruf im Ringpuffer; (d) Option „wert“ in den Beobachtungen.
Status: offen.
Feature/Run: Entdeckt: F46 D5, Prüfpass (design-guardian 9, qa 10, qa 12, qa 15), 03.10.2026.

**F-1006** · `TECH_DEBT` · P3 · offen
Titel: Workforce: Restpunkte aus dem Prüfpass D6.
Beschreibung: (a) `pruefeHarnessHerkunft` und die realpath-Prüfung in `routen-harness.mjs` doppeln `pruefeCodeHerkunft` (D4) und `liegtEchtInnerhalb` (D1). (b) Kein Test für /api/projekte/<id>/harness über den Dispatcher; der Datei-Symlink-Fall läuft unter Windows ohne Entwicklermodus nicht (übersprungen). (c) Die Zahlen an den Typ-Chips der Capability Library zählen den ganzen Katalog, unabhängig vom Status-Filter. (d) Das gewählte Register der Workforce steht nicht im URL-Hash (Zurück verlässt die Seite). (e) Die aktive Markierung „Workforce“ in der Seitenleiste ändert nur die Farbe (Bestand F44). (f) Eyebrow des Details „Bremsen · Datei“ statt „Bremse · Hook“ wie im Bild.
Fundstelle: `scripts/leitstand/routen-harness.mjs`, `scripts/leitstand/routen-harness.test.mjs`, `public/leitstand/views/capability-library.js` (renderChips), `public/leitstand/views/capabilities.js` (Register), `public/leitstand/style.css` (.side-bottom a[aria-current]).
Auswirkung: Gering.
Maßnahme: (a) gemeinsamer Helfer in scripts/leitstand; (b) Dispatcher-Test, Symlink-Fall in CI; (c) bewusst so lassen oder je Status zählen; (d) Hash-Parameter je Register; (e) Fixpaket (Bestand-Gate beachten); (f) Art aus dem Ordner (hooks → Hook) ableiten.
Status: offen.
Feature/Run: Entdeckt: F46 D6, Prüfpass (code-reviewer 4/8, qa B13/B14, design-guardian 6d/7), 03.10.2026.

**F-1010** · `BUG` · P2 · offen
Titel: Roadmap und Akten widersprechen sich.
Beschreibung: docs/projekt/roadmap.json führt F30 ohne Akte (Anzeige „keine_akte“), die Akte AF-F001 fehlt in der Roadmap, und M3/M4 stehen auf ABGESCHLOSSEN, obwohl F18, F20, F21, F22 und F25 auf FEATURE_GATE stehen — die Kennzahl „Features abgenommen“ passt nicht zum Meilensteinstatus. Kein Gate prüft diese Übereinstimmung.
Fundstelle: docs/projekt/roadmap.json, features/*/feature.md (Status), scripts/check-akte-meilenstein.mjs, scripts/leitstand/routen-roadmap.mjs.
Auswirkung: Mittel — die Roadmap zeigt einen anderen Stand als die Akten.
Maßnahme: F45 B5b: Gate Akte ↔ Roadmap, Bereinigungsliste zur Bestätigung durch Stefan.
Status: offen.
Feature/Run: Entdeckt: Challenge F45, 03.10.2026.

**F-1011** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Im Workforce-Lauf gibt es keine Rechte-Rückfrage wie in Claude Code in VS Code.
Beschreibung: Ein Befehl außerhalb des Werkzeugsatzes wird im Lauf abgelehnt; der Lauf endet VERWEIGERT und braucht eine manuelle Sichtung (F-764, F-768). In VS Code fragt Claude Code stattdessen Stefan. Damit ist der Lauf nicht gleichwertig zum manuellen Ablauf.
Fundstelle: startvorlagen/ai-workforce.json (werkzeugsaetze), src/claude-code-gateway/index.ts (Aufruf mit -p), Ausführungsschritt im Workflow.
Auswirkung: Mittel — Normalfall wird Ausnahmefall, Stefan muss Läufe von Hand reparieren.
Maßnahme: F45 B2b: Rechte-Rückfrage an Stefan (Spike --permission-prompt-tool; sonst Halt mit „einmal erlauben und fortsetzen“), Advisor-Pass.
Status: offen.
Feature/Run: Entdeckt: Challenge F45, 03.10.2026.

**F-1013** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Ein Chat-Lauf über Modern Standby endet erst an der Zeitgrenze.
Beschreibung: Vorher-Messung F45 B0 (Coach, Turn 4, 10.10.2026): Der Rechner ging um 17:19:03 UTC in Modern Standby (Kernel-Power 506), trennte das Netz („Adaptive Connected Standby“) und wachte um 17:23:59 auf (507). Der Claude-Prozess bekam danach keine Antwort der API mehr (letzte Rohstrom-Zeile: ein Werkzeugergebnis), der Lauf hing, bis das Messskript ihn nach 300 s abbrach. GET /api/zustand (271 s) und die Event-Loop-Zeile (max 271 657 ms) zeigten scheinbar eine Serverblockade — tatsächlich stand der ganze Rechner. Mit der Standard-Startvorlage gab es keine Zeitgrenze: ohne Abbruch hätte der Lauf Chat und über D13 jeden anderen Lauf unbegrenzt festgehalten. Seit F45 B0 endet ein solcher Lauf an der Chat-Zeitgrenze (Jarvis 180 s, Coach 300 s) mit Fehler-Eintrag; früher erkennt der Leitstand den toten Lauf nicht.
Fundstelle: features/F45/nachweise/b0/messung-vorher-coach.md (Turn 4), kontrollzustand-roh/product-coach-product-coach-sparring-abe6413c-88e3-4858-aa85-a427e48fe90d/rohstrom.json, Windows-Ereignisprotokoll System (Kernel-Power 506/507).
Auswirkung: Mittel — nach dem Aufwachen wartet Stefan bis zu 3 bzw. 5 min auf einen Lauf, der nicht mehr antwortet.
Maßnahme: WS P: Leerlauf-Grenze je Lauf (keine stream-json-Zeile seit N s → Abbruch mit Grund „keine Ausgabe“) oder Standby-Ende erkennen (Zeitsprung) und den laufenden Chat-Lauf beenden. scripts/messe-chat.mjs schreibt Standby-Fenster seit F45 B0 in jede Messung.
Status: offen.
Feature/Run: Entdeckt: F45 B0, Vorher-Messung 10.10.2026.

**F-1014** · `TECH_DEBT` · P3 · offen
Titel: Der Codex-Pfad setzt keine Zeitmarken.
Beschreibung: Mit LEITSTAND_ZEITMESSUNG=1 trägt ein Codex-Lauf nur die Server-Marken bis auftrag_registriert; prozess_gestartet, prozess_beendet und die Rohstrom-Marken fehlen, weil src/codex-gateway/index.ts optionen.zeitmessung nicht aufruft (src/claude-code-gateway tut es an sieben Stellen). K2 und die Prozessdauer waren in der Vorher-Messung 3b nicht messbar (messung-vorher-codex.md).
Fundstelle: src/codex-gateway/index.ts.
Auswirkung: Gering — Chat-Rollen laufen seit F45 B0 nicht mehr auf Codex; betrifft Router- und Review-Messungen (WS P, B2b „Codex-Nutzen messen“).
Maßnahme: Dieselben Marken wie im Claude-Code-Gateway (prozess_gestartet, prozess_beendet, rohstrom_geschrieben, laufakte_rohstrom_geschrieben).
Status: offen.
Feature/Run: Entdeckt: F45 B0, Vorher-Messung 10.10.2026.

**F-1016** · `TECH_DEBT` · P3 · offen
Titel: Chat: Restpunkte aus dem Prüfpass F45 B0.
Beschreibung: (a) Ein nach Neuladen übernommener Zusammenfassen-Lauf zeigt bis zum Ende die interne Instruktion als Nachricht (der Auftrag trägt sie; nach dem Ende steht im Verlauf „[Zusammenfassung angefordert]“). (b) Scheitert das Schreiben des Fehler-Eintrags oder startet der Server während eines Laufs neu, bleibt nur die lokale Fehlanzeige — nach Neuladen ist der Turn weg. (c) Gründe kommen roh vom Server (z. B. beobachtungsbasis_unvollstaendig, deutscher Text der D13-Ablehnung), auch in en/tr/ru. (d) Läuft ein Lauf im anderen Reiter, in einem anderen Projekt oder ein Baulauf, ist Senden nicht gesperrt und endet in 409 mit rohem Text. (e) Der Start-Hinweis wird nur beim Serverstart ermittelt. (f) K5 (Zeitgrenze, Abbruch, nie gestartet) ist mit Attrappen und Render-Nachweis belegt, nicht mit einem echten Modell-Lauf; die echten 20 Turns endeten alle mit Antwort. (g) Band und Chat-Hinweis zeigen bei offenem Chat denselben Satz (bewusst).
Fundstelle: public/leitstand/views/chat.js (uebernimmLaufendenChatLauf, Sperrgrund), scripts/leitstand-server.mjs (beschreibeChatMisserfolg, ermittleStartHinweis).
Auswirkung: Gering.
Maßnahme: (a) Zusammenfassung im Auftrag kennzeichnen; (b) beim Serverstart verwaiste Chat-Läufe mit Fehler-Eintrag abschließen; (c) Gründe als Code mit i18n-Text; (d) Sperre aus aktiverLauf ableiten; (e) Hinweis je Poll; (f) in WS R echten Abbruch und „nie gestartet“ mit messe-chat.mjs messen.
Status: offen — (c) und (d) erledigt (F45 P, 11.10.2026): Fehler-Eintrag trägt fehler.code (beschreibeChatMisserfolg), der Client übersetzt über GRUND_SCHLUESSEL in de/en/tr/ru, unbekannter Code „unbekannt (<code>)“, Deutsch zeigt den Klartext des Servers, en/tr/ru nie deutschen Fließtext (Verweis auf das Lauf-Detail); Senden und Zusammenfassen gesperrt mit Grund, wenn ein anderer Lauf aktiv ist (sperreDurchAnderenLauf: anderer Reiter sofort, Baulauf/anderes Projekt aus aktiverLauf, eigener eben beendeter Lauf 5 s ausgenommen); 409 übersetzt, 409 „kein Verlauf“ mit code kein_verlauf. Nachweis features/F45/nachweise/p/render/. Rest offen: (a), (b), (e), (f), (g); dazu aus dem QA-Pass F45 P: chat.fehler.status/abbruch zeigen bei 400/500 den Servergrund roh, der lokale Rückfall „nie gestartet“ den Startfehler-Text roh, ein Projekt-Aufruf (F43) steht nicht in aktiverLauf.
Feature/Run: Entdeckt: F45 B0, Prüfpass (qa 5/6/9/11/12/14, code-reviewer 6, design-guardian 10), 10.10.2026.

**F-1017** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Chat-Latenz: ≈ 3 s je Turn sind fester CLI-Start und -Ende.
Beschreibung: Jarvis antwortet im Median nach 5,2 s (F45 B0, features/F45/nachweise/b0/messung-nachher-jarvis.md); davon entfallen ≈ 3,0–3,7 s je Ein-Schuss-Lauf auf Start und Ende der Claude-CLI (state/nachweis-jarvis-latenz.md, Aufschlüsselung). Hebel wäre ein dauerhaft laufender Chat-Prozess; das berührt die Prozess-Lebensdauer, D13 und die Startfreigabe je Lauf (E-188).
Fundstelle: state/nachweis-jarvis-latenz.md, src/claude-code-gateway/index.ts (Ein-Schuss-Aufruf je Lauf), scripts/leitstand-server.mjs (starteRollenChatLauf).
Auswirkung: Gering — K3 ist mit ≈ 5 s erfüllt; spürbar nur als Grundwartezeit je Turn.
Maßnahme: Nach F30 bewerten, nur bei realem Bedarf; eigene Challenge (Prozess-Lebensdauer, D13, E-188).
Status: offen.
Feature/Run: Entdeckt: Frage Stefan 10.10.2026.

**F-1018** · `BUG` · P1 · offen
Titel: Windows drosselt den Leitstand-Prozess im Energiemodus „Beste Energieeffizienz“ um Faktor ≈ 5–10.
Beschreibung: Auf Stefans Rechner (i5-1235U, Netzbetrieb) steht der Energiemodus bei Netzbetrieb auf „Beste Energieeffizienz“ (Registry-Overlay ActiveOverlayAcPowerScheme = 961cc777-2547-4f9d-8174-7d86181b8a7a). Windows drosselt dann Prozesse ohne sichtbares Fenster (Power Throttling/EcoQoS). Nachweis 10.10.2026: eine reine CPU-Schleife in node.exe wird ≈ 3 s nach dem Start 5-fach langsamer (≈ 14 → 63 ms je Runde); dieselbe Zustandsabfrage dauerte im Mess-Leitstand ≈ 320 ms, im Vordergrund-Testprozess ≈ 35 ms; ein prozessweises Opt-out (SetProcessInformation, ProcessPowerThrottling, EXECUTION_SPEED aus — nur am Testprozess gesetzt) hob die Drosselung sofort auf (≈ 63 → 14 ms). Der Leitstand läuft bei Stefan in einem Terminal, das meist nicht im Vordergrund ist; F45 P hat die Arbeit je Poll gesenkt (F-556), die Drosselung bleibt.
Fundstelle: Windows-Energieeinstellungen (Einstellungen → System → Netzbetrieb und Akku → Energiemodus), scripts/leitstand-server.mjs (CLI-Bindeblock).
Auswirkung: Hoch — jede Server-Arbeit (Poll, Seitenbetreten, Lauf-Nachbereitung) kostet gedrosselt ein Vielfaches; frühere Langlauf-Werte (F-556, F45 B0) gehen großteils darauf zurück.
Maßnahme: Offen, Entscheidung Stefan E-F45-4: (A) Energiemodus bei Netzbetrieb „Ausgeglichen“ (keine Codeänderung); (B) der Leitstand nimmt sich beim Start selbst aus der Drosselung (SetProcessInformation über einen kleinen PowerShell-Helfer; Risiko: Virenscanner-Hinweis auf Inline-C#). Vorschlag (nicht gebaut): der Leitstand erkennt die Lage beim Start lesend ohne neue Abhängigkeit über reg.exe query HKLM\SYSTEM\CurrentControlSet\Control\Power\User\PowerSchemes /v ActiveOverlayAcPowerScheme und warnt bei 961cc777-… (scripts/messe-chat.mjs liest so schon den Modus in jede Messung, leseEnergiemodus). Stefan hat am 11.10.2026 entschieden, den Modus für die F45-P-Messung nicht umzustellen.
Status: offen.
Feature/Run: Entdeckt: F45 P, Ursachenanalyse 10.10.2026.

**F-1019** · `TECH_DEBT` · P3 · offen
Titel: Chat-Fehler-Eintrag: Kopfzeile „Lauf nicht erfolgreich“ auch bei „nicht gestartet“ und „Klärung“; Art einer Verweigerung nicht sichtbar.
Beschreibung: Über jedem Fehler-Eintrag steht „Lauf nicht erfolgreich“, auch über „Lauf nicht gestartet: …“ und „Lauf hält — Klärung erforderlich: …“ (Render-Nachweis features/F45/nachweise/p/render/fehler-grund-*/02-ganzer-verlauf.webp). Bei „verweigert“ zeigt der Chat seit F45 P den festen Code werkzeuggrenze_abgelehnt; die Art des Modells (non_execution_kind, z. B. permission_denied) steht nur noch im Grund des Eintrags und in der Laufakte.
Fundstelle: public/leitstand/views/chat.js (renderEintrag, grundText), scripts/leitstand-server.mjs (beschreibeChatMisserfolg).
Auswirkung: Gering.
Maßnahme: Kopfzeile je fehler.art; Art der Verweigerung als Zusatz zeigen, wenn sie bekannt ist.
Status: offen.
Feature/Run: Entdeckt: F45 P, Prüfpass (design-guardian Nachpass 4, code-reviewer N2), 11.10.2026.

**F-1020** · `TECH_DEBT` · P3 · offen
Titel: Kaltstart: erster GET /api/chat und der Workitems-Parse bleiben synchrone Strecken.
Beschreibung: Nachher-Messung F45 P (features/F45/nachweise/p/messung-nachher-gleich.md, gedrosselt): 59 von 60 Minuten-Fenstern Event-Loop ≤ 200 ms; einzige Überschreitung ist das Startfenster mit dem ersten GET /api/chat (1 433 ms synchron, kalter Datei-Cache, ganze Chat-Kette gelesen und gehasht). Der Workitems-Parse (state/findings.md, ≈ 13 000 Zeilen) läuft nach jeder Änderung an findings.md oder einer Akte einmal synchron (Quellen-Zeile workitems bis 718 ms Wartezeit beim ersten Betreten, danach gecacht).
Fundstelle: scripts/leitstand-server.mjs (GET /api/chat, sammleWorkitems).
Auswirkung: Gering — einmal nach dem Start bzw. nach einer Änderung; im Normalbetrieb erfüllt P2.
Maßnahme: Chat-Kette asynchron bzw. gecacht lesen (Stempel der Kette); Workitems-Parse in Scheiben oder im Worker. Prüfen in WS R (P5).
Status: offen.
Feature/Run: Entdeckt: F45 P, Nachher-Messung 11.10.2026 (QA-Nachpass Punkt 8).

**F-1021** · `TECH_DEBT` · P3 · offen
Titel: taskkill wird per bloßem Namen im cwd des Leitstands gestartet.
Beschreibung: Beim Beenden eines Laufs (Zeitgrenze, Abbruch) startet der Gateway `execFile('taskkill', …)` ohne cwd — damit gilt das cwd des Leitstands, die Installationswurzel; im Selbstbetrieb (Projekt ai-workforce) ist das die Repo-Wurzel des Laufs. Unter Windows sucht der Prozessstart einen bloßen Namen zuerst dort; ein vom Lauf abgelegtes taskkill.exe liefe im Leitstand-Prozess. Dieselbe Klasse wie F-1000, aber kein Git-Aufruf und deshalb außerhalb von F45 S und Gate.
Fundstelle: `src/claude-code-gateway/prozessstart.ts` (killeProzessbaumFallsWindows, taskkill).
Auswirkung: Gering bis mittel — nur im Selbstbetrieb und nur, wenn ein Lauf eine ausführbare Datei in die Repo-Wurzel schreibt.
Maßnahme: taskkill über den absoluten Pfad (%SystemRoot%\System32\taskkill.exe) starten; das Gate scripts/check-git-starter.mjs um eine Liste solcher Programmnamen erweitern oder ein eigenes Gate „kein bloßer Programmname mit Projekt-cwd“.
Status: offen.
Feature/Run: Entdeckt: F45 S, QA-Pass 11.10.2026.

**F-1022** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Maskierung: Restpunkte nach F45 S.
Beschreibung: (a) Code-Reiter (/api/code/diff), Projektakte (docs/projekt/kontext/*) sowie Prüf-/Startbefehl und Prüfausgabe zeigen Inhalte unmaskiert, die im Harness-Detail maskiert sind (z. B. ein Diff der Einstellungsdatei). (b) Nicht erkannt: key=/sig=-Parameter (SAS, API-Schlüssel ohne Schlüsselwort), ein gequoteter Wert über einen Zeilenumbruch. (c) Bewusst eher zu viel: Code in Hooks und Prüfskripten im Harness-Detail (z. B. `token = …`) und Fließtext wie „secret: x“ erscheinen maskiert. (d) Wird git.exe nach der ersten Auflösung verschoben, meldet routen-code.mjs „Arbeitsverzeichnis nicht gefunden“ statt „git nicht gefunden“ (ENOENT bei absolutem Pfad).
Fundstelle: `scripts/leitstand/routen-code.mjs` (baueCodeDiff, fuehreGitAus), `scripts/leitstand/routen-projektakte.mjs`, `scripts/leitstand/geheimnisse-maskieren.mjs`.
Auswirkung: Gering — lokal, Werte meist von Stefan selbst gesetzt.
Maßnahme: (a) maskiereGeheimnisse auch auf Diff- und Akte-Texte anwenden (eigener kleiner Auftrag, Diff-Darstellung prüfen); (b) bei Bedarf Muster ergänzen; (d) bei ENOENT den Zwischenspeicher des Git-Starters verwerfen.
Status: offen.
Feature/Run: Entdeckt: F45 S, Prüfpass (qa 7/8, TC-08; code-reviewer 4), 11.10.2026.

**F-1023** · `TECH_DEBT` · P3 · offen
Titel: Git-Aufrufe außerhalb der Code-Leseroute laufen ohne `-c core.fsmonitor=false`.
Beschreibung: `git status` liest `core.fsmonitor` aus der Repo-Konfiguration; ist dort ein Programm eingetragen, startet Git es. Ein Lauf, der `.git/config` des Projekts ändern kann, könnte so ein Programm im Leitstand- bzw. Kernprozess starten. `scripts/leitstand/routen-code.mjs` setzt deshalb `-c core.fsmonitor=false` (F46 D4); die übrigen Aufrufer des Git-Starters nicht. Seit vor F45 S vorhanden, durch S unverändert.
Fundstelle: `scripts/leitstand-server.mjs` (leseAusfuehrungsVorbedingungRealGit: git status), `src/execution-controller/index.ts` (leseClaudeAenderungen: git status), `src/aenderungsuebersicht/index.ts` (leseGitOderNull).
Auswirkung: Gering bis mittel — setzt Schreibzugriff auf `.git/config` voraus.
Maßnahme: `-c core.fsmonitor=false` (und ggf. `core.hooksPath`-neutrale Optionen) als feste Grundargumente in fuehreGitSync für lesende Aufrufe; mit Test, dass die Ergebnisse gleich bleiben.
Status: offen.
Feature/Run: Entdeckt: F45 S, QA-Nachpass 11.10.2026.

**F-1025** · `BUG` · P2 · offen
Titel: Arbeitsordner: Windows-Pfadgrenze (MAX_PATH) bei langen eingecheckten Pfaden.
Beschreibung: Erster realer Versuch (B1a-1, Ablauf b1a1-nachweis-72fdac22): `git worktree add` scheiterte nach 241 s mit „Filename too long“ — eingecheckte `kontrollzustand/lineage-…`-Dateien sind bis 195 Zeichen lang; im Projektordner (37 Zeichen) passt das, im Worktree mit voller Ablauf-ID (68 Zeichen) nicht. Behoben in B1a-1: Ordnername = 10-stelliger Hash der Ablauf-ID (Branch bleibt `wf/<Ablauf-ID>`), Vorprüfung der Pfadlänge gegen den Basis-Commit vor dem Checkout (Halt mit Grund statt Minuten), Fehlertext zeigt die `error:`/`fatal:`-Zeilen. Rest: ein Projekt mit langem Pfad oder noch längeren Dateinamen hält weiter an (jetzt sofort, mit Grund).
Fundstelle: `src/arbeitsordner/index.ts` (leiteArbeitsordnerAb, pruefePfadlaengen), eingecheckte Kontrollzustand-Dateien.
Auswirkung: Mittel — ohne Fix entstand unter Windows bei ai-workforce nie ein Arbeitsordner.
Maßnahme: Rest beobachten; bei Bedarf `core.longpaths` für die Worktree-Aufrufe oder kürzere Lineage-Dateinamen (eigene Entscheidung).
Status: offen (Kern behoben, Rest beobachten).
Feature/Run: Entdeckt: F45 B1a-1, realer Nachweis 11.10.2026.

**F-1027** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: Arbeitsordner: Invariante „Projektordner unberührt“ geprüft, nicht ERZWUNGEN — Restgrenzen.
Beschreibung: Belegt sind Servertest (Arbeitsbaum, Index, Branch, HEAD unverändert) und realer Nachweis. Nicht erzwungen: (a) ein Schreibzugriff von Claude Code aus dem Worktree in den Projektordner (`../<Projekt>/…`) ist nicht als Rot-Fall belegt — die Grenze trägt die Arbeitsverzeichnis-Beschränkung von Claude Code; (b) das `.git` ist geteilt (Konfiguration, Refs); (c) ein späteres `npm install` im Lauf führt Lifecycle-Skripte aus (`prepare` → `git config`); die Vorbereitung selbst nutzt `npm ci --ignore-scripts` — Fremdprojekte mit nötigem postinstall scheitern erst im Prüfschritt; (d) Einzelläufe (POST /api/laeufe) und Chat laufen bewusst weiter im Projektordner.
Fundstelle: `src/arbeitsordner/index.ts`, `scripts/leitstand-server.mjs` (starteLaufUndVergiss, ermittleLaufort).
Auswirkung: Mittel.
Maßnahme: Rot-Fall (a) im nächsten realen Lauf mit eigenem, harmlosen Ziel belegen; (b)/(c) in B1b mit der Harness-Prüfung abgleichen.
Status: teilweise (F45 B1b-1, 11.10.2026): (a) realer Rot-Fall belegt — vor B1b-1 schrieb Write im `-p`-Lauf ohne Rückfrage in den Eltern- und den Projektordner des Worktrees (F-1040); seit B1b-1 begrenzt `--allowedTools` Write/Edit auf `Edit(./**)`: beide Versuche verweigert, Dateien fehlen, Write im Worktree geht; (c) `npm_config_ignore_scripts=true` in jedem Claude-Code-Lauf — real belegt: `npm install` im `-p`-Lauf führte `prepare` mit der Variable nicht aus, ohne sie schon (`zaehlung-npm-mit.json`/`zaehlung-npm-ohne.json`); unter Windows auch gegen einen gleichnamigen Großbuchstaben-Eintrag der Serverumgebung. Offen: (b) `.git` bleibt geteilt (Bash ist auf npm-Befehle begrenzt, git gesperrt); (c′) in Fremdprojekten mit `pre`/`post`-Skripten weicht `npm run <x>` im Lauf vom Prüfschritt ab; (d) Einzelläufe und Chat weiter im Projektordner; Schreiben über ein npm-Skript ist nicht durch die Pfadregel begrenzt. Nachweis `features/F45/nachweise/b1b1/`.
Feature/Run: Entdeckt: F45 B1a-1, Advisor-Pass 11.10.2026.

**F-1028** · `TECH_DEBT` · P3 · offen
Titel: Arbeitsordner: Restpunkte der Anzeige und des Aufräumens.
Beschreibung: (a) erledigt im Prüfpass: die Karte steht offen auf der Abnahme-Seite (ohne Knopf, solange die Abnahme offen ist); nach der Abnahme verlässt die Seite den Abnahme-Modus, „Der Weg zum Ergebnis“ ist offen und der Knopf steht in der Aktionszeile. Auf der Freigabe-Seite (fehlgeschlagene Vorbereitung) steht er weiter nur unter dem eingeklappten „Der Weg zum Ergebnis“, die Karte nennt den nächsten Schritt. (b) Nach dem letzten Aufräumen bleibt der leere Ordner `<Projekt>-laeufe` stehen (kein rmdir). (c) Nachsenden nach der Vorbereitung prüft die Fassung nur in der Oberfläche (versionSequenz), nicht am Server; ein Neuladen während der Vorbereitung verwirft die wartende Freigabe (Text sagt das); zwei offene Tabs senden beide nach, der zweite bekommt 409. (d) Die Seite Code zeigt weiter den Projektordner, nicht den Worktree eines Ablaufs (B2b, „Bereit zum Sichern“). (e) Im Korrekturlauf vergleichen Änderungsübersicht, Regel 1j und Rückfrage-Heuristik gegen die Basis, also kumuliert über alle Läufe des Ablaufs. (f) Zustände der Karte unterscheiden sich außer „fehlgeschlagen“ nur im Text (kein Chip); der Kurztext „Der Ablauf startet sofort“ der Freigabe-Option stimmt bei noch anzulegendem Arbeitsordner nicht ganz. (g) Pfadreserve bei ai-workforce: längster Pfad 250 von 259 Zeichen. (h) Pfade brechen in schmalen Spalten mitten im Wort (`overflow-wrap: anywhere`), z. B. „…\\Projekt“ / „e\\ai-workforce-“ (Design-Nachpass). (i) QA-Nachpass: der Halt in starteWorkflowSchritt bei fehlendem Ordner ist nur über den Startweg getestet; der Weg ohne package-lock.json (npm ci übersprungen) ist ungetestet und die Karte sagt dann nur „Bereit.“; „Abnahme offen“ rechnen Oberfläche und Server leicht verschieden (der Server entscheidet, eine Abweichung endet als 409).
Fundstelle: `public/leitstand/views/arbeitsordner-anzeige.js`, `public/leitstand/views/workflows.js`.
Auswirkung: Gering.
Maßnahme: (b) leeren Elternordner nach dem Entfernen löschen (nur wenn leer); (c) optionale versionSequenz im Körper serverseitig prüfen; (d) B2b; (e) je Lauf gegen eine Momentaufnahme vergleichen; (f) Chip der Bereitschaftsliste wiederverwenden, Optionstext anpassen; (g) beobachten (F-1025); (i) Tests ergänzen, Lage „npm ci übersprungen“ anzeigen, eine gemeinsame Regel für „Abnahme offen“; (h) beim Escapen nach `\\` und `/` ein `<wbr>` einfügen.
Status: offen.
Feature/Run: Entdeckt: F45 B1a-1, Render-Nachweis 11.10.2026.

**F-1030** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Erledigte Findings und Übergaben werden nie aussortiert.
Beschreibung: `state/findings.md` ist ein reines Anhängeprotokoll und hat rund 1,3 MB; erledigte Einträge und abgeschlossene Übergaben bleiben im selben Dokument wie die offenen. Jede Rolle, die das Register liest, zahlt dafür Kontext.
Fundstelle: `state/findings.md`.
Auswirkung: Gering bis mittel — Kontextkosten, schlechtere Auffindbarkeit offener Punkte.
Maßnahme: Zusammen mit F-930 (gestufter Kontext) nach F30: offene und erledigte Einträge trennen (z. B. Archivdatei je Quartal), Lineage bleibt bewusst unvergesslich (keine Löschung, nur Verschieben mit Verweis).
Status: offen.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1031** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Auslöser je Prüfschritt sind nicht festgelegt.
Beschreibung: design-guardian und qa stehen in keiner workflow-vorlage; der design-guardian von ai-workforce ist auf `public/leitstand` festgelegt. Ob ein Prüfschritt läuft, hängt damit an der Vorlage bzw. an Handarbeit, nicht am tatsächlichen Diff.
Fundstelle: `workflow-vorlagen/`, `.claude/agents/design-guardian.md`.
Auswirkung: Mittel — UI-Änderungen in Fremdprojekten werden nicht designgeprüft, qa fehlt in der Kette.
Maßnahme: B2b: Auslöser aus dem tatsächlichen Diff (UI-Pfade aus der Projektkarte), qa immer zusammen mit code-reviewer, Advisor bei Kontrolltiefe „hoch“ und bei Server/Sicherheit/Architektur; ein übersprungener Prüfschritt steht sichtbar in der Laufakte.
Status: offen.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1032** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Prüfer-Agents nur lesend, teils unbefüllt; qa-Testfälle werden nicht ausgeführt.
Beschreibung: Im Skelett trägt qa noch `[FUELLUNG]` bei den Kernabläufen, code-reviewer zwei `[FUELLUNG, nur UI]`-Stellen. qa definiert Testfälle, die niemand ausführt — sie bleiben Text.
Fundstelle: `vorlagen/projekt-skelett/.claude/agents/qa.md`, `code-reviewer.md`.
Auswirkung: Mittel — Prüfung bleibt auf Lesen beschränkt, Randfälle werden benannt, aber nicht belegt.
Maßnahme: B1b/B2b: Kernabläufe aus den Akzeptanzkriterien befüllen; qa-Testfälle im Prüfschritt als echte Tests anlegen und ausführen; Performance-Budget nur dort, wo es nötig ist.
Status: offen.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1033** · `TECH_DEBT` · P3 · offen
Titel: arbeitsordnerVorStart liest das Arbeitsordner-Artefakt bis zu dreimal je Anfrage.
Beschreibung: Beim Start bzw. bei der Freigabe eines Ablaufs wird das Kern-Artefakt `arbeitsordner-<workflowId>` mehrfach gelesen, statt einmal gelesen und durchgereicht zu werden.
Fundstelle: `scripts/leitstand-server.mjs` (arbeitsordnerVorStart und Aufrufer, F45 B1a-1).
Auswirkung: Gering — zusätzliche Dateizugriffe je Anfrage.
Maßnahme: Einmal lesen, Ergebnis durchreichen.
Status: offen.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1034** · `TECH_DEBT` · P3 · offen
Titel: bereiteArbeitsordnerVor bildet bei ungültiger Ablauf-ID einen Ersatzpfad im Fehlerergebnis.
Beschreibung: Bei ungültiger Ablauf-ID steht im Fehlerergebnis weiter `join(repoWurzel, '..')` als `pfad`. Vom Server nicht erreichbar (409 vorher), aber ein Fehlerergebnis sollte keinen Ersatzpfad enthalten, den ein späterer Aufrufer für echt halten könnte.
Fundstelle: `src/arbeitsordner/index.ts` (~335).
Auswirkung: Gering.
Maßnahme: `pfad` im Fehlerfall `null` bzw. das Feld weglassen.
Status: offen.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1036** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Der Challenger hat Finding-IDs ohne Registerstand vergeben — Kollision mit F-1025 bis F-1028.
Beschreibung: Im Auftrag zu B1a-1 vergab der Challenger IDs, die Claude Code im selben Bau bereits für eigene Funde verwendet hatte.
Fundstelle: Bauaufträge F45 (Challenger), `state/findings.md`.
Auswirkung: Gering — Nacharbeit und Verwechslungsgefahr.
Maßnahme: Der Challenger führt Kandidaten ohne ID; IDs vergibt Claude Code fortlaufend ab der höchsten vorhandenen ID (so in B1a-2 gehandhabt).
Status: offen.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1a-2, 11.10.2026.

**F-1038** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Dieselbe commit-guard-Härtung fehlt im Template-Repo claude-projekt-template.
Beschreibung: B1b-1 härtet nur den Root-Hook von ai-workforce. Das Projekt-Skelett (`vorlagen/projekt-skelett/.claude/hooks/commit-guard.js`) trägt die Template-Bytes (Drift-Gate `check-skelett-herkunft`) und bleibt bei der schwächeren Fassung (kein Schutz gegen Ordnerkopie, rm -rf, git branch -D, git reset --hard). Neue Projekte bekommen diese Fassung.
Fundstelle: claude-projekt-template `.claude/hooks/commit-guard.js`; `vorlagen/projekt-skelett/HERKUNFT.md`.
Auswirkung: Mittel.
Maßnahme: Stefan zieht die Härtung im Template-Repo nach (Vorlage: Aufgaben 5/6 in `.claude/hooks/commit-guard.cjs` und `scripts/commit-guard.test.mjs`), danach Skelett per Drift-Gate aktualisieren.
Status: offen.
Feature/Run: Entdeckt: Bauauftrag F45 B1b-1, 11.10.2026.

**F-1041** · `BUG` · P2 · offen
Titel: `Bash(npm run check:*)` erlaubt kein `npm run check:<name>` — die Allowlist-Instruktion verspricht es.
Beschreibung: In der CLI ist `:*` gleichbedeutend mit „Leerzeichen und `*`“ (code.claude.com/docs/en/permissions: `Bash(ls:*)` ≡ `Bash(ls *)`). `Bash(npm run check:*)` passt damit auf `npm run check` und `npm run check <args>`, nicht auf `npm run check:template`. Realer Lauf: `npm run check:schnell` → „This command requires approval“. `baueBashAllowlistSatz` sagt der Ausführung dagegen „bei 'npm run' auch deren Unterskripte wie 'npm run check:<name>'“.
Fundstelle: `startvorlagen/*.json` (Werkzeugsatz schreibend), `src/architekt/index.ts` (baueBashAllowlistSatz); `features/F45/nachweise/b1b1/zaehlung-haertung-lauf1.json`.
Auswirkung: Mittel — Unterskript-Aufrufe enden VERWEIGERT (F-760-Halt) statt zu laufen.
Maßnahme: B2b (Rechte-Rückfrage): Regeln auf die gemeinte Menge bringen (eine Regel je erlaubtem Unterskript oder eine real geprüfte Wildcard-Form) und den Satz an die reale Semantik angleichen; Werkzeugsätze nicht ungeprüft erweitern.
Status: offen.
Feature/Run: Entdeckt: F45 B1b-1, realer Nachweis 11.10.2026.

**F-1042** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: commit-guard greift nicht beim PowerShell-Werkzeug von Claude Code.
Beschreibung: Der PreToolUse-Matcher in `.claude/settings.json` ist `Bash`. Sitzungen mit dem PowerShell-Werkzeug (Windows) führen Befehle aus, ohne dass commit-guard sie sieht — alle Aufgaben 1–6 sind dort umgehbar.
Fundstelle: `.claude/settings.json` (hooks.PreToolUse, matcher "Bash"); dasselbe im Template.
Auswirkung: Mittel — die Bremsen gelten nur für eine von zwei Shells.
Maßnahme: Stefan setzt den Matcher auf `Bash|PowerShell` (Team-Policy, nur im eigenen Editor), im Template nachziehen; commit-guard liest `tool_input.command` bereits für beide.
Status: teilweise (F45 B1b-1 Nachtrag, 11.10.2026): Eingabeform des PowerShell-Werkzeugs real belegt (`tool_name` "PowerShell", `tool_input` { command, description }, Kopf-Felder wie Bash; `features/F45/nachweise/b1b1/zaehlung-powershell.json`), commit-guard verweigert dort real `Remove-Item -Recurse -Force`; Rot-/Grün-Tests mit dieser Form in `scripts/commit-guard.test.mjs`; unbekannte Form ohne `tool_input.command` wird verweigert (fail-closed). Offen: Matcher `Bash|PowerShell` in `.claude/settings.json` (Stefan, Teil der neuen Startfreigabe) und im Template (F-1038).
Feature/Run: Entdeckt: F45 B1b-1 (Bausitzung), 11.10.2026.

**F-1043** · `TECH_DEBT` · P2 · teilweise
Titel: Die Reserve der Bash-Zeitgrenze für ai-workforce war knapp (479 s von 600 s).
Beschreibung: `npm run check` von ai-workforce dauerte 479 s (B1b-1-Messung), unter Last ≈ 10 min; ohne Hintergrund-Ausführung (F-1026) beendet die CLI einen Befehl über der Bash-Zeitgrenze (Exit 143). Der Standard von 600 000 ms ließ ≈ 20 % Reserve. Der Prüfschritt des Kerns hat eine eigene Grenze `pruefZeitgrenzeMs` 900 000 (läuft ohne parallelen Modell-Lauf, Reserve ≈ 47 %).
Fundstelle: `startvorlagen/ai-workforce.json` (`bashZeitgrenzeMs`, `pruefZeitgrenzeMs`); `features/F45/nachweise/b1b1/nachweis.md` (Messung).
Auswirkung: Mittel — ein `npm run check` im Lauf kann bei weiterem Wachstum der Testkette abgebrochen werden.
Maßnahme: `bashZeitgrenzeMs` 1 200 000 (≤ `zeitgrenzeMs` 1 800 000); Dauer der Kette beobachten, `pruefZeitgrenzeMs` nachziehen, sobald eine Messung unter Last 900 s erreicht.
Status: teilweise (F45 B1b-2, 11.10.2026): `bashZeitgrenzeMs: 1200000` in `startvorlagen/ai-workforce.json` (kein Feld des Gültigkeitsschlüssels — keine neue Startfreigabe nötig; Test `src/startvorlage/startvorlage.test.ts`). Offen: Reserve von `pruefZeitgrenzeMs` unter Last.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1b-2, 11.10.2026.

**F-1044** · `PROCESS_IMPROVEMENT` · P3 · teilweise
Titel: Jedes Claude-Code-Update lässt die Startfreigabe unbelegt — Handschritte nötig.
Beschreibung: Die Startfreigabe (E-183/E-188) vergleicht die deklarierte Version der Startvorlage mit dem Wirksamkeitsnachweis, nicht die installierte. Nach einem Update laufen Läufe weiter, ihre Belege (Rot-Fälle, Hook-Wirkung) gelten aber nur für die alte Version; Erneuern heißt Matcher prüfen, Nachweise neu, Startvorlage, Nachweise schreiben, Commit im Autorisierungs-Repo, Verweisdatei, Prüfung.
Fundstelle: `src/invocation-policy/index.ts` (Vergleich deklariert gegen nachgewiesen), `startvorlagen/ai-workforce.json` (`werkzeugVersionDeklariert`).
Auswirkung: Gering bis mittel — ein Update bleibt unbemerkt, bis jemand die Versionen vergleicht.
Maßnahme: Start-Hinweis bei Abweichung und Anleitung; kein automatisches Neuerzeugen (E3).
Status: teilweise (F45 B1b-2, 11.10.2026): beim Leitstand-Start einmal `<werkzeugStartziel> --version` (asynchron, nie im Poll) gegen `werkzeugVersionDeklariert` der Startvorlage des Startprojekts; bei Abweichung Band „CLI-Version geändert — Startfreigabe neu erzeugen“ mit Verweis auf `docs/harness/startfreigabe-erneuern.md` (`scripts/leitstand/cli-version.mjs`, Feld `cliHinweis` in GET /api/zustand). Grenzen: Momentaufnahme beim Start (ein Update zur Laufzeit bleibt bis zum Neustart unbemerkt); prozessweit für die Startvorlage des Startprojekts, nicht je Projekt.
Feature/Run: Entdeckt: Challenger, Bauauftrag F45 B1b-2, 11.10.2026.

**F-1045** · `TECH_DEBT` · P3 · offen
Titel: Die Änderungsübersicht meldet einen neuen Ordner nur als Ordnerpfad, nicht seine Dateien.
Beschreibung: `erzeugeAenderungsuebersichtDaten` liest ungetrackte Dateien über `git status --porcelain` ohne `--untracked-files=all`. Legt ein Lauf einen neuen Ordner an (z. B. `.claude/agents/` mit einer Datei), steht in `dateien` nur `.claude/agents/` — ohne Dateiname und ohne Zeilenzahlen. Real gesehen im Servertest `scripts/leitstand/routen-harness-abgleich.test.mjs` (`geaenderte_harness_dateien`).
Fundstelle: `src/aenderungsuebersicht/index.ts` (`status --porcelain`, `parseUntrackedDateien`).
Auswirkung: Gering — „Geänderte Dateien“ der Abnahme und „Harness im Lauf geändert“ zeigen bei neuen Ordnern nur den Ordner.
Maßnahme: `--untracked-files=all` (Budget beachten) und Test mit neuem Ordner.
Status: offen.
Feature/Run: Entdeckt: F45 B1b-2 (Servertest), 11.10.2026.

**F-1046** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Die Laufakte trägt keine Hook-Ereignisse — Hooks sind im Harness-Abgleich nur statisch belegt.
Beschreibung: stream-json meldet im `-p`-Lauf nur SessionStart-Hooks (`hook_started`/`hook_response`); eine PreToolUse-Verweigerung erscheint nur als tool_result-Text mit dem Grund des Hooks. `leseBeobachtung` übernimmt beides nicht. Der Harness-Abgleich belegt Hooks deshalb nur statisch (Nachweis-Lauf, an Skript-Hash und Matcher gebunden), nicht je Lauf.
Fundstelle: `src/claude-code-gateway/index.ts` (`leseBeobachtung`), `harness-abgleich/standard.json`, `features/F45/nachweise/b1b2/zaehlung-hooks.json`.
Auswirkung: Mittel — Beleg 12 kann für Hooks nur „statisch“ zeigen; ob ein Hook im konkreten Lauf gegriffen hat, steht nicht in der Laufakte.
Maßnahme: `beobachtung.hook_ereignisse` (SessionStart-Ereignisse samt outcome) und gezählte Verweigerungen mit Hook-Grund aufnehmen; danach eine Beleg-Art „im Lauf“ für Hooks in der Zuordnung (WS F oder R).
Status: offen.
Feature/Run: Entdeckt: F45 B1b-2 (Hook-Nachweis), 11.10.2026.

**F-1047** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Fremdprojekte tragen die Hook-Baseline von vor B1b-1 — commit-guard ist dort im Harness-Abgleich „ohne Beleg“.
Beschreibung: Neue Projekte bekommen beim Anlegen die Baseline von ai-workforce byte-gleich (E-F41-1); spätere Härtungen (B1b-1: commit-guard Aufgaben 5/6, Matcher `Bash|PowerShell`) erreichen bestehende Projekte nicht. Real (11.10.2026): haushaltsbuch2 und haushaltsbuch tragen commit-guard mit Matcher `Bash` und anderem Hash (64cedd25…); der Abgleich zeigt dort „Hook weicht vom Nachweis ab“ → „ohne Beleg“ → Beleg 12 nicht erfüllt. guard-settings stimmt überein. Ein per `projekt:nachruesten` nachgerüstetes Projekt ohne settings.json bekommt die Skelett-Hooks (`.js`, Matcher `Bash`) — auch die sind nicht belegt.
Fundstelle: `harness-abgleich/standard.json` (Bindung an Hash und Matcher), `src/projekt-anlegen/index.ts` (kopiereBaseline), `vorlagen/projekt-skelett/.claude/` (F-1038).
Auswirkung: Mittel — im Referenzlauf R (Vorschlag haushaltsbuch2) kann Beleg 12 so nicht bestehen; die Anzeige sagt das richtig.
Maßnahme: Vor R entscheiden (Stefan): (a) Baseline des R-Projekts auf den heutigen Stand ziehen (settings.json und Hooks, dann E-183/Startfreigabe des Projekts neu) oder (b) eine Projektdatei der Zuordnung (`harnessZuordnungPfad`) mit eigenem, realem Hook-Nachweis für die Projekt-Fassung. Template-Repo: F-1038.
Status: offen.
Feature/Run: Entdeckt: F45 B1b-2 (QA-Pass, gegen haushaltsbuch2 nachgerechnet), 11.10.2026.

**F-1048** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte des Harness-Abgleichs aus dem Prüfpass B1b-2.
Beschreibung: (1) Ein Ladefehler von GET …/harness-abgleich bleibt in Abnahme und Lauf-Detail stehen, bis sich der Stand ändert (kein Nachladen-Knopf). (2) Agents/Commands in Unterordnern (`.claude/commands/git/commit.md`) werden nicht inventarisiert (eine Ebene, keine Rekursion) — sie fehlen, statt offen zu sein. (3) Die DoD-Überschrift wird streng gesucht (Zusatz oder Emoji → „kein Abschnitt“, nummerierte Listen werden nicht erkannt). (4) Begründungen und Gründe kommen nur deutsch (Serverwerte), die Seite ist in en/ru/tr gemischtsprachig. (5) Statischer Hook-Beleg zeigt Hash und Matcher nicht in der Oberfläche. (6) Die Nachher-Messung von GET /api/zustand lief nur ≈ 7 min (von Claude Code wegen Speicherdrucks beendet, `features/F45/nachweise/b1b2/messung-nachher-teil.md`); eine volle 10-min-Messung steht aus. (7) Der Render-Nachweis zeigt den Zustand „ohne Beleg“ (gelber Hinweis) nicht — belegt nur im Anzeige-Test.
Fundstelle: `public/leitstand/views/{workflows.js,runs.js}`, `src/harness-abgleich/index.ts` (leseHarnessInventar, leseDodPunkte), `public/leitstand/harness-abgleich-anzeige.js`.
Auswirkung: Gering.
Maßnahme: (1) Nachladen mit dem nächsten Poll-Tick nach Ablauf einer Wartezeit oder Knopf „Neu laden“; (2) Unterordner als Quellen-Eintrag „nicht inventarisiert“ melden statt still auszulassen; (3) Überschrift mit Zusatz zulassen; (4) mit F-1016-Muster Codes statt Texte; (5) Anzeige ergänzen; (6) Messung bei ausreichendem Speicher wiederholen; (7) Render-Folge mit Hook-Abweichung (z. B. haushaltsbuch2).
Status: offen.
Feature/Run: Entdeckt: F45 B1b-2 (code-reviewer, qa), 11.10.2026.

**F-1049** · `HARNESS_IMPROVEMENT` · P1 · offen
Titel: Eingriffsprotokoll fehlt (Challenger K15).
Beschreibung: Die Bestehensbedingung M5/V1 Punkt 3 (`docs/projekt/zielfassung.md` §13.6) verlangt, dass jeder Eingriff Stefans strukturiert festgehalten wird (Klasse Entscheidung/Freigabe/Abnahme/Reparatur, optional bezug_backlog), dass jede Reparatur ein Finding wird und dass mindestens 3 Tage Protokoll vorliegen. Dafür gibt es weder Code noch Schema.
Fundstelle: `docs/projekt/zielfassung.md` §13.6; kein Modul, kein Schema.
Auswirkung: Hoch — ohne Protokoll zählen die ersten F30-Tage nicht; der F38-Auslöser hängt daran.
Maßnahme: B5a (≈ 0,25 AT): Entscheidung/Freigabe/Abnahme aus vorhandenen Kontrollzustand-Artefakten ableiten, nur „Reparatur“ als neuer Knopf mit Pflichtfeld, der über den bestehenden Finding-Weg ein Finding erzeugt. Muss vor R laufen; verzögert sich B5a, als kleines Paket vor R vorziehen.
Status: offen.
Feature/Run: Challenger, Bauauftrag F45 F-1, 11.10.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit, B5a (vor R).

**F-1050** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Codex-Nutzen messen (Challenger K16, B2b).
Beschreibung: Ob Codex als Reviewer Befunde liefert, die die Claude-Prüfer nicht finden, ist nicht gemessen.
Fundstelle: Laufakte des Review-Schritts (kein Feld dafür).
Auswirkung: Mittel — Codex läuft in jeder Kette mit, ohne belegten Nutzen.
Maßnahme: Die Laufakte zählt je Review bestätigte Befunde „nur Codex“ / „nur Claude-Prüfer“ / „beide“. Codex bleibt Reviewer, wenn er in R plus der ersten F30-Woche ≥ 1 bestätigten Befund findet, den die Claude-Prüfer nicht fanden; sonst nur noch bei Kontrolltiefe „hoch“. Voraussetzung F-829/F-929 (B2a).
Status: offen.
Feature/Run: Challenger, Bauauftrag F45 F-1, 11.10.2026.
Nachtrag (Stefan, 14.10.2026): Codex prüft heute schon im Review-Schritt (Vorlagen standard/hoch). Der Nutzen wird in B2b gemessen (Codex-Review-Spec §11): nur Codex / nur Claude / beide, Fehlalarme, Kosten.
Zugeordnet: F45 R statt B2b — die Messung braucht echte Läufe (E-B2b-1 = A, 14.10.2026).

**F-1051** · `TECH_DEBT` · P2 · offen
Titel: Externe Agents sind nicht installierbar (Challenger K17).
Beschreibung: Es gibt keine Katalogeinträge für externe Agents und keinen Bedarf; `AGENT_INSTALLATION_ERST_SPAETER` bleibt. Projekt-Agents laufen seit F45 F-1 (F-815).
Fundstelle: `src/ressourcen/index.ts` (`pruefeInstallierbarkeit`, `AGENT_INSTALLATION_ERST_SPAETER`).
Auswirkung: Gering — heute kein Eintrag betroffen.
Maßnahme: Beim ersten realen Eintrag das Ort-B-Muster für Agents (Installation in `<cap>/<id>/.claude/agents`, inhalt_hash, `--add-dir`, Init-Gate).
Status: offen.
Feature/Run: Challenger, Bauauftrag F45 F-1, 11.10.2026.
Nachtrag (Challenger, Auftrag F45 F-2b-2, 12.10.2026): Priorität P3 → P2. Maßnahme neu: F-3 — fremde Agents installierbar über denselben Weg wie Plugins (Pin, Inhalts-Hash, Prüfbericht, Freigabe, Opt-in je Projekt). Der Auftrag nennt dafür F-1052; inhaltlich (P3, fremde Agents) ist es dieser Eintrag — F-1052 (API-Schlüssel, schon P2) bleibt unverändert.
Zugeordnet: F45 F-3.
Nachtrag (F45 F-3a-1, 14.10.2026): F-3 ist geteilt; fremde Agents gehen mit F-3b (F-1090) über den Plugin-Weg — Spike `features/F45/nachweise/f3a/spike.md`: ein Agent aus einem Plugin erscheint als `<plugin>:<agent>` in `init.agents`.
Nachtrag (F45 F-3b-1, 14.10.2026): Agents aus Plugins gehen über die gefilterte Kopie (Frontmatter wie Projekt-Agents: `tools` Pflicht ohne Agent/Task/Skill und im Werkzeugsatz, `model` nur inherit, E-F3b-6), werden mit dem Plugin geprüft und freigegeben und sind der Ausführung zuordenbar; im Lauf erst mit F45 F-3b-2.

**F-1052** · `TECH_DEBT` · P2 · offen
Titel: extern_lesend-MCPs mit API-Schlüssel sind nicht nutzbar (Challenger K18).
Beschreibung: E-F36-4 (geändert 01.10.2026) lässt Web- und kostenpflichtige MCPs bei Einzelfreigabe zu, aber der Lauf hat keinen Weg, einem MCP-Server ein Geheimnis (API-Schlüssel) zu übergeben.
Fundstelle: `src/ressourcen/index.ts` (`baueMcpAufruf`, nur command/args), `installation_vorlage`.
Auswirkung: Mittel — Scanner-Recherche (F30) mit Such-/Daten-MCPs nicht möglich.
Maßnahme: Vor F30 prüfen (Scanner-Recherche); Geheimnis-Weitergabe ohne Klartext in Laufakte und Rohstrom.
Status: offen.
Feature/Run: Challenger, Bauauftrag F45 F-1, 11.10.2026.
Zugeordnet: F45 B3 statt B2b, gemeinsam mit F-1072 — Auslöser ist das erste Projekt mit echtem externen API-Aufruf, spätestens B3 (E-B2b-1 = A, 14.10.2026).
Nachtrag (Auftrag F45 F-3a, 14.10.2026): Zuordnung → F45 B2b, gemeinsam mit F-1072 (K32) — die Geheimnis-Weitergabe an einen MCP-Server folgt derselben Regel wie API-Schlüssel im Lauf (nur Umgebungsvariable, nie in Datei/Laufakte/Rohstrom, echter Aufruf nur nach Rückfrage). Nicht mehr Teil von F-3.

**F-1055** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: Grenzen der Fähigkeiten-Sperre (F45 F-1).
Beschreibung: (1) Ein Lauf kann über npm-Skripte einen abgekoppelten Prozess starten, der nach Laufende `~/.ai-workforce/faehigkeiten.lokal.json` schreibt oder POST …/faehigkeiten aufruft; der Vorher/Nachher-Hash im Controller sieht nur Änderungen während des Laufs (ADR ausfuehrung-bash-allowlist: npm run check:* führt beliebigen Code aus). (2) Nicht gemessen: ob ein aktiver Subagent die Agent(…)-Sperren erbt (der Skelett-Agent hat ohnehin kein Agent-Werkzeug), Agent-Aufruf ohne subagent_type, Groß-/Kleinschreibung in `Agent(<name>)`. (3) Die Referenzlisten (`src/faehigkeiten/eingebaut-referenz.json`) driften mit der CLI — das Init-Gate bricht dann fail-closed ab, bis nachgemessen ist. (4) Die strenge Frontmatter-Grammatik ist bewusst enger als YAML; ein Projekt-Agent mit `tools` als YAML-Liste oder `model` ≠ `inherit` ist gesperrt; Namen werden für Sperrliste und Eindeutigkeit zusätzlich nachsichtig gelesen (Code-Review 1). (5) Der Vorher/Nachher-Hash vergleicht die ganze Datei, nicht nur den Abschnitt des Projekts: eine Handänderung für ein anderes Projekt während eines Laufs färbt ihn rot (die POST-Routen sind während eines Laufs gesperrt). (6) Die Skill-Sperrliste vor dem Start liest Namen weiter mit leseFrontmatter (nur ^name:); ein abweichend geschriebener Skill-Name fällt erst im Init-Gate auf. (7) Ein gleichnamiger Agent in einem Unterordner führt zum Grund „eingeschaltet, aber nicht aktiv“ statt „mehrdeutig“ (Ergebnis richtig, Grund ungenau).
Fundstelle: `src/faehigkeiten/index.ts`, `src/execution-controller/index.ts` (hashLokaleDatei), `state/spike-f45-f1-agents.md`.
Auswirkung: Mittel — (1) ist ein Weg zur Selbstfreigabe ab dem nächsten Lauf.
Maßnahme: (1) Bei B2b (Rückfrage/Rechte) prüfen: Freigabe nach Inhalt nur mit Bestätigung im Leitstand (UI F-2) und Anzeige der Änderungen der lokalen Datei seit dem letzten Lauf; (2) im Referenzlauf R beobachten; (3) Nachmessen bei jedem CLI-Update (F-1044-Hinweis).
Status: teilweise (F45 F-2a, 12.10.2026): (1) Anzeige — Wächter im Speicher (`erzeugeLokalWaechter`, `scripts/leitstand/routen-faehigkeiten.mjs`) kennt den Stand beim Serverstart und nach jedem Schreiben über die Routen; eine andere Änderung erscheint als Band „Außerhalb des Leitstands geändert“ (Seite Workforce, mit Änderungszeit) und als Hinweis im Freigabeblock. Die Oberfläche schickt den angezeigten Hash der Datei mit (`stand`); weicht er ab, schreibt der Server nichts (409) — kein Klick übernimmt eine Änderung, die nach dem Laden der Seite geschah. Ein Laufende übernimmt bewusst keinen Stand (Plan v2, Advisor A2). Bestätigung durch eine Freigabe nach Inhalt bleibt für Projekt-Fähigkeiten ohnehin Pflicht. Rest: F-1061 und (2)–(7).
Feature/Run: Entdeckt: F45 F-1 (Delta-Advisor B1/B9), 12.10.2026.

**F-1058** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Bibliotheken aus der Sammlung lassen sich nicht je Projekt vorgeben (Challenger K22).
Beschreibung: Produkt-Bibliotheken (Gruppe 2 der Sammlung, Stack-Liste für den Architekten) können für ein Projekt nicht als Vorgabe gesetzt werden; der Architekt wählt frei.
Fundstelle: `docs/harness/stack-kandidaten.md`, `docs/harness/kandidaten-2026-09-15.md` (Gruppe 2).
Auswirkung: Gering bis mittel — Design- und Motion-Projekte bekommen keine verlässlich gleiche Bibliotheksbasis.
Maßnahme: B3 (Design & Motion, E-F45-10) bzw. Projektkarte (B2a).
Status: offen.
Feature/Run: Challenger, Bauauftrag F45 F-2a, 12.10.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit, B3 bzw. B2a.

**F-1059** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Die Workforce kann keine Website mit Motion, Interaktion und 3D auf Qualitätsniveau bauen und belegen (Challenger K23).
Beschreibung: Es fehlen Motion-Skills im Lauf, Design-Referenzen als Eingabe, Bibliotheken je Projekt und ein Render-Nachweis mit Bewegung (Bildfolge/Video, Ladezeit-Budget, „Bewegung reduzieren“).
Fundstelle: `docs/projekt/fixpaket-f45.md` (B3, R2, Beleg 15), `scripts/render-nachweis.mjs`.
Auswirkung: Mittel — Website- und Design-Aufträge (E-F45-10) sind ohne Handarbeit nicht in der geforderten Qualität möglich.
Maßnahme: B3 neu („Design & Motion in Fremdprojekten“) und Referenzauftrag R2 mit Beleg 15 (E-F45-10).
Status: offen.
Feature/Run: Challenger, Bauauftrag F45 F-2a, 12.10.2026.
Zugeordnet: Fixpaket Arbeitsfähigkeit, B3 und R2.

**F-1060** · `TECH_DEBT` · P2 · offen
Titel: Restpunkte F45 F-2a (Fortsetzungsstarts, Status-Route, Anzeige-Kleinpunkte).
Beschreibung: (1) Fortsetzungsstarts (Korrekturlauf, Folgeschritte) haben keine Anzeige und laufen deshalb ohne Katalog- und Projekt-Fähigkeiten (F-1054 (3)); „Anzeige = Start“ (E-F36-4) verbietet Fähigkeiten ohne Anzeige. (2) GET …/faehigkeiten prüft die `tools`-Zeile der Projekt-Agents gegen den Werkzeugsatz `schreibend` (kein Schritt bekannt); der Freigabeblock nutzt seit F-2a den Werkzeugsatz des Schritts (F-1054 (5), QA 9 aus F-1). (3) Der Join von `faehigkeiten_im_lauf` zählt Agent-Namen genau nach Schreibweise (F-1054 (6), QA 8 aus F-1). (4) Ist der jüngste Ausführungslauf ein Fortsetzungslauf, zeigt „Im letzten Lauf“ überall „nicht erfasst“; der Lauf davor ist dort nicht mehr sichtbar (QA 9). (5) Ein installierter Katalog-Eintrag ohne Freigabe zeigt den Schalter „an“, den Chip „aus“ — nur der Grund erklärt es (QA 7). (6) Zugänglichkeit: Der volle Hash im Lauf-Detail steht nur im title — nur per Maus erreichbar, nicht per Tastatur, Screenreader oder Touch (QA 12, design-guardian G). (7) Gründe des Servers (grund, hindernis, Laufsperre) bleiben in en/ru/tr deutsch. (8) Liefert die Empfehlung ok:false oder sind die Pfade nicht lesbar, wird sie nicht zwischengespeichert — dann rechnet der 2-s-Poll von GET /api/workflows/<id> jedes Mal auch die Projekt-Fähigkeiten (Code-Review 6). (9) Die Skelett-Skills git-flow und handoff-vertrag weichen inhaltlich von den gleichnamigen Katalog-Dateien der Workforce ab — in jedem Skelett-Projekt stehen sie auf „Inhalt weicht von der Freigabe ab“ (Beleg 13, 12.10.2026). (10) Lauf-Detail und Workforce zeigen denselben Fall verschieden: die Workforce „Inhalt weicht ab“ als gelben Chip, das Lauf-Detail als „aus“ mit grauem Grund — die Laufakte trägt den Freigabestand nicht (design-guardian 4). (11) Server-Gründe nennen interne Nummern („Opt-in je Projekt, E-F45-6“) (design-guardian 7). (12) Die Beobachtungszeile im Lauf-Detail ist fest deutsch („Geladen: … Skills“, `public/leitstand/beobachtung-zeile.js`), auch in en/ru/tr. (13) Der schwebende Knopf „Frag Jarvis“ verdeckt bei 390 px und Zoom 200 % Text der Tabellen (seitenübergreifend). (14) Gestapelte Tabellen (`display: block` auf table/tr/td) verlieren in Safari die Tabellen-Semantik; Spaltennamen bleiben über `::before` lesbar (design-guardian, Bestätigungsprüfung).
Fundstelle: `scripts/leitstand-server.mjs` (starteWorkflowSchritt, Status-Route, ermittleAusfuehrungsEmpfehlungGecached), `scripts/leitstand/routen-faehigkeiten.mjs`, `src/claude-code-gateway/index.ts` (verbindeFaehigkeitenMitAufrufen), `public/leitstand/views/lauf-detail.js`, `vorlagen/projekt-skelett/.claude/skills/`.
Auswirkung: Mittel für (1) (Korrekturlauf ohne Fähigkeiten), sonst gering.
Maßnahme: (1) B2b-Rückweg: die Korrektur-Entscheidung zeigt die Empfehlung erneut und trägt die Kennungen; (2) Werkzeugsatz als Parameter der Status-Route; (3) Groß-/Kleinschreibung im Join wie die CLI; (4) „letzter Lauf mit Erfassung“ zusätzlich zeigen; (5) Schalter bei nicht freigegebenen Einträgen deaktivieren oder Chip „nicht freigegeben“; (6) Hash aufklappbar wie in der Freigabe (Behebung mit F-2b oder B3); (7) Codes statt Texte (Muster F-1016); (8) Fehlschläge kurz zwischenspeichern; (9) Skelett und Katalog angleichen (Template-Repo, F-1038) oder Skelett-Inhalt im Katalog freigeben; (10) Freigabestand in faehigkeiten_im_lauf aufnehmen und dieselben Chips nutzen; (11) Nummern aus den Gründen nehmen; (12) über i18n; (13) Abstand bzw. Ausweichen des Knopfs bei schmaler Ansicht; (14) role-Attribute (table/row/cell) beim Stapeln.
Status: offen.
Feature/Run: Entdeckt: F45 F-2a (code-reviewer, qa, design-guardian, Render-Nachweis, Beleg 13), 12.10.2026.
Nachtrag (F45 F-2b-1, 12.10.2026): (6) erledigt — der volle Hash im Lauf-Detail steht aufklappbar unter dem gekürzten (`<details>`, Muster der Freigabe; per Tastatur, Screenreader und Touch erreichbar, bricht in schmalen Zellen um) mit „Kopieren“ (ohne Zwischenablage: Hash markiert und Hinweis „mit Strg+C kopieren“; Render-Nachweis per Tastatur `features/F45/nachweise/f2b/render/lauf-detail-l1-hash-tastatur/`). Übrige Punkte offen.

**F-1061** · `HARNESS_IMPROVEMENT` · P2 · teilweise
Titel: Grenzen des Wächters der lokalen Fähigkeiten-Datei (F45 F-2a).
Beschreibung: (1) Der Wächter lebt nur im Speicher: nach einem Neustart des Leitstands gilt der Stand beim Start als bekannt — eine Änderung bei gestopptem Leitstand bleibt unsichtbar. (2) Eine Anfrage an die POST-Routen ohne Browser-Header und ohne `stand` (z. B. ein Prozess mit curl) gilt als Schreiben über die Routen und wird als bekannt übernommen. (3) Sieht Stefan das Band „Außerhalb des Leitstands geändert“, übernimmt der nächste Schalterklick den angezeigten Stand ohne eigene Bestätigung (Code-Review 3: Alternative „Schalter gesperrt, bis ‚Datei geprüft — Stand übernehmen‘“). (4) Ein Arbeitsordner, der vom Projektordner abweicht, lässt die Freigabe mit 409 scheitern; Abhilfe ist Stand sichern und Ablauf neu anlegen (Plan v2, Advisor A1, Variante „eigener Grund“).
Fundstelle: `scripts/leitstand/routen-faehigkeiten.mjs` (erzeugeLokalWaechter, aendereLokaleDatei), `scripts/leitstand-server.mjs` (Freigabe-Vorprüfung, projektKennungenImOrdnerAbweichung).
Auswirkung: Mittel — (1)/(2) sind Wege, auf denen eine Fremdänderung unbemerkt bleibt; (3) ist eine Bedienentscheidung.
Maßnahme: (3) Entscheidung Stefan (bewusste Bestätigung vs. Übernahme mit dem nächsten Klick); (1) bei Bedarf den letzten bekannten Hash in der Laufakte des letzten Laufs gegenprüfen; (2) `stand` zur Pflicht machen, sobald kein Gate/Skript mehr ohne schreibt.
Entscheidung (3) (Stefan, 12.10.2026, Empfehlung Challenger): Nach einer Änderung von außen gilt der Stand erst nach ausdrücklicher Bestätigung im Leitstand („Datei geprüft – Stand übernehmen“, POST …/faehigkeiten/bestaetigung, Laufsperre und CSRF wie die anderen Fähigkeiten-Routen); bis dahin startet kein Lauf mit Katalog-Fähigkeiten (Grund im Startabbruch und im Band, Muster E-F45-7).
Status: teilweise (F45 F-2a, 12.10.2026): (3) umgesetzt — `bestaetigeLokaleDatei` (nur der angezeigte, aktuelle Stand; ungültige Datei → erst reparieren), Schreib-Routen 409 solange unbestätigt (auch ohne `stand`, damit gilt (2) nur noch ohne vorherige Fremdänderung), Start mit Katalog-Fähigkeiten abgelehnt (`loeseAusfuehrungsEingabenAuf`, Freigabe-Vorprüfung vor dem Festhalten), rotes Band mit Knopf auf der Seite Workforce, Hinweis im Freigabeblock; Tests rot/grün in `scripts/leitstand/routen-faehigkeiten.test.mjs`; ARCHITECTURE.md §2 nachgezogen. Offen: (1), (2) (Schreiben über die Routen ohne Fremdänderung), (4).
Feature/Run: Entdeckt: F45 F-2a (Advisor A1/A3, code-reviewer 3, qa 1), 12.10.2026.
Nachtrag (F45 F-2b-2b, 13.10.2026): (1) ist **F-2b-2c** zugeordnet (Advisor-Pass F-2b-2b „zu groß“). Advisor F12: es gibt keine bestehende Ablage für den Hash — der Weg „Laufakte des letzten Laufs“ trägt nicht (Schreiben über die Routen zwischen zwei Läufen ändert den Hash); naheliegend ist ein Kern-Artefakt in der Ablage der Workforce (`registriereKernArtefakt`, wie die Prüfberichte), keine lose Datei unter `kontrollzustand/` (ARCHITECTURE.md §2) — Änderung an ARCHITECTURE.md mit eigenem Advisor-Pass in F-2b-2c.
Nachtrag (F45 F-2b-2c, 13.10.2026): (1) erledigt — der letzte bekannte Stand liegt in `faehigkeiten.stand.json` neben der lokalen Datei (`src/faehigkeiten/stand.ts`, atomar, LF, mit Pfad; ARCHITECTURE.md §2 als Ausnahme). Advisor-Pass F-2b-2c: kein Kern-Artefakt (A4: `kontrollzustand/` ist getrackt und je Checkout, Wachstum je Klick, umgelenkter Pfad nicht unterscheidbar; A3: die Hash-Kette schützt ohne Geheimnis nicht gegen Löschen/Anhängen) — nach Auftrag dann die JSON-Datei. Startregel fail-closed (A1/A2): Hash abweichend → Band „Stand vor dem letzten Neustart“, Sperre bis zur Bestätigung; Stand fehlt, ist beschädigt oder gehört zu einem anderen Pfad, Datei vorhanden → „kein gespeicherter Stand“, ebenfalls gesperrt (einmalig beim ersten Start mit F-2b-2c); nur Stand und Datei fehlend gilt als bekannt. Tests in `scripts/leitstand/routen-faehigkeiten.test.mjs`, `src/faehigkeiten/stand.test.ts`. Offen: (2), (4).
Nachtrag (F45 B2a-1, 13.10.2026): Grenze: faehigkeiten.stand.json liegt neben der lokalen Datei — ein Prozess, der beide ändert, bleibt unentdeckt; Ziel ist sichtbar machen, kein Schutz gegen gezielte Änderung (Challenger 13.10.2026).

**F-1067** · `TECH_DEBT` · P3 · offen
Titel: Ein Scout-Schritt über einen Workflow bekommt die Sammlung nicht (F45 F-2b-1).
Beschreibung: Der Anhang „Sammlung zuerst“ hängt nur an direkt gestarteten Scout-Läufen (POST /api/laeufe, Rolle `scout`). Workflows lassen jede bekannte Rolle zu; ein Scout-Schritt über `starteWorkflowSchritt` liefe ohne die Sammlung (Delta-Advisor B3). Heute plant keine Workflow-Vorlage einen Scout-Schritt.
Fundstelle: `scripts/leitstand-server.mjs` (`loeseSchrittEingabenAuf`), `scripts/leitstand/routen-sammlung.mjs` (`ergaenzeScoutPrompt`).
Auswirkung: Gering — nur, wenn künftig ein Workflow einen Scout-Schritt plant.
Maßnahme: Bei Bedarf denselben Anhang in `loeseSchrittEingabenAuf` für die Rolle `scout` (ohne neuen Aufruf von `starteWorkflowSchritt`).
Status: offen.
Feature/Run: Entdeckt: F45 F-2b-1 (Delta-Advisor B3), 12.10.2026.

**F-1068** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte der Sammlung im Leitstand (F45 F-2b-1).
Beschreibung: (1) Bei 390 px sind 176 gestapelte Einträge zu scrollen; die Gruppen nach Art lassen sich nicht einklappen (QA 6). (2) Die Texte des Servers — Selbstprüfung, Strukturfehler der Datei, Fehler des Katalog-Status — bleiben in en/ru/tr deutsch (QA 8; Muster F-1060 (7)). (3) Das Detail öffnet in der Namensspalte (34 %) statt als eigene volle Tabellenzeile (design-guardian 3, Variante „besser“; umgesetzt ist die Variante „einspaltig“). (4) In den Spalten Lizenz/Kosten bricht ein Wort, das breiter als die Spalte ist („iOS-/Signierungssetup“), im Wort (Bestätigungsprüfung design-guardian; Silbentrennung verworfen, weil sie Eigennamen wie „GitHub“ trennt).
Fundstelle: `public/leitstand/sammlung-anzeige.js`, `src/sammlung/index.ts`, `scripts/leitstand/routen-sammlung.mjs`.
Auswirkung: Gering — Lesbarkeit auf dem Telefon und in anderen Sprachen.
Maßnahme: (1) Gruppen als `<details>` (offen ab 1 Treffer bzw. bei Filter); (2) Codes mit Zahlen statt Text (Muster F-1016); (3) Detailzeile mit `colspan` (mit F-2b-2, wenn dort der Prüfbericht im Detail steht); (4) breitere Kosten-Spalte oder `hyphens` nur für die Kosten-Spalte mit `lang` der Datei.
Status: offen.
Feature/Run: Entdeckt: F45 F-2b-1 (qa, design-guardian), 12.10.2026.
Nachtrag (F45 F-2b-2a, 12.10.2026): nichts davon erledigt — (3) (Detail als volle Tabellenzeile) ist nach dem Delta-Advisor-Pass F-2b-2b zugeordnet; der Prüfbericht im Detail sitzt bis dahin in der Namensspalte (Befunde gestapelt, gering/Hinweis eingeklappt).
Nachtrag (F45 F-2b-2b, 13.10.2026): (3) ist **F-2b-2c** zugeordnet (Advisor-Pass F-2b-2b „zu groß“).
Nachtrag (F45 F-2b-2c, 13.10.2026): (3) erledigt — Knopf „Details“ (aria-expanded/aria-controls) in der Namensspalte, das Detail steht offen in einer eigenen Tabellenzeile `<td colspan="6">` (nur gerendert, wenn offen); Begriffe/Werte breit zweispaltig. Offen: (1), (2), (4).

**F-1069** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Eigene Agents/Skills bauen lassen geht nicht durchgängig (Challenger K29).
Beschreibung: Läufe dürfen `**/.claude/**` nicht schreiben (deny Write/Edit) — eine gebaute Fähigkeit landet also nicht dort, wo sie geladen wird.
Fundstelle: `src/faehigkeiten/start.ts` (Write/Edit(`**/.claude/**`)), `src/ressourcen/ort-b-start.ts` (CLAUDE_ORDNER_SPERREN).
Auswirkung: Mittel — „Fähigkeit bauen“ endet heute in Handarbeit.
Maßnahme: nach F30/Teil 2 — Ablauf „Fähigkeit bauen“ schreibt in einen Vorschlagsordner; Stefan übernimmt per Knopf (Server schreibt, Freigabe nach Inhalt wie F-1/F-2a).
Nachtrag (Stefan, 14.10.2026, E-F45-12 = A): vorgezogen in den neuen Baustein „Fähigkeit bauen“ nach B2b, vor B3 (≈ 0,5–0,75 AT), zusammen mit der Form-Empfehlung durch den Architekten (F-1096, K39).
Status: offen.
Feature/Run: Entdeckt: Challenger, 12.10.2026.

**F-1070** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Kein Direktstart „Fähigkeit X auf Aufgabe Y“ (Challenger K30).
Beschreibung: Läufe starten nur über Rollen/Workflows; eine einzelne Fähigkeit lässt sich nicht gezielt auf eine Aufgabe ansetzen.
Fundstelle: `scripts/leitstand-server.mjs` (POST /api/laeufe, Workflows).
Auswirkung: Gering — Umweg über einen Workflow.
Maßnahme: nach F30 — Einzelauftrag mit vorbelegter Fähigkeit (fast-lane).
Status: offen.
Feature/Run: Entdeckt: Challenger, 12.10.2026.

**F-1072** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: API-Schlüssel im Lauf ungeregelt (Challenger K32).
Beschreibung: Integrationstests mit echten Diensten, ihre Kosten und die Maskierung von Schlüsseln (F-1005) sind im Lauf nicht geregelt.
Fundstelle: Ausführungslauf, `scripts/leitstand/geheimnisse-maskieren.mjs`.
Auswirkung: Mittel — Kosten und Schlüssel-Leck möglich.
Maßnahme: B3 (zuvor B2a/B2b) mit F-1071 — Standard Attrappe, echter Aufruf nur nach Rückfrage, Schlüssel nur als Umgebungsvariable, nie in Datei oder Laufakte.
Status: offen.
Feature/Run: Entdeckt: Challenger, 12.10.2026.
Zugeordnet: F45 B3 statt B2a/B2b — Auslöser ist das erste Projekt mit echtem externen API-Aufruf, spätestens B3 (K32; E-B2b-1 = A, 14.10.2026).

**F-1073** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte F45 F-2b-2a (Eignungsprüfung) — Bedienung und Anzeige.
Beschreibung: (1) Ein Projektwechsel oder Neuladen verwirft die Verfolgung eines laufenden Prüflaufs; der Lauf geht weiter, die Sammlung zeigt bis zum Bericht nichts davon, ein erneutes „Auswählen“ endet erst nach dem Pin mit 409 (QA 4). (2) D13 wird erst nach dem Pin geprüft (bis zu 120 s Warten auf git/npm, dann 409) — bewusst so (Advisor C2), eine billige Vorabprüfung ohne Reservierung fehlt (QA 9). (3) Ein Bericht über einen tieferen Ordner als den installierten Pfad gilt nicht; die Sperre sagt dann „ohne Prüfbericht“, obwohl einer existiert (QA 10). (4) Stand „geprüft“ gilt auch bei NICHT_GEEIGNET und bei einem Bericht für eine ältere Version; der Filter mischt freigebbare und gesperrte Einträge (QA 11). (5) Der Render-Nachweis zeigt im Detail „Prüfbericht: keiner“ neben dem Attrappen-Bericht und deckt tr/ru, Fehlerphasen und eine Tastaturfolge nicht ab (design-guardian 9/10, QA). (6) Im Freigabedialog sind „Prüfen & freigeben“ und „Installieren“ zugleich als Hauptknopf sichtbar (Bestand vor F-2b-2a, design-guardian). (7) Befunde und Belege des Prüfberichts sind Daten des Modells und bleiben in der Sprache des Laufs (deutsch).
Fundstelle: `public/leitstand/views/sammlung.js`, `scripts/leitstand-server.mjs` (POST /api/sammlung/pruefung), `src/sammlung/pruefbericht.ts` (gleicheQuelle), `scripts/leitstand/routen-pruefung.mjs` (ergaenzeSammlung), `features/F45/nachweise/f2b2/render/`.
Auswirkung: Gering bis mittel — Bedienkomfort; die Sperre der Freigabe bleibt in jedem Fall fail-closed.
Maßnahme: (1) laufende Prüfläufe aus dem Zustand der Workforce ableiten (laufAktivLaufId mit Präfix `eignungspruefung-`) und in der Zeile zeigen; (2) Vorabprüfung von D13 vor dem Pin (ohne Reservierung); (3) eigener Sperrgrund „Bericht deckt nur <pfad>“; (4) Stand „geprüft“ nach Urteil unterscheiden (z. B. „geprüft — nicht geeignet“); (5) Render-Folgen nachziehen; (6) Öffner nach dem Öffnen nachrangig; (7) bei Bedarf Zusammenfassung je Sprache.
Status: offen.
Feature/Run: Entdeckt: F45 F-2b-2a (qa, design-guardian), 12.10.2026.
Nachtrag (Delta-Review, 12.10.2026): (8) ein Phasenwechsel durch den Detail-Auffrischer zeichnet die Liste neu und verliert den Fokus anderswo in der Liste; danach greift „wennDort“ über body; (9) „Pfad nicht übernommen“ zeichnet neu und verliert den getippten Pfad — ein zweiter Klick startet mit dem alten (getippten Pfad wie die Ausnahme im Ablauf merken); (10) Überholschutz von „vorbereiten“ fehlt im catch-Zweig und nach dem await; (11) Phase „fertig“ ohne festes Fokusziel; (12) Meldung „Pfad nicht übernommen“ ohne aria-describedby am Pfadfeld.

**F-1074** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Grenzen des Prüflaufs (F45 F-2b-2a).
Beschreibung: (1) Ein Abbruch greift beim Holen erst zwischen den Schritten; ein laufender git/npm-Aufruf endet an seiner Zeitgrenze (120 s; Advisor C8). (2) `fetch --depth 1` lädt den ganzen Stand des Commits, bevor die Grenzen (3 000 Dateien, 25 MB) greifen (C10) — ein sehr großes Repo füllt kurz den Temp-Ordner. (3) Das Init-Gate prüft nur die init-Zeile; gegen Skills, die die CLI im Lauf in verschachtelten Ordnern entdecken könnte, schützen Neutralisierung und das fehlende Skill-Werkzeug (C13). (4) Ein unsauberes `.claude` im Workforce-Checkout färbt jeden Prüflauf rot (C6, fail-closed, Grund im Fehlerstand). (5) Die Bildung `<unterpfad>/<skill_pfad>` steht an vier Stellen (Installation zweimal, Holen, Prüfroute); die Bindung des Berichts hängt an exakt gleicher Bildung (Code-Review 6). (6) Das Gate vergleicht den Argv der Bestandsrollen nur indirekt (kein ortB für architekt), Tests für die Grenzen von 3 000 Dateien/25 MB, den Misserfolgs-Zweig eines Prüflaufs und den Neustart mitten im Lauf fehlen (Code-Review 12, QA). (7) Das Modellurteil kann ein manipuliertes Repo beeinflussen; die mechanischen Fakten stehen deshalb getrennt davor (C14).
Fundstelle: `src/sammlung/quelle.ts`, `scripts/leitstand/routen-pruefung.mjs`, `src/ressourcen/installation.ts`, `scripts/check-f45-f2b2-pruefung.mjs`.
Auswirkung: Gering — Grenzen sind bekannt und fail-closed.
Maßnahme: (1) Runner mit Abbruchsignal; (2) Partial Clone mit Blob-Filter prüfen (Vorsicht: Nachladen bei cat-file); (5) gemeinsame Funktion für den Quellpfad; (6) Tests nachziehen, Argv-Bitgleichheit direkt gegen baueAufruf prüfen.
Status: offen.
Feature/Run: Entdeckt: F45 F-2b-2a (Delta-Advisor C6/C8/C10/C13/C14, code-reviewer, qa), 12.10.2026.
Nachtrag (Delta-Review Runde 2, 12.10.2026, mittel/gering): (11) NTFS-Großschreibungsfälle (`σ`/`ς` → `Σ`) und 8.3-Kurznamen (`ABCDEF~1.MD` neben `abcdefghij.md`) erkennt pfadSchluessel nicht — Prüfung läuft durch, die Installation endet über den Inhalts-Abgleich in 422 (Maßnahme: `toUpperCase().toLowerCase()`, Segmente mit `~<Ziffer>` ablehnen); (12) Ordner-Zwillinge (`A/x.md` neben `a/y.md`) werden nicht als Zwilling gemeldet — Installation endet sicher über den Abgleich, die Meldung ist irreführend. Erledigt in Runde 3: Tar-Parser-Abweichung pax/GNU-L (abgewiesen), NFC/NFD-Test mit Escapes, `pruefeInhalt` Pflicht.
Nachtrag (Delta-Review, 12.10.2026): (8) `auswahl` prüft MCP-Pakete mit `^npm:`, die Route mit `paketNameAus` — ein ungültiger Name zeigt „Auswählen“ und endet mit 422; (9) die Payload prüft die Integrity nur auf das Präfix `sha512-` statt auf SHA512_INTEGRITY; (10) Kopf von `schreibeInhalt` nennt Kollision noch „Fakt“, und eine Kollision durch die Neutralisierung (`.claude/x` neben `_.claude/x`) meldet „andere Schreibweise“.
Nachtrag (F45 F-2b-2b, 13.10.2026): (8) erledigt — `auswahl` (`src/sammlung/index.ts`) prüft Katalog- und Sammlungs-Paket mit `paketNameAus` wie die Prüfroute (Test `sammlung.test.ts`); (9) erledigt — `validierePruefberichtDaten` und `schemas/kontrollzustand-pruefbericht-payload.schema.json` verlangen die volle Form `SHA512_INTEGRITY` (Test `pruefbericht.test.ts`). Übrige Punkte offen.

**F-1076** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: impeccable ist laut Prüfbericht NICHT_GEEIGNET, steht aber im B3-Plan (Challenger K34).
Beschreibung: Der echte Prüflauf `eignungspruefung-impeccable-87331e24…` (Skill-Ordner `.claude/skills/impeccable` @ `919dbeb`, `features/F45/nachweise/f2b2/bericht-impeccable.json`) urteilt NICHT_GEEIGNET: der Launcher (`scripts/impeccable`, `impeccable.cmd`) lädt beim ersten Lauf ein geschlossenes Engine-Binary von GitHub-Releases nach `~/.impeccable/bin/` und führt es aus; `hooks on` schreibt Hook-Manifeste u. a. in `.claude/settings.local.json`. B3 (`docs/projekt/fixpaket-f45.md`) plant „impeccable installierbar“.
Fundstelle: `docs/projekt/fixpaket-f45.md` (Zeile B3), `ressourcen.json` (impeccable), `features/F45/nachweise/f2b2/`.
Auswirkung: Mittel — B3 plant eine Fähigkeit, die die eigene Eignungsprüfung ablehnt.
Maßnahme: B3 — Ersatz aus der Sammlung prüfen (taste-skill, animate-skill, ui-ux-pro-max; frontend-design ist installiert) oder nur eine gepinnte Teilkopie ohne Launcher und Hooks nach neuem Prüfbericht.
Status: offen.
Feature/Run: Entdeckt: Challenger, 12.10.2026 (Prüfbericht F45 F-2b-2a).
Zugeordnet: F45 B3.

**F-1077** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Jarvis weist eigene Produktprojekte ab statt sie in den Projekt-Weg zu lenken (Challenger K33).
Beschreibung: Im Jarvis-Chat (12.10.2026, „KI-Videos erstellen und publishen“) antwortet Jarvis „kein Fall für AI Workforce“ mit Verweis auf `docs/projekt/kontext/beschreibung.md` („autonome produktive/externe/irreversible Aktionen“ unter „Nicht das Ziel“). Erst auf Nachfrage nennt er „eigenes Projekt anlegen“. Fehlauslegung: Die Grenze gilt für Aktionen der Workforce selbst, nicht für Produkte, die sie baut und die Stefan später bedient.
Fundstelle: `docs/projekt/kontext/beschreibung.md`, Jarvis-Rolle/Lagebild.
Auswirkung: Mittel — Stefan bekommt beim Kernanwendungsfall (neues Produkt) ein „Nein“.
Maßnahme (B5a): (1) beschreibung.md/Lagebild klarstellen: „Die Workforce baut eigene Produkte in eigenen Projekten; die Grenze ‚keine autonomen externen Aktionen‘ gilt für die Workforce selbst, nicht für gebaute Produkte, die Stefan bedient“; (2) Jarvis-Standardantwort auf Produktideen: „Neues Produkt anlegen → Product Coach“; (3) Rechte- und Kostenfragen als Hinweis, nicht als Ablehnung.
Status: offen.
Feature/Run: Challenger 12.10.2026 (claude/594).
Zugeordnet: F45 B5a.

**F-1078** · `TECH_DEBT` · P3 · offen
Titel: npm-Pakete mit verschachtelten Abhängigkeiten sind nach Variante C nicht installierbar (Challenger K35).
Beschreibung: Seit F45 F-2b-2b (F-1075 Variante C) lehnen Prüflauf und Installation jedes Paket mit `node_modules/<paket>/node_modules` ab (422) — das trifft bundleDependencies, `package/node_modules` im Tarball und echte Versionskonflikte direkter Abhängigkeiten. Ebenso abgelehnt: Abhängigkeiten außerhalb der Registry (git/file/link, Advisor F4). Hinweis (Advisor F1): `install-strategy=linked|nested` oder `package-lock=false` in `~/.npmrc` bzw. `npm_config_*` macht jede npm-Installation dauerhaft fail-closed (422 mit unklarem Grund); die Argumente bleiben nach Auftrag „genau“ ohne feste `--install-strategy`/`--package-lock`.
Fundstelle: `src/ressourcen/installation.ts` (pruefeNpmInstallation, installiereNpmPaketInOrdner).
Auswirkung: Gering — context7-mcp 4.3.0 ist nicht betroffen (Nachweis `features/F45/nachweise/f2b2b/`); betroffen sind nur Pakete mit solchen Strukturen.
Maßnahme: bei Bedarf verschachtelte Ordner nur zulassen, wenn jeder genau einem Lockfile-Eintrag ohne `inBundle` entspricht UND sein Inhalt gegen dessen eigenen Tarball geprüft ist; ggf. `--install-strategy=hoisted --package-lock=true` fest in die Argumente (Entscheidung Stefan).
Status: offen.
Nachtrag (Prüfpass F-2b-2b, 13.10.2026): (a) gebündelte Lockfile-Einträge (`inBundle`) und Abhängigkeiten, die nicht als https-Tarball mit Integrity aufgelöst sind, enden ausdrücklich in 422 (eigener Grund); eine https-Tarball-URL außerhalb der Registry (z. B. codeload.github.com) geht dagegen durch — die Prüfung heißt deshalb „https-Tarball mit Integrity“, nicht „Registry“ (QA 8). (b) Ein Prüfbericht, dessen Prüflauf Dateien übersprungen hat (binär, über 1 MB, abgelehnter Pfad), kann GEEIGNET lauten — „Installieren“ ist dann aktiv, die Installation endet aber nach einem vollen npm install sicher in 422 „… (nicht geprüft)“, ohne zu sagen, dass die Datei im Prüflauf übersprungen wurde (QA 1, mittel). Maßnahme: beim Vorbereiten eine Prüfbericht-Sperre „Prüflauf hat N Dateien übersprungen — nicht installierbar“ bzw. den Grund des Abgleichs um „im Prüflauf übersprungen (binär)“ ergänzen. (c) Ein Abbruch während `npm install` im Prüflauf wartet bis zur Zeitgrenze (jetzt 300 s statt 120 s für `npm pack`) — siehe F-1074 (1) (QA 6). (d) Die Grenze von 10 000 Einträgen im Paketordner ist nicht durch einen Test belegt (QA 4b).
Feature/Run: F45 F-2b-2b, 13.10.2026 (Auftrag K35, Advisor F1/F4, qa).

Nachtrag (F45 F-2b-2c, 13.10.2026): (b) erledigt — `waehleBericht` (`uebersprungenSperre`, `src/sammlung/pruefbericht.ts`) sperrt bei einem Bericht, dessen Prüflauf Dateien im installierten Pfad übersprungen hat (jeder Grund; Bericht über einen höheren git-Pfad: nur Einträge darunter, bei gekürzter Liste alle; fehlende Angabe → Sperre): „Prüflauf hat N Dateien übersprungen (…) — nicht installierbar (F-1078)“ — Knopf deaktiviert, Grund im Freigabedialog, Installation 409 (npm und Skills). Der Inhalts-Abgleich nennt solche Pfade „im Prüflauf übersprungen (<grund>)“. Grenzfall (Advisor C3): ein neuerer Bericht über einen höheren Pfad mit gekürzter Liste sperrt auch dann, wenn ein älterer exakter Bericht ohne Übersprungenes existiert — Abhilfe: den exakten Pfad erneut prüfen. Binärdateien → F-1080 (K37). Offen: (a) Hinweis, (c), (d).

**F-1079** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Challenger-Terminalblock ohne cd und mit „git switch main“ (Challenger K36).
Beschreibung: Der Terminalblock der Challenger-Übergabe (12.10.2026) begann ohne `cd` und mit `git switch main`. Stefans Terminal stand nicht im Repo, alle Befehle schlugen fehl.
Fundstelle: Challenger-Übergaben (Terminal-Blöcke).
Auswirkung: Gering — Befehle scheitern; im schlechteren Fall laufen sie im falschen Ordner.
Maßnahme: Jeder Terminal-Block beginnt mit `cd C:\Users\stefa\Projekte\ai-workforce`. Ein neuer Branch entsteht nur mit `git fetch origin; git switch -c <branch> --no-track origin/main`. Diese Regel kommt als Pflichtkopf in jede Challenger-Übergabe.
Status: offen.
Feature/Run: Challenger F45 F-2b-2b (Auftrag F-2b-2c, 13.10.2026).

**F-1080** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Binärdateien machen eine Fähigkeit nach F-1078 (b) nicht installierbar (Challenger K37).
Beschreibung: Seit F45 F-2b-2c sperrt ein Prüfbericht mit übersprungenen Dateien „Freigeben & installieren“. Binärdateien (Bilder, wasm) überspringt der Prüflauf immer — eine Fähigkeit mit solchen Dateien ist damit nie installierbar.
Fundstelle: `src/sammlung/quelle.ts` (Filter binär), `src/sammlung/pruefbericht.ts` (uebersprungenSperre).
Auswirkung: Gering — betrifft nur Fähigkeiten mit Binärdateien; fail-closed.
Maßnahme (bei Bedarf, Entscheidung Stefan): Binärdateien im Prüflauf nur mit sha256 in die Dateiliste aufnehmen. Das Modell liest sie nicht; der Bericht nennt sie als Fakt „N Binärdateien nicht inhaltlich geprüft“. Danach installierbar.
Status: offen.
Feature/Run: Challenger F45 F-2b-2c (13.10.2026).

**F-1081** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 F-2b-2c (Vormerken aus der Sammlung, „Eignung prüfen“ in der Capability Library).
Beschreibung: (1) Zuordnung: Haben mehrere Sammlungszeilen denselben Repo-Link wie die Ref-URL eines vorgemerkten Skills, werden alle „mehrdeutig“; bei einer Nachbarzeile ohne Katalog verschwindet „Vormerken“ dann ohne Hinweis (QA M4; Gate (j) prüft nur eine Zeile). (2) Doppeltes Vormerken: Der Zustand „vorgemerkt“ lebt nur im Speicher — nach einem Neuladen erscheint „Vormerken“ wieder, solange der erste Auftrag nicht ausgeführt ist; eine id-Kollision mit einem anders benannten Katalogeintrag hat keinen Hinweis wie der Scout (QA M5; beides endet erst bei der Ausführung). (3) Ein Projektwechsel genau zwischen Anlegen und Routen schickt das Routen unter das neue Präfix (Muster F-957; QA G1, Code-Review 6). (4) Das Pfad-Feld im Library-Ablauf ist frei; ein Geschwisterpfad erzeugt einen Bericht, der für den Katalogeintrag nicht gilt (QA G3). (5) Keine Unit-Tests für views/pruefung-ablauf.js, vormerken-ablauf.js und merkeVor (DOM/Fetch; belegt nur im Render-Nachweis; QA G4). (6) Sperrgründe des Servers bleiben in en/ru/tr deutsch (Muster F-1068 (2); QA G5, design-guardian 4). (7) Die Bestätigung „Eignung prüfen“ steht unter „Installieren/Abbrechen“ statt direkt unter dem Sperrblock (design-guardian 5). (8) Der Startabbruch eines Laufs bei Quelle „unbekannt“ nutzt den allgemeinen Text FREMD_UNBESTAETIGT („außerhalb geändert“). (9) Die Jarvis-Blase verdeckt bei 1440 px die Spalte „Link“ der Sammlung (design-guardian 9, nicht durch F-2b-2c). (10) Bestätigungsprüfung design-guardian: im gesperrten Freigabedialog der Capability Library stehen „Prüfen & freigeben“ und „Eignung prüfen“ zugleich als Hauptknopf, dazu „Installieren“ deaktiviert im Primärstil (Checkliste 13, mittel); (11) die Sperrtexte des Servers enden mit „— erst/erneut die Eignung prüfen“ direkt vor dem gleichnamigen Knopf, und „(F-1078)“ steht noch im Sperrtext der übersprungenen Dateien (gering).
Fundstelle: `src/sammlung/index.ts` (ordneZu), `public/leitstand/views/sammlung.js`, `public/leitstand/vormerken-ablauf.js`, `public/leitstand/views/capability-library.js`, `public/leitstand/pruefung-anzeige.js`, `scripts/leitstand/routen-faehigkeiten.mjs`.
Auswirkung: Gering — jeweils fail-closed (die Ausführung bzw. Installation lehnt ab) oder reine Darstellung.
Maßnahme: (1) Gate (j) mit zweiter Zeile desselben Repos, bei „mehrdeutig“ Hinweis statt Leere; (2) Kollisionshinweis gegen die Katalog-ids, offener Auftrag „Vormerken: <name>“ als Sperre; (3) fest `/api/auftraege` für das Vormerken aus der Sammlung; (4) Pfad-Feld bei katalog_id ausblenden; (5) kleine Tests mit Fetch-Attrappe; (6) Codes statt Text (Muster F-1016); (7) Platz .library-eignung in den Sperrblock; (8) eigener Text für „unbekannt“; (10) gesperrter „Installieren“ ohne primary, „Prüfen & freigeben“ nachrangig, solange der Dialog offen ist; (11) Sperrtexte nur mit dem Sachgrund (mit (6)).
Status: offen.
Feature/Run: Entdeckt: F45 F-2b-2c (code-reviewer, qa, design-guardian), 13.10.2026.

**F-1082** · `TECH_DEBT` · P3 · teilweise
Titel: Restpunkte von F45 B2a-1 (Projektkarte).
Beschreibung: (1) Roadmap/Vision und Lagebild (F-936) stehen nicht in der Projektkarte — Größe; jarvis/router bekommen sie weiter. (2) „Feature-Akte“ in der Karte ist immer „kein Feature-Bezug“, weil Auftrag v0 keinen Bezug trägt (→ B2a-2). (3) Urteil je DoD-/Checklisten-Punkt nur im Befund-Format (Präfix, Zählzeile in `empfehlung`), nicht strukturiert (→ B2a-3, Review-Schema v2). (4) Ob die Ausführung ARCHITECTURE.md liest, ist nur über die CLAUDE.md-Pflichtlektüre gedeckt; einen qa-Schritt mit Karte gibt es erst mit B2b (F-931). (5) „Im Projekt eingeschaltete Fähigkeiten“ ist der Stand der Seite Workforce im Projektordner, nicht der beim Bau eingefrorene F-1-Satz (der entsteht erst mit der Empfehlung am Ausführungsstart); die Karte sagt das. (6) Die Größengrenzen je Rolle (24 000 / 20 000 / 20 000 Zeichen nach der Korrekturrunde) sind geschätzt; die Karte dieses Repos für den Architekten hatte im echten Lauf 15 614 Zeichen. (7) Entscheidung Stefan (QA L3): der Code-Reviewer liest seinen Prüfmaßstab (ARCHITECTURE.md, DoD, ADRs, Checkliste) aus dem Arbeitsordner, also nach dem Bau — die Ausführung könnte ihn abschwächen, ohne dass die Karte das zeigt; keine der Dateien steht in `STANDARD_PRUEFKETTEN_MUSTER`. Optionen: Maßstab aus dem Basis-Commit lesen, oder in der Karte „im Lauf geändert“ markieren (Abgleich mit der Änderungsübersicht); im Projektmodus ist eine geänderte ARCHITECTURE.md gewollt. (8) Ungetestet: Karte bei Workflow mit eigenem Arbeitsordner (QA L6; liest aus `laufWurzel`), Weitergabe Controller → Claude-Gateway (QA L10; Codex-Weg durch den echten Lauf belegt). (9) Was die Gesamtkürzung am Ende des Bestands abschneidet (z. B. Teile der Ordnerübersicht), trägt keinen eigenen Quellstand — der Hash kann dort eine Änderung verpassen (Code-Review 4, Rest; Dateien mit Quellstand: Beschreibung, ARCHITECTURE.md, ADRs, Checkliste). (10) Die Pflichtregel (Regel 1h) erkennt nur die Skelett-Titel „Ordnerstruktur“/„Datenzugriff“; eine gefüllte Datei mit anderen Titeln zeigt ihren Auszug, hält aber nach einer Stack-Entscheidung an (O2, bewusst).
Fundstelle: `src/projektkarte/index.ts`, `scripts/leitstand-server.mjs` (`leseProjektkarteEingaben`).
Auswirkung: Gering bis mittel — jeweils benannt und in der Karte sichtbar, kein stiller Verlust.
Maßnahme: (2) mit B2a-2, (3) mit B2a-3, (4) mit B2b; (1)/(6) nach dem Referenzauftrag R messen (Verbrauch je Rolle, F-930); (7) Entscheidung Stefan; (8) Testfälle im Gate f45-b2a1 nachziehen; (9) Quellstand der Ordnerübersicht; (10) bei Bedarf Titelliste je Sprache.
Status: teilweise (F45 B2a-2, 13.10.2026): (2) erledigt — die Karte nennt bei Feature-Bezug `features/<feature_ref>/feature.md`. (7) erledigt (Challenger 13.10.2026: Maßstab vor dem Bau) — die Review-Karte liest CLAUDE.md (DoD) und ARCHITECTURE.md per `git show` aus dem Basis-Commit (Arbeitsordner; ohne Arbeitsordner `workflow.basis_commit` = HEAD beim ersten Schrittstart), zeigt „Prüfmaßstab im Bau geändert: <Datei> — die Änderung ist Teil des Reviews“ und vermerkt einen nicht lesbaren Vorher-Stand als Lücke in `fehlend`; ADRs und Checkliste bleiben im Stand nach dem Bau (F-1083 (4)). Übrige Punkte offen.
Feature/Run: Entdeckt: F45 B2a-1 (Plan, Advisor-Pass, echter Lauf, code-reviewer, qa), 13.10.2026.

**F-1083** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2a-2 (Arbeitspaket).
Beschreibung: (1) `bereiche` und `risiko` stehen im Auftrag und im Arbeitspaket-Block, aber niemand setzt sie (kein Formularfeld, kein Architekt-Feld, keine Kopplung an die Kontrolltiefe des Routers). (2) F-989: ein freier Auftrag oder Chat ohne bekannten Feature-Bezug bleibt „Ablauf ohne Feature“. (3) Woher eine Einrichtungsliste stammt (lauf_id des Architekten), ist im Auftrag nicht nachvollziehbar — die Auftragsversion zitiert den Lauf nicht (`eingaben: []`). (4) Das Review liest ADRs und die Checkliste weiter im Stand nach dem Bau; die Checkliste ist über den Schreibschutz für `.claude/**` gedeckt, die ADRs nicht. (5) Der AK-Entwurf entsteht nur aus der Maßnahme (ein Kriterium); Nicht-Ziele lassen sich im Click-to-Work nicht angeben. (6) Was Stefan im Projektordner einrichtet (z. B. eine ungetrackte `.env`), fehlt im Arbeitsordner des Baus; der Leitstand sagt nur, es müsse für den Bau erreichbar sein (Regel mit F-1072/B2b). (7) Ist das Ergebnis des Architekten beim Ausführungsstart nicht mehr lesbar (Rohstrom fehlt), wird der Bau bis zu einem Replan abgelehnt (bewusst: nie ohne Liste, Advisor H1). (8) Entscheidungen im Bau zur Bestätigung (Plan v2 E1–E4): Formblock der Architekt-Instruktion um `einrichtung` ergänzt; „bitgenau“ gilt für Ausführungs- und Review-Auftrag ohne Projektkarte; AK im POST-Formular nur mit Herkunft `finding`; `feature_ref` nur bei bekanntem Feature-Bezug. (9) Prüfpass-Reste: „während des Baus“-Schritte lassen sich während eines laufenden Baus nicht abhaken (Laufsperre); Gate ohne Fälle für Arbeitsordner, Altbestand ohne `basis_commit` über HTTP, Replan mit geänderter Liste, Laufsperre beim Abhaken und claude-code-Review bitgenau; die Einrichtungs-Prüfung kann vor späteren Ablehnungsgründen eine (idempotente) Auftragsversion schreiben; bis zu fünf synchrone git-Aufrufe beim Review-Start; ein Sprachwechsel im Entwurf verwirft getippten Text; die Meldung nach dem Abhaken steht weit vom Knopf (Bestand); ohne eigenen Test (QA-Nachpass): 409 von …/einrichtung nach ABGESCHLOSSEN/GESTOPPT, 400 bei unbekannten Feldern, Trim im Architekt-Validator, Entwurf bleibt nach Anlegefehler, Rotfall „kein basis_commit bei spätem Start/Altbestand“.
Fundstelle: `src/auftrag/index.ts`, `scripts/leitstand-server.mjs` (`gleicheEinrichtungAb`, `pruefeEinrichtungVorBau`, `leseVorherStand`), `public/leitstand/views/workboard.js`.
Auswirkung: Gering bis mittel — jeweils benannt, kein stiller Verlust.
Maßnahme: (1) mit B2b (Kontrolltiefe/Budget je Arbeitspaket) oder B5a; (2) mit B5a (Akte im Leitstand); (3) Feld `einrichtung_quelle` oder Lineage-Eingabe, wenn nötig; (4) mit B2a-3 (Review-Spec); (5) nach dem Referenzauftrag R; (6) mit F-1072 (B3; E-B2b-1 = A, 14.10.2026); (7) beobachten; (8) Challenger bestätigt oder ändert; (9) nach Bedarf, Gate-Fälle mit B2a-3.
Status: offen. Nachtrag F45 B2b-3d (16.10.2026): (1) teilweise — `bereiche` haben einen Setzer (Feld „Vereinbarte Bereiche“ in „Auftrag & Start“, POST /api/auftraege) und wirken im Umfangs-Abgleich (F-978); `risiko` bleibt ohne Setzer, Click-to-Work am Finding bekommt das Feld nicht (F-1123 (1)).
Feature/Run: Entdeckt: F45 B2a-2 (Plan, Advisor-Pass und Nachpass, code-reviewer, qa, design-guardian), 13.10.2026.

**F-1085** · `TECH_DEBT` · P3 · teilweise
Titel: Restpunkte von F45 B2a-3a (Codex-Review-Spec + Ausgaberegel).
Beschreibung: (1) Nach einem Halt (Regel 1k, Werkzeugausfall) lässt sich der Review nicht allein wiederholen — Regel 3 startet keinen Schritt mit gesetzter lauf_id; der Weg ist „Anpassung wünschen“ (Neubau) oder „Ablehnen“. (2) Ein Claude-Reviewer im Ablauf hat kein Ausgabeschema (Regel 4b): die Abnahme meldet „keinen Post-Build-Review-Schritt“, seine Kontextlücken und sein Ergebnis erscheinen dort nicht. (3) Automatik und Korrekturschleife geben je Befund nur Schwere, Fundstelle, Zusammenfassung weiter — nicht `korrekturrichtung`, `evidenz`, `id` (Spec §10 „an Claude übergeben“). (4) KRITISCH/HOCH bei Urteil BEREIT löst keinen Hinweis aus (Spec §8). (5) Jarvis wechselt mit `cd` immer in den Projektordner, nie in den Arbeitsordner eines Ablaufs (Advisor L8). (6) Gate f45-b2a3: kein HTTP-Fall für die Projektion nach ANPASSUNG/zweitem Review-Lauf; Rotfälle der HTTP-Prüfungen (e) nur als Gegenprobe (e4). (7) Echter Codex-Lauf mit Schema v2: erledigt 13.10.2026 — Nachweis `features/F45/nachweise/b2a3/codex-review-lauf.md` (Lauf `0960f9cc-7d6d-4fe9-a37e-843daded8dd8`, codex/`gpt-6-astra`, Vorlage standard; Schema angenommen, v2-Felder gefüllt, review.policy_version in der Laufakte); der Fall „leere Befunde mit Pflichtsatz“ trat im echten Lauf nicht ein. (8) Servertexte der Hinweise (Vertragsverstöße, Kontextlücken) sind deutsch und nennen Feldnamen ('empfehlung', 'korrekturrichtung'). (9) „Kritisch“ und „Hoch“ teilen die Fehlerfarbe. (10) F-1083 (4) (ADRs des Reviews im Stand nach dem Bau) blieb offen. (11) Echter Codex-Lauf (Nachweis features/F45/nachweise/b2a3/codex-review-lauf.md, Befund B1): `pruefeReviewErgebnis` meldet leere `fundstelle`, `zusammenfassung` und `beleg` nicht — nur die vier neuen Felder werden geprüft.
Fundstelle: `src/workflow/index.ts` (Regel 3), `scripts/leitstand-server.mjs` (`findeReviewSchritt`, GET …/abnahme, Jarvis-Aufrufe), `scripts/leitstand/f35-ws3-adjust-automatik.mjs`, `src/korrekturschleife`, `scripts/check-f45-b2a3-codex-review.mjs`.
Auswirkung: Gering bis mittel — jeweils sichtbar benannt, kein stilles BEREIT.
Maßnahme: (1) Entscheidung Stefan: „Review wiederholen“ als eigener Weg (B2b, Rückweg ≤ 1 je Stufe); (2) mit B2b (Prüfschritte der Kette); (3)/(4) mit B2b (§8 Status strittiger Befunde); (5) mit B2a-3b (Befehlsblöcke) oder B2b; (6)/(7) mit B2a-3b bzw. R; (8)/(9) beim UX-Durchgang nach F30; (10) mit B2a-3b; (11) mit B2a-3b (Hinweis wie bei den neuen Feldern, Regressionstest).
Status: teilweise (F45 B2a-3b, 13.10.2026): (6) erledigt — Gate `scripts/check-f45-b2a3b-review-stand.mjs` (e6): nach ANPASSUNG_ANGEFORDERT und zweitem Bau folgt die Projektion dem neuesten Review-Lauf (laufId, Befund, `geprueft_stand`); (7) erledigt — Nachweis `features/F45/nachweise/b2a3/codex-review-lauf.md`; (11) erledigt — `pruefeReviewErgebnis` meldet leere/fehlende `fundstelle`, `zusammenfassung`, `beleg` als Hinweis ohne Halt (gleiche Policy-Version: der Vertrag verlangte die Felder schon), Regressionstest in `src/review-policy`. Nachtrag F45 B2b-1a (14.10.2026): (1) erledigt — „Prüfer wiederholen“ (POST `/api/workflows/<id>/pruefer-wiederholen`, Vorbedingung `pruefschrittWiederholbar`): nach Werkzeugausfall, unlesbarem Ergebnis oder Regel 1k bei tragendem Urteil setzt eine neue Workflow-Version nur den Prüfschritt zurück (zählt nicht als Rückweg, startet nichts); der Leitstand bietet „Review wiederholen“ in der roten Review-Notiz an und startet danach über POST …/starten; für den Advisor gilt dieselbe Route (Entscheidung Stefan B4), Weiter über die Freigabe; Gate `scripts/check-f45-b2b1-rueckweg.mjs` (e)/(e2)/(e3), Render-Nachweis `features/F45/nachweise/b2b1/`. Offen: (2)(3)(4) → B2b-2; (5)(10) → B2b-4; (8)(9) → UX-Durchgang nach F30. Nachtrag F45 B2b-2a (15.10.2026, `features/F45/plan-b2b2a.md`): (2) erledigt — Spike mit echtem Lauf der Claude-Code-CLI 2.1.300 (`--json-schema` aus `baueClaudeJsonSchema`, Prompt über stdin; `features/F45/nachweise/b2b2a/spike-reviewer-schema.md`, Rohstrom geschwärzt): Schema real durchgesetzt; `ergebnis-code-reviewer` in `CLAUDE_CODE_AUSGABESCHEMAS` (Regel 4b); findeReviewSchritt, Regel 1b/1i/1k, Automatik, Abnahme-Projektion und „Review wiederholen“ gelten für einen claude-code-Reviewer genauso, die Kachel „Review“ nennt „Claude“ (worker aus der Laufakte); Vorlagen bleiben bei Codex. (3) erledigt — Neubau und Re-Review bekommen je Befund Befund-ID, Evidenz und Korrekturrichtung (`baueBefundZusatzzeilen`, `src/korrekturschleife`); ohne die Felder bitgleich (Golden-Tests); die Begründung der Automatik bleibt bewusst unverändert (Entscheidung Stefan A1 = a: sonst stünden die Felder im Neubau zweimal). (4) erledigt — Urteil BEREIT mit KRITISCH/HOCH ⇒ amber Hinweis in der Abnahme (`zaehleSchwereBeiBereit`, GET …/abnahme `schwere_bei_bereit` nur bei offener Abnahme, Badge amber), kein Halt, kein Neubau. Gate `scripts/check-f45-b2b2-pruefer.mjs`, Render-Nachweis `features/F45/nachweise/b2b2a/`. Rest: F-1113, F-1114. Offen bleiben (5)(10) → B2b-4, (8)(9) → UX-Durchgang nach F30.
Feature/Run: Entdeckt: F45 B2a-3a (Advisor-Pass, code-reviewer, qa, design-guardian), 13.10.2026.

**F-1086** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Geändertes Codex-Ausgabeschema erst nach echtem Codex-Lauf mergen; Nachweis-Commits vor dem Merge auf dem Remote-Branch prüfen.
Beschreibung: B2a-3a wurde gemergt, bevor der Nachweis des echten Codex-Laufs mit Schema v2 (Merge-Bedingung des Challengers) auf dem Remote-Branch lag: die Nachweisdateien (`features/F45/nachweise/b2a3/codex-review-lauf.*`) und die Registeränderung lagen ungesichert im Arbeitsbaum, der lokale Commit `f912773` enthielt sie nicht. Nachgezogen in B2a-3b. Hintergrund F-638: ein statisch passendes Schema wurde von Codex real abgelehnt — nur ein echter Lauf belegt die Annahme.
Fundstelle: Ablauf der Merge-Freigabe (Skill `git-flow`, Challenger), `features/F45/nachweise/b2a3/`.
Auswirkung: Mittel — ein Merge ohne Beleg der Merge-Bedingung; der Nachweis wäre beim Aufräumen des Arbeitsbaums verloren gegangen.
Maßnahme: (1) Änderung an einem Codex-Ausgabeschema (`schemas/ergebnis-*.schema.json` mit `--output-schema`) erst nach einem echten Codex-Lauf mergen, Nachweis im Branch; (2) vor dem Merge `git log origin/main..origin/<branch>` und `git status --short -- features/<F>/nachweise state` prüfen — ungesicherte Nachweise blockieren den Merge. Aufnahme in Skill/Checkliste der Merge-Freigabe durch Stefan (`.claude/**` ist für Bausitzungen gesperrt).
Status: offen.
Feature/Run: Entdeckt: F45 B2a-3b (Nachzug Nachweis B2a-3a), 13.10.2026.

**F-1087** · `TECH_DEBT` · P2 · offen
Titel: Workboard-„Sichern“ zeigt nach einem Ablauf im Arbeitsordner die Änderungen des Projektordners statt des Worktrees.
Beschreibung: Der Block „Sichern“ im Workboard (Phase „abgeschlossen“) und in #/code liest GET /api/code, und die Code-Projektion (`baueCodeProjektion({ repoWurzel })`) liest immer den Projektordner. Lief der Ablauf in seinem eigenen Arbeitsordner (Worktree, Branch `wf/<id>`, E-F45-3 = A), stehen die Änderungen dort — der Block nennt dann die Dateien, den Branch und den `cd`-Pfad des Projektordners, nicht des Ablaufs.
Fundstelle: `public/leitstand/views/workboard.js` (`renderTerminalBlock`), `scripts/leitstand/routen-code.mjs` (`baueCodeProjektion`), `scripts/leitstand-server.mjs` (GET /api/code).
Auswirkung: Mittel — die Befehle sind ausführbar, sichern aber das Falsche bzw. nichts; Stefan muss selbst wissen, wo der Ablauf gearbeitet hat.
Maßnahme: Mit B2b („Bereit zum Sichern“): Sichern je Ablauf aus dem Laufort (`ermittleLaufort`), cd auf den Worktree. In B2a-3b bewusst nicht gelöst (Auftrag).
Status: offen. Nachtrag F45 B2b-4a-1 (19.10.2026): Server-Teil gebaut — GET `/api/code` und `/api/code/diff` nehmen `?workflow=<id>` (keine neue Route): Formprüfung vor jedem Dateizugriff (`scripts/leitstand/kennung.mjs`, 400), unbekannt 404, Laufort über `ermittleLaufort` (Arbeitsordner aus dem Kontrollzustand, nie die id als Git-Argument oder cwd), Arbeitsordner nicht bereit ⇒ 409 mit `grund_schluessel` aus `arbeitsordnerGrund` ohne Kennung im Text; ohne Parameter bitgleich; Aufbau je Laufort geteilt (`codeProjektionLaufend` als Map). Gate `scripts/check-f45-b2b4a1-sichern.mjs` (b)–(d). Workboard und Abnahme nutzen den Parameter erst ab B2b-4a-2 (jeder Ablauf mit Arbeitsordner über `?workflow=`), erst dann erledigt.
Feature/Run: Entdeckt: F45 B2a-3b (Plan, Befunde vorab), 13.10.2026.

**F-1088** · `TECH_DEBT` · P3 · teilweise
Titel: Grenzen von „Review veraltet“ und der Befehlsblöcke (F45 B2a-3b).
Beschreibung: (1) Der Fingerabdruck zählt jede unverfolgte, nicht ignorierte Datei außerhalb der Ausnahmen (`istAusnahmePfad`) — legt Stefan nach dem Review z. B. eine Datei in „Claude outputs/“ ab, gilt der Review als veraltet, obwohl sich am Code nichts geändert hat (qa 10; ob `npm run check` Dateien schreibt, ist nicht geprüft). (2) Symlinks: `hash-object` folgt dem Link — eine nur berührte verlinkte Datei kann fälschlich „veraltet“ melden. (3) GET …/abnahme hält den aktuellen Stand je Laufort bis zu 10 s (`standCacheMs`, Last des 2-s-Polls, qa 2) — eine Änderung erscheint mit dieser Verzögerung. (4) Ist der Stand schon beim Review-Start nicht bestimmbar, steht dessen Grund dauerhaft in der Abnahme, auch der Satz „Index veraltet? einmal git status“, der nur für den aktuellen Stand hilft (Code-Review 7). (5) Schlägt die erste Zeile `cd` eines kopierten Blocks fehl, führt PowerShell die folgenden Zeilen im aktuellen Ordner aus (qa 9) — am gefährlichsten im Push-Block: `git push -u origin <branch>` pusht dann das Repo des aktuellen Ordners (z. B. einen anderen Worktree mit gleichem Branchnamen). Beim mehrzeiligen Einfügen läuft jede Zeile einzeln; ein Abbruch wirkt nur, wenn die Folge in derselben Zeile steht (z. B. `Set-Location -LiteralPath '…' -ErrorAction Stop; git push …`, nicht ausprobiert). (6) Servergründe („Review aus einem älteren Lauf …“) bleiben deutsch (wie F-1085 (8)).
Fundstelle: `src/review-stand/index.ts`, `scripts/leitstand-server.mjs` (`vergleicheReviewStand`, `aktuellerStandMitCache`), `public/leitstand/code-daten.js` (`befehlsBloecke`).
Auswirkung: Gering — jeweils ein sichtbarer Hinweis zu viel oder etwas zu spät, nie ein stilles BEREIT.
Maßnahme: (1) Entscheidung Challenger (13.10.2026): „Claude outputs/“ in `.gitignore`, nicht in `istAusnahmePfad`; (2) bei realem Bedarf; (3) beobachten; (4)/(6) beim UX-Durchgang nach F30; (5) mit B2b („Bereit zum Sichern“: cd und Folge in einer Zeile mit Abbruch bei Fehler, mindestens für den Push-Block — vorher in PowerShell ausprobieren).
Status: teilweise — (1) erledigt (F45 B2a-3b, 13.10.2026): `.gitignore` ignoriert `Claude outputs/` (Kommentarblock F-1088); wirkt auf den Fingerabdruck des Reviews (`ls-files --exclude-standard`), den Sichern-Block und die Ausführungsvorbedingung (`git status`). Offen: (2)–(6).
Feature/Run: Entdeckt: F45 B2a-3b (code-reviewer, qa), 13.10.2026.

**F-1090** · `TECH_DEBT` · P2 · teilweise
Titel: Plugins aus Stefans Claude Code laufen in der Workforce nicht (F45 F-3b).
Beschreibung: Entscheidung Stefan 13.10.2026: dieselben Plugins wie in Claude Code. F-3a-1 liest und zeigt den Bestand nur (`src/claude-plugins/`, GET `/api/plugins`); kein Lauf lädt ein Plugin (`init.plugins` bleibt `[]`). Spike `features/F45/nachweise/f3a/spike.md` (CLI 2.1.299): ein per `--plugin-dir` geladenes Plugin bringt alle Bestandteile auf einmal (Skills/Agents/Commands mit Präfix `<plugin>:`, `init.plugins` = `<name>@inline`); seine Hooks laufen ohne Abfrage (SessionStart, UserPromptSubmit, PreToolUse — auch vor einem verweigerten Aufruf); `allowed-tools` eines Commands erweitert den Werkzeugsatz (S1: `gh pr comment` lief über den Command, ohne Command verweigert); `enabledPlugins:false` schaltet auch ein `--plugin-dir`-Plugin ab; der erste Lauf legt `~/.claude/plugins/data/<name>-inline` an (leerer Ordner `spike-plugin-inline` vom Spike liegt noch dort).
Fundstelle: `src/claude-code-gateway/index.ts` (`baueAufruf`, `pruefeInitZeile`), `src/faehigkeiten/start.ts`, `src/claude-plugins/`.
Auswirkung: Mittel — Stefans Plugins (z. B. design-Skills) stehen dem Lauf nicht zur Verfügung.
Maßnahme: F45 F-3b: gepinnte Kopie je Plugin mit Inhalts-Hash (nie Stefans Ordner laden), Freigabe je Plugin; Hook nur nach Freigabe je Hook-Hash; Plugin-MCP nur gepinnt (entfernte/ungepinnte nach E-F36-4 gesperrt); Commands und Skills mit erweiterten Rechten oder externer Wirkung gesperrt (aus der Kopie entfernt oder `allowed-tools` gestrichen, Prüfbericht nennt es); `init.plugins` = Soll und Präfixnamen in den Init-Gate-Mengen; nur Worker claude-code; Datenordner `plugins/data/<name>-inline` im Vorher/Nachher. Schätzung ≈ 1,0–1,25 AT, Advisor-Pass vorab.
Status: teilweise — F45 F-3b-1 (14.10.2026, Plan `features/F45/plan-f3b.md` v2.1): gefilterte, gepinnte Kopie je Plugin (`src/plugin-kopie`: nur `skills/`, `agents/`, `commands/` nach Positivliste, Frontmatter fail-closed, Grenzen des Prüflaufs, Manifest neu; nie Hooks/MCP/LSP — E-F3b-1 = A Hooks nie im Lauf), Ablage `~/.ai-workforce/plugin-kopien/<id>/<hash>` (E-F3b-4), Prüfbericht über die Kopie mit dem bestehenden Prüflauf (Quelle `art: plugin`), Freigabe je Plugin an Hash und Bericht gebunden (Reihenfolge Advisor N1), Rücknahme, Zuordnung je Rolle additiv in der lokalen Datei (nur Ausführung E-F3b-3, Commands nicht E-F3b-5), Drift (veraltet, Kopie verändert, Bericht überholt/fehlt, Quelle fehlt, mehrdeutig), Risiko-Fakten aus Texten; Gate `check-f45-f3b1-freigabe.mjs`. Kein Lauf geändert. Offen: Plugins im Lauf (F45 F-3b-2: Spike-Nachmessung, Lauf-Kopie, `--plugin-dir`, Init-Gate, Hash-Prüfung vor dem Lauf, Instruktion).
Feature/Run: F45 F-3a-1 (Spike), 14.10.2026.
Zugeordnet: F45 F-3b-1 (gebaut), F45 F-3b-2 (Rest).
Nachtrag (F45 F-3b-2, Spike 14.10.2026, `features/F45/nachweise/f3b2/spike.md`, CLI 2.1.299): S3 `allowed-tools` im Skill-Frontmatter erweitert den Werkzeugsatz (gh lief über den Skill, direkt verweigert) — die Regel „Skill mit allowed-tools nicht übernommen“ bleibt die zentrale Sperre; `tools` im Agent-Frontmatter schränkt nur ein (Werkzeug außerhalb `--tools` fehlt, Regel in `tools` gibt keine Freigabe). S4 `init.plugins[].source` = `<manifest-name>@inline`, Präfix = Manifest-`name` (nicht Ordnername), Plugin-Skills auch in `init.slash_commands`. S5 `enabledPlugins["<name>@inline"] = true` + eingebaute false → genau die Lauf-Kopien. S6 `plugins/data/<name>-inline` entsteht nur mit Auslöser (Hooks, MCP, Monitore, `CLAUDE_PLUGIN_DATA` im Text), umlenkbar über `CLAUDE_CODE_PLUGIN_CACHE_DIR` (Variante B, F-1099). git: `Bash(git:*)` hält gegen Skill-Text und gegen `allowed-tools: Bash(git:*)`.
Stand F45 F-3b-2 (14.10.2026, Plan v3/v3.1): gebaut — `src/plugin-lauf` (Prüfung vor jedem Lauf: Freigabe gültig, Quelle = `kopie_hash`, gepinnte Kopie = Bericht, Teile übernommen, Agent-tools im Werkzeugsatz des Schritts, Manifest-Name eindeutig; Lauf-Kopie mit nur den zugeordneten Teilen unter `~/.ai-workforce/plugin-kopien/_lauf/<hash>` aus den geprüften Bytes; Datenordner vorher/nachher), `--plugin-dir` + `enabledPlugins` nur für die Lauf-Kopien, Init-Gate mit Plugin-Soll und Präfixregel, Instruktion `<plugin>:<skill>`, „Anzeige = Start“ über `plugin:`-Kennungen, Laufakte `faehigkeiten_im_lauf` (Quelle `plugin`, `plugins`), Anzeige im Freigabedialog und Lauf-Detail; Kopie lehnt `CLAUDE_PLUGIN_DATA` ab (Grund `plugin_daten`, Variante A). Gate `check-f45-f3b2-lauf.mjs`. Echter Beleg `features/F45/nachweise/f3b2/nachweis.md` (superpowers:systematic-debugging geladen und gezählt; ohne Zuordnung nicht geladen). Grenzen: nur Ausführung mit `schreibend`, Worker Claude Code, angezeigte Freigabe; Hooks/MCP/Commands nie; lesende Rollen und Coach später.

**F-1091** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte F45 F-3a-1 (Plugin-Bestand lesen).
Beschreibung: (1) Eingebaute Plugins kommen nur aus der Referenzliste (`src/faehigkeiten/eingebaut-referenz.json`, CLI 2.1.296: telemetry, plugin-authoring); `~/.claude.json` zeigt zusätzlich `cc-plugin-diff@builtin`, das im `-p`-Lauf (CLI 2.1.299, Spike S0) nicht geladen wird — die Anzeige nennt 2 statt 3, ohne Hinweis auf die Messversion. (2) Ob `enabled` der CLI-Liste bei `scope local` vom Arbeitsordner des Aufrufs abhängt, ist nicht gemessen (superpowers ist in beiden Projekten aus); die Antwort trägt `instanz_pfad` (cwd des Aufrufs) getrennt von `plugins[].projekt_pfad` (Installationsprojekt laut CLI). (3) `.md`-Dateien wie `README.md` in `commands/`/`agents/` zählen als Bestandteil; Hooks im Frontmatter von Skills/Agents liest der Leser nicht. (4) Dieselbe id in mehreren Scopes erscheint als zwei Einträge mit gleicher id. (5) Schreibt ein Plugin zur Laufzeit in den eigenen Ordner (`__pycache__`, `node_modules`), ändert sich der Inhalts-Hash ohne Inhaltsänderung (Driftprüfung in F-3b). (6) Die Skill-Suche hat keine eigene Dateigrenze (nur der Hash und die `.md`-Suche). QA-Nachpass: (7) kein Unit-Test für `maskiereArgs` mit harmlosen Argumenten (`--stdio`, `-y paket@latest`, `--token --verbose`, `--x=wert`); (8) YAML-Kommentare und Blockwerte in `allowed-tools` (`# …`, `>-`) werden als Regeln gelesen; (9) Text vor dem JSON auf stdout macht die ganze Liste zu „kein JSON“ (sichtbar, nicht still); (10) Maskierung nur bekannter Muster (`--key abc` bleibt sichtbar, wie in `geheimnisse-maskieren.mjs` dokumentiert); (11) Leerbestand-Messung (CLI 2.1.299, leerer `CLAUDE_CONFIG_DIR`, `[]`, Exit 0) ohne eigene Rohdatei. Code-Review-Nachpass: (12) `pinVon` nimmt den Wert eines unbekannten Flags als Paket (`npx --api-key X pkg` → `paket = X`), `paket` und der Risiko-Text werden nur einzeln maskiert; (13) fehlende oder verlinkte `skills`-Pfade aus plugin.json werden nicht gemeldet (Agents/Commands schon); (14) ein Link/eine Datei als installPath ergibt den Hash-Grund „Plugin-Ordner fehlt“; (15) offene Klammer in `allowed-tools` verschluckt den Rest; (16) Gate (d) erkennt keine dynamischen Importe; (17) `mdDateien` erkennt Links über Dirent statt lstat; (18) die Antwortform mit `instanz_pfad` ist nur in der Route dokumentiert, nicht in `types.ts`.
Fundstelle: `src/claude-plugins/index.ts`, `scripts/leitstand/routen-plugins.mjs`, `features/F45/nachweise/f3a/spike.md`.
Auswirkung: Gering — Anzeige, kein Lauf betroffen.
Maßnahme: (1)(2) mit F45 F-3a-2 (Anzeige mit Messversion der Referenzliste; Messung `enabled` aus zwei Ordnern — vorher zeigt die Oberfläche `aktiv` bei scope local nicht als Stand dieses Projekts); (3)(4)(6)(7)(8)(9)(11)(13)–(17) bei Bedarf; (12) vor F-3b; (18) mit F-3a-2; (5) mit F-3b (F-1090); (10) bleibt.
Stand F45 F-3a-2 (14.10.2026): (1) erledigt — eingebaute getrennt, Kopf „Referenzliste, gemessen mit <cli_version>“, Hinweis auf weitere eingebaute Plugins neuerer Versionen, Quelle je Eintrag, Lesefehler der Liste mit Grund. (2) erledigt — gemessen (`features/F45/nachweise/f3a2/messung-scope-local.mjs`/`.json`, isolierter `CLAUDE_CONFIG_DIR`, CLI der Messung): `enabled` hängt vom Arbeitsordner ab (aus dem Installationsprojekt `true`, aus anderen Ordnern `false`; `projectEnabled` immer `false`); die Oberfläche zeigt bei scope ≠ user „Je nach Ordner“ und im Detail den Wert „laut Abruf aus <instanz_pfad>“ mit Installationsprojekt und Messhinweis (scope project/unbekannt „nicht gemessen“). (4) in der Anzeige entschärft (Scope und Installationsprojekt unter dem Namen, Auswahl über id+scope+projekt_pfad). (18) erledigt — Typ `PluginAntwort` in `src/claude-plugins/types.ts`. Übrige Punkte unverändert.
Stand F45 F-3b-1 (14.10.2026): (5) entschärft — Drift einer Freigabe misst nur die Projektion der übernommenen Teile (Laufzeitdateien außerhalb der Standardordner ändern sie nicht; im Skill-Ordner zählen sie weiter). (12) bleibt Anzeige: MCP kommt nie in die Kopie, und der Auftrag des Prüflaufs nennt nicht übernommene Teile nur mit Art, Name und Grund-Code (keine Befehle, Argumente, URLs). (3) Hooks im Frontmatter von Skills/Agents sperren die Übernahme (Positivliste).
Status: offen (Rest).
Feature/Run: Entdeckt: F45 F-3a-1 (qa, code-reviewer), 14.10.2026.

**F-1092** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: F-3a-1: Unit-Tests des Lesers nach dem Modul geschrieben, nicht rot→grün.
Beschreibung: In F45 F-3a-1 entstand `src/claude-plugins/index.ts` vor `src/claude-plugins/plugins.test.ts`; die Tests liefen beim ersten Lauf grün, ein Rot-Beleg vor dem Modul fehlt. Rot ist nur über die kalibrierten Rotfälle des Gates `check-f45-f3a-plugins.mjs` belegt (wie F-1084: Reihenfolge hing am Ermessen der bauenden Sitzung).
Fundstelle: `src/claude-plugins/plugins.test.ts`, `features/F45/plan-f3a.md`, Bericht F-3a-1.
Auswirkung: Gering — Tests und Gate-Rotfälle vorhanden; ohne Regel kann ein Test entstehen, der nie rot war.
Maßnahme: Testentwurf (Fälle mit erwartetem Ergebnis) vor dem Modul im Plan festhalten; der Bauauftrag verlangt den roten Lauf vor dem Modul als Beleg.
Status: offen.
Feature/Run: F45 F-3a-1 (Challenger vor dem Commit), 14.10.2026.
Nachtrag (F45 F-3b-1, 14.10.2026): Für die vier Kernmodule Tests zuerst, roter Lauf 12:18 als Beleg (`features/F45/nachweise/f3b1/nachweis.md` §1). Nach dem Modul geschrieben (vermerkt): Routen-Bausteine und Oberfläche — dort ist rot nur über die Rotfälle der Gates belegt.

**F-1093** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte F45 F-3a-2 (Reiter „Plugins aus deinem Claude Code“).
Beschreibung: Aus den Nachpässen (code-reviewer, qa, design-guardian, alle „freigegeben mit Hinweisen“): (1) Das Zeitlimit des Abrufs steht doppelt (`api.js` `PLUGINS_ZEITLIMIT_MS`, `plugins-anzeige.js` `ZEITLIMIT_SEKUNDEN`), ohne Prüfung auf Gleichheit; der Text nennt Claude Code als Ursache, obwohl die Route die CLI schon nach 10 s abbricht (ein Abbruch nach 20 s kommt eher vom Lesen/Hashen oder vom Server). (2) Ob `enabled` bei scope user vom Arbeitsordner abhängt (etwa über `enabledPlugins` in Projekt-Settings), ist nicht gemessen; die Anzeige zeigt „An/Aus“ ohne Ordnerbezug. (3) Bei Teilfehlern zeigt das Detail „Risiken (0) — Keine Treffer der Regeln“ und „Ohne Einträge: …“, als wäre das Plugin sauber (nur das rote Band oben warnt). (4) Der XSS-Test deckt Agents, Hook `typ`/`quelle`, MCP `pin` und `cli_version` nicht mit Nutzlast ab (im Code escaped). (5) Der Render-Nachweis belegt „erneuter Klick lädt nicht“ und „Neu laden bei anderem Register“ nicht im Browser (nur Steuerungstest + Quelltext-Gate); die schwebende Persona-Schaltfläche verdeckt in einigen Ausschnitten Zeilen des Details. (6) Anrede in ru/tr im Plugin-Block gesiezt, Nachbarreiter duzen (Mischung bestand vorher). (7) „F-3b“ stand als interne Kennung im Produkttext (`plugins.hinweisF3b`) — erledigt (Challenger 14.10.2026): Text „Noch nicht im Workforce-Lauf nutzbar — kommt im nächsten Schritt.“, Gate (b) prüft /\bF-\d/ im sichtbaren Text.
Fundstelle: `public/leitstand/plugins-anzeige.js`, `public/leitstand/api.js`, `public/leitstand/plugins-anzeige.test.mjs`, `public/leitstand/i18n/{tr,ru}.js`, `features/F45/nachweise/f3a2/render/erzeuge-nachweis.mjs`.
Auswirkung: Gering — reine Anzeige, kein Lauf betroffen.
Maßnahme: (1)(3)(4)(6) bei Bedarf bzw. mit dem nächsten Eingriff am Reiter; (2) mit F45 F-3b (Spike/Plan; Challenger 14.10.2026): Messung wie `features/F45/nachweise/f3a2/messung-scope-local.mjs` mit scope user + Projekt-Settings; (5) beim nächsten Render-Nachweis (Persona ausblenden, Abrufe zählen); (7) erledigt.
Status: offen (Rest) — (2) geschlossen (F45 F-3b-1, 14.10.2026, Challenger-Empfehlung (5)): maßgeblich für den Workforce-Lauf ist die Workforce-Freigabe, nicht `enabled` in Claude Code; eine Messung für scope user entfällt. (7) erledigt.
Feature/Run: Entdeckt: F45 F-3a-2 (Nachpässe code-reviewer, qa, design-guardian), 14.10.2026.

**F-1094** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte F45 F-3b-1 (Plugins freigeben).
Beschreibung: Aus der Korrekturrunde (code-reviewer, qa, design-guardian): (1) Prüfläufe startet nur die Workforce-Instanz (die Oberfläche zeigt in Projektansichten „Prüfen geht in der Ansicht des Projekts ai-workforce“). Laut Messung `features/F45/nachweise/f3a2/messung-scope-local.json` meldet die CLI-Liste scope local aus jedem Ordner — für scope `project` ist das nicht gemessen; ein solches Plugin wäre in der Workforce-Ansicht nicht prüfbar und erschiene dort gegebenenfalls als „nicht mehr installiert“ (verwaist je Ansicht, QA-Nachpass N5). (2) Doppelter Code: Frontmatter-Positivlisten, `werkzeugName`, `LIZENZ_MUSTER`, Muster der Bericht-Kennung und `vergleicheOrdner` neben `leseInstalliert`; `projiziereKopie` ist lang (≈ 200 Zeilen, Teilung in Skills/Agents/Commands). (3) Jedes GET …/plugins liest die Inhalte aller Plugins (Grenze 25 MB je Plugin) und vergleicht die gespeicherte Kopie — keine Messung gegen das Zeitlimit von 20 s; mehr als 3000 Einträge bzw. 25 MB unter den Standardordnern machen das ganze Plugin nicht kopierbar, auch wenn die Masse in nicht übernommenen Teilen liegt. (4) Fehlertexte der Routen werden roh (escaped) angezeigt; die Plugin-Routen sind ohne Lauf-id, Artefakt-id und Regex, aber Pfade bleiben: der 409 bei geändertem `stand` und das Schreiben der lokalen Datei nennen den Pfad von `faehigkeiten.lokal.json` (`routen-faehigkeiten.mjs`), `fehler.message` von Node (Lesen/Schreiben der Kopie, „nicht bestimmbar“, „unerwartet abgebrochen“) enthält Pfade; der D13-409 des Prüfstarts nennt die Lauf-id. (5) Gate (f) erkennt nur statische Importe; `FELD_ERLAUBT` enthält den ganzen Server (die Startfunktion ist gesondert geprüft). (6) Render-Nachweis ohne „Prüfung läuft“ (die Attrappe ist zu schnell) und mit sichtbarer Persona-Schaltfläche (F-1093 (5)). (7) ru/tr im Plugin-Block gesiezt (F-1093 (6), beibehalten). Nachpässe (nach der einen Korrekturrunde nicht mehr umgesetzt): (8) design-guardian „nicht freigegeben“ wegen Fokus — während einer laufenden Aktion, nach erfolgreichem „Freigeben“ (Knopf dann gesperrt), nach „Freigabe zurücknehmen“ (Knopf weg) und nach dem Entfernen verwaister Einträge fällt der Fokus auf body; dazu: gesperrte Knöpfe bei verwaisten Einträgen ohne Sperrtext/aria-describedby, Freigabe-Zustand im Detail noch unter den Stammdaten, Grund aus `freigabe_sperre` nicht gezeigt, Hauptknopf bleibt neben einer Fehlermeldung hervorgehoben, Sperrhinweis klebt an den Auflagen, kein Render mit reduzierter Bewegung; `setzeFokus` nimmt die erste Meldung im ganzen Container. (9) Code-Review: `pluginWerkzeugsatz` `null` fällt per `??` auf den Werkzeugsatz der eigenen Startvorlage zurück (Hashes wieder je Instanz) — besser `!== undefined`; `plugin.json` ohne Größengrenze gelesen, gezählt wird `lstat`-Größe statt gelesener Bytes; kaputtes `plugin.json` still (Name aus der id); `existsSync` folgt einer ins Leere zeigenden Junction (500 statt 409); Ordner-Links unter agents/commands und Einträge `eintragstyp` nicht bzw. als `link` angezeigt; leeres `LEITSTAND_PLUGIN_KOPIEN_WURZEL` ergäbe das Arbeitsverzeichnis; `berichtUeberholt` optional; Text „neu prüfen und freigeben“ zu streng (erneutes Freigeben reicht bei passendem Bericht). (10) QA: „Erneut prüfen“ bei freigegebenem Plugin setzt die Freigabe auf „Bericht überholt“ ohne Vorwarnung am Knopf; 422 „ohne Skill/Agent“ im Server ungetestet; Steuerungstest prüft nur den Zähler der Generation.
Fundstelle: `src/plugin-kopie/index.ts`, `scripts/leitstand/routen-plugin-freigabe.mjs`, `public/leitstand/plugins-anzeige.js`, `scripts/check-f45-f3b1-freigabe.mjs`, `features/F45/nachweise/f3b1/render/`.
Auswirkung: Gering — Freigabe und Zuordnung wirken im Lauf erst mit F-3b-2; alle Punkte sind sichtbar oder fail-closed.
Maßnahme: (1) mit F-3b-2 entscheiden (Prüflauf je Projektinstanz oder Liste aus dem Projektordner; scope project messen); (2)(3) beim nächsten Eingriff in `src/plugin-kopie`, (3) Messung vor F-3b-2; (4)(5) bei Bedarf; (6) mit dem nächsten Render-Nachweis; (7) bleibt; (8) vor oder mit F-3b-2 als kleiner Nachzug (Stefan entscheidet, ob vor dem Merge); (9) `??`-Fallback vor F-3b-2 (die Lauf-Kopie hängt am selben Werkzeugsatz), Rest beim nächsten Eingriff; (10) bei Bedarf.
Stand (Challenger 14.10.2026, vor dem Merge): (8) erledigt — Fokus während einer Aktion auf dem Statusbereich des Plugins, danach auf der Ergebnis- bzw. Fehlermeldung (bei der Zuordnung auf dem Kästchen), nach dem Entfernen nicht mehr installierter Plugins auf der Liste bzw. dem Kopf des Reiters, nie body (`fokusZiele`, `fokusUndAnsage`); Statusmeldungen über die eine feste Live-Region `#plugins-status` (Entscheidung Challenger); Tests in `plugins-workforce-anzeige.test.mjs`, Render-Folgen `f3b1-tastatur-de-1440` und `f3b1-tastatur-verwaist-de-390`. Nach dem gezielten Nachpass vervollständigt: stilles Neuladen nach einer Aktion (kein Ladezustand, Meldung und Fokus bleiben bis zur neuen Antwort stehen), Fokus und Ansage direkt nach dem Ergebnis; Test mit verzögertem Abruf. Offen (nicht blockierend): Phase „läuft“ ohne Render-Schritt (Attrappe zu schnell; Code und Unit-Test belegen sie); Fokus und Live-Region sagen denselben Text an — mit NVDA in der Abnahme prüfen, ob doppelt vorgelesen wird. Die übrigen Design-Hinweise aus (8) (Sperrtext bei verwaisten Einträgen, Zustand unter den Stammdaten, Grund aus `freigabe_sperre`, Hauptknopf neben Fehlermeldung, Abstand Sperrhinweis, reduzierte Bewegung) bleiben offen. (9) erledigt — `pluginWerkzeugsatz` null gilt als „Werkzeugsatz unbekannt“ (kein Rückfall per `??`, auch die Risiko-Fakten des Bestands nutzen denselben Werkzeugsatz): Fakt „Werkzeugsatz 'schreibend' unbekannt“ je Plugin, keine Bewertung „im Werkzeugsatz“, Agents nicht übernommen; Gate f3b1 (o) mit sechs Rotfällen; Doku der Option (Server, baueProjektHandlerMap) nachgezogen. Offen (nicht blockierend): die Quelltext-Prüfung in (o) kennt nur die heutige Schreibweise — der Laufzeitteil ist der eigentliche Nachweis. Die übrigen Code-Review-Hinweise aus (9) bleiben offen.
Status: offen (Rest).
Feature/Run: Entdeckt: F45 F-3b-1 (code-reviewer, qa, design-guardian), 14.10.2026.

**F-1095** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Arbeitsweise als Ziel der Workforce (Challenger K38).
Beschreibung: Stefan, 14.10.2026: „So wie es aktuell läuft, soll die Workforce laufen.“ Sechs Prinzipien der heutigen Arbeitsweise: (1) kleine Schnitte, „zu groß → teilen“; (2) Plan → Advisor → Plan v2, Bau erst nach freigegebenem Plan; (3) code-reviewer + qa + design-guardian in frischem Kontext, eine Korrekturrunde + Nachpass; (4) unabhängige volle Prüfung vor dem Merge (check, gitleaks, Invarianten); (5) echte Läufe als Beleg; (6) „Deine Schritte“ / direkt ausführbare Befehle. Die Workforce erfüllt (1)–(5) heute nicht durchgängig.
Fundstelle: `docs/projekt/fixpaket-f45.md` (B2b, R), Kette der Workforce (`src/workflow`, Leitstand).
Auswirkung: Mittel — ohne diese Prinzipien arbeitet die Workforce nicht gleichwertig zum heutigen Ablauf.
Maßnahme: Lücken bei (1)–(5) in B2b schließen; die sechs Prinzipien als Prüfliste im Referenzauftrag R.
Status: offen.
Feature/Run: Challenger, Entscheidung Stefan 14.10.2026.
Zugeordnet: F45 B2b, F45 R.

**F-1096** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Form-Empfehlung durch den Architekten (Challenger K39).
Beschreibung: Bei wiederkehrenden Aufgaben empfiehlt der Architekt die Form mit Begründung: deterministisch/wiederholt → Skript/Gate; Urteil/Wissen → Skill; eigene Rolle mit eigenem Kontext → Agent; fremder Dienst/Daten → MCP. Heute fehlt diese Empfehlung; die Form entsteht nach Gefühl.
Fundstelle: Rolle `architekt` (`src/architekt`), Ausgabeschema `ergebnis-architektur`.
Auswirkung: Mittel — falsch gewählte Form (z. B. Skill statt Gate) macht eine Regel unzuverlässig oder teuer.
Maßnahme: mit F-1069 im Baustein „Fähigkeit bauen“ (E-F45-12 = A).
Status: offen.
Feature/Run: Challenger, Entscheidung Stefan 14.10.2026.
Zugeordnet: F45 „Fähigkeit bauen“.

**F-1097** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Sammlung per Liste erweitern (Challenger K40).
Beschreibung: Ein Auftrag ergänzt `docs/harness/kandidaten-2026-09-15.md` aus Stefans Liste (Name, Link, wofür); der Scout darf Lücken recherchieren; Prüfläufe nur für Gewünschtes (≈ 0,45 USD je Prüflauf). Erster Eintrag REA „reverse-engineer-anything“ (Link vor der Aufnahme prüfen, vermutet github.com/morluto/rea), als Skill über git-Pin. Nicht-Ziel in solchen Aufträgen: „Verhalten nachbauen, keinen fremden Code/Assets übernehmen“. Grenzen: MCPs mit fremdem Dienst/API-Schlüssel erst nach B2b; einzelne fremde Agents noch nicht installierbar (Agents aus Plugins ab F-3b); Binärdateien F-1080.
Fundstelle: `docs/harness/kandidaten-2026-09-15.md`, Scout (`src/scout`), Prüflauf (`scripts/leitstand/routen-pruefung.mjs`).
Auswirkung: Gering — die Sammlung wächst heute nur von Hand.
Maßnahme: eigener kleiner Auftrag, parallel zu F-3b-2/B2b möglich.
Status: offen.
Feature/Run: Challenger, Entscheidung Stefan 14.10.2026.

**F-1098** · `TECH_DEBT` · P2 · offen
Titel: Prüflauf (Plugins/Sammlung) ohne Abbrechen und ohne Laufzeitanzeige.
Beschreibung: Sichtprüfung F45 F-3b-1 (Stefan, 14.10.2026): ein gestarteter Prüflauf (Plugin-Kopie bzw. Sammlungseintrag, `starteEignungspruefung`) zeigt nur „Prüfung läuft“ — es gibt keinen Knopf zum Abbrechen und keine Anzeige, wie lange er schon läuft und wann die Zeitgrenze greift. Ein hängender Lauf ist von außen nicht von einem langsamen zu unterscheiden.
Fundstelle: `scripts/leitstand/routen-pruefung.mjs`, `scripts/leitstand/routen-plugin-freigabe.mjs`, `public/leitstand/plugins-anzeige.js`, `public/leitstand/views/sammlung.js`.
Auswirkung: Mittel — Stefan muss bei einem hängenden Prüflauf warten oder den Server beenden.
Maßnahme: Abbrechen mit sauberem Prozessende (bestehender Abbruchweg der Läufe, Temp-Ordner aufgeräumt, kein Bericht), Laufzeit und Zeitgrenze sichtbar. Außerhalb F-3b-2.
Status: offen.
Feature/Run: Sichtprüfung F45 F-3b-1 (Stefan, 14.10.2026), eingetragen mit F45 F-3b-2.

**F-1099** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Plugin-Datenordner je Lauf umlenken (Variante B, `CLAUDE_CODE_PLUGIN_CACHE_DIR`).
Beschreibung: Spike F45 F-3b-2 (`features/F45/nachweise/f3b2/spike.md`, P6b): `CLAUDE_CODE_PLUGIN_CACHE_DIR` ersetzt die ganze Plugin-Wurzel `~/.claude/plugins` — der Datenordner `data/<name>-inline` entsteht dann in einem Lauf-Ordner, `init` unverändert, Anmeldung unberührt; Nebenwirkung: die CLI legt dort `installed_plugins.json` (leer) an; nicht gemessen ist ein Projekt mit `enabledPlugins` eines Marktplatz-Plugins in den Projekt-Settings. Entschieden ist Variante A (Challenger 14.10.2026): die Kopie lehnt `CLAUDE_PLUGIN_DATA` ab, jeder Lauf mit Plugins vergleicht `~/.claude/plugins` vorher/nachher (Befund in der Laufakte, kein Abbruch).
Fundstelle: `src/plugin-lauf/` (Vorher/Nachher), `src/plugin-kopie/index.ts` (Grund `plugin_daten`).
Auswirkung: Gering — mit A entsteht ohne Hooks/MCP kein Datenordner; B wäre die zweite Schicht.
Maßnahme: Auslöser „Vorher/Nachher meldet eine Abweichung“ in einem echten Lauf → B messen (Marktplatz-Fall) und mit Stefan entscheiden.
Status: offen.
Feature/Run: F45 F-3b-2 (Spike), 14.10.2026.

**F-1100** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte F45 F-3b-2 (Plugins im Lauf).
Beschreibung: Aus Prüfpass und Korrekturrunde (code-reviewer, qa, design-guardian, je „freigegeben mit Hinweisen“): (1) Die Freigabe-Anzeige zeigt „läuft mit“, sobald ein Freigabe-Eintrag besteht — auch bei veraltetem Stand; der Abbruch mit Grund kommt erst beim Start (kein CLI-Abruf im Poll, Hinweis im Dialog). (2) Zwei Plugins gleichzeitig nur im Gate belegt, nicht im echten Lauf. (3) Ein Projekt mit eigenem `enabledPlugins` in seinen Projekt-Settings ist ungemessen (bricht sicher am Init-Gate ab, würde aber jede Ausführung mit Plugin blockieren). (4) Ein Ausführungsschritt ohne angezeigte Freigabe (Fortsetzung, automatischer Start) läuft ohne Plugins, ohne dass die Laufakte es nennt (wie alle Katalog-/Projekt-Fähigkeiten, F-1054 (3)). (5) Der Vergleich des Plugin-Datenordners ist global — eine parallele Claude-Code-Sitzung erzeugt einen Befund (Hinweis im Lauf-Detail). (6) Vorbestehend, nicht aus F-3b-2: im Lauf-Detail ist die Zeile „Beobachtung“ in ru/tr teils deutsch (`formatiereBeobachtung`); die schwebende Schaltfläche „Frag Jarvis“ verdeckt bei 390 px und 200 % Inhalt (F-1093 (5)). (7) Läufe ganz ohne Fähigkeiten laden weiterhin die eingebauten Plugins (kein `--settings`, bitgleich zu vorher, F-3a Spike S0b). Nachpass: (8) der Zähler „… und n weitere“ der Datenordner-Abweichungen entsteht im Controller auf Deutsch und erscheint in allen Sprachen roh; (9) `ohnePfade` erkennt POSIX-Pfade nur unter /Users, /home, /root, /tmp, /var; (10) design-guardian (niedrig): Hash-Block der Lauf-Kopien ohne Kopieren-Knopf (anders als die Tabelle), `h5` kleiner als der Fließtext und Datenordner unter „Plugin-Lauf-Kopien“, Chip „nach dem Lauf …“ mit Abstand zur Zeile, Warn-Chip „wirkt nicht“ als ganzer Satz in Versalien.
Fundstelle: `scripts/leitstand-server.mjs` (pluginAnzeige, loeseAusfuehrungsEingabenAuf), `src/plugin-lauf/index.ts`, `public/leitstand/views/lauf-detail.js`, `features/F45/nachweise/f3b2/nachweis.md`.
Auswirkung: Gering — alles fail-closed oder sichtbar.
Maßnahme: (1) bei Bedarf Drift-Stand aus dem letzten GET …/plugins in die Anzeige; (2)(3) mit dem nächsten echten Lauf messen; (4) mit F-1054 (3); (5) bei Fehlalarmen F-1099 (Variante B) entscheiden; (6) eigener Eingriff in die Beobachtungszeile bzw. F-1093 (5); (7) bei Bedarf.
Status: offen.
Feature/Run: Entdeckt: F45 F-3b-2 (code-reviewer, qa, design-guardian), 14.10.2026.

**F-1103** · `TECH_DEBT` · P3 · offen
Titel: Nachweis powershell-eingabe hängt von der Kooperation des Modells ab.
Beschreibung: `features/F45/nachweise/b1b1/powershell-eingabe.mjs` belegt den commit-guard nur, wenn das Modell die Werkzeugaufrufe tatsächlich versucht. Am 14.10.2026 (CLI 2.1.299) lehnte Haiku im ersten Lauf den Auftrag selbst ab (0 Werkzeugaufrufe, `hook_eingaben: []`) — der Hook wurde gar nicht ausgeübt. Das ist ein Scheinbefund ohne Aussage über den Hook; die Wiederholung lief erwartungsgemäß.
Fundstelle: `features/F45/nachweise/b1b1/powershell-eingabe.mjs`, `features/F45/nachweise/b1b1/zaehlung-powershell.json`.
Auswirkung: Gering — eine scheinbare Abweichung kann die Startfreigabe-Erneuerung grundlos anhalten oder eine echte Abweichung verdecken.
Maßnahme: Das Skript meldet „0 Werkzeugaufrufe“ als eigenen Ausgang „nicht ausgeübt“, nicht als Abweichung.
Status: offen.
Feature/Run: Startfreigabe-Erneuerung CLI 2.1.299, Schritt 2 (Branch `f45/startfreigabe-cli-2-1-299`), 14.10.2026.

**F-1104** · `TECH_DEBT` · P3 · offen
Titel: Grenzen von Rückweg-Regel und „Prüfer wiederholen“ (F45 B2b-1a).
Beschreibung: (1) Wiederholungsschlüssel Schwere + Datei: zwei verschiedene Befunde gleicher Schwere in derselben Datei gelten als einer; eine Teilmenge gilt nicht als Wiederholung. (2) Die Wiederholungsregel wirkt praktisch nur nach einer menschlichen Anpassung (nach einer automatischen greift schon die Grenze); ein reiner AK-Fall ohne Befunde ist nie eine Wiederholung. (3) Bestandsabläufe mit 2–3 automatischen Anpassungen aus der Zeit vor B2b-1a zeigen „Rückweg 2“ bzw. „3“ (Zähler `zaehleKernVersionen`, Text bewusst ohne Nenner). (4) Für den Advisor gibt es in 1a nur die Route, keinen eigenen Knopf (weiter über die Freigabe); seine Vorbedingung liest die heutige Regel 1d (Urteilszeile). (5) Der Leitstand braucht zwei Anfragen (zurücksetzen, starten); scheitert der Start (z. B. ein anderer Lauf ist aktiv), steht der Review zurückgesetzt auf LAEUFT, die Meldung (Fehlerstil) nennt den Grund. (6) Ein VERWEIGERT-Review ist nicht wiederholbar. (7) „Prüfer wiederholen“ hat keine Obergrenze — nach einer Zeitgrenze kann Stefan beliebig oft auslösen, jedes Mal ein voller Lauf (menschlich ausgelöst, deshalb bewusst ohne Zählung; qa). Nachpass (code-reviewer, qa; nach der einen Korrekturrunde, nicht mehr behoben): (8) kein Gate-Fall für 409 auf POST …/pruefer-wiederholen bei aktivem Lauf (lokal oder global) — die Sperre ist nur durch Lesen belegt; (9) die Route liefert keinen `grund` — steht der Status nach dem Zurücksetzen weder auf LAEUFT noch auf WARTET_FREIGABE (heute praktisch unerreichbar), zeigt der Leitstand „unbekannt“; (10) der Satz `abnahme.review.weiterWiederholbar` nennt nur Werkzeugausfall/unlesbares Ergebnis, nicht den Fall Regel 1k; (11) `dateipfadAusFundstelle` lässt bei kombinierten Formen wie `src/a.ts:12 (Zeile 12)` die `:12` stehen (sichere Richtung: keine Wiederholung erkannt, die Grenze greift); (12) Kopfkommentar und ein Testtitel in `scripts/leitstand/f35-ws3-adjust-automatik.test.mjs` nennen B2b-1a bzw. „Korrekturrunde“ noch nicht; (13) die Meldung „Review neu gestartet — nur der Review-Schritt läuft erneut …“ bleibt stehen, wenn der Review schon fertig ist.
Fundstelle: `scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`sindDieselbenBefunde`, `pruefschrittWiederholbar`), `scripts/leitstand-server.mjs` (`setzePrueferZurueck`), `public/leitstand/views/workflows.js` (`fuehrePrueferWiederholenAus`).
Auswirkung: Gering — jeweils sichtbar, nie ein stiller Weiterlauf.
Maßnahme: (4) mit B2b-1b (Advisor-Anzeige, Schema statt Urteilszeile); (8)–(13) als kleine Nacharbeit mit B2b-1b (Gate-Fall 409, `grund` in der Antwort, Satz für 1k, Ersetzung in einer Schleife, Kommentare, Meldung „lief erneut“); (1)(2)(3)(5)(6)(7) bei realem Bedarf.
Status: offen. Nachtrag F45 B2b-1b-1 (14.10.2026): erledigt (4) Schema-Teil — die Vorbedingung des Advisors liest Verstöße gegen das Advisor-Schema (`advisorVerstoesse`) statt der Urteilszeile; ein eigener Advisor-Knopf im Leitstand bleibt offen (mit der Advisor-Anzeige in B2b-1b-2b bzw. F-1107; Zuschnitt 14.10.2026, `features/F45/plan-b2b1b2.md` D5); (8) Gate-Fall (e7): 409 bei aktivem Lauf, danach 200; (11) `dateipfadAusFundstelle` schneidet bis zum Festpunkt ab (Test mit kombinierten Formen); (12) Kopfkommentar und Testtitel nennen B2b-1a/„Korrekturrunde“. Prüfpass 1b-1 (code-reviewer 8, qa 1): ein Codex-Advisor mit `ergebnis-architecture-advisor` (Rollenvertrag erlaubt codex, Regel 4b lässt codex mit jedem Schema zu) ist nicht real erprobt — `hoch` nutzt claude-code; vor einem Wechsel echter Codex-Lauf (F-638/F-1086). Der Advisor-Halt nennt „Prüfer wiederholen“, im Leitstand gibt es dafür bis B2b-1b-2b keinen eigenen Knopf (Grund sagt es, Reparatur als Weg). Bewusst offen: (9) `grund` in der Antwort, (10) Satz für Regel 1k, (13) Meldung „lief erneut“ — Texte der Review-Notiz, keine Plan-Stufe/kein Rückweg; gehören zum UX-Durchgang (F-1107); (1)(2)(3)(5)(6)(7) bei realem Bedarf. Nachtrag F45 B2b-1b-2b (15.10.2026): erledigt (4) Leitstand-Knopf „Advisor wiederholen“ — GET /api/workflows/<id> `prueferWiederholbar` (dieselbe Vorbedingung wie POST …/pruefer-wiederholen), rote Notiz über der Timeline, ZWINGEND ⇒ Freigabe des Advisors, AUTOMATISCH ⇒ Start wie beim Review; Regel-1d-Text ohne „(im Leitstand noch ohne eigenen Knopf …)“; Gate f45-b2b1 (c8), Render-Nachweis `features/F45/nachweise/b2b1b2b/` (d-klick-de-1440). Offen bleiben (1)(2)(3)(5)(6)(7) bei realem Bedarf und (9)(10)(13) mit dem UX-Durchgang (F-1107).
Feature/Run: Entdeckt: F45 B2b-1a (Advisor-Pass, Delta-Advisor-Pass, qa, Nachpass code-reviewer/qa), 14.10.2026.

**F-1107** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Abnahme-Seite bei einem Halt am Review: Grund und richtiger Ausweg nicht dort, wo Stefan entscheidet.
Beschreibung: (1) Bei einem Werkzeugausfall des Reviews empfiehlt die gelbe Notiz oben „Der Weg heraus ist eine neue Fassung … [Ablauf reparieren]“, der günstigere Weg „Review wiederholen“ steht rund 650 px tiefer in der roten Review-Notiz (design-guardian 3). (2) Auf der Seite stehen fünf gleich gewichtete Knöpfe (Ablauf reparieren, Ausführung stoppen, Review wiederholen, Anpassung wünschen, Ablehnen), keiner ist als Hauptknopf hervorgehoben (design-guardian 4, schon vorher so). (3) Hält der Ablauf an der Grenze der Korrekturrunden oder wegen derselben Befunde, steht der Grund („Keine weitere automatische Anpassung …“) nur in der Auftragsliste und der Technik-Tabelle, nicht im Block „Ergebnis ablehnen oder Anpassung wünschen“ (qa 4); einen Render-Nachweis dieses Halts gibt es nicht. (4) Ungeprüft: nach einem geheilten Review-Ausfall (lauf_id null, Hinweis „nicht gelaufen“) sagt die rote Notiz „Den Review allein kannst du nicht wiederholen“, während der Ablauf vermutlich „Starten“ anbietet (qa 10). (5) Render-Nachweis B2b-1a ohne Messung des horizontalen Überlaufs (scrollWidth) bei 390 px (design-guardian 7).
Fundstelle: `public/leitstand/views/workflow-abnahme.js` (renderVorab, renderReviewHinweise), `public/leitstand/views/workflow-detail.js` (Halt-Notiz), `features/F45/nachweise/b2b1/`.
Auswirkung: Mittel — Stefan findet den Grund des Halts und den günstigsten Ausweg nicht auf den ersten Blick; nichts läuft still weiter.
Maßnahme: Mit dem UX-Durchgang nach F30 oder B2b-1b (Advisor-Anzeige): Halt-Grund des Reviews im Vorab-Block, oberer Hinweis verweist bei wiederholbarem Review auf „Review wiederholen“, Hauptknopf je Lage festlegen; (4) im Render prüfen; (5) Überlaufmessung in `scripts/render-nachweis.mjs`.
Status: offen. Nachtrag F45 B2b-1b-2b (15.10.2026): (5) Messung nachgetragen — `scripts/render-nachweis.mjs` schreibt bei `ueberlauf` zusätzlich die Spalte `scrollWidth/clientWidth`; im Render-Nachweis `features/F45/nachweise/b2b1b2b/` (Freigabe-Seite mit Plan/Befunden, Advisor-Halt) bei 390 px in allen Folgen 390/390 (de und ru), kein waagerechter Überlauf. Die Abnahme-Seite aus B2b-1a ist damit nicht nachgemessen (Werkzeug steht jetzt bereit).
Feature/Run: Entdeckt: F45 B2b-1a (design-guardian, qa), 14.10.2026.

**F-1109** · `TECH_DEBT` · P3 · offen
Titel: Bestands-hoch und Lineage nach Plan v2.
Beschreibung: (1) Vor B2b-1b-2a angelegte hoch-Abläufe tragen an der Ausführung noch `artefakt:ergebnis-@<advisor>`; im FREIGEGEBEN-Weg bekommt die Ausführung das Advisor-JSON weiterhin (im Rückweg entfernt der Kern die Eingabe, B13). (2) Der Lineage-Vorgänger (`vorgaengerLaufId`) der Ausführung ist nach Plan v2 der Advisor-Lauf, nicht der Plan-v2-Lauf (Vorgänger = Schritt, dessen nachfolger die Ausführung ist).
Fundstelle: `workflow-vorlagen/hoch.json`, `scripts/leitstand-server.mjs` (`gelaufeneVorschritte` in `starteWorkflowSchritt`).
Auswirkung: Niedrig — (1) ein freigegebener Plan ohne Befunde, harmlos; (2) nur die Lineage-Kette, die Eingaben sind richtig.
Maßnahme: Bei realem Bedarf: Bestandsabläufe beim Start der Ausführung angleichen; Lineage-Vorgänger nach Regel 3a bestimmen.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-1b-2a (Plan R1, Advisor-Pass N3), 14.10.2026.

**F-1110** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Plan-Stufe nach Plan v2: veraltete Antworten, kein Weg „Plan v1 behalten“, Bau-Summe nur im Unit-Test.
Beschreibung: (1) Die Zusammenführung der Entscheidungen (`findeWorkflowEntscheidungFuerSchritt`) gibt auch Antworten auf Fragen aus Plan v1 weiter, die Plan v2 nicht mehr stellt; formuliert Plan v2 die Stack-Frage nicht wortgleich, wird sie neu verlangt und `entscheidung-@` trägt danach zwei Stack-Antworten (Erweiterung von O3; Code-Review 6, qa 5). (2) Wer an der Freigabe des Architekten (Plan v2) ablehnt, um Plan v1 zu behalten, landet in GESTOPPT und kommt nur per Reparatur oder neuem Ablauf weiter; `zaehlePlanRueckwege` zählt das Vorhandensein von `rueckweg`, nicht einen gelaufenen Plan v2 — nach einer Reparatur ohne v2-Lauf meldet ein späteres UEBERARBEITEN „Die Plan-Stufe hatte ihre eine automatische Korrekturrunde schon“ (qa 6). (3) Dass ein Plan v2 die Bau-Stufe bei `max_replans 1` sperrt, belegt nur ein Unit-Test, kein Gate-Fall (qa 9). (4) Scheitert der Start des Architekten v2 nach der Freigabe (Plan v1 oder Advisor-Ergebnis nicht lesbar), verpackt die Freigabe-Route den lesbaren Grund in ihre bestehende Hülle mit Schritt- und Ablauf-Kennung, „(konflikt)“ und „über eine korrigierte Fassung erreichbar“ — das widerspricht dem inneren Ausweg „Ablauf neu anlegen“ (eine Reparatur behält den Rückweg und scheitert wieder; qa-Nachpass 1).
Fundstelle: `scripts/leitstand/routen-f39.mjs`, `scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`zaehlePlanRueckwege`), POST …/freigabe (Ablehnen).
Auswirkung: Niedrig — die Instruktion nennt die Antworten bindend; nichts läuft still weiter.
Maßnahme: Mit B2b-1b-2b entscheiden (Stefan): `entscheidung-@` auf Fragen des aktuellen Laufs plus nicht wiederholte filtern oder bewusst annehmen; Option „Plan v1 freigeben“ an der Freigabe des Architekten; Gate-Fall Bau-Summe; Hülle der Freigabe-Route je Startfehler-Art (4).
Status: offen. Nachtrag F45 B2b-1b-2b (15.10.2026): (3) und (4) waren für 2b vorgesehen, sind nach dem Advisor-Pass (Zuschnitt zu groß, Stefans Vorgabe) als **F-1111** herausgenommen und dort offen. (1) und (2) bleiben offen (Auftrag 2b, Stefan): (1) braucht eine Entscheidung, welche Antworten nach Plan v2 noch gelten (Filtern nach den Fragen des aktuellen Laufs würde die Stack-Antwort zu v1 verlieren, wenn v2 sie nicht wortgleich wiederholt); (2) „Plan v1 freigeben“ an der Freigabe des Architekten braucht einen eigenen Weg (Rückweg verwerfen, Regel 3a, Zählung) — bis dahin nennt die Freigabe-Seite den heutigen Weg (ablehnen, neuen Ablauf anlegen). Nachtrag Textkorrektur (15.10.2026, Challenger zum qa-Befund 2b (1)): zu (2) — der Satz auf der Karte „Plan v1 — wird überarbeitet“ nennt die Lage jetzt ehrlich („Plan v1 lässt sich hier nicht unverändert freigeben, weil der Advisor Änderungen verlangt. Mit „Ablehnen“ stoppst du den Ablauf.“); der frühere Satz versprach mit „neuen Ablauf anlegen“ einen Plan v1, den der neue Ablauf nicht liefert. „Plan v1 freigeben“ bleibt offen.
Feature/Run: Entdeckt: F45 B2b-1b-2a (Code-Review, qa), 14.10.2026.

**F-1111** · `TECH_DEBT` · P3 · teilweise
Titel: Aus B2b-1b-2b herausgenommen: Hülle der Freigabe-Route, Gate-Fall Bau-Summe, Schwärzung der Zählungen.
Beschreibung: Der Advisor-Pass zu Plan 2b (15.10.2026, `features/F45/plan-b2b1b2.md`) hielt den Zuschnitt für zu groß; nach Stefans Vorgabe gingen drei Punkte als Finding heraus. (1) F-1110 (4): Scheitert der Start nach der Freigabe (z. B. Plan v2 ohne lesbaren Plan v1), verpackt POST …/freigabe den Grund in „Start nach erteilter Freigabe für Schritt '…' von Workflow '…' fehlgeschlagen (konflikt): … über eine korrigierte Fassung erreichbar“ — beim Plan-v2-Start widerspricht das dem inneren Ausweg „Ablauf neu anlegen“. Advisor A2: derselbe Text (`anlass`) geht in die Startfehlerliste, die Halt-Ablage (`schreibeStartfehlerHalt`) und das Log; die Liste hat kein eigenes Feld für die Workflow-Kennung — ein Satz ohne Kennungen braucht für Liste und Log einen eigenen Text. (2) F-1110 (3): dass ein Plan v2 die Bau-Stufe bei `max_replans` 1 sperrt, belegt nur ein Unit-Test; der Gate-Fall braucht eine Fixture Architekt → Advisor → Ausführung → Review. (3) `features/F45/nachweise/b1b1/zaehlung-*.json` enthalten persönliche Temp-Pfade (Benutzerordner); Schwärzung mit `schwaerze()` aus `features/F45/nachweise/b2b1b/schwaerze.mjs` (Datei als Ganzes, mehrzeiliges JSON), danach `JSON.parse` je Datei. Advisor A6: die Zählungen entstehen bei jeder Startfreigabe-Erneuerung neu (`docs/harness/startfreigabe-erneuern.md`) — die Schwärzung gehört dort als Schritt hinein; `features/F45/nachweise/b1b2/zaehlung-hooks.json` ebenfalls prüfen.
Fundstelle: `scripts/leitstand-server.mjs` (POST …/freigabe, gescheiterter Start; `lesePlanV2Eingaben`), `scripts/check-f45-b2b1-rueckweg.mjs`, `features/F45/nachweise/b1b1/zaehlung-*.json`, `docs/harness/startfreigabe-erneuern.md`.
Auswirkung: Niedrig — (1) irreführender Ausweg in einem seltenen Fehlerfall, (2) eine nur im Unit-Test belegte Regel, (3) persönliche Pfade in Nachweisen im Repo.
Maßnahme: Eigene kleine Iteration: `startfehlerSatz({ grund, ausweg })` je Startfehler-Art (Plan v2 ⇒ „neuen Ablauf anlegen“), Liste/Log mit Kennungen getrennt; Gate-Fall (c15) Bau-Summe; Schwärzung + Schritt in der Startfreigabe-Anleitung.
Status: teilweise ((3) erledigt, siehe Nachtrag am Ende; (1), (2), (4)–(7) offen). Nachtrag Prüfpass 2b (15.10.2026), ebenfalls offen: (4) qa 3 — an der Freigabe des Architekten v2 mit unlesbarem Plan v1 oder Advisor-Ergebnis zeigen die Karten „nicht lesbar“, „Freigeben“ bleibt angeboten und der Start scheitert danach sicher (c10/c10b) mit der Hülle aus (1); ein Hinweis „Plan v2 kann so nicht starten“ gehört zu (1). (5) qa 5/6 — nicht gerendert: Liste „Deine Entscheidungen“ (Render-Projekt hat den Stack gefüllt, keine Frage), Plan/Advisor unlesbar, (c12), Bestand „nicht ausgelöst“ (nur Gate/View-Test); der Zwischenspeicher (Fehler nicht gespeichert, ältester fällt bei 32) hat keinen eigenen Test. Ebenso ohne Test/Render: die Meldung nach „Advisor wiederholen“, wenn der Start erst den Arbeitsordner vorbereitet (Nachpass). (6) Code-Review 2 — ein unlesbarer Plan oder Advisor schreibt bei jedem Poll (2 s) erneut ins Log, weil Fehler bewusst nicht zwischengespeichert werden; dämpfen (je Schlüssel einmal). (7) Code-Review 3 — `wertText` steht dreimal wortgleich (workflow-abnahme.js, harness-abgleich-anzeige.js, workflow-entscheiden.js); bei der nächsten Berührung zusammen mit FARBE_SCHWERE aus einem Modul exportieren. Nachtrag Startfreigabe-Erneuerung CLI 2.1.300 (15.10.2026): (3) erledigt — `features/F45/nachweise/b2b1b/schwaerze.mjs` ersetzt zusätzlich den Temp-Ordner (`os.tmpdir()`, alle Schreibweisen, vor dem Benutzerordner) durch `<TEMP>`, erfasst auch doppelt JSON-escapte Pfade (Werkzeugergebnis in `zaehlung-kontrolle.json` der 2.1.299-Fassung, sonst ungeschwärzt) und rohe Pfade im Klartext, überspringt Basispfade mit weniger als zwei Segmenten und hat den Modus `--json` für ganze JSON-Dateien mit Restprüfung (Name des Benutzerordners als Pfadsegment → Exit 1, Datei unverändert); die NDJSON-Rohströme behandelt es weiter zeilenweise. Unit-Test `schwaerze.test.mjs` (10 Fälle, u. a. zweiter Lauf ohne Wirkung). Alle `b1b1/zaehlung-*.json` und `b1b2/zaehlung-hooks.json` geschwärzt (grep auf Benutzer- und Temp-Pfade leer, JSON gültig; Gegenprobe gegen die HEAD-Fassungen ebenfalls leer). Der Befehl steht als Schritt 2a in `docs/harness/startfreigabe-erneuern.md`. (1), (2), (4)–(7) bleiben offen.
Feature/Run: Entdeckt: F45 B2b-1b-2b (Advisor-Pass A1/A2/A6), 15.10.2026.

**F-1112** · `TECH_DEBT` · P3 · offen
Titel: Schwebender Knopf „Frag Jarvis“ verdeckt bei 200 % Zoom Text der Hauptspalte.
Beschreibung: Im Render-Nachweis B2b-1b-2b (a-de-1440-zoom200) liegt der schwebende Knopf „Frag Jarvis“ über dem Hinweis der Befund-Karte („Diese Befunde gehen an den Architekten.“). Vorbestehend (fester Knopf unten rechts), nicht durch B2b-1b-2b entstanden; bei 200 % ist die Spalte schmal genug, dass Text darunter liegt.
Fundstelle: `features/F45/nachweise/b2b1b2b/render/a-de-1440-zoom200/`, schwebender Jarvis-Knopf (public/leitstand).
Auswirkung: Gering — Text bis zum Bildlauf verdeckt.
Maßnahme: Mit dem UX-Durchgang (F-1107): Abstand am Seitenende oder Knopf bei schmalem Viewport kleiner/einklappbar.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-1b-2b (design-guardian 5), 15.10.2026.

**F-1113** · `TECH_DEBT` · P3 · offen
Titel: Claude-Reviewer mit Schema: Policy-Text überholt, Spike nicht mit dem Produkt-Auftrag.
Beschreibung: (1) Der Text der Review-Policy `review-policy-1` (`src/review-policy/index.ts`, letzter Satz von `baueReviewPolicyBlock`) sagt „Ohne vorgegebenes Ausgabeschema (z. B. als Claude-Reviewer) … maschinell geprüft wird das Format nur beim Codex-Reviewer“. Seit B2b-2a kann ein Claude-Reviewer das Schema per `--json-schema` tragen und wird wie Codex geprüft (Regel 1k). Der Text blieb bewusst bitgleich (Advisor-Pass A4: jede Textänderung braucht eine neue Policy-Version mit eigenem Prüfer und sha-Wert; der Spike lief mit diesem Text). (2) Der Spike (`features/F45/nachweise/b2b2a/spike-reviewer-schema.md`) nutzte eine kurze Rolleninstruktion statt des Produkt-Auftrags (ohne Projektkarte, AK-Block, Beobachtungsblock); `ak_urteile` war leer — ein nicht leeres `ak_urteile` unter `--json-schema` ist nicht belegt (Advisor A10, Code-Review 7, qa 9). Der Lesepfad nutzt nur `result`, nicht `structured_output`; trägt `result` Prosa, endet es sicher (`nicht_lesbar`, Regel 1b, „Review wiederholen“).
Fundstelle: `src/review-policy/index.ts` (`baueReviewPolicyBlock`), `scripts/leitstand-server.mjs` (`leseErgebnistextAusRohstrom`), `features/F45/nachweise/b2b2a/`.
Auswirkung: Gering — die Vorlagen nutzen Codex; der Satz gilt für einen Reviewer ohne Schema weiter, mit Schema ist er nur ungenau. Unbelegtes fängt Regel 1b/1k ab.
Maßnahme: Beim nächsten Policy-Wechsel (neue Version) den Satz auf „ohne Schema“ zuschneiden; beim ersten echten Claude-Review mit AK (spätestens R, F-1050) Rohstrom prüfen: `result` = `structured_output`, `ak_urteile` gefüllt.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-2a (Advisor-Pass A4/A10, code-reviewer 7, qa 9), 15.10.2026.

**F-1114** · `PROCESS_IMPROVEMENT` · P3 · teilweise
Titel: Restpunkte von F45 B2b-2a (Review vollständig).
Beschreibung: (1) qa 5: der Re-Review bekommt die Befund-IDs der Vorfassung, wird aber nicht verpflichtet, „behoben/offen“ je ID zu nennen; neue Befunde vergeben wieder B1, B2 … — ein alter B1 ist nicht derselbe wie ein neuer. (2) qa 10: Bestands-Abläufe, die vor B2b-2a mit einem claude-code-Reviewer mit Schema an Regel 4b hielten, tragen im gespeicherten Grund noch „nur 'ergebnis-architecture-advisor'“; ein Neustart dürfte jetzt greifen, belegt ist er nicht. (3) qa 11: der Hinweis „bereit trotz schwerer Befunde“ sagt nicht, wo die Befunde stehen („Nachweise im Einzelnen“). (4) design-guardian 2: in der Kachel „Review“ steht ein Claude-Urteil direkt über „Urteile je Claude-Prüfer · kommt“ — liest sich, als käme das Claude-Urteil noch; gemeint sind die Urteile je Prüferrolle (code-reviewer, qa, design-guardian). (5) design-guardian 4: „der Review“/„das Review“ gemischt im Deutschen (Bestand; der neue Satz nutzt „Das Review“). (6) Der Harness-Abgleich (`harness-abgleich/standard.json`) nennt beim design-guardian-Schritt und beim Render-Nachweis im Lauf noch „B2b“; seit E-B2b-2-1 = A gehört beides zu B3. (7) design-guardian 5: bei 200 % Zoom verdeckt „Frag Jarvis“ den rechten Rand der Review-Notiz (wie F-1112).
Fundstelle: `src/korrekturschleife/index.ts` (`baueReviewKorrekturInstruktion`), `public/leitstand/views/workflow-abnahme.js` (`renderReviewKachel`), `public/leitstand/i18n/*.js` (`entscheiden.abnahme.claudePruefer`), `harness-abgleich/standard.json`, `features/F45/nachweise/b2b2a/render/bereit-hoch-de-1440-zoom200/`.
Auswirkung: Gering — Texte und Nachprüfbarkeit; nichts läuft still weiter.
Maßnahme: (1) mit §8 „Status strittiger Befunde“ (B2b oder R): Re-Review nennt je alter ID behoben/offen; (2) beim ersten Bestandsfall prüfen; (3)(4)(5) mit dem UX-Durchgang (F-1107), (4) Beschriftung in vier Sprachen; (6) bei der nächsten Berührung des Harness-Abgleichs (B2b-2b qa-Schritt); (7) mit F-1112.
Status: offen. Nachtrag Nachpass B2b-2a (15.10.2026; nach der einen Korrekturrunde nicht mehr im Bau, Auftrag): (8) Code-Review-Nachpass 1 / qa-Nachpass 1 — ein `null`-Eintrag in `befunde[]` (nur ohne durchgesetztes Schema möglich) bringt `baueAusfuehrungKorrekturInstruktion`/`baueReviewKorrekturInstruktion` (Zugriff auf `befund.beleg`/`schwere` vor der Hilfsfunktion), `baueAutomatischeAnpassungsBegruendung` (`f35-ws3-adjust-automatik.mjs`) und `renderBefunde` (Abnahme) zum Absturz; der Guard in `baueBefundZusatzzeilen` wirkt dort nicht, nur der Server-Filter im F-648-Block greift (ohne Test/Gate-Fall). Maßnahme: einmal in `leseUrteilAusLaufakte` auf Objekte filtern (eine Stelle für alle Lesepfade) + Test, Guard und Server-Filter danach entfernen. (9) Code-Review-Nachpass 3: mehrzeilige `zusammenfassung`/`beleg` brechen die nummerierte Befundzeile wie qa 4 (Bestand) — dieselbe Normalisierung anwenden. (10) Code-Review-Nachpass 2: in `zaehleSchwereBeiBereit` steht noch `(b as Record<string, unknown>).schwere` (Einengung per `in` möglich, kosmetisch). (11) qa-Nachpass 2: in der Lage „vorab“ (KLAERUNG_ERFORDERLICH, z. B. BEREIT mit HOCH plus AK-Verstoß an der Rückweg-Grenze) zeigt die Abnahme den Hinweis nicht — `schwere_bei_bereit` gilt nur bei offener Abnahme (ABGESCHLOSSEN, Muster „Review veraltet“); dort ist nur „Anpassung“/„Ablehnen“ möglich, „bevor du abnimmst“ passte nicht; bewusst so, Entscheidung beim UX-Durchgang. (12) qa-Nachpass 3: kein Gate-Fall, dass der Hinweis nach einer veralteten Entscheidung (ANPASSUNG, Neubau, Re-Review wieder BEREIT mit HOCH) wieder 1 zeigt — (h3) endet mit BEREIT ohne Befunde. (13) qa-Nachpass 4: der Render-Nachweis belegt das amber Badge nur im Bild und per Unit-Test, keine Spalte für die Badge-Klasse in der Klicktabelle (F-622). Nachtrag F45 B2b-2b-2 (15.10.2026): (6) erledigt — `harness-abgleich/standard.json` nennt beim design-guardian und beim Render-Nachweis im Lauf „B3“; (4) teilweise — die Review-Kachel sagt „Weitere Claude-Prüfer · kommt“ (qa urteilt in eigener Karte), die Beschriftung je Prüferrolle bleibt beim UX-Durchgang.
Feature/Run: Entdeckt: F45 B2b-2a (qa, design-guardian), 15.10.2026.

**F-1115** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte der Startfreigabe-Erneuerung CLI 2.1.300 (Prüfpass code-reviewer/qa).
Beschreibung: (1) qa L8: die Zählungen unter `features/F45/nachweise/b1b1/` tragen weder CLI-Version noch Datum (nur `b1b2/zaehlung-hooks.json` nennt `claude_code_version`); `b1b1/nachweis.md` steht weiter auf 2.1.296 — welche CLI die Zählungen erzeugt hat, zeigt nur die Commit-Historie. (2) qa L10: `features/F45/nachweise/f1/zaehlung-l1-qa-an.json` und `f1/zaehlung-l3-nur-qa.json` enthalten noch ungeschwärzte Benutzerpfade (außerhalb des Auftrags F-1111 (3)). (3) qa L6: Schritt 7.2 der Anleitung erzeugt neue Einträge unter `kontrollzustand/`; was damit geschieht (committen oder nicht), sagt die Anleitung nicht. (4) qa L5: Schritt 4 könnte mit `--baseline-id`/`--nachweis-id` vorab erzeugte IDs nutzen, dann entfiele das Einsetzen der Pfade in Schritt 5. (5) Code-Review 10: die Inline-Kommentare „Schwärzung beim Schreiben (HOME, PIPE)“ in `b2b1b/spike-f1105.mjs`, `spike-f1105-stdin.mjs` und `b2b2a/spike-reviewer-schema.mjs` nennen `<TEMP>` nicht. (6) qa TC-05: 8.3-Kurznamen (`NAME~1`) und dreifach escapte Pfade erfasst `schwaerze()` nicht; die Restprüfung im Modus `--json` fängt Letztere ab, Kurznamen nur, wenn der volle Name daneben steht.
Fundstelle: `features/F45/nachweise/b1b1/`, `features/F45/nachweise/f1/zaehlung-*.json`, `docs/harness/startfreigabe-erneuern.md` (Schritte 4, 5, 7), `features/F45/nachweise/b2b1b/schwaerze.mjs`.
Auswirkung: Gering — Nachvollziehbarkeit und persönliche Pfade in zwei älteren Nachweisen; nichts läuft still weiter.
Maßnahme: (1) Version und Datum in die b1b1-Zählungen schreiben oder `nachweis.md` je Erneuerung nachziehen; (2) die f1-Zählungen mit `schwaerze.mjs --json` behandeln; (3) bei der nächsten Erneuerung entscheiden; (4) bei Bedarf; (5) bei der nächsten Berührung der Spikes; (6) bei Bedarf.
Status: offen.
Feature/Run: Startfreigabe-Erneuerung CLI 2.1.300 (Branch `f45/startfreigabe-cli-2-1-300`, code-reviewer und qa), 15.10.2026.

**F-1116** · `TECH_DEBT` · P3 · teilweise
Titel: Restpunkte von F45 B2b-2b-1 (qa-Schritt, Kern) aus Advisor-Pass und Prüfpass.
Beschreibung: (1) Code-Review 3 / qa 5: scheitert der Start des qa nach einem aufgeschobenen Review (Eingaben, Rollenvertrag, Werkzeugsatz), schreibt `schreibeStartfehlerHalt` einen Halt am qa ohne Hinweis auf die Beanstandung des Reviews; die Rückweg-Entscheidung des Reviews verfällt (Ausgang war `starte`). Ein Neustart des qa heilt es (Regel 1q liest den Review neu). (2) Code-Review 2 (Rest): der Halt `hintergrundHalt` (Hintergrund-Ausführung) nennt die Beanstandung des Reviews nicht. (3) Code-Review 6: mit mehreren Review-Schritten nutzen `bezug.review_lauf_id` und der Reset den ersten Review (`findeReviewSchritt`), der qa-Nachlauf den Review vor dem qa (`findeReviewVorQa`) — heute trägt keine Vorlage zwei Reviews (Doppel-Reviewer nicht im Scope). (4) Code-Review 7: die Urteilsmenge BEREIT/BEREIT_NACH_KORREKTUR/BLOCKIERT steht an fünf Stellen (src/workflow, src/qa, zweimal in der Automatik, Literale in `ermittlePrueferBefund`). (5) qa 2: die Halt-Gründe der Regel 1q tragen Kennungen (`schritt_id`, „(ergebnis-qa)“, Feldnamen, Lauf-ID, rohe Urteile) wie bei Review und Advisor; „kein gültiges Ergebnis nach dem qa-Schema“ steht auch bei fehlender Laufakte oder bei Verstößen, die nur `validiereErgebnisQa` meldet (das Schema hat bewusst kein `minItems`, Spike-Fassung). (6) qa 4c/4d: ANGENOMMEN mit `bezug.qa_lauf_id` und Regel 1q (b) (Review zur qa-Zeit unlesbar) sind nur per Unit-Test bzw. gar nicht am HTTP-Pfad belegt. (7) Plan O2: der qa-Schritt bekommt keine Projektkarte und keinen Beobachtungsblock. (8) Spike-Grenze (wie F-1105/B2b-2a): das Verhalten der CLI bei einem Schema-Verfehlen ist unbelegt; Regel 1q (a) fängt es ab.
Fundstelle: `scripts/leitstand-server.mjs` (`schreibeStartfehlerHalt`-Aufruf nach der Auto-Fortsetzung, `hintergrundHalt`, `baueAbnahmeBezug`, `findeReviewVorQa`, `ermittlePrueferBefund`), `src/workflow/index.ts` (Regel 1q), `src/qa/index.ts`, `schemas/ergebnis-qa.schema.json`, `scripts/check-f45-b2b2-pruefer.mjs`.
Auswirkung: Gering — Texte und Nachprüfbarkeit; in jedem Fall hält der Ablauf an, nichts läuft still weiter.
Maßnahme: (1)(2) Beanstandungssatz an beide Halt-Gründe hängen, sobald B2b-2b-2 die Halt-Gründe für die Anzeige überarbeitet; (3) mit dem Doppel-Reviewer (R, F-1050) `findeReviewVorQa` für Bezug und Reset nutzen; (4) bei der nächsten Berührung ein gemeinsamer Export; (5) mit B2b-2b-2 einen Grund ohne Kennungen für die Abnahme (Muster `lesePlanV2Eingaben`), Ursache „Ergebnis unvollständig oder nicht lesbar“, Knopfname in Klammern; (6) Gate-Fälle mit B2b-2b-2; (7) beim ersten echten qa-Lauf (spätestens R) beobachten, ob die Karte fehlt; (8) beim ersten echten qa-Lauf Rohstrom prüfen.
Status: offen. Nachtrag Nachpass B2b-2b-1 (15.10.2026; nach der einen Korrekturrunde nicht mehr im Bau): (9) Code-Review-Nachpass — `reviewBefunde ?? []` in `leseVorherigeReviewBefunde` ist nach dem Null-Ausstieg toter Code; zwei Leerzeilen in `src/qa/index.ts` nach dem entfernten Typ; der F35-Kommentar am Automatik-Hook (`scripts/leitstand-server.mjs`) sagt noch, `naechster` sei dort „NIE 'starte'“ — seit dem Aufschub gilt das nur dank des Wächters `naechster?.art === 'haltKlaerung'`; der Testtitel zu `qa_lauf_id` nennt „fehlend gültig“, ohne den Fall selbst zu prüfen. (10) qa-Nachpass — der Zweig „Review-Laufakte der Vorrunde fehlt ⇒ null“ hat keinen Test; Regel 1q (a) und der Server-Satz beim qa-Ausfall beschreiben denselben Sachverhalt verschieden. Maßnahme: bei der nächsten Berührung (B2b-2b-2). Nachtrag F45 B2b-2b-2 (15.10.2026): (5) für die Abnahme erledigt — sie zeigt beim qa-Halt eine Ursache je Status ohne Kennungen und einen Satz zum Ausweg statt des Server-Grunds (der Server-Grund selbst trägt die Kennungen weiter; Liste und Technik-Teil zeigen ihn); (6) teilweise — ANGENOMMEN mit `bezug.qa_lauf_id` am HTTP-Pfad belegt (Gate (v4)), Regel 1q (b) weiter nur per Unit-Test; (1)(2)(3)(4)(7)(8)(9)(10) offen.
Feature/Run: Entdeckt: F45 B2b-2b-1 (Advisor-Pass O2, code-reviewer 2/3/6/7, qa 2/4/5), 15.10.2026.

**F-1118** · `BUG` · P2 · teilweise
Titel: Zwei Rückschritte der Korrekturrunde von F45 B2b-2b-2 und derselbe Fehlalarm beim Review (Nachpass, nicht mehr im Bau — höchstens eine Korrekturrunde).
Beschreibung: (1) Code-Review-Nachpass 1: der Status `laeuft` der qa-Projektion greift auch bei `halt` — heilt der Server nach einem Neustart einen hängenden qa-Lauf (Workflow KLAERUNG_ERFORDERLICH, Schritt bleibt LAEUFT), zeigt der Vorab-Block zur Prüfung aus Nutzersicht keine Ursache und keinen Ausweg (vor der Korrektur: „nicht lesbar“ mit Ausweg); oben steht weiter „Der Ablauf steht“ mit „Ablauf reparieren“. (2) qa-Nachpass 1: „{anzahl} — Details unten“ im Blick zeigt in der Lage „entscheidbar“ (der Blick steht im zugeklappten „Weg zum Ergebnis“ am Seitenende) und beim Halt bei 390 px (Blick unter den Knöpfen) in die falsche Richtung; vier Sprachen, der Unit-Test schreibt den Text fest. (3) Code-Review 1 / qa 1 (Erstpass), Review-Seite: dieselbe Lücke wie beim qa — solange der Review läuft, liefert GET …/abnahme `laufakte_fehlt`/`nicht_lesbar` und „Auf einen Blick“ zeigt einen roten Hinweis.
Fundstelle: `scripts/leitstand-server.mjs` (`baueQaAbnahmeProjektion`, Zweig `laeuft`; Review-Projektion in GET …/abnahme), `public/leitstand/i18n/*.js` (`abnahme.qa.blickHinweise`), `public/leitstand/views/workflow-abnahme.test.mjs`.
Auswirkung: Mittel — sichtbar falsche bzw. fehlende Erklärung; kein Ablauf läuft still weiter, Annehmen bleibt gesperrt.
Maßnahme: (1) `laeuft` nur ohne `halt` (mit Halt fällt der Fall auf „nicht lesbar“ + Ausweg), Unit- und Gate-Fall „qa LAEUFT + KLAERUNG_ERFORDERLICH“; (2) Text ohne Richtung, z. B. „{anzahl} — Details bei der Prüfung aus Nutzersicht“ bzw. kürzer ohne Richtungswort, vier Sprachen + Test, Render bereit-hoch/halt-de-390 neu; (3) Status `laeuft` auch in der Review-Projektion + `reviewHinweise`. Je eine Zeile plus Test — mit dem nächsten Bau an der Abnahme oder als eigener kleiner Fix nach Freigabe.
Status: teilweise (zweite Runde B2b-2b-2, Entscheidung Challenger, 15.10.2026): (1) erledigt — die qa-Projektion meldet `abgebrochen` (Halt, Schritt noch LAEUFT), die Abnahme nennt „Der Lauf der Prüfung aus Nutzersicht wurde unterbrochen (z. B. durch einen Neustart des Leitstands).“ und den Ausweg (Unit-Test, Gate (v7b)); (2) erledigt — „{anzahl} — Details bei der Prüfung“ ohne Richtungswort, vier Sprachen (Unit-Test, Render `bereit-hoch-*`, `halt-de-390`). Offen: (3) Review-Seite.
Feature/Run: Entdeckt: F45 B2b-2b-2 (code-reviewer- und qa-Nachpass, Erstpass code-reviewer 1/qa 1), 15.10.2026.

**F-1119** · `TECH_DEBT` · P3 · teilweise
Titel: Restpunkte von F45 B2b-2b-2 (qa-Schritt live) aus Prüfpass und Nachpass.
Beschreibung: (1) qa 2: Halt am qa wegen des Reviews (qa BEREIT, Review an der Grenze beanstandet oder nicht lesbar) — der Vorab-Block zeigt das grüne „Bereit“ des qa in einer roten Notiz, die Review-Befunde stehen dort nicht (nur das Review-Urteil im Blick); Entscheidung Stefan: Review-Befunde im Vorab-Block zeigen oder verweisen. (2) qa 4 / Code-Review 5: „wiederholen“ bei aktivem anderen Lauf — Zurücksetzen gelingt, der Start antwortet 409, die Meldung zeigt den rohen Server-Grund (Kennungen möglich); danach steht der qa ohne Halt und ohne Knopf; nicht per Gate belegt (wie beim Review). (3) qa 5: fällt der qa nach einer Beanstandung des Reviews aus, sagt der Ausweg-Satz nicht, dass nach der Wiederholung eine Korrekturrunde starten kann (der Server-Grund sagt es). (4) qa 6: Testlücken — kein Unit-Test „Halt am Review ⇒ keine qa-Notiz“, kein ru-Pluraltest (2, 5) für `befundeAnzahl`/`schwereBeiBereit`, VERWEIGERT/`nicht_gelaufen_klaerung` nur per Unit; Kreis: fehlgeschlagener qa ⇒ Satellit „offen“ (Statusregel, nicht erklärt). (5) qa 7: `risiko` des qa-Schritts in den Vorlagen trägt Kennungen und einen Pfad (Sichtbarkeit nicht geprüft); Harness-Begründungen tragen weiter Feature-/Finding-Kennungen (Konvention der Datei uneinheitlich, Code-Review-Nachpass 3). (6) design-guardian 4: beim Halt am qa (wie am Review) ist kein Knopf Hauptknopf — „… wiederholen“ als primary, wenn wiederholbar, für Review und qa gemeinsam. (7) design-guardian 6: Timeline „Claude Code“, Karte „Claude“ (Review-Konvention). (8) design-guardian-Nachpass 1: Abstand zwischen „Befunde“ (h4) und dem ersten Befund in der Notiz ≈ 50 px; Nachpass 2: `.abnahme-befund p:nth-child(2)` trifft auch „Korrekturrichtung“ in `.abnahme-befund-v2` (Bestand, auch Review). (9) qa-Nachpass 2: ein durchgefallener Testfall ist zugeklappt nur als Zahl in der Zusammenfassung sichtbar (ohne Farbe/Symbol); ob ein Durchfall bei BEREIT einen Hinweis auslösen soll, ist eine Regelfrage. (10) qa-Nachpass 3: ru „Пройден/Не пройден“ (m.) neben „Не проверяемо“ (n.). (11) qa-Nachpass 4: beim Halt mit gültigem BLOCKIERT zeigt der Vorab-Block die Testfälle nicht. (12) Code-Review-Nachpass 2: JSDoc von `ermittlePrueferBefund` (`vorgelesen` ohne `geparst`, Laufakte null; `leseQaErgebnisAusLaufakte` unter den Lesern). (13) Code-Review-Nachpass 4: die Hinweisliste der qa-Notiz hat keine eigene Regel (margin, `overflow-wrap`) wie `.abnahme-review-hinweise ul`. (14) Code-Review-Nachpass 5: ein Testfall mit unbekanntem Ergebnis fehlt in der Zahlenzeile (Schema schließt ihn aus).
Fundstelle: `public/leitstand/views/workflow-abnahme.js` (`renderQaNotiz`, `renderTestfaelle`, `qaHinweise`), `public/leitstand/views/workflows.js` (`fuehrePrueferWiederholenAus`), `public/leitstand/style.css`, `public/leitstand/i18n/ru.js`, `workflow-vorlagen/standard.json`/`hoch.json` (`risiko`), `harness-abgleich/standard.json`, `scripts/leitstand-server.mjs` (`ermittlePrueferBefund`).
Auswirkung: Gering — Texte, Gewichtung und Nachprüfbarkeit; Annehmen bleibt ohne qa gesperrt.
Maßnahme: (1) Entscheidung Stefan, mit F-1116 (1)(2); (2)(6) mit dem UX-Durchgang (F-1107) für Review und qa gemeinsam; (3)(9)(11) beim ersten echten qa-Lauf (spätestens R) beobachten und entscheiden; (4)(12)(13)(14) bei der nächsten Berührung; (5)(7)(8)(10) mit dem UX-Durchgang.
Status: teilweise (zweite Runde B2b-2b-2, 15.10.2026): (1) erledigt — GET …/abnahme meldet beim Halt am qa `qaErgebnis.reviewBeanstandet` (dieselbe Regel `istReviewBeanstandet` über `ermittlePrueferBefund`, gelesen nur beim Halt); der Vorab-Block zeigt dann zusätzlich „Befunde des Reviews“ in der Befundliste des Reviews (Unit-Test, Gate (v8), Render `review-beanstandet-de-1440`). Offen: (2)–(14). Nachtrag code-reviewer zur zweiten Runde (15.10.2026, nach „danach ist Schluss“ nicht mehr im Bau): (15) MITTEL — `reviewBeanstandet` ist auch bei BEREIT mit AK-Verstoß true; dann zeigt die qa-Notiz „Befunde des Reviews“ ggf. mit „Keine Befunde.“, das nicht erfüllte AK selbst steht im Vorab-Block nicht — Maßnahme: Server liefert die Art (BLOCKIERT/AK) oder die AK-IDs, die Notiz nennt sie; Test und Gate-Fall. (16) die Review-Laufakte wird beim Halt am qa im Poll ein zweites Mal gelesen (`reviewVorgelesen` nicht durchgereicht, Advisor A10). (17) `reviewBeanstandet` kommt aus `findeReviewVorQa`, die angezeigten Befunde aus `findeReviewSchritt` — heute derselbe Schritt (ein Review je Vorlage), Kopplung unausgesprochen; mit (16) eine Quelle. (18) JSDoc von `baueQaAbnahmeProjektion` und Datei-Header von `workflow-abnahme.js` nennen `abgebrochen`/`reviewBeanstandet` bzw. die Review-Befunde in der qa-Notiz nicht. (19) Testlücken: kein UI-Test für `reviewBeanstandet` ohne lesbares Review-Urteil, kein Gate-Fall `reviewBeanstandet` false beim Halt (Review BEREIT, qa BLOCKIERT), Render-Folge (d) wartet auf den Halt-Satz statt auf die Review-Befunde (Spalte belegt sie).
Feature/Run: Entdeckt: F45 B2b-2b-2 (code-reviewer, qa, design-guardian; Erst- und Nachpass), 15.10.2026.

**F-1121** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Budget-Defaults aus einer kleinen Stichprobe — fast-lane ohne eigene Messung, Läufe vor „qa live“.
Beschreibung: Die Defaults je Kontrolltiefe (`src/budget`, `BUDGET_DEFAULTS`) stammen aus 4 standard- und 5 hoch-Abläufen mit gemessenem `verbrauch` (dieses Repo, haushaltsbuch, haushaltsbuch2; Worktree-Kopien als Duplikate einmal gezählt), Median × 3, aufgerundet auf 100 000: standard 14,7 Mio., hoch gemessen 14,3 Mio. und auf standard angehoben (hoch enthält alle Schritte von standard). fast-lane hat keinen gemessenen Ablauf — fester Wert 5,3 Mio. aus dem Median der 19 Ausführungsläufe × 3. Die gemessenen Abläufe stammen von vor „qa live“ (#345, ein Claude-Schritt mehr je Runde in standard/hoch). `cache_read` dominiert die Summen (Entscheidung: alle vier Felder zählen).
Fundstelle: `src/budget/index.ts` (`BUDGET_DEFAULTS`), `features/F45/nachweise/b2b3c/budget-ableitung.mjs` / `.json`, `features/F45/plan-b2b3c.md` §1.
Auswirkung: Gering — ein zu enger Default führt zu einem Budget-Halt mit „Budget erhöhen“ (ein Klick), ein zu weiter lässt mehr Verbrauch zu; nichts läuft still weiter.
Maßnahme: Mit demselben Skript neu kalibrieren, sobald ≥ 3 fast-lane-Abläufe und ≥ 5 standard-/hoch-Abläufe mit qa-Schritt gemessen sind (spätestens nach R); Werte in `BUDGET_DEFAULTS` und Gate (b4) nachziehen — seit F45 B2b-3e-2 auch den Zwilling `BUDGET_STANDARD` in `public/leitstand/arbeitspaket-felder.js` (Hinweistext des Budget-Felds; Gate f45-b2b3e2 (b3) ist rot, solange beide abweichen).
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3c (Ableitung der Defaults, Advisor-Pass B10/B11), 15.10.2026.

**F-1122** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2b-3c (Budget je Arbeitspaket) aus Prüfpass und Korrekturrunde.
Beschreibung: (1) qa Q6: `budget_tokens` (Arbeitspaket-Budget) hat keinen Eingabeweg — gesetzt wird es nur durch „Budget erhöhen“ (Muster F-1083 (1) für `bereiche`); bis dahin gilt immer der Default der Kontrolltiefe. (2) qa-Hinweis / Advisor Frage 1 (E-B2b-3c-1): die Erhöhung gilt für das ganze Arbeitspaket — ein weiterer Ablauf desselben Auftrags erbt ein Budget, das aus dem Verbrauch des ersten errechnet wurde. (3) qa Q9: „Lauf-Detail“ ist als Ablauf-Seite `#/workflows/<id>` umgesetzt (Blick, Kachel, Notiz), nicht auf der Laufseite `#/runs/<id>`. (4) code-reviewer 6: GET /api/workflows/<id> und POST …/budget rechnen `ermittleNaechstenSchritt` bzw. die Projektion doppelt (gering). (5) code-reviewer 9: der Zwischenspeicher in `scripts/leitstand/budget-stand.mjs` hat keinen eigenen Unit-Test (nur über das Gate: (b1) GET vor dem Lauf, (b11)). (6) qa (fehlende Fälle): kein Gate-Fall für POST …/entscheidung im überschrittenen Budget (nur hoch), für POST …/budget bei aktivem Lauf (409) und für einen Schreibfehler (500); kein View-Test für die Bedienung „Budget erhöhen“ (Zweige Start/Freigabe/Startfehler). (7) qa Q2 (niedrig): im Budget-Halt am Neubau nennt der Vorab-Block „Korrekturrunde 1 · Start erfordert deine Freigabe“, obwohl zuerst das Budget erhöht werden muss. (8) Liste (Kopfdaten) bleibt nach „Budget erhöhen“ bis zum nächsten Workflow-Schreiben beim Budget-Halt (Stempel-Cache; sichere Richtung). (9) Durchsetzungsgrad DEKLARIERT: fail-open (Stand nicht bestimmbar ⇒ kein Halt), Überschreitung um bis zu einen Schritt.
Fundstelle: `src/auftrag` (kein Formularfeld), `scripts/leitstand-server.mjs` (POST …/budget, GET /api/workflows/<id>, `baueWorkflowKopfdaten`), `scripts/leitstand/budget-stand.mjs`, `scripts/check-f45-b2b3c-budget.mjs`, `public/leitstand/views/workflow-abnahme.js` (Vorab-Block), `public/leitstand/views/workflows.js`.
Auswirkung: Gering — kein Punkt lässt einen Ablauf still weiterlaufen; (1)(2) betreffen die Bedienbarkeit des Budgets.
Maßnahme: (1) mit B2b-3d (Quelle für die Arbeitspaket-Felder, F-1083 (1)) ein Feld „Budget“ anbieten; (2) Entscheidung Stefan E-B2b-3c-1; (3) bei Bedarf Zeile im Lauf-Detail; (4)(5)(6) bei der nächsten Berührung; (7) mit dem UX-Durchgang (F-1107); (8)(9) bewusst so.
Status: offen. Nachtrag Nachpass (15.10.2026; code-reviewer, qa, design-guardian je „freigegeben mit Hinweisen“; nach der einen Korrekturrunde nicht mehr im Bau, außer dem Rest des HOCH-Befunds): (8) erledigt — POST …/budget verwirft den Kopfdaten-Cache des Ablaufs, Liste und Detail melden nach der Erhöhung dasselbe Verdikt (Gate (k)). Neu: (10) qa-Nachpass 1: die Render-Klicktabelle liest die Meldung aus `#workflow-abnahme-meldung`, die Budget-Meldung steht in `#workflow-bedienung-meldung` — die Spalte „Meldung“ ist leer, belegt ist die Meldung nur im Bild; die Screenshots zeigen noch „Er setzt erst fort“ (Text danach geglättet: „Er läuft erst weiter“, design-guardian-Nachpass 1). (11) qa-Nachpass 2: nach „Budget erhöhen“ mit Start steht die Bestätigung weit unten (bestehendes Muster der Bedienmeldung, F-1107). (12) qa-Nachpass 3: der Server-Grund (`baueBudgetHaltGrund`) ist deutsch, sagt immer „ablehnen“ und erscheint roh in „Deine Entscheidungen“, Technik-Tabelle und 409-Antworten. (13) qa-Nachpass 4: ein nur errechneter Budget-Halt (gespeichert WARTET_FREIGABE/OFFEN) heißt in „Deine Entscheidungen“ „Rückfrage“ (`attention-daten.js`). (14) code-reviewer-Nachpass 2/3: JSDoc von `aktualisiereWorkflowBedienung` ohne `@param budget`, Reihenfolge-Satz in `renderEingriffe` ohne „Budget“, leerer `else if`-Zweig für `grundVeraltet`. (15) code-reviewer-Nachpass 4: Kopfdaten lesen den Budget-Stand auch bei echten Klärungs-Halts (nur bei Cache-Fehltreffer) und ohne Summen-Zwischenspeicher. (16) code-reviewer-Nachpass 5: der Fokus kann auf dem gesperrten Knopf landen (`.wf-aktion` statt `.wf-aktion:not([disabled])`). (17) code-reviewer-Nachpass 6: `grundVeraltet` setzt `fortsetzbar` nicht voraus (defensiv). (18) code-reviewer-Nachpass 7: Start mit 202 (Arbeitsordner wird vorbereitet) meldet „läuft weiter“. (19) design-guardian-Nachpass: nach dem Klick kein Fokus auf die Meldung (wie „Advisor wiederholen“). Maßnahme (10)–(19): bei der nächsten Berührung bzw. mit dem UX-Durchgang (F-1107); (12)(13) zusammen.
Nachtrag F45 B2b-3d (16.10.2026): (2) erledigt — Entscheidung Challenger E-B2b-3c-1 = ja: das Budget gehört zum Arbeitspaket, eine Erhöhung gilt für alle weiteren Abläufe desselben Auftrags (so gebaut). (1) teilweise — POST /api/auftraege nimmt `budget_tokens` an (eine Regel `validiereArbeitspaketFelder`, Gate f45-b2b3d (u5): wirkt im Budget-Halt); das Formularfeld „Budget“ mit Standardwert als Platzhalter ist als **B2b-3e** abgetrennt (Advisor-Pass B2b-3d, Challenger 16.10.2026).
Nachtrag F45 B2b-3e-2 (16.10.2026): **(1) erledigt** — Feld „Token-Budget · optional“ in „Auftrag & Start“ direkt nach „Vereinbarte Bereiche“ (`#auftrag-budget`, `leseBudget` mit Tausendertrennern), leer = Standard der Kontrolltiefe; die Standards stehen im Hinweis (nicht im Platzhalter, Advisor: bei 390 px abgeschnitten), Wortlaut „je Ablauf dieses Auftrags“ (Entscheidung Stefan B2). Eine Regel `pruefeBudgetTokens` (ganze Zahl 1 … MAX_SAFE_INTEGER, Zwilling src/auftrag ↔ Formular, Schema `maximum`). Render-Nachweis `features/F45/nachweise/b2b3e2/`.
Feature/Run: Entdeckt: F45 B2b-3c (code-reviewer, qa, design-guardian; Advisor-Pass), 15.10.2026.

**F-1123** · `TECH_DEBT` · P2 · offen
Titel: Restpunkte von F45 B2b-3d (Umfangs-Abgleich) aus Advisor-Pass, Prüfpass und Nachpass.
Beschreibung: (1) Advisor 6 / Challenger: Click-to-Work am Finding (AK-Entwurf, `views/workboard.js`) hat kein Feld „Bereiche“ — nur „Auftrag & Start“. (2) qa 2: die Freigabe-Karte „Arbeitspaket“ sagt weiter „kommt“ und „Umfang … sind noch keine Daten“, auch wenn Bereiche gesetzt sind (`views/workflow-entscheiden.js`, i18n). (3) qa 4 / Advisor 3: ein neuer, ungetrackter Ordner steht in der Änderungsübersicht als Ordnerpfad (`git status` ohne `-uall`) und gilt als außerhalb, wenn ein Bereich tiefer liegt — bewusste Semantik, aus Nutzersicht ein Fehlhinweis. (4) qa 5: die Live-Ansicht kündigt „Im Umfang?“/„außerhalb des Umfangs“ weiter als „kommt“ an (`views/live-anzeige.js`). (5) qa 7 / code-reviewer 10 / Nachpass 5: der Server prüft `bereiche` schwächer als das Formular (absolute Pfade, `..`, `*` mitten im Eintrag) und unterscheidet Groß-/Kleinschreibung — über die API gesetzt trifft so ein Eintrag still nichts (jetzt in der Abnahme über „Vereinbart: …“ erkennbar). (6) qa 8 / code-reviewer 6: der echte degradierte Pfad läuft nicht Ende-zu-Ende (Gate (u6) statt Plan-(u7), Unit-Test); „nicht bestimmbar“ und der Hinweis im Block „vorab“ sind nicht gerendert. (7) design-guardian 2: „Auf einen Blick“ hat keine Zeile für Dateien außerhalb. (8) design-guardian 5: „Bereit zum Start?“ ohne Zeile „Bereiche · optional“. (9) qa-Nachpass 1 / code-reviewer-Nachpass 1 (MITTEL): der Fehlertext bei `*` mitten im Eintrag (`src/*.ts`) sagt „kein Pfad relativ zum Projekt — ohne Laufwerk, Schrägstrich oder ..“ — falscher Grund; `src/**/` wird im Formular abgewiesen, obwohl der Server ihn als `src` läse; kein Test im Formular. (10) code-reviewer-Nachpass 2: Kommentare in `views/projekt.js` (legeAuftragAusFormularAn) und im Kopf von `arbeitspaket-felder.test.mjs` nennen das `*` nicht. (11) code-reviewer-Nachpass 3: `ausgangslage()` in `views/projekt.test.mjs` leert das Feld „Bereiche“ nicht (Folgefehler möglich). (12) code-reviewer-Nachpass 4: `umfangKennung` ohne `bereiche`. (13) qa-Nachpass 2: eine Umbenennung von außerhalb in einen Ausnahme-Pfad meldet nichts (Löschen würde gemeldet) — besser `alter_pfad` melden. (14) qa-Nachpass 4: „Vereinbart: …“ wird nicht gekappt. (15) design-guardian-Nachpass 1: die graue Zeile „nicht bestimmbar“ als direktes Kind der Flex-Spalte behält `margin-bottom` (Selektor `.entscheiden-inhalt > p.abnahme-umfang` ergänzen). (16) design-guardian-Nachpass 2 / code-reviewer-Nachpass 7: Zeile „Vereinbart“ bei 390 und die Notiz `abnahme-automatisch` mit neuem Abstand sind nicht einzeln gerendert. (17) code-reviewer 11: `types.ts` der Änderungsübersicht wiederholt den Typ statt `UmfangErgebnis`.
Fundstelle: `public/leitstand/arbeitspaket-felder.js`, `public/leitstand/views/projekt.js`/`.test.mjs`, `public/leitstand/views/workflow-abnahme.js`, `public/leitstand/views/workflow-entscheiden.js`, `public/leitstand/views/live-anzeige.js`, `public/leitstand/views/workboard.js`, `public/leitstand/style.css`, `src/umfang/index.ts`, `src/auftrag/index.ts` (`validiereAuftragBereiche`), `src/aenderungsuebersicht/index.ts`/`types.ts`, `scripts/check-f45-b2b3d-umfang.mjs`.
Auswirkung: Gering — nichts hält still an oder läuft still weiter; (2)(4)(5)(9) betreffen die Verständlichkeit, (3)(13) mögliche Fehl- bzw. fehlende Hinweise.
Maßnahme: (9)(10)(11)(12)(14)(15) mit B2b-3e (berührt dasselbe Formular, je eine Zeile plus Test); (1)(2)(4)(7)(8) mit dem UX-Durchgang (F-1107) bzw. B5a; (5) mit B2b-3e oder eigener kleiner Fix (Regel aus `leseBereiche` in `validiereAuftragBereiche`); (3) beobachten, ggf. `-uall` nur für den Abgleich; (6)(16) mit dem nächsten Render-Nachweis an der Abnahme; (13)(17) bei der nächsten Berührung.
Status: offen. Nachtrag F45 B2b-3e-2 (16.10.2026; Plan `features/F45/plan-b2b3e2-v2.md`, Delta-Advisor-Pass, code-reviewer/qa/design-guardian je „freigegeben mit Hinweisen“, eine Korrekturrunde): **(5)(9)(10)(11)(12)(13)(14)(15) erledigt** — eine Regel `pruefeBereich` als Zwilling (src/auftrag ↔ public/leitstand/arbeitspaket-felder.js, Entscheidung A2 = b; Grund-Codes leer/steuerzeichen/absolut/eltern/punkt/muster, getrimmt, beide Trenner; Gate `check-f45-b2b3e2-formular` (r1)–(r4) über eine Fall-Tabelle plus zeichengleiche Rümpfe), Meldung je Grund im Formular (`src/**/` jetzt gültig), Kommentare, `ausgangslage()` leert Bereiche und Budget, `umfangKennung` mit Bereichen, Umbenennung in einen Ausnahme-Pfad meldet den alten Pfad, „Vereinbart: …“ höchstens 10 + „… und n weitere“, CSS-Selektor für „nicht bestimmbar“. Groß-/Kleinschreibung bleibt bewusst unterschieden (git ist case-sensitiv). **Risiko (Offener Punkt 2, bewusst ohne Altlast-Sonderregel):** ein vor B2b-3e-2 über die API gesetzter, jetzt ungültiger Eintrag (`src/*.ts`, `/etc/`, `src/./`, Doppelte erst nach Trimmen gleich) oder ein `budget_tokens` über MAX_SAFE_INTEGER lässt die nächste Auftragsversion scheitern — „Budget erhöhen“ antwortet 500 „Budget nicht gespeichert …“, Übernahme der Einrichtung im Nachlauf des Architekten sperrt den Bau, Abhaken scheitert; Abhilfe nur ein neuer Auftrag; lokal 0 Aufträge mit `bereiche`. Neu (Restpunkte des Prüfpasses): (18) qa 2: dieses Verhalten ist durch keinen Test festgeschrieben, und ein 500 für ein Datenproblem ist irreführend (409/400 mit Grund wäre ehrlicher; leitstand-server.mjs unberührt gelassen, W1). (19) qa 3: kleine Budgets (`5`, `2000`, `1.500` = 1500) werden ohne Plausibilitätshinweis angenommen; „Erhöhen“ addiert dann nur wenig. (20) qa 5: der Server speichert Einträge ungetrimmt (`' src/ '` erscheint so in Auftrag und „Vereinbart“); Schema `uniqueItems` vergleicht exakt, die Regel getrimmt. (21) qa 6: Steuerzeichen nur C0/DEL — U+0085, U+2028/2029, U+200B, Bidi (U+202E) kommen durch. (22) qa 11/12, design-guardian 6: eine Meldung je Absenden (Bereich vor Budget), Fehlerzeile ohne `aria-invalid`/Bezug zum Feld (bestehendes Muster). (23) code-reviewer 8: `eintrag` in `validiereAuftragBereiche` implizit `any` (bestehendes Muster). (24) design-guardian 1: Render nur de/dunkel 1440 und 390 plus ru-390 und hell-1440 aus der Korrekturrunde; 200 % Zoom und tr nicht gerendert. (16) bleibt offen (Abnahme-Teile (14)(15) nicht gerendert). Maßnahme (18)–(24): bei der nächsten Berührung; (18) vor dem Einschalten eines Änderungswegs für `bereiche`. Nachtrag F45 W1 (16.10.2026, Auftrag W1): P3 → P2 wegen (18) (500 auf einem Schreibweg); **(18) erledigt** — Bestandsschutz in `registriereAuftrag` (src/auftrag): die letzte Version ist der Bestand, ein unverändert übernommener Wert von `bereiche`/`budget_tokens` wird nur strukturell geprüft (Array nicht-leerer Strings bzw. ganze Zahl ≥ 1), neue oder geänderte Werte (auch umgeordnete `bereiche`) voll; wirkt ohne Server-Zeile auf alle drei Schreibwege (Budget erhöhen, Einrichtung abhaken, Übernahme im Nachlauf des Architekten — alle reichen `optionenAusAuftrag` der geladenen Version durch). Am realen Pfad belegt ist nur „Budget erhöhen“ (Gate-Fall (b13) in `check-f45-b2b3c-budget`, POST …/budget 200 mit Altauftrag); Abhaken mit Alt-Budget über MAX_SAFE nur im Unit-Test (`src/auftrag/auftrag.test.ts`). Unit-Tests und (b13) sind gegen das main-Modul rot (Protokoll `features/F45/nachweise/w1/rot-nachweis.md`). Restpunkte (Prüfpass W1): qa 11 kein Integrationsfall für Abhaken/Nachlauf mit Altauftrag; qa 12 Versionskette v1→v4 nicht als ein Ablauf getestet. Grenze: liefert `erhoehtesBudget` einen Wert über MAX_SAFE, bleibt es bei 500 (Randfall). Die Priorität der übrigen offenen Punkte bei der nächsten Berührung neu bewerten.
Feature/Run: Entdeckt: F45 B2b-3d (Advisor-Pass, code-reviewer, qa, design-guardian; Erst- und Nachpass), 16.10.2026.

**F-1124** · `PROCESS_IMPROVEMENT` · P2 · offen
Titel: Ausführung begann vor dem Advisor-Urteil.
Beschreibung: In F45 B2b-3d wurde `src/umfang` gebaut, während der Advisor-Pass zum Plan noch lief. Ein Advisor-Urteil, das einen Schnitt oder eine Überarbeitung verlangt, hätte gebauten Code entwertet oder — schlimmer — gegen schon geschriebenen Code „angepasst“ werden müssen; der Advisor prüft dann faktisch den Code, nicht den Plan.
Fundstelle: Ablauf der Bauaufträge (Plan → Advisor-Pass → Bau), F45 B2b-3d (`src/umfang/`, `features/F45/plan-b2b3d.md`).
Auswirkung: Mittel — der Advisor-Pass verliert seine Wirkung als Bremse vor dem Bau.
Maßnahme: Code erst nach dem Advisor-Urteil; bis dahin nur lesen und den Plan schreiben. Verlangt der Advisor einen Schnitt, anhalten und berichten. In F45 B2b-3b-1 bereits so gehandhabt (Advisor ZU GROSS → Halt, Schnitt durch Stefan, Delta-Pass, dann Bau).
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3d (Challenger, 16.10.2026).

**F-1125** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Persönliche Pfade in Render-Screenshots.
Beschreibung: Challenger-OCR (16.10.2026): alle 11 Screenshots in `features/F45/nachweise/b2b3d/render/` und ältere auf main (z. B. b0, b1a1, f2b2c) zeigen `C:\Users\<name>\AppData\Local\Temp\…` im Panel „Wo gearbeitet wird“ und im PowerShell-Befehl. Die Pfadprüfung der Nachweise wirkt nur auf Text (JSON, Markdown), nicht auf Bilder.
Fundstelle: Render-Helfer (`npm run render-nachweis`, `scripts/render-nachweis.mjs`), Testinstanzen `features/F45/nachweise/*/instanz.mjs`, Screenshots unter `features/F45/nachweise/*/render/`.
Auswirkung: Mittel — persönliche Pfade gelangen in versionierte Nachweise.
Maßnahme: Testinstanz der Render-Helfer mit neutralem HOME/TEMP starten oder die Pfade vor dem Screenshot maskieren; neue Screenshots per OCR auf persönliche Pfade prüfen. Die Historie wird nicht bereinigt. Geplant mit B2b-3e.
Status: offen. Nachtrag F45 B2b-3e-1 (16.10.2026): für **neue** Instanzen erledigt — `scripts/neutrale-umgebung.mjs` (+ `-starten.mjs` als erster Import) setzt HOME/USERPROFILE/TEMP/TMP auf einen Laufordner unter `C:\aiw-nachweis` (bzw. `AIW_NEUTRAL_WURZEL`) und entfernt ihn beim Prozessende (ein hart beendeter Prozess hinterlässt ihn); `scripts/render-nachweis.mjs` prüft vor jedem Screenshot den sichtbaren Text (DOM-Probe, `scripts/render-pfadprobe.mjs`) und vor dem Schreiben `protokoll.md`/`.json` und bricht bei einem persönlichen Pfad ab. Gate `check-f45-b2b3e1-pfade` (p1–p3b), Nachweis `features/F45/nachweise/b2b3e1/`. **Die alten Instanzen (15 Dateien, eingefroren im Gate) bleiben ohne neutrale Umgebung — ein Neu-Rendern alter Nachweise erzeugt wieder persönliche Pfade, die Probe bricht dann ab.** Historie nicht bereinigt. Offen bleibt der Name „Stefan“ in der Nutzerkarte der Seitenleiste (kein Pfad, außerhalb der Probe). Restpunkte aus Prüfpass B2b-3e-1 (code-reviewer, qa; je „freigegeben mit Hinweisen“): (R1) qa 5: drei Skripte machen Screenshots ohne den Render-Helfer und damit ohne Probe (`features/F46/nachweise/d0/erzeuge-nachweis.mjs`, `docs/design/vorlage-v10/erzeuge-screens.mjs`, `features/F36/nachweis-ws1-ui/messung.mjs`). (R2) qa 6 / code-reviewer 4: Lücken des Musters — URL-kodierte Pfade, `\\wsl$\…\home\…`, `/root/…`, Nutzerordner auf anderen Laufwerken ohne `Users`, über Elemente verteilte Pfade, U+200B; bewusst strenge Fehltreffer (`LOCALAPPDATA`, `%APPDATA%`, `api/users/1`). (R3) qa 8: zwischen Probe und Bild kann ein Poll neuen Text einsetzen (Probe nach dem Bild wiederholen). (R4) qa 9: Bilder früherer Schritte und gleichnamige Bilder älterer Läufe bleiben bei einem Abbruch liegen (Aufrufer leert den Ordner; im Kopf von render-nachweis.mjs genannt). (R5) qa 11: zwei Instanzen gleichzeitig — gleicher Port, kleines Zeitfenster beim Entfernen der leeren Wurzel. (R6) qa 13: neutrales HOME zeigt Leerzustände (`~/.claude`) — für Render-Instanzen gewollt, in B2b-3e-2 beachten. (R7) qa: posix nur injiziert belegt. (R8) code-reviewer 14: `sammleSichtbarenText` und die Signalbehandlung nur über den Nachweis belegt, Strg+C nicht real ausgelöst. Maßnahme (R1)–(R8): bei der nächsten Berührung des Render-Helfers bzw. mit B2b-3e-2. Nachtrag F45 B2b-3e-2 (16.10.2026, Entscheidung Stefan B1 nach Delta-Advisor-Pass): das Aufräumen alter `C:\aiw-nachweis\lauf-*`-Ordner beim Start (Anlass: harter Abbruch in 3e-1 ließ `lauf-5d4ot5` liegen) ist **nach B2b-3e-3 abgetrennt**, zusammen mit (R1)–(R8) und den Auflagen aus `features/F45/advisor-b2b3e2-delta.md` Befund 1–3 (PID-Datei; Ordner ohne `pid` erst nach ~24 h, wegen paralleler Worktrees mit gemeinsamer Wurzel; nur positive Ganzzahl als `pid`; nur `ESRCH` = tot; festes Verhalten, wenn das Schreiben der `pid` scheitert; Dirent/`isDirectory`, keine Symlinks; Gate/Tests importieren den Starter nie). (R6) beachtet: die neue Instanz b2b3e2 zeigt nur das Formular, Leerzustände von `~/.claude` stören dort nicht. Nachtrag F45 W1 / B2b-3e-3 (16.10.2026, Plan `features/F45/plan-w1-v2.md` §2): **Aufräumen erledigt** — `neutrale-umgebung-starten.mjs` schreibt `<laufordner>/pid` (`markiereLauf`, Schreibfehler ⇒ Warnung) und räumt danach (nach dem `exit`-Handler, in `try`) fremde Laufordner unter derselben Wurzel (`raeumeAlteLaeufeAuf`): nur Dirent-Ordner `lauf-XXXXXX` mit `home/` und `temp/`, nie der eigene; gültige `pid` (positive Ganzzahl) ⇒ entfernen, wenn `istTot` (nur ESRCH); sonst nur, wenn älter als 24 h; Lese-/stat-/Löschfehler warnen. Tests mit injiziertem `fs` in `scripts/neutrale-umgebung.test.mjs` (der Starter wird nie importiert; seine Reihenfolge prüft ein Test am Text). Grenzen: wiederverwendete PID lässt einen toten Lauf stehen; ein Teil-Löschen bei belegten Handles kann die `pid` entfernen — der Rest (nur `home`/`temp`/`pid`, auch leer) wird nach 24 h geräumt (Korrekturrunde: Kandidat = Inhalt ⊆ {home, temp, pid}, code-reviewer 1 / qa 7); eine `pid` über 2^31−1 gilt als ungültig; ein gleichzeitig entfernter Ordner (ENOENT) bleibt still; je belegtem Ordner wartet `rmSync` bis ≈ 5,5 s. Restpunkt (qa 8): die `pid` gilt nur auf diesem Rechner — teilen Windows und WSL/Sandbox oder ein Netzlaufwerk per `AIW_NEUTRAL_WURZEL` dieselbe Wurzel, kann ein lebender Lauf der anderen Umgebung gelöscht werden (deklariert im Modul; Abhilfe bei Bedarf: Rechnername in die pid-Datei). **(R1)–(R8) bleiben offen** und gehen nicht mehr mit 3e-3 (Auftrag W1 nannte sie nicht): Maßnahme bei der nächsten Berührung des Render-Helfers.
Feature/Run: Entdeckt: F45 B2b-3d (Challenger-OCR der Render-Nachweise), 16.10.2026.

**F-1126** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2b-3b-1a (Rückfrage-Kanal, ausgeschaltet) aus code-reviewer und qa.
Beschreibung: (1) qa 2: Ablehnungen der Token-Routen mit 400/413 (Formfehler, Body über 64 KiB) erzeugen keine Protokollzeile — für den Abgleich tool_use_id ↔ `permission_denials` in 3b-1b entscheiden (protokollieren oder bewusst als VERWEIGERT ohne Eintrag). (2) qa 7: keine Obergrenze offener Rückfragen je Lauf — wer das Token aus dem Argv des CLI-Prozesses liest, kann GET /api/rueckfragen fluten; vor 3b-2 eine Grenze (z. B. 20 offene je Lauf) mit Test. (3) qa 8: „wörtlich angezeigt“ kann täuschen (Steuerzeichen, `\r`, ANSI-Folgen, Bidi-Overrides U+202E) — vor 3b-2 entweder `auto_deny` in `vorentscheidung` oder sichtbare Kennzeichnung in der Anzeige, mit Test. (4) qa 10 / code-reviewer 8: Pfadregel ist Vorsorge — `..` textuell vor realpath (posix löst `link/..` physisch auf), Groß/klein über toLowerCase statt NTFS-Regeln, `\??\`-Pfade und DOS-Gerätenamen (CON, NUL, COM1) nicht eigens erkannt; zu schärfen, bevor ein Datei-Werkzeug je an Stefan geht (Grenze im Kopf von `src/rueckfrage/index.ts`). (5) qa 12: mit Kanal an ungetestet: Katalog-Kollision über den echten Start (nur direkt geprüft) und automatische Fortsetzung ohne url ⇒ Startfehler-Halt. (6) qa 14: unbekannte Bash-Felder werden abgelehnt (fail closed) — ergänzt die CLI ein Feld, wird jeder Bash-Aufruf abgelehnt; im echten Lauf in 3b-2 belegen. Mehrprojekt: Vermittlung je Instanz, GET zeigt nur die eigene (3b-2). (7) code-reviewer 2: das Protokoll heißt jetzt `tool_name`; 3b-1b baut darauf auf (Plan v2 CONTEXT).
Fundstelle: `scripts/leitstand/rueckfrage-vermittlung.mjs`, `scripts/leitstand-server.mjs` (Routen /api/rueckfrage/…), `src/rueckfrage/index.ts`, `scripts/check-f45-b2b3b1-rueckfrage.mjs`.
Auswirkung: Gering, solange der Kanal aus ist; (2)(3)(6) sind vor dem Einschalten (B2b-3b-2) Pflicht, (1) vor 3b-1b.
Maßnahme: (1) mit B2b-3b-1b; (2)(3)(5)(6) mit B2b-3b-2; (4) vor jeder Regel, die ein Datei-Werkzeug an Stefan gibt.
Status: offen — (1) erledigt in B2b-3b-1b (16.10.2026): bewusst ohne Protokolleintrag (ohne lesbaren Body keine verlässliche tool_use_id/Input-Hash); eine solche Ablehnung hat keinen Eintrag und bleibt nach dem Abgleich A6 VERWEIGERT (sichere Richtung), belegt in Gate f45-b2b3b1b-auswertung (p4)/(e3). (2)–(7) offen. Nachtrag F45 B2b-3b-2a (16.10.2026, Plan `features/F45/plan-b2b3b2a-v2.md`): **(2) erledigt** — höchstens 20 gleichzeitig offene (unentschiedene) Rückfragen je Lauf (`MAX_OFFENE_JE_LAUF`, `scripts/leitstand/rueckfrage-vermittlung.mjs`); darüber auto_deny bzw. frage_ohne_antwort mit Eintrag und eigenem Grund; Gate f45-b2b3b2a-absicherung (o1), Tests in `rueckfrage-vermittlung.test.mjs`. **(3) erledigt** (einfachste sichere Variante) — `vorentscheidung` lehnt einen Befehl mit Steuer- oder Formatzeichen ab (`TAEUSCHENDE_ZEICHEN` in `src/rueckfrage/index.ts`: Cc, Cf, Cs, Zl, Zp nach Entfernen von `\t`/`\n`; CRLF-Zeilen werden damit abgelehnt, ebenso bewusst Emoji mit Zero-Width-Joiner und LRM/RLM — sichere Richtung); Gate (z1), Tests in `rueckfrage.test.ts`. Nicht erfasst: Variationsselektoren, NBSP/Zs, Homoglyphen. **Auflage für 3b-2b (Anzeige, Advisor B12):** erlaubte `\n`/`\t` können den gefährlichen Teil aus dem Sichtbereich schieben — vollständige Anzeige mit Zeilenzahl; Frage-Texte und Optionen (`frage_stefan`) werden nicht geprüft — Steuerzeichen dort sichtbar maskieren. (4)–(7) offen. Nachtrag F45 B2b-3b-2b-2a-1 (17.10.2026, Plan `features/F45/plan-b2b3b2b2a-v2.md`, Advisor `advisor-b2b3b2b2a.md` „zu groß“ ⇒ Schnitt 2a-1/2a-2): **Mehrprojekt (6) Teil Vermittlung erledigt** — Kanal nur mit `LEITSTAND_RUECKFRAGE=1`; jede Instanz eigene Vermittlung, url = API-Basis der Instanz (`…/api` bzw. `…/api/projekte/<id>`), Rückfrage nur in der Liste ihrer Instanz, fremdes Token ⇒ 403 ⇒ deny (Gate f45-b2b3b2b2a-einschalten (d)). **(5)** „Kanal an ohne url“ ist im Produkt nicht mehr erreichbar (`rueckfrageOptionFuer` setzt immer eine url); Katalog-Kollision über den echten Start und automatische Fortsetzung ⇒ B2b-3b-2b-2b (echter Lauf). **(3) Auflage B12** (Anzeige vollständig mit Zeilenzahl, Frage/Optionen maskiert) ⇒ B2b-3b-2b-2a-2. (6) Rest (unbekannte Bash-Felder im echten Lauf) ⇒ 2b-2b. Offen: (3)-Anzeige, (4), (5), (6)-Rest, (7). Nachtrag F45 B2b-3b-2b-2a-2 (17.10.2026, Plan `features/F45/plan-b2b3b2b2a2-v2.md`, Advisor `advisor-b2b3b2b2a2.md`): **(3) Auflage B12 erledigt (Anzeige)** — die Karte zeigt einen Bash-Befehl wörtlich und vollständig (je Zeile nummeriert, Zeilen- und Zeichenzahl, keine Höhenbegrenzung, kein waagrechtes Scrollen); Steuer- und Formatzeichen (Cc, Cf, Cs, Zl, Zp) sowie ⟦ ⟧ selbst erscheinen in Befehl, Frage und Optionen als Marke ⟦U+XXXX⟧ (`public/leitstand/rueckfrage-daten.js`), eine leere Option ist gesperrt; Gate f45-b2b3b2b2a2-anzeige (c), Render-Nachweis `features/F45/nachweise/b2b3b2b2a2/render/`. Grenze (ARCHITECTURE §3): NBSP und andere Zs, Variationsselektoren, Homoglyphen unmaskiert. **Mehrprojekt (6) Teil Anzeige erledigt** — der Leitstand fragt die Instanz des aktiven Laufs (Register `laufAktiv`). Offen: (4), (5), (6)-Rest, (7). Nachtrag F45 B2b-3b-2b-2b-1 (17.10.2026, Plan `features/F45/plan-b2b3b2b2b1-v2.md`, Advisor `advisor-b2b3b2b2b1.md`): **(6)-Rest vorbereitet** — Prüfpunkt P5 der Auswertung (`scripts/leitstand/nachweis-rueckfrage-auswerten.mjs`: auto_deny-Gründe gezählt, „unbekanntes Eingabefeld“ ⇒ nicht erfüllt), Beleg mit dem Nachweislauf (`docs/harness/rueckfrage-nachweislauf.md`). **(5)** im echten Lauf **nicht belegt**: Katalog-Kollision bräuchte einen Katalog-Eintrag `rueckfrage` mit Freigabe, „ohne url“ ist im Produkt nicht erreichbar — bleibt über Gates belegt (Anleitung „Optional“). Nachtrag F45 B2b-3b-2b-2b-2a (18.10.2026, Nachweislauf 17.10.2026, CLI 2.1.300): **(6)-Rest erledigt** — `features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-a-4f857ba9-4008-4f10-8e6f-61a28323f62a.md` P5 (Z. 24 und Z. 59–62): „erfüllt mit Abweichung“, 2 Bash-Anfragen bei Stefan, keine Ablehnung wegen eines unbekannten Eingabefelds; die Abweichung ist nur die CLI-Version (deklariert 2.1.258, im Lauf 2.1.300). Ergänzt eine spätere CLI ein Bash-Feld, lehnt die Regel weiter ab (fail closed, gewollt). Offen: (4), (5), (7).
Feature/Run: Entdeckt: F45 B2b-3b-1a (code-reviewer, qa), 16.10.2026.

**F-1127** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Rot-Nachweis gegen main per Worktree im Scratchpad bleibt registriert hängen, commit-guard sperrt das Entfernen (B2b-3b-1a).
Beschreibung: Für den Rot-Nachweis eines neuen Gates gegen main wurde in B2b-3b-1a ein git-Worktree im Scratchpad angelegt. Danach blieb er im Repo registriert, und commit-guard sperrte das Entfernen — Aufräumen nur durch den Menschen.
Fundstelle: Ablauf Rot-Nachweis (B2b-3b-1a), commit-guard-Hook.
Auswirkung: Gering, aber wiederkehrend — ein hängender Worktree pro Rot-Nachweis, Handarbeit für Stefan.
Maßnahme: `git archive`-Abzug als Standardweg für Rot-Nachweise festhalten (`git archive main | tar -x -C <scratchpad>/main`, neues Gate dorthin kopieren und dort laufen lassen) — kein Eintrag im Repo, nichts zu entfernen. In B2b-3b-1b so angewandt.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3b-1a (Rot-Nachweis), 16.10.2026; Auftrag B2b-3b-1b.

**F-1128** · `TECH_DEBT` · P1 · offen
Titel: Restpunkte von F45 B2b-3b-1b (Rückfrage-Auswertung) — Pflichtpunkte vor dem Einschalten (B2b-3b-2) und Schulden.
Beschreibung: Pflicht vor 3b-2: (1) Advisor A1 / qa 3: „Ablehnung allein durch Stefan ⇒ ERFOLGREICH“ ist DEKLARIERT — die Antwort-Route ist für jeden lokalen Prozess erreichbar, und die Protokoll-Datei `rueckfragen-<laufId>` im Kontrollzustand ist für lokal ausgeführten Code schreibbar (Hash-Kette ohne Geheimnis nachrechenbar). Ablauf qa 3: Worker schreibt per Write ein Skript, lässt es sich von Stefan erlauben, das Skript führt eigene auto_deny-IDs als stefan_abgelehnt ⇒ ERFOLGREICH, F-760-Halt fällt weg. Gegenmittel prüfen: Controller liest die Einträge aus der Vermittlung im Speicher (gleicher Prozess) statt aus der Datei, die Datei bleibt Audit. (2) qa 2: Löschliste läuft bei ERFOLGREICH — ein von Stefan abgelehntes `rm …` kann über den `zu_loeschen`-Block doch löschen; bei `abgelehnt_durch_stefan > 0` Löschliste aussetzen oder halten. (3) Advisor H1: `abgelehnt_durch_stefan` wird nirgends angezeigt, der F-760-Halt mit den abgelehnten Befehlen entfällt, Review/qa erfahren nichts — Anzeige in 3b-2. (4) code-reviewer 11: der Abgleich setzt voraus, dass `permission_denials[].tool_input` kanonisch gleich dem `input` an `rechte_pruefen` ist (Spike: eine Probe gleich); sonst bleibt jede Stefan-Ablehnung VERWEIGERT (sicher, aber wirkungslos) — im echten Lauf belegen, ebenso doppelte IDs in `permission_denials` und `--resume` (qa 9). (5) code-reviewer 8 / qa 8: keine Obergrenze der Protokolleinträge — jede Entscheidung schreibt die volle Liste (O(N²) Bytes), die Kette wird rekursiv geprüft; mit F-1126 (2) eine Grenze je Lauf (auch auto_deny). Schulden: (6) Advisor H6: Schreibfehler des Protokolls nur auf der Konsole, nicht in der Startfehlerliste. (7) code-reviewer 10 / qa 6: bei ERFOLGREICH stehen `is_error`/`non_execution_kind` nicht in daten der Terminalmarke (wie beim bisherigen ERFOLGREICH); `is_error: true` + Stefan-Ablehnung ⇒ ERFOLGREICH ungetestet. (8) qa 7: ein dauerhaft ungültiger Eintrag friert das Protokoll für den Rest des Laufs ein (jede weitere Version wirft) — nach A3 praktisch nicht erzeugbar. (9) code-reviewer 5/6: `.slice` kann ein Surrogatpaar teilen; Neutralisierung ersetzt Präfixe ohne Pfadgrenze (`<HOME>ie`), Kurznamen (8.3) und Junction-Pfade nicht erkannt — nur kosmetisch/Datenschutz. (10) code-reviewer 9: `lauf.eintraege` (Warteschlange) und `kontext.eintraege` (Protokollliste) heißen gleich.
Fundstelle: `src/rueckfrage/protokoll.ts`, `src/result-evaluator/index.ts`, `src/execution-controller/index.ts`, `scripts/leitstand/rueckfrage-protokoll.mjs`, `scripts/leitstand/rueckfrage-vermittlung.mjs`, `scripts/leitstand-server.mjs` (Löschliste, F-760-Halt), ARCHITECTURE §4.
Auswirkung: Keine, solange der Kanal aus ist (kein Produktlauf liest ein Protokoll). Mit eingeschaltetem Kanal ohne (1)(2) kann lokal ausgeführter Code eine Verweigerung in ERFOLGREICH verwandeln.
Maßnahme: (1)–(5) mit B2b-3b-2, vor dem Einschalten; (6)–(10) bei Gelegenheit.
Status: offen. Nachtrag 16.10.2026 (Auftrag B2b-3e): P2 → P1, weil (1)–(5) B2b-3b-2 blockieren. Nachtrag F45 B2b-3b-2a (16.10.2026, Plan `features/F45/plan-b2b3b2a-v2.md`, Advisor `advisor-b2b3b2a.md` + `-delta.md`; Routen-Umzug nach W2, F-1131): **(1) erledigt für den Weg über die Datei** (Restpunkt R1 unten) — Quelle der Wahrheit ist der Speicherstand der Vermittlung (`eintraegeVon`: je Eintrag nur tool_use_id, tool_name, input_hash, art), gelesen im selben Prozess über `laufOptionen.rueckfrageSpeicher`; `ermittleRueckfrageProtokoll` (`src/execution-controller/index.ts`) lässt die Datei nur gelten, wenn sie dazu passt (`bestaetigeProtokoll`, `src/rueckfrage/protokoll.ts`, gleiche Länge, vier Felder je Index); Abweichung, fehlender Speicherstand (Lauf nicht offen, Neustart) oder kaputte Datei ⇒ null ⇒ VERWEIGERT, mit Grund auf der Konsole (Fälschung und Schreibfehler sehen gleich aus). Gate f45-b2b3b2a-absicherung (a1)/(a2): gefälschte Datei mit stefan_abgelehnt für eine auto_deny-ID ⇒ VERWEIGERT, über den alten Pfad ERFOLGREICH (Gegenprobe). **(2) erledigt** — nach `abgelehnt_durch_stefan > 0` löscht der Server nichts; die Pfade stehen mit `LOESCHLISTE_AUSGESETZT` unter `loeschliste.abgelehnt` (Hinweis in der Änderungsübersicht, kein Schemawechsel; `fuehreLoeschlisteAus`, `src/arbeitsordner/index.ts`); Gate (l1) mit Gegenprobe. **(5) erledigt** — höchstens 200 Protokolleinträge je Lauf einschließlich auto_deny (`MAX_PROTOKOLL_JE_LAUF`); jede offene Rückfrage hält ihren Platz frei (Einträge + offene ≤ 200); darüber Ablehnung ohne Eintrag (bleibt im Abgleich VERWEIGERT), einmal auf der Konsole gemeldet; Gate (o1). Menge gemessen (Skript im Scratchpad, 16.10.2026): 200 von Stefan abgelehnte Bash-Befehle mit ~1900 Zeichen ⇒ 43 MB Kontrollzustand je Lauf, Schreiben zusammen 1,3 s (verteilt auf die Entscheidungen), Lesen bei der Klassifikation 234 ms synchron im Leitstand-Prozess; ohne Befehlstext (auto_deny Write) 5 MB. **Neu (Advisor B7, Entscheidung Stefan vor dem Einschalten in 3b-2b):** über `GET /api/rueckfragen` (ohne Token) und die Antwort-Route kann jeder lokale Prozess eine offene Bash-Rückfrage ablehnen **oder einmal erlauben** — bleibt DEKLARIERT (ARCHITECTURE §3/§4). **Restpunkte aus qa B2b-3b-2a, Pflicht vor dem Einschalten (3b-2b):** (R1, qa B2, zu (1)) (1) schließt nur den Weg über die gefälschte Datei, nicht das „Waschen“ einer statischen Ablehnung über die Token-Route: eine ID, die nie über den Kanal lief (z. B. Sperrregel über `--disallowedTools` ohne Verbotswert), steht nicht in `bekannteIds`; ein Prozess mit dem Token (Argv) stellt sie mit gleichem Input, Stefan (oder nach B7 ein lokaler Prozess) lehnt ab ⇒ `stefan_abgelehnt` ⇒ ERFOLGREICH, F-760-Halt entfällt (die Aktion selbst bleibt verweigert). (R2, qa B1, zu (2)/(4)) die Aussetzung der Löschliste hängt an `abgelehnt_durch_stefan`, das nur aus dem Abgleich der `permission_denials` entsteht — listet die CLI eine Ablehnung über das Prompt-Tool nicht auf, löscht die Löschliste doch; zusätzlich „irgendein `stefan_abgelehnt` im Speicherstand“ prüfen (vor `beendeLauf` lesen). (R3, qa B3, zu (6)) eine Abweichung Speicher/Datei steht nur auf der Konsole (VERWEIGERT ohne Umgehungsverdacht, normaler F-760-Pfad) — Grund in `daten` der Terminalmarke oder in die Startfehlerliste. (3)(4)(6)–(10) offen; (3) Anzeige in 3b-2b. **Nachtrag F45 B2b-3b-2b-1a (16.10.2026, Plan `features/F45/plan-b2b3b2b1a-v2.md` mit Nachtrag, Advisor `advisor-b2b3b2b1.md` + `advisor-b2b3b2b1a-delta.md`; Schnitt 2b-1a/2b-1b Entscheidung Stefan):** **R2 erledigt** — die Löschlisten-Sperre hängt am Speicherstand der Vermittlung: `beendeLauf` liefert die Zahl der `stefan_abgelehnt` im Lauf, der Server setzt die Löschliste aus, wenn sie > 0 ist (ODER `abgelehnt_durch_stefan` der Klassifikation); Gate f45-b2b3b2b1a-rest (r2): Ablehnung fehlt in permission_denials ⇒ keine Löschung. **R3 erledigt** — `laufOptionen.rueckfrageZugang` (`zugang(laufId, melde)`, ersetzt `rueckfrageSpeicher`) meldet jede Abweichung Speicher/Datei mit Grund in die Startfehlerliste (`GET /api/startfehler`, Leitstand „startproblem“); auch eine nicht zusammensetzbare Datei bei leerem Speicher (Delta D5); Gate (r3). **(6) bewusst so belassen:** Schreibfehler stehen beim Schreiben weiter nur auf der Konsole; vor der Auswertung werden sie über R3 als Abweichung sichtbar, Schreibfehler der `lauf_beendet`-Einträge nach der Auswertung (Lauf-Ende) bleiben nur Konsole (Delta D7). **Speichergröße erledigt** — Schema v1: je Version nur der Zuwachs ab Index `ab`, beim Lesen lückenlos zusammengesetzt (`setzeProtokollZusammen`); gemessen (Skript im Scratchpad, 200 von Stefan abgelehnte Bash-Befehle à ~1900 Zeichen, echter Schreiber und Leser): vorher 42,94 MB / Lesen 194–248 ms, nachher 0,59 MB / Lesen 14–27 ms; Gate (g) < 5 MB. Grenze: Lücke (Wurf nach dem Schreiben, gleiche laufId neu geöffnet) ⇒ VERWEIGERT, über R3 sichtbar. **B7 (E-B7 = A) erledigt** — jeder lokale Prozess kann antworten bleibt DEKLARIERT; je Antwort `herkunft` (`browser` | `nicht_browser`) im Protokoll und Schema, ARCHITECTURE §3; Anzeige in 2b-2 (aus der Vermittlung lesen, nicht aus der Datei — Delta D13); Gate (b7). **Vorgemerkt für 2b-2 (qa B2b-3b-2b-1a, L1):** die R3-Meldung erscheint im Leitstand in der Gruppe „Startproblem“ („Ein Lauf konnte nicht starten.“, `public/leitstand/i18n/de.js:1822`), obwohl der Lauf lief, und die Startfehlerliste geht beim Neustart verloren (dann nur Konsole) — mit der Anzeige von `herkunft` und `abgelehnt_durch_stefan` eigene Einordnung und Text (Fälschung oder Schreibfehler, was tun). Bekannte Testgrenzen: Gate (r2) belegt die Speicher-Quelle nur zusammen mit dem Unit-Test (`beendeLauf`-Zahl), der durchgehende Weg „Kanal-Lauf ohne Abweichung ⇒ kein Startfehler“ ist nur stückweise belegt (Controller-Test, Gate (r3)). **Offen:** R1 (eindeutiger Ablehnungstext je Ablehnung, zählt nur, wenn das CLI-Ergebnis zur tool_use_id genau diesen Text trägt; Gate r1d) in B2b-3b-2b-1b; (3)(4)(7)–(10). **Nachtrag F45 B2b-3b-2b-1b (17.10.2026, Plan `features/F45/plan-b2b3b2b1b-v2.md`, Advisor `advisor-b2b3b2b1b.md`):** **R1 erledigt (für das „Waschen“)** — jede Ablehnung durch Stefan bekommt einen eigenen Text `Stefan hat den Befehl abgelehnt. (Ref <uuid>)` (`ablehnungstextStefan`, Vermittlung), der als Ablehnungsnachricht an die CLI geht; Protokoll (Schema v1, Feld `ablehnung_hash`, Pflicht an `stefan_abgelehnt`) und Speicherstand tragen dessen Hash, `bestaetigeProtokoll` vergleicht ihn mit. Der Abgleich zählt die Ablehnung nur, wenn jedes tool_result ihrer ID im hash-geprüften Rohstrom `is_error` trägt und als String genau diesen Text (`ermittleToolErgebnisse`, `src/claude-code-gateway`; Prüfung im Evaluator, keine Gateway-Option, Argv unverändert, Server unverändert). Gate f45-b2b3b2b1b-r1 (r1d, echter Controller): A über Rückfrage, B statisch gesperrt und von einem Prozess mit Token nachträglich abgelehnt ⇒ VERWEIGERT (main: ERFOLGREICH mit 2); Gegenprobe (r1e) ⇒ ERFOLGREICH. Grenzen (ARCHITECTURE §4, DEKLARIERT): eine echte Rückfrage, die ein lokaler Prozess vor Stefan ablehnt, zählt weiter (B7); wer in den stdout der CLI schreiben kann, umgeht die Klassifikation. Nur die String-Form von `content` zählt (O6, Entscheidung vorgelegt). **Neue Prüfpflicht zu (4) für 2b-2:** im echten Lauf belegen, dass das tool_result den Ablehnungstext wörtlich als String trägt (auch für Subagent-Zeilen) — sonst zählt keine Stefan-Ablehnung (sicher, aber wirkungslos). **Vorgemerkt für 2b-2 (qa B2b-3b-2b-1b, 2):** greift R1, gibt der Abgleich nur `nicht_nur_stefan` ohne Grund zurück — Stefan sieht denselben F-760-Halt wie bei einer echten Verweigerung, die Ursache (Ablehnungstext passt nicht, z. B. Formatwechsel der CLI) steht nur im Rohstrom; mit der Anzeige (3) einen sichtbaren Grund ergänzen. **Offen:** (3)(4)(7)–(10). **Nachtrag F45 B2b-3b-2b-2a-1 (17.10.2026, Plan `features/F45/plan-b2b3b2b2a-v2.md`):** **(3) Teil Server/Evaluator erledigt** — die Terminalmarke eines Kanal-Laufs trägt bei VERWEIGERT `rueckfrage_abgleich` `{ art, grund }` (fester Grund je Ausgang des Abgleichs, `ABGLEICH_GRUENDE`; damit ist der Grund von R1 — z. B. `ablehnungstext_passt_nicht` — sichtbar, Vormerkung qa B2b-3b-2b-1b 2), bei ERFOLGREICH/VERWEIGERT `rueckfrage_zaehlung` (je Art und `nicht_browser`, aus dem Speicherstand, D13) und bei jedem Ergebnis mit verworfenem Protokoll `rueckfrage_abweichung` (R3 dauerhaft, auf 500 Zeichen gekappt; Vormerkung qa L1 Teil „geht beim Neustart verloren“). Anzeige (Abnahme, eigener Grund statt F-760-Standardtext, R3 als eigene Meldung statt „Startproblem“) ⇒ B2b-3b-2b-2a-2. Gate f45-b2b3b2b2a-einschalten (t). Offen: (3)-Anzeige, (4), (7)–(10). **Nachtrag F45 B2b-3b-2b-2a-2 (17.10.2026):** (3) Teil Warteschlange erledigt — Rückfragen in „Deine Entscheidungen“, Herkunft je Antwort in „Zuletzt entschieden“ (`nicht_browser` rot, aus der Vermittlung im Speicher, D13). (3) Teil Abnahme (`abgelehnt_durch_stefan`, eigener Grund statt F-760-Standardtext, R3-Meldung) ⇒ B2b-3b-2b-2a-3. Offen: (3)-Abnahme, (4), (7)–(10). **Nachtrag F45 B2b-3b-2b-2a-3 (17.10.2026, Plan `features/F45/plan-b2b3b2b2a3-v2.md`, Advisor `advisor-b2b3b2b2a3.md`):** **(3) erledigt** — `GET /api/laeufe/<id>` trägt `rueckfrageKanal` (aus daten der Terminalmarke); das Lauf-Detail zeigt Zählung (beschriftet, auch nicht bestätigte Ablehnungen), davon von der Auswertung bestätigte Ablehnungen (`abgelehnt_durch_stefan`, Advisor V3) und unbeantwortete; eine Kanal-Ursache einer Verweigerung (Klassen automatisch / nicht bestätigt / Protokoll) ersetzt den Standardsatz in Lauf-Notiz und F-760-Sichtung, eine echte Verweigerung (`kein_eintrag`, `kein_protokoll`) behält ihn (Advisor V1); R3 als eigene rote Meldung im Lauf-Detail und als „Protokoll-Abweichung“ mit Link in „Deine Entscheidungen“, „Als Nächstes“ und der Startfehler-Liste (Startfehler-Eintrag mit `art: 'rueckfrage_abweichung'`; Vormerkung qa L1 erledigt). Gate f45-b2b3b2b2a3-abnahme, Gate f45-b2b3b2b1a-rest (r3) um `art` ergänzt. Grenze: „Sichtung bestätigt – weiter“ bleibt bei R3 (mögliche Fälschung) mit einem Klick möglich (Advisor M12). Offen: (4), (7)–(10). Nachtrag F45 B2b-3b-2b-2b-1 (17.10.2026, Plan `features/F45/plan-b2b3b2b2b1-v2.md`, Advisor `advisor-b2b3b2b2b1.md`): **(4) vorbereitet** — Auswertung P1 (`tool_input` kanonisch = `input_hash`), P2 (doppelte IDs), P4/P4b (Ablehnungstext wörtlich, auch Subagent-Zeilen); Teil **--resume: im Produkt nicht erreichbar** (kein --resume in `src`, `vorgaengerLaufId` ist ein neuer Lauf) ⇒ P3 „nicht belegbar“ mit diesem Grund, sonst erledigt. Beleg mit dem Nachweislauf (Lauf A: ERFOLGREICH mit `abgelehnt_durch_stefan`; Lauf B: VERWEIGERT `nicht_von_stefan`). Nachtrag F45 B2b-3b-2b-2b-2a (18.10.2026, Nachweislauf 17.10.2026, CLI 2.1.300): **(4) erledigt bis auf Subagent-Zeilen** — Auswertung A (`features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-a-4f857ba9-4008-4f10-8e6f-61a28323f62a.md`): P1 Z. 36–39 `permission_denials[0] (Bash) ↔ Protokoll Eintrag 1` gleich (tool_input kanonisch = input_hash), P2 Z. 41–43 keine doppelte ID, P4 Z. 51–53 Ablehnungstext wörtlich als String (`Protokoll Eintrag 1 ↔ Z18`); Auswertung B (`features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-b-577ea346-ed76-4fad-a58a-26c0cdbe0c59.md`) P1/P2 Z. 36–43 (Write) ebenso. „Mit Abweichung“ jeweils nur wegen der CLI-Version (deklariert 2.1.258, im Lauf 2.1.300) — der Beleg gilt für 2.1.300. P3 (--resume) nicht belegbar, im Produkt nicht erreichbar (wie vorgesehen). **Offen (4)-Rest P4b:** Ablehnungstext in Subagent-Zeilen nicht belegbar (A Z. 56–57: keine Subagent-Zeile, Werkzeugsatz ohne Agent-Werkzeug) — erst mit einem Lauf belegbar, der ein Agent-Werkzeug hat. Offen: (4)-P4b, (7)–(10).
Feature/Run: Entdeckt: F45 B2b-3b-1b (Advisor-Pass, code-reviewer, qa), 16.10.2026.

**F-1129** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Datei-Köpfe nach docs/kommentar-standard.md werden von keinem Gate geprüft und können veralten.
Beschreibung: Der Kommentar-Standard verlangt je Datei einen Kopf (Zweck, „Wird aufgerufen von“, Wichtig). Kein Gate prüft, dass der Kopf vorhanden ist oder dass die unter „Wird aufgerufen von“ genannten Pfade existieren — umbenannte oder entfernte Aufrufer bleiben im Kopf stehen.
Fundstelle: `docs/kommentar-standard.md`; Datei-Köpfe in `scripts/`, `src/`, `public/leitstand/`.
Auswirkung: Mittel — veraltete Köpfe führen Leser und Modelle in falsche Dateien; mit W2 (Aufteilung des Servers) ändern sich viele Aufrufer zugleich.
Maßnahme: W2 (fixpaket-f45 §3): Gate „Kopf vorhanden, ‚Wird aufgerufen von‘-Pfade existieren“.
Status: offen.
Feature/Run: Entdeckt: Auftrag F45 W1 (Stefan, E-WART-1), 16.10.2026.

**F-1130** · `PROCESS_IMPROVEMENT` · P3 · offen
Titel: Kommentar-Köpfe teils sehr lang (z. B. src/review-stand/index.ts) — Token- und Lesekosten.
Beschreibung: Einige Datei-Köpfe tragen Entstehungsgeschichte, Plan- und Advisor-Verweise über viele Zeilen; jeder Lesezugriff (Mensch, Modell, Prüfrollen) bezahlt sie.
Fundstelle: `docs/kommentar-standard.md`; z. B. `src/review-stand/index.ts`, `scripts/leitstand-server.mjs`.
Auswirkung: Gering bis mittel — höhere Token- und Lesekosten, wichtige Hinweise gehen im Verlauf unter.
Maßnahme: W2 (fixpaket-f45 §3): Kommentar-Standard verschlanken (Kopf auf Zweck, Aufrufer, Wichtig; Geschichte in Akte und git).
Status: offen.
Feature/Run: Entdeckt: Auftrag F45 W1 (Stefan, E-WART-1), 16.10.2026.

**F-1131** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: W1-Regel „neue Routen nur in `scripts/leitstand/routen-*.mjs`“ (ARCHITECTURE §1) kollidiert mit `check-f813-csrf` (4) (kein `.method` in `scripts/leitstand/*.mjs`).
Beschreibung: Die Wachstumsbremse (F45 W1) verlangt, dass neue Routen in `scripts/leitstand/routen-*.mjs` dispatchen. Gate `check-f813-csrf` (4) (`scripts/check-f813-csrf.mjs:296-301`) meldet aber jedes Modul unter `scripts/leitstand/`, das die HTTP-Methode selbst auswertet — Routen sollen hinter dem zentralen CSRF-Haken in `requestHandler` bleiben. Eine Route mit Methodenweiche (z. B. die Rückfrage-Routen, `leitstand-server.mjs` `req.method`) lässt sich deshalb nicht ohne Verhaltensänderung in ein Routen-Modul verschieben. Advisor-Pass B2b-3b-2a Befund B1 (`features/F45/advisor-b2b3b2a.md`).
Fundstelle: ARCHITECTURE.md §1 (Wachstumsbremse), `scripts/check-f813-csrf.mjs` (4), `scripts/check-wachstumsbremse-server.mjs`, `scripts/wachstumsbremse-server.json`.
Auswirkung: Mittel — bis zur Klärung kann keine Route mit Methodenweiche regelkonform entstehen oder umziehen.
Maßnahme: In W2 (Aufräumpaket Server-Module) das Muster für Routen-Module mit Methodenweiche und CSRF-Haken festlegen (z. B. f813 (4) prüft die Aufrufstelle hinter dem Haken statt `.method` im Modul); bis dahin keine neuen Routen. Der Umzug der Rückfrage-Routen geht nach W2 (Entscheidung Stefan, B2b-3b-2a), `check-f813-csrf` bleibt bis dahin unverändert.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3b-2a (Advisor-Pass B1), 16.10.2026; Entscheidung Stefan (Challenger) 16.10.2026.

**F-1132** · `TECH_DEBT` · P2 · offen
Titel: Restpunkte von F45 B2b-3b-2b-2a-1 (Rückfrage-Kanal einschalten, Server/Evaluator) aus Advisor, code-reviewer und qa.
Beschreibung: (1) qa M2: `rueckfrage_zaehlung` zählt nur Antworten (`stefan_erlaubt`, `stefan_abgelehnt`, `frage_beantwortet`, davon `nicht_browser`) — abgelaufene, beim Lauf-Ende abgelehnte und automatisch abgelehnte Rückfragen fehlen, und bei FEHLGESCHLAGEN (auch Abbruch während eine Rückfrage wartet) gibt es keine Zählung; laufen alle Rückfragen ab, sieht `{0,0,0,0}` aus wie „Kanal nicht benutzt“. Vor der Anzeige (2a-2) entscheiden: Feld für unbeantwortete Rückfragen und Zählung auch bei FEHLGESCHLAGEN. Die Zählung enthält auch nicht bestätigte Ablehnungen (Advisor B10) — in der Anzeige beschriften. (2) qa M3 / Advisor B7: dass ein Lauf in einer Projektinstanz bzw. einem zur Laufzeit angelegten Projekt die Projekt-url in seiner mcp-config bekommt, ist nur am Quelltext belegt (gemeinsame Regel `scripts/_rueckfrage-aus-pruefung.mjs`) und über `rueckfrageOptionFuer` funktional — kein Lauf über `baueProjektHandlerMap` (reicht keine Vermittlung durch); im echten Lauf (2b-2b) belegen. (3) qa N1: mit `LEITSTAND_RUECKFRAGE=1` wartet bis zur Anzeige jede vorgelegte Rückfrage 10 min und wird abgelehnt (drei hintereinander reichen bei 30 min Zeitgrenze für einen TIMEOUT); Warnung nur in der Konsolenzeile — Kanalstand in 2a-2 sichtbar machen (z. B. GET /api/zustand, ohne neue Route). (4) qa N2: der Rot-Nachweis gegen main ist für Gate (o1)(o2)(r)(o3) nur „Modul fehlt“; echt rot sind (d) (`/api/api` ⇒ 404 ⇒ deny) und (t); (i) ist auf main grün. (5) qa N3: Wortlaut des Vorrangs `frage_stefan` vor „- [x] Blockiert“ ist nicht getestet; ob nach „Frage ungültig — nicht an Stefan gestellt“ Blockiert gilt, ist offen. (6) qa N4: Zählung und R3 sind nicht durchgehend über echten Server, echte Vermittlung und echten Controller belegt, nur stückweise (Vermittlung, Controller mit Attrappe, Evaluator, Gate (t)). (7) code-reviewer 1/2: Grenzen der Quelltext-Regel — Klammern in Strings/Kommentaren einer Argumentliste, umbenannter Import, berechneter Schlüssel (DEKLARIERT im Kopf des Helfers). (8) code-reviewer 9: `kappeGrund` kann ein Surrogatpaar teilen (kosmetisch, wie F-1128 (9)). (9) Advisor B8/B9: ohne `ortBLauf` prüft kein Init-Gate, ob der Rückfrage-Server geladen ist; ob ein Lauf mit Kanal-Argv die Startfreigabe besteht, ist offen (2b-2b). (10) Korrektur nach Cloud-Prüfung (npm run check Exit 1): die neuen Evaluator-Codes `umgehungsverdacht` und `keine_rueckfrage_oder_nicht_lesbar` fehlten in `GRUND_SCHLUESSEL` (public/leitstand/chat-laufstand.js) und den Wörterbüchern — Drift-Schutz public/leitstand/chat-laufstand.test.mjs rot; nachgetragen in de/en/tr/ru; Ursache: lokale Testauswahl ohne public/leitstand, bei Änderungen an src/result-evaluator laufen die Oberflächen-Tests ab jetzt mit.
Fundstelle: `scripts/leitstand/rueckfrage-vermittlung.mjs` (zaehlungVon), `src/result-evaluator/index.ts` (Kanal-Felder in daten), `scripts/_rueckfrage-aus-pruefung.mjs`, `scripts/check-f45-b2b3b2b2a-einschalten.mjs`, `scripts/leitstand/rueckfrage-einschalten.mjs`, `src/rueckfrage/index.ts` (RUECKFRAGE_REGEL).
Auswirkung: Mittel — (1)(3) betreffen die Bedienbarkeit, sobald der Kanal genutzt wird; der Kanal ist bis 2a-2 ohne Anzeige und darf nicht für echte Läufe genutzt werden.
Maßnahme: (1)(3)(5) mit B2b-3b-2b-2a-2 (Plan und Advisor-Pass), (2)(6)(9) mit B2b-3b-2b-2b (echter Lauf), (4)(7)(8) bei der nächsten Berührung.
Status: offen. Nachtrag F45 B2b-3b-2b-2a-2 (17.10.2026, Schnitt Teil A | Teil B nach Advisor „zu groß“): **(3) erledigt** — `GET /api/zustand` trägt `rueckfrageStatus` (`{ an: true, warteGrenzeMs }` | `{ an: false }`, ohne Grund — der steht nur in der Startzeile, Advisor M1); bei „an“ Band (mit Anzahl, nächster Frist und Link) und Zahl am Navigationspunkt; Gate f45-b2b3b2b2a2-anzeige (b), Render-Nachweis k2. (1) und (5) ⇒ B2b-3b-2b-2a-3 (Teil B). **Nachtrag F45 B2b-3b-2b-2a-3 (17.10.2026):** **(1) erledigt** — `rueckfrage_zaehlung` hat zusätzlich `abgelaufen`, `lauf_ende` (einschließlich der beim Lesen offenen: zwischen Lesen und `beendeLauf` liegt kein await, Advisor M1 — korrigiert M10 aus `advisor-b2b3b2b2a2.md`) und `automatisch` (auch Ablehnungen über der Protokollgrenze ohne Eintrag) und steht auch bei FEHLGESCHLAGEN; alle null ⇒ Anzeige „keine Rückfrage“, ohne Kanal kein Block; ohne Kanal daten bitgleich (Test, Gate (f)). Bestandsmarken mit vier Feldern ⇒ neue Felder „nicht erfasst“. **(5) erledigt** — Vorrang `frage_stefan` vor „- [x] Blockiert“ per Test; Entscheidung: „Frage ungültig — nicht an Stefan gestellt“ ⇒ einmal korrigiert neu fragen, scheitert auch das, gilt es wie keine Antwort (neue Regelzeile, Wortlaut an rueckfrage-mcp.mjs gekoppelt, ARCHITECTURE §3). Offen: (2)(4)(6)–(9). Nachtrag F45 B2b-3b-2b-2b-1 (17.10.2026, Plan `features/F45/plan-b2b3b2b2b1-v2.md`, Advisor `advisor-b2b3b2b2b1.md`): **(2)(6)(9) vorbereitet** — Auswertung P6 (url der Instanz indirekt: Protokoll im Kontrollzustand der Projektinstanz, fremdes Token ⇒ 403 ohne Eintrag), P9 (Zählung der Terminalmarke = Zählung aus der Protokoll-Datei mit derselben Regel `zaehleProtokollEintraege`), P12 (R3 im echten Pfad), P7 (init-Zeile mit Server `rueckfrage`), P10 (Startfreigabe mit Kanal-Argv bestanden). Die mcp-config eines Laufs ist nirgends gespeichert (Argv) ⇒ `env`/`timeout` nicht aus dem Lauf belegbar, im Code festgelegt und getestet, Wirkung DEKLARIERT (Advisor V3, Prozesszeile verworfen). Kanal-Argv für die Startfreigabe in `docs/harness/startfreigabe-erneuern.md` §8. Nachtrag F45 B2b-3b-2b-2b-2a (18.10.2026, Nachweislauf 17.10.2026 in der Projektinstanz `haushaltsbuch2`, CLI 2.1.300; A = `features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-a-4f857ba9-4008-4f10-8e6f-61a28323f62a.md`, B = `features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-b-577ea346-ed76-4fad-a58a-26c0cdbe0c59.md`): **(2) erledigt für die Projektinstanz** — P6 „erfüllt“ in A (Z. 64–67) und B (Z. 62–65): Protokoll im Kontrollzustand der Instanz `haushaltsbuch2`, url-Pfad `…/api/projekte/haushaltsbuch2` (indirekt). Teil „zur Laufzeit angelegtes Projekt“ aus den Dateien nicht belegbar (die Auswertung sagt nicht, wie die Instanz entstand) — offen. **(6) erledigt für Zählung und R3-Normalfall** — P9 „erfüllt“ (A Z. 83–91: erlaubt 1, abgelehnt 1, Frage 1, Marke = Datei; B Z. 80–88: automatisch 1, Marke = Datei), P12 „erfüllt“ (A Z. 100–103, B Z. 99–102: keine `rueckfrage_abweichung` über echten Server, echte Vermittlung und echten Controller). R3-Positivfall im echten Lauf nicht erzeugbar (A Z. 104, B Z. 103) — bleibt nur über Gate f45-b2b3b2b1a-rest (r3) belegt, offen. **(9) erledigt** — P7 (A Z. 69–74, B Z. 67–72: Server `rueckfrage` connected, `frage_stefan` in tools, `rechte_pruefen` verborgen) und P10 (A Z. 93–95, B Z. 90–92: run_prepared und init mit Server `rueckfrage`, Startfreigabe mit Kanal-Argv bestanden); „mit Abweichung“ nur wegen der CLI-Version. Offen: (2)-Laufzeit-Projekt, (4), (6)-R3-Positivfall, (7), (8).
Feature/Run: Entdeckt: F45 B2b-3b-2b-2a-1 (Advisor-Pass, code-reviewer, qa), 17.10.2026.

**F-1133** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2b-3b-2b-2a-2 (Rückfrage-Kanal: Oberfläche, Teil A Warteschlange) aus code-reviewer, qa und design-guardian.
Beschreibung: (1) qa 7: dass ein echter Projektlauf seinen Laufordner `<basis>/<laufId>` vor der ersten Rückfrage hat (sonst `laufAktiv` falsch ⇒ der Leitstand fragt `/api`, die Karte fehlt, Ablehnung nach 10 min), ist nur mit der Render-Instanz (Ordner vorab) belegt — im echten Lauf (2b-2b) prüfen. (2) qa 7: läuft ein Lauf in der Workforce ohne Selbsteintrag im Register, fragt der Kanal das Register je Takt erneut (kein Treffer, nichts gemerkt) — zusätzliche Last, kein Fehler. (3) qa 8: nach dem Neuladen der Seite ohne aktiven Lauf ist „Zuletzt entschieden“ eines Projektlaufs unsichtbar (DEKLARIERT, ARCHITECTURE §3). (4) qa 11: der Leerzustand „alles geklärt“ nennt die Rückfragen des Laufs nicht als geprüfte Quelle — bewusst, weil der Text auch ohne Kanal gilt; die Quellenliste zeigt sie. (5) code-reviewer 2/qa 4: die Zustandslogik von `public/leitstand/rueckfrage-kanal.js` hat keinen Unit-Test; der Render-Nachweis belegt nur Freitext über zwei Takte, leere Antwort (Meldung verschwindet beim Tippen), Erlauben, Ablehnen und Option — **unbelegt** sind fehlgeschlagener GET (Karten bleiben sichtbar), 400/5xx mit neuem Versuch, 404/409 mit Dauersperre und der Nachlauf. (7) qa Nachpass 4: „Zuletzt entschieden“ trägt weiter den Platzhaltertext der Entscheidungsartefakte mit „kommt“ über dem echten Kanal-Block (Unterüberschrift „Rückfrage-Kanal“) — bis es die Leseroute gibt. (8) code-reviewer Nachpass 5: läuft das Zeitlimit des POST ab, meldet die Karte „nicht gesendet“, obwohl der Server die Entscheidung schon angenommen haben kann; ein zweiter Klick bekommt 409 (sicher, die erste gilt). (9) design-guardian Nachpass 5: das Band bei defektem Abruf ist nur getestet, nicht gerendert. (10) design-guardian Nachpass 3: kein Hauptknopf, solange eine Kanal-Rückfrage oben steht — bewusste Abweichung vom Leitprinzip „genau ein Hauptknopf“ (`docs/design/abgleich-f46.md` §4.4), **Bestätigung durch Stefan offen**. (6) qa 3: Frage und Optionen bleiben ohne `bidi-override` (Lesbarkeit rechts-nach-links-Sprachen) — DEKLARIERT.
Fundstelle: `public/leitstand/rueckfrage-kanal.js`, `public/leitstand/rueckfrage-daten.js`, `scripts/leitstand-server.mjs` (GET /api/projekte laufAktiv), ARCHITECTURE §3.
Auswirkung: Gering, solange der Kanal nicht für echte Läufe genutzt wird.
Maßnahme: (1)(2) mit B2b-3b-2b-2b (echter Lauf); (5)(8)(9) bei der nächsten Berührung von rueckfrage-kanal.js; (10) Entscheidung Stefan; (3)(4)(6)(7) bewusst so. **Nachtrag F45 B2b-3b-2b-2a-3 (17.10.2026):** (10) **bestätigt — E-Hauptknopf = A (Stefan, 17.10.2026):** bei Rückfragen gibt es keinen gefüllten Hauptknopf; bewusste, auf wartende Kanal-Rückfragen begrenzte Abweichung von `docs/design/abgleich-f46.md` §4.4 (ARCHITECTURE §3).
Status: offen. Nachtrag F45 B2b-3b-2b-2b-1 (17.10.2026, Plan `features/F45/plan-b2b3b2b2b1-v2.md`, Advisor `advisor-b2b3b2b2b1.md`): **(1) vorbereitet** — die Anleitung lässt Stefan die Sekunden bis zur ersten Karte notieren (Lauf A, Projekt `haushaltsbuch2`). Nachtrag F45 B2b-3b-2b-2b-2a (18.10.2026, Nachweislauf 17.10.2026): **(1) erledigt (indirekt)** — `features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-a-4f857ba9-4008-4f10-8e6f-61a28323f62a.md` P13 (Z. 106–109): 3 Antworten, alle aus dem Browser; P9 (Z. 89): `abgelaufen` 0. Wäre `laufAktiv` falsch gewesen, hätte der Leitstand `/api` gefragt, die Karte hätte gefehlt und jede Rückfrage wäre nach 10 min abgelaufen. Grenze: belegt ist, dass die Karte innerhalb der Wartegrenze sichtbar wurde, nicht, dass der Laufordner schon vor der ersten Rückfrage bestand; die notierten Sekunden bis zur ersten Karte stehen nicht in den Dateien. Offen: (2), (5), (8), (9).
Feature/Run: Entdeckt: F45 B2b-3b-2b-2a-2 (code-reviewer, qa, design-guardian), 17.10.2026.

**F-1134** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Secret-Scan (gitleaks) läuft lokal ohne Docker/gitleaks nicht — Test-Attrappen mit Geheimnis-Form erst in der CI rot (B2b-3b-2b-2a-2).
Beschreibung: Nach dem Commit von B2b-3b-2b-2a-2 war der CI-Schritt „Secret-Scan (gitleaks)“ rot, Regel curl-auth-header, zwei Funde: wörtliche Test-Attrappen `curl -H "Authorization: Bearer …"` in `scripts/check-f45-b2b3b2b2a2-anzeige.mjs` und `scripts/leitstand/rueckfrage-vermittlung.test.mjs` (Prüfung der Maskierung in `entschiedene()`). Lokal meldete `scripts/check-secrets.mjs` nur „Secret-Scan NICHT gelaufen: weder gitleaks noch Docker im PATH“ — der Lauf galt trotzdem als grün; weder code-reviewer noch qa sahen die Form als Risiko. Korrektur: Attrappen zur Laufzeit zusammengesetzt (Muster `scripts/leitstand-abgelehnte-befehle.test.mjs:23`; `BEARER`, `AUTH_KOPF`, `PASSWORT`), die Prüfungen verlangen jetzt zusätzlich die Maske (`MASKE`) im maskierten Wert; keine Allowlist, keine `.gitleaksignore`, CI unverändert.
Fundstelle: `scripts/check-secrets.mjs` (lokaler Rückfall ohne Scanner), Test-Attrappen in `scripts/**/*.test.mjs` und `scripts/check-*.mjs`.
Auswirkung: Gering bis mittel — ein Korrekturcommit je Vorfall; die Regel wirkt erst nach dem Push.
Maßnahme: Attrappen mit Geheimnis-Form (Authorization/Bearer, `token=`, `api_key`, `password=`, Schlüssel-Präfixe) von Anfang an zur Laufzeit zusammensetzen; der Challenger nimmt Authorization/Bearer (und die übrigen Formen von `MUSTER` in `scripts/leitstand/geheimnisse-maskieren.mjs`) in seine Mustersuche über den Branch-Diff auf; optional ein lokaler Ersatz-Scan ohne Docker (Mustersuche über den Diff) in `check-secrets`.
Status: offen.
Feature/Run: Entdeckt: CI-Lauf nach Commit 0d4ee07 (F45 B2b-3b-2b-2a-2), 17.10.2026.

**F-1135** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2b-3b-2b-2a-3 (Rückfrage-Kanal: Abnahme) aus code-reviewer, qa und design-guardian.
Beschreibung: (1) qa 2: `views/auftrag-vorbereitung.js:69` (`pruefeAggregat`) und `chat-laufstand.js:51-53` lesen jeden Startfehler mit passender laufId als „nicht gestartet“, auch einen R3-Eintrag (`art: 'rueckfrage_abweichung'`) — heute nicht erreichbar, weil der Kanal nur Workflow-Schritte `ausfuehrung` bekommt (Router- und Chat-Läufe nie, Advisor E7); bei einer Ausweitung des Kanals dort ausfiltern. (2) qa 7: fehlt `rueckfrage_zaehlung` ganz (Kanal an, Zählung nicht gelesen, z. B. Kanal für den Lauf nicht offen), zeigt der Block „Zählung nicht lesbar“ wie bei einer fremden Form. (3) qa 9: der R3-Text („Deine Ablehnungen zählen nicht … Lauf wiederholen“) hängt nicht vom Ergebnis ab — neben einem ERFOLGREICH ohne Ablehnung wirkt er alarmierend. (4) qa 10 / design-guardian 9: ohne Unit-Test bzw. Render: R3-Karte in `views/attention.js` (nur über Render a5), Live-Karte „Als Nächstes“ (`live-anzeige.js:409`, nur Textwechsel), Cache-/Rückzugsregel `kanalDerSichtung` (`views/workflows.js`) und ein Regressionstest „offener Sichtungs-Dialog bleibt, wenn der Kanal-Grund kommt“ (code-reviewer Nachpass A(c), z. B. views/workflows-dialog.test.mjs); Sonderfall: scheitert der erste Abruf, kommt der Grund erst nach dem 30-s-Rückzug und schließt dann einen inzwischen geöffneten Sichtungs-Dialog (A(b), selten); im Render fehlen a4–a6 in tr/ru, E-186-Block und unbekannter Code (nur Unit-Test). (5) design-guardian 6/7: Zwischenzeilen des Zahlenblocks ohne Abstufung, Abstand unter `.lauf-daten` 6 px statt 12 px; Block auch bei ERFOLGREICH immer offen (Vorschlag `<details>`) — Entscheidung beim Planer. (6) code-reviewer 8: `kanalJeLauf` wächst je Sitzung unbegrenzt (vernachlässigbar); `GET /api/laeufe/<id>` liest die Checkpoint-Kette für zwei Projektionen zweimal (Advisor M4, bewusst). (7) Advisor M12: „Sichtung bestätigt – weiter“ bleibt bei R3 (mögliche Fälschung) mit einem Klick möglich.
Fundstelle: `public/leitstand/rueckfrage-abnahme.js`, `public/leitstand/views/{attention,live-anzeige,workflows,auftrag-vorbereitung}.js`, `public/leitstand/chat-laufstand.js`, `public/leitstand/style.css`, `scripts/leitstand-server.mjs` (Sichtungs-Halt).
Auswirkung: Gering, solange der Kanal nicht für echte Läufe genutzt wird; (7) betrifft die Absicherung gegen eine gefälschte Datei.
Maßnahme: (7) Entscheidung Stefan vor dem Einschalten (2b-2b); (1) bei einer Ausweitung des Kanals; (2)–(6) bei der nächsten Berührung.
Status: offen. Nachtrag F45 B2b-3b-2b-2b-1 (17.10.2026, Plan `features/F45/plan-b2b3b2b2b1-v2.md`, Advisor `advisor-b2b3b2b2b1.md`): **(7) erledigt — E-R3-Sichtung = B (Stefan, 17.10.2026):** bei R3 braucht „Sichtung bestätigt – weiter“ einen zweiten, ausdrücklichen Schritt („Protokoll-Abweichung ansehen“ zeigt den R3-Text escaped, dann „Abweichung gesehen – Sichtung bestätigt – weiter“), ohne R3 bitgleich ein Klick; DEKLARIERT als Bedien-Hürde (ARCHITECTURE §3), Gate f45-b2b3b2b2b1-nachweis (a), Unit-Test `views/workflow-eingriffe.test.mjs`.
Feature/Run: Entdeckt: F45 B2b-3b-2b-2a-3 (code-reviewer, qa, design-guardian), 17.10.2026.

**F-1136** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2b-3b-2b-2b-1 (Rückfrage-Kanal: Vorbereitung echter Nachweislauf) aus code-reviewer, qa und design-guardian.
Beschreibung: (1) qa 4 / code-reviewer 3: **Entscheidung Stefan offen** — die Projekt-Startfreigabe von `haushaltsbuch2` deklariert eine ältere CLI als die installierte; E-188 vergleicht nur Deklaration gegen Baseline, der Lauf startete also trotzdem und P10 stünde auf „erfüllt“. Wie die Startfreigabe eines Projekts erneuert wird, beschreibt `docs/harness/startfreigabe-erneuern.md` nicht (Workforce-Installation). Die Anleitung hält in Schritt 0 an, bis Stefan entscheidet (erneuern — Weg zuerst beschreiben — oder bewusst abweichend fahren). (2) qa 8: kommt R3 erst nach dem Öffnen der Sichtung, schließt der Dialog („Stand geändert“), die gerettete Begründung trägt das alte Kennzeichen und wird beim Neuöffnen verworfen (Plan v2 sagte „gerettet“) — Stefan tippt neu. (3) qa 7 behoben (Kanal-Stand nicht ladbar ⇒ Bestätigung gesperrt); Rest: nach dem 30-s-Rückzug schließt ein offener Sichtungs-Dialog, sobald der Stand geladen ist. (4) code-reviewer 5: P13 ist ohne Zählung in der Terminalmarke allein aus dem Protokoll „erfüllt“ (Detail nennt „Terminalmarke nicht_browser: —“). (5) code-reviewer 11: `--aus` prüft lexikalisch vor realpath; eine Junction aus einem erlaubten Ordner in den Kontrollzustand geht durch, eine vorhandene Datei wird überschrieben — nur Stefan setzt `--aus`. (6) code-reviewer 12: `ANTWORT_ARTEN` und die tool_result-Zerlegung sind im Werkzeug nachgebaut (nicht exportiert in `src/rueckfrage/protokoll.ts` bzw. `src/claude-code-gateway`); `ersetzeOrt` baut die Schreibweisen von `neutralisiereText` nach (feste Platzhalter). (7) code-reviewer 15 / qa 9: Doppelklick auf „Protokoll-Abweichung ansehen“ trifft den Bestätigungsknopf nur wegen des Layouts nicht (bei 1440 rutscht er ~120 px); keine Absicherung im Code, nicht bei 390 gemessen. (8) design-guardian 5 / code-reviewer 14: Render-Protokoll liest die Begründung als Text statt `.value` (Spalte leer, „Begründung bleibt“ nur über die Bilder belegt), Fokusziel nach Schritt 2 nicht protokolliert. (10) **neu (E-F-1136 (1) = B):** der Leitstand startet einen Projektlauf trotz abweichender CLI-Version gegenüber der Projekt-Startvorlage (E-188 vergleicht nur Deklaration gegen Baseline, das Band „CLI-Version geändert“ gilt nur der Workforce-Startvorlage) — klären, ob die Startfreigabe für Projekte bei abweichender installierter CLI eine Sperre sein soll (2b-2b-2). (9) qa 2: unerwartete Karten im echten Lauf — die Anleitung sagt „Ablehnen“, das Werkzeug wertet sie mit aus; ob das Modell Umwege versucht, zeigt erst der Lauf.
Fundstelle: `scripts/leitstand/nachweis-rueckfrage-auswerten.mjs`, `public/leitstand/views/workflows.js` (retteBegruendung, kanalDerSichtung), `docs/harness/rueckfrage-nachweislauf.md` Schritt 0, `features/F45/nachweise/b2b3b2b2b1/render/`.
Auswirkung: Gering; (10) betrifft die Absicherung jedes Projektlaufs nach einem CLI-Update.
Maßnahme: (1) entschieden; (10) mit 2b-2b-2 (zusammen mit der Erneuerung der Startfreigabe für Projekte und mit Kanal-Argv); (2)(3)(7) bei der nächsten Berührung der Sichtung; (4)(5)(6) bei der nächsten Berührung des Werkzeugs; (8) mit dem nächsten Render-Nachweis.
Status: offen. Nachtrag 17.10.2026: **(1) entschieden — E-F-1136 (1) = B (Stefan):** der Nachweislauf fährt bewusst mit der installierten CLI, auch wenn haushaltsbuch2 eine ältere Version deklariert; die Startfreigabe für Projekte wird in 2b-2b-2 zusammen mit der Kanal-Startfreigabe beschrieben und erneuert. Umsetzung: das Nachweis-Werkzeug meldet CLI-abhängige Punkte (P1, P2, P4, P4b, P5, P7, P8, P10, P11) bei abweichender Version „erfüllt mit Abweichung“ (deklariert aus Laufakte werkzeug_version_deklariert, im Lauf aus der init-Zeile claude_code_version), ohne ermittelbare Version „nicht belegbar“; Anleitung Schritt 0 hält nicht mehr an, sondern notiert beide Versionen. Offen: (2)–(10). Nachtrag 18.10.2026: **(10) entschieden — E-F-1136 (10) = B (Stefan): Warnung, keine Sperre.** Daten in F45 B2b-3b-2b-2b-2b-1: je Projektinstanz einmal `vergleicheCliVersion` gegen `werkzeugVersionDeklariert` der Projekt-Startvorlage (`erzeugeProjektCliHinweis`, `scripts/leitstand/cli-version.mjs`; installierte Version aus der einen Abfrage beim Start), additiv als `projektCliHinweis` in GET /api/zustand (Form wie `cliHinweis`); der Projektlauf startet unverändert (Gate `f45-b2b3b2b2b2b1-projekt-cli` (p1)–(p3)). Anleitung „Projekt-Startfreigabe erneuern“ in `docs/harness/startfreigabe-erneuern.md`. Anzeige folgt in 2b-2b-2b-2. Offen: (2)–(9), (10) nur noch die Anzeige. Nachtrag 18.10.2026 (F45 B2b-3b-2b-2b-2b-2): **(10) Anzeige erledigt** — `projektCliHinweis` als eigene Zeile im Band `#start-hinweis` (Warnung, amber; `projekt-cli-hinweis.js`, `start-hinweis.js`) und als Zeile auf Freigabe- und Abnahmeseite (Freigabe: „Die installierte Claude-Code-Version (X) weicht von der Startfreigabe dieses Projekts (Y) ab — der Lauf startet trotzdem, sein Ergebnis gilt …“; Abnahme: „… weicht derzeit … ab — das Ergebnis gilt trotzdem …“ — der Hinweis beschreibt den heutigen Stand, nicht die Version des Laufs; Verweis auf die Anleitung); keine Sperre, kein Klick; de/en/tr/ru; Render-Nachweis `features/F45/nachweise/b2b3b2b2b2b2/render/`. Offen: (2)–(9).
Feature/Run: Entdeckt: F45 B2b-3b-2b-2b-1 (code-reviewer, qa, design-guardian), 17.10.2026.

**F-1137** · `PROCESS_IMPROVEMENT` · P1 · erledigt durch F45 K
Titel: Wissensgrenze des Claude-Projekts durch state/findings.md.
Beschreibung: Das Claude-Projekt, das das Repo synchronisiert, stand bei 1,78 von 2,0 MB Wissensgrenze; `state/findings.md` allein hatte 1 597 930 B und wuchs um ≈ 40 KB/Tag, weil erledigte Einträge nie das Register verließen (Challenger, 17.10.2026).
Fundstelle: `state/findings.md`.
Auswirkung: Bald kein Platz mehr für Projektwissen im Claude-Projekt; jede Sitzung, die das Register liest, trägt den Ballast.
Maßnahme: F45 K: 413 erledigte Einträge (Status beginnt mit gelöst/behoben/erledigt/korrigiert, E-K-1) wörtlich nach `state/findings-archiv.md` verschoben; `state/findings.md` danach 907 536 B (−43 %). Archiv nur bei Bedarf lesen (CLAUDE.md). Wirkung auf das Claude-Projekt erst, wenn Stefan `state/findings-archiv.md` dort nicht synchronisiert. Künftig gesammelt nachziehen, sobald das Register wieder wächst.
Feature/Run: F45 K „Kontext-Diät“, Branch `f45/k-kontext-diaet`, 17.10.2026 (Plan `features/F45/plan-k-v2.md`).

**F-1138** · `PROCESS_IMPROVEMENT` · P2 · erledigt durch F45 K
Titel: ARCHITECTURE.md wuchs als Pflichtlektüre von 10 KB auf 40 KB.
Beschreibung: `ARCHITECTURE.md` ist Pflichtlektüre jeder Sitzung (CLAUDE.md) und wuchs vom 11.10. bis 17.10.2026 von ≈ 10 KB auf 40 094 B, getrieben von Detailabschnitten zum Rückfrage-Kanal (§3/§4); ≈ 7 000 Token mehr je Sitzung. Die Projektkarte kürzte §1 schon vorher auf 2000 Zeichen, die Rollen im Lauf sahen W1 und die Kanal-Grenzen nicht.
Fundstelle: `ARCHITECTURE.md`.
Auswirkung: Kontextkosten jeder Sitzung; Regeln im Rauschen der Herleitung.
Maßnahme: F45 K: Kern 17 332 B (Deckel 17 800 B) mit jeder Regel als Satz (Durchsetzungsgrad sichtbar); Detailtext wörtlich in `docs/architektur/` (module, kette, wachstumsbremse, lokale-dateien, arbeitsordner, rueckfrage-kanal); Gate `check-f45-k-kontext` (Deckel `scripts/architektur-kern.json`, nur senkbar; Verweise und Rückverweise; keine Versionsnummer in den Details).
Feature/Run: F45 K „Kontext-Diät“, Branch `f45/k-kontext-diaet`, 17.10.2026 (Plan `features/F45/plan-k-v2.md`, Advisor `features/F45/advisor-k.md`, `advisor-k-delta.md`).

**F-1139** · `TECH_DEBT` · P3 · offen
Titel: Workboard liest das Findings-Archiv nicht.
Beschreibung: Seit F45 K stehen erledigte Findings in `state/findings-archiv.md`; GET /api/workitems (`scripts/leitstand-server.mjs`, parseFindings) liest nur `state/findings.md`. Folgen: die Spalte „Abgenommen“ verliert die archivierten Karten; „Zum Eintrag“-Links alter Aufträge auf archivierte Kennungen finden nichts; die Harness-Ansicht (`scripts/leitstand/routen-harness.mjs`) listet das Archiv nicht; Jarvis/Router (Projektkontext, ohne CLAUDE.md) kennen das Archiv nicht; Code-Kommentare „state/findings.md F-nnn“ zeigen teils auf archivierte Einträge (Kopf von findings.md verweist auf das Archiv). Offene Befunde und der VS-Code-Link sind unberührt (E-K-2, Stefan 17.10.2026: hingenommen).
Fundstelle: `scripts/leitstand-server.mjs` (Workboard-Leser), `public/leitstand/entwicklung-daten.js`, `public/leitstand/attention-daten.js`.
Auswirkung: Gering; erledigte Einträge sind per Datei nachlesbar.
Maßnahme: Bei Bedarf das Archiv lesend dazunehmen — braucht Server-Zeilen, bis W2 per Ausgleich (Auslagern reiner Helfer), sonst mit W2.
Feature/Run: F45 K „Kontext-Diät“ (Advisor `features/F45/advisor-k.md` Befund 8), 17.10.2026.

**F-1140** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 K (Kontext-Diät) aus code-reviewer und qa.
Beschreibung: (1) `scripts/check-f45-k-kontext.mjs` kopiert Dateinamen-Sammlung, gitignore-Regel und Versionsmuster aus `scripts/check-docs.mjs` (dort nicht exportiert) und `leseReferenz` aus `scripts/check-wachstumsbremse-server.mjs` — Drift möglich; Kandidat für ein gemeinsames Hilfsmodul (W2). (2) `scripts/check-f21-workboard.mjs` hält die ERLEDIGT-Wörter als Kopie von `src/workboard/findings.ts` (nicht exportiert; Export wäre Produktcode). (3) Das Gate durchläuft das ganze Repo für Verweise ohne `/` (wie check-docs, ein weiterer Lauf). (4) Grammatik-Grenzen: Ordnerverweise mit unbekanntem erstem Segment (Tippfehler) bleiben ungeprüft; gitignore nur exakt/Basisname, keine Globs; Datumsausnahme nur TT.MM.JJJJ; prozent-kodierte Links nicht dekodiert; Windows-`existsSync` ignoriert Groß/klein (lokal grün, CI rot möglich — sichere Richtung). (5) Eine CRLF-Arbeitskopie zählt ≈ 1 B je Zeile mehr; `.gitattributes` setzt LF, die (a1)-Meldung nennt das.
Fundstelle: `scripts/check-f45-k-kontext.mjs`, `scripts/check-f21-workboard.mjs`.
Auswirkung: Gering.
Maßnahme: (1)–(3) mit W2 (Gate-Hilfen zusammenführen); (4)(5) bei Bedarf.
Feature/Run: Entdeckt: F45 K (code-reviewer, qa), 17.10.2026.

**F-1141** · `HARNESS_IMPROVEMENT` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-1
Titel: commit-guard sperrt `git stash` nicht (nur `drop`/`clear`).
Beschreibung: Bei F45 K liefen versehentlich `git stash` und `git stash pop` durch (ohne Schaden). Der Hook sperrt nur `git stash drop|clear`; `stash`, `stash push`, `pop` und `apply` verändern den Arbeitsbaum ohne Freigabe und können bei einem Konflikt Arbeit verstecken.
Fundstelle: `.claude/hooks/commit-guard.cjs` (Kopf Z. 28, Sperrliste Z. 378 und Z. 410).
Auswirkung: Mittel — eine Sitzung kann ungefragt Änderungen aus dem Arbeitsbaum nehmen; zurück nur über `stash pop`.
Maßnahme: `git stash` außer `list`/`show` in `.claude/hooks/commit-guard.cjs` sperren, mit Gate-Fall. Die Hook-Änderung ändert den E-183-Hash und gehört deshalb zur Erneuerung der Startfreigabe.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-1 (18.10.2026). Nachtrag: `.claude/hooks/commit-guard.cjs` sperrt jedes `git stash` außer `list`/`show` (`stashSegment`, Grund mit „Änderungen sichern über commit auf einem Branch (Stefan)“; `drop`/`clear` behalten den Grund „nicht umkehrbar“) — auch nackt, mit `git -C`/`git -c`, `git.exe`, in Ketten (`&&`, `;`, `||`, `|`, `&`), über `xargs`, `powershell -Command`, `cmd /c`, Heredoc in bash. Dazu `verbenVon`: Befehlsstelle auch nach einer Blockklammer `{` — die PowerShell-Kettenform `A; if ($?) { B }` (CLAUDE.md) war auch für die übrigen Regeln der Aufgabe 6 eine Lücke (`if ($?) { git reset --hard }`, `ForEach-Object { Remove-Item … -Recurse -Force }`). Tests `scripts/commit-guard.test.mjs` (Rot je Variante, Grün `git stash list`/`show -p`, `git commit -m "stash erklärt"`, `grep stash datei`, Ende-zu-Ende Bash und PowerShell); Mutationsproben an einer Kopie (Regel aus ⇒ Stash-Tests rot; Blockklammer aus ⇒ Block-Tests rot). Korrekturrunde (code-reviewer V1, qa L2/L3): `tokenisiere` entfernt eine schließende `}` am Token-Ende (ohne eigenes `{`), damit greift die Blockklammer auch ohne Leerzeichen (`if ($?) {git reset --hard}`); PowerShell-Here-Strings (`git commit -m @'…'@`) sind Fließtext, außer sie gehen per Pipe in eine Shell oder bleiben offen. Grenzen (Kopf des Hooks): `git log --grep stash` wird mitgesperrt (`--grep=stash` nicht), `if (Test-Path .claude) { git checkout x }` als Schreiben auf `.claude` mitgesperrt; offen bleiben Aliase, ein git-Programmpfad mit Leerzeichen, PowerShell-Zuweisung (`$r = git stash`), `$(git stash)`, `Start-Process`/`Invoke-Expression`, `--autostash`. Die Hook-Änderung ändert den E-183-Hash der Workforce — Startfreigabe nach `docs/harness/startfreigabe-erneuern.md` erneuern (Stefan). **Skelett bewusst nicht geändert:** `vorlagen/projekt-skelett/.claude/hooks/commit-guard.js` hat keine stash-Regel; Nachrüsten würde jede Projekt-Startfreigabe brechen — eigener Folgepunkt F-1150. Neue Projekte bekommen über `kopiereBaseline` den Hook der Installation (mit Regel).
Feature/Run: Entdeckt: F45 K (Challenger), 17.10.2026; eingetragen in F45 B2b-3b-2b-2b-2a, 18.10.2026.

**F-1142** · `TECH_DEBT` · P3 · offen
Titel: Archivlauf der Findings nur als Handanleitung.
Beschreibung: Erledigte Einträge nach `state/findings-archiv.md` zu verschieben (Kopf dieser Datei, F45 K E-K-1) ist Handarbeit. Die Regel steht nur im Gate `scripts/check-f21-workboard.mjs` (6) (`ARCHIVREGEL`: Status beginnt mit gelöst/behoben/erledigt/korrigiert; der Eintrag mit der höchsten ID bleibt; IDs über beide Dateien eindeutig). Die erledigten F-1137 und F-1138 stehen noch im Register.
Fundstelle: Kopf von `state/findings.md`; `scripts/check-f21-workboard.mjs` (6).
Auswirkung: Gering — das Register wächst weiter, jeder Lesezugriff bezahlt erledigte Einträge.
Maßnahme: Skript `archiviere-findings` (Probelauf als Standard, `--anwenden` verschiebt wörtlich) mit derselben Regel wie Gate check-f21 (6), möglichst aus einer gemeinsamen Quelle.
Status: offen.
Feature/Run: Entdeckt: F45 K (Challenger), 17.10.2026; eingetragen in F45 B2b-3b-2b-2b-2a, 18.10.2026.

**F-1143** · `BUG` · P1 · erledigt durch F45 B2b-3b-2b-2b-2a
Titel: Arbeitsordner bekommt unter Windows CRLF — E-183 lehnt jeden schreibenden Projektlauf ab.
Beschreibung: Mit `core.autocrlf=true` (Windows-Standard) checkte `git worktree add` den Arbeitsordner mit CRLF aus. E-183 (`ermittleIstZustand`/`pruefeStartbedingung1`, `src/invocation-policy/index.ts`) hasht bewusst die Rohbytes der Werkzeugkonfiguration und der Hook-Skripte; der Hash wich deshalb von der Baseline ab, die Vorbereitung endete FEHLGESCHLAGEN. Beleg im Nachweislauf: Baseline `a35ee4…` = LF, Arbeitsordner roh `f23228…`, als LF wieder gleich der Baseline. Betroffen seit B1a-1; der Reallauf R wäre daran gescheitert.
Fundstelle: `src/arbeitsordner/index.ts` (`bereiteArbeitsordnerVor`, beide `worktree add`); `src/invocation-policy/index.ts` (`ermittleIstZustand`, Rohbytes — unverändert, Invariante).
Auswirkung: Hoch — kein schreibender Projektlauf im Arbeitsordner möglich, sobald das Projekt `core.autocrlf=true` hat.
Maßnahme: Beide `worktree add` laufen mit `CHECKOUT_OHNE_UMWANDLUNG` = `-c core.autocrlf=false -c core.eol=lf` (`src/arbeitsordner/index.ts` Z. 63; Z. 434 Branch vorhanden, Z. 437 neuer Branch) — `core.eol=lf` nach code-reviewer/qa, weil Dateien mit `text`/`text=auto` ohne `eol` sonst `native` (Git für Windows: CRLF) bekämen. Zusätzlich trägt das Skelett `vorlagen/projekt-skelett/.gitattributes` (`* text=auto eol=lf`, byte-gleich aus dem Template; Nachrüsten legt sie nur an, wenn sie fehlt; wirkt erst nach dem Commit). Ein wiederaufgenommener Arbeitsordner mit CR in Werkzeugkonfiguration oder Hook (von vor dem Fix) bekommt im E-183-Grund den Rat „Arbeitsordner aufräumen“ und neu starten (`zeilenendenHinweis`, nur bei Wiederaufnahme — in einem frischen Ordner kommt CR nur noch aus dem Projekt, dort hülfe Aufräumen nicht). Tests in `src/arbeitsordner/arbeitsordner.test.ts` (echtes `pruefeStartbedingung1`, neuer und vorhandener Branch): „core.autocrlf=true im Projekt …“, „Projekt-.gitattributes `* text=auto` ohne eol und core.eol=crlf …“, „Wiederaufnahme eines CRLF-Arbeitsordners …“, „frisch angelegter Arbeitsordner mit CR aus dem Projekt (`eol=crlf`) …“ (kein Rat), „Wiederaufnahme eines LF-Arbeitsordners mit rotem E-183: kein Zeilenenden-Rat“, „Wiederaufnahme eines alten Arbeitsordners, nur der Hook mit CRLF: Rat erwartet …“. Mutationsproben: ohne beide Optionen beide Checkout-Tests rot („Hash der Werkzeugkonfiguration weicht von der Baseline ab (E-183)“, auch nur am Weg „Branch vorhanden“), ohne `core.eol=lf` der text=auto-Test rot, ohne Hinweis der Wiederaufnahme-Test rot, ohne Wiederaufnahme-Bedingung der `eol=crlf`-Test rot, Rat ohne CR-Prüfung der LF-Wiederaufnahme-Test rot, ohne Hooks der Hook-Test rot. Ein nachträglich von Hand auf CRLF umgeschriebener Hook in einem LF-Arbeitsordner hält schon an der Sauberkeitsprüfung (Größe ≠ Index; Rat dort ebenfalls „Arbeitsordner aufräumen“). Gate `scripts/check-f45-b2b3b2b2b2a-crlf.mjs`; Doku `docs/architektur/arbeitsordner.md`. Grenzen: ein `eol=crlf`-Attribut oder ein Filter des Projekts auf `.claude/**` wirkt weiter; spätere Checkouts im Arbeitsordner (checkout/restore/stash/reset) folgen der gemeinsamen Repo-Konfiguration (der Server macht keine); ein schon angelegter CRLF-Arbeitsordner bleibt rot, bis er aufgeräumt ist (F-1147). **Abwägung, Entscheidung Stefan offen:** die Startfreigabe hasht die Arbeitskopie des Projektordners, der Arbeitsordner trägt den Commit. Hat git die Werkzeugkonfiguration oder Hooks der Arbeitskopie unter `core.autocrlf=true` ohne `eol=lf` mit CRLF ausgecheckt (Klon, Pull, Checkout), war der Lauf vor dem Fix zufällig grün und scheitert jetzt an E-183, ohne eigenen Rat (ein Rat wurde im Review verworfen, weil er nicht verlässlich hilft). Abhilfe von Hand: `.gitattributes` mit `eol=lf` committen, `.claude/` neu auschecken (Dateien löschen, `git checkout -- .claude`), dann die Startfreigabe nach `docs/harness/startfreigabe-erneuern.md` erneuern. `haushaltsbuch2` ist nicht betroffen (Baseline `a35ee4…` = LF).
Status: erledigt durch F45 B2b-3b-2b-2b-2a (18.10.2026).
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal (Stefan, Projekt `haushaltsbuch2`), 17.10.2026.

**F-1144** · `BUG` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-2
Titel: Freigabeseite „Darf der Ablauf starten?“ zeigt den Auftragstext des Schritts nicht.
Beschreibung: Im Nachweislauf sah Stefan auf der Freigabe vor dem Start nicht, welchen Auftrag der Schritt bekommt — weder in der Hauptansicht noch unter „Technischer Ablauf“. Er gibt damit einen Lauf frei, dessen Inhalt er nicht sieht.
Fundstelle: `public/leitstand/views/workflow-entscheiden.js` (Freigabe, `entscheiden.freigabe.titel` in `public/leitstand/i18n/de.js` Z. 1869).
Auswirkung: Mittel — Freigabe ohne Sicht auf den Inhalt.
Maßnahme: Auftragstext des Schritts auf der Freigabeseite anzeigen (vollständig, wörtlich), mit Render-Nachweis.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-2 (18.10.2026). Karte „Auftrag für diesen Schritt“ vor „Was startet“ (nach den Plan-Karten) (`renderAuftragKarte`, `public/leitstand/views/workflow-entscheiden.js`): Auftragstext wörtlich als `<pre>` (escaped, Umbrüche erhalten); über 12 Zeilen oder 1200 Zeichen Vorschau plus `<details data-klappe="auftrag">` „Ganzer Auftrag (m Zeichen)“, bleibt über den Poll offen (`setzeHtml` in `views/workflows.js`); ohne Text amber Hinweis „nicht lesbar … sonst ablehnen“. Quelle: bestehende Projektion GET /api/workflows/<id>, Feld `auftragstext` (`leseAuftragProjektion` ersetzt `leseEinrichtungProjektion` zeilenneutral, keine neue Route; Gate f45-b2a2 (d)). Grenze, auf der Karte gesagt („So wurde der Auftrag angelegt. Beim Start ergänzt das System ihn je nach Rolle …“): angezeigt wird der Auftragstext des Auftrags; je nach Rolle ergänzt oder umrahmt ihn das System beim Start (Regeln, Arbeitspaket, Abnahmekriterien, in einer Korrekturrunde Stefans Anpassungswünsche; Architekt, Advisor, qa, scout mit eigenem Rahmen) — der zusammengesetzte Prompt entsteht erst beim Start (`starteWorkflowSchritt`) und wird nicht vorab gezeigt (code-reviewer V9, qa 4). Render-Nachweis `features/F45/nachweise/b2b3b2b2b2b2/render/freigabe-auftrag-*` (eingeklappt, aufgeklappt, nach einem echten Neuzeichnen — qa 1) und `…/render/freigabe-fehlt-*`.
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal (Stefan), 17.10.2026.

**F-1145** · `BUG` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-2
Titel: „Was tun“ bei `nicht_von_stefan` nennt immer Frist und Sichtbarkeit, auch bei Ablehnung durch Regel oder Pfadgrenze.
Beschreibung: Der Abgleich-Grund `nicht_von_stefan` fällt immer in die Klasse `automatisch`; deren „Was tun“ rät, die Sichtbarkeit zu prüfen und innerhalb der Frist zu antworten. In Lauf B lehnte aber die Pfadgrenze ab (auto_deny „Pfad außerhalb des Arbeitsordners“, `features/F45/nachweise/b2b3b2b2b/auswertung-haushaltsbuch2-b-577ea346-ed76-4fad-a58a-26c0cdbe0c59.md` Z. 60 und Z. 96) — der Rat führt in die Irre.
Fundstelle: `public/leitstand/rueckfrage-abnahme.js` Z. 30 (`ABGLEICH_KLASSE`), `public/leitstand/i18n/de.js` Z. 3135–3137 (`abnahme.kanal.klasse.automatisch.*`, ebenso en/tr/ru).
Auswirkung: Mittel — Stefan bekommt einen falschen Handlungsrat.
Maßnahme: Je Ursache unterscheiden (Regel/Pfadgrenze, Frist abgelaufen, Lauf-Ende, Protokollgrenze), z. B. aus `rueckfrage_zaehlung` (`automatisch` vs. `abgelaufen`/`lauf_ende`); Texte in de/en/tr/ru.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-2 (18.10.2026). `automatischUrsache` (`public/leitstand/rueckfrage-abnahme.js`) aus der Zählung: genau ein Feld > 0 unter `automatisch` (ohne den Überlauf)/`abgelaufen` ⇒ Regel/Frist; der Überlauf (`protokollUeberlauf`: Summe der sechs Felder über `PROTOKOLL_GRENZE` = `MAX_PROTOKOLL_JE_LAUF`, im Test verankert — Einträge + offene bleiben ≤ Grenze) wird herausgerechnet, denn eine Ablehnung über der Grenze hat keinen Eintrag, ergibt im Abgleich `kein_eintrag` (Klasse `echt`) und ist nie die Ursache von `nicht_von_stefan` (code-reviewer 1); „Protokollgrenze“ erscheint deshalb als Zusatz bei `automatisch` und `echt`; ebenso „Lauf-Ende“: Zählung und Protokoll werden vor `beendeLauf` gelesen, `lauf_ende` sind beim Lesen offene Rückfragen ohne Eintrag (code-reviewer Nachpass 1); keins, mehrere oder unlesbar ⇒ neutraler Text, der Regel und Frist bzw. Lauf-Ende nennt (`abnahme.kanal.klasse.automatisch.*` umgeschrieben). Je Ursache Text und „Was tun“ (`URSACHE_SCHLUESSEL`, `abnahme.kanal.ursache.*`, de/en/tr/ru). Gilt in Lauf-Notiz, Sichtungs-Notiz und Abnahmeseite (eine Quelle `grundHtml`). Lauf B (automatisch 1) ⇒ Regel-Text, Testfall mit den Daten der Auswertung B (`rueckfrage-abnahme.test.mjs`). Render-Nachweis `…/render/wastun-lauf-b-*` und `…/render/abnahme-lauf-b-*`. Grenze: „Regel“ fasst alle Ablehnungen mit Eintrag ohne Rückfrage zusammen (Pfadgrenze, Werkzeug, Steuerzeichen, doppelte ID, zu viele offene) — die Zählung trennt sie nicht.
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal, Lauf B (Stefan), 17.10.2026.

**F-1146** · `PROCESS_IMPROVEMENT` · P2 · erledigt durch F45 B2b-3b-2b-2b-2b-2
Titel: Abnahmeseite zeigt den Block „Rückfrage-Kanal im Lauf“ nicht selbst.
Beschreibung: Der Block (Zählung, bestätigte Ablehnungen, Ursache, R3) steht im Lauf-Detail (F-1128 (3), Nachtrag 2a-3), nicht auf der Abnahmeseite. Stefan fand ihn im Nachweislauf nicht; für einen Nicht-Entwickler ist der Weg über das Lauf-Detail nicht erkennbar.
Fundstelle: `public/leitstand/rueckfrage-abnahme.js` (Block `abnahme.kanal.titel`, Z. 125 ff.), Abnahmeansicht in `public/leitstand/views/`.
Auswirkung: Mittel — die Kanal-Auskunft wird bei der Abnahme übersehen.
Maßnahme: Block auf der Abnahmeseite selbst zeigen (oder deutlicher Verweis), mit Render-Nachweis.
Status: erledigt durch F45 B2b-3b-2b-2b-2b-2 (18.10.2026). Die Seite „entscheidbar“ zeigt den Block des Ausführungslaufs (mit Grund oder R3 unter den Kacheln, sonst nach „Selbst ausprobieren“ — design-guardian 2) (`renderKanalImLauf` in `public/leitstand/views/workflow-abnahme.js` ruft `renderRueckfrageAbnahme(kanal, { mitUrsache: true })` — dieselbe Funktion wie im Lauf-Detail, hier mit dem Grund jeder Klasse, weil keine Fehler-Notiz darüber steht); geladen in `views/workflows.js` (`kanalDerAbnahme`) aus GET /api/laeufe/<laufId> über `kanalDerSichtung` (ein Abruf je Lauf, Rückzug nach Fehler), Lauf aus `aenderungsuebersicht.laufId`; lädt ⇒ Zeile „wird geladen“; nicht ladbar ⇒ Hinweis mit Link „Lauf ansehen“ ins Lauf-Detail (qa 2), beim Neuversuch nach dem Rückzug ohne Flackern (code-reviewer V2). Im Lauf-Detail unverändert. Im Block „vorab“ (Sichtungs-Halt) nicht — dort trägt die Sichtungs-Notiz die Ursache. Render-Nachweis `…/render/abnahme-kanal-a-*` (Zählung von Lauf A), `…/render/abnahme-lauf-b-*`, `…/render/abnahme-fehler-*`.
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal (Stefan), 17.10.2026.

**F-1147** · `TECH_DEBT` · P2 · offen
Titel: Fehlgeschlagene Vorbereitung lässt Arbeitsordner und Branch `wf/<id>` stehen.
Beschreibung: `bereiteArbeitsordnerVor` räumt nach einem Fehlschlag hinter `worktree add` nicht auf: die Fehlschläge „nicht sauber“ (Z. 448), `npm ci` (Z. 455) und E-183 (Z. 467) geben nur FEHLGESCHLAGEN zurück, Worktree und Branch bleiben; der Server (`fuehreArbeitsordnerVorbereitungAus`, `scripts/leitstand-server.mjs`) schreibt nur das Artefakt. Aufräumen geht ausschließlich von Hand über „Arbeitsordner aufräumen“ (`POST /api/workflows/<id>/arbeitsordner-aufraeumen`, erlaubt bei FEHLGESCHLAGEN, `aufraeumenSperrgrund` in `scripts/leitstand/routen-arbeitsordner.mjs` Z. 45). Ein Neustart nimmt den stehengebliebenen Worktree wieder auf (Wiederaufnahme, Z. 423) statt ihn neu auszuchecken — ein CRLF-Arbeitsordner von vor F-1143 bleibt damit rot; seit B2b-3b-2b-2b-2a nennt der E-183-Grund dann die Zeilenenden und „Arbeitsordner aufräumen“ (Teil von (b) für diesen Fall). Realer Rest bei Stefan: `haushaltsbuch2-laeufe\b64cdbebc1`, Branch `wf/router-705358fb-…`.
Fundstelle: `src/arbeitsordner/index.ts` (`bereiteArbeitsordnerVor` Z. 423, 448, 455, 467); `scripts/leitstand-server.mjs` (`fuehreArbeitsordnerVorbereitungAus`); `scripts/leitstand/routen-arbeitsordner.mjs` Z. 45.
Auswirkung: Mittel — Reste sammeln sich neben dem Projekt; ein Neustart desselben Ablaufs scheitert erneut, solange der Rest steht.
Maßnahme: Entscheiden: (a) nach einem Fehlschlag hinter `worktree add` selbst entfernen (`worktree remove` ohne --force, `branch -d`), wenn der Worktree frisch und unverändert ist, oder (b) im Fehlertext und auf der Seite deutlich „Arbeitsordner aufräumen“ anbieten. Bis dahin von Hand.
Status: offen (geprüft in F45 B2b-3b-2b-2b-2a, 18.10.2026 — nicht im Code behoben).
Feature/Run: Entdeckt: Nachweislauf Rückfrage-Kanal („Vorbereitung fehlgeschlagen“, Stefan), 17.10.2026; Prüfung F45 B2b-3b-2b-2b-2a.

**F-1148** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: commit-guard sperrt `git commit` auch in Wegwerf-Repos im Temp-Ordner.
Beschreibung: `.claude/hooks/commit-guard.cjs` sperrt `git commit` unabhängig vom Ziel-Repo, also auch in einem frisch angelegten Wegwerf-Repo im Temp-Ordner (Reproduktion eines Git-Verhaltens). Reproduktionen weichen deshalb auf Node-Skripte aus, die git selbst aufrufen. Bewusst nicht gelockert: ein Wegwerf-Repo ist im Befehlstext nicht sicher abgrenzbar (Pfad- und `-C`-Tricks, `cd` in Ketten, Umgebungsvariablen wie `GIT_DIR`).
Fundstelle: `.claude/hooks/commit-guard.cjs` (Commit-Regel).
Auswirkung: Gering — Umweg über ein Skript nötig, keine Sicherheitslücke.
Maßnahme: Offen lassen; Lockerung nur mit einer belastbaren Abgrenzung des Ziel-Repos.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3b-2b-2b-2a (Nummer vom Challenger vergeben, eingetragen in B2b-3b-2b-2b-2b-1), 18.10.2026.

**F-1149** · `TECH_DEBT` · P3 · offen
Titel: Startfreigabe-Baseline wird aus der Arbeitskopie gemessen, der Arbeitsordner trägt den Commit (Folgepunkt F-1143).
Beschreibung: `scripts/erzeuge-invocation-policy-nachweise.mjs` hasht `.claude/settings.json` und die Hooks der Arbeitskopie (Ordner des Aufrufs), die Vorbereitung des Arbeitsordners prüft E-183 gegen den aus dem Projekt-HEAD ausgecheckten Stand (`bereiteArbeitsordnerVor`, `src/arbeitsordner/index.ts`). Weichen beide ab (nicht committete Hook-Änderung, mit CRLF ausgecheckte Arbeitskopie ohne `eol=lf`), scheitert jeder schreibende Lauf an E-183, obwohl die Startfreigabe gerade erst erzeugt wurde. Eine Baseline aus dem Commit (`git show HEAD:<pfad>`) schlösse das, änderte aber die E-183-Invariante „Rohbytes des gemessenen Ordners“ und betrifft heute kein Projekt (`haushaltsbuch2`: Baseline `a35ee4…` = LF).
Fundstelle: `scripts/erzeuge-invocation-policy-nachweise.mjs` (`erzeugeNachweise`, settingsPfad aus `process.cwd()`); `src/invocation-policy/index.ts` (`ermittleIstZustand`); `src/arbeitsordner/index.ts` (`bereiteArbeitsordnerVor`).
Auswirkung: Gering, solange die Anleitung befolgt wird (`docs/harness/startfreigabe-erneuern.md`, „Projekt-Startfreigabe erneuern“ P1: erst committen, `ls-files --eol` prüfen).
Maßnahme: Bewusst nicht gebaut (E-183-Invariante, kein betroffenes Projekt). Auslöser zum Bauen: ein reales Projekt mit CRLF-Arbeitskopie oder ein E-183-Fehlschlag direkt nach einer Erneuerung.
Status: offen.
Feature/Run: F45 B2b-3b-2b-2b-2b-1 (Folgepunkt aus F-1143, Abwägung Stefan), 18.10.2026.

**F-1150** · `HARNESS_IMPROVEMENT` · P3 · offen
Titel: Projekt-Hooks sperren `git stash` nicht (Skelett und vorhandene Projekte; Folgepunkt F-1141).
Beschreibung: F-1141 sperrt `git stash` (außer `list`/`show`) nur im Hook der Installation (`.claude/hooks/commit-guard.cjs`). Zwei Wege bleiben ohne Regel: (a) der Skelett-Hook `vorlagen/projekt-skelett/.claude/hooks/commit-guard.js` (wirkt beim Nachrüsten, `src/projekt-anlegen/nachruesten.ts`) — bewusst unverändert, weil Nachrüsten den E-183-Hash vorhandener Projekte änderte und jede Projekt-Startfreigabe bräche; (b) über den Leitstand angelegte Projekte (`haushaltsbuch`, `haushaltsbuch2`) tragen eine alte Kopie von `commit-guard.cjs` aus `kopiereBaseline` (neue Projekte bekommen nach der Erneuerung der Workforce-Startfreigabe den neuen Hook). Wie ein neuer Hook in ein vorhandenes Projekt kommt, beschreibt die Anleitung „Projekt-Startfreigabe erneuern“ nicht.
Fundstelle: `vorlagen/projekt-skelett/.claude/hooks/commit-guard.js`; `.claude/hooks/commit-guard.cjs` in den Projektordnern; `src/projekt-anlegen/index.ts` (`kopiereBaseline`).
Auswirkung: Gering — Projektläufe haben eine enge Bash-Allowlist; eine Sitzung im Projekt könnte `git stash` dennoch ungefragt ausführen.
Maßnahme: Entscheiden, ob und wie die Regel in Skelett und vorhandene Projekte kommt (Hook kopieren, im Projekt committen, Projekt-Startfreigabe erneuern), mit Testfall in `scripts/skelett-hooks.test.mjs`.
Status: offen.
Feature/Run: F45 B2b-3b-2b-2b-2b-1, 18.10.2026.

**F-1151** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2b-3b-2b-2b-2b-1 (stash-Sperre, Kanal Standard, Projekt-CLI-Hinweis) aus code-reviewer und qa.
Beschreibung: (1) qa L13: mit dem Kanal als Standard wartet ein Befehl außerhalb der Allowlist bis zur Frist auf Stefan, statt sofort abgelehnt zu werden; ein unbeaufsichtigter Lauf läuft dadurch eher in seine Zeitgrenze (vgl. F-1132 (3)). Entschieden ist „Standard an“, nicht dieses Verhalten ausdrücklich; Anzeige/Hinweis offen. (2) qa L15: `src/ausfuehrung-vorbedingung/index.ts` rät „committen oder stashen“ — widerspricht der neuen Sperre. (3) code-reviewer V6 / qa L18 (im Kopf von `scripts/leitstand/cli-version.mjs` als Grenze festgehalten): der Projekt-Hinweis vergleicht mit dem Programm der Workforce-Startvorlage; ist sie nicht ladbar, bekommt kein Projekt einen Hinweis; der Hinweis bleibt bis zum Neustart. (4) qa L9/L11 (in der Anleitung als „anhalten“ markiert): Belege für ein Projekt ohne eigene Auswertung und der Kreisfall „Hook im Projekt und CLI zugleich geändert“ sind nicht festgelegt; die Bezeichnungen der Oberfläche in P7.2 („bereit“, „Arbeitsordner aufräumen“) sind nicht am Render geprüft. (5) code-reviewer V4: ein `"` in einem `--body "$(cat <<'EOF' …)"` beendet das Textargument zu früh; eine spätere Zeile, die mit `git stash` beginnt, wird gesperrt (sichere Richtung). (6) Kopfzeile 9 von `scripts/_rueckfrage-aus-pruefung.mjs` („nur mit `LEITSTAND_RUECKFRAGE=1`“) ist seit „Standard an“ veraltet; nicht geändert, weil die Datei unter dem Hash-Pin `REGEL_HASH` steht und technisch nicht berührt werden musste.
Nachtrag (Challenger, 18.10.2026): zu (1) **angenommen** — die Wartezeit bis zur Frist ist der Zweck des Kanals; abschalten mit `LEITSTAND_RUECKFRAGE=0`. Auslöser zum Überdenken: unbeaufsichtigte Läufe in R laufen regelmäßig in die Zeitgrenze. Zu (4): beide Fragen (Beleg für ein Projekt ohne eigene Auswertung; Kreisfall Hook + CLI) bleiben offen.
Fundstelle: `scripts/leitstand/rueckfrage-einschalten.mjs`, `src/ausfuehrung-vorbedingung/index.ts`, `scripts/leitstand/cli-version.mjs`, `docs/harness/startfreigabe-erneuern.md` („Projekt-Startfreigabe erneuern“), `.claude/hooks/commit-guard.cjs` (`TEXT_ARGUMENT`), `scripts/_rueckfrage-aus-pruefung.mjs` Z. 9.
Auswirkung: Gering bis mittel ((1) betrifft jeden unbeaufsichtigten Ausführungslauf).
Maßnahme: (1) entschieden (Nachtrag), Anzeige nicht in 2b-2b-2b-2b-2 umgesetzt, offen (F-1153 (10)); (2) bei der nächsten Berührung; (3)(5) bei Bedarf; (4) mit der ersten realen Projekt-Erneuerung; (6) beim nächsten fachlichen Eingriff in `_rueckfrage-aus-pruefung.mjs` (Hash-Pin mit erneuern).
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3b-2b-2b-2b-1 (code-reviewer, qa), 18.10.2026.

**F-1152** · `TECH_DEBT` · P3 · offen
Titel: `biome.json` nutzt das veraltete Feld `linter.rules.recommended` (Biome-Info „Use preset instead“).
Beschreibung: `npx biome lint .` meldet bei jedem Lauf `biome.json:6:13 deserialize DEPRECATED — The use of the recommended field has been deprecated, and will removed in the next major version of Biome. Use preset instead.` Das Feld steht auf `false` (nur `noExplicitAny` und `noFloatingPromises` sind eingeschaltet); heute nur ein Hinweis, Lint bleibt grün.
Fundstelle: `biome.json` Z. 6–9 (`linter.rules.recommended: false`), gepinnte Biome-Version in `package.json`.
Auswirkung: Gering heute; beim nächsten Biome-Major bricht die Konfiguration und damit `npm run lint` bzw. `npm run check`.
Maßnahme: `npx biome migrate` (bzw. das Feld durch das passende `preset` ersetzen, gleiche Regelmenge: keine Empfehlungen, nur die zwei Fehlerregeln) in einem eigenen Aufräumauftrag auf eigenem Branch, mit grünem `npm run check` und Vergleich der gemeldeten Regeln vorher/nachher.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3b-2b-2b-2b-2 (Biome-Ausgabe beim Lint), 18.10.2026.

**F-1153** · `TECH_DEBT` · P3 · offen
Titel: Restpunkte von F45 B2b-3b-2b-2b-2b-2 (Anzeige-Fixes aus dem Nachweislauf) aus code-reviewer, qa und design-guardian.
Beschreibung: (1) design-guardian 1 / qa 10: Band und Seitenzeile der Projekt-CLI-Abweichung stehen auf Freigabe- und Abnahmeseite untereinander und nennen beide Versionen und die Anleitung — so im Auftrag verlangt (Band wie `cliHinweis` und Zeile auf beiden Seiten); bei 390 rückt der Auftrag dadurch unter die erste Bildschirmhöhe. **Entscheidung Stefan offen:** Seitenzeile kürzen (nur „das Ergebnis gilt, Einzelheiten oben“) oder so lassen. (2) code-reviewer V1 / qa 3: der Hinweis zeigt den heutigen Stand (installiert gegen Projekt-Startvorlage), nicht die Version, mit der der Lauf lief; die Abnahme sagt deshalb „derzeit“. Die Laufversion (Laufakte `werkzeug_version_deklariert`, init-Zeile `claude_code_version`) zu zeigen wäre Backend-Arbeit. (3) code-reviewer 1 (Nebenbefund, vorbestehend): eine Ablehnung über der Protokollgrenze ergibt `kein_eintrag` (Klasse `echt`) — Lauf-Notiz und Sichtungs-Notiz behalten dann den Standardsatz; der Zusatz „Protokollgrenze“ steht nur im Block (Lauf-Detail, Abnahmeseite). (4) „Regel“ fasst alle Ablehnungen mit Eintrag ohne Rückfrage zusammen (Pfadgrenze, Werkzeug, Steuerzeichen, doppelte ID, zu viele offene) — die Zählung trennt sie nicht; der Grund steht nur im Protokoll. (5) code-reviewer V3: `kanalDerAbnahme` und der Erhalt offener `<details data-klappe>` in `setzeHtml` (`public/leitstand/views/workflows.js`) haben keinen Unit-Test, nur den Render-Nachweis (echtes Neuzeichnen in `freigabe-auftrag-*/03`); ebenso die DOM-Logik der Band-Art in `initStartHinweisBand` (falscher Ordner + Projekt-CLI ⇒ `sperre`). (6) code-reviewer V5: `kanalAbnahme` merkt den Wert je Lauf auch, wenn der Lauf nicht `ABGESCHLOSSEN` ist (in der Lage „entscheidbar“ praktisch nicht erreichbar). (7) qa 10: die Anleitung erscheint als Repo-Pfad, nicht als Link; ein Neuzeichnen der Abnahme (z. B. nach einem Kanal-Wechsel) klappt offene `<details>` der Abnahmeseite zu (die Begründung bleibt). (8) design-guardian 2 (Alternative): der Kanal-Block ist eine `.note` mit `<strong>`-Titel statt einer `.entscheiden-karte` mit `h2` (nicht in der Überschriften-Navigation) — derselbe Block wie im Lauf-Detail. (9) Render-Helfer: bei `zoom` mit `screenshotVollseite` setzt das Bild die fixierte Seitenleiste versetzt bzw. unten abgeschnitten und zeigt im Band einen älteren Stand als das DOM-Protokoll (`features/F45/nachweise/b2b3b2b2b2b2/nachweis.md`). (10) qa 11: die Anzeige zu F-1151 (1) (Befehl außerhalb der Allowlist wartet bis zur Frist) ist nicht Teil dieses Auftrags und bleibt offen. (11) design-guardian Nachpass 6 (vorbestehend): der Satz „Die Zählung enthält auch Ablehnungen, die die Auswertung nicht bestätigt hat“ steht auch bei „Abgelehnt: 0“. (12) code-reviewer Nachpass 5: während der Kanal lädt, steht die Ladezeile nach „Selbst ausprobieren“; mit Grund oder R3 springt der Block danach einmal unter die Kacheln. (13) code-reviewer Nachpass 6 (vorbestehend): `docs/architektur/rueckfrage-kanal.md` sagt beim Nachweislauf noch „noch nicht für echte Läufe nutzen“, obwohl der Kanal seit #363 Standard ist.
Fundstelle: `public/leitstand/projekt-cli-hinweis.js`, `public/leitstand/views/workflows.js` (`kanalDerAbnahme`, `setzeHtml`), `public/leitstand/start-hinweis.js` (`initStartHinweisBand`), `public/leitstand/rueckfrage-abnahme.js`, `scripts/render-nachweis.mjs`.
Auswirkung: Gering — Anzeige und Prüftiefe, keine falsche Freigabe.
Maßnahme: (1) Entscheidung Stefan; (2) bei Bedarf mit einer Lauf-Projektion der Version; (3)(4) mit dem nächsten Eingriff in den Kanal; (5) Unit-Tests mit Fake-DOM beim nächsten Eingriff in `workflows.js`; (6)–(9) bei Bedarf; (10) siehe F-1151.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3b-2b-2b-2b-2 (code-reviewer, qa, design-guardian), 18.10.2026.

**F-1154** · `HARNESS_IMPROVEMENT` · P2 · offen
Titel: Voller npm run check bricht in der Claude-Code-Sitzung mit Speichermangel ab.
Beschreibung: Am 18.10.2026 brach `npm run check` in der Claude-Code-Sitzung in 3 von 4 Läufen mit Speichermangel ab; im frischen Terminal lief derselbe Stand stabil grün (≈ 4,7 min). Die Parallelität des Testlaufs ist schon begrenzt (`--test-concurrency=4`, F-1002 im Archiv, F46 D5) — die Grenze reicht neben der laufenden Sitzung (Modell-Prozess, Subagenten) offenbar nicht. Ob die Gates (`check:gates`, darunter mehrere mit echtem Handler und Worktree) oder der Testlauf den Speicher erschöpfen, ist nicht gemessen.
Fundstelle: `package.json` (Skripte „check“, „check:gates“, „test“).
Auswirkung: Mittel — die volle Kette läuft in der Bausitzung nicht verlässlich; Bauaufträge fahren deshalb nur betroffene Gates, den vollen Lauf fährt Stefan im Commit-Block.
Maßnahme: Speicherspitze und Laufzeit je Teil messen (Gates einzeln, Testlauf mit `--test-concurrency` 4/2/1), danach eine kleinere Grenze nur für die Sitzung (eigenes Skript) oder schwere Gates entkoppeln. Nur Eintrag, nicht umgesetzt (Auftrag B2b-4a-1).
Status: offen.
Feature/Run: Entdeckt: F45 B2b-3b-2b-2b-2b-2 (Commit-Block), 18.10.2026; eingetragen F45 B2b-4a-1, 19.10.2026.

**F-1155** · `TECH_DEBT` · P3 · offen
Titel: „Noch nicht auf main“ ist nicht „ungepusht“ — gepusht und gemergt werden lokal nicht erkannt.
Beschreibung: „Bereit zum Sichern“ (`scripts/leitstand/ablauf-sichern.mjs`) zählt mit `basis.voraus` die Commits des Arbeitsordners, die noch nicht auf main sind (`rev-list <origin/main|main>...HEAD` gegen den lokal bekannten Ref, `scripts/leitstand/routen-code.mjs` `leseBasis`); die Projektion holt nie (`fetch`). Nach einem Push bleibt ein Ablauf deshalb „bereit (push)“, und nach einem Merge im Web — hier in der Regel Squash (je PR ein Commit auf main) — ebenso, bis der Arbeitsordner aufgeräumt ist; bei Squash bleibt dort zudem der Branch stehen (`branch -d` nur gemergt). Ohne Basis-Ref (weder origin/main noch main) ist die Lage `nichtBestimmbar`, auch wenn ein Commit möglich wäre.
Fundstelle: `scripts/leitstand/ablauf-sichern.mjs` (`leiteSichernLageAb`), `scripts/leitstand/routen-code.mjs` (`leseBasis`).
Auswirkung: Gering — ein erneuter Push ist harmlos; der normale Weg „gepusht/gemergt → Aufräumen“ beendet die Anzeige.
Maßnahme: Grenze deklariert (Entscheidung Challenger 19.10.2026: kein Upstream-Vergleich). Die Anzeige (B2b-4a-2) nennt „noch nicht auf main“ und den Weg zum Aufräumen. Upstream-Vergleich (`@{u}`) nur bei realem Bedarf.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-4 (Advisor-Pässe `features/F45/advisor-b2b4.md` 6, `advisor-b2b4a-delta.md` 3), 19.10.2026.

**F-1156** · `TECH_DEBT` · P3 · offen
Titel: Commit-Vorschlag für wf/<id>-Branches enthält die interne Ablauf-ID.
Beschreibung: `commitVorschlag` (`public/leitstand/code-daten.js`) kennt das Präfix `wf/` nicht und macht aus dem Branch eines Arbeitsordners `wf/<Ablauf-ID>` den Vorschlag „wf <Ablauf-ID mit Leerzeichen>“ — die interne Kennung steht dann in der Commit-Nachricht. Ein Workflow trägt keinen Titel (nur `ziel` und `auftrag_id`); die Quelle für einen Titel wäre der Auftragstitel (`auftrag-<auftrag_id>`), z. B. als Serverfeld `ablauf.titel` von GET `/api/code?workflow=<id>`.
Fundstelle: `public/leitstand/code-daten.js` (`commitVorschlag`), `scripts/leitstand-server.mjs` (`loeseCodeOrt`).
Auswirkung: Gering — die Nachricht ist ausführbar, aber nicht sprechend.
Maßnahme: UX-Runde nach R (Entscheidung Challenger 19.10.2026: in B2b-4 zurückgestellt; `commitVorschlag` bleibt unverändert).
Status: offen.
Feature/Run: Entdeckt: F45 B2b-4 (Advisor-Pass `features/F45/advisor-b2b4.md` 9e), 19.10.2026.

**F-1157** · `TECH_DEBT` · P2 · offen
Titel: Auflagen aus dem Prüfpass von B2b-4a-1 an B2b-4a-2 (Anzeige „Bereit zum Sichern“).
Beschreibung: Die Ableitung (`scripts/leitstand/ablauf-sichern.mjs`) liefert bewusst nur die Lage; der Befehlsblock und die Anzeige in 4a-2 müssen: (1) node_modules ohne `.gitignore` berücksichtigen — nach `npm ci` im Arbeitsordner eines Fremdprojekts zählt `git status --untracked-files=all` node_modules/ als neu (Tausende Einträge, `gekappt`, „bereit (commit)“ ohne Änderung des Ablaufs; bei sehr großer Ausgabe `nichtBestimmbar`); Anzahl und Kappung zeigen, kein pauschales Stagen (qa 6, code-reviewer 1); (2) vor einem Push-Block `branch.losgeloest`, `branch.name` gegen `ablauf.arbeitsordner.branch` und `remoteWebUrl.origin` prüfen — die Ableitung meldet auch bei losgelöstem HEAD oder fremdem Branch „bereit (push)“ (qa 5, Advisor-Delta 4a-1 15); (3) Befehle nur aus `ablauf.arbeitsordner.pfad/branch` bauen, nie aus der zurückgegebenen `workflowId` (code-reviewer 5); (4) GET …/code?workflow= nur für die geöffnete Karte bzw. Abnahme abrufen, nie im Poll für alle Karten — je Abruf ≈ 10 Git-Prozesse und synchrones Lesen der Checkpoint-Ketten (qa 7); (5) 409 mit `grund_schluessel` ist eine Lage (z. B. `aufgeraeumt` als normaler Endzustand), kein Fehler; bei 400/404 ist der Schlüssel `null` (qa 8); (6) GESTOPPT mit offenen Änderungen auf Aufräumen/Verwerfen verweisen (`offeneAenderungen` wird geliefert; qa 2); (7) Text je Grund übersetzen und `keinArbeitsordner` für `kein_bedarf` (nichts zu sichern) und `bestand` (Projektordner) trennen (code-reviewer 9); (8) Advisor-Delta 4a 8–20, soweit sie C betreffen, und Befund 6 (jeder Ablauf mit Arbeitsordner über `?workflow=`).
Fundstelle: `scripts/leitstand/ablauf-sichern.mjs`, `public/leitstand/code-daten.js` (`sicherBefehle`), `public/leitstand/views/workboard.js`, `public/leitstand/views/workflows.js`, `public/leitstand/views/arbeitsordner-anzeige.js`.
Auswirkung: Mittel — ohne die Auflagen zeigte 4a-2 irreführende oder zu breite Befehle.
Maßnahme: in den Plan von B2b-4a-2 übernehmen.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-4a-1 (code-reviewer, qa), 19.10.2026.

**F-1158** · `TECH_DEBT` · P3 · offen
Titel: Lesende Git-Aufrufe im Arbeitsordner vertrauen dessen `.git`-Verweis; Windows-Aliasse von Kennungen in den Workflow-Routen.
Beschreibung: (1) Der Worker kann die `.git`-Datei seines Arbeitsordners auf ein eigenes gitdir umlenken; dessen Konfiguration (z. B. `filter.<x>.clean` mit `.gitattributes`) würde dann von `git status`/`diff-index` beim lesenden GET …/code?workflow= (und schon heute vom Abnahme-Stand, `src/review-stand`) ausgeführt — `-c core.fsmonitor=false`, `--no-ext-diff` decken das nicht ab. Einordnung: Tiefenverteidigung; der Prüfbefehl führt ohnehin Code des Workers aus (qa 10). (2) NTFS normalisiert Groß-/Kleinschreibung, Punkt und Leerzeichen am Ende: `GET /api/workflows/<ALIAS>` und die übrigen Workflow-Routen laden denselben Ablauf unter anderer Kennung; `?workflow=` weist das seit B2b-4a-1 mit 404 ab (`workflow_id !== roh`), die übrigen Routen nicht (qa 3).
Fundstelle: `scripts/leitstand/routen-code.mjs` (`fuehreGitAus`), `src/review-stand/index.ts`, `scripts/leitstand-server.mjs` (Routen `/api/workflows/<id>…`), `src/checkpoint-store/index.ts` (`ladeGueltigeCheckpoints`).
Auswirkung: Gering — keine Rechteausweitung über die Anfrage; cwd kommt aus dem Kontrollzustand.
Maßnahme: (1) vor lesenden Git-Aufrufen im Arbeitsordner `rev-parse --git-common-dir` gegen `<repoWurzel>/.git` prüfen — mit W2 oder beim nächsten Eingriff in `src/review-stand`; (2) dieselbe Prüfung `workflow_id === id` in den Workflow-Routen mit W2.
Status: offen.
Feature/Run: Entdeckt: F45 B2b-4a-1 (qa), 19.10.2026.
