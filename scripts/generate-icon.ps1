param(
  [string]$OutDir = "build"
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = (Resolve-Path ".").Path
$outPath = Join-Path $root $OutDir
New-Item -ItemType Directory -Force -Path $outPath | Out-Null

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$W,
    [float]$H,
    [float]$R
  )
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $R * 2
  [void]$path.AddArc($X, $Y, $d, $d, 180, 90)
  [void]$path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
  [void]$path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
  [void]$path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
  [void]$path.CloseFigure()
  return $path
}

function Add-StarPath {
  param(
    [System.Drawing.Drawing2D.GraphicsPath]$Path,
    [float]$Cx,
    [float]$Cy,
    [float]$Outer,
    [float]$Inner
  )
  $points = New-Object "System.Drawing.PointF[]" 8
  for ($i = 0; $i -lt 8; $i++) {
    $angle = (-90 + $i * 45) * [Math]::PI / 180
    $radius = if ($i % 2 -eq 0) { $Outer } else { $Inner }
    $points[$i] = New-Object System.Drawing.PointF -ArgumentList (
      [float]($Cx + [Math]::Cos($angle) * $radius),
      [float]($Cy + [Math]::Sin($angle) * $radius)
    )
  }
  [void]$Path.AddPolygon($points)
}

function New-AppIconBitmap {
  param([int]$Size)

  $bmp = New-Object System.Drawing.Bitmap -ArgumentList $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $s = [float]$Size
  $tileX = $s * 0.17
  $tileY = $s * 0.14
  $tileW = $s * 0.66
  $tileH = $s * 0.70
  $radius = $s * 0.13

  $shadowPath = New-RoundedRectPath ($tileX + $s * 0.015) ($tileY + $s * 0.035) $tileW $tileH $radius
  $shadowBrush = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::FromArgb(120, 20, 5, 70))
  $g.FillPath($shadowBrush, $shadowPath)
  $shadowBrush.Dispose()
  $shadowPath.Dispose()

  $tilePath = New-RoundedRectPath $tileX $tileY $tileW $tileH $radius
  $tileRect = New-Object System.Drawing.RectangleF -ArgumentList $tileX, $tileY, $tileW, $tileH
  $tileBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList (
    $tileRect,
    [System.Drawing.Color]::FromArgb(255, 223, 0, 209),
    [System.Drawing.Color]::FromArgb(255, 13, 4, 80),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
  )
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb(255, 232, 0, 221),
    [System.Drawing.Color]::FromArgb(255, 91, 18, 206),
    [System.Drawing.Color]::FromArgb(255, 18, 8, 94),
    [System.Drawing.Color]::FromArgb(255, 6, 3, 49)
  )
  $blend.Positions = @(0.0, 0.28, 0.70, 1.0)
  $tileBrush.InterpolationColors = $blend
  $g.FillPath($tileBrush, $tilePath)

  $glossRect = New-Object System.Drawing.RectangleF -ArgumentList ($tileX + $s * 0.02), ($tileY + $s * 0.02), ($tileW - $s * 0.04), ($tileH * 0.45)
  $glossBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList (
    $glossRect,
    [System.Drawing.Color]::FromArgb(86, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
  )
  $g.SetClip($tilePath)
  $g.FillEllipse($glossBrush, $glossRect)
  $g.ResetClip()

  $lineY = $tileY + $tileH * 0.51
  $linePen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(210, 108, 230, 255)), ([Math]::Max(2, $s * 0.015))
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($linePen, $tileX + $s * 0.045, $lineY, $tileX + $tileW - $s * 0.045, $lineY)

  $fontFamily = New-Object System.Drawing.FontFamily -ArgumentList "Arial"
  $textPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $fontStyle = [System.Drawing.FontStyle]::Bold
  $textOrigin = New-Object System.Drawing.PointF -ArgumentList ($tileX + $s * 0.125), ($tileY + $s * 0.215)
  [void]$textPath.AddString("AI", $fontFamily, [int]$fontStyle, $s * 0.285, $textOrigin, [System.Drawing.StringFormat]::GenericDefault)
  $textBounds = $textPath.GetBounds()
  $textBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList (
    $textBounds,
    [System.Drawing.Color]::FromArgb(255, 99, 245, 255),
    [System.Drawing.Color]::FromArgb(255, 255, 88, 218),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $outlinePen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(90, 255, 255, 255)), ([Math]::Max(1, $s * 0.007))
  $g.DrawPath($outlinePen, $textPath)
  $g.FillPath($textBrush, $textPath)

  $starPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-StarPath $starPath ($tileX + $tileW * 0.80) ($tileY + $tileH * 0.18) ($s * 0.065) ($s * 0.023)
  $starBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList (
    (New-Object System.Drawing.RectangleF -ArgumentList ($tileX + $tileW * 0.74), ($tileY + $tileH * 0.12), ($s * 0.14), ($s * 0.14)),
    [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(255, 94, 248, 255),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $starPen = New-Object System.Drawing.Pen -ArgumentList ([System.Drawing.Color]::FromArgb(230, 245, 212, 255)), ([Math]::Max(1, $s * 0.007))
  $g.FillPath($starBrush, $starPath)
  $g.DrawPath($starPen, $starPath)

  foreach ($obj in @($starPen, $starBrush, $starPath, $outlinePen, $textBrush, $textPath, $fontFamily, $linePen, $glossBrush, $tileBrush, $tilePath)) {
    if ($null -ne $obj) { $obj.Dispose() }
  }
  $g.Dispose()
  return $bmp
}

function Save-Png {
  param([System.Drawing.Bitmap]$Bitmap, [string]$Path)
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$pngPath = Join-Path $outPath "icon.png"
$main = New-AppIconBitmap 1024
Save-Png $main $pngPath
$main.Dispose()

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$pngBlobs = @()
foreach ($size in $sizes) {
  $bmp = New-AppIconBitmap $size
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngBlobs += ,$ms.ToArray()
  $ms.Dispose()
  $bmp.Dispose()
}

$icoPath = Join-Path $outPath "icon.ico"
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$sizes.Count)

$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $size = $sizes[$i]
  $blob = $pngBlobs[$i]
  $iconSizeByte = if ($size -eq 256) { 0 } else { $size }
  $bw.Write([byte]$iconSizeByte)
  $bw.Write([byte]$iconSizeByte)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$blob.Length)
  $bw.Write([UInt32]$offset)
  $offset += $blob.Length
}

foreach ($blob in $pngBlobs) {
  $bw.Write($blob)
}

$bw.Dispose()
$fs.Dispose()

$rendererPublic = Join-Path $root "apps\desktop\src\renderer\public"
New-Item -ItemType Directory -Force -Path $rendererPublic | Out-Null
Copy-Item -LiteralPath $pngPath -Destination (Join-Path $rendererPublic "app-icon.png") -Force

Write-Host "Created $pngPath"
Write-Host "Created $icoPath"
Write-Host "Created apps\desktop\src\renderer\public\app-icon.png"
