# Construit « Oh Hisse.exe » à la racine du dépôt : l'application (fenêtre sans fenêtre noire), avec son icône.
# Aucun téléchargement : le compilateur C# est fourni avec Windows.
#   powershell -ExecutionPolicy Bypass -File outils\construire-exe.ps1
param([string]$Sortie = '')
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { throw "Compilateur C# introuvable : $csc" }

# Icône : un carré encre avec un « OH » crème et un point orange, en PNG 256 px dans un .ico.
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
$chemin = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 56
$chemin.AddArc(0, 0, $r, $r, 180, 90); $chemin.AddArc(256 - $r, 0, $r, $r, 270, 90)
$chemin.AddArc(256 - $r, 256 - $r, $r, $r, 0, 90); $chemin.AddArc(0, 256 - $r, $r, $r, 90, 90)
$chemin.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 20, 20, 20))), $chemin)
$police = New-Object System.Drawing.Font 'Arial Black', 96, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = 'Center'; $format.LineAlignment = 'Center'
$g.DrawString('OH', $police, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 239, 233, 221))), (New-Object System.Drawing.RectangleF 0, 20, 256, 200), $format)
$g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 224, 120, 42))), 168, 176, 30, 30)
$g.Dispose()
$png = New-Object System.IO.MemoryStream
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
$octets = $png.ToArray()
$ico = Join-Path $racine 'outils\lanceur\oh-hisse.ico'
$flux = [System.IO.File]::Create($ico)
$w = New-Object System.IO.BinaryWriter $flux
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]1)
$w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0)
$w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$octets.Length); $w.Write([UInt32]22)
$w.Write($octets); $w.Close()

# Le dossier du projet est mémorisé dans le programme : il fonctionne aussi copié ailleurs (le Bureau).
$memo = Join-Path $racine 'outils\lanceur\RacineDuProjet.generated.cs'
$chemin = $racine.Replace('"', '""')
Set-Content -Path $memo -Encoding UTF8 -Value ("static class RacineDuProjet { public const string Chemin = @`"" + $chemin + "`"; }")

$sortie = if ($Sortie) { $Sortie } else { Join-Path $racine 'Oh Hisse.exe' }
& $csc /nologo /target:winexe /optimize+ /r:System.Windows.Forms.dll /out:$sortie /win32icon:$ico (Join-Path $racine 'outils\lanceur\Lanceur.cs') $memo
if ($LASTEXITCODE -ne 0) { throw 'La compilation a échoué.' }
Write-Host "Construit : $sortie"
