<#
.SYNOPSIS
  Learniee diagnostic runner: build + API wiring audit, saved to diagnostics/<timestamp>/.

.DESCRIPTION
  Run from the project root (or anywhere; the script moves to the project root itself):
    powershell -ExecutionPolicy Bypass -File .\scripts\diagnose\run.ps1
    powershell -ExecutionPolicy Bypass -File .\scripts\diagnose\run.ps1 -SkipBuild

  Safety: the build ALWAYS runs with a dummy DATABASE_URL so it can never touch a real
  database, even if .env.local points at one. Secret values are never printed.
#>
param(
  [switch]$SkipBuild  # audit only (build status is recorded as SKIPPED)
)

$ErrorActionPreference = 'Stop'

# --- Project root = two levels above this script (scripts\diagnose\run.ps1)
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root
if (-not (Test-Path (Join-Path $root 'package.json'))) {
  throw "package.json not found in $root. Run this from the Learniee project."
}

# --- 1. Timestamped folder
$stamp  = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$folder = Join-Path $root "diagnostics\$stamp"
New-Item -ItemType Directory -Path $folder -Force | Out-Null

# --- 6. Make sure diagnostics/ is git-ignored
$gitignore = Join-Path $root '.gitignore'
$needsEntry = $true
if (Test-Path $gitignore) {
  $needsEntry = -not (Select-String -Path $gitignore -Pattern '^\s*/?diagnostics/?\s*$' -Quiet)
}
if ($needsEntry) {
  $existing = if (Test-Path $gitignore) { [IO.File]::ReadAllText($gitignore) } else { '' }
  $prefix = if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { "`r`n" } else { '' }
  [IO.File]::AppendAllText($gitignore, "$prefix`r`n# diagnostics output (scripts/diagnose)`r`ndiagnostics/`r`n")
  Write-Host 'Added diagnostics/ to .gitignore'
}

# --- 2 + 5. Build
$buildTxt  = Join-Path $folder 'build.txt'
$buildJson = Join-Path $folder 'build.json'
$exitCode  = $null
$duration  = 0
$usedEnvTest = $false

if ($SkipBuild) {
  Write-Host 'Build skipped (-SkipBuild).'
  [IO.File]::WriteAllText($buildJson, '{"skipped":true,"exitCode":null,"durationSec":0,"usedEnvTest":false}')
}
else {
  # Remember every env var we touch so the shell is restored afterwards.
  $saved = @{}
  function Set-TempEnv([string]$Name, [string]$Value) {
    if (-not $saved.ContainsKey($Name)) { $saved[$Name] = [Environment]::GetEnvironmentVariable($Name, 'Process') }
    [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
  }

  # No colors, no telemetry noise.
  Set-TempEnv 'NO_COLOR' '1'
  Set-TempEnv 'FORCE_COLOR' '0'
  Set-TempEnv 'NEXT_TELEMETRY_DISABLED' '1'

  # Optional test env vars from .env.test (values are never printed).
  $envTest = Join-Path $root '.env.test'
  $blocked = @('DATABASE_URL', 'DIRECT_URL', 'SHADOW_DATABASE_URL')
  if (Test-Path $envTest) {
    $loaded = 0
    foreach ($line in Get-Content $envTest) {
      if ($line -match '^\s*#' -or $line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') { continue }
      $name = $Matches[1]
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      if ($blocked -contains $name) { continue }  # the database is always the dummy below
      Set-TempEnv $name $value
      $loaded++
    }
    $usedEnvTest = $true
    Write-Warning "Build uses $loaded variable(s) from .env.test. These are TEST values, so build results may differ from production."
  }
  else {
    Write-Host 'No .env.test found; building with the dummy database settings only.'
  }
  if (Test-Path (Join-Path $root '.env.local')) {
    Write-Warning '.env.local exists; Next.js will still load its other variables during the build (never DATABASE_URL, which is forced below).'
  }

  # The build must never reach a database. Process env wins over .env files, so this
  # overrides any real DATABASE_URL (same dummy values as the Dockerfile builder stage).
  Set-TempEnv 'DATABASE_URL' 'postgresql://x:x@127.0.0.1:1/x'
  Set-TempEnv 'DATABASE_SSL' 'false'

  Write-Host 'Running npm run build (output goes to build.txt) ...'
  $sw = [Diagnostics.Stopwatch]::StartNew()
  # cmd keeps stdout/stderr interleaved in the right order.
  & cmd.exe /c "npm run build > `"$buildTxt`" 2>&1"
  $exitCode = $LASTEXITCODE
  $sw.Stop()
  $duration = [math]::Round($sw.Elapsed.TotalSeconds, 1)

  # Strip any ANSI color codes that slipped through; write UTF-8 without BOM.
  if (Test-Path $buildTxt) {
    $raw = [IO.File]::ReadAllText($buildTxt)
    $clean = [regex]::Replace($raw, "\x1B\[[0-9;?]*[ -/]*[@-~]", '')
    [IO.File]::WriteAllText($buildTxt, $clean, (New-Object Text.UTF8Encoding($false)))
  }

  $json = '{{"skipped":false,"exitCode":{0},"durationSec":{1},"usedEnvTest":{2}}}' -f $exitCode, `
    ([string]$duration).Replace(',', '.'), $usedEnvTest.ToString().ToLower()
  [IO.File]::WriteAllText($buildJson, $json)
  Write-Host "Build finished: exit code $exitCode in ${duration}s"

  # Restore the shell's original environment (removes the dummy DB and test values).
  foreach ($k in $saved.Keys) { [Environment]::SetEnvironmentVariable($k, $saved[$k], 'Process') }
}

# --- 3. Audit
& node (Join-Path $root 'scripts\diagnose\audit.mjs') --out $folder
if ($LASTEXITCODE -ne 0) {
  Write-Error "audit.mjs failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

# --- 4. Print only SUMMARY.txt
Write-Host ''
Get-Content (Join-Path $folder 'SUMMARY.txt')
Write-Host ''
Write-Host "Saved to: diagnostics\$stamp"
