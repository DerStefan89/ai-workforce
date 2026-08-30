function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[z])
}

function statusZelle(cp) {
  if (cp.gueltig) return '<span class="badge ok">gültig</span>'
  const gruende = (cp.gruende ?? []).join('; ')
  return `<span class="badge fehler" title="${escapeHtml(gruende)}">ungültig</span><div class="grund">${escapeHtml(gruende)}</div>`
}

function staleZelle(cp) {
  if (!cp.stale) return ''
  if (cp.stale.stale) {
    return `<span class="badge stale" title="${escapeHtml(cp.stale.geaenderteEingaben.join('; '))}">STALE</span>`
  }
  return '<span class="badge aktuell">aktuell</span>'
}

function checkpointZeile(cp) {
  const lin = cp.lineage ?? {}
  const wm = cp.wirkungsmarke ?? {}
  const aufgabe = lin.beschreibung ?? ''
  const status = lin.transportStatus ?? wm.art ?? ''
  const executor = lin.executor ?? ''
  const ergebnis = wm.ergebnis ?? ''
  return `<tr>
    <td>${cp.sequenz}</td>
    <td>${escapeHtml(cp.zeitstempel)}</td>
    <td>${statusZelle(cp)}</td>
    <td>${escapeHtml(cp.typ)}</td>
    <td>${escapeHtml(lin.art ?? '')}</td>
    <td>${escapeHtml(lin.erzeugungsart ?? '')}</td>
    <td>${escapeHtml(lin.artefaktId ?? '')}</td>
    <td>${escapeHtml(lin.entscheidung ?? '')}</td>
    <td>${lin.beziehtSichAuf ? escapeHtml(`sequenz ${lin.beziehtSichAuf.sequenz}`) : ''}</td>
    <td>${staleZelle(cp)}</td>
    <td>${escapeHtml(aufgabe)}</td>
    <td>${escapeHtml(status)}</td>
    <td>${escapeHtml(executor)}</td>
    <td>${escapeHtml(ergebnis)}</td>
  </tr>`
}

function laufAbschnitt(lauf) {
  const tabelle = lauf.checkpoints.length === 0
    ? '<p class="leer">Keine Checkpoints</p>'
    : `<table>
        <thead><tr>
          <th>sequenz</th><th>zeitstempel</th><th>kette</th><th>typ</th>
          <th>art</th><th>erzeugungsart</th><th>artefakt_id</th>
          <th>entscheidung</th><th>bezieht_sich_auf</th><th>staleness</th>
          <th>Aufgabe</th><th>Status</th><th>Executor</th><th>Ergebnis</th>
        </tr></thead>
        <tbody>${lauf.checkpoints.map(checkpointZeile).join('')}</tbody>
      </table>`

  return `<section class="lauf">
    <h2>${escapeHtml(lauf.laufId)}</h2>
    ${tabelle}
  </section>`
}

async function laden() {
  const container = document.getElementById('laeufe')
  const laeufe = await fetch('/api/laeufe').then((r) => r.json())
  container.innerHTML = laeufe.length === 0
    ? '<p class="leer">Keine Läufe unter kontrollzustand/ gefunden.</p>'
    : laeufe.map(laufAbschnitt).join('')
}

laden()
