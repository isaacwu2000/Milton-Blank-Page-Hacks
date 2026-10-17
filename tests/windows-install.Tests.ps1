# Offline contract tests; runs with Windows PowerShell 5.1 or PowerShell 7.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'install.ps1')

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Throws {
    param([scriptblock]$Action, [string]$Message)
    $threw = $false
    try { & $Action } catch { $threw = $true }
    Assert-True $threw $Message
}

Assert-True (Test-SupportedBunVersion '1.4.2') 'Pinned Bun must be accepted.'
Assert-True (Test-SupportedBunVersion '2.0.0') 'Newer Bun must be accepted.'
Assert-True (-not (Test-SupportedBunVersion '1.4.1')) 'Old Bun must be upgraded.'
Assert-True (-not (Test-SupportedBunVersion 'not-a-version')) 'Invalid Bun output must be rejected.'
Assert-True ((Get-SportsBuilderWindowsTarget 'AMD64' '') -eq 'windows-x64') 'x64 target is incorrect.'
Assert-Throws { Get-SportsBuilderWindowsTarget 'ARM64' '' } 'Native ARM must be rejected.'
Assert-Throws { Get-SportsBuilderWindowsTarget 'AMD64' 'ARM64' } 'Emulated ARM must be rejected.'
Assert-Throws { Get-SportsBuilderWindowsTarget 'x86' '' } '32-bit Windows must be rejected.'
Assert-Throws { Get-SportsBuilderWindowsTarget 'x86' 'AMD64' } '32-bit shells must not install x86 Python on x64 Windows.'

$temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ('SportsBuilder test with spaces ' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $temporaryDirectory
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = Join-Path $temporaryDirectory 'bun-windows-x64.zip'
    $zip = [IO.Compression.ZipFile]::Open($archive, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($name in @('bun-windows-x64/bun.exe', '../untrusted.txt')) {
            $entry = $zip.CreateEntry($name)
            $writer = New-Object IO.StreamWriter($entry.Open())
            try { $writer.Write('verified executable fixture') } finally { $writer.Dispose() }
        }
    } finally { $zip.Dispose() }
    $checksums = Join-Path $temporaryDirectory 'SHASUMS256.txt'
    $hash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    Set-Content -LiteralPath $checksums -Value "$hash  ./bun-windows-x64.zip"
    $destination = Join-Path $temporaryDirectory 'user bin/bun.exe'
    Install-VerifiedBunArchive $archive $checksums 'windows-x64' $destination
    Assert-True ((Get-Content -LiteralPath $destination -Raw) -eq 'verified executable fixture') 'Verified executable must be installed in paths containing spaces.'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $temporaryDirectory 'untrusted.txt'))) 'Other archive entries must never be extracted.'
    Set-Content -LiteralPath $checksums -Value (('0' * 64) + '  bun-windows-x64.zip')
    Assert-Throws { Install-VerifiedBunArchive $archive $checksums 'windows-x64' $destination } 'Tampered downloads must be rejected.'
    Assert-True ((Get-Content -LiteralPath $destination -Raw) -eq 'verified executable fixture') 'Checksum failure must preserve an existing executable.'
    Set-Content -LiteralPath $checksums -Value "$hash  another.zip"
    Assert-Throws { Install-VerifiedBunArchive $archive $checksums 'windows-x64' $destination } 'Missing matching checksum must be rejected.'

    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        $privateDirectory = Join-Path $temporaryDirectory 'private settings'
        Protect-SetupDirectory $privateDirectory
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        $acl = Get-Acl -LiteralPath $privateDirectory
        Assert-True $acl.AreAccessRulesProtected 'Private settings must not inherit broad access.'
        $rules = $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])
        foreach ($rule in $rules) {
            Assert-True ($rule.IdentityReference.Value -eq $identity) 'Private settings should grant access only to the current user.'
        }
    }

    # The launcher must resolve its own folder and forward flags from another directory.
    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        $launcher = Join-Path $root 'install.cmd'
        Push-Location -LiteralPath $temporaryDirectory
        try {
            $launcherOutput = & $launcher -Help 2>&1
            Assert-True ($LASTEXITCODE -eq 0) 'The launcher must find install.ps1 outside the project folder.'
            Assert-True (($launcherOutput -join "`n") -match 'NoStart') 'The launcher must forward arguments.'
        } finally {
            Pop-Location
        }
    }

    $shell = (Get-Process -Id $PID).Path
    $script = Join-Path $root 'install.ps1'
    $helpOutput = & $shell -NoProfile -File $script -Help 2>&1
    Assert-True ($LASTEXITCODE -eq 0) 'Help must work before platform checks and installation.'
    Assert-True (($helpOutput -join "`n") -match 'NoStart') 'Help must explain install-only mode.'
    # Native PowerShell 5.1 turns stderr into ErrorRecord values; capture it without stopping.
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $unknownOutput = & $shell -NoProfile -File $script -UnknownOption 2>&1
    $unknownExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorPreference
    Assert-True ($unknownExitCode -ne 0) 'Unknown arguments must fail before downloading or modifying anything.'
    Assert-True (($unknownOutput -join "`n") -match 'UnknownOption') 'Unknown arguments must be identified.'
    $null = & $shell -NoProfile -Command 'exit 9'
    Assert-Throws { Invoke-SetupCommand $shell @('-NoProfile', '-Command', 'exit 9') } 'Native command failures must stop setup.'
} finally {
    Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force
}
Write-Host 'Windows installer offline tests passed.'
