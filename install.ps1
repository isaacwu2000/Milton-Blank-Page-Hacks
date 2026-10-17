# Requires Windows PowerShell 5.1 or later. No administrator privileges needed.
[CmdletBinding()]
param(
    [switch]$NoStart,
    [switch]$NonInteractive,
    [Alias('h')][switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-SupportedBunVersion {
    param([string]$Version)
    if ($Version -notmatch '^(\d+)\.(\d+)\.(\d+)(?:\s|$)') { return $false }
    return ([version]$Matches[0].Trim() -ge [version]'1.4.2')
}

function Get-SportsBuilderWindowsTarget {
    param([string]$Architecture, [string]$NativeArchitecture)
    # Reject ARM even from an emulated shell: the video dependencies need x64 Windows.
    if ($Architecture -eq 'ARM64' -or $NativeArchitecture -eq 'ARM64') {
        throw 'Windows ARM is not supported by the video dependencies yet. Use an Intel/AMD 64-bit Windows computer.'
    }
    if ($Architecture -eq 'x86' -and $NativeArchitecture -eq 'AMD64') {
        throw 'Open 64-bit Windows PowerShell (not Windows PowerShell x86), then run install.ps1 again.'
    }
    if ($Architecture -ne 'AMD64') {
        throw 'SportsBuilder needs 64-bit Windows on an Intel or AMD processor.'
    }
    return 'windows-x64'
}

function Receive-SetupFile {
    param([string]$Uri, [string]$Destination)
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Invoke-WebRequest -Uri $Uri -OutFile $Destination -UseBasicParsing
            return
        } catch {
            if ($attempt -eq 3) { throw }
            Start-Sleep -Seconds $attempt
        }
    }
}

function Install-VerifiedBunArchive {
    param([string]$Archive, [string]$Checksums, [string]$Target, [string]$Destination)
    $filename = "bun-$Target.zip"
    $expected = $null
    foreach ($line in (Get-Content -LiteralPath $Checksums)) {
        if ($line -match '^([0-9a-fA-F]{64})\s+\*?(?:\./)?(.+)$' -and $Matches[2] -eq $filename) {
            $expected = $Matches[1]
            break
        }
    }
    $actual = (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash
    if (-not $expected -or $actual -ne $expected) {
        throw 'Bun download could not be verified. Please rerun setup.'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    $pending = "$Destination.installing"
    try {
        $entry = $zip.GetEntry("bun-$Target/bun.exe")
        if ($null -eq $entry) { throw 'The Bun download does not contain bun.exe.' }
        $null = New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $pending, $true)
        Move-Item -LiteralPath $pending -Destination $Destination -Force
    } finally {
        $zip.Dispose()
        if (Test-Path -LiteralPath $pending) { Remove-Item -LiteralPath $pending -Force }
    }
}

function Invoke-SetupCommand {
    param([string]$Executable, [string[]]$CommandArguments)
    & $Executable @CommandArguments
    if ($LASTEXITCODE -ne 0) {
        throw "A setup command failed (exit $LASTEXITCODE). Fix the error above and run install.ps1 again."
    }
}

function Protect-SetupDirectory {
    param([string]$Path)
    $null = New-Item -ItemType Directory -Path $Path -Force
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $inheritance = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', $inheritance, 'None', 'Allow')
    $acl.AddAccessRule($rule)
    # Persist only the changed access rules; Set-Acl also requests audit privileges.
    # Leave ownership and auditing untouched so a normal user can run setup.
    if ($PSVersionTable.PSEdition -eq 'Desktop') {
        [IO.Directory]::SetAccessControl($Path, $acl)
    } else {
        $directory = New-Object IO.DirectoryInfo($Path)
        [IO.FileSystemAclExtensions]::SetAccessControl($directory, $acl)
    }
}

function Start-SportsBuilderSetup {
    param([string]$Root, [bool]$SkipStart, [bool]$Unattended)
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'Run install.ps1 on Windows. On macOS or Linux, run bash install.sh.'
    }
    $target = Get-SportsBuilderWindowsTarget $env:PROCESSOR_ARCHITECTURE $env:PROCESSOR_ARCHITEW6432
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    $uvDirectory = Join-Path $HOME '.local\bin'
    $bunDirectory = Join-Path $HOME '.bun\bin'
    $env:PATH = "$bunDirectory;$uvDirectory;$env:PATH"
    $temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ("sportsbuilder-" + [guid]::NewGuid().ToString('N'))
    $null = New-Item -ItemType Directory -Path $temporaryDirectory
    Push-Location -LiteralPath $Root
    try {
        Write-Host 'Setting up SportsBuilder...'
        # New credentials and installation logs inherit access for this user only.
        Protect-SetupDirectory (Join-Path $Root '.sportsbuilder')
        $uv = Get-Command uv.exe -CommandType Application -ErrorAction SilentlyContinue
        if (-not $uv) {
            Write-Host 'Installing uv (Python dependency manager)...'
            $installer = Join-Path $temporaryDirectory 'install-uv.ps1'
            Receive-SetupFile 'https://astral.sh/uv/install.ps1' $installer
            $previousInstallDirectory = $env:UV_INSTALL_DIR
            $previousModifyPath = $env:UV_NO_MODIFY_PATH
            try {
                $env:UV_INSTALL_DIR = $uvDirectory
                $env:UV_NO_MODIFY_PATH = '1'
                # Use this shell's executable and pass paths as separate arguments.
                $shellExecutable = (Get-Process -Id $PID).Path
                Invoke-SetupCommand $shellExecutable @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $installer)
            } finally {
                $env:UV_INSTALL_DIR = $previousInstallDirectory
                $env:UV_NO_MODIFY_PATH = $previousModifyPath
            }
            $uv = Get-Command uv.exe -CommandType Application -ErrorAction Stop
        }
        Invoke-SetupCommand $uv.Source @('--version')
        Write-Host 'Preparing Python 3.12...'
        Invoke-SetupCommand $uv.Source @('python', 'install', '3.12')

        $bun = Get-Command bun.exe -CommandType Application -ErrorAction SilentlyContinue
        $needsBun = $true
        if ($bun) {
            $installedVersion = & $bun.Source --version
            $needsBun = $LASTEXITCODE -ne 0 -or -not (Test-SupportedBunVersion ([string]$installedVersion))
        }
        if ($needsBun) {
            Write-Host 'Installing Bun 1.4.2...'
            $release = 'https://github.com/oven-sh/bun/releases/download/bun-v1.4.2'
            $archive = Join-Path $temporaryDirectory "bun-$target.zip"
            $checksums = Join-Path $temporaryDirectory 'SHASUMS256.txt'
            Receive-SetupFile "$release/bun-$target.zip" $archive
            Receive-SetupFile "$release/SHASUMS256.txt" $checksums
            Install-VerifiedBunArchive $archive $checksums $target (Join-Path $bunDirectory 'bun.exe')
            $bun = Get-Command bun.exe -CommandType Application -ErrorAction Stop
        }
        Invoke-SetupCommand $bun.Source @('--version')
        $setupArguments = @('scripts/setup.ts')
        if ($SkipStart) { $setupArguments += '--no-start' }
        if ($Unattended) { $setupArguments += '--non-interactive' }
        Invoke-SetupCommand $bun.Source $setupArguments
    } finally {
        Pop-Location
        Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
    }
}

# Dot-sourcing loads the helpers for offline tests without installing anything.
if ($MyInvocation.InvocationName -ne '.') {
    if ($Help) {
        Write-Host @'
Usage: powershell -NoProfile -ExecutionPolicy Bypass -File "./install.ps1" [-NoStart] [-NonInteractive]

Installs missing tools and SportsBuilder, then starts the app.
  -NoStart         Install and configure without starting the app.
  -NonInteractive  Use credentials already in .env.local, .env, or the environment.
  -Help            Show this help without installing anything.

Requires 64-bit Windows on an Intel/AMD processor. No administrator access needed.
Existing credentials are preserved. Without Codex, setup uses OpenRouter.
'@
        exit 0
    }
    try {
        Start-SportsBuilderSetup $PSScriptRoot $NoStart.IsPresent $NonInteractive.IsPresent
    } catch {
        [Console]::Error.WriteLine("SportsBuilder setup: $($_.Exception.Message)")
        [Console]::Error.WriteLine('Existing settings are preserved. Run install.ps1 again after fixing the error.')
        exit 1
    }
}
