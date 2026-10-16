# F45 W1 — Plan v2 (nach Advisor-Pass `features/F45/advisor-w1.md`, Freigegeben mit Auflagen)

Plan v1 (`features/F45/plan-w1.md`) bleibt unverändert stehen; dieses Dokument nennt nur, was sich ändert, und gilt vor v1.
Kein weiterer Pass nötig (weder B1 (c) noch Sammel-Hook gewählt, advisor-w1 „Nächster sinnvoller Schritt“).

## Entscheidungen Stefan (16.10.2026)

- **B1 = a:** Rot-Nachweis (a2)/(b2) gegen echtes git — ich bereite die Kopie vor (Gate + JSON vor dem Commit darin), Stefan
  führt im Mini-Repo die Git-Befehle aus (`git init`, `git add -A`, `git commit`, `git update-ref refs/remotes/origin/main
  HEAD`). commit-guard bleibt unangetastet.
- **Offener Punkt 1 = straff**, für Zeilen und Routen gleich (B5).
- **B2/B3 = Helfer auslagern:** Folgepakete bis W2 gleichen Server-Zeilen aus, indem sie reine, nicht schreibende Helfer nach
  `scripts/leitstand/*.mjs` auslagern (z. B. `pruefeAuftragsformular`). Neue Routen: Dispatch im `routen-*.mjs`, schreibende
  Aufrufe (Workflow-Schreiber F-228, `starteWorkflowSchritt(`) bleiben im Server und werden als Rückruf übergeben. Steht in
  ARCHITECTURE.md und in der Reihenfolge-Zeile fixpaket §3.
- **Zuschnitt = ein Branch, drei Commits:** Teil 3 (F-1123 (18)) → Teil 2 (3e-3) → Teil 1 (Gate) + Doku.

## Änderungen an §1 Gate

- **Straff:** (a1) Ist > Grenze rot; neu **(a3)** Ist < Grenze rot („Grenze in scripts/wachstumsbremse-server.json auf N
  senken“). Routen: (b1) Literal im Server ohne Bestandseintrag rot; neu **(b3)** Bestandseintrag ohne Literal im Server rot
  („aus dem Bestand entfernen“). Die Hinweise aus v1 entfallen. Unit-Test „Erhebung = Bestand“ ist damit konsistent.
- **Erhebung (B4):** vier Arten `gleich`, `beginnt`, `endet`, **`muster`** (Regex-Literal direkt vor `.exec(pfad)`/`.test(pfad)`,
  heute 5: :8355, :8386, :9583, :9675, :9694). Für `gleich`/`beginnt`/`endet` nur Literale, die mit `/` beginnen (`'string'`
  aus :869/:1022/:2361 fällt heraus). Zeilen, deren Text nach Leerraum mit `//`, `*` oder `/*` beginnt, werden übersprungen
  (Kommentar :8777); ein Literal in einem Kommentar hinter Code auf derselben Zeile zählt mit (Grenze benannt).
- **Referenz (L1):** `git rev-parse --show-toplevel` muss die Wurzel sein (sonst `null`); dann `git merge-base HEAD origin/main`,
  Rückfall `git merge-base HEAD main`; `git show <basis>:scripts/wachstumsbremse-server.json`. Scheitert eines ⇒ `null` und
  sichtbare Zeile „Referenz nicht lesbar — (a2)/(b2) nicht geprüft“ (Durchsetzungsgrad: im Cloud-Clone ohne `origin/main`
  bzw. vor dem ersten Merge greifen (a2)/(b2) nicht).
- **Lokale JSON (L2):** fehlt, kein JSON, `obergrenze_zeilen` keine positive Ganzzahl oder eine der vier Listen fehlt ⇒ rot.
- **Invariante (i) entfällt (L6)** — vier Gates zählen `starteWorkflowSchritt(` schon.
- **Durchsetzungsgrad (B2, §8):** ERZWUNGEN: Zeilenzahl des Servers; Literal-/Regex-Dispatch an `pfad`. DEKLARIERT: Dispatch über
  andere Variablen/Konstanten, Kombination vorhandener Literale, neue Methode auf bestehendem Pfad, Multi-Projekt-Dispatcher
  (`url.pathname.match`, :13258), Literal in Kommentar hinter Code, Bearbeiten von Gate/JSON ohne Anheben gegenüber main.
  Neue Zeile in ARCHITECTURE.md §1 (scripts) mit diesem Grad.
- **Rot-Nachweis (L7, B1):** `git archive -o <scratch>/w1/main.tar HEAD`, `tar -xf` je Fall in eigenen Ordner; Gate + JSON
  hineinkopieren; Stefan: Mini-Repo-Befehle; dann je Fall eine Änderung (Server ± Zeilen, JSON) und Gate ⇒ Exit 1 mit genau
  dem Fallbefund: (a1) Server +1 Zeile; (a3) Server −1 Zeile; (a2) Server +1 und Grenze +1; (b1) eine Zeile durch
  `if (pfad === '/api/w1-probe') {}` ersetzen; (b3) Route aus dem Server entfernen (Zeile ersetzt, Bestand unverändert);
  (b2) Probe-Route in Server (Zeile ersetzt) und Bestand. Grün: Ausgangskopie; Probe-Route nur in `routen-w1probe.mjs`
  (trivial, das Gate liest keine Module — so benannt); Route entfernt + Bestand und Grenze nachgezogen; Kopie ohne `.git`
  ⇒ Rückfall-Zeile, grün. Protokoll `features/F45/nachweise/w1/rot-nachweis.md`.
- Testwortlaut (L7): „rein, ohne Schreiben“; ein Fall liest die echte Serverdatei.

## Änderungen an §2 Aufräumen (L3)

- `statSync`-Fehler (Ordner verschwindet gleichzeitig) ⇒ Warnung, überspringen.
- Ohne gültige `pid` nur löschen, wenn älter als 24 h **und** `home/` und `temp/` vorhanden sind (Struktur aus
  `richteNeutraleUmgebungEin`); mit gültiger toter `pid` ebenfalls nur bei dieser Struktur.
- Starter: `process.once('exit', entferne)` und Signale bleiben zuerst; danach `markiereLauf` + `raeumeAlteLaeufeAuf` in `try`
  (Wurf ⇒ Warnung, der Lauf geht weiter). Quelltextprüfung der Reihenfolge als Unit-Test (liest den Starter als Text, importiert
  ihn nicht).
- Benannt: Teil-Löschen bei belegten Handles kann `pid` entfernen (dann 24 h); `rmSync`-Wiederholungen können den Start je
  belegtem Ordner um ≈ 1 s verzögern. F-1125 (R1)–(R8) bleiben offen und werden in F-1125 neu verortet (bei der nächsten
  Berührung des Render-Helfers).

## Änderungen an §3 F-1123 (18) (L4)

- Bestandsschutz wie v1 (Wahrheit von der Platte). Zusätzlicher Test: gleiche `bereiche` in anderer Reihenfolge ⇒ voll geprüft
  (wirft). Benannt: liefert `erhoehtesBudget` > MAX_SAFE, bleibt es bei 500 (Randfall).
- Unit-Tests und (b13) einmal rot gegen main kalibrieren (Ergebnis in `features/F45/nachweise/w1/rot-nachweis.md`).

## Änderungen an §4 Dokumente (L5, B2)

- F-1123: P3 → P2 wie beauftragt (Grund: (18) war ein 500 auf einem Schreibweg); Nachtrag „(18) erledigt in W1“. Die übrigen
  offenen Punkte bleiben unter dem Eintrag; die Priorität wird bei der nächsten Berührung neu bewertet (L5).
- ARCHITECTURE.md §1: Regel „Server wächst nicht; neue Routen in `scripts/leitstand/routen-*.mjs`, Schreibaufrufe bleiben im
  Server als Rückruf; Ausgleich durch Auslagern reiner Helfer bis W2“ mit Durchsetzungsgrad.
- fixpaket §3 Reihenfolge-Zeile um die Bezahlregel ergänzen.

## Nachtrag nach dem Prüfpass (code-reviewer, qa; je „Freigegeben mit Hinweisen“), eine Korrekturrunde, 16.10.2026

Plan v2 bleibt oben unverändert; die Korrekturrunde ändert:
- Gate: Erhebung zusätzlich `==`/`!=`, Backtick ohne `${`, `case '/…':`, `pfad.match(/…/)`; `ladeBremse` (rein, (f) als Unit-Test);
  `leseReferenz` unterscheidet „fehlt“ von „kein gültiger Stand“, versucht `main`, wenn `origin/main` die Datei auf der
  merge-base nicht hat, und fällt auf die Spitze des Refs zurück (gestapelter Branch nach Squash-Merge, Hinweis „main
  einmergen“); jeder Hinweis ohne Referenz endet mit „(a2)/(b2) nicht geprüft“; Meldungen (a2)/(b2) nennen den Weg.
  Durchsetzungsgrad ergänzt: **CI prüft (a2)/(b2) nicht** (checkout fetch-depth 1) — Entscheidung Stefan offen (ci.yml ist
  nicht Teil dieses Auftrags); `includes(pfad)`, Kommentar-Zeilenanfang, Fehlalarm bei Dateipfad-Variablen `pfad` benannt.
- Aufräumen: Kandidat = Inhalt ⊆ {home, temp, pid} (statt „home und temp vorhanden“) — ein Rest nach Teil-Löschen wird nach
  24 h geräumt statt nie; `pid` über 2^31−1 ungültig; ENOENT still; Warnungen mit „erneut versucht“; Wartezeit ≈ 5,5 s je
  belegtem Ordner (statt „≈ 1 s“); geteilte Wurzel über Rechnergrenzen deklariert.
- F-1123 (18): Guard für den Bestand (nur Objekt); Findings-Text auf das am realen Pfad Belegte begrenzt.

## Nachtrag Entscheidungen Stefan nach dem Bericht (16.10.2026)

- **B1 neu:** kein Mini-Repo — Rot-Nachweis (a2)/(b2) mit echtem git als Challenger-Cloud-Prüfung nach dem Push
  (`features/F45/nachweise/w1/rot-nachweis.md` §2).
- **CI:** `.github/workflows/ci.yml` checkt mit `fetch-depth: 0` aus (einzige Änderung dort) — (a2)/(b2) greifen in der CI;
  Durchsetzungsgrad in ARCHITECTURE §1, Gate-Kopf und F-371 nachgezogen.
- Commit durch Stefan in einem Schritt (statt drei Commits).
