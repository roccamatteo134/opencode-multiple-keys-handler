# OpenCode Multiple Keys Handler

[Paseo](https://paseo.sh) plugin to manage multiple
[opencode.ai](https://opencode.ai) API keys and switch the active one in one
tap — from the sidebar, the command center, or the CLI.

No usage tracking: only key configuration and switching of the active key in
`~/.local/share/opencode/auth.json` (the `opencode-go` entry).

> **Note:** Paseo plugins are trusted code and run *without sandbox* on the
> daemon machine (file, process and network access). Install only plugins you
> trust and review the source.

## Requirements

1. **Paseo** with plugins enabled: `~/.paseo/config.json` →
   `"pluginsEnabled": true` (or **Settings → Plugins → Enable plugins**).
2. **Paseo CLI with the `plugin` command**:

   ```bash
   npm install -g @getpaseo/cli@0.5.0-beta.4
   paseo plugin --help
   ```

3. One or more **opencode.ai API keys** (`sk-...`) from opencode.ai → **API Keys**.

## Install

```bash
npm install
npm run typecheck
npm run install            # paseo plugin install <repo>
paseo plugin ls            # → STATUS running
```

In VSCode: **Terminal → Run Task…** → `npm: install (paseo daemon)`.

> If the daemon runs on another machine, install from there (or use
> `--host <url>`).

## Usage

1. Open **OpenCode Keys Handler** in the sidebar (key icon) or via **Ctrl+K**.
2. **+ Key** → name + API key → **Save**. Repeat for each key.
3. **Tap a key** to make it active: the plugin rewrites `opencode-go` in
   `~/.local/share/opencode/auth.json`. The active one is highlighted.
4. **Edit** changes the active key (the API key field can be left empty to
   keep the current value); **Delete** removes it from the list.

Restart opencode (or the Paseo daemon) after switching: the key is read at
startup. Switching also tries a hot-reload of running `opencode` sessions;
if some sessions fail to reload you'll get a warning telling you to restart.

## Security

- Keys are stored only on the daemon in `~/.paseo/opencode-usage.json`
  (`chmod 600`) and are never sent to the client (the UI only sees
  names + masked status).
- Corrupt `auth.json` is never wiped: the plugin backs it up
  (`auth.json.corrupt-<ts>.bak`) and aborts instead.
- The CLI masks keys (`sk-ab12...9f8e`).

## Switch from the CLI

`scripts/switch-opencode-key.ps1` (installable in `~/.local/bin`) reads the
keys from the same config:

```powershell
switch-opencode-key           # go to the next key (toggle)
switch-opencode-key status    # show the active key and the list
switch-opencode-key to 1|2    # activate the key at index N
```

## Development

```bash
npm run typecheck
npm run reload             # rebuild and reload the plugin in the daemon
npm run logs
npm run remove             # removes the daemon config (sources untouched)
```

## Structure

| File | Content |
| ---- | ------- |
| `index.client.tsx` | UI contributions (surface, sidebar, command center) |
| `index.server.ts` | RPC handlers |
| `shared/keys.ts` | zod RPC contracts + types |
| `server/keys.ts` | Key persistence + `auth.json` writing |
| `client/keys.tsx` | Surface: key list, switch, form |

## References

- Paseo plugin docs: <https://paseo.sh/docs/plugins>
