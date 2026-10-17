# Run the real bootstrap with no preinstalled language runtimes on PATH.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$fixture = Join-Path $env:RUNNER_TEMP ('SportsBuilder cold setup ' + [guid]::NewGuid().ToString('N'))
$checkout = Join-Path $fixture 'checkout with spaces'
$isolatedHome = Join-Path $fixture 'user home'
$null = New-Item -ItemType Directory -Path (Join-Path $checkout 'scripts') -Force
$null = New-Item -ItemType Directory -Path $isolatedHome -Force
Copy-Item -LiteralPath (Join-Path $root 'install.ps1') -Destination $checkout
@'
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const python = spawnSync("uv", ["run", "--no-project", "--python", "3.12", "python", "-c", "import sys; assert sys.version_info[:2] == (3,12); print('ok')"], { encoding: "utf8" });
if (python.status !== 0) throw Error("Managed Python did not start: " + python.stderr);
if (!process.argv.includes("--no-start") || !process.argv.includes("--non-interactive")) throw Error("Installer arguments were lost.");
writeFileSync("proof.json", JSON.stringify({ platform: process.platform, python: python.stdout.trim() }));
'@ | Set-Content -LiteralPath (Join-Path $checkout 'scripts/setup.ts') -Encoding UTF8
$originalPath = $env:PATH
$originalProfile = $env:USERPROFILE
$originalPythonDirectory = $env:UV_PYTHON_INSTALL_DIR
try {
    $env:PATH = "$env:SystemRoot\System32;$env:SystemRoot\System32\WindowsPowerShell\v1.0"
    $env:USERPROFILE = $isolatedHome
    $env:UV_PYTHON_INSTALL_DIR = Join-Path $isolatedHome 'managed-python'
    $shell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $checkout 'install.ps1') -NoStart -NonInteractive
    if ($LASTEXITCODE -ne 0) { throw 'Cold native Windows bootstrap failed.' }
    # Repeat installation using the installed binaries, still without any system runtimes.
    & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $checkout 'install.ps1') -NoStart -NonInteractive
    if ($LASTEXITCODE -ne 0) { throw 'Repeat native Windows bootstrap failed.' }
    $proof = Get-Content -LiteralPath (Join-Path $checkout 'proof.json') -Raw | ConvertFrom-Json
    if ($proof.platform -ne 'win32' -or $proof.python -ne 'ok') { throw 'Wrong host or Python runtime.' }
    $bunDirectory = Join-Path $isolatedHome '.bun\bin'
    $uvDirectory = Join-Path $isolatedHome '.local\bin'
    if (-not (Test-Path (Join-Path $bunDirectory 'bun.exe'))) { throw 'Bun was not installed in the isolated home.' }
    if (-not (Test-Path (Join-Path $uvDirectory 'uv.exe'))) { throw 'uv was not installed in the isolated home.' }
    $bunDirectory | Out-File -FilePath $env:GITHUB_PATH -Append -Encoding utf8
    $uvDirectory | Out-File -FilePath $env:GITHUB_PATH -Append -Encoding utf8
    "UV_PYTHON_INSTALL_DIR=$env:UV_PYTHON_INSTALL_DIR" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8
} finally {
    $env:PATH = $originalPath
    $env:USERPROFILE = $originalProfile
    $env:UV_PYTHON_INSTALL_DIR = $originalPythonDirectory
}
Write-Host 'Cold and repeat Windows bootstraps passed without Node, Python, pip, Bun, or uv on the original PATH.'
