<!--
Ziel-Pfad im Repo: docs/harness/stack-kandidaten.md
Stand dieser Fassung: 28.09.2026
Erstlektüre: nein — Nachschlagewerk für den Architekten, kein Teil des Einstiegs.
-->
# Stack-Kandidaten (Gruppe 2 der Recherche-Übernahme)

Produkt-Bibliotheken und Werkzeuge, die ein Projekt der Workforce als
Teil seines eigenen Stacks nutzen kann — keine Laufzeit-Fähigkeiten eines
Laufs (die stehen im Katalog `ressourcen.json`). Grundlage ist E-F36-5
(`docs/projekt/zielfassung.md` §13.6); die Einordnung aller 38 Kandidaten
steht in `features/F36/katalog-uebernahme.md`.

**Noch nicht verdrahtet.** Der Architekt liest diese Liste heute nicht
automatisch; die Verdrahtung ist F36 WS-3. Nichts davon ist installiert,
geprüft oder freigegeben. Vor einer Stack-Entscheidung Version pinnen und
die vollständige Lizenz lesen (Auswahlfilter der Quelle).

Alle Werte stammen aus `docs/harness/kandidaten-2026-09-15.md` (Prüfdatum
15.09.2026, keine eigene Recherche). „Quelle-Zeile" ist die Zeilennummer
der Bewertungsmatrix dort. Lizenzangaben mit „GitHub-Metadaten" sind
schwächere Evidenz als der Lizenzvolltext.

| Name | Zweck | Einsatzgebiet | Lizenz | Kosten | URL | Quelle-Zeile |
|---|---|---|---|---|---|---|
| shadcn/ui | Anpassbare React-Komponenten als Grundlage des Designsystems. | UI | MIT (GitHub-Metadaten) | Lokal; 0 Lizenzgebühr | https://github.com/shadcn-ui/ui | 123 |
| Kibo UI | Ergänzt shadcn um komplexere Komponenten, etwa Kanban und Gantt. | UI | MIT laut offizieller Website | Lokal; kostenlos | https://www.kibo-ui.com/ | 124 |
| Thinking Orbs | Animierte Canvas-Zustandsanzeige für Jarvis und andere Agenten-UIs. | UI | MIT (GitHub-Metadaten) | Lokal; 0 Lizenzgebühr | https://github.com/Jakubantalik/thinking-orbs | 130 |
| pdfcn | Wiederverwendbare PDF-Komponenten für React (nicht offizielles shadcn). | Dokumente, UI | MIT (GitHub-Metadaten) | Lokal; kostenlos | https://github.com/shadcn-labs/pdfcn | 200 |
| MarkItDown | Konvertiert Dokumente und weitere Dateiformate in Markdown. | Dokumente | MIT (GitHub-Metadaten) | Lokaler Basispfad kostenlos; Azure-/LLM-Funktionen optional bezahlt | https://github.com/microsoft/markitdown | 216 |
| OCRmyPDF | Ergänzt gescannte PDFs um durchsuchbaren Text. | Dokumente | MPL-2.0 (GitHub-Metadaten) | Lokale CPU, kein LLM erforderlich | https://github.com/ocrmypdf/OCRmyPDF | 156 |
| AnyDoc | Schnelle Rust-Dokumentkonvertierung mit Python-/Node-Bindings. | Dokumente | MIT (GitHub-Metadaten) | Lokaler Betrieb | https://github.com/firecrawl/anydoc | 234 |
| OfficeCLI | Lokale Bearbeitung von DOCX, XLSX und PPTX per CLI. | Dokumente | iOfficeAI Apache-2.0; officecli/officecli MIT | Kandidat kostenlos; Agentenquota | https://github.com/iOfficeAI/OfficeCLI | 277 |
| Hyperframes | HTML-/CSS-basierte Videoerstellung für Agenten. | Video | Apache-2.0 (GitHub-Metadaten) | Framework kostenlos; Rendering und optionale KI extra | https://github.com/heygen-com/hyperframes | 195 |
| ntfy | Push-Benachrichtigungen für Jobabschluss, Fehler und Freigabeanfragen. | Benachrichtigung | Apache-2.0 oder GPL-2.0 laut README | Self-Hosting; gehostete Gratis-/Bezahlpläne | https://github.com/binwiederhier/ntfy | 178 |
| Portless | Stabile lokale Entwicklungs-URLs statt wechselnder Portnummern. | Entwicklungsumgebung | Apache-2.0 (GitHub-Metadaten) | Lokal; kostenlos | https://github.com/vercel-labs/portless | 267 |

## Hinweise aus der Quelle

- **OfficeCLI:** mindestens zwei gleichnamige Repos; bevorzugter
  Prüfkandidat ist iOfficeAI/OfficeCLI.
- **AnyDoc:** gegen MarkItDown an echten Dateien vergleichen; Formattreue
  vor Geschwindigkeit.
- **Hyperframes:** Schrift- und Medienrechte separat prüfen.
- **ntfy, Portless:** eher Infrastruktur als Bibliothek; ntfy ist in der
  Quelle auch für Benachrichtigungen der Workforce selbst gedacht.
