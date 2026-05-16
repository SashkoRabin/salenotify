$url = "https://prodejny.kaufland.cz/nabidka/prehled.html?kloffer-week=current"
$html = (Invoke-WebRequest $url -UseBasicParsing).Content

# Find all href links that contain "kloffer-category"
$matches = [regex]::Matches($html, 'href="[^"]*kloffer-category=([^"&]+)')
$categories = @()
foreach ($match in $matches) {
    $cat = $match.Groups[1].Value
    if ($cat -notin $categories) {
        $categories += $cat
    }
}

Write-Host "Found categories:"
$categories | ForEach-Object { Write-Host "  $_" }
