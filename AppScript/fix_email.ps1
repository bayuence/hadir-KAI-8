$content = Get-Content 'C:\Users\bayue\Desktop\presensimagangkaiDaop8\AppScript\EmailPengingat.gs' -Raw

$content = $content -replace 'var email\s*=\s*String\(rows\[i\]\[6\].*?;', "var email = '';"
$content = $content -replace 'var noHp\s*=\s*String\(rows\[i\]\[4\].*?;', "var noHp = '';"

Set-Content 'C:\Users\bayue\Desktop\presensimagangkaiDaop8\AppScript\EmailPengingat.gs' -Value $content
