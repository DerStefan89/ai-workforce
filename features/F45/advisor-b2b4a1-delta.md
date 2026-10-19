# Delta-Advisor-Pass F45 B2b-4a-1 „Bereit zum Sichern“ — Server-Teil (Plan v3)

Geprüft: `features/F45/plan-b2b4a1.md` gegen `d7f207c`, Vorgänger `advisor-b2b4a-delta.md`. Subagent
`architecture-advisor`, frischer Kontext, nur Read/Grep/Glob, 19.10.2026. Inhaltlich übernommen, gestrafft.

Grenzen der Prüftiefe: kein Bash/Git; `npm run check`, Gates, Tests nicht ausgeführt; Ist-Zeilen nicht gezählt
(Ratsche ≈ −60 überschlägig); kein Worktree angelegt; nicht gemessen, ob ein Attrappen-Ablauf ABGESCHLOSSEN erreicht; nicht
gelesen: `leiteArbeitsordnerAb`, `listeVersionen`/`checkpoint-store` bei Windows-Sonderzeichen, `LISTE_MAX_BYTES`,
`fixpaket-f45.md:152`, `feature.md`, Lagebild, `nachweise/b2b4a1/powershell-versuch.md`.

## (1) Befunde 1–7 aus advisor-b2b4a-delta.md

1 „abgelehnt“ gestrichen, O1 über GESTOPPT (`leitstand-server.mjs:12750-12758`) — aufgelöst. 2 `arbeitsordnerGrund` passt zur
Projektion (`:6653`, `:6656`, `:6660`, `:6667`, `:6668`), Regel 4 entfernt, `?? 'nichtBestimmbar'` — aufgelöst. 3 Wortlaut
„noch nicht auf main“, Grenze + P3 — aufgelöst. 4 Titel zurückgestellt, TECH_DEBT P3 — aufgelöst. 5 Einzug an 4a-2 — für
4a-1 nicht relevant. 6 Server-Teil aufgelöst; CONTEXT übergibt Befund 6 nicht ausdrücklich an 4a-2 (→ 22). 7 Zuschnitt
erfüllt: zwei reine Module mit Tests, eine reine Verschiebung, kleiner Serverumbau, HTTP-Gate nach Muster, Doku; keine UI,
kein i18n, kein Render-Nachweis, keine Golden-Stellen. Größtes Risiko: Worktree-Aufbau im Gate.

## (2) arbeitsordnerGrund gegen Projektion und ermittleLaufort

8. [Fakt, entlastend] `ok:true` nur bei `bedarf !== 'pflicht'` oder Roh-BEREIT mit `existsSync` (`:6498-6502`).
9. [Fakt] Lage zweimal gelesen (`:6497`, `:6652`), zwei `existsSync` (`:6499`, `:6668`). `null` nur im Wettlauf
   (Vorbereitung schreibt BEREIT / Ordner erscheint dazwischen), `??` fängt ab; Bestand klebrig (`:6454`), Schema vier
   Status. Mitlaufen: über HTTP nicht erzeugbar — Quelltext-Prüfung oder Gegenprobe.
10. [Fakt] Aufräumen nutzt `arbeitsordnerVorbereitungLaeuft` (`:12272-12278`), Status bleibt BEREIT bis ENTFERNT. Ordner weg ⇒
    409 `inVorbereitung` (sachlich falsch); Ordner noch da ⇒ Git in sterbendem Ordner, nur Feldstatus. Mitlaufen: Text
    neutral („wird vorbereitet oder aufgeräumt“) oder Grenze.
11. [Fakt] `aufraeumen` nur mit ENTFERNT (`:12288`), neue Vorbereitung setzt `null` (`:6631`). Harmlos; Rotfall prüft
    unmöglichen Zustand — nur ENTFERNT. Mitlaufen.
12. [Fakt, entlastend] veraltetes IN_VORBEREITUNG ⇒ `ok:false` und Projektion FEHLGESCHLAGEN (`:6474`) — konsistent.

## (3) Reihenfolge leiteSichernLageAb

13. [Fakt] Projektion meldet `status: 'ok'` (`routen-code.mjs:607`, `:378`, `:465`) — „nicht ok“ heißt `.status !== 'ok'`.
14. [Fakt] `ermittleLaufort` liefert kein `bedarf` (`:6494-6502`); Empfehlung additiv erweitern
    (`check-f45-b2a3b-review-stand.mjs:184` prüft nur den Aufruf). Als Erstes im Bau festlegen.
15. [Fakt] ohne Remote `origin:false` (`routen-code.mjs:390`); Ableitung prüft weder `remoteWebUrl` noch `branch` ⇒ lokales
    Projekt ohne origin bleibt „bereit/push“. Entscheiden: Grund `keinOrigin` oder Deklaration, dass 4a-2 über
    `remoteWebUrl.origin` löst.
16. [Fakt] Fremdprojekte ohne node_modules in `.gitignore` (`src/arbeitsordner/index.ts:338-347`), `--untracked-files=all`
    (`routen-code.mjs:405`), Skelett ohne `.gitignore` ⇒ nach `npm ci` entweder Ausgabe zu groß (`nichtBestimmbar`) oder
    sofort „bereit/commit“ mit node_modules im Block. [offene Unsicherheit] `LISTE_MAX_BYTES`. Grenze deklarieren, an 4a-2.
    Entlastend: Regel 1 vor 2 richtig; „Abnahme offen ⇒ bereit“ belegt. Klein: Regel 3 verlangt `basis` auch für reinen
    Commit — ohne main/origin `nichtBestimmbar`; deklarieren.

## (4) Sicherheit ?workflow=

17. [Fakt, entlastend] 403 vor allem (`:8497-8503`); 400 rein vor `ladeArtefaktVersion`; `cwd` aus Kontrollzustand (`:6502`);
    `pruefeLaufId` (`src/checkpoint-store/index.ts:75-84`) = `LAUFID_UNZULAESSIGE_ZEICHEN` (`:2203`); `URLSearchParams`
    dekodiert vorher; Grund von `ermittleLaufort` (mit id, `:6500`) wird nicht weitergereicht; 200 Zeichen hält
    `workflow-<id>` unter 255 je Komponente.
18. Mitlaufen: [offene Unsicherheit] `:`/`*`/`?`/`|` passieren — Gate-Fall `a:b` → 404, nicht 500; 400-Text gibt `roh` nicht
    wieder, Gate „ohne id“ auch für 400; Körper einheitlich `grund_schluessel` (400 `null`); [Annahme] `codeGit` reist im
    `optionen`-Objekt an `fuehreAufgabeDurchFn` mit (`:5883-5886`) — harmlos, benennen.

## (5) Verlegungen und Gates

19. [Fakt, entlastend] `check-f813-csrf` (4) (`:298-301`) — verschobener Block ohne `.method`; Auflage auch für
    `kennung.test.mjs` und Tests zu `text-auszug`. Laufzeit-Importe nur `check-f22-click-to-work.mjs:62`,
    `check-f31-gedaechtnis.mjs:49`; Muster `export … from` existiert (`scripts/erzeuge-invocation-policy-nachweise.mjs:65`).
    LAUFID in Gates nur in Kommentaren; `src/capabilities-ansicht/index.ts:109` nennt keinen Ort. Wachstumsbremse (a3) straff,
    Plan senkt; kein Routen-Literal. Quelltext-Gates auf `scripts/leitstand/` suchen `erzeugeRequestHandler(`/rueckfrage —
    unberührt; `starteWorkflowSchritt(` = 6, Workflow-Schreiber = 14 bleiben.

## (6) Gate-Plan

20. [Fakt, entlastend] Handler-Optionen destrukturiert (`:5862ff`); Muster setzt `arbeitsordner`, Npm-/E-183-Attrappen,
    `standCacheMs: 0` (`check-f45-b2b3b2b2b2b1-projekt-cli.mjs:114-126`), wartet auf BEREIT (`:151-153`); `fuehreGitAus`
    exportiert (`routen-code.mjs:108`), Server importiert es nicht (`:541`); Branch `main` nötig für `findeBasisRef`.
21. Auflagen: (b) vor „bereit“ auf ABGESCHLOSSEN warten (Muster wartet nur auf die Attrappe, `:155`); `keinArbeitsordner`
    braucht ABGESCHLOSSEN mit nur lesendem Schritt; `nichtAbgeschlossen` im Fenster zwischen BEREIT und zweitem Start;
    (c) Vergleich nach `JSON.parse(JSON.stringify(direkt))`; Fall „gemeinsames Versprechen“: `kein_bedarf` mit `?workflow=`
    und ohne Parameter gleichzeitig — Antwort ohne Parameter ohne `ablauf`; (d) Diff-`pfad` ohne id wählen.

## (7) Doku

22. [Fakt] `--test-concurrency=4` ist schon gesetzt (`package.json:15`, F-1002 erledigt, `state/findings-archiv.md:5339-5345`)
    — neues HARNESS_IMPROVEMENT verweist darauf und nennt eine andere Maßnahme. Nächste freie ID F-1154
    (`state/findings.md:8445`). CONTEXT: Befund 6 und die Grenzen 15/16 an 4a-2. Nachweis-Ordner `b2b4a1/` bewusst. ARCHITECTURE
    bleibt; Kopf `routen-code.mjs`: auch im Arbeitsordner nur lesend.

## Urteil: Freigegeben mit Hinweisen

Befunde 1–6 für den Server-Teil aufgelöst, Zuschnitt erfüllt; keine Route, kein Schema, kein Status, kein Routen-Literal;
Prüfreihenfolge trägt; kein `ok:true` bei Pflicht ohne BEREIT. Offen nur Festlegungen ohne neue Architektur: `bedarf` (14),
`.status` (13), origin/Branch bei push (15), node_modules-Grenze (16), Gate-Fall gemeinsames Versprechen (21), F-1002 (22).
