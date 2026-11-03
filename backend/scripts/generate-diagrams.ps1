# KnitTrack Architecture & Workflow Diagram Generator
# Generates 5 high-resolution, professional PNG diagrams for the Technical Design Document

Add-Type -AssemblyName System.Drawing

$assetsDir = "C:\Users\ayana\OneDrive\Documents\Project\docs\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

# Color Palette Definitions
$cWhite      = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$cSlate50    = [System.Drawing.Color]::FromArgb(255, 248, 250, 252)
$cSlate100   = [System.Drawing.Color]::FromArgb(255, 241, 245, 249)
$cSlate200   = [System.Drawing.Color]::FromArgb(255, 226, 232, 240)
$cSlate300   = [System.Drawing.Color]::FromArgb(255, 203, 213, 225)
$cSlate400   = [System.Drawing.Color]::FromArgb(255, 148, 163, 184)
$cSlate600   = [System.Drawing.Color]::FromArgb(255, 71, 85, 105)
$cSlate700   = [System.Drawing.Color]::FromArgb(255, 51, 65, 85)
$cSlate800   = [System.Drawing.Color]::FromArgb(255, 30, 41, 59)
$cSlate900   = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)

$cNavyDark   = [System.Drawing.Color]::FromArgb(255, 30, 58, 138)  # #1E3A8A
$cBlueMid    = [System.Drawing.Color]::FromArgb(255, 59, 130, 246) # #3B82F6
$cBlueLight  = [System.Drawing.Color]::FromArgb(255, 239, 246, 255)# #EFF6FF
$cBlueBorder = [System.Drawing.Color]::FromArgb(255, 191, 219, 254)# #BFDBFE

$cGreenDark  = [System.Drawing.Color]::FromArgb(255, 6, 95, 70)    # #065F46
$cGreenLight = [System.Drawing.Color]::FromArgb(255, 236, 253, 245)# #ECFDF5
$cGreenBorder= [System.Drawing.Color]::FromArgb(255, 167, 243, 208)# #A7F3D0

$cAmberDark  = [System.Drawing.Color]::FromArgb(255, 146, 64, 14)  # #92400E
$cAmberLight = [System.Drawing.Color]::FromArgb(255, 254, 243, 199)# #FEF3C7
$cAmberBorder= [System.Drawing.Color]::FromArgb(255, 253, 230, 138)# #FDE68A

$cRedDark    = [System.Drawing.Color]::FromArgb(255, 153, 27, 27)  # #991B1B
$cRedLight   = [System.Drawing.Color]::FromArgb(255, 254, 242, 242)# #FEF2F2
$cRedBorder  = [System.Drawing.Color]::FromArgb(255, 254, 202, 202)# #FECACA

# Reusable Fonts
$fTitle      = New-Object System.Drawing.Font ("Segoe UI", [float]14, [System.Drawing.FontStyle]::Bold)
$fSubTitle   = New-Object System.Drawing.Font ("Segoe UI", [float]9, [System.Drawing.FontStyle]::Regular)
$fSectionHdr = New-Object System.Drawing.Font ("Segoe UI", [float]10, [System.Drawing.FontStyle]::Bold)
$fCardTitle  = New-Object System.Drawing.Font ("Segoe UI", [float]9.5, [System.Drawing.FontStyle]::Bold)
$fCardBody   = New-Object System.Drawing.Font ("Segoe UI", [float]8.5, [System.Drawing.FontStyle]::Regular)
$fCardBodyBld= New-Object System.Drawing.Font ("Segoe UI", [float]8.5, [System.Drawing.FontStyle]::Bold)
$fSmall      = New-Object System.Drawing.Font ("Segoe UI", [float]7.5, [System.Drawing.FontStyle]::Regular)
$fSmallBold  = New-Object System.Drawing.Font ("Segoe UI", [float]7.5, [System.Drawing.FontStyle]::Bold)

function Draw-Card {
    param(
        $g, [float]$x, [float]$y, [float]$w, [float]$h,
        $title, $lines, $bgColor, $borderColor, $headerColor, $isAccent=$false
    )
    # Fill background
    $brush = New-Object System.Drawing.SolidBrush $bgColor
    $g.FillRectangle($brush, $x, $y, $w, $h)
    $brush.Dispose()

    # Border
    $pen = New-Object System.Drawing.Pen $borderColor, 1.5
    $g.DrawRectangle($pen, $x, $y, $w, $h)
    $pen.Dispose()

    # Top accent bar if accent
    if ($isAccent) {
        $accBrush = New-Object System.Drawing.SolidBrush $headerColor
        $g.FillRectangle($accBrush, $x, $y, $w, [float]4)
        $accBrush.Dispose()
    }

    # Card Title
    $titleBrush = New-Object System.Drawing.SolidBrush $headerColor
    $g.DrawString($title, $fCardTitle, $titleBrush, ($x + 8), ($y + 8))
    $titleBrush.Dispose()

    # Card Body Lines
    $textBrush = New-Object System.Drawing.SolidBrush $cSlate700
    $curY = $y + 26
    foreach ($line in $lines) {
        $g.DrawString($line, $fCardBody, $textBrush, ($x + 8), $curY)
        $curY += 15
    }
    $textBrush.Dispose()
}

function Draw-Arrow {
    param($g, [float]$x1, [float]$y1, [float]$x2, [float]$y2, $color, $label="")
    $pen = New-Object System.Drawing.Pen $color, 1.5
    $pen.CustomEndCap = New-Object System.Drawing.Drawing2D.AdjustableArrowCap(4, 4, $true)
    $g.DrawLine($pen, $x1, $y1, $x2, $y2)
    $pen.Dispose()

    if ($label -ne "") {
        $lblBrush = New-Object System.Drawing.SolidBrush $cSlate600
        $midX = ($x1 + $x2) / 2
        $midY = ($y1 + $y2) / 2 - 12
        $g.DrawString($label, $fSmall, $lblBrush, $midX, $midY)
        $lblBrush.Dispose()
    }
}

# ==============================================================================
# DIAGRAM 1: SYSTEM ARCHITECTURE DIAGRAM
# ==============================================================================
Write-Host "Rendering Figure 1: System Architecture..."
$w = 1200; $h = 800
$bmp1 = New-Object System.Drawing.Bitmap $w, $h
$g1 = [System.Drawing.Graphics]::FromImage($bmp1)
$g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g1.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Canvas background
$bg1 = New-Object System.Drawing.SolidBrush $cWhite
$g1.FillRectangle($bg1, 0, 0, $w, $h)
$bg1.Dispose()

# Banner Header
$hdr1 = New-Object System.Drawing.SolidBrush $cSlate900
$g1.FillRectangle($hdr1, 0, 0, $w, 55)
$hdr1.Dispose()
$whiteBrush = New-Object System.Drawing.SolidBrush $cWhite
$g1.DrawString("KnitTrack - High-Level System Architecture", $fTitle, $whiteBrush, [float]20, [float]14)
$g1.DrawString("Multi-Tier Client/Server Architecture with Deterministic Delay Engine & AI Note Classification", $fSubTitle, $whiteBrush, [float]600, [float]18)

# Tier 1: Client Layer
$t1Bg = New-Object System.Drawing.SolidBrush $cSlate50
$g1.FillRectangle($t1Bg, 20, 70, 1160, 130)
$t1Bg.Dispose()
$penSlate = New-Object System.Drawing.Pen $cSlate300, 1
$g1.DrawRectangle($penSlate, 20, 70, 1160, 130)
$hdrText = New-Object System.Drawing.SolidBrush $cNavyDark
$g1.DrawString("TIER 1: PRESENTATION LAYER (CLIENT APPLICATIONS)", $fSectionHdr, $hdrText, [float]30, [float]78)

Draw-Card $g1 35 102 360 85 "Merchandiser Desktop Portal" @("React 19 SPA, Tailwind CSS v4, Lucide Icons", "Order Management, Milestone TNA, Run-Rate Analytics", "AI Classification Audit & Category Correction Modal") $cWhite $cSlate300 $cNavyDark $true
Draw-Card $g1 415 102 360 85 "Supervisor Mobile Web UI" @("Responsive Touch UI (Optimized for Android / Tiruppur)", "Single-Screen Daily Output Logging (Pieces & Shift)", "Tamil Voice/Text Note Entry & Factory Floor Photo Upload") $cWhite $cSlate300 $cNavyDark $true
Draw-Card $g1 795 102 365 85 "Buyer Read-Only Portal" @("Tenant-Scoped External Dashboard (Company B/C)", "Live Ex-Factory Countdown & Milestone Progress Bars", "Approved Stage Photos (Zero Access to Factory Cost Sheets)") $cWhite $cSlate300 $cNavyDark $true

# Protocol Arrow
Draw-Arrow $g1 600 200 600 230 $cSlate400 "HTTPS / REST API / JSON / HttpOnly JWT Cookie"

# Tier 2: API Gateway & Middleware
$t2Bg = New-Object System.Drawing.SolidBrush $cSlate50
$g1.FillRectangle($t2Bg, 20, 230, 1160, 110)
$t2Bg.Dispose()
$g1.DrawRectangle($penSlate, 20, 230, 1160, 110)
$g1.DrawString("TIER 2: API GATEWAY & SECURITY MIDDLEWARE (NODE.JS 18+ / EXPRESS 4.21)", $fSectionHdr, $hdrText, [float]30, [float]238)

Draw-Card $g1 35 260 215 70 "Security Headers" @("Helmet Middleware", "CORS Restricted Origin", "XSS / Sniff Protection") $cWhite $cSlate300 $cSlate800 $false
Draw-Card $g1 265 260 215 70 "Rate Limiter" @("Dev: 5,000 req / 15 min", "Prod: 100 req / 15 min", "Auth: 200 (dev) / 10 (prod)") $cWhite $cSlate300 $cSlate800 $false
Draw-Card $g1 495 260 215 70 "JWT Cookie Auth" @("HttpOnly, SameSite=Lax", "HMAC SHA-256 Signature", "Session Invalidation on Logout") $cWhite $cSlate300 $cSlate800 $false
Draw-Card $g1 725 260 215 70 "Server-Side RBAC" @("requireRole Middleware", "ADMIN / MERCHANDISER", "SUPERVISOR / BUYER Scopes") $cWhite $cSlate300 $cSlate800 $false
Draw-Card $g1 955 260 210 70 "Input & File Validation" @("Zod Schema Validation", "Multer: image/jpeg, png, webp", "Strict 5 MB Upload Cap") $cWhite $cSlate300 $cSlate800 $false

Draw-Arrow $g1 600 340 600 370 $cSlate400 "Internal Route Handlers & Controllers"

# Tier 3: Core Domain Application Services
$t3Bg = New-Object System.Drawing.SolidBrush $cSlate50
$g1.FillRectangle($t3Bg, 20, 370, 1160, 185)
$t3Bg.Dispose()
$g1.DrawRectangle($penSlate, 20, 370, 1160, 185)
$g1.DrawString("TIER 3: CORE DOMAIN APPLICATION SERVICES (BUSINESS LOGIC ENGINE)", $fSectionHdr, $hdrText, [float]30, [float]378)

Draw-Card $g1 35 400 270 140 "Order & Milestone Service" @("PO Creation & Multi-Size Breakdowns", "TNA Sequential Stage Progression", "Cutting, Stitching, Washing, Packing", "Idempotent Status Transitions", "Tenant Isolation Enforcement") $cBlueLight $cBlueBorder $cNavyDark $true
Draw-Card $g1 320 400 270 140 "Deterministic Delay Engine" @("5-Day Business Week (Mon-Fri Math)", "Actual Run Rate: Completed / Elapsed", "Required Run Rate: Remaining / Left", "Projected Completion Date & Delay", "Risk Badges: ON_TRACK, AT_RISK, DELAYED") $cGreenLight $cGreenBorder $cGreenDark $true
Draw-Card $g1 605 400 270 140 "AI Production Note Classifier" @("Google Gemini 1.5/2.0 Flash Integration", "Tamil & English Translation & Extraction", "8 Standardized Knitwear Categories", "Deterministic Regex Fallback Dictionary", "Audit Log on Merchandiser Edits") $cAmberLight $cAmberBorder $cAmberDark $true
Draw-Card $g1 890 400 275 140 "Analytics & Floor Service" @("Executive KPI Aggregations", "Unit-Level Throughput & Capacity", "Supervisor Daily Output Entry", "Compound Unique Constraint Guards", "Subcontract Unit Milestone Tracking") $cWhite $cSlate300 $cSlate800 $true

Draw-Arrow $g1 600 555 600 585 $cSlate400 "Prisma Client (Type-Safe Query Engine) / REST API / Disk I/O"

# Tier 4: Persistence, AI, and Storage Layer
$t4Bg = New-Object System.Drawing.SolidBrush $cSlate50
$g1.FillRectangle($t4Bg, 20, 585, 1160, 175)
$t4Bg.Dispose()
$g1.DrawRectangle($penSlate, 20, 585, 1160, 175)
$g1.DrawString("TIER 4: PERSISTENCE, EXTERNAL AI & STORAGE LAYER", $fSectionHdr, $hdrText, [float]30, [float]593)

Draw-Card $g1 35 615 360 130 "Prisma ORM 5.22" @("Type-Safe Database Client & Query Builder", "Prisma Schema Declarative Data Model", "Connection Pooling & Transaction Support", "Automated Migrations (npx prisma db push)", "Seeded Demo Data Harness (seed.ts)") $cWhite $cSlate300 $cNavyDark $false
Draw-Card $g1 415 615 360 130 "PostgreSQL 17 Relational Database" @("3NF Normalized Relational Architecture", "Foreign Keys with Referential Integrity (CASCADE)", "Compound Unique Constraints on Daily Updates", "Indexed PO Numbers, Buyer IDs, & Stages", "Row-Level Query Scoping: where { buyerId }") $cBlueLight $cBlueBorder $cNavyDark $true
Draw-Card $g1 795 615 365 130 "External Services & Storage" @("Google Gemini AI API (Cloud LLM Endpoint)", "Local Disk Storage (backend/uploads/)", "Preserved Original Tamil Strings (originalNote)", "AuditLog Table for Category Corrections", "V2 Cloud Roadmap: AWS S3 + Redis Cache") $cWhite $cSlate300 $cSlate800 $false

$whiteBrush.Dispose()

$bmp1.Save("$assetsDir\figure1_system_architecture.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g1.Dispose()
$bmp1.Dispose()
Write-Host " Figure 1 saved."

# ==============================================================================
# DIAGRAM 2: DATABASE ENTITY-RELATIONSHIP (ER) DIAGRAM
# ==============================================================================
Write-Host "Rendering Figure 2: Database ER Diagram..."
$w = 1200; $h = 760
$bmp2 = New-Object System.Drawing.Bitmap $w, $h
$g2 = [System.Drawing.Graphics]::FromImage($bmp2)
$g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g2.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bg2 = New-Object System.Drawing.SolidBrush $cWhite
$g2.FillRectangle($bg2, 0, 0, $w, $h)
$bg2.Dispose()

$hdr2 = New-Object System.Drawing.SolidBrush $cSlate900
$g2.FillRectangle($hdr2, 0, 0, $w, 55)
$hdr2.Dispose()
$whiteBrush = New-Object System.Drawing.SolidBrush $cWhite
$g2.DrawString("KnitTrack - Relational Database Schema & Entity Relationships", $fTitle, $whiteBrush, [float]20, [float]14)
$g2.DrawString("Normalized 3NF PostgreSQL Schema Managed via Prisma ORM 5.22", $fSubTitle, $whiteBrush, [float]700, [float]18)

# Entities Cards
Draw-Card $g2 30 75 250 155 "User" @("PK: id (String / CUID)", "email (String, UNIQUE)", "passwordHash (String, bcrypt)", "name (String)", "role (Enum: ADMIN, MERCH...)", "buyerId (FK -> Buyer, Nullable)", "productionUnitId (FK -> Unit)", "createdAt (DateTime)") $cWhite $cSlate300 $cNavyDark $true

Draw-Card $g2 320 75 250 140 "Buyer" @("PK: id (String / CUID)", "name (String)", "code (String, UNIQUE)", "contactEmail (String)", "country (String)", "createdAt (DateTime)", "1:N -> ProductionOrders", "1:N -> BuyerAccessTokens") $cBlueLight $cBlueBorder $cNavyDark $true

Draw-Card $g2 610 75 250 140 "ProductionUnit" @("PK: id (String / CUID)", "name (String)", "location (String: Tiruppur)", "capacity (Int: daily pieces)", "createdAt (DateTime)", "1:N -> ProductionOrders", "1:N -> Assigned Users") $cWhite $cSlate300 $cNavyDark $true

Draw-Card $g2 900 75 270 140 "BuyerAccessToken" @("PK: id (String / CUID)", "buyerId (FK -> Buyer)", "token (String, UNIQUE)", "expiresAt (DateTime)", "createdAt (DateTime)", "Magic-link read-only access", "Scoped strictly to buyer orders") $cWhite $cSlate300 $cSlate800 $false

Draw-Card $g2 320 260 380 200 "ProductionOrder" @("PK: id (String / CUID)", "poNumber (String, UNIQUE: 'B-PO-88213')", "styleName (String: 'Crew neck tee')", "buyerId (FK -> Buyer, CASCADE)", "productionUnitId (FK -> ProductionUnit)", "totalQuantity (Int: 12000)", "plannedStartDate, plannedEndDate (DateTime)", "exFactoryDate (DateTime: Milestone Deadline)", "status (Enum: DRAFT, CONFIRMED, IN_PROD...)", "sizeBreakdown (JSON: S/M/L/XL ratios)", "createdById (FK -> User)") $cBlueLight $cBlueBorder $cNavyDark $true

Draw-Card $g2 750 260 380 200 "OrderStage" @("PK: id (String / CUID)", "orderId (FK -> ProductionOrder, CASCADE)", "stageName (String: Cutting, Stitching...)", "sequence (Int: 1, 2, 3, 4, 5, 6)", "plannedStartDate, plannedEndDate (DateTime)", "actualStartDate, actualEndDate (DateTime)", "plannedQuantity (Int: 12000)", "completedQuantity (Int: 6800)", "status (Enum: NOT_STARTED, IN_PROGRESS...)", "UNIQUE CONSTRAINT: [orderId, stageName]") $cGreenLight $cGreenBorder $cGreenDark $true

Draw-Card $g2 320 510 380 220 "ProductionUpdate" @("PK: id (String / CUID)", "orderStageId (FK -> OrderStage, CASCADE)", "supervisorId (FK -> User)", "date (DateTime: Date of output entry)", "quantity (Int: daily pieces produced)", "originalNote (String: Tamil/English floor log)", "aiCategory (String: 8 standardized categories)", "aiConfidence (Float: 0.0 - 1.0)", "correctedCategory (String, Nullable: Merch Edit)", "fallbackMode (Boolean: true if regex fallback)", "UNIQUE CONSTRAINT: [orderStageId, supervisorId, date]") $cAmberLight $cAmberBorder $cAmberDark $true

Draw-Card $g2 750 510 200 130 "ProductionPhoto" @("PK: id (String / CUID)", "orderStageId (FK -> OrderStage)", "filePath (String: Multer disk)", "caption (String, Nullable)", "uploadedAt (DateTime)", "MIME validated: jpg/png/webp") $cWhite $cSlate300 $cSlate800 $false

Draw-Card $g2 970 510 200 130 "AuditLog" @("PK: id (String / CUID)", "updateId (FK -> ProductionUpdate)", "userId (FK -> User)", "previousCategory (String)", "newCategory (String)", "timestamp (DateTime)", "Audit trail for AI edits") $cWhite $cSlate300 $cSlate800 $false

# Relationships
Draw-Arrow $g2 445 215 445 260 $cBlueMid "1:N (buyerId)"
Draw-Arrow $g2 650 215 550 260 $cBlueMid "1:N (unitId)"
Draw-Arrow $g2 570 145 900 145 $cSlate400 "1:N (buyerId)"
Draw-Arrow $g2 700 350 750 350 $cBlueMid "1:N (orderId, CASCADE)"
Draw-Arrow $g2 840 460 600 510 $cBlueMid "1:N (orderStageId, CASCADE)"
Draw-Arrow $g2 850 460 850 510 $cSlate400 "1:N (orderStageId)"
Draw-Arrow $g2 700 580 970 580 $cAmberDark "1:N (updateId)"

$whiteBrush.Dispose()
$bmp2.Save("$assetsDir\figure2_database_er.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$bmp2.Dispose()
Write-Host " Figure 2 saved."

# ==============================================================================
# DIAGRAM 3: ORDER LIFECYCLE & PRODUCTION WORKFLOW
# ==============================================================================
Write-Host "Rendering Figure 3: Order Lifecycle Workflow..."
$w = 1200; $h = 740
$bmp3 = New-Object System.Drawing.Bitmap $w, $h
$g3 = [System.Drawing.Graphics]::FromImage($bmp3)
$g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g3.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bg3 = New-Object System.Drawing.SolidBrush $cWhite
$g3.FillRectangle($bg3, 0, 0, $w, $h)
$bg3.Dispose()

$hdr3 = New-Object System.Drawing.SolidBrush $cSlate900
$g3.FillRectangle($hdr3, 0, 0, $w, 55)
$hdr3.Dispose()
$whiteBrush = New-Object System.Drawing.SolidBrush $cWhite
$g3.DrawString("KnitTrack - End-to-End Knitwear Production Order Lifecycle", $fTitle, $whiteBrush, [float]20, [float]14)
$g3.DrawString("Sequential Time-and-Action (TNA) Milestones from Purchase Order to Ex-Factory", $fSubTitle, $whiteBrush, [float]600, [float]18)

# Swimlanes
$lane1Bg = New-Object System.Drawing.SolidBrush $cSlate50
$g3.FillRectangle($lane1Bg, 20, 75, 1160, 140)
$lane1Bg.Dispose()
$g3.DrawRectangle($penSlate, 20, 75, 1160, 140)
$g3.DrawString("MERCHANDISING & PLANNING (OFFICE)", $fSectionHdr, $hdrText, [float]30, [float]82)

Draw-Card $g3 35 105 260 95 "1. PO Creation & TNA Setup" @("Merchandiser inputs buyer & PO#", "Sets style, total qty, & ex-factory", "Configures size ratios in JSON", "Initializes TNA stage milestones") $cWhite $cSlate300 $cNavyDark $true
Draw-Card $g3 325 105 260 95 "2. Factory Unit Assignment" @("Assigns order to Unit 1, 2, or 3", "Locks planned start/end dates", "Sets planned piece counts per stage", "Order moves to CONFIRMED state") $cWhite $cSlate300 $cNavyDark $true
Draw-Card $g3 615 105 260 95 "6. AI Classification Audit" @("Merchandiser reviews floor notes", "Inspects AI classified delay reason", "Inline modal for manual correction", "AuditLog record created on change") $cAmberLight $cAmberBorder $cAmberDark $true
Draw-Card $g3 905 105 260 95 "7. Management Delay Review" @("High-level dashboard shows risk", "Bottleneck stages highlighted", "Corrective actions deployed on floor", "Milestone sign-off on completion") $cWhite $cSlate300 $cSlate800 $true

# Floor Execution Swimlane
$lane2Bg = New-Object System.Drawing.SolidBrush $cBlueLight
$g3.FillRectangle($lane2Bg, 20, 240, 1160, 210)
$lane2Bg.Dispose()
$g3.DrawRectangle($penSlate, 20, 240, 1160, 210)
$g3.DrawString("FACTORY FLOOR EXECUTION & SUPERVISOR LOGGING (TIRUPPUR UNITS 1, 2, 3)", $fSectionHdr, $hdrText, [float]30, [float]248)

Draw-Card $g3 35 275 210 160 "Stage Progression" @("1. Cutting (Fabric roll)", "2. Printing / Washing", "3. Stitching (Assembly)", "4. Finishing (Iron/QC)", "5. Packing (Cartoning)", "6. Shipment Ready") $cWhite $cSlate300 $cNavyDark $true
Draw-Card $g3 270 275 280 160 "3. Supervisor Daily Logging" @("Supervisor opens mobile screen", "Selects active stage milestone", "Inputs shift quantity completed", "Types/voices Tamil/English note", "Attaches floor assembly photo", "Compound unique constraint blocks duplicate submissions") $cWhite $cSlate300 $cNavyDark $true
Draw-Card $g3 575 275 295 160 "4. AI Note Classifier Engine" @("Node backend checks Google Gemini API", "Extracts standard category:", " Machine breakdown  Labour shortage", " Material delay   Quality defect", " Power outage     Supplier issue", "Fallback to regex keyword dictionary if offline or timed out (>8s)") $cAmberLight $cAmberBorder $cAmberDark $true
Draw-Card $g3 895 275 270 160 "5. Delay Engine Calculation" @("Recalculates business days left", "Actual Run Rate = Completed/Days", "Required Rate = Left/Remain Days", "Determines projected finish date", "Calculates projected delay days", "Updates status: GREEN / AMBER / RED") $cGreenLight $cGreenBorder $cGreenDark $true

# External Buyer Swimlane
$lane3Bg = New-Object System.Drawing.SolidBrush $cSlate50
$g3.FillRectangle($lane3Bg, 20, 475, 1160, 235)
$lane3Bg.Dispose()
$g3.DrawRectangle($penSlate, 20, 475, 1160, 235)
$g3.DrawString("EXTERNAL BUYER VISIBILITY & TRANSPARENCY (TENANT-ISOLATED PORTAL)", $fSectionHdr, $hdrText, [float]30, [float]483)

Draw-Card $g3 35 510 350 185 "Buyer Authentication & Scoping" @("Buyer logs in with brand account", "JWT contains buyerId claim", "Backend filters where: { buyerId }", "Buyer B strictly isolated from Buyer C", "Magic-link token support verified", "Read-only GET endpoints only") $cWhite $cSlate300 $cNavyDark $true
Draw-Card $g3 415 510 360 185 "Transparent Milestone Tracking" @("Real-time ex-factory countdown timer", "Progress bar per stage (% completed)", "Plain-English delay explanation:", "'At current rate of 350 pcs/day, this order requires 15 days, but only 10 remain. Projected delay: 5 days.'", "Zero visibility into internal costs") $cBlueLight $cBlueBorder $cNavyDark $true
Draw-Card $g3 805 510 360 185 "Quality & Assembly Photographs" @("Inspects high-resolution floor photos", "Stitching seams, printing quality", "Packaging labels and carton barcodes", "Pre-shipment verification without international travel overhead") $cWhite $cSlate300 $cSlate800 $true

# Workflow Arrows
Draw-Arrow $g3 295 150 325 150 $cBlueMid
Draw-Arrow $g3 455 200 455 275 $cBlueMid
Draw-Arrow $g3 550 355 575 355 $cAmberDark
Draw-Arrow $g3 870 355 895 355 $cGreenDark
Draw-Arrow $g3 980 275 980 200 $cSlate400
Draw-Arrow $g3 745 200 745 275 $cAmberDark
Draw-Arrow $g3 1030 435 600 510 $cBlueMid

$whiteBrush.Dispose()
$bmp3.Save("$assetsDir\figure3_order_lifecycle.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$bmp3.Dispose()
Write-Host " Figure 3 saved."

# ==============================================================================
# DIAGRAM 4: DELAY PREDICTION ENGINE FLOWCHART
# ==============================================================================
Write-Host "Rendering Figure 4: Delay Prediction Flowchart..."
$w = 1200; $h = 760
$bmp4 = New-Object System.Drawing.Bitmap $w, $h
$g4 = [System.Drawing.Graphics]::FromImage($bmp4)
$g4.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g4.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bg4 = New-Object System.Drawing.SolidBrush $cWhite
$g4.FillRectangle($bg4, 0, 0, $w, $h)
$bg4.Dispose()

$hdr4 = New-Object System.Drawing.SolidBrush $cSlate900
$g4.FillRectangle($hdr4, 0, 0, $w, 55)
$hdr4.Dispose()
$whiteBrush = New-Object System.Drawing.SolidBrush $cWhite
$g4.DrawString("KnitTrack - Deterministic Delay Prediction Engine Flowchart", $fTitle, $whiteBrush, [float]20, [float]14)
$g4.DrawString("Transparent 5-Day Business Week Mathematical Run-Rate Model (Zero Black-Box ML)", $fSubTitle, $whiteBrush, [float]600, [float]18)

# Input Box
Draw-Card $g4 400 75 400 65 "1. INPUT STAGE METRICS" @("Planned Qty (P), Completed Qty (C), Planned Start/End Dates", "Actual Start Date, Reference Date (Today / Current IST)") $cWhite $cSlate300 $cNavyDark $true

Draw-Arrow $g4 600 140 600 170 $cSlate400

# Decision 1: Completed?
Draw-Card $g4 400 170 400 60 "2. IS STAGE COMPLETED?" @("Check condition: Completed Qty >= Planned Qty") $cWhite $cSlate300 $cSlate800 $false

Draw-Arrow $g4 800 200 950 200 $cGreenDark "YES"
Draw-Card $g4 950 170 210 60 "ON_TRACK (Green)" @("Delay = 0 days", "Stage completed successfully") $cGreenLight $cGreenBorder $cGreenDark $true

Draw-Arrow $g4 600 230 600 260 $cSlate400 "NO"

# Decision 2: Deadline Passed?
Draw-Card $g4 350 260 500 65 "3. HAS PLANNED END DATE PASSED?" @("Check condition: Reference Date > Planned End Date AND Remaining Qty > 0") $cWhite $cSlate300 $cSlate800 $false

Draw-Arrow $g4 850 292 950 292 $cRedDark "YES"
Draw-Card $g4 950 265 210 60 "DELAYED (Red)" @("Deadline passed with open qty", "Immediate escalation required") $cRedLight $cRedBorder $cRedDark $true

Draw-Arrow $g4 600 325 600 355 $cSlate400 "NO"

# Calculation Step
Draw-Card $g4 100 355 1000 135 "4. BUSINESS-DAY RUN RATE CALCULATIONS (MONDAY - FRIDAY 5-DAY WEEK)" @(
    " Remaining Quantity = Planned Quantity - Completed Quantity",
    " Elapsed Business Days = Working days between Actual Start Date and Reference Date (excluding Saturdays & Sundays)",
    " Actual Daily Run Rate = Completed Quantity / Elapsed Business Days (if elapsed > 0, else Completed Qty)",
    " Remaining Business Days = Working days between Reference Date and Planned End Date",
    " Required Daily Run Rate = Remaining Quantity / Remaining Business Days (if remaining days > 0)",
    " Estimated Completion Days = Remaining Quantity / Actual Daily Run Rate",
    " Projected Completion Date = Reference Date + Estimated Completion Days (in business days)",
    " Projected Delay Days = Projected Completion Date - Planned End Date"
) $cBlueLight $cBlueBorder $cNavyDark $true

Draw-Arrow $g4 600 490 600 520 $cSlate400

# Classification Gate
Draw-Card $g4 350 520 500 60 "5. RISK THRESHOLD EVALUATION" @("Evaluate Projected Delay Days & Required vs Actual Rate Ratio") $cWhite $cSlate300 $cSlate800 $false

Draw-Arrow $g4 400 580 200 630 $cGreenDark "Projected Delay <= 0"
Draw-Arrow $g4 600 580 600 630 $cAmberDark "Delay 1-3 Days OR Required > 1.2 * Actual"
Draw-Arrow $g4 800 580 1000 630 $cRedDark "Projected Delay > 3 Days"

# Output Badges
Draw-Card $g4 50 630 330 105 "ON_TRACK (Green)" @(" Projected finish on or before deadline", " Production pace meets required schedule", " Badge displayed on Merchandiser & Buyer screens", " Plain-English explanation generated") $cGreenLight $cGreenBorder $cGreenDark $true
Draw-Card $g4 435 630 330 105 "AT_RISK (Amber)" @(" Projected delay 1 to 3 business days", " OR Required Rate > 120% of Actual Rate", " Alert flagged to merchandiser for intervention", " Early floor overtime or line rebalancing") $cAmberLight $cAmberBorder $cAmberDark $true
Draw-Card $g4 820 630 330 105 "DELAYED (Red)" @(" Projected delay exceeds 3 business days", " OR Deadline passed with remaining work", " Critical bottleneck alert on dashboard", " Triggers priority management intervention") $cRedLight $cRedBorder $cRedDark $true

$whiteBrush.Dispose()
$bmp4.Save("$assetsDir\figure4_delay_prediction.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g4.Dispose()
$bmp4.Dispose()
Write-Host " Figure 4 saved."

# ==============================================================================
# DIAGRAM 5: RBAC & BUYER TENANT ISOLATION ARCHITECTURE
# ==============================================================================
Write-Host "Rendering Figure 5: RBAC & Tenant Isolation..."
$w = 1200; $h = 720
$bmp5 = New-Object System.Drawing.Bitmap $w, $h
$g5 = [System.Drawing.Graphics]::FromImage($bmp5)
$g5.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g5.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bg5 = New-Object System.Drawing.SolidBrush $cWhite
$g5.FillRectangle($bg5, 0, 0, $w, $h)
$bg5.Dispose()

$hdr5 = New-Object System.Drawing.SolidBrush $cSlate900
$g5.FillRectangle($hdr5, 0, 0, $w, 55)
$hdr5.Dispose()
$whiteBrush = New-Object System.Drawing.SolidBrush $cWhite
$g5.DrawString("KnitTrack - Server-Side RBAC & Multi-Tenant Data Isolation", $fTitle, $whiteBrush, [float]20, [float]14)
$g5.DrawString("HttpOnly JWT Authentication, Server-Side Role Guards & Row-Level Tenant Scoping", $fSubTitle, $whiteBrush, [float]600, [float]18)

# Flow from Top
Draw-Card $g5 400 75 400 65 "1. INCOMING HTTP REQUEST" @("Client sends request with credentials: include", "Cookie header: token=<jwt_token> (HttpOnly, SameSite=Lax)") $cWhite $cSlate300 $cNavyDark $true

Draw-Arrow $g5 600 140 600 170 $cSlate400

Draw-Card $g5 350 170 500 70 "2. JWT AUTHENTICATION MIDDLEWARE (verifyToken)" @("1. Verify HMAC SHA-256 signature using process.env.JWT_SECRET", "2. Reject invalid or expired tokens with HTTP 401 Unauthorized", "3. Attach authenticated payload to request: req.user = { id, role, buyerId, productionUnitId }") $cBlueLight $cBlueBorder $cNavyDark $true

Draw-Arrow $g5 600 240 600 270 $cSlate400

Draw-Card $g5 350 270 500 65 "3. ROLE-BASED ACCESS CONTROL (requireRole Middleware)" @("Checks if req.user.role is authorized for endpoint", "If role not permitted -> HTTP 403 Forbidden (RBAC Guard)") $cWhite $cSlate300 $cSlate800 $false

Draw-Arrow $g5 400 335 220 380 $cBlueMid "BUYER Role"
Draw-Arrow $g5 600 335 600 380 $cSlate600 "SUPERVISOR Role"
Draw-Arrow $g5 800 335 980 380 $cNavyDark "MERCHANDISER / ADMIN"

# Role Branches
Draw-Card $g5 40 380 360 200 "BUYER TENANT ISOLATION" @(
    " Endpoint: /api/buyer/orders",
    "  Injected Query: where: { buyerId: req.user.buyerId }",
    " Endpoint: /api/orders/:id",
    "  Verification: order.buyerId === req.user.buyerId",
    "  If mismatch -> HTTP 403 Forbidden",
    " Endpoint: /api/production/timeline/:id",
    "  IDOR Check: rejects access to other buyers",
    " Endpoint: /api/dashboard/delay/:id",
    "  IDOR Check: rejects delay analysis of competitors",
    "GUARANTEE: Buyer B cannot read Buyer C orders"
) $cBlueLight $cBlueBorder $cNavyDark $true

Draw-Card $g5 430 380 340 200 "SUPERVISOR UNIT SCOPING" @(
    " Assigned to specific Production Unit (1, 2, or 3)",
    " Enforces req.user.productionUnitId",
    " Submits daily output for assigned floor only",
    " Cannot create POs or modify milestones",
    " Cannot access financial buyer data",
    " Rejects cross-unit stage manipulation"
) $cWhite $cSlate300 $cSlate800 $true

Draw-Card $g5 800 380 360 200 "MERCHANDISER & ADMIN SCOPE" @(
    " Full company production visibility",
    " Creates and configures Purchase Orders",
    " Assigns orders across Tiruppur units 1, 2, 3",
    " Manages subcontract washing / printing",
    " Audits and corrects AI floor note categories",
    " Admin manages user roles and credentials"
) $cWhite $cSlate300 $cNavyDark $true

# Bottom Security Guarantee
Draw-Card $g5 40 600 1120 95 "DATABASE PERSISTENCE: PARAMETERIZED SQL VIA PRISMA ORM" @(
    " Zero Raw SQL Interpolation: All Prisma queries use parameterized prepared statements, preventing SQL injection vulnerabilities.",
    " Session Lifecycle: Logout clears HttpOnly cookie with RFC 6265 compliant flags (path=/, httpOnly=true, sameSite=lax). Invalidate token immediately.",
    " Automated Security Testing: 13 dedicated integration tests in rbac_isolation.test.ts continuously verify role restrictions and tenant isolation."
) $cGreenLight $cGreenBorder $cGreenDark $true

$whiteBrush.Dispose()
$bmp5.Save("$assetsDir\figure5_rbac_tenant_isolation.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g5.Dispose()
$bmp5.Dispose()
Write-Host " Figure 5 saved."

Write-Host "All 5 diagrams successfully generated in $assetsDir."
