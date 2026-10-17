# Lokale Dateien außerhalb des Repos — Einzelheiten zu ARCHITECTURE.md §2

Herkunft: wörtlich aus `ARCHITECTURE.md` §2 verschoben (F45 K „Kontext-Diät“, 17.10.2026), nicht gekürzt. Die Regeln
stehen als Sätze im Kern `ARCHITECTURE.md` §2. Dieser Text ist gleich verbindlich; bei Widerspruch gilt der Kern, und
jeder Widerspruch ist ein Befund; eine Regeländerung ändert Kern und Detail gemeinsam. §-Angaben im Text meinen `ARCHITECTURE.md`. Lesen nur bei Bedarf — wenn eine Aufgabe das
Thema berührt.

---

- Weitere Ausnahme (F45 F-1, E-F45-8): `~/.ai-workforce/faehigkeiten.lokal.json` — Aktivierung und Freigaben nach Inhalt
  der Fähigkeiten je Projekt (Schema `schemas/faehigkeiten-lokal.schema.json`). Liegt außerhalb jedes Repos und jedes
  Arbeitsordners, damit kein Lauf sich selbst etwas freigibt; geschrieben nur von den POST-Routen
  `/api/projekte/<id>/faehigkeiten/…` und — seit F45 F-3b-1 — `…/plugins/freigabe`, `…/plugins/freigabe/ruecknahme` und
  `…/plugins/zuordnung` (unpräfigiert oder `/api/projekte/<id>/…`) auf direkte Eingabe (gesperrt, solange ein Lauf aktiv ist), vorher/nachher je
  Lauf gehasht (Abweichung = Lauf rot). Kein Kontrollzustand, keine Hash-Kette; ungültig sperrt jeden Start mit
  Katalog-Fähigkeiten (E-F45-7). Eine Änderung, die nicht über diese Routen kam, gilt erst nach ausdrücklicher Bestätigung
  im Leitstand (POST `/api/projekte/<id>/faehigkeiten/bestaetigung`, „Datei geprüft – Stand übernehmen“, Laufsperre wie die
  anderen Routen); bis dahin sperren die Schreib-Routen und jeder Start mit Katalog-Fähigkeiten (F-1061, Entscheidung
  Stefan 12.10.2026).
  Seit F45 F-3b-1 trägt die Datei additiv oben `plugin_freigaben` (Freigabe je Plugin aus Stefans Claude Code, gebunden an
  den Hash der gefilterten Kopie und an genau einen Prüfbericht — gilt für den Inhalt, nicht je Projekt) und je Projekt
  `plugin_zuordnung` (Plugin-Skills/-Agents je Rolle, Standard leer, zuordenbar nur `ausfuehrung`, E-F3b-3). Ein Checkout
  ohne F-3b-1 hält die Datei mit diesen Feldern für ungültig (sichtbar, fail-closed). Die Freigabe gilt nur im Checkout,
  dessen Kontrollzustand den Prüfbericht trägt (sonst „Bericht fehlt“).
- Weitere Ausnahme (F45 F-3b-1, E-F3b-4): `~/.ai-workforce/plugin-kopien/<plugin-id>/<kopie_hash>/` — die gefilterte, gepinnte
  Kopie eines Plugins aus Stefans Claude Code (nur `skills/`, `agents/`, `commands/` nach Positivliste, Manifest neu; nie Hooks,
  MCP, LSP; `src/plugin-kopie`). Inhaltsadressiert, nie überschrieben (Ziel mit anderem Inhalt = 409 „Kopie verändert“),
  geschrieben nur von POST `…/plugins/freigabe` nach geltendem Prüfbericht (Temp-Geschwister + `rename`), gelöscht nur durch
  Stefan. Die Wurzel setzt nur der CLI-Bindeblock (im Handler Standard `null`; überschreibbar mit der Umgebungsvariablen
  `LEITSTAND_PLUGIN_KOPIEN_WURZEL`, etwa für eine Testinstanz). Alle Instanzen projizieren gegen denselben Werkzeugsatz
  `schreibend` (den der Workforce-Startvorlage, Option `pluginWerkzeugsatz`), damit `kopie_hash` und Freigabe nicht je Projekt
  verschieden ausfallen; ein gesetztes `null` heißt „Werkzeugsatz unbekannt“ (kein Rückfall auf die eigene Startvorlage, Agents nicht
  übernommen, Fakt sichtbar). Prüfläufe startet nur die Workforce-Instanz. Kein Kontrollzustand.
- Weitere Ausnahme (F45 F-3b-2): `~/.ai-workforce/plugin-kopien/_lauf/<lauf_kopie_hash>/` — die Lauf-Kopie eines Ausführungslaufs
  (`src/plugin-lauf`): Manifest, Lizenzdateien und nur die der Rolle zugeordneten Skills/Agents aus der gepinnten Kopie, aus den
  gegen den Prüfbericht geprüften Bytes geschrieben; Ordnername = Hash, inhaltsadressiert (vorhanden mit gleichem Inhalt →
  wiederverwendet, anders → Lauf startet nicht), außerhalb jedes Arbeitsordners, geschrieben nur vom Startweg eines
  Ausführungsschritts mit angezeigter Plugin-Zuordnung, nie gelöscht (Stefan). `_` ist kein gültiger Anfang einer Plugin-id — keine
  Kollision mit `<plugin-id>/`. Der Lauf lädt sie per `--plugin-dir`, `enabledPlugins["<name>@inline"] = true`.
- Weitere Ausnahme (F45 F-2b-2c, F-1061 (1)): `~/.ai-workforce/faehigkeiten.stand.json` (immer im Ordner der lokalen
  Datei) — der zuletzt bekannte Stand (Pfad, Hash, Zeitpunkt, Quelle) der lokalen Fähigkeiten-Datei, damit eine
  Änderung bei gestopptem Leitstand sichtbar bleibt. Geschrieben atomar (tmp + rename, LF) nur vom Wächter des Leitstands nach
  einem Schreiben über die Fähigkeiten-Routen und nach einer Bestätigung; gelesen nur beim Serverstart. Kein Kontrollzustand und
  kein Kern-Artefakt: Laufzeitstand eines Rechners, für alle Checkouts derselbe, nicht im getrackten `kontrollzustand/`
  (Advisor-Pass F-2b-2c A4). Startregel fail-closed: weicht der Hash ab, fehlt der Stand, ist er beschädigt oder gehört er zu
  einem anderen Pfad, gilt die Datei als außerhalb geändert (gesperrt bis zur Bestätigung) — nur wenn die lokale Datei fehlt,
  ist nichts zu bestätigen. Schutz gegen einen Prozess mit Nutzerrechten ist sie nicht (er kann beide Dateien ändern).
- Stefans Claude-Code-Bestand (`CLAUDE_CONFIG_DIR` bzw. `~/.claude`, F45 F-3a-1, `src/claude-plugins`) liest der Leitstand nur
  lesend: die Liste über `claude plugin list --json` (Startziel der Startvorlage, unverändertes `starteProzess`), die
  Plugin-Ordner und die Liste installed_plugins.json im Plugin-Ordner der CLI per readFile/readdir/lstat. Unser Code schreibt dort nie (Gate f45-f3a (b)).
  Die CLI selbst legt beim Listen in `.in_use/` der synced-Plugins eine Marke an und löscht sie wieder — gemessen und von Stefan
  als Nebenwirkung angenommen (E-F3a-1, `features/F45/nachweise/f3a/spike.md`).
  Ein Lauf mit Plugin-Lauf-Kopie (F45 F-3b-2) kann über die CLI den Datenordner `plugins/data/<name>-inline` anlegen (Auslöser
  laut Spike `features/F45/nachweise/f3b2/spike.md` S6: Hooks, MCP, `CLAUDE_PLUGIN_DATA` im Text — die Kopie übernimmt keinen davon).
  Der Controller erfasst `plugins/data` vor und nach dem Lauf nur lesend (Liste, mtime, Größe); eine Abweichung ist ein Befund in
  der Laufakte, kein Abbruch (Variante A, Challenger 14.10.2026). Unser Code schreibt dort weiterhin nie.
