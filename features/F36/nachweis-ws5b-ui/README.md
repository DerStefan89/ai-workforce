# F36 WS-5b — Render-Nachweis „Freigeben & installieren“ für Skills (29.09.2026)

Erzeugt mit `node features/F36/nachweis-ws5b-ui/erzeuge-nachweis.mjs`. Das Skript nutzt
`scripts/render-nachweis.mjs` (Playwright, echter Browser) gegen einen Fixture-Leitstand auf
Port 4178. Der Fixture-Katalog enthält `frontend-design` mit `installation_vorlage` und
`browser-use` ohne Vorlage. Der git-Runner ist gestubbt (kein Netz). ls-remote liefert die reale
SHA aus dem Installationsnachweis. Jede Klickfolge bekommt einen frischen Leitstand. Klicktabellen
stehen in `protokoll.md` der Unterordner.

| Ordner | Breite | Belegt |
|---|---|---|
| `erfolg/` | 1100 px | Bild 01: Knopf nur bei `frontend-design`; `browser-use` steht in „Passt, nicht im Lauf“ mit dem Grund „nicht installierbar: installation_vorlage (skill_pfad) fehlt“ und hat keinen Knopf. Bild 02: Bestätigungsblock mit Repo, Ref, Commit (SHA), skill_pfad, Pfad im Repo, Lizenz, Kosten, Zielordner, Informationsadresse und dem Skript-Hinweis. Bild 03: nach „Installieren“ die Erfolgsmeldung (Skill-Name, SHA, 2 Dateien, Commit-Hinweis); `frontend-design` steht jetzt in „Wird genutzt“. |
| `bestaetigung-400/` | 400 px | Bestätigungsblock: SHA, Pfade und URL brechen um, nichts läuft über den Rand. |
| `fehler/` | 1100 px | Quelle ohne SKILL.md: „Installation abgelehnt, nichts freigegeben: SKILL.md fehlt im Skill-Ordner — kein Skill, abgelehnt“. Keine Erfolgsmeldung. |

Grenze: Belegt ist die Workflow-Bedienung. Das Workboard nutzt denselben Baustein
(`public/leitstand/empfehlung-installation.js`); einen eigenen Klickweg-Nachweis dort gibt es
nicht (wie WS-5a).
