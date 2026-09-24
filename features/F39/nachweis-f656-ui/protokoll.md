| Aktion | Workflow-Status | Prüfung ROT (Badge) | Prüfung GRUEN (Badge) | Knopf 'Prüfung wiederholen' sichtbar | Knopf disabled (läuft) | Erfolgsmeldung sichtbar |
| --- | --- | --- | --- | --- | --- | --- |
| Regel-1f-Halt: Ausführung ERFOLGREICH, Prüfung ROT — Knopf 'Prüfung wiederholen' ist sichtbar | f656-nachweis-a | true | false | true | false | false |
| Klick auf 'Prüfung wiederholen' — Zustand 'läuft' (Knopf disabled, Prüflauf dauert real 800ms) | f656-nachweis-a | true | false | true | true | false |
| Nach der Prüfung: neuer Status GRUEN, Review automatisch gestartet, Knopf verschwunden | f656-nachweis-a | false | true | false | false | true |
| Prüfung GRUEN, Review-Schritt bereits gestartet (LAEUFT) — Knopf 'Prüfung wiederholen' ist NICHT sichtbar | f656-nachweis-b | false | true | false | false | false |
| KLAERUNG_ERFORDERLICH aus einem ANDEREN Grund (Schritt 'schritt-1-architekt' endete VERWEIGERT, Regel 1a — der Ausführungsschritt ist noch nie gelaufen) — Knopf 'Prüfung wiederholen' ist NICHT sichtbar | f656-nachweis-c | false | false | false | false | false |
