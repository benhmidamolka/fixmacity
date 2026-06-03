$port = 5005
$p = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($p) {
    $p | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
exit 0
