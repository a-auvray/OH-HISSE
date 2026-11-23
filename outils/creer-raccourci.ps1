# Crée le raccourci « Oh Hisse » sur le Bureau (avec l'icône du programme).
#   powershell -ExecutionPolicy Bypass -File outils\creer-raccourci.ps1
# Le raccourci pointe vers « Oh Hisse.exe » du dossier du projet : construis-le d'abord (outils\construire-exe.ps1).
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$exe = Join-Path $racine 'Oh Hisse.exe'
if (-not (Test-Path $exe)) { throw "Oh Hisse.exe est introuvable : lance d'abord outils\construire-exe.ps1" }

$bureau = [Environment]::GetFolderPath('Desktop')
$raccourci = Join-Path $bureau 'Oh Hisse.lnk'
$shell = New-Object -ComObject WScript.Shell
$lien = $shell.CreateShortcut($raccourci)
$lien.TargetPath = $exe
$lien.WorkingDirectory = $racine
$lien.IconLocation = "$exe,0"
$lien.Description = 'Oh Hisse ! : Streetlifting, Marine, Vie courante, Objectifs'
$lien.Save()
Write-Host "Raccourci créé : $raccourci"
