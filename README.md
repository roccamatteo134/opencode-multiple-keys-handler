# opencode-usage-paseo

Plugin [Paseo](https://paseo.sh) che mostra i consumi del tuo workspace
[opencode.ai](https://opencode.ai) (Rolling / Weekly / Monthly Usage) direttamente
nell'app, aggiornandosi ogni 10 minuti.

Funziona leggendo la pagina `https://opencode.ai/workspace/{id}/go` come la vedi tu
nel browser: non esiste un'API pubblica, quindi serve il cookie di sessione `auth`.

> **Attenzione**: i plugin Paseo sono codice trusted ed eseguono *senza sandbox*
> sulla macchina del daemon (accesso a file, processi, rete). Installa solo plugin
> di cui ti fidi e verifica il sorgente.

---

## Requisiti (sulla macchina dove gira il daemon Paseo)

1. **Paseo recente** (l'app desktop aggiornata — la versione attuale supporta i plugin):
   verificabile in `~/.paseo/config.json` con `"pluginsEnabled": true`. Se manca:
   **Settings → Plugins → Enable plugins** (o imposta il campo e poi `paseo reload --json`).
2. **CLI Paseo con il comando `plugin`** — la versione stabile su npm non ce l'ha ancora:

   ```bash
   node --version            # 18+ consigliato
   npm install -g @getpaseo/cli@0.5.0-beta.4
   paseo --version           # → 0.5.0-beta.4
   paseo plugin --help       # deve elencare init/ls/install/reload/…
   ```

3. Il **cookie `auth`** del tuo account opencode.ai: apri la pagina workspace nel
   browser, poi DevTools → **Application → Cookies → opencode.ai → auth**, copia il
   valore (inizia con `Fe26.2**...`).

---

## Installazione

```bash
cd opencode-usage-paseo
npm install
npm run typecheck          # opzionale ma consigliato
npm run install            # = paseo plugin install <percorso assoluto della repo>
paseo plugin ls            # → STATUS running
```

In VSCode (aprendo questa cartella): **Terminal → Run Task…** →
`npm: install (paseo daemon)` (o `typecheck`, `reload`, `logs`, `remove`).

> Se il daemon gira su un'altra macchina, installa da lì (o con `--host <url>` sui
> comandi `paseo plugin …`).

## Configurazione

1. Nell'app Paseo apri la voce **OpenCode Usage** nella barra laterale (icona gauge).
2. Premi **Configura** e compila:
   - `workspaceId`: l'ID che vedi nell'URL della pagina workspace;
   - `pageUrl` (opzionale): URL completo, sovrascrive il template con `workspaceId`;
   - `cookie auth`: il valore `Fe26.2**...` copiato da DevTools.
3. **Salva**: il pannello mostra le tre barre con percentuali e tempi di reset.

Dati e cookie restano sul daemon in `~/.paseo/opencode-usage.json` (chmod 600) e
non vengono mai esposti al client.

## "Barra" compatta

Le API plugin di Paseo non espongono ancora una status bar vera e propria (verificato
sul sorgente ufficiale: il contract supporta solo sidebar/surface, pannelli workspace,
command-center, temi e attachment). Il pannello compatto è il sostituto: in un
workspace premi **Ctrl+K** → **OpenCode Usage bar**, poi durante il drag-and-drop
aggancia la scheda in un split in basso: resta visibile sempre con la riga
`M 43% · W 65% · R 5%` + orario di aggiornamento.

## Sviluppo

```bash
npm run typecheck          # tsc --noEmit
npm run reload             # ricompila e ricarica il plugin nel daemon
npm run logs               # output del plugin (Settings → Plugins → Logs)
npm run remove             # rimuove la config dal daemon (non tocca i sorgenti)
```

## Struttura

| File                        | Contenuto                                            |
| --------------------------- | ---------------------------------------------------- |
| `index.ts`                  | Registrazione contributi (surface, pannello, comandi, RPC) |
| `usage.shared.ts`           | Contratti RPC zod + tipi                              |
| `usage.server.ts`           | Backend: config file, fetch pagina, parse HTML        |
| `usage.client.tsx`          | Surface con barre di progresso + form configurazione   |
| `usage-bar-panel.client.tsx`| Pannello compatto a una riga (per split in basso)      |
| `paseo-plugin.d.ts`         | Tipi `@getpaseo/plugin`/`server` generati dal CLI      |

## Limitazioni

- Il cookie `auth` è una sessione cifrata server-side (Iron): **non è rigenerabile
  dal plugin**. Quando scade, il pannello mostra l'errore e va ri-incollato da DevTools.
- I valori si aggiornano al massimo ogni 10 minuti (il poll non è in time-realtime).

## Riferimenti

- Docs plugin Paseo: <https://paseo.sh/docs/plugins> e <https://paseo.sh/docs/plugins/reference>
- Estensione VSCode con la stessa logica (repo sorella): `vscode-opencode-usage`