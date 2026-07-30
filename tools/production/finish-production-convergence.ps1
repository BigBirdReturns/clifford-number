[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Bundle,

    [switch]$Merge,
    [switch]$NoInstall,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ExpectedBranch = 'agent/production-convergence-origin-custody'
$ExpectedMain = '0d701692fa83a405bd0ba86e7b45c525022589f7'
$CarrierSha256 = '25f70537a82482770abaf2cda64e62af70df845206b81670efa387cab86cb438'
$GzipSha256 = '9a18cd7111ee42a5e80c2b138dc951b206e0f10fb3ef9e4f683e7efcb4a9c857'
$PatchSha256 = '668bf931d383eeaf0ecb2491edcd4c0f74e8c64c7684c39af11ef6ce3748e506'
$BundleXzSha256 = '6a2131f43e82817f943a777519a5f825fb45afba26686be4e438b5797a54f2f5'
$BundleSha256 = '64eff11e5e9d968f8a40fb532c46910695ecf0ccc4c7d054d70e5b5b729ae3ab'

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-Sha256 {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Expected,
        [Parameter(Mandatory = $true)][string]$Label
    )
    $observed = Get-Sha256 -Path $Path
    if ($Expected -notcontains $observed) {
        throw "$Label SHA-256 mismatch. Observed $observed."
    }
    return $observed
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git is required.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 24 or later is required.' }

$repoRootText = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRootText)) {
    throw 'Run this script from a Clifford Number Git checkout.'
}
$repoRoot = (Resolve-Path $repoRootText.Trim()).Path
Push-Location $repoRoot
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("clifford-production-runtime-" + [Guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

    $origin = (& git remote get-url origin).Trim()
    if ($LASTEXITCODE -ne 0 -or $origin.ToLowerInvariant() -notmatch 'bigbirdreturns[\\/]clifford-number') {
        throw "Unexpected origin remote: $origin"
    }

    Invoke-Git fetch --prune origin "+refs/heads/main:refs/remotes/origin/main" "+refs/heads/$ExpectedBranch`:refs/remotes/origin/$ExpectedBranch"
    $remoteMain = (& git rev-parse origin/main).Trim()
    if ($remoteMain -ne $ExpectedMain) {
        throw "Canonical main moved. Expected $ExpectedMain, observed $remoteMain. Reconcile the transaction instead of bypassing this guard."
    }

    $branch = (& git branch --show-current).Trim()
    if ($branch -ne $ExpectedBranch) {
        throw "Checkout $ExpectedBranch before running this script. Current branch: $branch"
    }

    $status = (& git status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the worktree.' }
    if ($status) { throw "The worktree must be clean before installation:`n$($status -join "`n")" }

    $bundlePath = (Resolve-Path -LiteralPath $Bundle).Path
    $bundleObserved = Assert-Sha256 -Path $bundlePath -Expected @($BundleXzSha256, $BundleSha256) -Label 'Production bundle'
    Write-Host "Verified production bundle: $bundleObserved"

    $carrierRoot = Join-Path $repoRoot 'tools/production/runtime-patch'
    $runtimeEntry = Join-Path $repoRoot 'tools/production/complete-production-convergence.mjs'
    $carrierParts = @(Get-ChildItem -LiteralPath $carrierRoot -Filter 'part-*.b64' -File | Sort-Object Name)
    if ($carrierParts.Count -ne 11) {
        throw "Expected eleven tracked runtime carrier parts under $carrierRoot; observed $($carrierParts.Count)."
    }

    $carrierPath = Join-Path $tempRoot 'runtime.patch.gz.b64'
    $carrierText = ($carrierParts | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw }) -join ''
    [IO.File]::WriteAllText($carrierPath, $carrierText, [Text.UTF8Encoding]::new($false))
    Assert-Sha256 -Path $carrierPath -Expected @($CarrierSha256) -Label 'Runtime carrier' | Out-Null

    $gzipPath = Join-Path $tempRoot 'runtime.patch.gz'
    $patchPath = Join-Path $tempRoot 'runtime.patch'
    $base64 = ($carrierText -replace '\s', '')
    [IO.File]::WriteAllBytes($gzipPath, [Convert]::FromBase64String($base64))
    Assert-Sha256 -Path $gzipPath -Expected @($GzipSha256) -Label 'Decoded runtime patch' | Out-Null

    $inputStream = [IO.File]::OpenRead($gzipPath)
    try {
        $gzipStream = [IO.Compression.GzipStream]::new($inputStream, [IO.Compression.CompressionMode]::Decompress)
        try {
            $outputStream = [IO.File]::Create($patchPath)
            try { $gzipStream.CopyTo($outputStream) }
            finally { $outputStream.Dispose() }
        }
        finally { $gzipStream.Dispose() }
    }
    finally { $inputStream.Dispose() }
    Assert-Sha256 -Path $patchPath -Expected @($PatchSha256) -Label 'Runtime patch' | Out-Null

    if (Test-Path -LiteralPath $runtimeEntry) {
        & git apply --reverse --check --whitespace=error-all $patchPath
        if ($LASTEXITCODE -ne 0) {
            throw 'A production runtime is present, but it does not match the verified patch. Stop and inspect the branch.'
        }
        Write-Host 'Verified an already-installed production runtime.'
    }
    else {
        & git apply --check --whitespace=error-all $patchPath
        if ($LASTEXITCODE -ne 0) { throw 'The verified production runtime patch does not apply cleanly to this branch.' }
        Invoke-Git apply --index --whitespace=error-all $patchPath
        Invoke-Git diff --cached --check

        $userName = (& git config --get user.name 2>$null)
        if ([string]::IsNullOrWhiteSpace($userName)) { Invoke-Git config user.name 'OpenAI Agent' }
        $userEmail = (& git config --get user.email 2>$null)
        if ([string]::IsNullOrWhiteSpace($userEmail)) { Invoke-Git config user.email 'agent@openai.invalid' }

        Invoke-Git commit -m 'Install guarded local production convergence runtime'
        Write-Host 'Installed the guarded production runtime.'
    }

    Invoke-Git push -u origin "HEAD:$ExpectedBranch"

    $runner = Join-Path $repoRoot 'tools/production/complete-production-convergence.ps1'
    if (-not (Test-Path -LiteralPath $runner)) { throw "Runtime entrypoint missing after installation: $runner" }

    $runnerArguments = @('-Bundle', $bundlePath, '-Push')
    if ($Merge) { $runnerArguments += '-Merge' }
    if ($NoInstall) { $runnerArguments += '-NoInstall' }
    if ($NoBrowser) { $runnerArguments += '-NoBrowser' }

    & $runner @runnerArguments
    if ($LASTEXITCODE -ne 0) { throw "Production convergence failed with exit code $LASTEXITCODE." }
}
finally {
    Pop-Location
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
