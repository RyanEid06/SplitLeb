param([string]$SigningDirectory = $env:SPLITLEB_SIGNING_DIRECTORY)
$ErrorActionPreference = 'Stop'
if (-not $SigningDirectory) {
    $SigningDirectory = Join-Path $env:USERPROFILE 'SplitLeb-Signing'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
$keystore = Join-Path $SigningDirectory 'splitleb-release.p12'
$credentialPath = Join-Path $SigningDirectory 'credentials.clixml'
if (-not (Test-Path -LiteralPath $keystore) -or -not (Test-Path -LiteralPath $credentialPath)) {
    throw 'Permanent signing material is missing. Restore the existing signing key; do not generate a replacement.'
}
$credential = Import-Clixml -LiteralPath $credentialPath
$names = @('SPLITLEB_KEYSTORE', 'SPLITLEB_KEY_ALIAS', 'SPLITLEB_STORE_PASSWORD', 'SPLITLEB_KEY_PASSWORD')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$buildExit = 1
Push-Location $projectRoot
try {
    $env:SPLITLEB_KEYSTORE = $keystore
    $env:SPLITLEB_KEY_ALIAS = $credential.UserName
    $env:SPLITLEB_STORE_PASSWORD = $credential.GetNetworkCredential().Password
    $env:SPLITLEB_KEY_PASSWORD = $env:SPLITLEB_STORE_PASSWORD
    & npm.cmd run android:sync
    if ($LASTEXITCODE -ne 0) { throw 'Production build or Capacitor sync failed.' }
    Push-Location (Join-Path $projectRoot 'android')
    try {
        & .\gradlew.bat :app:assembleRelease :app:lintRelease --console=plain --no-daemon
        $buildExit = $LASTEXITCODE
    } finally { Pop-Location }
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    $credential = $null
    Pop-Location
}
exit $buildExit
