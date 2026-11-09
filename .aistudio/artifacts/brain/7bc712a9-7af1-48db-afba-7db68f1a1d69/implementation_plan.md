# Standardize & Clean 3D Slot Popup Cards Across All Warehouse Zones

A comprehensive UI standardization to unify the floating 3D slot popup cards across all 3D warehouse views (CY3, A5, A2, A4 Selective Racks & Floor Staging) into a clean, legible, 4-row compact layout with uniform font sizing, zero sci-fi clutter, and bug-free text formatting.

## User Review & Critical Decisions

> [!IMPORTANT] User Confirmed Preferences
> - **Unified Card Structure**: Apply a standardized 4-row compact popup card across all 3D viewport maps:
>   1. **Row 1 (Header)**: Primary Zone Name & Status Badge (`✓ มีสินค้า (STORED)` / `○ ช่องว่าง (EMPTY)`)
>   2. **Row 2 (Locator Code)**: Prominent Locator ID (`DY3T-1.04-D25-L4-P2`, `DA5T-1-01-R1-07`, `DA2D-1-R13-01`, `DA4D-1.01-X6-R06-C05`)
>   3. **Row 3 (Part No & Name)**: Clear Part No (`ACG73685065`) and Part Description without duplicated lines
>   4. **Row 4 (Stock Metrics)**: Quantity (`30 ชิ้น`) and Aging Days (`Aging: 0 วัน (SAFE)`)
> - **Clutter & Bug Elimination**: Remove sci-fi jargon like `"Holographic Laser Target Lock"` and fix raw escaped HTML entities like `&bull;` (replacing them with clean bullet dots `•`).
> - **Click Action Hint**: Clean, simple footer text: `"คลิกเพื่อเปิดรายละเอียด & รับเข้า/เบิกออก"`

---

## 1. Overview & Core Concept

Currently, each 3D view component (`CY3OutdoorRack3DView.tsx`, `A5CanopyTents3DView.tsx`, `A2FlowRail3DView.tsx`, `A4UnifiedFactory3DView.tsx`) renders its own custom tooltip popup overlay with inconsistent font sizes, duplicated part names, raw HTML text bugs (`&bull;`), and extra sci-fi fluff.

We will create/standardize a unified, elegant 3D Slot Popup Card design pattern used consistently across all 3D views:
- Dark slate backdrop (`bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md rounded-xl p-3.5`)
- Uniform typography hierarchy (`text-xs` headers, `text-sm` font-mono locator codes, `text-base` bold Part Nos, `text-xs` metric labels)
- Clean, human-readable status badges and action hints

---

## 2. User Experience & Visual Design

```
┌──────────────────────────────────────────────────────────┐
│  โซน CY3 แร็คกลางแจ้ง               [ ✓ มีสินค้า (STORED) ] │  <- Row 1: Zone Name & Status Badge
│  DY3T-1.04-D25-L4-P2                                     │  <- Row 2: Prominent Locator Code
│  ACG73685065                                             │  <- Row 3: Part No
│  Part Inverter Main Board Module                         │     Part Description
│  ──────────────────────────────────────────────────────  │
│  จำนวน: 30 ชิ้น  •  Aging: 0 วัน (SAFE)                  │  <- Row 4: Quantity & Aging Metrics
│  ──────────────────────────────────────────────────────  │
│  🖱️ คลิกเพื่อเปิดรายละเอียด & รับเข้า/เบิกออก              │  <- Footer: Clean Click Hint
└──────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Standardized 4-Row Card Layout**:
  - *Chosen Approach*: Replace all legacy custom overlays with the unified 4-row card design.
  - *Why*: Direct response to user request; eliminates clutter and ensures 100% visual consistency across the entire app.
- **Decision 2: Bug Fixes & Text Cleanliness**:
  - *Chosen Approach*: Replace raw text `&bull;` with Unicode bullet points `•`, remove redundant `Part PartNo` sub-headers, and strip out non-standard laser/hologram labels.
  - *Why*: Restores professional enterprise quality and readability.

---

## 4. Technical Architecture & Component Impact

### Components to Update:
1. **`src/components/zone-3d/CY3OutdoorRack3DView.tsx`**: Update 3D viewport tooltip overlay to the unified 4-row card layout.
2. **`src/components/zone-3d/A5CanopyTents3DView.tsx`**: Fix raw `&bull;` string bugs, clean up header, and apply unified 4-row card layout.
3. **`src/components/zone-3d/A2FlowRail3DView.tsx`**: Standardize Flow Rail 3D hover/click tooltip to unified 4-row card layout.
4. **`src/components/zone-3d/A4UnifiedFactory3DView.tsx`**: Update A4 Selective Rack & Floor Staging 3D popup overlays to unified 4-row card layout.
