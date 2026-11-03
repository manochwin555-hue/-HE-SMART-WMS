# WMS Locator Precision, Pallet Capacity Engine & Interaction Flow Architecture

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your confirmed choices in Phase 1:
> 1. **Interaction Flow:**
>    - **Single-Click:** Opens the Slot Details Modal (`UnifiedSlotModal`) to inspect current slot contents, aging, and quantity.
>    - **Double-Click:** Opens the Quick Scanner Modal (`QuickScannerModal`) directly for rapid IN/OUT scanning without passing through the intermediate view.
> 2. **Pallet Standard Capacity Input:**
>    - **Stock IN (รับเข้า):** Provides an explicit, editable input field for "ความจุมาตรฐานต่อพาเลท (Std Capacity / Pallet)" for that specific Model / Part No. (e.g. Model 5006 = 50 EA, Model 904 = 80 EA, or custom batch size).
>    - **Stock OUT & Transfer (เบิกออก / ย้ายพิกัด):** Hides the capacity input and automatically inherits the exact pallet capacity established during IN.
> 3. **Canonical Coordinate Sync (Strict 1:1 Matching):**
>    - Fixes the root cause seen in screenshot `image_e2623f0b.png` where `DY3T-1.03-C01` (Row C) erroneously fell back to `Zone CY3-A` and displayed "ว่าง (0)".
>    - Enforces 1-to-1 sync of zone row, bay, shelf level, and sub-position (`P1` left vs `P2` right) across all 3D twins, 2D elevation views, and modals.

---

## 1. Overview & Root Cause Analysis

### Identified Root Causes from Visual Evidence
1. **Zone Code vs Locator Prefix Desynchronization:**
   - In outdoor racks (`CY3`), `DY3T-1.01` is Row A, `DY3T-1.02` is Row B, `DY3T-1.03` is Row C, `DY3T-1.04` is Row D.
   - When clicking on Row C, the modal received `initialZone = 'CY3-A'` while `initialLocatorCode` was `DY3T-1.03-C01-L1-P1`. Because lookup used `zone === initialZone`, it queried Row A instead of Row C, resulting in a false "ว่าง (0)" display despite a physical pallet existing.
2. **Neighboring Slot Displacement (P1 vs P2 Sub-coordinates):**
   - In selective racks (Rows B–K and CY3), each bay level contains 2 pallets side-by-side (`P1` and `P2`).
   - Clicking `P2` was defaulting to `palletPosition = 'P1'` upon form submission, causing new stock to appear in the adjacent left slot (`P1`) instead of the clicked right slot (`P2`).
3. **Double-Click vs Single-Click Conflict:**
   - Single clicks on 3D meshes and 2D cells previously had competing click handlers that opened the scanner modal directly in some views and the inspector in others, lacking double-click gesture detection.

---

## 2. Technical Architecture & Component Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER INTERACTION LAYER                             │
│                                                                             │
│   ┌────────────────────────────────┐    ┌───────────────────────────────┐   │
│   │   2D Elevation / 3D Layout     │    │   2D Elevation / 3D Layout    │   │
│   │       [ SINGLE CLICK ]         │    │       [ DOUBLE CLICK ]        │   │
│   └───────────────┬────────────────┘    └───────────────┬───────────────┘   │
└───────────────────┼─────────────────────────────────────┼───────────────────┘
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│          UnifiedSlotModal             │ │         QuickScannerModal         │
│  - Displays exact Pallet P1 / P2      │ │  - Resolves Canonical Locator     │
│  - Shows Stored Part & Aging Status   │ │  - IN Mode: Std Capacity Field    │
│  - Shows Empty status if vacant       │ │  - OUT/TRANSFER: Locked Capacity  │
│  - "สแกนรับเข้า" / "เบิกจ่าย" buttons │ │  - Flexible Batch Overcapacity ⚠️ │
└───────────────────┬───────────────────┘ └───────────────┬───────────────────┘
                    │                                     │
                    └─────────────────┬───────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               CENTRAL CANONICAL COORDINATE PARSER & ROUTER                  │
│                                                                             │
│  normalizeLocatorCoordinates(zone, bay, level, pPos, locatorCode)           │
│  - CY3: DY3T-1.01 (A), DY3T-1.02 (B), DY3T-1.03 (C), DY3T-1.04 (D)          │
│  - A4 Rack: DA4D-2 (B-F) / DA4D-3 (G-K) with exact -P1 / -P2               │
│  - A4 Floor: DA4D-1.01-Xx-Ry-Cz                                             │
│  - A2 Rail: DA2D-1-Rxx-yy                                                   │
│  - A5 Tent: DA5T-x.xx-Ry-Cz                                                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             CONSISTENCY ENGINE & STATE SYNCHRONIZATION                      │
│                                                                             │
│  recalculateInventoryConsistency(updatedItems, masterData)                  │
│  ├── 1. Deduplicates and merges same-model items per physical coordinate    │
│  ├── 2. Calculates fullPallets, looseQty, and isOvercapacity                │
│  ├── 3. Eliminates phantom / zero-qty records                               │
│  ├── 4. Emits transactional MovementLog (IN / OUT / TRANSFER)               │
│  └── 5. Auto-syncs to Inventory Table, 2D/3D Twins & Transaction History    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Implementation Steps

### Step 1: Canonical Coordinate & Slot Parser Engine (`/src/utils/locatorUtils.ts`)
- Build a centralized resolver function `resolveCanonicalCoordinate({ zone, bayNumber, level, palletPosition, locatorCode })`:
  - **CY3 Rows:** Map `DY3T-1.01` ➔ `CY3-A`, `DY3T-1.02` ➔ `CY3-B`, `DY3T-1.03` ➔ `CY3-C`, `DY3T-1.04` ➔ `CY3-D`.
  - **Rack Sub-Positions:** Always preserve `-P1` and `-P2` suffixes cleanly.
  - **Floor & Rail:** Parse X1–X8, R1–R13, T1–T4 consistently.
- Ensure bidirectional lookup: given a locator code, deduce the exact zone, bay, level, and pallet position; given coordinates, construct the canonical locator.

### Step 2: Double-Click vs Single-Click Gesture Dispatcher
- Implement double-click timers / native `onDoubleClick` handlers across:
  - `A4FrontElevationView.tsx` (Front elevation grid)
  - `A4UnifiedFactory3DView.tsx` (A4 3D twin racks & floor)
  - `CY3OutdoorRack3DView.tsx` & `CY3TentRackMap.tsx` (CY3 outdoor racks)
  - `DA4D1FloorStagingMap.tsx` & `A5TentFloorStagingMap.tsx` (Floor staging)
- **Single-Click:** Triggers `onSelectSlot` ➔ opens `UnifiedSlotModal` displaying slot data, occupied item (if any), or empty status with quick action buttons.
- **Double-Click:** Triggers `onOpenScanner` ➔ opens `QuickScannerModal` directly prefilled with the canonical locator and P1/P2 position.

### Step 3: Stock IN Pallet Capacity Field in `QuickScannerModal.tsx`
- **Stock IN (รับเข้า):**
  - Add an input block: **"ความจุมาตรฐานต่อพาเลท (Pallet Std Capacity)"** with quick presets (`50`, `80`, `100`, `120`) and custom number input.
  - Defaults to Master Data (e.g. Model 5006 = 50, Model 904 = 80).
  - Dynamically updates `fullPallets` and `looseQty` in real time:
    - *เต็มพาเลท:* `Math.floor(quantity / stdCapacity)`
    - *พาเลทเกิน (Overcapacity):* Shows warning badge `⚠️ เกินความจุพาเลท (130%) [Flexible Batch]`
    - *พาเลทเศษ:* `quantity % stdCapacity`
- **Stock OUT & Transfer (เบิกออก / ย้ายพิกัด):**
  - Hide the capacity editing input.
  - Display read-only badge indicating the original pallet capacity and current balance.

### Step 4: Strict 1-to-1 Item Lookup in Modal Handlers (`App.tsx`)
- In `handleOpenScanner` and `handleSaveMovement`:
  - Always resolve zone and locator using `resolveCanonicalCoordinate`.
  - When saving `IN`, `OUT`, or `TRANSFER`, pass both `locatorCode` and `palletPosition` explicitly.
  - Eliminate any fallback to `'P1'` when `palletPosition === 'P2'`.
  - Run `recalculateInventoryConsistency` to guarantee zero overlapping records.

### Step 5: Real-time Auto-Sync to Transaction Logs & Inventory List
- Ensure every `handleSaveMovement` call generates a complete `MovementLog` record containing:
  - Exact canonical locator (`DY3T-1.03-C01-L1-P1`, `DA4D-2-B01-L4-P2`, etc.)
  - Model HE, Part Name, Movement Type (`IN`, `OUT`, `TRANSFER`)
  - Quantity, Balance, Line, User, Timestamp
- Instantly sync updated items to `lge_wms_items` and logs to `lge_wms_logs` in `localStorage`.

---

## 4. Verification & Testing Protocol

1. **CY3 Row C Locator Verification (Reproducing image_e2623f0b.png):**
   - Click slot `DY3T-1.03-C01-L1-P1`.
   - Verify modal header and body correctly show `Zone CY3-C` (not `CY3-A`) and detect existing stock accurately.
2. **Adjacent Slot Displacement Test (P1 vs P2):**
   - Click `B01-L4-P2` in A4 Selective Rack.
   - Perform Stock IN with 50 units.
   - Verify the box appears exclusively on the right side (`P2`) and does not touch `P1`.
3. **Double-Click vs Single-Click Test:**
   - Single-click slot: verify `UnifiedSlotModal` opens.
   - Double-click slot: verify `QuickScannerModal` opens immediately with prefilled locator.
4. **Capacity Control Validation:**
   - Receive Model 5006 with 50 EA ➔ verify `✅ เต็มพาเลทมาตรฐาน (100%)`.
   - Receive Model 5006 with 65 EA ➔ verify `⚠️ เกินความจุพาเลท (130%) [Flexible Batch]`.
   - Perform Stock OUT ➔ verify capacity input is hidden and pallet count decreases accurately.
5. **Compilation & Linting:**
   - Run `compile_applet` and `lint_applet` to confirm zero errors.
