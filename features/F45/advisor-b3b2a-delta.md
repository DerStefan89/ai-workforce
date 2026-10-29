# Delta-Advisor-Pass F45 B3b-2a-1 „Kern + API + Skelett“ zu Plan v2

Geprüft: `features/F45/plan-b3b2a-v2.md` gegen `features/F45/advisor-b3b2a.md` (architecture-advisor, frischer Kontext,
29.10.2026). Entscheidungen Stefan: Schnitt angenommen, K2 = (b), H4 = nur nach ERFOLGREICH.

## Urteil

**Freigegeben mit Hinweisen.** K1, K2(b), H1–H8, H10–H12 aufgenommen; der Zuschnitt passt für einen Baudurchgang plus
eine Korrekturrunde. Einziges neues echtes Risiko: ein D13-Test ohne eindeutiges Zeitfenster des Renders (A3).

## Abgleich (Kurzform)

- K1 [BELEGT] Prädikat wie die Löschliste (`scripts/leitstand-server.mjs:6642`); ad hoc ⇒ `laufort === undefined` ⇒ kein
  Render (`:6500`).
- H2 [BELEGT] Leser der Detail-Projektion lesen nur Felder (`check-f652-pruefschritt.mjs:383`, `live-daten.js:192`,
  `views/live.js:256`); kein Leser von `pruefergebnis.versionSequenz` — additives Feld risikofrei.
- H3, H5, H7, H8, H11 [BELEGT] im vorgebauten Stand umgesetzt. H4 [BELEGT] `laufErfolgreich` (`:6627`) schließt
  VERWEIGERT aus, auf Server-Ebene ungetestet (H-a).
- H12: 40 Zeilen im Plan; `gestartet_am` bleibt (Bauauftrag) — tolerierbar.

## Neue Risiken

- N1 D13: `laufAktiv` fällt erst nach dem ganzen Prüfblock (`:6719`); ein 409 entsteht auch im Fenster des Prüfschritts —
  der Test muss das Render-Fenster treffen (A3).
- N2 Render nicht abbrechbar (`fuehrePruefungDurch` ohne AbortSignal): bis zu 180 s zusätzlich gesperrt (H-b).
- N3 Detail-Route: `detailLadeOptionen` erst bei `:8870`; Kommentar `:8844-8847` beim Umbau anpassen.
- N4 Nicht ladbare Version wirft wie heute bei `pruefergebnis-*`; „'fehlt'“ gilt nur für schemawidrige Daten (H-c).
- N5 Zeilenbilanz: der Nachlauf-Aufruf braucht eher 4–6 Zeilen; Bilanz bleibt ≈ −15.

## Auflagen

1. **A1** K2(b)-Satz in `gate-vorlage-node.md` und DEKLARIERT-Satz in `docs/architektur/arbeitsordner.md`.
2. **A2** `projiziereRenderNachweis` mit `letzteZeilen(…, 40)`, getestet mit mehr als 40 Zeilen.
3. **A3** D13 an das Render-Fenster binden: Stub wartet auf eine Freigabedatei, Test wartet auf `pruefergebnis-<laufId>`
   und fehlendes `render-nachweis-<laufId>`, dann `POST /api/laeufe` ⇒ 409; nach Freigabe Artefakt ROT, weiterer Start
   nicht mehr 409.

## Hinweise

- H-a Server-Negativfall VERWEIGERT ohne Bypass im Arbeitsordner mit `render.json` ⇒ kein Artefakt (sonst Restrisiko im
  Nachweis).
- H-b Nicht abbrechbare bis zu 180 s in `render.ts` und `arbeitsordner.md` als DEKLARIERT nennen.
- H-c Plansatz „'fehlt'“ auf schemawidrige Daten präzisieren.

## Pflichtfragen

Muss das existieren? `versionSequenz` im Detail: Preis für einen Helfer statt zwei, unschädlich — ja. Integrationstest:
ja (einziger Nachweis für `findeNpmCli` unter echtem `npm run`). Einfachste Lösung: Plan v2 mit A1–A3. Was kann weg: die
doppelte Projektion (laut Plan); darüber hinaus nichts.
