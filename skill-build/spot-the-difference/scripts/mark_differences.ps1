param(
    [Parameter(Mandatory = $true)][string]$FirstImage,
    [Parameter(Mandatory = $true)][string]$SecondImage,
    [Parameter(Mandatory = $true)][string]$OutputImage
)

Add-Type -AssemblyName System.Drawing

$first = [System.Drawing.Bitmap]::new($FirstImage)
$second = [System.Drawing.Bitmap]::new($SecondImage)

try {
    if ($first.Width -ne $second.Width -or $first.Height -ne $second.Height) {
        throw "Image dimensions differ: $($first.Width)x$($first.Height) vs $($second.Width)x$($second.Height)"
    }

    $different = [System.Collections.Generic.List[object]]::new()
    for ($y = 0; $y -lt $first.Height; $y++) {
        for ($x = 0; $x -lt $first.Width; $x++) {
            if ($first.GetPixel($x, $y).ToArgb() -ne $second.GetPixel($x, $y).ToArgb()) {
                $different.Add([System.Drawing.Point]::new($x, $y))
            }
        }
    }

    if ($different.Count -eq 0) {
        throw "No pixel differences found."
    }

    # Cluster nearby changed pixels. The generous neighborhood joins antialiased
    # edges belonging to the same visual difference while keeping distant changes separate.
    $remaining = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($point in $different) {
        [void]$remaining.Add("$($point.X),$($point.Y)")
    }

    $components = [System.Collections.Generic.List[object]]::new()
    while ($remaining.Count -gt 0) {
        $seedKey = $remaining | Select-Object -First 1
        $seedParts = $seedKey.Split(',')
        $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
        $queue.Enqueue([System.Drawing.Point]::new([int]$seedParts[0], [int]$seedParts[1]))
        [void]$remaining.Remove($seedKey)

        $minX = [int]$seedParts[0]
        $maxX = $minX
        $minY = [int]$seedParts[1]
        $maxY = $minY
        $count = 0

        while ($queue.Count -gt 0) {
            $point = $queue.Dequeue()
            $count++
            $minX = [Math]::Min($minX, $point.X)
            $maxX = [Math]::Max($maxX, $point.X)
            $minY = [Math]::Min($minY, $point.Y)
            $maxY = [Math]::Max($maxY, $point.Y)

            for ($dy = -2; $dy -le 2; $dy++) {
                for ($dx = -2; $dx -le 2; $dx++) {
                    if ($dx -eq 0 -and $dy -eq 0) { continue }
                    $neighborKey = "$($point.X + $dx),$($point.Y + $dy)"
                    if ($remaining.Remove($neighborKey)) {
                        $queue.Enqueue([System.Drawing.Point]::new($point.X + $dx, $point.Y + $dy))
                    }
                }
            }
        }

        $components.Add([pscustomobject]@{
            MinX = $minX; MinY = $minY; MaxX = $maxX; MaxY = $maxY; PixelCount = $count
        })
    }

    # Ignore isolated one-pixel noise; mark every meaningful difference.
    $meaningful = @($components | Where-Object { $_.PixelCount -ge 3 })
    if ($meaningful.Count -eq 0) {
        $meaningful = @($components)
    }

    $annotated = [System.Drawing.Bitmap]::new($second)
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($annotated)
        try {
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::Red, 5)
            try {
                foreach ($component in $meaningful) {
                    $centerX = ($component.MinX + $component.MaxX) / 2.0
                    $centerY = ($component.MinY + $component.MaxY) / 2.0
                    $contentWidth = $component.MaxX - $component.MinX + 1
                    $contentHeight = $component.MaxY - $component.MinY + 1
                    $radius = [Math]::Max(18, ([Math]::Max($contentWidth, $contentHeight) / 2.0) + 10)
                    $centerX = [Math]::Max($radius, [Math]::Min($annotated.Width - 1 - $radius, $centerX))
                    $centerY = [Math]::Max($radius, [Math]::Min($annotated.Height - 1 - $radius, $centerY))
                    $graphics.DrawEllipse($pen, [single]($centerX - $radius), [single]($centerY - $radius), [single](2 * $radius), [single](2 * $radius))
                }
            }
            finally {
                $pen.Dispose()
            }
        }
        finally {
            $graphics.Dispose()
        }

        $annotated.Save($OutputImage, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $annotated.Dispose()
    }

    [pscustomobject]@{
        Width = $first.Width
        Height = $first.Height
        DifferentPixels = $different.Count
        MarkedRegions = $meaningful.Count
        Regions = @($meaningful)
        Output = $OutputImage
    } | ConvertTo-Json -Depth 5
}
finally {
    $first.Dispose()
    $second.Dispose()
}
