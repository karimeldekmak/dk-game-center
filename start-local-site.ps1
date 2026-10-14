param(
  [ValidateRange(1, 65535)]
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd([IO.Path]::DirectorySeparatorChar)
$rootPrefix = $root + [IO.Path]::DirectorySeparatorChar
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

$contentTypes = @{
  ".atom" = "application/atom+xml; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".gif" = "image/gif"
  ".html" = "text/html; charset=utf-8"
  ".ico" = "image/x-icon"
  ".jpeg" = "image/jpeg"
  ".jpg" = "image/jpeg"
  ".js" = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
  ".webp" = "image/webp"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
}

try {
  $listener.Start()
  $address = "http://127.0.0.1:$Port/"
  Write-Host "Serving downloaded site from $root"
  Write-Host "Open $address in your browser. Press Ctrl+C to stop."
  Start-Process $address

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response

    try {
      $relativePath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
      if (-not $relativePath) {
        $relativePath = "index.html"
      }

      $relativePath = $relativePath.Replace("/", [IO.Path]::DirectorySeparatorChar)
      $filePath = [IO.Path]::GetFullPath([IO.Path]::Combine($root, $relativePath))
      if (-not $filePath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $response.StatusCode = 404
        $response.ContentType = "text/plain; charset=utf-8"
        $message = [Text.Encoding]::UTF8.GetBytes("Page not found in the downloaded website.")
        $response.ContentLength64 = $message.Length
        if ($context.Request.HttpMethod -ne "HEAD") {
          $response.OutputStream.Write($message, 0, $message.Length)
        }
        Write-Host "404 $($context.Request.Url.AbsolutePath)"
        continue
      }

      $extension = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
      if ($contentTypes.ContainsKey($extension)) {
        $response.ContentType = $contentTypes[$extension]
      } else {
        $response.ContentType = "text/html; charset=utf-8"
      }

      $response.Headers["Content-Disposition"] = "inline"
      $response.Headers["X-Content-Type-Options"] = "nosniff"
      $bytes = [IO.File]::ReadAllBytes($filePath)
      $response.ContentLength64 = $bytes.Length
      if ($context.Request.HttpMethod -ne "HEAD") {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      Write-Host "200 $($context.Request.Url.AbsolutePath)"
    } catch {
      Write-Error "Unable to serve $($context.Request.Url.AbsolutePath): $_"
      $response.StatusCode = 500
    } finally {
      $response.Close()
    }
  }
} catch [System.Net.HttpListenerException] {
  if ($listener.IsListening) {
    throw
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
