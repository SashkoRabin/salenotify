$response = Invoke-WebRequest 'https://zhkckursnlxryccqfzgd.supabase.co/functions/v1/ingest-source' -Method POST -ContentType 'application/json' -Body '{"chain":"kaufland"}' -UseBasicParsing
$data = $response.Content | ConvertFrom-Json

Write-Host "Total ingested: $($data.ingested)"
Write-Host ""
Write-Host "ALL products (looking for snacks):"
Write-Host ""

$snackKeywords = @('pringles', 'lays', 'popcorn', 'chips', 'kreker', 'snack', 'candy', 'salty')

$snackCount = 0
$allCount = 0
$data.preview | ForEach-Object { 
    $allCount++
    $title = $_.title.ToLower()
    $isSnack = $false
    foreach ($keyword in $snackKeywords) {
        if ($title -like "*$keyword*") {
            $snackCount++
            $isSnack = $true
            Write-Host "$allCount. [SNACK] $($_.title) ($($_.discountPercent)%)"
            break
        }
    }
    if (-not $isSnack -and $allCount -le 20) {
        Write-Host "$allCount. $($_.title) ($($_.discountPercent)%)"
    }
}

Write-Host ""
Write-Host "Total snacks found in preview: $snackCount"
