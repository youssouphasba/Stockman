function Dump-Screen($name) {
  adb shell uiautomator dump /sdcard/$name.xml | Out-Null
  adb pull /sdcard/$name.xml "C:\Users\Utilisateur\projet_stock\$name.xml" | Out-Null
  [xml]$xml = Get-Content "C:\Users\Utilisateur\projet_stock\$name.xml"
  $nodes = $xml.SelectNodes('//node[@clickable="true"]')
  $out = foreach ($n in $nodes) {
    [pscustomobject]@{
      text = $n.text
      desc = $n.'content-desc'
      class = $n.class
      bounds = $n.bounds
    }
  }
  $out | ConvertTo-Json -Depth 3
}
Dump-Screen 'current_clickables'
