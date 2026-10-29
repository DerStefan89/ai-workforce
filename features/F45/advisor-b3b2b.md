# Advisor-Pass F45 B3b-2b „Bewertung der Darstellung im qa-Schritt“ (Plan v1)

Stand 29.10.2026, Subagent `architecture-advisor` (frischer Kontext), geprüft `features/F45/plan-b3b2b.md`, Spike
`features/F45/nachweise/b3b2b/`, Entwurf `src/qa/index.ts`. Ergebnis wörtlich verdichtet; Einarbeitung in
`features/F45/plan-b3b2b-v2.md`.

## Entlastend (Fakt)

- E1 Render wird vor `meldeLaufende` abgewartet (`scripts/leitstand-server.mjs` ~6714/6736) — qa sieht das Artefakt.
- E2 Laufort je Workflow (`ermittleLaufort`), qa sieht denselben `.render-nachweis/`.
- E3 `projiziereRenderNachweis` wirft nie ('fehlt'), `findeAusfuehrungsSchritt` robust, kein Importzyklus, `ladeOptionen`
  im qa-Zweig vorhanden.
- E4 W1 netto 0 machbar (Importzeile und Aufruf werden nur geändert).
- E5 Entwurf rein; ohne Darstellung/unbekannt bitgleich (SHA-256-Test).
- E6 GRÜN kann keine alten Bilder tragen (Exit 0 nur nach `rmSync`).
- E7 Abschlusszeile bleibt letzte stdout-Zeile (stderr vor stdout in `baueAusgabeEnde`).
- E8 (vom Advisor als „schon auf main“ gelesen — **falsch**: die Schlüssel `hinweisFehler`/`hinweisFehlerVorab` waren beim
  Pass bereits im Arbeitsbaum dieses Pakets angelegt.)

## Befunde

- **B1 MITTEL** Bildpfad fehlt im Text: Spalte „Bilder“ trägt nur Dateinamen; der Spike fand die Bilder per Glob, im
  echten Arbeitsordner ist `.render-nachweis/` git-ignoriert (ob Glob ignorierte Pfade überspringt: offen). ⇒ Pfad
  `.render-nachweis/<Name>` ausdrücklich nennen, Test.
- **B2 MITTEL** Harness: `ersetzt_durch` qa für `dod-526c5ddb` (Workforce-DoD `npm run render-nachweis` mit Klicktabelle,
  F-622; ai-workforce hat keine `render.json`, der Kern-Render klickt nicht) und `dod-9f7fb386` (Mittel des Builders) zu
  stark ⇒ `bewusst_nicht` mit neuer Begründung. Agent design-guardian und die übrigen fünf UI-Punkte vertretbar mit „nur
  mit `render.json`“ (DEKLARIERT); bei Bewegung: qa sieht sie im CSS, nicht im End-Bild.
- **B3 MITTEL** Befund beim Lesen bestätigt (ROT mit altem Ordner in allen Fällen); Lösung mit §4 vereinbar (Kern reicht
  Text weiter, deutet nicht). F-1270 nur „erledigt (DEKLARIERT, Leseregel; wieder öffnen, wenn R2/F30 einen veralteten
  Bildbefund zeigt)“. Deterministische Alternative (mtime gegen `gestartet_am`) außerhalb des Zuschnitts.
- **B4 MITTEL** Fehlerpfad: `render.json` vorhanden, aber 'fehlt' (F-1271, Registrierung gescheitert) ⇒ qa bewertet still
  nicht. ⇒ `ladeQaDarstellung(…, laufWurzel)` liefert dann FEHLER „kein Render-Nachweis zu diesem Bau“ — oder F-1271/
  F-1272 M3 ausdrücklich zurückstellen.
- **B5 MITTEL** F-1272 „N3, N4 mit B3b-2b“ hat ohne Kern-/Skelett-Änderung keinen Träger ⇒ ausdrücklich neu zuordnen.
- **B6 NIEDRIG** Gescheiterter Build ohne Abschlusszeile wird nur nicht_pruefbar ⇒ Halbsatz: Projektfehler (Build,
  Skript) ist ein Befund HOCH, fehlende Umgebung nicht; F-1268 einschränken (ZEITGRENZE/FEHLER bleiben Hinweis).
- **B7 NIEDRIG** Karte: ZEITGRENZE ebenfalls „nicht geprüft“. (Nicht übernommen: der Auftrag lässt ZEITGRENZE
  ausdrücklich unverändert ⇒ Finding.)
- **B8 NIEDRIG** Zwei-Schritt-Servertest ist das teuerste Stück ⇒ Rückfall vorab: Tests von `ladeQaDarstellung` plus
  Quelltextprüfung der Serverzeile.
- **B9 NIEDRIG** Kopf „Wird aufgerufen von“ ohne Spike-Skript; `~~~~`-Zaun bricht bei `~~~~` im Text; `ergebnis` typisieren.

## Antworten

1. Zuschnitt haltbar, nicht zu groß. 2. Befund beim Lesen stimmt, §4 vereinbar, F-1270 nur DEKLARIERT. 3. Schemakonform;
zwei Punkte `bewusst_nicht`. 4. Laufort/Zeitpunkt/ungültige Fassung gut; Fehlerpfad B4 fehlt.

Pflichtfragen: Abschnitt und Adapter müssen existieren; Karte nur, weil billig; Harness-Edits nötig (sonst falsche
Begründungen „erst mit B3“). Einfachste Lösung: Leseregel im qa-Text plus B1 (und B4). Kann weg: optional
`nichtPruefbarGrund` zugunsten eines einheitlichen Ausgabe-Ende-Blocks (Abwägung, kein Muss).

## Status

- [x] Freigegeben mit Hinweisen — einzuarbeiten B1, B2, B3, B5; B4 bauen oder ausdrücklich zurückstellen.
