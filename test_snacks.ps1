$response = Invoke-WebRequest 'https://zhkckursnlxryccqfzgd.supabase.co/functions/v1/ingest-source' -Method POST -ContentType 'application/json' -Body '{"chain":"kaufland"}' -UseBasicParsing
$data = $response.Content | ConvertFrom-Json

Write-Host "Total ingested: $($data.ingested)"
Write-Host ""
Write-Host "Searching for snack-like products..."
Write-Host ""

$snackKeywords = @('pringles', 'lays', 'popcorn', 'chips', 'kreker', 'snack', 'candy')

$matches = @()
$data.preview | ForEach-Object { 
    $title = $_.title.ToLower()
    foreach ($keyword in $snackKeywords) {
        if ($title -like "*$keyword*") {
            $matches += $_
            break
        }
    }
}

if ($matches.Count -eq 0) {
    Write-Host "No snack products found in preview"
    Write-Host ""
    Write-Host "All preview products:"
    $data.preview | ForEach-Object {
        Write-Host "- $($_.title)"
    }
} else {
    Write-Host "Found $($matches.Count) snack products:"
    $matches | ForEach-Object {
        Write-Host "- $($_.title)"
    }
}
