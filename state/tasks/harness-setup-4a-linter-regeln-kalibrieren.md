SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.
Danach `git log --oneline -1` gegen main ausgeben und gegen den unten
genannten Commit prüfen. Bei Abweichung: anhalten, Wert nennen, nichts
ändern. Danach `git status --short` ausgeben und protokollieren, bevor
irgendetwas geändert wird.

Zielverzeichnis: C:\Users\stefa\Projekte\ai-workforce
Erwarteter main-Stand: 7e68820

## TASK: harness-setup-4a-linter-regeln-kalibrieren

GOAL:
`biome.json` existiert mit exakt den zwei für Fassung 1 entschiedenen
Regeln (`suspicious/noExplicitAny`, `nursery/noFloatingPromises`) — kein
`recommended`-Standardsatz mehr. Für jede der zwei Regeln liegt ein
echter, real ausgelöster Rot- und Grün-Fall in `state/gates.md`,
Kalibrierungs-Log, mit Original-Ausgabe. Die harte Bedingung aus
`state/plan-v2-harness-setup.md`, AP 4 (Zeile 136–141) ist eingehalten:
Fängt der Rot-Fall die nicht abgewartete Promise nicht, ist Biome an
dieser Stelle widerlegt — dann NICHT selbst den Linter wechseln oder die
Regel wegkonfigurieren, sondern anhalten und eskalieren.
Prüfbar an: `npm run lint` läuft gegen exakt zwei aktive Regeln (kein
Default-Regelsatz) · für jede der zwei Regeln existiert eine eigene
kalibrierte Zeile in `state/gates.md` mit dokumentiertem Rot- UND
Grün-Fall.

CONTEXT:
- [Fakt] `state/tooling.md`: Biome `2.5.9` exakt gepinnt (kein Caret),
  Zweck „Linter, minimaler Regelsatz — kein explizites `any`, nicht
  abgewartete Promises gemeldet". `noFloatingPromises` hat Nursery-Status.
- [Fakt] `package.json`, Skript `lint`: `"biome lint scripts/"` — der
  Linter läuft ausschließlich gegen `scripts/`, nicht gegen das ganze
  Repo. Rot-/Grün-Fälle müssen deshalb mit Testcode innerhalb von
  `scripts/` erzeugt werden, sonst greift `npm run lint` gar nicht.
- [Fakt] Aktuell existiert **keine** `biome.json` im Repo — `npm run lint`
  läuft dadurch mit Biomes `recommended`-Standardsatz, nicht mit dem
  entschiedenen Zwei-Regel-Satz. Genau das behebt dieser Vertrag.
- [Fakt] `state/plan-v2-harness-setup.md`, Zeile 135–141, wörtlich: „Für
  jedes Kettenglied mit Prüfanspruch ein Rot- und ein Grün-Fall in
  `state/gates.md`, mit Originalausgabe. Harte Bedingung (vormals
  „besondere Auflage"): Beide Linter-Regeln bekommen je einen echten
  Rot-Fall. Fängt der Rot-Fall die nicht abgewartete Promise nicht, ist
  Biome an dieser Stelle widerlegt und der Linter wird gewechselt — das
  gilt jetzt uneingeschränkt, weil Regel 2 Nursery-Status hat."
- [Fakt] `state/gates.md` hat aktuell keine Zeile für Biome/Linter-Regeln
  — diese Tabelle wird um mindestens eine neue Zeile ergänzt, im
  vorhandenen Format (Gate | Datei | Prüft | Rot-Fall | Grün-Fall) plus
  einen Eintrag im Kalibrierungs-Log-Abschnitt darunter, wie bei den
  bestehenden Einträgen.

SCOPE:
1. `biome.json` anlegen. Über die offizielle Biome-2.5.9-Schema-Referenz
   (`$schema`) korrekt einbinden: **beide** Regelgruppen (`suspicious`,
   `nursery`) sowie der globale `recommended`-Schalter auf `false`
   gesetzt, danach ausschließlich `suspicious.noExplicitAny` und
   `nursery.noFloatingPromises` explizit aktiviert (Fehlerstufe, die
   `npm run lint` mit Exit-Code ungleich 0 scheitern lässt). Keine
   weiteren Regeln aktivieren, auch keine anderen Nursery-Regeln, die mit
   `recommended: false` sonst automatisch mitliefen.
2. Rot-Fall `noExplicitAny`: temporär eine Zeile mit explizitem `any` in
   eine Datei unter `scripts/` einfügen, `npm run lint` ausführen, volle
   Original-Ausgabe sichern. Danach die Testzeile wieder entfernen.
3. Grün-Fall `noExplicitAny`: ohne die Testzeile `npm run lint` erneut
   ausführen, Exit 0 belegen.
4. Rot-Fall `noFloatingPromises`: temporär eine nicht abgewartete Promise
   in eine Datei unter `scripts/` einfügen (z. B. ein `async`-Aufruf ohne
   `await`/`.then`/`.catch`), `npm run lint` ausführen, volle
   Original-Ausgabe sichern. **Löst dieser Fall NICHT aus:** sofort zu
   ESCALATE springen, Schritt 5 NICHT ausführen, nichts wegkonfigurieren.
5. Grün-Fall `noFloatingPromises`: Testcode wieder entfernen bzw. korrekt
   abgewartet, `npm run lint` erneut ausführen, Exit 0 belegen.
6. `state/gates.md` ergänzen: neue Tabellenzeile(n) für die Biome-Regeln
   nach vorhandenem Muster, plus ein neuer Absatz im
   Kalibrierungs-Log-Abschnitt mit Datum, Regel, Rot-Fall-Befehl+Ausgabe,
   Grün-Fall-Befehl+Ausgabe — wortgetreu wie bei den bestehenden
   Kalibrierungs-Log-Einträgen in derselben Datei.
7. Commit: ausschließlich `biome.json` und `state/gates.md` stagen (keine
   anderen Dateien), Diff zeigen, Freigabe einholen, committen mit
   wahrer, inhaltsbeschreibender Message. Push, eigene Freigabe.
8. Abschließend zeigen: `git log --oneline -1`, `git status --short`,
   vollständiger Diff von `biome.json` und `state/gates.md`.

NICHT:
- Keine weiteren Biome-Regeln über die zwei entschiedenen hinaus.
- `check-rules.mjs` bleibt leer — keine AST-Regeln in diesem Vertrag.
- Kein Eingriff in CI oder Branch Protection (das ist AP 4b, eigener
  Vertrag, noch nicht geschrieben).
- `npm run lint`s Geltungsbereich (`scripts/`) wird nicht erweitert.
- Falls der Rot-Fall für `noFloatingPromises` nicht greift: kein
  eigenmächtiger Linter-Wechsel, keine Regel-Abschwächung — nur melden.
- Kein `git add -A`/`git add .` — nur die in SCOPE 7 genannten Pfade.

BUDGET:
Ein Durchgang plus höchstens eine Korrekturrunde je Regel.

OUTPUT:
- `biome.json`, vollständiger Inhalt.
- Vollständiger, finaler Diff von `state/gates.md`.
- Für beide Regeln: Rot-Fall- und Grün-Fall-Befehl mit vollständiger
  Original-Ausgabe (nicht paraphrasiert).
- Ein Commit mit der unter SCOPE 7 genannten Message, gepusht.
- Die Ausgaben aus SCOPE 8.

ESCALATE:
- Arbeitsverzeichnis oder Commit-Stand weichen von `7e68820` ab →
  anhalten, beide Werte nennen, nichts ändern.
- `git status` zeigt vor SCOPE 1 etwas anderes als einen sauberen Stand →
  anhalten, Ausgabe zeigen, nicht selbst einordnen.
- Rot-Fall `noFloatingPromises` (SCOPE 4) fängt die nicht abgewartete
  Promise NICHT → sofort anhalten. Das ist laut Plan v2 AP 4 der
  vorgesehene Ernstfall („Biome an dieser Stelle widerlegt"), kein
  Ausführungsfehler. Vollständige Original-Ausgabe berichten, NICHT den
  Linter wechseln oder die Regel abschwächen — das ist eine
  Werkzeugentscheidung, die zurück an den Projektchat/Stefan geht.
- Ein Hook meldet sich (Commit-Guard, Settings-Guard) → anhalten, Meldung
  vollständig zeigen, keine Freigabe-Datei anlegen.
