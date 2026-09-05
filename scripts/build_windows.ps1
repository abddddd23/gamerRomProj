[CmdletBinding()]
param([switch]$Debug)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'
$release = Join-Path $root 'release'

foreach ($tool in @('node', 'npm', 'py')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "Required developer tool '$tool' was not found. Install it and run this script again." }
}
$innoCompiler = 'C:\Program Files (x86)\Inno Setup 6\ISCC.exe'
if (-not (Test-Path -LiteralPath $innoCompiler)) {
  throw "Inno Setup compiler was not found at: $innoCompiler"
}
Remove-Item -Recurse -Force $release -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $release | Out-Null
Push-Location $frontend
npm ci
npm run build
Pop-Location
Copy-Item -Recurse -Force (Join-Path $frontend 'dist') (Join-Path $backend 'frontend_dist')
Push-Location $backend
py -m venv .packaging-venv
& .\.packaging-venv\Scripts\python.exe -m pip install --upgrade pip
& .\.packaging-venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.packaging-venv\Scripts\python.exe -m pytest tests -q
$console = if ($Debug) { '--console' } else { '--noconsole' }
& .\.packaging-venv\Scripts\pyinstaller.exe --clean --noconfirm $console --name GamingRoomManager `
  --hidden-import passlib.handlers.bcrypt --collect-submodules passlib `
  --add-data "frontend_dist;frontend_dist" --add-data "..\VERSION;." app\main_exe.py
Pop-Location
New-Item -ItemType Directory -Force (Join-Path $release 'app') | Out-Null
Copy-Item -Recurse -Force (Join-Path $backend 'dist\GamingRoomManager\*') (Join-Path $release 'app')
& $innoCompiler (Join-Path $root 'installer\GamingRoomManager.iss')
$installer = Get-ChildItem (Join-Path $release 'GamingRoomManager-Setup-x64.exe') -ErrorAction Stop
Get-FileHash $installer.FullName -Algorithm SHA256 | ForEach-Object { "{0} *{1}" -f $_.Hash, $installer.Name } | Set-Content (Join-Path $release 'SHA256SUMS.txt')
Write-Host "Installer created: $($installer.FullName)"
