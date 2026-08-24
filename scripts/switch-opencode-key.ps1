<#
.SYNOPSIS
    Switch tra le API key opencode-go usando quelle configurate nell'estensione.

.DESCRIPTION
    Le key sono lette dalla config dell'estensione Paseo
    (~/.paseo/opencode-usage.json, campo apiKey degli account). Lo script riscrive
    la voce "opencode-go" in ~/.local/share/opencode/auth.json (il file che legge
    opencode e, tramite il suo runtime, anche il daemon Paseo).

.EXAMPLE
    switch-opencode-key                # passa all'altra key (toggle)
    switch-opencode-key status         # mostra quale key e' attiva
    switch-opencode-key to 1|2         # attiva la key dell'account 1 o 2
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Command = "toggle",
  [Parameter(Position = 1)][string]$Arg1 = ""
)

$ErrorActionPreference = "Stop"

$AuthPath = Join-Path $env:USERPROFILE ".local\share\opencode\auth.json"
$ConfigPath = Join-Path $env:USERPROFILE ".paseo\opencode-usage.json"

function Read-JsonFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try { return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json } catch { return $null }
}

function Write-JsonFile {
  param([string]$Path, [object]$Value)
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $json = $Value | ConvertTo-Json -Depth 10
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
}

function Mask-Key {
  param([string]$Key)
  if ([string]::IsNullOrEmpty($Key)) { return "(nessuna)" }
  if ($Key.Length -le 10) { return "***" }
  return $Key.Substring(0, 6) + "..." + $Key.Substring($Key.Length - 4)
}

function Get-ActiveKey {
  $auth = Read-JsonFile -Path $AuthPath
  if ($null -ne $auth -and $null -ne $auth.'opencode-go') {
    return [string]$auth.'opencode-go'.key
  }
  return ""
}

function Set-ActiveKey {
  param([string]$Key)
  $auth = Read-JsonFile -Path $AuthPath
  if ($null -eq $auth) { $auth = [pscustomobject]@{} }
  if ($null -eq $auth.'opencode-go') {
    $auth | Add-Member -NotePropertyName 'opencode-go' -NotePropertyValue ([pscustomobject]@{ type = "api"; key = $Key }) -Force
  } else {
    $auth.'opencode-go'.key = $Key
    if ([string]::IsNullOrEmpty([string]$auth.'opencode-go'.type)) {
      $auth.'opencode-go' | Add-Member -NotePropertyName 'type' -NotePropertyValue "api" -Force
    }
  }
  Write-JsonFile -Path $AuthPath -Value $auth
}

function Get-KeyedAccounts {
  $config = Read-JsonFile -Path $ConfigPath
  if ($null -eq $config -or $null -eq $config.accounts) { return @() }
  $result = @()
  foreach ($a in $config.accounts) {
    if (-not [string]::IsNullOrEmpty([string]$a.apiKey)) {
      $result += [pscustomobject]@{ id = [string]$a.id; name = [string]$a.name; apiKey = [string]$a.apiKey }
    }
  }
  return $result
}

function Show-Status {
  $active = Get-ActiveKey
  $keyed = Get-KeyedAccounts
  Write-Host ("Key attiva in auth.json (opencode-go): {0}" -f (Mask-Key $active))
  if ($keyed.Count -eq 0) {
    Write-Host "Nessuna API key configurata negli account dell'estensione."
    Write-Host "Configura almeno un account con API key dal pannello OpenCode Usage."
    return
  }
  for ($i = 0; $i -lt $keyed.Count; $i++) {
    $k = $keyed[$i]
    $state = if ($active -and $k.apiKey -eq $active) { "attiva" } else { "inattiva" }
    Write-Host ("  [{0}] {1} ({2}) - {3}" -f ($i + 1), $k.name, (Mask-Key $k.apiKey), $state)
  }
}

function Toggle {
  $keyed = Get-KeyedAccounts
  if ($keyed.Count -lt 2) {
    Write-Host ("Servono almeno 2 account con API key (trovati {0})." -f $keyed.Count)
    exit 1
  }
  $active = Get-ActiveKey
  $idx = -1
  for ($i = 0; $i -lt $keyed.Count; $i++) {
    if ($active -and $keyed[$i].apiKey -eq $active) { $idx = $i; break }
  }
  $next = if ($idx -lt 0) { 0 } else { ($idx + 1) % $keyed.Count }
  Set-ActiveKey -Key $keyed[$next].apiKey
  Write-Host ("-> {0} ({1})" -f $keyed[$next].name, (Mask-Key $keyed[$next].apiKey))
  Write-Host "Riavvia opencode (e il daemon Paseo) se gia' in esecuzione."
}

function Show-Help {
  Write-Host @"
Switch API key opencode-go (key dalla config dell'estensione)

USO:
  switch-opencode-key                passa all'altra key (toggle)
  switch-opencode-key status         mostra quale key e' attiva
  switch-opencode-key to 1|2         attiva la key dell'account N

Le key sono quelle degli account configurati nell'estensione
(~/.paseo/opencode-usage.json); auth.json (opencode-go) viene riscritto.
Le sessioni gia' aperte non rileggono la key: riavvia opencode o il daemon Paseo.
"@
}

switch ($Command.ToLower()) {
  "help" { Show-Help }
  "status" { Show-Status }
  "ls" { Show-Status }
  "to" {
    if ($Arg1 -notmatch "^[0-9]+$") { Write-Host "Uso: switch-opencode-key to N (indice account, vedi status)"; exit 1 }
    $keyed = Get-KeyedAccounts
    $n = [int]$Arg1
    if ($n -lt 1 -or $n -gt $keyed.Count) {
      Write-Host ("Indice fuori range: 1..{0}" -f $keyed.Count)
      exit 1
    }
    Set-ActiveKey -Key $keyed[$n - 1].apiKey
    Write-Host ("-> {0} ({1})" -f $keyed[$n - 1].name, (Mask-Key $keyed[$n - 1].apiKey))
    Write-Host "Riavvia opencode (e il daemon Paseo) se gia' in esecuzione."
  }
  default { Toggle }
}
