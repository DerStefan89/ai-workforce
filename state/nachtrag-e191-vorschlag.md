# Nachtrag E-191 — Textvorschlag für docs/projekt/*

Geprüfte NICHT-Klausel aus `state/tasks/ebene2-architektur-in-repo-nachziehen.md:140`:
„Kein Anlegen oder Verändern von `docs/projekt/*`. Diese beiden Dateien
legt der Mensch ab; der Auftrag setzt sie voraus." — gilt weiterhin.
Beleg: `git log` zeigt für beide Dateien seit ihrer initialen Ablage
(Commit `83be859`) keinen weiteren Commit; spätere Pläne (`state/plan-v1-
af-f001-feature-akte.md:117`, `state/plan-v2-af-f001-feature-akte.md:130`)
behandeln `docs/projekt/*`-Änderungen ausdrücklich weiterhin als Sache
Stefans, nicht als Teil ihres eigenen Umfangs. Daher: Textvorschlag hier
in `state/` abgelegt, `docs/projekt/*` selbst nicht verändert.

---

## Einfügen in `docs/projekt/zielfassung.md`

**Stelle:** Abschnitt „9.4 Ausführungsvertrag mit Claude Code", direkt
nach **E-190** (Zeile 217), vor der abschließenden `---` (Zeile 219) —
als Fortsetzung der E-18x/E-190-Nummernfolge.

**Einzufügender Text:**

```
**E-191** — Entscheidung 013 bleibt in Kraft: Fassung 1 pinnt konkrete
Anbieter/Besetzungen, kein generischer Provider-Adapter, kein
Rollen-zu-Modell-Routing. Ergänzend wird die spätere Nachrüstung aktiv
offengehalten:
N1 Anbietername steht ausschließlich in einem dafür vorgesehenen
   runtime-Feld — nicht in Feldnamen, Enum-Werten, Pfaden oder
   Zustandsnamen.
N2 Rolle und Runtime bleiben getrennte Felder, nie kombiniert.
N3 Der Einsprungpunkt aus E-185 (`--model` explizit je Execution) darf
   nicht durch einen fest verdrahteten Default im Core wegoptimiert
   werden.
N4 Der bestehende Backlog-Eintrag Multi-Provider-Orchestrierung bekommt
   die Vorbedingung: nachrüstbar genau dann, wenn N1 bis N3 durchgehalten
   wurden.
Durchsetzungsgrad heute DEKLARIERT, nicht ERZWUNGEN.
```

---

## Einfügen in `docs/projekt/umsetzungsplan-fassung-1.md`

**Stelle:** Abschnitt 5 „Backlog", bestehender Eintrag
„Multi-Provider-Orchestrierung" (Zeile 167–172) — Ergänzung am Ende
desselben Aufzählungspunkts, **kein neuer Backlog-Eintrag**.

**Einzufügender Zusatz** (an den bestehenden Eintrag anschließen):

```
Vorbedingung (E-191, N4): nachrüstbar genau dann, wenn N1–N3 aus E-191
(Anbietername nur im runtime-Feld, Rolle/Runtime getrennt, kein fest
verdrahteter `--model`-Default) bis dahin durchgehalten wurden.
```

---

## Status

- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt

Stefan fügt die beiden Textblöcke oben an den genannten Stellen selbst in
`docs/projekt/zielfassung.md` und `docs/projekt/umsetzungsplan-fassung-1.md`
ein (NICHT-Klausel — KI-Sitzungen ändern diese Dateien nicht).
