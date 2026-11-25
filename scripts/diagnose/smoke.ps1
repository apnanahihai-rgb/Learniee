<#
.SYNOPSIS
  Learniee browser smoke test runner (read-only). Results go to diagnostics\<timestamp>\.

.DESCRIPTION
  1. In ONE terminal start the app:   npm run dev
  2. In ANOTHER terminal (project root):
       powershell -ExecutionPolicy Bypass -File .\scripts\diagnose\smoke.ps1
       powershell -ExecutionPolicy Bypass -File .\scripts\diagnose\smoke.ps1 -Roles parent,teacher
       powershell -ExecutionPolicy Bypass -File .\scripts\diagnose\smoke.ps1 -Only /parent/wallet
       powershell -ExecutionPolicy Bypass -File .\scripts\diagnose\smoke.ps1 -Shots -Headed

  It asks for an email + password per role (press Enter to skip a role). Passwords are typed
  hidden, kept only in this process's environment, and removed when the run ends.
  The test only opens pages (GET). Every write the pages try to send is blocked.
#>
param(
  [string]$Base = 'http://localhost:3000',
  [string]$Roles = '',
  [string]$Only = '',
  [switch]$Shots,
  [switch]$Headed
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $root

if (-not (Test-Path (Join-Path $root 'node_modules\playwright'))) {
  Write-Host 'Playwright is not installed. Run these two commands once, then run this again:' -ForegroundColor Yellow
  Write-Host '  npm i -D playwright'
  Write-Host '  npx playwright install chromium'
  exit 1
}

try {
  Invoke-WebRequest -Uri "$Base/login" -UseBasicParsing -TimeoutSec 20 | Out-Null
}
catch {
  Write-Host "Cannot reach $Base. Start the app in another terminal first:  npm run dev" -ForegroundColor Yellow
  exit 1
}

function Read-Secret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$wanted = if ($Roles) { $Roles.Split(',') | ForEach-Object { $_.Trim().ToLower() } } else { @('parent', 'teacher', 'admin', 'accounts', 'it', 'hr') }
$touched = @()

try {
  foreach ($r in $wanted) {
    if (@('parent', 'teacher', 'admin', 'accounts', 'it', 'hr') -notcontains $r) { continue }
    $u = $r.ToUpper()
    $emailVar = "SMOKE_${u}_EMAIL"
    $passVar = "SMOKE_${u}_PASSWORD"
    # Already set in this window? Then do not ask again.
    if ((Get-Item "Env:$emailVar" -ErrorAction SilentlyContinue) -and (Get-Item "Env:$passVar" -ErrorAction SilentlyContinue)) { continue }

    $email = Read-Host "[$r] email (Enter to skip this role)"
    if (-not $email) { continue }
    $pass = Read-Secret "[$r] password"
    if (-not $pass) { continue }
    Set-Item -Path "Env:$emailVar" -Value $email
    Set-Item -Path "Env:$passVar" -Value $pass
    $touched += $emailVar
    $touched += $passVar
  }

  $nodeArgs = @('scripts\diagnose\smoke.mjs', '--base', $Base)
  if ($Roles) { $nodeArgs += @('--roles', $Roles) }
  if ($Only) { $nodeArgs += @('--only', $Only) }
  if ($Shots) { $nodeArgs += '--shots' }
  if ($Headed) { $nodeArgs += '--headed' }

  Write-Host ''
  Write-Host 'Running smoke test (read-only). A full run can take several minutes on the dev server...'
  & node @nodeArgs
  $code = $LASTEXITCODE
}
finally {
  foreach ($v in $touched) { Remove-Item "Env:$v" -ErrorAction SilentlyContinue }
}

if ($code -ne 0) { exit $code }
