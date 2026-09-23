# Nachweis Fixpaket — F-624/F-625/F-626 (F34)

Realer Render-Nachweis für das Fixpaket `fix/f34-sparring-verlauf`, 23.09.2026.
Screenshots + Klicktabelle: `features/F34/nachweis-fixpaket-ui/` (erzeugt
über `features/F34/nachweis-fixpaket-ui/erzeuge-nachweis.mjs`, entspricht
`npm run render-nachweis`).

## Aufbau des Nachweises

Ein isolierter Fixture-Leitstand (Port 4174) mit gestubbtem
`fuehreAufgabeDurchFn` — liefert die realen Schema-Beispiele
`ergebnis-product-coach.valid-scope-entwurf.json` (erste Nachricht) und
`valid-projekt-entwurf.json` (zweite Nachricht) statt eines
nicht-deterministischen LLM-Laufs. Begründung: der Nachweis soll das
UI-Rendering beider `art`-Formen UND die F-624-Filterung UND die
F-625-Brücke in EINEM reproduzierbaren Durchlauf zeigen — ob und wann ein
echter Coach in genau einem Turn `art: scope_entwurf`/`projekt_entwurf`
statt einer Rückfrage liefert, ist nicht steuerbar (F-626-Auftrag erlaubt
diese Eskalation ausdrücklich). HTTP-, Render- und Auftrag-Anlage-Pipeline
bleiben dabei real — nur die Coach-Antwort selbst ist gestubbt, jede
Nachricht wird über echte Playwright-Interaktion (tippen + Senden-Klick)
abgeschickt.

Realer Stolperstein dabei (jetzt behoben, s. `state/findings.md` F-628):
der erste Anlauf hing dauerhaft mit gesperrtem Senden-Button, weil der
Fixture-Stub keine echten F1B-Wirkungsmarken (`run_prepared`/`terminal`)
schrieb — `GET /api/laeufe/<laufId>` (das der echte Browser-Client pollt)
blieb dadurch dauerhaft 404. Zweiter Stolperstein: der `reload`-Schritt von
`scripts/render-nachweis.mjs` erwies sich als No-op (Chromium navigiert
nicht neu, wenn Ziel- und aktuelle URL byte-identisch sind) — ein
Marker-Test bestätigte es, der Fix (`about:blank`-Zwischensprung) ist jetzt
generisch im Werkzeug selbst.

## Klicktabelle (Auszug, vollständig in `nachweis-fixpaket-ui/protokoll.md`)

| Aktion | Scope-Turn sichtbar | Projekt-Turn sichtbar | Auftrag-Trigger sichtbar | „Bereits angelegt“-Hinweis |
| --- | --- | --- | --- | --- |
| Feature-Antwort abgewartet (scope_entwurf) | **true** | false | true | false |
| Klick „Projekt“ | false | false | false | false |
| Projekt-Antwort abgewartet (projekt_entwurf) | false | **true** | true | false |
| Klick „Feature“ zurück | **true** | false | true | false |
| Klick „Anlegen“ | true | false | false | **true** |
| Reload (echte Navigation, F-628-Fix) | true | false | false | **true** |

## Ergebnis je Finding

- **F-624 (gelöst):** beim Wechsel zwischen „Feature“/„Projekt“ ist IMMER
  nur der Turn des gerade aktiven Unterumschalters sichtbar — nie beide
  gleichzeitig, in beide Richtungen real geprüft (Feature→Projekt→Feature).
- **F-625 (gelöst):** nach „Anlegen“ zeigt der Turn „Auftrag bereits
  angelegt (…)“ statt des Triggers — UND bleibt nach einem ECHTEN
  Seiten-Reload (F-628-Fix macht das erst belegbar) bestehen, kein
  Duplikat-Risiko mehr.
- **F-626 (gelöst):** dieser Nachweis selbst — ein realer
  Nachricht-senden/art-abwarten/Untermodus-wechseln/Auftrag-anlegen/
  Reload-Durchlauf, den es vorher nicht gab.

## Neue, reale Funde bei der Erstellung dieses Nachweises

- **F-628** (`HARNESS_IMPROVEMENT`, erledigt): `render-nachweis.mjs`s
  `reload`-Schritt war ein No-op — betraf strukturell jeden bisherigen
  Render-Nachweis, blieb dort folgenlos nur durch einen leeren
  Playwright-Kontext. Jetzt generisch im Werkzeug behoben.
- **F-629** (`BUG`, offen, außerhalb des Fixpaket-Scopes): `.btn` (und
  `.chat-zusammenfassen-btn`) tragen keine `[hidden]`-Ausnahme —
  `#chat-abbrechen-btn`/`#chat-zusammenfassen-btn` sind dadurch app-weit
  IMMER sichtbar, unabhängig vom `hidden`-Attribut (dieselbe Fehlerklasse
  wie F-621, hier nie behoben). Sichtbar auf jedem Screenshot dieses
  Nachweises (`01-initial-jarvis.png` u. a.), real entdeckt, weil dieser
  Nachweis erstmals diesen Teil der Seite im Bild hatte. Siehe
  `state/findings.md` F-629 für Details und Fix-Vorschlag.
