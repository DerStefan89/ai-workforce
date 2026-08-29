# Plan v2 — Feature 1: Checkpoint Store

Slug: feature1-checkpoint-store
Stand: 2026-08-29
Grundlage: `state/plan-v1-feature1-checkpoint-store.md` (bleibt
unverändert stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-feature1-checkpoint-store.md`: **FREIGEGEBEN MIT
HINWEISEN**.

Dieses Dokument trägt nur die zu klärenden Befunde (B1, B2, B5) als
Delta zu plan-v1, plus B4 als benannten offenen Punkt für den
Handoff-Vertrag. Alle Abschnitte von plan-v1, die hier nicht erwähnt
werden, gelten unverändert fort (SCOPE 1, 2, 3, 4–6, 8–12, NICHT,
D1–D6, A1–A3, A6–A9, A12–A18, Rollen, Budget).

B3 gilt als bestätigt und bleibt unverändert (Advisor-Urteil: „bestätigt,
kein offener Klärbedarf" — D3, volle Rückwärtslauf-Kettenprüfung bis
Genesis, bleibt wie in plan-v1 begründet).

---

## Delta 1 (löst B1) — „schließt F-020" ersetzt

plan-v1 zitiert im Auftrag die Formulierung „AC11 … schließt F-020".
`state/findings.md` endet real bei `F-019` — `F-020` existiert nicht im
Repo. Diese Formulierung wird vollständig ersetzt, nicht nur relativiert:

**Ersatzformulierung (wörtlich, für `features/F1/feature.md` und alle
Folgeartefakte):** „AC11 verhindert die beschriebene Profilkopie-Lücke
präventiv — es gab nie einen realen Finding-Eintrag dazu."

`features/F1/feature.md` (AC11 und Entscheidungs-Referenzen) ist bereits
mit dieser Sitzung auf den Ersatzwortlaut umgestellt, kein separater
Ausführungsschritt im Handoff-Vertrag mehr nötig. Der Handoff-Vertrag
selbst übernimmt den Ersatzwortlaut direkt (kein Bezug auf „F-020" an
irgendeiner Stelle).

## Delta 2 (löst B2, wichtigster Punkt) — Testabdeckung für A4, A5, A10, A11

plan-v1 SCOPE.7 (Gate-Skript `check-checkpoint-store.mjs`) deckt laut
eigener Beschreibung nur drei Fälle ab:
- a) die vier Payload-Fixtures (→ A2/A3/A12),
- b) den synthetischen Drei-Checkpoint-Lauf, vollständig gültig vs.
  korrumpiert (→ A7, AC5/AC10),
- c) die leere Kette (→ A8, AC6).

Vier technische Akzeptanzkriterien aus plan-v1 Abschnitt 7 hatten weder
Gate- noch Test-Zuordnung: **A4** (AC1, Rundlauf-Identität), **A5**
(AC2/AC3, abgebrochene Persistierung), **A10** (AC8, Trennung
Kontrollzustand/Produktdateien), **A11** (AC9, strukturierte
Ereigniszeilen). Analog zu A9 (AC7, „geprüft durch Code-Review … nicht
automatisiert prüfbar") braucht jedes der vier eine explizite Zuordnung
— hier: `node:test`, nicht Code-Review, weil alle vier automatisiert
und deterministisch prüfbar sind.

**SCOPE.3 (neu, ergänzt plan-v1 SCOPE.3):**
`src/checkpoint-store/checkpoint-store.test.ts` — vier Testfälle, `node
--test` (bereits Teil von `npm run check`, siehe `package.json:14`).
Jeder Fall arbeitet auf einem Wegwerfverzeichnis unter
`kontrollzustand-test/<zufälliger-lauf-id>/` (nicht `kontrollzustand/`
selbst — kein Produktzustand wird durch Tests verschmutzt), das der Test
im `after`-Hook wieder entfernt.

1. **Test „Rundlauf-Identität" (deckt A4/AC1):**
   `schreibeCheckpoint` gefolgt von `ladeLetztenGueltigenCheckpoint`
   liefert einen inhaltlich identischen Eintrag — einmal für eine Kette
   mit genau einem Checkpoint, einmal für eine Kette mit drei
   Checkpoints (`assert.deepStrictEqual` gegen den beim Schreiben
   übergebenen `profilReferenz`/`daten`-Inhalt).
   - **Kalibrierter Rot-Fall:** In `ladeLetztenGueltigenCheckpoint`
     testweise die Rückgabe von `payload.daten` auf `undefined` setzen
     (eine Zeile temporär auskommentieren) → `node --test` schlägt fehl,
     `assert.deepStrictEqual` meldet den fehlenden `daten`-Wert im Diff.
     Zeile danach wiederherstellen.
   - **Grün-Fall:** unveränderte Implementierung, derselbe Testlauf →
     Exit 0.

2. **Test „abgebrochene Persistierung ist unsichtbar" (deckt A5,
   AC2/AC3 — Kern-Garantie D2, kein bloßer Behauptungstest):**
   Simuliert einen echten Prozessabbruch: `atomarSchreiben` wird *nicht*
   über die öffentliche Funktion aufgerufen, sondern der Test legt von
   Hand eine Temp-Datei mit vollständigem, gültigem Checkpoint-Inhalt im
   Zielverzeichnis an (Namensmuster wie der interne Temp-Dateiname,
   siehe Abschnitt 4.4 unten) und ruft **kein** `rename()` auf — das
   bildet exakt den Abbruchpunkt „Temp-Datei bleibt liegen, kein Rename
   ausgeführt" (plan-v1 A5) nach, ohne den Prozess wirklich zu killen.
   Danach: `ladeLetztenGueltigenCheckpoint(laufId)` → `null` (kein
   vorheriger Checkpoint existierte), UND ein `readdirSync` auf das
   Zielverzeichnis zeigt keine Datei mit dem erwarteten Zielnamen
   (`<sequenz>-<hash>.json`), nur die liegen gebliebene Temp-Datei.
   - **Kalibrierter Rot-Fall:** `ladeLetztenGueltigenCheckpoint`
     testweise so ändern, dass sein Datei-Filter alle Dateien im
     Verzeichnis akzeptiert statt nur Dateien, die dem Zielnamensmuster
     entsprechen (z. B. Glob `*` statt eines Musters, das
     Temp-Suffixe ausschließt) → Test schlägt sichtbar fehl, weil die
     Funktion die liegen gebliebene Temp-Datei fälschlich als
     Checkpoint interpretiert (Assertion auf `null` bzw. auf
     Schema-Validität der Temp-Datei schlägt fehl). Änderung danach
     zurücknehmen.
   - **Grün-Fall:** unveränderte Implementierung → `null`, Exit 0. Das
     ist der reale Rot-/Grün-Beleg für die Kern-Garantie „unterbrochene
     Persistierung ⇒ kein gültiger Checkpoint", nicht nur eine
     Prosa-Behauptung.

3. **Test „Trennung Kontrollzustand/Produktdateien" (deckt A10, AC8):**
   Vor dem Testlauf einen Snapshot (Dateiname + Inhalts-Hash) eines
   Fixture-Ordners außerhalb von `kontrollzustand-test/` anlegen (z. B.
   ein Wegwerf-`profiles-test/`-Verzeichnis mit einer Beispieldatei).
   Danach mehrere `schreibeCheckpoint`- und
   `ladeLetztenGueltigenCheckpoint`-Aufrufe ausführen, anschließend
   denselben Snapshot erneut ziehen und mit `assert.deepStrictEqual`
   vergleichen — keine Datei, kein Hash darf sich unterscheiden.
   - **Kalibrierter Rot-Fall:** Im Test selbst (nicht im Modul) eine
     Zeile einfügen, die testweise zusätzlich in `profiles-test/`
     schreibt, um zu bestätigen, dass der Snapshot-Vergleich eine
     Fremdschreibung überhaupt erkennt → Test schlägt fehl, Diff zeigt
     die veränderte Datei. Zeile danach entfernen (Zweck: den Test selbst
     kalibrieren, nicht das Modul).
   - **Grün-Fall:** unveränderte Implementierung → Snapshot identisch,
     Exit 0.

4. **Test „strukturierte Ereigniszeile pro Vorgang" (deckt A11, AC9):**
   `schreibeCheckpoint` und `ladeLetztenGueltigenCheckpoint` (Erfolgs-
   und Leerfall) sowie ein erkannter Regelverstoß (korrumpierte Datei)
   erhalten einen austauschbaren Test-Schreiber (Array statt
   `console.log`, wie in plan-v1 SCOPE.6 vorgesehen). Je Aufruf: genau
   ein Eintrag im Array, gültiges JSON, Pflichtfelder `ereignis`,
   `lauf_id`, `zeitstempel` vorhanden, `ereignis` einer der vier in
   SCOPE.6 benannten Werte.
   - **Kalibrierter Rot-Fall:** Testweise denselben Schreiber-Aufruf im
     Modul verdoppeln (eine Zeile dupliziert) → Test schlägt fehl,
     `assert.strictEqual(schreiber.length, 1)` meldet `2`. Zeile danach
     entfernen.
   - **Grün-Fall:** unveränderte Implementierung → genau ein Eintrag pro
     Vorgang, Exit 0.

**Ergänzung SCOPE.7 (Gate-Skript):** bleibt inhaltlich wie plan-v1
(a–c), deckt weiterhin nur A2/A3/A7/A8/A12 ab. Die neue Testdatei deckt
A4/A5/A10/A11 zusätzlich ab, unabhängig vom Gate-Skript — beide laufen
in `npm run check` (Gate-Skript separat eingehängt, `node --test` bereits
Teil der Kette), keine Doppelausführung nötig.

**A13 (ergänzt, siehe Delta 4 für einen fünften Testfall):** `node
--test` liefert für `src/checkpoint-store/checkpoint-store.test.ts`
Exit 0 mit den vier Testfällen dieses Deltas, deckt A4/A5/A10/A11 ab.

## Delta 3 (löst B5) — Terminologie-Korrektur

plan-v1 Abschnitt 0 (Zeile 33) und `features/F1/feature.md` zitierten
`docs/projekt/zielfassung.md` als „Rollen-Tabelle (Checkpoint Store)".
Der reale Abschnitt heißt „### 16.2 Modulschnitt"
(`docs/projekt/zielfassung.md:324`) — eine Modul-Verantwortlichkeits-
Tabelle, keine Rollen-Tabelle. Kosmetisch, der zitierte Inhalt (A5/A8)
war bereits korrekt. `features/F1/feature.md` ist mit dieser Sitzung
bereits auf „Abschnitt 16.2 Modulschnitt" korrigiert; der Handoff-Vertrag
übernimmt denselben Wortlaut.

## Delta 4 (löst B6, Nachtrag 2026-08-29) — fünfter Testfall: Dateiname-Inhalt-Hash-Konsistenz

Statusprüfung dieses Nachtrags ergab: B6 (fünfter Testfall — Checkpoint-
Datei mit korrektem Ziel-Dateinamen, aber Inhalt widerspricht dem im
Dateinamen kodierten `selbst_hash`) war weder in plan-v2 noch im
Handoff-Vertrag eingearbeitet — real per Grep über beide Dateien
geprüft, kein Treffer. Mit diesem Delta nachgezogen.

Delta 2 deckt mit vier Testfällen AC1/AC2+AC3/AC8/AC9 ab, aber keiner
davon prüft eine spezifische Lücke innerhalb der AC2/AC3-Garantie: ein
Checkpoint, dessen Dateiname weiterhin den ursprünglichen `selbst_hash`
trägt, dessen Inhalt aber nachträglich geändert wurde — **einschließlich
einer intern konsistent nachgezogenen `selbst_hash`-Aktualisierung im
Inhalt selbst**. Eine Prüfung, die nur die interne Selbst-Hash-
Konsistenz verifiziert (Inhalt.`selbst_hash` == real errechneter Hash
des Inhalts, plan-v1 SCOPE.3 „Selbst-Hash-Rückrechnung"), würde einen
solchen Checkpoint fälschlich akzeptieren.

**Realer Diagnoselauf** (Wegwerf-Skript, außerhalb des Repos im
Scratchpad geschrieben, ausgeführt, danach gelöscht — nicht committet;
das Modul `src/checkpoint-store/` existiert noch nicht, ein Bau des
echten Loaders war in diesem Nachtrag nicht autorisiert, „keine
Bau-Handlung"): ein Checkpoint mit `sequenz: 1` regulär erzeugt
(`selbst_hash = hashA`, Dateiname `1-<hashA>.json`), danach
`payload.daten` geändert und `payload.selbst_hash` im Inhalt korrekt auf
den neuen, echten Hash `hashB` nachgezogen — der Dateiname blieb dabei
unverändert `1-<hashA>.json`. Ausgabe im Wortlaut:
```
Grün-Fall (unverändert): interne Konsistenz=true, Dateiname-Konsistenz=true → AKZEPTIERT

Manipulierter Inhalt unter unverändertem Dateinamen 1-7f2d8c230731f0586d4428c27a4a3828e6b5deb506d4b65bb44c2b88ac78d9c5.json:
  echter Hash des (manipulierten) Inhalts: e8ff8ead0f63168ab0464b49c66fc9a43a0f1cf6f6c92940c0eac5f1d34afbca
  im Dateinamen kodierter Hash:            7f2d8c230731f0586d4428c27a4a3828e6b5deb506d4b65bb44c2b88ac78d9c5

Rot-Fall (manipuliert): interne Konsistenz=true (!) selbst_hash im Inhalt wurde vom Angreifer/Fehler korrekt nachgezogen, Dateiname-Konsistenz=false → ABGELEHNT
```
Real bestätigt: interne Selbst-Hash-Konsistenz allein (`true`) hätte
den manipulierten Checkpoint fälschlich akzeptiert — erst der
zusätzliche Abgleich gegen den im Dateinamen kodierten Hash lehnt ihn zu
Recht ab. Kein Rest im Repo: Diagnoseskript lag ausschließlich im
Scratchpad, nicht im Arbeitsverzeichnis dieses Repos.

**Design-Konsequenz (ergänzt plan-v1 SCOPE.3):** `ladeLetztenGueltigenCheckpoint`
(nicht `validiereCheckpointEintrag` — die kennt den Dateinamen nicht)
muss beim Einlesen jeder Kandidatendatei zusätzlich zur internen
Selbst-Hash-Rückrechnung den im Dateinamen kodierten Hash gegen den real
errechneten Inhalts-Hash abgleichen und bei Abweichung ablehnen.

**SCOPE.4 (ergänzt Delta 2) — fünfter Testfall in
`checkpoint-store.test.ts`:**

5. **Test „Dateiname-Inhalt-Hash-Konsistenz" (B6, ergänzt AC2/AC3
   zusätzlich zu Test 2 aus Delta 2):** `schreibeCheckpoint` schreibt
   Checkpoint `sequenz: 1` regulär. Danach wird die Datei direkt auf der
   Platte (nicht über die API) manipuliert: `payload.daten` geändert,
   `payload.selbst_hash` im Inhalt korrekt auf den neuen, echten Hash
   aktualisiert (intern also konsistent) — der Dateiname bleibt
   unverändert. `ladeLetztenGueltigenCheckpoint(laufId)` muss diesen
   Checkpoint ablehnen (`null`, da einziger Checkpoint der Kette), nicht
   die manipulierten `daten` zurückgeben.
   - **Kalibrierter Rot-Fall:** den Dateiname-vs-Inhalt-Hash-Abgleich in
     `ladeLetztenGueltigenCheckpoint` testweise entfernen (nur die
     interne Selbst-Hash-Rückrechnung bleibt aktiv) → Test schlägt fehl,
     weil die Funktion den manipulierten Checkpoint fälschlich
     akzeptiert und die geänderten `daten` zurückgibt.
   - **Grün-Fall:** beide Prüfungen (intern + Dateiname) aktiv → `null`,
     Exit 0.

**A13 (erneut ergänzt):** `node --test` liefert für
`checkpoint-store.test.ts` Exit 0 mit **fünf** grünen Testfällen (A4/A5/
A10/A11 aus Delta 2 plus dem B6-Testfall) — alle Fälle, die die
AC2/AC3-Garantie betreffen, sind jetzt zugeordnet (Test 2 UND Test 5).

## Offener Punkt B4 — Windows-Rename-Nachweis, NICHT hier gelöst

plan-v1 SCOPE.8/Offener Punkt 4 benennt das Verfahren (Parallel-
Schreiber/Leser-Skript) nur dem Grunde nach, ohne Zyklenzahl,
Zeitspanne oder simulierte Störfaktoren (z. B. Virenscanner-Locks,
`EPERM`/`EBUSY`-Retry aus plan-v1 SCOPE.3 `atomarSchreiben`). Advisor-
Urteil: nicht blockierend, aber im Handoff-Vertrag zu konkretisieren,
nicht in `plan-v2` abschließend zu entscheiden. Der Handoff-Vertrag
(Abschnitt CONTEXT) übernimmt dies als eigenen, ausdrücklich als offen
markierten Klärungsabschnitt — siehe dort.

---

## Ergebnis

Plan v2 = plan-v1 (SCOPE 1, 2, 4–6, 8–12, NICHT, D1–D6, A1–A3, A6–A9,
A12, A14–A18, Rollen, Budget unverändert) + Delta 1 (Wortlaut-Ersatz
„F-020"), Delta 2 (SCOPE.3 neu: `checkpoint-store.test.ts` mit vier
Testfällen, A4/A5/A10/A11 jetzt zugeordnet, A13 ergänzt), Delta 3
(Terminologie „16.2 Modulschnitt"), Delta 4 (löst B6: fünfter Testfall
Dateiname-Inhalt-Hash-Konsistenz, real diagnostiziert, ergänzt AC2/AC3
zusätzlich zu Test 2, A13 erneut ergänzt auf fünf Testfälle). B4 bleibt
offen und wandert als eigener Klärungsabschnitt in den Handoff-Vertrag,
nicht hier gelöst (dort inzwischen per Nachtrag gelöst, siehe
`state/tasks/f1-checkpoint-store.md`). Kein erneuter Advisor-Pass nötig
(Advisor-Urteil: „freigegeben mit Hinweisen", B1/B2/B5 schriftlich
aufgenommen — hiermit erfüllt; B6 ist ein späterer, eigenständiger
Nachtrag außerhalb des ursprünglichen Advisor-Passes).

## Nächster Schritt

Handoff-Vertrag `state/tasks/f1-checkpoint-store.md`, sieben
Pflichtsektionen, SCHRITT 0 wörtlich, endet mit Freigabe-Halt.
