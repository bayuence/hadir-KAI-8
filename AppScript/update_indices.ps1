function Update-Indices {
    param ($content)
    
    # We need to replace regRows[X] or rows[X] with their new indices.
    # The safest way is using regex for specific known index mappings.
    # Old -> New
    # [15] -> [11] (ID Unik)
    # [14] -> [10] (ID Lokasi)
    # [13] -> [9] (Role)
    # [12] -> [8] (Status Akun)
    # [11] -> [7] (Foto Profil URL)
    # [10] -> [6] (Tanggal Selesai)
    # [9]  -> [5] (Tanggal Mulai)
    # [8]  -> [4] (Jurusan)
    # [7]  -> [3] (Kampus)
    # [5]  -> [2] (NIM)
    # NOTE: We only want to replace this when it's indexing regRows, rows, allRegRows, rRows, etc. NOT pRows (presensi)!
    # Let's match: (rows|regRows|allRegRows|rRows|peserta)\[[^\]]*\]\[OLD_INDEX\]
    
    $replacements = @{
        '15' = '11'
        '14' = '10'
        '13' = '9'
        '12' = '8'
        '11' = '7'
        '10' = '6'
        '9'  = '5'
        '8'  = '4'
        '7'  = '3'
        '5'  = '2'
    }
    
    # Regex to match the variable names and the first bracket [i] or [r] or whatever.
    $pattern = '((?:regRows|rows|allRegRows|rRows|peserta)(?:\[[^\]]+\])?)\[(\d+)\]'
    
    $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, {
        param ($match)
        $varPart = $match.Groups[1].Value
        $oldIndex = $match.Groups[2].Value
        
        if ($replacements.ContainsKey($oldIndex)) {
            return "$varPart" + '[' + $replacements[$oldIndex] + ']'
        }
        return $match.Value
    })
    
    return $newContent
}

$files = Get-ChildItem -Path "C:\Users\bayue\Desktop\presensimagangkaiDaop8\AppScript" -Filter "*.gs"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = Update-Indices -content $content
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent
        Write-Host "Updated $($file.Name)"
    }
}
