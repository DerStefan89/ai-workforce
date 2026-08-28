# ADR-0004 — Ein-Ebenen-Profilmodell

**Datum:** 2026-08-28
**Status:** Entschieden

## Kontext

Profile konfigurieren Gates, DoD, Werkzeuge und Review-Regeln je Projekt. Es brauchte eine Entscheidung, ob ein Profil aus einer einzigen vollständigen Datei besteht oder aus einem Domänen-Profil mit Projekt-Overlay zusammengesetzt wird. Fundstelle: `docs/projekt/zielfassung.md` §15 (Nachtrag 28.08.2026) und `docs/projekt/umsetzungsplan-fassung-1.md` Abschnitt 0.

## Optionen

Bei dieser bereits getroffenen Entscheidung wurden folgende Alternativen erwogen:

1. **Ein-Ebenen-Modell** — je Projekt genau eine vollständige, eigenständige Profildatei.
2. **Domänen-Profil mit Projekt-Overlay** (verworfen) — ein gemeinsames Domänen-Profil, das je Projekt punktuell überschrieben wird.

## Entscheidung

Ein-Ebenen-Modell: je Projekt genau eine vollständige, eigenständige Profildatei; kein Domänen-Profil mit Projekt-Overlay.

## Begründung

Ein Overlay-Modell würde die geltende Konfiguration eines Projekts auf zwei Dateien verteilen und erzeugt beim Lesen eine Merge-Reihenfolge, die zusätzliche Fehlerfläche für unklare Vorrangregeln schafft. Eine vollständige, eigenständige Datei je Projekt hält die Naht zwischen Kern und Profil sichtbar statt abstrahiert (D14) und macht die geltende Konfiguration an einer einzigen Stelle vollständig lesbar.
