# Construit « Oh Hisse.exe » à la racine du dépôt : l'application (sans fenêtre noire), avec son icône.
# Aucun téléchargement : le compilateur C# est fourni avec Windows.
#   powershell -ExecutionPolicy Bypass -File outils\construire-exe.ps1
# Ferme l'application avant : Windows ne remplace pas un programme ouvert.
param([string]$Sortie = '')
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path $csc)) { throw "Compilateur C# introuvable : $csc" }

Add-Type -AssemblyName System.Drawing

function Nouvelle-Couleur($hex, $alpha = 255) {
    [System.Drawing.Color]::FromArgb($alpha, [Convert]::ToInt32($hex.Substring(0, 2), 16), [Convert]::ToInt32($hex.Substring(2, 2), 16), [Convert]::ToInt32($hex.Substring(4, 2), 16))
}

function Rectangle-Arrondi($x, $y, $l, $h, $r) {
    $c = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = [Math]::Min($r * 2, [Math]::Min($l, $h))
    $c.AddArc($x, $y, $d, $d, 180, 90); $c.AddArc($x + $l - $d, $y, $d, $d, 270, 90)
    $c.AddArc($x + $l - $d, $y + $h - $d, $d, $d, 0, 90); $c.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $c.CloseFigure()
    return $c
}

# L'icône : un fond nuit en dégradé, la croix des quatre espaces (Vie courante en haut, Streetlifting à gauche,
# Marine à droite, Objectifs en bas) et, au centre, un point d'exclamation crème : « Oh Hisse ! ».
function Dessiner-Icone([int]$taille) {
    $s = $taille / 256.0
    $bmp = New-Object System.Drawing.Bitmap $taille, $taille
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'AntiAliasGridFit'
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.ScaleTransform($s, $s)

    $fond = Rectangle-Arrondi 4 4 248 248 58
    $degrade = New-Object System.Drawing.Drawing2D.LinearGradientBrush ((New-Object System.Drawing.PointF 0, 0), (New-Object System.Drawing.PointF 256, 256), (Nouvelle-Couleur '26262c'), (Nouvelle-Couleur '0c0c0f'))
    $g.FillPath($degrade, $fond)
    $g.DrawPath((New-Object System.Drawing.Pen (Nouvelle-Couleur 'ffffff' 28), 3), $fond)

    $bras = @(
        @{ x = 100; y = 26;  l = 56; h = 70; c = '3fae5e' },   # haut : Vie courante
        @{ x = 26;  y = 100; l = 70; h = 56; c = 'e0782a' },   # gauche : Streetlifting
        @{ x = 160; y = 100; l = 70; h = 56; c = '2f8fe0' },   # droite : Marine
        @{ x = 100; y = 160; l = 56; h = 70; c = 'a54ec2' }    # bas : Objectifs
    )
    foreach ($b in $bras) {
        $g.FillPath((New-Object System.Drawing.SolidBrush (Nouvelle-Couleur $b.c)), (Rectangle-Arrondi $b.x $b.y $b.l $b.h 22))
    }

    $g.FillEllipse((New-Object System.Drawing.SolidBrush (Nouvelle-Couleur 'efe9dd')), 82, 82, 92, 92)
    $police = New-Object System.Drawing.Font 'Arial Black', 74, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = 'Center'; $format.LineAlignment = 'Center'
    $g.DrawString('!', $police, (New-Object System.Drawing.SolidBrush (Nouvelle-Couleur '141414')), (New-Object System.Drawing.RectangleF 82, 84, 92, 92), $format)
    $g.Dispose()
    return $bmp
}

# Un .ico à plusieurs tailles (PNG), pour rester net de la barre des tâches au grand affichage.
$tailles = 256, 64, 48, 32, 16
$images = foreach ($t in $tailles) {
    $bmp = Dessiner-Icone $t
    $flux = New-Object System.IO.MemoryStream
    $bmp.Save($flux, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    , $flux.ToArray()
}
$ico = Join-Path $racine 'outils\lanceur\oh-hisse.ico'
$fichier = [System.IO.File]::Create($ico)
$w = New-Object System.IO.BinaryWriter $fichier
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$tailles.Count)
$decalage = 6 + 16 * $tailles.Count
for ($i = 0; $i -lt $tailles.Count; $i++) {
    $t = $tailles[$i]; $octets = $images[$i]
    $w.Write([byte]($t % 256)); $w.Write([byte]($t % 256)); $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$octets.Length); $w.Write([UInt32]$decalage)
    $decalage += $octets.Length
}
foreach ($octets in $images) { $w.Write($octets) }
$w.Close()

# Le dossier du projet est mémorisé dans le programme : il fonctionne aussi copié ailleurs (le Bureau).
$memo = Join-Path $racine 'outils\lanceur\RacineDuProjet.generated.cs'
$chemin = $racine.Replace('"', '""')
Set-Content -Path $memo -Encoding UTF8 -Value ("static class RacineDuProjet { public const string Chemin = @`"" + $chemin + "`"; }")

$sortie = if ($Sortie) { $Sortie } else { Join-Path $racine 'Oh Hisse.exe' }
& $csc /nologo /target:winexe /optimize+ /r:System.Windows.Forms.dll /out:$sortie /win32icon:$ico (Join-Path $racine 'outils\lanceur\Lanceur.cs') $memo
if ($LASTEXITCODE -ne 0) { throw 'La compilation a échoué.' }
Write-Host "Construit : $sortie"
