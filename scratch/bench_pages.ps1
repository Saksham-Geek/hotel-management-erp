$loginBody = @{
    email = "owner@grandazure.test"
    password = "ChangeMe-123!"
    tenant = "grand-azure"
} | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "http://localhost:4000/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginRes.token

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$cookie = New-Object System.Net.Cookie
$cookie.Name = "erp_token"
$cookie.Value = $token
$cookie.Domain = "localhost"
$session.Cookies.Add($cookie)

$pages = @(
    "/billing",
    "/keycards",
    "/compliance",
    "/rooms",
    "/reservations",
    "/restaurant"
)

foreach ($page in $pages) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-WebRequest -Uri "http://localhost:3000$page" -WebSession $session -Headers @{ "RSC" = "1" }
    $sw.Stop()
    Write-Host "$page (RSC) : $($sw.ElapsedMilliseconds) ms (Size: $($res.RawContentLength) bytes)"
}
