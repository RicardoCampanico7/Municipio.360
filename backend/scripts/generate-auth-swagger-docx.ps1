[CmdletBinding()]
param(
  [string]$InputPath,
  [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path

if ([string]::IsNullOrWhiteSpace($scriptDirectory)) {
  $scriptDirectory = (Get-Location).Path
}

if ([string]::IsNullOrWhiteSpace($InputPath)) {
  $InputPath = Join-Path $scriptDirectory '..\docs\auth-swagger-documentation.md'
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $scriptDirectory '..\docs\auth-swagger-documentation.docx'
}

function Get-DocumentTitle {
  param(
    [string[]]$Lines,
    [string]$FallbackPath
  )

  foreach ($line in $Lines) {
    if ($line.StartsWith('# ')) {
      return (Remove-MarkdownInlineSyntax $line.Substring(2))
    }
  }

  return [System.IO.Path]::GetFileNameWithoutExtension($FallbackPath)
}

function Escape-XmlText {
  param([string]$Text)

  return [System.Security.SecurityElement]::Escape($Text)
}

function Remove-MarkdownInlineSyntax {
  param([string]$Text)

  return ($Text -replace '`', '').TrimEnd()
}

function New-ParagraphXml {
  param(
    [string]$Text,
    [int]$Size = 22,
    [bool]$Bold = $false
  )

  $escaped = Escape-XmlText -Text $Text
  $boldTag = if ($Bold) { '<w:b/>' } else { '' }

  return "<w:p><w:r><w:rPr>$boldTag<w:sz w:val=`"$Size`"/><w:szCs w:val=`"$Size`"/></w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r></w:p>"
}

function Convert-MarkdownLineToParagraphXml {
  param([string]$Line)

  if ([string]::IsNullOrWhiteSpace($Line)) {
    return New-ParagraphXml -Text ''
  }

  if ($Line.StartsWith('# ')) {
    return New-ParagraphXml -Text (Remove-MarkdownInlineSyntax $Line.Substring(2)) -Size 32 -Bold $true
  }

  if ($Line.StartsWith('## ')) {
    return New-ParagraphXml -Text (Remove-MarkdownInlineSyntax $Line.Substring(3)) -Size 28 -Bold $true
  }

  if ($Line.StartsWith('### ')) {
    return New-ParagraphXml -Text (Remove-MarkdownInlineSyntax $Line.Substring(4)) -Size 24 -Bold $true
  }

  if ($Line.StartsWith('- ')) {
    return New-ParagraphXml -Text ('- ' + (Remove-MarkdownInlineSyntax $Line.Substring(2)))
  }

  return New-ParagraphXml -Text (Remove-MarkdownInlineSyntax $Line)
}

$resolvedInputPath = (Resolve-Path $InputPath).Path
$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Path $resolvedOutputPath -Parent

if (-not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$markdownLines = [System.IO.File]::ReadAllLines($resolvedInputPath)
$documentTitle = Get-DocumentTitle -Lines $markdownLines -FallbackPath $resolvedInputPath
$paragraphs = foreach ($line in $markdownLines) {
  Convert-MarkdownLineToParagraphXml -Line $line
}

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    $($paragraphs -join "`n    ")
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$contentTypesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"@

$relsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"@

$nowUtc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$coreXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>$(Escape-XmlText -Text $documentTitle)</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">$nowUtc</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">$nowUtc</dcterms:modified>
</cp:coreProperties>
"@

$appXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>
"@

$tempRoot = Join-Path $outputDirectory ('.docx-temp-' + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot '_rels') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot 'docProps') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot 'word') | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)

try {
  [System.IO.File]::WriteAllText((Join-Path $tempRoot '[Content_Types].xml'), $contentTypesXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot '_rels/.rels'), $relsXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot 'docProps/core.xml'), $coreXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot 'docProps/app.xml'), $appXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot 'word/document.xml'), $documentXml, $utf8)

  if (Test-Path $resolvedOutputPath) {
    Remove-Item -LiteralPath $resolvedOutputPath -Force
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($tempRoot, $resolvedOutputPath)
}
finally {
  if (Test-Path $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}

Write-Output "DOCX criado em: $resolvedOutputPath"
