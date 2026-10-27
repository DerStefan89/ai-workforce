# F45 W2b-1 — Gates umbaufest — Plan v2

Stand 27.10.2026. Plan v1 `plan-w2b1.md` → Advisor (frischer Kontext) „Nicht freigegeben“, kein Schnitt, acht Auflagen →
diese Fassung (eine Korrekturrunde). v1 bleibt unverändert; hier nur die Änderungen.

## Entscheidungen zu den Auflagen

1. **Zentrale Stelle ist `check-f15-workflow`** (BELEGT `scripts/check-f15-workflow.mjs:3269-3283` AK6b/AK7 zählt
   `starteWorkflowSchritt(` = 6 mit D13-Begründung, `:3309-3327` F-228 zählt 14/13 und prüft jede Aufrufstelle). v1 hatte
   f15-workflow übersehen. Damit wird in `b2b3b1-rueckfrage` (f) auch `starts === 6` gestrichen; dort bleiben nur die
   Opt-in-Prüfungen. Gestrichen in **30** Gates (v1-Liste plus b2b3b1). f15-workflow ist Inventur-Kandidat „ersetzen durch
   Test“ — wer es umbaut, nimmt die drei Zählungen mit (Satz in Akte und Inventur).
2. **`f36-ws3-empfehlung` (e) bleibt.** Der Schnappschuss schließt F-833 (1) (Relativvergleich bliebe bei einer
   unbedingten Textänderung grün, `check-f36-ws3-empfehlung.mjs:337-339`); er hängt an der Ausgabe, nicht am Quelltext,
   und färbt bei einem Umbau nicht rot. Invariante steht dahinter, Verhaltensprüfung ist er bereits ⇒ unverändert.
3. **Nachweis statisch statt Mutation:** nach dem Umbau findet eine Suche über `scripts/check-*.mjs` nach einer Zählung
   von `starteWorkflowSchritt(` (split/match/matchAll) genau `check-f15-workflow`, nach `obergrenze_zeilen` genau
   `check-wachstumsbremse-server`, nach `'eingefroren'`-Zählung genau `check-f15-workflow`.
4. **F-1174 (BUG P2, offen) wird geschlossen** statt eines neuen BUG-Findings. Test in `git-starter.test.ts`:
   `Promise.race([fuehreGitAsync(['--version'], { cwd, zeitgrenzeMs: 0 }), new Promise((r) => setImmediate(() => r('spaet')))])`
   liefert das Ergebnis (`abbruch: 'zeitgrenze'`, `code: null`) vor `'spaet'` — gleiches für -1 und NaN. Unterscheidet alt
   (Auflösung frühestens in einer späteren Timer-Phase) von neu (synchron vor dem Start). Doc-Kommentar: Werte > 2^31−1
   setzt Node auf 1 ms (DEKLARIERT).
5. **o3 in `b2b3b2b2a-einschalten`:** neunter Rotfall für die zweite Vorgabe `rueckfrageBasis = undefined } = optionen`;
   Kopf deklariert die Restgrenze „Erweiterung von ERLAUBT_HANDLER/ERLAUBT_KARTE um eine neue Form fällt keinem Rotfall
   auf (seit W2b-1 kein Hash-Pin mehr)“. Pins in a3 (w) und b1 (w) entfallen wie v1; `sha256Hex` bleibt dort importiert
   (weiter genutzt).
6. **`check-f15-workflow-oberflaeche` wird gelöscht** mit Biome-Rotbeleg in der Sitzung (Syntaxfehler in einer Kopie
   von `views/workflows.js` unter `public/` ⇒ `npx biome lint <datei>` rot, danach entfernt). DEKLARIERTE Restgrenzen in
   Akte und Inventur: Endpunkt-Zuordnung in `api.js` für `/starten`, `/freigabe` und Reparatur-`POST /workflows` sowie
   die Container-ids in `index.html` prüft danach nur der Render-Nachweis.
7. **`attention-daten.test.mjs`:** ein Test mit `ERFOLGREICH`/`kenntnisgenommen: false` neben `FEHLGESCHLAGEN`
   ⇒ nur der fehlgeschlagene Lauf wird Eintrag (Rotbeleg für den Ergebnis-Teil, den f21-ws2 (d) bisher trug).
8. Ungenutzte Importe/Variablen je Datei von Hand per Suche prüfen (Biome/tsc fangen sie in `.mjs` nicht).

## Unverändert aus v1

Ratsche nur in `check-wachstumsbremse-server` (Streichen in b2b3b2b2b1 (w), b2b4a2b2 (h), fb2 (h), b5b1b2 (m)); f24
löschen; f8 bleibt (Kandidat verworfen); f28 (1) und f21-ws2 (d) streichen; b2b3c (f) und b2b3d (f) ganz streichen;
`GATES` −2 (120); Zeitgrenze `!(zeitgrenzeMs > 0)` vor dem Start; Findings: drei neue (HARNESS P2, TECH_DEBT P3,
PROCESS P3), F-1174/F-261/F-563 erledigt; Akte „Stand W2b-1“, W2-Notiz, Lagebild.
