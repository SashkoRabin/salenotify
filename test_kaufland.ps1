$response = Invoke-WebRequest 'https://zhkckursnlxryccqfzgd.supabase.co/functions/v1/ingest-source' -Method POST -ContentType 'application/json' -Body '{"chain":"kaufland"}' -UseBasicParsing
$data = $response.Content | ConvertFrom-Json
Write-Host "Total ingested: $($data.ingested)"
Write-Host ""
Write-Host "First 15 products:"
$data.preview | Select-Object -First 15 | ForEach-Object { 
    Write-Host "- $($_.title) ($($_.discountPercent)%)"
}
