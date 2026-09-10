# F-243 - Analyse (Schritt 1 des Nachweislaufs L1)

## Fundstelle

`scripts/leitstand-server.mjs`, Zeile 3402 — die `console.error`-Protokollzeile
im `if (laufAbgebrochen)`-Zweig des Stopp-Endpunkts.

## Heutiger Wortlaut

```
        console.error(`[leitstand] Workflow '${workflowId}' gestoppt — laufender Schritt '${laufenderSchritt.schritt_id}' (Lauf '${laufAktivLaufId}') abgebrochen.`)
```

## Vorgeschlagene neue Fassung

```
        console.error(`[leitstand] Workflow '${workflowId}' gestoppt — laufender Schritt '${laufenderSchritt?.schritt_id ?? '—'}' (Lauf '${laufAktivLaufId}') abgebrochen.`)
```

## Warum genau diese eine Zeile

Der Absturz ist heute unerreichbar, weil `laufAbgebrochen` (Zeile 3399) per
`&&` sowohl `laufAktiv` als auch `laufenderSchritt !== undefined` verlangt —
Zeile 3402 wird also nur betreten, wenn `laufenderSchritt` nachweislich
gefunden wurde, der Feldzugriff `laufenderSchritt.schritt_id` ist dadurch
garantiert sicher. Ein halber Rückbau der Bedingung (z. B. auf
`const laufAbgebrochen = laufAktiv`) entfernt genau diese Garantie, ohne dass
die Protokollzeile angepasst wird: `laufAbgebrochen` kann dann `true` sein,
während `laufenderSchritt` `undefined` bleibt, und `laufenderSchritt.schritt_id`
wirft eine `TypeError`. Da der Stopp-Handler asynchron läuft, wird diese
Exception nicht abgefangen und reißt den Serverprozess ab, statt nur eine
Fehlerantwort zu liefern. Die Invariante "wenn `laufAbgebrochen` true ist,
existiert `laufenderSchritt`" steht nirgends explizit, sondern ergibt sich
nur zufällig aus der heutigen Formulierung der Bedingung.

## Herkunft

Schritt 1 dieses Nachweislaufs: `lauf_id` `1c971e35-455c-4167-8b63-0a9a8181255c`.
