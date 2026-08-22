SCHRITT 0: Arbeitsverzeichnis ausgeben und gegen das im Auftrag genannte
Zielverzeichnis prüfen. Bei Abweichung: abbrechen, melden, nichts ändern.

## TASK: harness-setup-4c-branch-protection-anlegen-und-kalibrieren

GOAL:
Branch Protection auf `main` gemäß `SETUP.md` Punkt 1 real anlegen (nicht
nur beschreiben) und mit echten Rot-/Grün-Fällen kalibrieren — der in
AP 4b eskalierte, von Stefan im Projektchat freigegebene Nachtrag zum
zuvor entfallenen SCOPE Schritt 5/7.

CONTEXT:
- [Fakt] `gh api repos/DerStefan89/ai-workforce/branches/main/protection`
  lieferte am 2026-08-21 `404 Branch not protected` — dokumentiert in
  `state/gates.md`, Zeile zu „Branch Protection" (Commit `21c708a`).
- [Fakt] Repo ist öffentlich (`gh repo view --json visibility` →
  `PUBLIC`) — die Free-Tarif-Einschränkung aus `SETUP.md` Punkt 1 greift
  hier nicht.
- [Fakt] `SETUP.md` Punkt 1 fordert genau drei Dinge für die Regel auf
  `main`: „Require a pull request before merging", „Require status
  checks to pass before merging" mit dem Job `check` aus
  `.github/workflows/ci.yml` als Required Status Check, und „Do not allow
  bypassing the above settings" aktiviert.
- [Fakt] `docs/guide/03-DEEPDIVE-gates.md`, Abschnitt „Branch Protection
  — das härteste Gate": ohne „Do not allow bypassing" ist das Gate
  „genau dann wirkungslos, wenn es gebraucht wird".
- [Annahme, von mir für diesen Vertrag festgelegt] Keine
  Pflicht-Reviewer-Anzahl setzen (`required_approving_review_count: 0`
  oder das Feld ganz weglassen, falls die GitHub-API das für die
  PR-Pflicht ohne Review-Zwang so vorsieht). Begründung: Repo hat einen
  Solo-Maintainer (Stefan); eine Pflicht-Review-Anzahl ≥ 1 würde ihn von
  eigenen Merges auf `main` aussperren, ohne dass `SETUP.md` Punkt 1 das
  verlangt. Wenn die GitHub-API das technisch anders erzwingt als hier
  angenommen: SCOPE Schritt 3 anhalten, siehe ESCALATE.
- [Fakt] Freigabemechanik für Commits: `.claude/hooks/commit-guard.js` +
  Skill `git-flow` — kein Commit ohne frische, einmalige
  Freigabe-Datei, kein `git add -A`/`.`, niemals selbst mergen.
- [Fakt] Ab dem Moment, in dem diese Regel aktiv ist, ist ein direkter
  Push auf `main` (wie bei den Commits `7e68820`, `fde07ff`, `21c708a`
  bisher üblich) nicht mehr möglich — auch der eigene Kalibrierungs-Commit
  aus SCOPE Schritt 6 muss danach über einen Branch + PR laufen, nicht
  direkt gepusht werden.

SCOPE:
1. `git status` sauber, auf `main`, `git pull` aktuell — vor jeder
   Änderung erneut `gh api repos/DerStefan89/ai-workforce/branches/main/
   protection` lesen. Weicht das Ergebnis vom oben dokumentierten 404 ab
   (Regel existiert bereits) → ESCALATE, nicht überschreiben.
2. Regel anlegen (`gh api -X PUT .../branches/main/protection` oder
   gleichwertig über die GitHub-Weboberfläche, wenn `gh api` das PUT
   nicht sauber abbildet): Required Status Check `check` (strict: true —
   Branch muss aktuell sein), `enforce_admins: true`, PR vor Merge
   erforderlich, keine Pflicht-Reviewer-Anzahl (siehe CONTEXT-Annahme),
   keine `restrictions`. Danach lesend bestätigen (`gh api .../protection`
   GET) und den vollständigen Wortlaut der jetzt aktiven Regel zeigen.
3. Echter Rot-Fall: Wegwerf-Branch von `main` abzweigen, dieselbe
   `any`-Testzeile wie in AP 4a/4b in `scripts/_mode.ts` einfügen, PR
   öffnen, CI rot laufen lassen. Merge-Versuch (`gh pr merge` oder
   `gh api .../pulls/<n>` lesend auf `mergeable_state`) — muss durch die
   neue Regel verhindert werden. Exakte Fehlermeldung/den exakten
   `mergeable_state`-Wert im Wortlaut zeigen.
4. Echter Grün-Fall: Testzeile entfernen, CI grün laufen lassen,
   `mergeable_state` erneut lesen — muss jetzt auf „clean"/mergebar
   wechseln. NICHT tatsächlich mergen (wie in AP 4b: PR danach ohne
   Merge schließen, Wegwerf-Branch lokal und remote löschen).
5. `state/gates.md`: Zeile „Branch Protection" von „Nicht kalibrierbar —
   Regel existiert nicht" auf den jetzt real angelegten Zustand
   aktualisieren — vollständiger Regel-Wortlaut aus Schritt 2, Rot-Fall
   aus Schritt 3, Grün-Fall aus Schritt 4, Datum. Bestehenden Text nicht
   löschen, sondern als kalibrierten Nachtrag ergänzen (Tabellenzeile
   ersetzen, Kalibrierungs-Log-Eintrag ergänzen).
6. Kalibrierungs-Commit für `state/gates.md`: da `main` jetzt geschützt
   ist, läuft das über einen eigenen Branch + PR (git-flow-Skill),
   NICHT über direkten Push. PR öffnen, CI-Status melden, NICHT selbst
   mergen — das bleibt bei Stefan (Punkt 10 des git-flow-Skills, jetzt
   auch technisch erzwungen statt nur Konvention).

NICHT:
- Pflicht-Reviewer-Anzahl > 0 setzen.
- `CLAUDE.md`, `claude/*.md`, `04_ENTSCHEIDUNGSREGISTER_001_176.md` oder
  sonstige Projektchat-Dokumente anfassen — das ist Sache des
  Projektchats, nicht dieses Vertrags.
- Irgendetwas aus Schritt 3/4 tatsächlich auf `main` mergen.
- Weitere Punkte aus `SETUP.md` (2, 3, 4) anfassen.
- `.claude/settings.json`, Hooks, `package.json`, `ci.yml` inhaltlich
  ändern.
- Weitere Gates in `state/gates.md` außer der Branch-Protection-Zeile und
  dem zugehörigen Log-Eintrag anfassen.

BUDGET:
Ein Baudurchgang plus höchstens eine Korrekturrunde. Der Halt bei Schritt
1 (falls die Regel schon existiert) zählt nicht als Korrekturrunde.

OUTPUT:
- Wortlaut der GET-Antwort auf `.../protection` nach Schritt 2.
- Rot-Fall-Beleg (Schritt 3) und Grün-Fall-Beleg (Schritt 4) im Wortlaut.
- `git diff --staged` für den `state/gates.md`-Commit vollständig zeigen,
  mein ausdrückliches „ja" abwarten, bevor committet wird.
- PR-Link/Status für den Kalibrierungs-Commit nennen. NICHT selbst
  mergen.
- Bestätigung, dass alle Wegwerf-Branches/PRs aus Schritt 3/4 aufgeräumt
  sind (geschlossen ohne Merge, Branches gelöscht) und `main` davon
  unberührt blieb.

ESCALATE:
- Schritt 1 weicht vom dokumentierten 404-Zustand ab → anhalten, melden,
  nichts anlegen/überschreiben.
- Die GitHub-API erzwingt bei „PR vor Merge erforderlich" faktisch doch
  eine Mindest-Reviewer-Anzahl ≥ 1 (Selbstsperre-Risiko für Stefan als
  Solo-Maintainer) → anhalten, nicht mit höherer Reviewer-Zahl
  weitermachen, melden.
- Rot-Fall aus Schritt 3 tritt NICHT ein (Merge trotz rotem CI möglich)
  → anhalten, melden — das Gate wäre dann wirkungslos, keine
  „kalibriert"-Aussage in `state/gates.md` eintragen.
- `git status` zu Beginn nicht sauber → anhalten, Ausgabe zeigen.
- Direkter Push auf `main` (Schritt 6) gelingt entgegen der Erwartung aus
  CONTEXT trotzdem → anhalten, melden, nicht committen — dann ist die
  Regel aus Schritt 2 nicht wie gewünscht aktiv.
