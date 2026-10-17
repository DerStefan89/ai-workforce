# Rückweg der Kette und Plan v2 — Einzelheiten zu ARCHITECTURE.md §1

Herkunft: wörtlich aus `ARCHITECTURE.md` §1 verschoben (F45 K „Kontext-Diät“, 17.10.2026), nicht gekürzt. Die Regeln
stehen als Sätze im Kern `ARCHITECTURE.md` §1. Dieser Text ist gleich verbindlich; bei Widerspruch gilt der Kern, und
jeder Widerspruch ist ein Befund; eine Regeländerung ändert Kern und Detail gemeinsam. §-Angaben im Text meinen `ARCHITECTURE.md`. Lesen nur bei Bedarf — wenn eine Aufgabe das
Thema berührt.

---

- `scripts/` — Die Rückweg-Regel der Kette (F45 B2b-1a) steht als reine Funktion in `scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`pruefeRueckweg`): höchstens ein automatischer Rückweg je Stufe, zusammen höchstens `grenzen.max_replans`, sofortiger Halt bei denselben Befunden; „Prüfer wiederholen“ setzt nur einen Prüfschritt in einer neuen Workflow-Version zurück und zählt nicht als Rückweg. Was schreibt, bleibt im Server (Zählung der Workflow-Schreiber, F-228).
- `schemas/` — Bei FREIGEGEBEN_MIT_AUFLAGEN/UEBERARBEITEN schreibt der Architekt einmal Plan v2 (F45 B2b-1b-2a): die Rückweg-Regel lebt rein in `scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`ermittlePlanRueckweg`), der Sprung über den gelaufenen Advisor in `src/workflow` (Regel 3a), geschrieben wird im Nachlauf des Advisors im selben Schreibvorgang.
