/**
 * Datei: public/leitstand/empfehlung-installation.js
 *
 * Zweck: F36 WS-5a (E-F36-6/9) — Ablauf „Freigeben & installieren“ am ZWINGEND-Start: Klick auf den
 * Knopf eines installierbaren MCP in „Passt, nicht im Lauf“ (empfehlung-anzeige.js) → POST
 * .../installation/vorbereiten → Bestätigungsblock mit paket, exakter version, integrity, Lizenz,
 * Kosten, Wirkung, werkzeuge und Zielordner → „Installieren“ → POST .../installation mit genau dieser
 * version + integrity → Ergebnis; nach Erfolg lädt die Ansicht die Empfehlung neu (der Eintrag steht
 * dann in „Wird genutzt“).
 * Seit F36 WS-5b auch für externe Skills: der Bestätigungsblock zeigt Repo, Ref, Commit-SHA,
 * skill_pfad, Lizenz, Kosten, Zielordner und den Skript-Hinweis; „Installieren“ schickt genau diese SHA
 * (als version) mit dem eintragHash zurück.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js (Freigabedialog, F44 WS-4a)
 * - public/leitstand/views/workboard.js (Workflow-Vorschlag)
 * - public/leitstand/views/capability-library.js („Prüfen & freigeben“ im Detail der Capability Library,
 *   F46 D6 — derselbe Ablauf mit Bestätigungsblock, unverändert)
 * - public/leitstand/empfehlung-installation.test.mjs
 *
 * F44 WS-4a (F5): Texte über i18n (Schlüssel installation.*; Server- und Katalogwerte bleiben roh),
 * Knöpfe im Stil .button der Vorlage.
 *
 * F45 F-2b-2a (F-1056): der Bestätigungsblock zeigt den Prüfbericht zur angezeigten Version (Urteil, Fakten, Befunde,
 * Auflagen, Ausnahme-Begründung); ohne passenden Bericht oder bei NICHT_GEEIGNET steht statt „Installieren“ der Grund
 * (pruefbericht_sperre) — der Server lehnt in diesem Fall ohnehin mit 409 ab.
 *
 * F45 F-2b-2c: mit der Option eignungPruefen (Capability Library) steht bei fehlendem Bericht im Sperrblock der Knopf „Eignung
 * prüfen“; den Ablauf führt views/capability-library.js (views/pruefung-ablauf.js).
 *
 * Wichtig: Jeder Serverwert wird escaped (escapeHtml). Die version/integrity des Klicks „Installieren“
 * stammen aus den data-Attributen des angezeigten Bestätigungsblocks — installiert wird genau, was
 * angezeigt wurde.
 */

import { bereiteInstallationVor, installiereRessource } from './api.js'
import { setzeInstallationsAnzeige, setzeInstallationsMeldung } from './empfehlung-anzeige.js'
import { t, tHtml } from './i18n.js'
import { renderBerichtFuerFreigabe } from './pruefung-anzeige.js'
import { escapeHtml } from './render.js'

/**
 * „Installieren“ bei pruefbericht_sperre deaktiviert sichtbar (ohne Aktion), der Grund steht im Sperrblock darüber (F45 F-2b-2a;
 * die npm-Sperre der F-1075-Rückfallebene ist seit F-2b-2b aufgehoben, der Knopf gilt für jede Sperre des Prüfberichts).
 * @returns HTML
 */
function gesperrterKnopf() {
  return `<button type="button" class="button primary" disabled aria-describedby="installation-sperre">${escapeHtml(t('installation.installieren'))}</button>`
}

/**
 * Bestätigungsblock vor dem Klick „Installieren“.
 * @param daten - Antwort von POST .../installation/vorbereiten
 * @param optionen - { eignungPruefen } (F45 F-2b-2c: Knopf „Eignung prüfen“ im Sperrblock, nur Capability Library)
 * @returns HTML
 */
export function renderInstallationsBestaetigung(daten, optionen = {}) {
  const zeile = (titelSchluessel, wert) => `<li><strong>${escapeHtml(t(titelSchluessel))}:</strong> ${wert}</li>`
  const text = (wert) => (wert === null || wert === undefined || wert === '' ? `<span class="hinweis">${escapeHtml(t('installation.nichtAngegeben'))}</span>` : escapeHtml(wert))
  // F45 F-2b-2a: Prüfbericht zur angezeigten Version bzw. Sperrgrund (ohne Bericht / veraltet / NICHT_GEEIGNET → kein Knopf).
  const bericht = renderBerichtFuerFreigabe(daten, optionen)
  if (daten.art === 'skill') return renderSkillBestaetigung(daten, zeile, text, bericht)
  const lizenz = daten.lizenzRegistry !== null && daten.lizenzRegistry !== undefined ? `${text(daten.lizenz)} ${escapeHtml(t('installation.registry', { lizenz: daten.lizenzRegistry }))}` : text(daten.lizenz)
  const werkzeuge = (daten.werkzeuge ?? []).map((w) => `<code>${escapeHtml(w)}</code>`).join(', ')
  return `<div class="empfehlung-installation-bestaetigung">
    <p>${tHtml('installation.frage', {}, { name: `<strong>${escapeHtml(daten.name)}</strong>` })}</p>
    ${bericht.html}
    <ul>
      ${zeile('installation.paket', `<code>npm:${escapeHtml(daten.paket)}</code>`)}
      ${zeile('installation.version', `<code>${escapeHtml(daten.version)}</code>`)}
      ${zeile('installation.integrity', `<code>${escapeHtml(daten.integrity)}</code>`)}
      ${zeile('installation.lizenz', lizenz)}
      ${zeile('installation.kosten', text(daten.kosten))}
      ${zeile('installation.wirkung', text(daten.wirkung))}
      ${zeile('installation.werkzeuge', werkzeuge || `<span class="hinweis">${escapeHtml(t('installation.keine'))}</span>`)}
      ${zeile('installation.zielordner', `<code>${escapeHtml(daten.zielordner)}</code>`)}
      ${zeile('installation.adresse', text(daten.herkunftUrl))}
    </ul>
    <p class="hinweis">${escapeHtml(t('installation.hinweisMcp'))}</p>
    ${bericht.gesperrt ? gesperrterKnopf() : `<button type="button" class="button primary" data-installation-aktion="installieren" data-ressource-id="${escapeHtml(daten.id)}" data-version="${escapeHtml(daten.version)}" data-integrity="${escapeHtml(daten.integrity)}" data-eintrag-hash="${escapeHtml(daten.eintragHash)}">${escapeHtml(t('installation.installieren'))}</button>`}
    <button type="button" class="button" data-installation-aktion="abbrechen" data-ressource-id="${escapeHtml(daten.id)}">${escapeHtml(t('installation.abbrechen'))}</button>
  </div>`
}

/**
 * F36 WS-5b: Bestätigungsblock für einen externen Skill (Anzeige vor dem Klick, Auftrag Punkt 2).
 * @param daten - Antwort von POST .../installation/vorbereiten mit art 'skill'
 * @param zeile - (titel, htmlWert) => <li>
 * @param text - Wert escaped oder „nicht angegeben“
 * @param bericht - { html, gesperrt } aus renderBerichtFuerFreigabe
 * @returns HTML
 */
function renderSkillBestaetigung(daten, zeile, text, bericht) {
  const code = (wert) => `<code>${escapeHtml(wert)}</code>`
  return `<div class="empfehlung-installation-bestaetigung">
    <p>${tHtml('installation.frage', {}, { name: `<strong>${escapeHtml(daten.name)}</strong>` })}</p>
    ${bericht.html}
    <ul>
      ${zeile('installation.repo', code(daten.repo))}
      ${zeile('installation.ref', code(daten.ref))}
      ${zeile('installation.commit', code(daten.version))}
      ${zeile('installation.skillPfad', code(daten.skillPfad))}
      ${zeile('installation.pfadImRepo', code(daten.quellPfad))}
      ${zeile('Lizenz', text(daten.lizenz))}
      ${zeile('installation.kosten', text(daten.kosten))}
      ${zeile('installation.zielordner', code(daten.zielordner))}
      ${zeile('installation.adresse', text(daten.herkunftUrl))}
    </ul>
    <p class="hinweis">${escapeHtml(daten.hinweis)} ${escapeHtml(t('installation.hinweisSkill'))}</p>
    ${bericht.gesperrt ? gesperrterKnopf() : `<button type="button" class="button primary" data-installation-aktion="installieren" data-ressource-id="${escapeHtml(daten.id)}" data-version="${escapeHtml(daten.version)}" data-integrity="" data-eintrag-hash="${escapeHtml(daten.eintragHash)}">${escapeHtml(t('installation.installieren'))}</button>`}
    <button type="button" class="button" data-installation-aktion="abbrechen" data-ressource-id="${escapeHtml(daten.id)}">${escapeHtml(t('installation.abbrechen'))}</button>
  </div>`
}

/**
 * F36 WS-5b: Erfolgszeile nach „Installieren“ — je Art (mcp: Paket/Werkzeuge, skill: Commit/Name).
 * @param daten - Antwort von POST .../installation
 * @returns Klartext
 */
export function installationsErfolgText(daten) {
  const was =
    daten.art === 'skill'
      ? t('installation.erfolg.skill', { name: String(daten.name), version: String(daten.version), anzahl: (daten.dateien ?? []).length })
      : t('installation.erfolg.mcp', { paket: String(daten.paket), version: String(daten.version), anzahl: (daten.werkzeugeGefunden ?? []).length })
  return t('installation.erfolg', { id: String(daten.id), was })
}

/**
 * Ergebniszeile nach „Installieren“ bzw. eine Fehlermeldung.
 * @param ok - Erfolg
 * @param text - Klartext
 * @returns HTML
 */
export function renderInstallationsErgebnis(ok, text) {
  return `<p class="${ok ? 'erfolg' : 'fehler'}">${escapeHtml(text)}</p>`
}

/** Liest den Grund aus einer Fehlerantwort (JSON { grund }), sonst den Status. */
async function grundAus(antwort) {
  const inhalt = await antwort.json().catch(() => ({}))
  return typeof inhalt.grund === 'string' ? inhalt.grund : `HTTP ${antwort.status}`
}

/** true, solange ein Vorbereiten/Installieren aus dieser Seite läuft — weitere Klicks werden ignoriert (auch nach Neu-Rendering). */
let ablaufLaeuft = false

/**
 * Bindet den Ablauf per Ereignis-Delegation an einen Container, der renderEmpfehlung-HTML enthält.
 * @param wurzel - DOM-Element (bleibt über Neu-Renderings bestehen)
 * @param neuLaden - () => void|Promise, lädt die Empfehlung nach erfolgreicher Installation neu
 * @param optionen - { eignungPruefen } an renderInstallationsBestaetigung (F45 F-2b-2c, nur die Capability Library)
 */
export function bindeEmpfehlungInstallation(wurzel, neuLaden, optionen = {}) {
  wurzel.addEventListener('click', async (ereignis) => {
    const knopf = ereignis.target instanceof Element ? ereignis.target.closest('[data-installation-aktion]') : null
    if (knopf === null || !wurzel.contains(knopf)) return
    const id = knopf.dataset.ressourceId
    const platz = [...wurzel.querySelectorAll('.empfehlung-installation')].find((el) => el.dataset.installationFuer === id)
    if (platz === undefined) return
    const aktion = knopf.dataset.installationAktion
    // DOM sofort und Zustand für das nächste Neu-Rendering (renderEmpfehlung) zugleich setzen.
    const zeige = (html) => {
      platz.innerHTML = html
      setzeInstallationsAnzeige(id, html)
    }
    if (aktion === 'abbrechen') {
      zeige('')
      return
    }
    // Ein zweiter Klick während eines laufenden Ablaufs würde vom Server mit 409 abgelehnt und eine
    // irreführende „abgelehnt“-Meldung neben der weiterlaufenden Installation zeigen.
    if (ablaufLaeuft) return
    ablaufLaeuft = true
    setzeInstallationsMeldung(null, '')
    knopf.disabled = true
    try {
      if (aktion === 'vorbereiten') {
        zeige(`<p class="hinweis">${escapeHtml(t('installation.loestAuf'))}</p>`)
        const antwort = await bereiteInstallationVor(id)
        zeige(antwort.ok ? renderInstallationsBestaetigung(await antwort.json(), optionen) : renderInstallationsErgebnis(false, t('installation.nichtInstallierbar', { grund: await grundAus(antwort) })))
      } else if (aktion === 'installieren') {
        zeige(`<p class="hinweis">${escapeHtml(t('installation.laeuft'))}</p>`)
        const antwort = await installiereRessource(id, { version: knopf.dataset.version, integrity: knopf.dataset.integrity, eintragHash: knopf.dataset.eintragHash })
        if (antwort.ok) {
          const daten = await antwort.json()
          // Der Eintrag wandert nach „Wird genutzt“ — die Meldung steht deshalb oben im Block, nicht am Eintrag.
          zeige('')
          setzeInstallationsMeldung(daten.id, renderInstallationsErgebnis(true, installationsErfolgText(daten)))
          // Ein Fehler beim Neuladen ist kein Installationsfehler — installiert und freigegeben ist schon.
          try {
            await neuLaden()
          } catch (fehler) {
            console.error('[empfehlung-installation] Neuladen nach Installation fehlgeschlagen:', fehler)
          }
        } else {
          zeige(renderInstallationsErgebnis(false, t('installation.abgelehnt', { grund: await grundAus(antwort) })))
        }
      }
    } catch (fehler) {
      console.error('[empfehlung-installation] Ablauf fehlgeschlagen:', fehler)
      zeige(renderInstallationsErgebnis(false, t('installation.anfrageFehlgeschlagen', { meldung: fehler.message })))
    } finally {
      ablaufLaeuft = false
      knopf.disabled = false
    }
  })
}
