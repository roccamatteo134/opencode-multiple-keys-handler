# opencode-usage-paseo

Plugin [Paseo](https://paseo.sh) che mostra i consumi del tuo account
[opencode.ai](https://opencode.ai) **Go** (Rolling / Weekly / Monthly Usage) direttamente
nell'app, aggiornandosi ogni 10 minuti.

Usa l'**endpoint ufficiale** `https://opencode.ai/zen/go/v1/usage` autenticato con la tua
**API key** (`Authorization: Bearer sk-...`): niente più scraping della pagina.

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

3. L'**API key** del tuo account opencode.ai: apri opencode.ai, poi **API Keys** e genera
   una chiave (inizia con `sk-...`). Serve anche (opzionale) il **cookie `auth`** e il
   `workspaceId` se vuoi vedere anche il saldo Zen, che non ha un endpoint pubblico
   stabile e viene letto dalla dashboard workspace (DevTools → Application → Cookies →
   opencode.ai → auth, valore `Fe26.2**...`).

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
2. Premi **+ Account** e compila:
   - `Nome account`: un'etichetta per distinguerlo (es. "Personale", "Lavoro");
   - `API key Go`: la chiave `sk-...` da opencode.ai → API Keys (obbligatoria);
   - `workspaceId` (opzionale): l'ID che vedi nell'URL della pagina workspace — serve
     solo per il saldo Zen;
   - `cookie auth` (opzionale): il valore `Fe26.2**...` copiato da DevTools — serve
     solo per il saldo Zen.
3. **Salva**: puoi ripetere per ogni account che vuoi trackare. I chip in alto
   permettono di passare da un account all'altro (la selezione attiva è condivisa
   anche con la barra compatta).
4. Il pannello mostra le barre usage Go (endpoint ufficiale) dell'account attivo e,
   se configurati workspaceId + cookie, il **saldo Zen** con i tempi di reset.

Dati, cookie e API key restano sul daemon in `~/.paseo/opencode-usage.json` (chmod 600) e
non vengono mai esposti al client. Se il tuo config era in formato vecchio
(account singolo con cookie), viene migrato automaticamente in un account "Default".

## Switch rapido API key opencode

Le API key sono quelle configurate negli **account dell'estensione**
(`~/.paseo/opencode-usage.json`, campo `apiKey`): non serve salvarle altrove.

**Dalla UI**: nel pannello OpenCode Usage c'è un toggle a due stati
"Key opencode attiva" che mostra per ogni account con API key se è **attiva** o
**inattiva** (confronto con `~/.local/share/opencode/auth.json`). Un tocco su una
key la attiva (riscrive `auth.json`), e il tocco su quella già attiva la forza.

**Da CLI** (`scripts/switch-opencode-key.ps1`, installato in `~/.local/bin`):

```bash
switch-opencode-key                # passa all'altra key (toggle)
switch-opencode-key status         # mostra quale key è attiva
switch-opencode-key to 1|2         # attiva la key dell'account N
```

Lo script legge le key dalla config dell'estensione e riscrive la voce
`opencode-go` in `~/.local/share/opencode/auth.json` (il file che leggono sia
opencode sia il runtime del daemon Paseo). **Riavvia opencode (o il daemon Paseo)
dopo lo switch**: la key viene riletta all'avvio.

## "Barra" compatta

Le API plugin di Paseo non espongono ancora una status bar vera e propria (verificato
sul sorgente ufficiale: il contract supporta solo sidebar/surface, pannelli workspace,
command-center, temi e attachment). Il pannello compatto è il sostituto: in un
workspace premi **Ctrl+K** → **OpenCode Usage bar**, poi durante il drag-and-drop
aggancia la scheda in un split in basso: resta visibile sempre con la riga
`M 43% · W 65% · R 5% · Zen $12.40` (con più account viene anteposto il nome
dell'account attivo) + orario di aggiornamento.

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
| `index.client.tsx`          | Registrazione contributi UI (surface, pannello, comandi) |
| `index.server.ts`           | Registrazione handler RPC                            |
| `shared/usage.ts`           | Contratti RPC zod + tipi                              |
| `server/usage.ts`           | Backend: config multi-account, endpoint ufficiale `/zen/go/v1/usage`, saldo Zen |
| `client/usage.tsx`          | Surface con selettore account, barre di progresso, saldo Zen, form account |
| `client/usage-bar-panel.tsx`| Pannello compatto a una riga (per split in basso)      |

## Limitazioni

- L'usage Go arriva dall'endpoint ufficiale `https://opencode.ai/zen/go/v1/usage` con la
  tua API key: se la key è invalida o scaduta, il pannello mostra l'errore.
- Il saldo Zen non ha un endpoint pubblico stabile: viene estratto dalla dashboard
  workspace usando cookie + workspaceId (opzionali). Se il markup cambia, il saldo
  semplicemente non compare.
- I valori si aggiornano al massimo ogni 10 minuti (il poll non è in time-realtime).

## Riferimenti

- Docs plugin Paseo: <https://paseo.sh/docs/plugins> e <https://paseo.sh/docs/plugins/reference>
- Estensione VSCode con la stessa logica (repo sorella): `vscode-opencode-usage`