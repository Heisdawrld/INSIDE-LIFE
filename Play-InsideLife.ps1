$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw 'Install Node.js 22.12+ and pnpm 11.19.0, then run this script again.'
}
if (-not (Test-Path -LiteralPath 'node_modules')) {
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
Write-Host 'INSIDE LIFE starts at http://127.0.0.1:4173. Press Ctrl+C to stop.'
& pnpm dev
