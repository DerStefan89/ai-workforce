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
 * - public/leitstand/empfehlung-installation.test.mjs
 *
 * F44 WS-4a (F5): Texte über i18n (Schlüssel installation.*; Server- und Katalogwerte bleiben roh),
 * Knöpfe im Stil .button der Vorlage.
 *
 * Wichtig: Jeder Serverwert wird escaped (escapeHtml). Die version/integrity des Klicks „Installieren“
 * stammen aus den data-Attributen des angezeigten Bestätigungsblocks — installiert wird genau, was
 * angezeigt wurde.
 */

import { bereiteInstallationVor, installiereRessource } from './api.js'
import { setzeInstallationsAnzeige, setzeInstallationsMeldung } from './empfehlung-anzeige.js'
import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/**
 * Bestätigungsblock vor dem Klick „Installieren“.
 * @param daten - Antwort von POST .../installation/vorbereiten
 * @returns HTML
 */
export function renderInstallationsBestaetigung(daten) {
  const zeile = (titelSchluessel, wert) => `<li><strong>${escapeHtml(t(titelSchluessel))}:</strong> ${wert}</li>`
  const text = (wert) => (wert === null || wert === undefined || wert === '' ? `<span class="hinweis">${escapeHtml(t('installation.nichtAngegeben'))}</span>` : escapeHtml(wert))
  if (daten.art === 'skill') return renderSkillBestaetigung(daten, zeile, text)
  const lizenz = daten.lizenzRegistry !== null && daten.lizenzRegistry !== undefined ? `${text(daten.lizenz)} ${escapeHtml(t('installation.registry', { lizenz: daten.lizenzRegistry }))}` : text(daten.lizenz)
  const werkzeuge = (daten.werkzeuge ?? []).map((w) => `<code>${escapeHtml(w)}</code>`).join(', ')
  return `<div class="empfehlung-installation-bestaetigung">
    <p>${tHtml('installation.frage', {}, { name: `<strong>${escapeHtml(daten.name)}</strong>` })}</p>
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
    <button type="button" class="button primary" data-installation-aktion="installieren" data-ressource-id="${escapeHtml(daten.id)}" data-version="${escapeHtml(daten.version)}" data-integrity="${escapeHtml(daten.integrity)}" data-eintrag-hash="${escapeHtml(daten.eintragHash)}">${escapeHtml(t('installation.installieren'))}</button>
    <button type="button" class="button" data-installation-aktion="abbrechen" data-ressource-id="${escapeHtml(daten.id)}">${escapeHtml(t('installation.abbrechen'))}</button>
  </div>`
}

/**
 * F36 WS-5b: Bestätigungsblock für einen externen Skill (Anzeige vor dem Klick, Auftrag Punkt 2).
 * @param daten - Antwort von POST .../installation/vorbereiten mit art 'skill'
 * @param zeile - (titel, htmlWert) => <li>
 * @param text - Wert escaped oder „nicht angegeben“
 * @returns HTML
 */
function renderSkillBestaetigung(daten, zeile, text) {
  const code = (wert) => `<code>${escapeHtml(wert)}</code>`
  return `<div class="empfehlung-installation-bestaetigung">
    <p>${tHtml('installation.frage', {}, { name: `<strong>${escapeHtml(daten.name)}</strong>` })}</p>
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
    <button type="button" class="button primary" data-installation-aktion="installieren" data-ressource-id="${escapeHtml(daten.id)}" data-version="${escapeHtml(daten.version)}" data-integrity="" data-eintrag-hash="${escapeHtml(daten.eintragHash)}">${escapeHtml(t('installation.installieren'))}</button>
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
 */
export function bindeEmpfehlungInstallation(wurzel, neuLaden) {
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
        zeige(antwort.ok ? renderInstallationsBestaetigung(await antwort.json()) : renderInstallationsErgebnis(false, t('installation.nichtInstallierbar', { grund: await grundAus(antwort) })))
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
