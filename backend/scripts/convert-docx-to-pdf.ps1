$ErrorActionPreference = "Stop"
$docxPath = "C:\Users\ayana\OneDrive\Documents\Project\KnitTrack_Technical_Design_Document.docx"
$pdfPath = "C:\Users\ayana\OneDrive\Documents\Project\docs\assets\KnitTrack_Technical_Design_Document.pdf"

Write-Host "Converting DOCX to PDF via Word COM..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($docxPath, [Type]::Missing, $true)
    $pages = $doc.ComputeStatistics([Microsoft.Office.Interop.Word.WdStatistic]::wdStatisticPages)
    Write-Host "Document page count: $pages"
    
    # 17 = wdExportFormatPDF
    $doc.ExportAsFixedFormat($pdfPath, 17)
    Write-Host "PDF exported successfully to $pdfPath"
    $doc.Close([Microsoft.Office.Interop.Word.WdSaveOptions]::wdDoNotSaveChanges)
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
