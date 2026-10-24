# Delta-Advisor-Pass F45 B5a-2: Plan v2 gegen den Bericht zu v1

Subagent `architecture-advisor`, frischer Kontext, 24.10.2026. Geprüft wurde `features/F45/plan-b5a2-v2.md` gegen `features/F45/advisor-b5a2.md` und `features/F45/plan-b5a2.md` (Delta, kein neues Review). Urteil: **Freigegeben mit Hinweisen**. Bericht im Kern unverändert abgelegt.

**Rollengrenze:** nur Read, Grep und Glob; kein git, keine Gates oder Tests ausgeführt. Den in v2 zitierten Wortlaut des Bauauftrags konnte der Advisor im Repo nicht finden (er steht im Bauauftrag, nicht in einer Datei).

## (1) B1, Weg (b): trägt der Warnhinweis das Risiko?
Ja, ausreichend; zwei Ergänzungen.
- [Fakt, entlastend] PUT ersetzt einen Abschnitt nur, wenn sich der normalisierte Wert vom gelesenen unterscheidet (`src/feature-auftrag/akte-schreiben.ts:334-335`) — „übernimm, was bleiben soll“ funktioniert.
- [Fakt, entlastend] Entscheidung jetzt ausdrücklich dokumentiert (v2 Z. 8-13); Gate b5 mit Gegenprobe; Render-Nachweis gegen die neutrale Instanz.
- [Offene Unsicherheit] Ob der Wortlaut des Auftrags Stefans Entscheidung für Weg (b) ist, ist im Repo nicht prüfbar; v2 hält (a) bis zur Abnahme offen — vertretbar.
- [Fakt] Ein fehlender Abschnitt wird neu angelegt, vor „## Änderungen“ bzw. am Dateiende (`akte-schreiben.ts:336-339, 357-359`). Empfehlung: Hinweis „ersetzt bzw. legt am Ende an“.
- [Schlussfolgerung] Die Erfolgsanzeige soll `geaendert[]` der PUT-Antwort wörtlich nennen (kein Server-Code nötig).
- [Annahme] Wiederherstellen über git geht nur bis zum letzten Commit; Restfall klein, weil der Hinweis vorher auf die Datei verweist.

## (2) B5 über `auftragsSperre`
Keine Nebenwirkung auf das Jetzt-Band; drei Bauauflagen.
- [Fakt, entlastend] `detailJetzt` fragt `ctw === 'frei'` nur für die Bug-Triage ab (`views/workboard-detail.js:478`, `istBug` nur für Findings).
- [Fakt, entlastend] Laufendes Click-to-Work bleibt unberührt (`views/workboard.js:925-930`); ohne `workflowId` kein Link (`:961`).
- [Fakt] Schlüssel `entwicklung.ctw.gesperrt.akte` in de, en, tr, ru nötig (`:962`).
- [Schlussfolgerung] Öffnen und Schließen des Formulars müssen `renderBearbeitungsAbschnitt(workitem)` ausdrücklich aufrufen, sonst bleibt `#workboard-bauen` bis zum nächsten Poll-Tick bedienbar.
- [Schlussfolgerung] Der neue Zweig gehört ans Ende von `auftragsSperre` (hinter `abnahme`), nur bei `akteBearbeitung?.featureId === workitem.id`; JSDoc und Dateikopf mitziehen.

## (3) B3 Ladezähler
Sachgerecht. [Fakt, entlastend] Muster `ablaufLadung`, neuer `detailNachtrag` je Öffnen; `akte = undefined` blendet „Bearbeiten“ während des Neuladens aus. [Schlussfolgerung] Statisches Gate b6 belegt nur das Vorhandensein — eine Render-Szene mit verzögertem ersten GET oder die Grenze im Bericht nennen.

## (4) Neue Lücken
- D1 (niedrig): `ladeAlleWorkitems` setzt `alleWorkitems = undefined` (`workboard.js:625`) — „lädt“ kommt von selbst; Nebenwirkung Board kurz leer, als Grenze in den Dateikopf.
- D2 (niedrig): Fokus auf „Bearbeiten“ erst nach dem Neuschreiben des Inhalts setzen.
- D3 (niedrig): festlegen, ob „Als Feature anlegen“ auch bei offenem Auftragsdialog steht (harmlos, zwei getrennte POSTs).
- D4 [Fakt, entlastend]: Zuschnitt bewusst ein Paket mit Ausweg; Kanban gestrichen, F-1181.

## Status
- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

Begründung: Alle Vorab-Punkte (B1, B2, B3, Kanban, Zuschnitt) sind ausdrücklich entschieden; B5–B11 stehen als Bauauflagen. Rest ohne Architekturfolge: i18n in vier Sprachen, Neurendern des Click-to-Work-Bereichs, Reihenfolge in `auftragsSperre`, `geaendert` in der Erfolgsanzeige, Wortlaut „legt am Ende an“, Ladezähler belegen oder Grenze nennen.

## Nächster sinnvoller Schritt
Hinweise aus (1), (2) und D1–D3 als Bauauflagen übernehmen (kein Plan v3); Stefan bestätigt Weg (b) bei der Abnahme.

## Übernahme (Autor, 24.10.2026)
Alle Hinweise übernommen: Wortlaut „ersetzt bzw. legt neu an“; `geaendert` in der Erfolgsanzeige; Sperrgrund `akte` am Ende von `auftragsSperre`, Neurendern bei Öffnen/Schließen; Fokus nach dem Inhalt-Render; D3: „Als Feature anlegen“ steht unabhängig vom Auftragsdialog; Ladezähler per Render-Szene mit verzögertem erstem GET belegt, sonst als Grenze im Bericht.
