$loginBody = @{
    email = "owner@grandazure.test"
    password = "ChangeMe-123!"
    tenant = "grand-azure"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token

$headers = @{
    Authorization = "Bearer $token"
}

$endpoints = @(
    "/hotel/compliance/police-report",
    "/hotel/compliance/form-c",
    "/hotel/keycards/keys",
    "/hotel/reservations",
    "/hotel/rooms",
    "/hotel/room-types",
    "/hotel/upi-settings"
)

foreach ($ep in $endpoints) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-RestMethod -Uri "http://localhost:4000$ep" -Method Get -Headers $headers
    $sw.Stop()
    Write-Host "$ep : $($sw.ElapsedMilliseconds) ms"
}
