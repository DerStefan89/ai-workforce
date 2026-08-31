# Plan v2 — Feature F5: Context Builder

Slug: f5-context-builder
Stand: 2026-08-30
Grundlage: `state/plan-v1-f5-context-builder.md` (bleibt unverändert
stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-f5-context-builder.md`: **NICHT FREIGEGEBEN** —
blockierend waren B1 (Pfad-Kollision: zwei Anfragen mit gleichem Pfad,
unterschiedlichem zitiertem Bereich, sind mit F2s realer
`pruefeStale`-API wie geplant nicht unterscheidbar), B5 (Plan Abschnitt 0
behauptete fälschlich, `pruefeStale` werfe ohne vorherige Registrierung —
real liefert es still `{ stale: false }`), B2 (fail-open bei unbekannter
Rolle widerspricht der eigenen Sicherheitsbegründung des Plans), B4
(Reihenfolgeabhängigkeit der Evidenz-vs-Budget-Entscheidung war
stillschweigend, nicht als Entscheidung benannt), B3 (Muster-Matching-
Mechanismus unspezifiziert). B6-B9 sind laut Advisor niedrige Schwere
bzw. offene, nicht im Repo klärbare Punkte — hier miterledigt (B6-B8)
bzw. unverändert offen dokumentiert (B9). A1-A7 sind laut Advisor
**bestätigt, entlastend** — die F2-API-Wiedergabe, die
Rollen-im-Kern-Entscheidung (D1), das `{ok:false, grund}`-Muster (D4),
das Fehlen eines Runtime-Felds (E-191) und der Kein-F1/F1B/F2-Touch
brauchen keinen Umbau.

Alle Abschnitte von plan-v1, die hier nicht erwähnt werden, gelten
unverändert fort: Abschnitt 1 (Ziel), 2.1 (Modulordner), 2.6
(Ereignisnamen), 2.7 (Gate/Tests/Doku-Grundstruktur), 5 (Ablageort), 6
(Budget & Pässe), 8 (Rollen), 9 (Nächste Schritte). Betroffen sind
Abschnitt 0 (Delta 5), 2.2 (Delta 2, Delta 6), 2.3 (Delta 1, Delta 4),
2.4 (Delta 1), 2.5 (Delta 5), Design-Entscheidungen (neue D6/D7), und
Abschnitt 7 (jetzt vollständig aufgelöst bis auf den ausdrücklich
weiterhin offenen Punkt B9).

Diese Deltas sind technische Präzisierungen innerhalb der bereits von
plan-v1 getroffenen Grundentscheidungen (eigenes Modul, Rollen im Kern,
kein F1/F1B/F2-Touch) — keine neue Grundsatzentscheidung. Diese Sitzung
löst B1-B8 direkt auf, statt sie erneut zu eskalieren
(CLAUDE.md-Entscheidungsregel: Wartbarkeit/Komplexität reduzieren,
Entscheidung dokumentieren, nicht stillschweigend).

---

## Delta 1 (löst B1) — Zusammengesetzter Element-Schlüssel statt reinem Pfad

### Problem (Advisor B1)

plan-v1 Abschnitt 2.3 dedupliziert und registriert Elemente über
`pfad_oder_muster` als `pfad`-Wert. `pruefeStale` vergleicht pro
`EingabeReferenz` genau einen String je Schlüssel `pfad`
(`aktuelleEingabeInhalte: Record<string, string>`,
`src/lineage-registry/index.ts:209-232`). Zwei Anfragen mit gleichem
Pfad, aber unterschiedlichem zitiertem Bereich (von AC3 selbst
verlangt: „identischem Pfad **und** identischem zitiertem Bereich" als
Dedup-Bedingung, im Umkehrschluss beide sonst separat aufzunehmen),
erhalten denselben `pfad`-Schlüssel — die STALE-Prüfung kann die beiden
Inhalte nicht mehr trennen.

### Lösung: Element-Schlüssel = Pfad + Bereichs-Kennung

**Anfrage-Typ erweitert:**

```ts
interface Anfrage {
  pfad: string                  // vormals pfad_oder_muster — reiner Pfad, siehe Delta 6
  bereichsKennung?: string      // z. B. "L1-40"; Aufrufer liefert einen stabilen String, F5 erfindet keinen
  frage: string
  begruendung: string
  inhalt: string
  notwendig?: boolean
}
```

**Element-Schlüssel-Regel:** `elementSchluessel(a: Anfrage) = a.
bereichsKennung ? \`${a.pfad}#${a.bereichsKennung}\` : a.pfad`. Dieser
Schlüssel wird als `pfad`-Feld im resultierenden `EingabeReferenz`-Eintrag
geführt (nicht der rohe `a.pfad` allein), `zitierter_bereich` trägt
weiterhin `a.bereichsKennung ?? null` (unstrukturiert, F2-Nicht-Ziel
respektiert). Zwei Anfragen auf dieselbe Datei mit unterschiedlicher
`bereichsKennung` erhalten dadurch unterschiedliche `pfad`-Werte im
Element und sind für `pruefeStale` eindeutig unterscheidbar.

**Rollenfilter (2.2) bleibt auf `a.pfad` (dem rohen Dateipfad) angewandt,
nicht auf den zusammengesetzten Schlüssel** — Reihenfolge in Abschnitt
2.3 unverändert: (1) Rollenfilter auf `a.pfad`, (2) Dedup/Key-Bildung,
(3) Budget. Ein Ausschlussmuster wie `state/tasks/**` muss weiterhin
gegen den echten Dateipfad matchen, nicht gegen `pfad#bereich`.

**`pruefeKontextpaketFrisch` (2.5):** der Aufrufer muss
`aktuelleEingabeInhalte` mit denselben zusammengesetzten Schlüsseln
befüllen, die beim Bau verwendet wurden (aus dem zurückgegebenen
`paket.elemente[].pfad` ablesbar — kein separates Ableitungswissen beim
Aufrufer nötig, er kopiert die Schlüssel aus dem zuvor erhaltenen Paket).
Löst B1 vollständig: `pruefeStale` bleibt unverändert (kein zweiter
Regelsatz, Anspruch aus 2.5 „keine eigene Logik" bleibt erhalten), die
Eindeutigkeit entsteht ausschließlich aus der Schlüsselbildung vor dem
F2-Aufruf.

## Delta 2 (löst B2) — Fail-closed bei unbekannter Rolle

### Problem (Advisor B2)

plan-v1 Abschnitt 2.2 ließ eine unbekannte Rolle mit voller
Ausschlussliste (= kein Ausschluss = Vollzugriff) durch. Widerspricht der
eigenen Begründung des Plans, ein unbekannter Rollenname solle nicht
heimlich kompensiert werden — stiller Vollzugriff ist selbst eine
heimliche Kompensation.

### Lösung

`baueKontextpaket` prüft `rolle` zuerst gegen die Schlüssel von
`ROLLEN_AUSSCHLUSSMUSTER` (Delta 6 unten). Ist `rolle` kein bekannter
Schlüssel: sofortiger Abbruch, `{ ok: false, grund: 'unbekannte_rolle',
rolle }`, kein Element wird geprüft oder aufgenommen, keine Registrierung
über F2. Ereignis `kontextpaket_unbekannte_rolle` (Ergänzung zu 2.6).

## Delta 3 (löst B3) — Minimaler, selbst geschriebener Muster-Matcher, kein neuer Dependency

### Problem (Advisor B3)

plan-v1 Abschnitt 2.2 nannte `src/**`-Beispiele ohne
Vergleichsalgorithmus; keine Glob-Dependency im Repo, keine bestehende
Utility.

### Lösung: D6 (neu)

**D6 (minimaler Präfix-Matcher, kein Glob-Paket):** Ein
Ausschlussmuster ist entweder (a) ein exakter Pfad (Gleichheit) oder (b)
ein Verzeichnis-Präfix mit dem literalen Suffix `/**` (z. B.
`state/tasks/**` matcht jeden Pfad, der mit `state/tasks/` beginnt).
Kein Regex, keine Extglob-/Brace-Syntax, keine npm-Dependency —
`ARCHITECTURE.md` §6 verlangt vor einer neuen Test-/Utility-Dependency
den Skill `werkzeug-auswahl`; für zwei Vergleichsfälle (Gleichheit,
Präfix) ist das unbegründeter Vorgriff (YAGNI). Implementierung:
`function passtMuster(pfad: string, muster: string): boolean { if
(muster.endsWith('/**')) return pfad.startsWith(muster.slice(0, -2));
return pfad === muster }`. Windows-Pfadtrenner werden vor dem Vergleich
nicht normalisiert (`v0`-Annahme: `pfad`/`muster` liegen bereits im
selben, vom Aufrufer konsistent gewählten Trennerformat vor — anders als
F3s reale Pfadvergleiche, die echte Dateisystempfade vergleichen mussten
(B20-Nachbesserung dort), sind F5s Pfade hier logische Bezeichner
innerhalb eines Kontextpakets, keine direkt vom Dateisystem gelesenen
OS-Pfade). Explizites Nicht-Ziel: volle Glob-Unterstützung
(`*`, `?`, `{a,b}`) — nachrüstbar, falls ein realer Aufrufer (Gateway,
F6) sie braucht.

## Delta 4 (löst B4) — Notwendige Anfragen zuerst einplanen

### Problem (Advisor B4)

plan-v1 Abschnitt 2.3 Schritt 3 verarbeitete Anfragen in roher
Aufrufer-Reihenfolge; ob eine notwendige Anfrage noch ins Budget passt,
hing damit vom Verbrauch durch vorher gelistete, optionale Anfragen ab —
stillschweigend, nicht als Entscheidung benannt.

### Lösung: D7 (neu) — zweiphasige Budget-Vergabe

**D7:** Nach Rollenfilter und Dedup (Delta 1/2 unverändert vorgelagert)
wird die verbleibende Liste in zwei Gruppen geteilt, **notwendige zuerst**:

1. **Phase A — notwendige Anfragen** (`notwendig === true`), in
   Aufrufer-Reihenfolge innerhalb dieser Gruppe: gegen das volle Budget
   geprüft. Passt eine notwendige Anfrage nicht mehr hinein, wird sie
   NICHT verworfen, sondern in `nichtAufnehmbar` gesammelt (D3 aus
   plan-v1 unverändert: alle blockierenden Anfragen in einem Durchlauf
   sammeln, nicht beim ersten Treffer abbrechen). Ist `nichtAufnehmbar`
   nach Phase A nicht leer: sofortiger Stopp, `{ ok: false, grund:
   'EVIDENZLUECKE', nichtAufnehmbar }` — Phase B läuft nicht mehr an
   (kein Budget für optionale Anfragen wird verbraucht, wenn die
   notwendige Evidenz ohnehin nicht passt).
2. **Phase B — optionale Anfragen** (`notwendig !== true`), nur wenn
   Phase A vollständig ins Budget passte: gegen das nach Phase A
   verbleibende Restbudget geprüft, in Aufrufer-Reihenfolge; eine
   Anfrage, die nicht mehr passt, wird nach `ausgeschlossen.push({ pfad,
   grund: 'budget' })` verworfen (plan-v1 Verhalten unverändert für
   diesen Fall).

Damit ist „Evidenz vor Budget" (115) unabhängig von der
Eingabe-Reihenfolge des Aufrufers durchgesetzt: notwendige Anfragen
konkurrieren nur untereinander ums Budget, nie gegen optionale.

## Delta 5 (löst B5) — Korrektur der Plan-Abschnitt-0-Verifikation + neuer Testfall

### Problem (Advisor B5)

plan-v1 Abschnitt 0 behauptete fälschlich, `pruefeStale` ohne vorherige
Registrierung würfe. Real (`index.ts:209-232`): `if (version !== null)`
— bei `null` bleibt `geaenderteEingaben` leer, Rückgabe `{ stale: false,
geaenderteEingaben: [] }`, kein Wurf.

### Korrektur

Abschnitt 0, betroffener Absatz wird ersetzt durch: „`pruefeStale`
(F2) liefert bei einer nicht existierenden `artefaktId`/`versionSequenz`
**keinen Wurf**, sondern still `{ stale: false, geaenderteEingaben: [] }`
(`ladeArtefaktVersion` liefert `null`, die Schleife über `version.
eingaben` wird dann übersprungen, `index.ts:216-227`). Für
`pruefeKontextpaketFrisch` bedeutet das: ein falscher `lauf_id`- oder
`versionSequenz`-Parameter wird nicht als Fehler sichtbar, sondern als
‚nicht veraltet' fehlgedeutet, wenn der Aufrufer das Ergebnis ungeprüft
weiterverwendet. F5 selbst führt hier keine zusätzliche Prüfung ein (kein
Abweichen vom ‚dünner Aufrufer'-Prinzip aus 2.5) — AC10 bekommt
stattdessen einen expliziten Testfall, der dieses reale Verhalten
dokumentiert (Testfall unten)."

**Neuer Testfall (Ergänzung zu AC10/2.7):** `pruefeKontextpaketFrisch`
gegen eine nie registrierte `lauf_id` liefert `{ stale: false,
geaenderteEingaben: [] }`, nicht `{ ok: false }` oder einen Wurf — als
dokumentiertes, bewusst nicht durch F5 verändertes Verhalten von F2,
nicht als F5-Bug.

## Delta 6 (löst B6, B7, B8) — Kleinere Präzisierungen

- **B6:** Abschnitt 2.3 Schritt 2 (Duplikat-Filter) wird um den Satz
  ergänzt: „Inhalts-Hash-Gleichheit steht hier stellvertretend für
  Bereichs-Gleichheit — F2s `EingabeReferenz.zitierter_bereich` bleibt
  laut F2-Nicht-Ziel unstrukturiert, ein Inhalts-Hash-Vergleich ist die
  einzige verfügbare, verlässliche Gleichheitsprüfung ohne ein zweites,
  eigenes Bereichsformat einzuführen." Keine Verhaltensänderung, nur
  Begründung nachgetragen.
- **B7:** `ROLLEN_AUSSCHLUSSMUSTER` bleibt auf Besetzungsnamen
  (`architecture-advisor`, `code-reviewer`, `qa`, `ausfuehrung` — siehe
  B8) geschlüsselt, D1 bleibt unverändert. Neuer, ausdrücklicher
  Nicht-Ziel-Satz (Ergänzung `features/F5/feature.md` nicht nötig, da
  bereits als „bewusst minimal, erweiterbar" markiert; hier nur im Plan
  präzisiert): „Ändert sich die Besetzung einer Position (§4/§16.7,
  Zeile 80), ist eine Anpassung dieser Tabelle eine reine
  Staffing-Nachführung, keine Rollenmodell-Änderung — bewusst in Kauf
  genommen, da F5 ohne einen realen zweiten Aufrufer (Gateway) keine
  stabilere Abstraktion belegen kann (YAGNI)."
- **B8:** Rollenschlüssel `executor` umbenannt zu `ausfuehrung`, um die
  terminologische Doppelbelegung mit dem bestehenden `executor: string`
  aus `src/human-transport/types.ts:33`
  (Transport-Zielsystem-Bezeichnung, andere Bedeutung) zu vermeiden. Reine
  Namensänderung, keine Verhaltensänderung.

## Weiterhin offen — B9 (nicht durch Repo-Recherche auflösbar)

Ob „Evidenz vor Budget" (Entscheidung 115) einen vollständigen Stopp
(gewählt, D3 aus plan-v1) oder ein Teilpaket mit sichtbarer Lücke
verlangt, ist im Repo nur als Ein-Wort-Referenz belegt (Register liegt
außerhalb des Repos). Advisor bestätigt: intern konsistent mit dem
D4/D10-Präzedenzmuster (F1B/F3), aber nicht beweisbar. Bleibt in
plan-v2 unverändert offen — Klärung nur durch Stefan möglich, kein
Blocker für einen zweiten Advisor-Pass (der prüft die Delta-Umsetzung,
nicht diese Auslegungsfrage erneut).

---

## Aktualisierte Akzeptanzkriterien-Zuordnung (Delta-Tabelle)

| AC | Betroffen durch | Status nach v2 |
|---|---|---|
| AC3 | Delta 1 | Element-Schlüssel = Pfad+Bereich, Dedup korrekt umsetzbar |
| AC5 | Delta 4 | Zweiphasige Budgetvergabe, notwendige Anfragen zuerst |
| AC6/AC7 | Delta 1 | `EingabeReferenz.pfad` = zusammengesetzter Schlüssel, STALE-Prüfung eindeutig |
| AC9 | unverändert | E-191 N1/N2 weiterhin erfüllt (A6, Advisor bestätigt) |
| AC10 | Delta 5 | neuer Testfall „nie registrierte lauf_id" ergänzt |

**Korrektur (Nachtrag unten, V20):** AC2 gehört zu Delta 3, nicht zu
„unverändert" — der Vergleichsalgorithmus aus Delta 3 macht AC2 erst
umsetzbar. Alle übrigen AC1/4/8/11 unverändert aus plan-v1.

---

## Nachtrag — zweiter Advisor-Pass (Delta-Prüfung)

`state/advisor-findings-f5-context-builder-v2.md`: **Freigegeben mit
Hinweisen.** Drei Nachbesserungen benannt, hier direkt eingearbeitet
(keine dritte Advisor-Runde nötig):

**Zu Delta 4 (V11) — Phase A als kumulativer Algorithmus, explizit:**

```
verbleibendesBudget = { elemente: budget.maxElemente, bytes: budget.maxBytes }
nichtAufnehmbar = []
fuer jede notwendige Anfrage a (in Aufrufer-Reihenfolge):
  waereElemente = 1, waereBytes = byteLaenge(a.inhalt)
  wenn (verbleibendesBudget.elemente - waereElemente < 0) ODER
      (verbleibendesBudget.bytes - waereBytes < 0):
    nichtAufnehmbar.push(a)   // NICHT vom Budget abziehen
  sonst:
    verbleibendesBudget.elemente -= waereElemente
    verbleibendesBudget.bytes -= waereBytes
    angenommen.push(a)
wenn nichtAufnehmbar.length > 0: STOPP, { ok:false, grund:'EVIDENZLUECKE', nichtAufnehmbar }
sonst: weiter mit Phase B, verbleibendesBudget als Startwert
```

Kumulative laufende Summe gegen das volle Budget (Lesart a aus V11) —
eine notwendige Anfrage, die einzeln unter dem Maximum läge, aber das
inzwischen verbrauchte Budget überschreiten würde, zählt als nicht
aufnehmbar. Löst V11 abschließend.

**Zu Delta 1 (V3, V4) — zwei explizite Fehlerpfade statt stiller
Kollision:**

- **V3 (`#` im rohen Pfad):** `baueKontextpaket` validiert vor jeder
  weiteren Verarbeitung: enthält `a.pfad` das Zeichen `#`, wird die
  Anfrage sofort als Fehler zurückgewiesen — `{ ok: false, grund:
  'ungueltiger_pfad', pfad: a.pfad }`, kein Teilerfolg. `#` ist damit ein
  im rohen Pfad verbotenes Zeichen (Trennzeichen bleibt exklusiv für die
  Schlüsselbildung reserviert), keine Escaping-Logik nötig — einfacher
  und ohne neue Kodierregel.
- **V4 (gleicher zusammengesetzter Schlüssel, unterschiedlicher Inhalt):**
  Schritt 2 (Duplikat-Filter) wird um eine dritte Bedingung ergänzt: hat
  eine bereits angenommene Anfrage denselben zusammengesetzten Schlüssel
  wie die aktuelle, aber einen **anderen** Inhalts-Hash, ist das kein
  Duplikat und kein neues Element, sondern ein Widerspruch — sofortiger
  Fehler `{ ok: false, grund: 'widerspruechliche_anfrage', pfad:
  elementSchluessel(a) }`. Zwei Anfragen mit identischem Pfad und
  identischem Bereich müssen denselben Inhalt melden; tun sie das nicht,
  ist das ein Aufrufer-Fehler (z. B. zwei verschiedene Lesezeitpunkte
  derselben Datei ohne erkennbaren Bereichsunterschied), den F5 nicht
  stillschweigend durch Doppelaufnahme verdeckt.

Beide Fehlerpfade sind neue, benannte Ausgänge — kein Wurf (D4-Muster
unverändert), Ereignisse `kontextpaket_ungueltiger_pfad` und
`kontextpaket_widerspruechliche_anfrage` ergänzen 2.6.

**Zu AC2/Tabelle (V20):** korrigiert, siehe Zeile oberhalb dieses
Nachtrags.
