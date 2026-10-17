# Advisor-Pass: Plan v1 F45 B2b-3b-2b-2a-3 „Rückfrage-Kanal: Abnahme“

Stand 17.10.2026. Geprüft: `features/F45/plan-b2b3b2b2a3.md` gegen den Code auf Branch `f45/b2b3b2b2a3-abnahme` (Basis #358). Subagent
`architecture-advisor`, frischer Kontext. Abgelegt durch den Autor (der Advisor hat kein Schreibrecht), Inhalt unverändert gekürzt um
Formatierung.

**Rollengrenze:** nur Read/Grep/Glob — `tsc`, `node --test`, Gates und `wc` nicht ausführbar; Laufzeitaussagen (Ereignisschleife,
Typfehler) als [Schlussfolgerung] markiert.

Marker: [Fakt] im Code belegt · [Schlussfolgerung] abgeleitet · [Annahme] unbelegte Prämisse · [offene Unsicherheit].

## Urteil: **Freigegeben mit Hinweisen**
Architektur trägt (Server netto deutlich < 0, keine Route, ohne Kanal `daten` gleich, O1–O4 vertretbar). V1–V3 vor dem Bau als Plan-Nachtrag;
kein neuer Advisor-Pass nötig.

## Vor dem Bau zu klären
**V1 – Abgleich-Codes in Klassen.** [Fakt] `gleicheAblehnungenAb` bricht bei der ersten nicht passenden Ablehnung ab
(`src/rueckfrage/protokoll.ts:248-261`); `kein_eintrag` (`:255`) = Ablehnung lief nicht über den Kanal (echt); `kein_protokoll`
(`src/result-evaluator/index.ts:399`) echt; `nicht_von_stefan` (`:257`) = Kanal hat automatisch abgelehnt. [Schlussfolgerung] Den F-760-Satz
für jedes `abgleich` zu ersetzen ist bei `kein_eintrag`/`kein_protokoll` falsch. Abhilfe: Klassen (a) echt (`kein_eintrag`, `kein_protokoll`)
⇒ Standardsatz; (b) automatisch (`nicht_von_stefan`); (c) Stefans Ablehnung nicht bestätigt (`ablehnungstext_passt_nicht`,
`werkzeug_abweichend`, `eingabe_abweichend`, `eintrag_mehrfach`, `id_doppelt`, `id_fehlt`, `ablehnung_ungueltig`); (d) Protokoll unbrauchbar
(`protokoll_ungueltig`, `protokoll_fremd`, `abweichung`); (e) `nicht_geprueft` (E-186). „Mindestens eine Ablehnung …“; „was tun“ je Klasse.

**V2 – R3 erscheint an mehr Stellen als „Startproblem“.** [Fakt] `waehleAlsNaechstes` (`live-daten.js:221-225`) ⇒ Live-Karte
`live.naechstes.art.startproblem` (`views/live-anzeige.js:409`); Ausführungen-Seite „Startfehler“ (`views/runs.js:115`,
`views/lauf-detail.js:221-232`). [Fakt] Mit `hash` rendert `aktionen()` `attention.knopf.startproblem` (`views/attention.js:149`), den es
nicht gibt (`i18n/de.js:1826-1830`); die Karte wird Hauptknopf-Kandidat (`attention.js:299-300`). [Fakt] Chip-Text immer aus
`attention.art.${art}` (`typ-chip.js:65-68`). Abhilfe: Live-Karte und Startfehler-Liste aufnehmen oder DEKLARIERT; eigener Knopf-Schlüssel ×4;
Hauptknopf entscheiden.

**V3 – `abgelehnt_durch_stefan` wird nicht angezeigt.** [Fakt] Kern von F-1128 (3) H1 (`state/findings.md:13885`). Abhilfe: Zeile „davon von
der Auswertung bestätigt: n“ neben der B10-Beschriftung.

## Mitlaufend (Bauauflagen)
- **M1** O2 trägt stärker: zwischen Lesen der Zählung (`execution-controller/index.ts:665`) und `beendeLauf` (`leitstand-server.mjs:6873`) nur
  synchroner Code (`:668-713`), dann ein Mikrotask; `fuehreAufgabeDurchFn` ohne Hülle (`:5894`) ⇒ weder Timer noch HTTP dazwischen. Als
  Invariante festhalten („kein await zwischen Lesen und Rückgabe“), Kommentar an `:662`, Vermittlungs-Test; M10-Korrektur aus
  `advisor-b2b3b2b2a2.md:88` notieren.
- **M2** Testliste unvollständig: `tsconfig.json:16` schließt Tests ein ⇒ Typfehler `result-evaluator.test.ts:1245/1267/1280/1288`; zur
  Laufzeit `execution-controller.test.ts:1696/1706`, `:1763-1764`, `rueckfrage-vermittlung.test.mjs:324/332`.
- **M3** [Annahme] alte Kanal-Läufe mit 4-Felder-Zählung ⇒ 4 Felder annehmen, neue drei „unbekannt“ (Muster `server:957-961`).
- **M4** Umzug sauber; eigenes `STILLER_SCHREIBER`; Import-Muster `rueckfrage-vermittlung.mjs:45`. Optional Kette einmal lesen.
- **M5** i18n-Gate prüft nur literale Schlüssel (`check-f44-i18n.mjs:31-32`) ⇒ literale Zuordnung + Drift-Test gegen `ABGLEICH_GRUENDE`.
- **M6** `maskiertesHtml` existiert (`rueckfrage-anzeige.js:38`), deckt `\p{Cs}` (F-1132 (8)); `abgleich.art` gegen die 4 Werte prüfen.
- **M7** Startfehler nur im Speicher (`server:6407`) ⇒ R3-Eintrag über `fuehreAufgabeDurchFn`-Attrappe, die `meldeAbweichung` ruft (Vorbild
  `check-f45-b2b3b2b1a-rest.mjs:254-285`, `:366-375`). Terminalmarke ohne `run_prepared` ⇒ NICHT_GESTARTET (`checkpoint-store:709-727`) ⇒ zuerst
  `run_prepared` schreiben.
- **M8** O1 vertretbar (`ermittleAktiveLaufIds` holt heute schon Details, `workflows.js:90-107`); nur erfolgreiche ABGESCHLOSSEN-Antworten cachen.
- **M9** Neue Regelzeile darf nicht mit `- [x]` beginnen (`SELBSTBLOCKADE_ZEILE`, `korrekturschleife/index.ts:151`); Gate (r) bricht nicht.
- **M10** `nicht_geprueft` nur im Block (Lage `rueckfrage` ohne Ursache-Zeile, `lauf-detail.js:308-318`; Sichtung nur ohne Bypass,
  `server:9873-9876`).
- **M11** `oeffneLauf` scheitert ⇒ keine Zählung, kein Block, sieht aus wie „kein Kanal“ — DEKLARIERT.
- **M12** [offene Unsicherheit] „Sichtung bestätigt – weiter“ bleibt bei R3 (mögliche Fälschung) mit einem Klick möglich — außerhalb Scope,
  Stefan informieren.

## Entlastend
E1 Evaluator nur Zeile `kanalDaten` (`:452-457`), Reihenfolge `:385-400` bleibt. E2 Gate (t) ohne FEHLGESCHLAGEN-Fall
(`check-f45-b2b3b2b2a-einschalten.mjs:380-404`). E3 Drift-Test liest nur `grund: '…'` (`chat-laufstand.test.mjs:129-132`). E4 genau drei
Aufrufer (`:4233`, `:8444`, `:9873`), kein Gate/Test. E5 Wachstumsbremse ~−30+2, (a3) senken. E6 Rückruf `:6832` nur von `meldeAbweichung`.
E7 Chat/Workboard/Auftrag-Vorbereitung betreffen R3 nicht. E8 bestehende Escapes `attention.js:134`, `lauf-detail.js:229`. E9 Regel nur mit
Kanal (`server:7519-7520`), ungültige Frage 400 ohne Eintrag, MCP-Text `rueckfrage-mcp.mjs:154`. E10 O4 folgt D5 (`server:939-940`).

## Zuschnitt
Knapp tragfähig für einen Baudurchgang + eine Korrekturrunde, wenn V1–V3 vorher festgelegt sind und i18n über Klassen begrenzt wird.
Sollbruchstelle: Workflow-Sichtung und R3 in Entscheidungen/Live als 2a-3b.

## Status
- [x] Freigegeben mit Hinweisen

## Nächster sinnvoller Schritt
Plan v2 mit V1–V3, M1 als Invariante, M2 als Testliste; übrige M als Bauauflagen.
