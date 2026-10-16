# F45 B2b-3b-1b — Plan v2 (Rückfrage-Kanal „Auswertung“, Kanal bleibt aus)

Plan v1: `features/F45/plan-b2b3b1b.md` (bleibt unverändert). Advisor-Pass (frischer Kontext, nur Read/Grep/Glob):
**Freigegeben mit Auflagen A1–A3**, Zuschnitt passt, kein anderer Schnitt. Entlastend belegt: Protokoll ist vor
`klassifiziereLauf` vollständig geschrieben (synchroner Rückruf vor Auslieferung, synchroner Checkpoint-Schreiber,
nur synchroner Code zwischen Gateway und Klassifikation); ERFOLGREICH mit `daten` gibt es schon (menschliche
Terminal-Entscheidung, `mensch_begruendung`), kein Leser setzt „ohne daten“ voraus; keine Modulzyklen; 3b-1a-Gate und
D13 unberührt; F-1126 (1) „ohne Eintrag ⇒ VERWEIGERT“ ist die sichere Richtung; §2 braucht keine Änderung.

Änderungen gegenüber v1 (alles andere gilt wie in v1):

## A1 — Durchsetzungsgrad im §4-Satz

Der Satz in ARCHITECTURE §4 nennt den Grad **DEKLARIERT**: er beruht auf „Nur Stefan antwortet — DEKLARIERT“ (§3).
Ein lokaler Prozess (Laufcode über npm-Skripte), der die Antwort-Route selbst aufruft, kann eine Ablehnung erzeugen,
die ab jetzt ERFOLGREICH ergibt (statt VERWEIGERT mit F-760-Halt). Aufgenommen ins neue Finding als Pflichtpunkt vor
dem Einschalten (3b-2).

## A2 — O2 neu entschieden: Eintragsliste in der Vermittlung

Die Vermittlung hält ohnehin Zustand je Lauf. Sie führt je Lauf die Liste aller Protokolleinträge und ruft
`protokolliere(laufId, eintrag, { arbeitsordner, eintraege })` mit der **vollständigen** Liste (inkl. des neuen
Eintrags; auch in `beendeLauf`, wo der Lauf schon aus der Map ist). Der Schreiber lädt nichts: er neutralisiert,
prüft und registriert die nächste Version. Ein fehlgeschlagener Schreibvorgang wird mit der nächsten Entscheidung
nachgeholt; der Fall „vorhandene Version ungültig“ entfällt. Kein quadratisches Laden je Entscheidung.

## A3 — Feldreihenfolge und Grenzen

Je Textfeld: erst `neutralisiereText` (ohne Kappen), dann `maskiereGeheimnisse`, dann auf die Feldgrenze kappen
(`grund` 500, `befehl`/`frage`/`antwort` 2000). `neutralisiereText` kappt selbst nicht. `tool_name` wird nicht
gekürzt: ≤ 200 Zeichen unverändert, sonst der Platzhalter `<zu lang>` (passt nie zu einer Ablehnung ⇒ VERWEIGERT,
sichtbar im Protokoll). Damit ist jeder Eintrag, den die Vermittlung erzeugen kann, schemagültig; `tool_use_id`
(≤ 200 oder null), `input_hash`, `art`, `zeit` sind schon durch die Vermittlung begrenzt. Bleibt der Wurf beim
Registrieren (I/O) ⇒ geloggt (H6).

## Hinweise übernommen

- H1: Folgen von ERFOLGREICH benannt — Löschliste läuft, F-760-Halt mit den abgelehnten Befehlen entfällt, der Ablauf
  geht weiter zu Review/qa ohne Wissen um die Ablehnung, `abgelehnt_durch_stefan` wird noch nirgends angezeigt
  (Anzeige ⇒ 3b-2, im neuen Finding). Gewollt: Stefan hat entschieden.
- H2: Abgleich prüft zusätzlich `protokoll.lauf_id === laufId`.
- H3: p3 belegt die gemeinsame Ablage: die Lauf-Attrappe liest nach der Entscheidung mit
  `laufOptionen.basisVerzeichnis` (wie der Controller) das Protokoll und klassifiziert damit — ERFOLGREICH. Ein voller
  `fuehreAufgabeDurch` im Server (Startfreigabe, Autorisierung) ist für diesen Beleg unnötig; p4 deckt den Controller
  einzeln ab.
- H4: `gleicheAblehnungenAb` nur mit `===`, `Set`, `Map` — keine f7-(a)-Muster; der Hex-Regex steht im Validator.
- H5: `abgelehnt_durch_stefan` steht zusätzlich oben im zurückgegebenen ERFOLGREICH-Ergebnis; die injizierte Option
  heißt intern `rueckfrageVermittlungOption`.
- H6: Schreibfehler des Schreibers: `console.error` (wie heute in der Vermittlung). Startfehlerliste nur, wenn sie
  ohne Eingriff in den D13-Bereich erreichbar ist — sonst Rest im neuen Finding.
- H7: Gate-Hilfen (Server, Attrappen-Client) werden schlank im neuen Gate nachgebaut (Import aus dem 3b-1a-Gate geht
  wegen Seiteneffekten nicht); bewusste Kopie, im Kopf vermerkt.
- H8: ARCHITECTURE §1 und Kopf `src/rueckfrage/index.ts` nennen den Protokoll-Teil.
- H9: Abgleich main ↔ Branch auch mit `is_error`/`non_execution_kind`; `git archive`-Abzug wird auf Ladbarkeit ohne
  `node_modules` geprüft.

## Neues Finding (zusätzlich zum Worktree-Finding aus dem Auftrag)

Reste aus A1/H1/H6 und aus Review/qa in einem Finding (TECH_DEBT bzw. Pflichtpunkte vor 3b-2).

## Nachtrag nach code-reviewer und qa (eine Korrekturrunde)

Beide „freigegeben mit Hinweisen“, nichts HOCH. In der Korrekturrunde: Controller liest das Protokoll über
`leseRueckfrageProtokoll` (wirft nie, Fehler ⇒ null ⇒ VERWEIGERT; qa 1, code-reviewer 3), Test „Kanal an, kein
Artefakt ⇒ VERWEIGERT“; Abgleich bekommt die ungefilterte Ablehnungsliste (ein Nicht-Objekt kippt ihn; qa 5); Rotfälle
`stefan_erlaubt`/`frage_beantwortet` zur Ablehnungs-ID (Unit, Gate p1); Unit-Test des Schreibers
(`scripts/leitstand/rueckfrage-protokoll.test.mjs`: Neutralisierung Arbeitsordner/Temp/Home, Maskieren vor dem Kappen an der
Schnittkante, `<zu lang>`, Wurf ohne neue Version) und Nachholen nach einem Wurf (Vermittlung); §4-Satz und Kopf
`protokoll.ts` nennen zusätzlich die für lokalen Code schreibbare Protokoll-Datei (qa 3). Reste und Pflichtpunkte vor 3b-2
(qa 2 Löschliste, qa 3 Protokoll aus dem Speicher, Anzeige, Obergrenze, tool_input-Gleichheit im echten Lauf) → F-1128.
