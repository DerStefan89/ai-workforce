/**
 * Datei: public/leitstand/empfehlung-installation.js
 *
 * Zweck: F36 WS-5a (E-F36-6/9) — Ablauf „Freigeben & installieren“ am ZWINGEND-Start: Klick auf den
 * Knopf eines installierbaren MCP in „Passt, nicht im Lauf“ (empfehlung-anzeige.js) → POST
 * .../installation/vorbereiten → Bestätigungsblock mit paket, exakter version, integrity, Lizenz,
 * Kosten, Wirkung, werkzeuge und Zielordner → „Installieren“ → POST .../installation mit genau dieser
 * version + integrity → Ergebnis; nach Erfolg lädt die Ansicht die Empfehlung neu (der Eintrag steht
 * dann in „Wird genutzt“).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js (Bedienblock)
 * - public/leitstand/views/workboard.js (Workflow-Vorschlag)
 * - public/leitstand/empfehlung-installation.test.mjs
 *
 * Wichtig: Jeder Serverwert wird escaped (escapeHtml). Die version/integrity des Klicks „Installieren“
 * stammen aus den data-Attributen des angezeigten Bestätigungsblocks — installiert wird genau, was
 * angezeigt wurde.
 */

import { bereiteInstallationVor, installiereRessource } from './api.js'
import { setzeInstallationsAnzeige, setzeInstallationsMeldung } from './empfehlung-anzeige.js'
import { escapeHtml } from './render.js'

/**
 * Bestätigungsblock vor dem Klick „Installieren“.
 * @param daten - Antwort von POST .../installation/vorbereiten
 * @returns HTML
 */
export function renderInstallationsBestaetigung(daten) {
  const zeile = (titel, wert) => `<li><strong>${escapeHtml(titel)}:</strong> ${wert}</li>`
  const text = (wert) => (wert === null || wert === undefined || wert === '' ? '<span class="hinweis">nicht angegeben</span>' : escapeHtml(wert))
  const lizenz = daten.lizenzRegistry !== null && daten.lizenzRegistry !== undefined ? `${text(daten.lizenz)} (Registry: ${escapeHtml(daten.lizenzRegistry)})` : text(daten.lizenz)
  const werkzeuge = (daten.werkzeuge ?? []).map((w) => `<code>${escapeHtml(w)}</code>`).join(', ')
  return `<div class="empfehlung-installation-bestaetigung">
    <p><strong>${escapeHtml(daten.name)}</strong> installieren und freigeben?</p>
    <ul>
      ${zeile('Paket', `<code>npm:${escapeHtml(daten.paket)}</code>`)}
      ${zeile('Version', `<code>${escapeHtml(daten.version)}</code>`)}
      ${zeile('integrity', `<code>${escapeHtml(daten.integrity)}</code>`)}
      ${zeile('Lizenz', lizenz)}
      ${zeile('Kosten', text(daten.kosten))}
      ${zeile('Wirkung', text(daten.wirkung))}
      ${zeile('Werkzeuge', werkzeuge || '<span class="hinweis">keine</span>')}
      ${zeile('Zielordner', `<code>${escapeHtml(daten.zielordner)}</code>`)}
      ${zeile('Informationsadresse', text(daten.herkunftUrl))}
    </ul>
    <p class="hinweis">Installiert ohne Install-Skripte (--ignore-scripts); danach Prüfung von Version, integrity und Serverstart. Erst dann wird der Eintrag in ressourcen.json freigegeben.</p>
    <button type="button" class="btn btn-primary" data-installation-aktion="installieren" data-ressource-id="${escapeHtml(daten.id)}" data-version="${escapeHtml(daten.version)}" data-integrity="${escapeHtml(daten.integrity)}" data-eintrag-hash="${escapeHtml(daten.eintragHash)}">Installieren</button>
    <button type="button" class="btn" data-installation-aktion="abbrechen" data-ressource-id="${escapeHtml(daten.id)}">Abbrechen</button>
  </div>`
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
        zeige('<p class="hinweis">Version wird aus der Registry aufgelöst …</p>')
        const antwort = await bereiteInstallationVor(id)
        zeige(antwort.ok ? renderInstallationsBestaetigung(await antwort.json()) : renderInstallationsErgebnis(false, `Nicht installierbar: ${await grundAus(antwort)}`))
      } else if (aktion === 'installieren') {
        zeige('<p class="hinweis">Installation läuft — Paket laden, Version/integrity und Serverstart prüfen …</p>')
        const antwort = await installiereRessource(id, { version: knopf.dataset.version, integrity: knopf.dataset.integrity, eintragHash: knopf.dataset.eintragHash })
        if (antwort.ok) {
          const daten = await antwort.json()
          // Der Eintrag wandert nach „Wird genutzt“ — die Meldung steht deshalb oben im Block, nicht am Eintrag.
          zeige('')
          setzeInstallationsMeldung(
            daten.id,
            renderInstallationsErgebnis(
              true,
              `Installiert und freigegeben: ${daten.id} — ${daten.paket}@${daten.version} (${daten.werkzeugeGefunden.length} Werkzeuge vom Server gemeldet). ressourcen.json ist geändert: erst committen — arbeitet die Workforce an sich selbst, sperrt der geänderte Arbeitsbaum bis dahin jeden schreibenden Lauf.`
            )
          )
          // Ein Fehler beim Neuladen ist kein Installationsfehler — installiert und freigegeben ist schon.
          try {
            await neuLaden()
          } catch (fehler) {
            console.error('[empfehlung-installation] Neuladen nach Installation fehlgeschlagen:', fehler)
          }
        } else {
          zeige(renderInstallationsErgebnis(false, `Installation abgelehnt, nichts freigegeben: ${await grundAus(antwort)}`))
        }
      }
    } catch (fehler) {
      console.error('[empfehlung-installation] Ablauf fehlgeschlagen:', fehler)
      zeige(renderInstallationsErgebnis(false, `Anfrage fehlgeschlagen: ${fehler.message}`))
    } finally {
      ablaufLaeuft = false
      knopf.disabled = false
    }
  })
}
