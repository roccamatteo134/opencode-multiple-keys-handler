# OpenCode Keys Handler

Plugin [Paseo](https://paseo.sh) per gestire più **API key** di
[opencode.ai](https://opencode.ai) e passare dall'una all'altra con un tocco.

Nessun monitoraggio dei consumi: solo configurazione delle key e switch della key
attiva in `~/.local/share/opencode/auth.json` (la voce `opencode-go`).

> **Attenzione**: i plugin Paseo sono codice trusted ed eseguono *senza sandbox*
> sulla macchina del daemon (accesso a file, processi, rete). Installa solo plugin
> di cui ti fidi e verifica il sorgente.

---

## Requisiti

1. **Paseo** con i plugin abilitati: `~/.paseo/config.json` → `"pluginsEnabled": true`
   (oppure **Settings → Plugins → Enable plugins**).
2. **CLI Paseo con il comando `plugin`**:

   ```bash
   npm install -g @getpaseo/cli@0.5.0-beta.4
   paseo plugin --help
   ```

3. Una o più **API key** opencode.ai (`sk-...`), da opencode.ai → **API Keys**.

## Installazione

```bash
npm install
npm run typecheck
npm run install            # paseo plugin install <repo>
paseo plugin ls            # → STATUS running
```

In VSCode: **Terminal → Run Task…** → `npm: install (paseo daemon)`.

> Se il daemon gira su un'altra macchina, installa da lì (o usa `--host <url>`).

## Uso

1. Apri **OpenCode Keys Handler** nella barra laterale (icona chiave) o da **Ctrl+K**.
2. **+ Key** → nome + API key → **Salva**. Ripeti per ogni chiave.
3. **Tocca una key** per renderla attiva: il plugin riscrive `opencode-go` in
   `~/.local/share/opencode/auth.json`. Quella già attiva è evidenziata.
4. **Configura** modifica la key attiva (la API key si può lasciare vuota per non
   cambiarla); **Elimina** la rimuove dalla lista.

Riavvia opencode (o il daemon Paseo) dopo lo switch: la key viene riletta all'avvio.

Le key restano sul daemon in `~/.paseo/opencode-usage.json` (chmod 600) e non vengono
mai esposte al client. I campi legacy della vecchia versione (cookie/workspaceId) vengono
scartati al primo salvataggio.

## Switch da CLI

`scripts/switch-opencode-key.ps1` (installabile in `~/.local/bin`) legge le key dalla
stessa config:

```bash
switch-opencode-key                # passa alla key successiva (toggle)
switch-opencode-key status         # mostra la key attiva e la lista
switch-opencode-key to 1|2         # attiva la key all'indice N
```

## Sviluppo

```bash
npm run typecheck
npm run reload             # ricompila e ricarica il plugin nel daemon
npm run logs
npm run remove             # rimuove la config dal daemon (non tocca i sorgenti)
```

## Struttura

| File                 | Contenuto                                      |
| -------------------- | ---------------------------------------------- |
| `index.client.tsx`   | Contributi UI (surface, sidebar, command center) |
| `index.server.ts`    | Handler RPC                                    |
| `shared/keys.ts`     | Contratti RPC zod + tipi                       |
| `server/keys.ts`     | Persistenza key + scrittura di `auth.json`     |
| `client/keys.tsx`    | Surface: lista key, switch, form               |

## Riferimenti

- Docs plugin Paseo: <https://paseo.sh/docs/plugins>
- Estensione VSCode con la stessa logica (repo sorella): `vscode-opencode-usage`
