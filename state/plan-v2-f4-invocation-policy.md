# Plan v2 — Feature F4: Invocation Policy / Protection Validator (minimal)

Slug: f4-invocation-policy
Stand: 2026-08-31
Grundlage: `state/plan-v1-f4-invocation-policy.md` (bleibt unverändert
stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-f4-invocation-policy.md`: **Freigegeben mit
Hinweisen.** Kein Blocker, keine Umbau der Modul-/Schema-Struktur nötig.
Verbindlich vor/während des Baus zu klären: F11 (Hash-Querkonsistenz
zwischen Startbedingung 1 und 2) und F3 (Schutz des künftigen
Wirksamkeitsnachweis-Ablageorts, D16-Analogie). F6 (Export-Umfang F3)
war als „dürfen mitlaufen" eingestuft — diese Sitzung entscheidet ihn
hier bereits, um dem Handoff-Vertrag eine eindeutige SCOPE-Vorgabe zu
geben, statt ihn dem Executor zu überlassen.

Alle Abschnitte von plan-v1, die hier nicht erwähnt werden, gelten
unverändert fort: Abschnitt 0 (Verifikation), 1 (Ziel), 2 SCOPE.1/2/4/6-12
(unverändert), Design-Entscheidungen 1/2/4/5, Abschnitt 5 (Ablageort),
6 (Budget), 8 (Rollen). Betroffen sind SCOPE.3/SCOPE.5 (Delta 1),
Abschnitt 4 Design-Entscheidung 3 / Abschnitt 9 (Delta 2), [offene
Unsicherheit 1] (Delta 3), die Akzeptanzkriterien A6/A22 (Delta-Tabelle
unten).

Diese Deltas sind technische Präzisierungen innerhalb des bereits
entschiedenen Zuschnitts (ein Modul, zwei Schemas, fünf Funktionen, ein
Gate) — keine neue Grundsatzentscheidung.

---

## Delta 1 (löst F11) — Hash-Querkonsistenz: `pruefeStartbedingung2` leitet Hashes aus Bedingung 1 ab, statt sie unabhängig entgegenzunehmen

### Problem (Advisor F11)

plan-v1 SCOPE.5 ließ `pruefeStartbedingung1(baselineReferenz,
istZustand, ...)` und `pruefeStartbedingung2(wirksamkeitsnachweis,
istGueltigkeitsschluessel)` denselben fachlichen Wert — Hash der
Werkzeugkonfiguration, Hashes der referenzierten Schutzskripte — über
zwei getrennte, vom Aufrufer unabhängig befüllte Parameter entgegennehmen
(`istZustand.hashes` bzw. `istGueltigkeitsschluessel.
werkzeug_konfiguration_hash`/`schutzskript_hashes`). `pruefeStartfreigabe`
erzwang nirgends, dass beide Werte identisch sind. Ein Aufrufer (F6)
könnte Bedingung 1 mit den echten, aktuellen Datei-Hashes bestehen
lassen und Bedingung 2 gleichzeitig mit veralteten, aber zueinander
passenden Hash-Strings — `FREIGEGEBEN` würde trotz Drift geliefert.
Keiner der geplanten Testfälle (A1–A22) deckte das ab; es widerspricht
AC22 direkt.

### Lösung: gemeinsamer Ist-Zustand, ein Aufrufparameter statt zwei unabhängiger

**SCOPE.5 (korrigiert):** `pruefeStartbedingung2` nimmt keinen
unabhängigen `istGueltigkeitsschluessel.werkzeug_konfiguration_hash`/
`schutzskript_hashes` mehr entgegen. Beide Bedingungen teilen sich
denselben Aufrufkontext: `pruefeStartfreigabe` misst `istZustand` (Hashes
von Werkzeugkonfiguration + Schutzskripten) genau einmal, übergibt ihn an
`pruefeStartbedingung1` zur Baseline-Prüfung, und leitet daraus —
**nicht aus einem zweiten, unabhängig übergebenen Wert** — die beiden
Hash-Felder des Gültigkeitsschlüssels für `pruefeStartbedingung2` ab.

Korrigierte Signaturen:

```
pruefeStartbedingung1(baselineReferenz, istZustand, optionen?)
  → { ok: true } | { ok: false; grund }
  // istZustand: { werkzeug_konfiguration_hash: string, schutzskript_hashes: string[] }
  // (Namen wie E-188, weil dieselben Felder jetzt in beide Bedingungen
  //  einfließen — kein separates Vokabular mehr für denselben Wert)

pruefeStartbedingung2(wirksamkeitsnachweis, istZustand, istUebrigeFelder)
  → { ok: true } | { ok: false; grund }
  // istUebrigeFelder: { werkzeug_version_deklariert, berechtigungskontext,
  //                      arbeitsverzeichnis_pfad }
  // Baut daraus intern den vollständigen istGueltigkeitsschluessel
  // (werkzeug_konfiguration_hash/schutzskript_hashes AUS istZustand,
  //  nicht aus istUebrigeFelder) und vergleicht ihn feldweise gegen
  // wirksamkeitsnachweis.gueltigkeitsschluessel — identische
  // Vergleichslogik wie plan-v1, nur mit einer Quelle für die
  // Hash-Felder statt zweien.

pruefeStartfreigabe(eingaben, optionen?)
  // eingaben enthält istZustand EINMAL (nicht mehr getrennt für
  // Bedingung 1 und 2), plus baselineReferenz, wirksamkeitsnachweis,
  // istUebrigeFelder, aufrufparameter. Reicht dasselbe istZustand-Objekt
  // an beide pruefeStartbedingungX-Aufrufe weiter.
```

**Schema 2 (korrigiert):** `gueltigkeitsschluessel.
werkzeug_konfiguration_hash`/`schutzskript_hashes` bleiben Pflichtfelder
im **Wirksamkeitsnachweis** selbst (das ist der vom Aufrufer
mitgeführte, zu prüfende Nachweis — der ändert sich nicht) — die
Änderung betrifft ausschließlich die **Ist-Seite** (den zweiten
Parameter von `pruefeStartbedingung2`), die jetzt aus `istZustand`
abgeleitet statt separat übergeben wird. Schema 1 (Baseline) bleibt
unverändert.

**Neuer/angepasster Testfall (ersetzt/ergänzt A6):** Bedingung 1 mit
aktuellen, mit der Baseline übereinstimmenden `istZustand`-Hashes
bestehen lassen (`{ ok: true }`), danach Bedingung 2 mit einem
`wirksamkeitsnachweis` prüfen, dessen `gueltigkeitsschluessel.
schutzskript_hashes` von genau diesem `istZustand` abweicht (ein
einzelner veralteter Hash-String im Nachweis) → `{ ok: false, grund }`
(Drift, E-188) — **nicht** `FREIGEGEBEN`, obwohl Bedingung 1 für sich
genommen grün ist. Das ist der Fall, den F11 als ungetestet benannt hat:
vorher hätte ein unabhängig übergebenes `istGueltigkeitsschluessel` mit
demselben (veralteten) Hash beide Bedingungen fälschlich bestehen lassen
können; nach Delta 1 ist das strukturell ausgeschlossen, weil es nur noch
eine Quelle für diese Hashes gibt.

**Konsequenz für AC22 (Hauptkriterium):** A22 wird jetzt zusätzlich über
diesen neuen Testfall belegt, nicht mehr nur über A3/A6/A8 — die von F11
benannte Lücke (Querkonsistenz) ist damit Teil des Hauptkriteriums,
nicht nur der Mechanik-Kriterien.

---

## Delta 2 (löst F3) — D16-Analogie als verbindliche Auflage für die künftige Ablageort-Entscheidung des Wirksamkeitsnachweises

### Problem (Advisor F3, F9)

plan-v1 Design-Entscheidung 3 lässt den Ablageort der
Wirksamkeitsnachweis-**Instanz** bewusst offen (Parameter-Injection,
[offene Unsicherheit 3]) — auf Code-Ebene tragfähig, aber ohne
Sicherheits-Auflage für die spätere Entscheidung. Landet die Instanz
später z. B. unter `kontrollzustand/` im Produkt-Repo, kann das geprüfte
Ausführungswerkzeug sie potenziell selbst überschreiben und
Startbedingung 2 wertlos machen — exakt die Bedrohung, die D16
(Autorisierungsartefakte grundsätzlich vor dem Ausführungswerkzeug
geschützt) für die Baseline (SCOPE.1) bereits ausschließt, aber für den
Nachweis nirgends verbindlich festhält.

### Lösung: explizite Auflage, keine Ablageort-Entscheidung

**Ergänzung Abschnitt 4 (Design-Entscheidung 3), letzter Satz:**
„**Auflage für die künftige Ablageort-Entscheidung (D16-Analogie,
schließt F3-Finding F3 aus dem Advisor-Pass):** Unabhängig davon, wo die
Wirksamkeitsnachweis-Instanz später abgelegt wird, muss dieser Ort
D16-analog vor dem Ausführungswerkzeug geschützt sein — extern gelesen
(wie die Baseline, F3s `leseAusCommit`-Pfad) oder commit-gepinnt
innerhalb eines Repos, das das geprüfte Werkzeug nicht selbst schreiben
kann. Ein Ablageort im Arbeitsbaum dieses Produkt-Repos, den das
geprüfte Werkzeug potenziell selbst verändert, erfüllt diese Auflage
nicht und würde Startbedingung 2 (E-188) wertlos machen. Diese Auflage
bindet die **spätere** Ablageort-Entscheidung (F6 oder ein eigener
Vertrag), nicht diesen Plan selbst — F4 trifft die Ablageort-Entscheidung
nicht (Design-Entscheidung 3 bleibt inhaltlich unverändert: Parameter,
kein fest verdrahteter Lesepfad)."

**Ergänzung Abschnitt 9 (Offene Unsicherheiten), Punkt 3:** „... bewusst
nicht entschieden, gelöst über Parameter-Entkopplung (Design-Entscheidung
3). **Auflage:** die spätere Entscheidung muss D16-analogen Schreibschutz
erfüllen (siehe Design-Entscheidung 3, Ergänzung oben) — keine
Ablageort-Option ist zulässig, die dem geprüften Werkzeug Schreibzugriff
auf die Nachweis-Instanz gibt."

Diese Auflage erzeugt keinen neuen Code in F4 — sie ist eine
dokumentierte Randbedingung für eine Entscheidung, die außerhalb dieser
Akte getroffen wird (analog zur bestehenden Behandlung von §16.8 Punkt
3/4/8, die plan-v1 bereits offen hält statt stillschweigend zu
schließen).

---

## Delta 3 (löst F6, Export-Umfang) — drei einzelne additive Exporte statt gebündelter Verifikationsfunktion

### Problem (Advisor F6)

plan-v1 [offene Unsicherheit 1] benannte den fehlenden `export` auf
`leseAusCommit`/`gitattributesPinntZeilenenden`/`leiteRepoRelativenPfadAb`
korrekt, aber die Advisor-Gegenprüfung (F6) zeigte: reiner
Primitiven-Export zwingt `pruefeStartbedingung1`, die gesamte
Verzweigungslogik von `pruefeAutorisierung` (`index.ts:155–204`, vier
fail-closed-Zweige: Pfad-Präfix, `.gitattributes`, Hash-Divergenz,
Schema-Validierung) erneut zu schreiben — Duplikation der
**Orchestrierung**, nicht nur fehlender Primitiven-Zugriff.

### Entscheidung: drei einzelne additive Exporte (nicht die vom Advisor vorgeschlagene gebündelte Verifikationsfunktion)

Diese Sitzung entscheidet sich für den in plan-v1 bereits skizzierten,
kleineren Diff — drei einzelne, additive Exporte in
`src/authorization-boundary/index.ts`:

```
export function leseAusCommit(repoWurzel: string, commitHash: string, relativerPfad: string): string | null
export function gitattributesPinntZeilenenden(inhalt: string): boolean
export function leiteRepoRelativenPfadAb(pfad: string, repoWurzel: string): string | null
```

Rein additiv (`export`-Keyword ergänzt, keine Signatur-, Verhaltens-
oder Rückgabewert-Änderung an diesen drei Funktionen oder an
`pruefeAutorisierung`/`verweigereAutorisierung`/
`validiereAutorisierungEintrag`). Kein neuer Regelsatz für `git
show`-Lesen (deckt die ursprüngliche [offene Unsicherheit 1]-Sorge
weiterhin ab).

**Begründung gegen die vom Advisor vorgeschlagene gebündelte
Verifikationsfunktion:** Eine gemeinsame Funktion
(„commit-gepinnten Inhalt auflösen + verifizieren" bis zum geparsten
Inhalt) würde F3 zwingen, eine neue, F4-spezifische Abstraktion zu
tragen, obwohl F3 bereits abgeschlossen und gate-geprüft ist
(`docs/STATUS.md`) — ein Eingriff, der über den in plan-v1 Abschnitt 3
(NICHT) und Budget (Abschnitt 6) vorgesehenen „kleinen F3-Touch, kein
Umbau bestehender F3-Signaturen" hinausginge. Die von F6 benannte
Orchestrierungs-Duplikation ist real, aber sie ist eine Duplikation von
**vier einfachen, bereits einzeln benannten Prüfschritten**
(Pfad-Präfix → `.gitattributes` → Hash-Vergleich → Schema-Validierung),
nicht von komplexer Logik — SCOPE.5 beschreibt diese vier Schritte für
`pruefeStartbedingung1` bereits explizit. Drei additive Exporte halten
den F3-Diff minimal und lassen F4 seine eigene, bewusst andere
Orchestrierung schreiben (unterschiedlicher Rot-Fall-Satz: F4 prüft
Schutzskript-**Hashes** gegen eine Baseline, F3 prüft eine
**Autorisierungsentscheidung** gegen eine Referenz — die Schemata am
Ende unterscheiden sich strukturell, nicht nur im Namen).

**Konsequenz für plan-v1:** [offene Unsicherheit 1] ist damit entschieden
(nicht mehr offen) — SCOPE.5 gilt wie in plan-v1 beschrieben
(„analog F3 SCOPE.4"), jetzt mit den drei Primitiven real importierbar
statt nachgebaut.

---

## Akzeptanzkriterien — Delta-Tabelle (ersetzt/ergänzt betroffene A-Nummern aus plan-v1 Abschnitt 7)

| Nr. | plan-v1 | plan-v2 (Delta) |
|---|---|---|
| A6 | Drift-Fall über unabhängig übergebenen `istGueltigkeitsschluessel` | zusätzlich: Drift-Fall über denselben, in Bedingung 1 bereits verifizierten `istZustand` — Nachweis mit abweichendem `schutzskript_hashes`-Eintrag gegenüber `istZustand` → `{ ok: false, grund }`, nicht `FREIGEGEBEN` (Delta 1) |
| A22 | belegt über A3/A6/A8 | zusätzlich belegt über den neuen Delta-1-Testfall — deckt jetzt auch die F11-Querkonsistenzlücke, nicht nur unabhängige Baseline-/Drift-Rotfälle |

Alle übrigen A1–A5, A7–A21 aus plan-v1 gelten unverändert fort.

## Offene Punkte — weiter als dokumentierte Executor-Entscheidung (nicht in diesem Plan geschlossen)

Diese Sitzung entscheidet bewusst nicht:

- **F6/F7 (Advisor):** ob und wie F4 „Berechtigungskontext
  materialisieren" (§16.2) tatsächlich umsetzt, oder das Feld weiterhin
  als vom Aufrufer gelieferten, opaken Wert behandelt (plan-v1 [offene
  Unsicherheit 2]). Executor entscheidet und dokumentiert die Wahl
  explizit (CLAUDE.md-Entscheidungsregel Punkt 5) — nicht
  stillschweigend als reines Durchreichen bauen, ohne die
  D5-Erwartung („je Aufruf gesetzt, nicht geerbt") zu benennen.
- **F12 (Advisor):** Vergleichssemantik für `arbeitsverzeichnis_pfad` in
  `pruefeStartbedingung2` — rohe String-Gleichheit vs. eine
  Normalisierung analog F3s `normalisierePfad`. §16.8 Punkt 8 führt die
  Pfad-Normalisierung ausdrücklich als offen; Risikorichtung ist
  fail-closed (führt höchstens zu einem falschen `ABGELEHNT`, nie zu
  einem falschen `FREIGEGEBEN`). Executor entscheidet die konkrete
  Vergleichsfunktion und dokumentiert sie als bewusste Wahl, nicht als
  Zufallsergebnis der Implementierung.
- **[offene Unsicherheit 4]** (Eingabeformat `pruefeAufrufparameter`) —
  laut Advisor (F10, entlastend) bereits tragfähig, kein
  Nacharbeitsbedarf. Bleibt wie in plan-v1 SCOPE.4 beschrieben.

Diese drei Punkte sind keine Blocker (Advisor-Urteil: „dürfen mitlaufen")
und werden im Handoff-Vertrag als sichtbare, benannte Executor-Punkte
weitergereicht statt in plan-v2 vorentschieden.
