# Advisor-Pass F45 B5b-2b-2 „Roadmap: Bereinigungsliste“ (Plan v1)

**Gegenstand:** `features/F45/plan-b5b2b2.md` (Basis `1e4c550`, Branch `f45/b5b2b2-bereinigung`)
**Rolle:** architecture-advisor mit frischem Kontext, nur Read/Grep/Glob, 25.10.2026. Abgelegt von der bauenden Sitzung, Inhalt
unverändert.
**Was ich nicht prüfen konnte:** Ohne Bash/Git habe ich keine Tests, keine Gates und keinen Browser laufen lassen. Fokus und Caret nach dem Neuschreiben sowie die echten Akten der Kopie sind nur aus dem Code abgeleitet.

## Urteil: **Freigegeben mit Hinweisen** — weiterer Schnitt: **nein**

Der Server-Entwurf passt zu den Auftragsvorgaben: eine gemeinsame reine Vorprüfung für GET und POST, der POST bleibt bitgleich, Sperre und Hash prüft weiter nur der POST, B10 bleibt im POST. Die A2-Tabelle ist fast vollständig. Weil GET und POST dieselbe Funktion aufrufen, gilt „nicht möglich ⇔ 422“ schon durch den Aufbau. Die Tests sichern das nur zusätzlich ab.

Vor dem Bau sind vier kleine Korrekturen am Plan nötig (A1–A4). Keine braucht eine neue Entscheidung. Nach Regel 3a reicht danach der Bau ohne zweiten Advisor-Pass.

## A — vor dem Bau klären (im Plan nachtragen)

- **A1 Der Testfall „Akte-Gate rot“ ist falsch gebaut.**
  - [Fakt] Pflichtabschnitte verlangt das Gate nur bei `READY_FOR_TECH` (`src/workboard/feature-akte-pruefung.ts:54-58`). `setzeAkteAbgeschlossen` prüft aber den neuen Stand, und der steht auf ABGESCHLOSSEN (`src/feature-auftrag/akte-abschliessen.ts:51`).
  - [Schlussfolgerung] Eine „Akte ohne Pflichtabschnitt“ (`plan-b5b2b2.md:34`) liefert 200, nicht 422. Der Test wäre rot oder würde auf das falsche Ergebnis hin angepasst.
  - Korrektur: eine Planungszeile, die das Gate verletzt. Zum Beispiel `Priorität: X` (`src/workboard/feature-planung.ts:239-240`); dann kommt der Grund „schon vor der Bearbeitung“ aus `akte-schreiben.ts:153-154`.
- **A2 In der A2-Tabelle fehlt ein erreichbarer Pfad: der Rundlauf von `entferneStatusAusnahme`.**
  - [Fakt] `roadmap-schreiben.ts:188` gibt 422 „liest sich nach dem Entfernen nicht wie erwartet“ zurück. Der Pfad ist erreichbar: Der gesuchte Eintrag steht einzeilig als letztes Element, das Element davor ist mehrzeilig. Die Zeile davor beginnt dann nicht mit `{`, ihr Komma bleibt stehen (`:178-182`), das JSON wird ungültig.
  - Die Tabelle nennt bei `entferneStatusAusnahme` nur „ungültig“ und „≠ 1“ (`plan-b5b2b2.md:45-46`).
  - Korrektur: Zeile ergänzen und als Test aufnehmen.
  - Bei dieser Gelegenheit zwei weitere Zeilen schärfen:
    - [Fakt] „Lage/Rundlauf“ von `setzeMeilensteinStatus` (`:43`) lässt sich mit gültigem Schema erzeugen. Steht `"status"` vor `"id"`, findet `literalImFenster` 0 Treffer oder den Status des nächsten Meilensteins (`roadmap-schreiben.ts:73-76`, `:145-146`). Das „sonst Begründung“ kann also entfallen.
    - [Schlussfolgerung] „bliebe Abweichung“ ist nicht erreichbar: Nach ABGESCHLOSSEN bzw. LAEUFT gibt es keine Abweichung mehr (`roadmap-regeln.ts:106, 109`). Getestet wird nur „R1 neu“ (`plan-b5b2b2.md:47`). Die Tabelle sollte das so sagen.
- **A3 Der Nachweis lässt sich in vier Lagen nicht wiederholen.**
  - [Fakt] Der Plan verlangt einen Erfolg „echter POST F20 → ABGESCHLOSSEN … dunkel/hell, 1440/390“ (`plan-b5b2b2.md:113-114`). Nach dem ersten POST ist M4/F20 keine Abweichung mehr; ein zweiter POST liefert 409 bzw. 422.
  - [Fakt] Das Vorbild 2b-1 konnte seine PUTs wiederholen (`nachweise/b5b2b/erzeuge-nachweis.mjs:327-342`).
  - Korrektur, eine von drei Varianten festlegen:
    - (a) Die Kopie vor jeder Lage auf ihren Basis-Commit zurücksetzen (`git reset --hard` plus `git clean` in der Kopie, nach `pruefeKopie`).
    - (b) Je Lage ein anderes Feature bestätigen (F20, F25, F21, F18; F18 erst nach dem Bild „M3 → LAEUFT“).
    - (c) Einmal echt schreiben, die übrigen Lagen über `page.route` mit dem aufgezeichneten Antwortkörper bedienen.
  - Außerdem ausdrücklich festhalten: Die Kopie übernimmt die Änderungen und neuen Dateien des Arbeitsbaums wie in 2b-1 (`:93-110`). „Basis-Commit“ allein (`plan-b5b2b2.md:110`) enthielte die neue Anzeige nicht.
- **A4 Die Sichtbarkeit des Abschnitts weicht vom Auftrag ab und ist nicht erklärt.**
  - [Fakt] Der Auftrag sagt „nur bei n > 0“. Der Plan zeigt den Abschnitt auch bei n = 0, solange ein Erfolg offen ist (`plan-b5b2b2.md:86`), und bei einem Ladefehler mit „Erneut laden“ (`:93`).
  - [Schlussfolgerung] Fachlich ist das richtig: Sonst ginge der Git-Block nach der letzten Bestätigung verloren.
  - Korrektur: als begründete Abweichung festhalten. Den Zustand während des Ladens (`laden: 'laedt'`) ausdrücklich beschreiben.

## O1–O3

- **O1 fail-closed: ja.** [Fakt] Nach dem Umbau trägt jeder GET-Vorschlag `moeglich` (`plan-b5b2b2.md:17`). Rückwärtsverträglichkeit braucht es nicht, Server und Client liefern in einem Paket. [Fakt, entlastend] Der Platzhalter-Grund ändert das Ergebnis nicht (`akte-schreiben.ts:163-168`, `akte-abschliessen.ts:49`). Das Datum ändert es auch nicht: `Abgenommen` der Akte wird nur auf ISO-Form geprüft, die Prüfung „Begonnen ≤ Abgenommen“ gilt nur für Workstream-Zeilen (`feature-planung.ts:209-211, 242-247`).
- **O2 Gegenvorschlag: Auswahl direkt umschalten, ohne Neuschreiben.** [Fakt] 2b-1 schaltet Eingaben direkt (`views/roadmap.js:908-924`). [Schlussfolgerung] Im Schritt `auswahl` ändert eine Radio-Wahl nur, ob „Bestätigen“ aktiv ist, und einen Hinweis. Der Bestätigungsschritt entsteht ohnehin durch einen Klick, der neu schreibt. Neuschreiben bei jedem Pfeiltasten-Wechsel bedeutet mehr Arbeit für den Fokus und unruhige Screenreader-Ansagen. Das widerspricht Regel 4 („Komplexität reduzieren“). Falls doch neu geschrieben wird: `input` und `change` feuern bei Radios beide; das Neuschreiben darf nur einmal passieren.
- **O3 Zähler immer bei n > 0: ja.** [Fakt] Die Trennzeile gibt es, sobald ein abgeschlossener Meilenstein existiert (`views/roadmap.js:581-588`). Bereinigungs-Einträge liegen immer in abgeschlossenen Meilensteinen (`roadmap-regeln.ts:106`). Der Zähler hat also immer einen Platz.
- **Bestätigung inline statt `<dialog>`:** [Fakt] Das war schon in `advisor-b5b2b.md:60-61` (O2, „fachlich ja, als Entscheidung festhalten“) und in `plan-b5b2b-v2.md:105-106` so entschieden. F-1189 sagt nur „im Bestätigungsdialog“ (`findings.md:8808`). [Schlussfolgerung] Ein zweiter Schritt mit Pflicht-Häkchen erfüllt qa2 und qa6. Im Plan die Quelle der Entscheidung nennen. Außerdem heißt der Bestätigungsschritt in `plan-b5b2b2.md:81` „O2“, das offene Radio-Thema in `:127` ebenfalls; das sollte auseinandergezogen werden.

## B — darf mitlaufen

- **B1 Die Gegenrichtung des Kriteriums als Schleife testen.** [Schlussfolgerung] Bisher prüft jeder Fall nur seinen Ziel-Vorschlag (`plan-b5b2b2.md:52-55`). Besser: ein Hilfsaufruf, der für jede Attrappe *alle* Vorschläge durchgeht. `moeglich` ⇒ POST 200 in einer frischen Kopie, sonst 422 mit genau diesem `grund`. Das findet auch Nebenwirkungen eines Falls auf andere Einträge.
- **B2 Exotischer Fall: Meilenstein-ID aus Leerzeichen.** [Fakt] Eine ID wie `" "` ist schemagültig (`projektkontext/index.ts:38-39, 62`) und nicht `NICHT_ADRESSIERBAR` (`roadmap-regeln.ts:165`). Der GET bietet also Vorschläge an, der POST antwortet 400 (`pruefeEintrag`, `roadmap-regeln.ts:213`). [Schlussfolgerung] Dann ist „möglich ⇒ 200“ verletzt. Entweder als DEKLARIERT in den Kopf, oder `NICHT_ADRESSIERBAR` um „nur Leerraum“ erweitern.
- **B3 Weitere Wege ohne Sperre testen.** [Fakt] „STATUS.md nennt X schon als ABGESCHLOSSEN — unverändert“ ist wie „ohne Standardform“ nur ein Hinweis (`status-md.ts:66`). Den Fall „möglich, 200 mit hinweis“ mit aufnehmen.
- **B4 Die Vorprüfung im GET darf nicht werfen.** [Annahme] Die aufgerufenen Module werfen laut ihren Köpfen nicht. Trotzdem je Vorschlag `try/catch` mit `console.error` und `moeglich: false` (DoD: Fehlerzustände). Sonst reißt ein Fehler die ganze Liste mit, denn `listeBereinigung` fängt nichts (`routen-planung.mjs:377-398`).
- **B5 Gründe ohne Details.** [Fakt] Bei R1 und Akte-Gate steckt das Wesentliche in `verstoesse` (`routen-planung.mjs:482, 510`). Der GET liefert sie nicht (B6). [Schlussfolgerung] Ein deaktivierter Vorschlag „verletzte R1 … von Hand“ bleibt dann ohne erkennbaren Anlass. Vorschlag: die Listenebene `befunde` im Abschnitt zeigen, oder beim Challenger `verstoesse` im GET freigeben lassen.
- **B6 Antworten über den vorhandenen Baustein deuten.** [Fakt] `deutePlanungAntwort` deutet 409/400/422 schon richtig, auch `'workflowId' in koerper` bei `workflowId: null` (`roadmap-anpassen.js:179-187`; `routen-f35.mjs:245, 249`). `deuteBestaetigungAntwort` soll für alles außer 200 darauf zurückgreifen (B1 aus `advisor-b5b2b.md:73`: kein Doppelcode).
- **B7 Leerer Zustand.** Einträge ohne Vorschlag (ABGEBROCHEN oder Meilenstein-ID nicht adressierbar, `roadmap-regeln.ts:184-185`) brauchen einen eigenen Text „kein Vorschlag — von Hand“. Fehlt `quelle.status_md` (bei 0 bzw. 2 Angaben `null`, `routen-planung.mjs:393`), „–“ zeigen.
- **B8 Pluralform.** Der Zähler „n Abweichungen“ über `anzahl` und `zahl` wie bei `roadmap.baum.abgeschlossenAus` (`views/roadmap.js:586`, `i18n.js:10-12, 95`), sonst ist ru falsch.
- **B9 Nur ein Ladeweg.** Wenn `ladeRoadmap` die Liste immer mitlädt, lädt der Plan nach einer 200 zweimal (`plan-b5b2b2.md:93, 96`). Einen Weg festlegen. Der eigene Zähler verhindert zwar überholte Antworten, aber nicht die doppelte Anfrage.
- **B10 Nachweis: Bilder für Meldung und Vorbedingung.** Ein Bild für eine Meldung ergänzen: 409 Sperre oder Hash-Konflikt über `page.route`, wie 2b-1. Es zeigt, wo die Meldung steht und dass die Liste neu lädt. [Annahme] Die echte F20-Akte besteht das Gate; ihr Abschnitt „## Workstreams“ ist eine Liste, keine Tabelle (`features/F20/feature.md:84-89`). Das Skript soll trotzdem vor dem POST `moeglich: true` sicherstellen und sonst abbrechen.
- **B11 Kopie-Code nicht abschreiben.** `legeKopieAn`, `pruefeKopie` und `raeumeAuf` aus `nachweise/b5b2b/erzeuge-nachweis.mjs:59-186` übernehmen. Wenn es Kopie und Einfügen wird, im Kopf auf das Vorbild verweisen.
- **B12 Platz des Abschnitts angeben.** Wo steht er in `hauptteil()`? Zwischen `.rm-gesamt` und dem Entwicklungsstand (`views/roadmap.js:758-767`)? Die Antwort bestimmt den Sprungpunkt der Trennzeile.

## C — geprüft, in Ordnung

- [Fakt, entlastend] **Vollständigkeit der A2-Tabelle.** Jedes `return antwort(4xx)` im Block `routen-planung.mjs:464-510` ist zugeordnet (Zeilen 464, 478, 480, 482, 485, 487, 492, 494, 499, 501, 510), Ausnahme A2.
  - „Vorschlag nicht vorhanden“ ist aus dem GET nicht erreichbar, weil die Vorprüfung je vorhandenem Vorschlag läuft.
  - „Akte fehlt“ ist nur auf einem Dateisystem ohne Groß-/Kleinunterscheidung erreichbar: `existsSync` in `leseAktenStatus` (`:127-128`) gegen den exakten `readdirSync`-Abgleich (`:354`).
  - „Akte kein UTF-8“ ist erreichbar, weil `leseAktenStatus` verlustbehaftet liest (`:130`).
  - „Keine Status-Zeile“ ist nicht erreichbar: dieselbe Regex in `feature-akte-pruefung.ts:22` und `akte-abschliessen.ts:28`, dazu `roadmap-regeln.ts:185`.
  - JSON-/Schema-Fehler, fehlender Meilenstein und „ungültig“ beim Entfernen der Ausnahme sind nicht erreichbar: Der Stand wäre dann `ungueltig` (`:321-327`).
- [Fakt, entlastend] **POST bitgleich machbar.** Die Funktion gibt die vollständige `antwort` zurück, Zusatzfelder wie `vorschlaege` und `verstoesse` bleiben also erhalten (`:470, 482, 510`). `datum` (`:473`) und `ziele` (`:474`) entstehen ohne Nebenwirkung. Gate b5b1b2 (b)–(n) prüft Grundtexte, Bytes und Git-Block und bleibt damit als Regressionstest wirksam.
- [Fakt, entlastend] **Die Vorprüfung ist rein.** `neu.aktenStatus` ist eine Kopie, `stand.daten` und `ausnahmenListe` werden nicht verändert (`:475, 496, 503`). Die Module haben kein I/O (`akte-abschliessen.ts:7-8`, `status-md.ts:8`). Der GET bleibt lesend, auch bei zwei Vorschlägen je Eintrag.
- [Fakt, entlastend] **Sperre und Hash zu Recht außen vor.** Die Sperre kommt im POST vor dem Lesen (`:442-449`), der Hash-409 vor der Eintragssuche (`:460`). Die Testmatrix „Sperre: GET möglich / POST 409“ deckt das Auftragskriterium ab, „nicht möglich ⇔ 422“ gilt ohne Sperre.
- [Fakt, entlastend] **Gate b5b1b2 (a), Attrappe.** Alle fünf „Feature → ABGESCHLOSSEN“ und „M3 → LAEUFT“ sind möglich. Die umbrochene F21-Angabe ist genau eine Standardform (`check-f45-b5b1b2-bereinigung.mjs:125-126`, `status-md.ts:24`). Ausnahmen in der Attrappe sind einzeilig, kein R1-Altbefund. Für das echte Repo ist „nur Form“ richtig, so gibt es keinen Zeitzünder. Weitere tiefe Vergleiche auf `vorschlaege` gibt es nur für leere Listen (`:505`).
- [Fakt, entlastend] **Feindlicher Grund ist ungefährlich.** `psArgument` maskiert ihn, `"` wird zu `'` (`routen-f35.mjs:214-220`). `pruefeGrund` lässt Steuerzeichen und U+2028/2029 nicht durch (`akte-schreiben.ts:49, 165`).
- [Fakt, entlastend] **Zeilenenden in der Kopie.** `.gitattributes` setzt `* text=auto eol=lf`. Ein `git clone` auf Windows liefert STATUS.md, roadmap.json und Ausnahmen-Datei also mit LF, der echte POST scheitert nicht an CRLF.
- [Fakt, entlastend] **Stand der Kopie.** Das echte Repo trägt die fünf Paare (`docs/projekt/roadmap-ausnahmen.json:4-8`); M3 hat genau eine Abweichung. STATUS.md nennt F20 und F22 je einmal in Standardform (`docs/STATUS.md:481, 491-492`). `kontrollzustand/` wird nicht kopiert, also sperrt in der Kopie kein Ablauf.
- [Fakt, entlastend] **Kein neuer Schreibweg, keine Serverdatei, kein neues Gate.** Nur `routen-planung.mjs` ändert sich; die Wachstumsbremse von `leitstand-server.mjs` bleibt unberührt (`ARCHITECTURE.md:57`). ARCHITECTURE.md bleibt unverändert (F-1191). Kein Codeform-Gate (F-1190).
- [Fakt, entlastend] **F-1189 abgedeckt.** qa2 (Häkchen und Hinweis), qa3 (Vorprüfung), qa6 (Datum), qa7 (fester Hinweis plus `hinweis`) und qa8 Variante (a) entsprechen `findings.md:8812`. Gate b5b1a (i) bleibt unverändert.
- [Fakt, entlastend] **Bausteine vorhanden.** `AKTE_GRUND_MAX`, `gitBlockHtml` (mit Hinweisschlüssel), `grundUndVerstoesse`, `gitVon` sind exportiert (`akte-bearbeiten.js:36, 96, 132, 142`). Das Muster für Zeitlimit und Abruf steht in `api.js:239, 342`.
- [Schlussfolgerung] **Zuschnitt hält.** Er entspricht dem Vorschlag in `advisor-b5b2b.md:67-68`; das gleich große 2b-1 kam mit einer Korrekturrunde aus (`feature.md:1553-1559`). Empfohlene Reihenfolge: zuerst Server, Tests und Gate (a) grün, dann der Client. So steht der Serverteil für sich, falls die Korrekturrunde knapp wird.

## Was v1.1 vor dem Bau enthalten muss

A1 (Testfall Akte-Gate), A2 (Rundlauf-Zeile, zwei Zeilen geschärft), A3 (Wiederholbarkeit des Nachweises, Arbeitsbaum in der Kopie), A4 (Abweichung bei n = 0 begründet). Danach ohne zweiten Pass bauen (Regel 3a).

## Status
- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
A1–A4 in `features/F45/plan-b5b2b2.md` nachtragen (v1.1); zu O2 entscheiden (Empfehlung: direkt umschalten). Dann bauen in der Reihenfolge Server-Vorprüfung, `routen-planung-vorpruefung.test.mjs`, Gate b5b1b2 (a), danach der Client.
