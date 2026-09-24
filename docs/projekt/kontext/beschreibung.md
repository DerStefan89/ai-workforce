# Projektbeschreibung — AI Workforce

F33 WS-1 (E-M4-2, "Kontrollzustand im eigenen Repo"). Wird über den
Context Builder an die lesenden Rollen `jarvis` und `router` eingespeist
— unabhängig davon, ob `CLAUDE.md` im jeweiligen Lauf geladen wird
(`features/F33/spike-setting-sources.md`).

## Was es ist

AI Workforce ist eine lokale Orchestrierungsanwendung, die ein Vorhaben
von der Idee bis zum abgenommenen Ergebnis durch klar getrennte
KI-Positionen führt: Architektur-Advisor, Ausführung, Code-Reviewer, QA,
Router und Jarvis. Jede Position läuft als eigener, isolierter
Werkzeugprozess (Claude Code oder Codex CLI) mit eigenem Werkzeugsatz und
eigenem Rollenvertrag — keine Position sieht mehr, als ihr Vertrag
erlaubt.

## Für wen

Ein einziger Nutzer (Stefan), der zugleich Vorarbeiter und einzige
Entscheidungsinstanz ist. Ein Kollege kann in einer eigenen lokalen
Instanz ein Projekt importieren und eigenständig arbeiten (Meilenstein 4,
E-M4-2) — Mehrbenutzerbetrieb *innerhalb einer Instanz* ist ausdrücklich
kein Ziel.

## Zielbild

Stefan — und ein Kollege in eigener lokaler Instanz — legt Projekte an
oder importiert sie, sieht Arbeit, Aufmerksamkeit und Fähigkeiten der
Workforce an einem Ort (Leitstand/Jarvis Workspace), startet Arbeit per
Klick oder Chat, nimmt reale Ergebnisse ab oder fordert eine begrenzte
Anpassung desselben Auftrags an, und die Workforce entwickelt sich
darüber selbst weiter.

## Führungsprinzip

Dateien und Git sind der führende Zustand (`ARCHITECTURE.md` §2). Der
Kontrollzustand eines Projekts liegt in dessen eigenem Repository, nie
zentral (D3 "im selben Repository", E-M4-2). Ein laufender Prozess ist
keiner der drei Terminalausgänge eines Laufs (`ERFOLGREICH`,
`VERWEIGERT`, `FEHLGESCHLAGEN`) — Blockieren ist ein normaler Ausgang,
kein Fehler.

## Nicht das Ziel

Mehrbenutzerbetrieb *in einer Instanz*, Hosting, Abrechnung,
Provider-Adapter, parallele Workstreams, autonome produktive/externe/
irreversible Aktionen. Vollständige, laufend aktuelle Liste:
`docs/projekt/zielfassung.md` §13.2/§13.5 "Nicht in Meilenstein 4".

## Sollquelle

Vollständiges Zielbild, Rollenmodell, Lifecycle, Sicherheits- und
Evidenzmodell: `docs/projekt/zielfassung.md`. Aktueller Phasen- und
Feature-Stand: `docs/STATUS.md`. Diese Datei ist eine Kurzfassung für den
Kontextpaket-Bau, keine eigene Sollquelle — bei Widerspruch gilt
`docs/projekt/zielfassung.md`.

## Scout-Kandidaten

(keine)

## Für den Architekten (F39)

- Dateien und Git bleiben der führende Zustand; Existenzprüfungen nutzen die
  bestehenden projektbezogenen Lade- beziehungsweise Zugriffsfunktionen.
- Die Absicherung in verknuepfeSparringAuftrag verankern und Fehler über den
  bestehenden API-Fehlermechanismus verständlich ausgeben.
- Konkrete Fehlercodes und HTTP-Statuscodes bei der Umsetzung an den
  vorhandenen API-Konventionen ausrichten.
- Der Entwurf ergänzt ausschließlich einen neuen Meilenstein nach
  Meilenstein 5; Feature- und Meilenstein-IDs vergibt der Server.
