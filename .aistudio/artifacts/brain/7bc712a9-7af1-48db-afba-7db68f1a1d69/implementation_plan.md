# Implementation Plan

## 1. Realign Rack Rows G-K
- Modify `zBayCenter` calculation in the Section 2 (DA4D-3) rack loop in `A4UnifiedFactory3DView.tsx`.
- Shift the starting Z-offset to align the end (tail) of G-K rows with the end of B-F rows. 
  - Current B-F end: -12.0 - 11 * 2.4 = -38.4.
  - Target G-K end: -38.4.
  - New Z_start for G-K: -38.4 + 4 * 2.4 = -28.8.
  - Update `const zBayCenter = -28.8 - (bay - 1) * BAY_SPAN_Z;` in Section 2.

## 2. Adjust Camera Presets
- Update `PRESET_CONFIGS` in `A4UnifiedFactory3DView.tsx` for `ROW_B` through `ROW_K`.
- Adjust camera `pos` and `target` to ensure the entire rack row length (12 bays for B-F, 5 bays for G-K) is visible in the viewport.

## 3. Add Floating Bay Labels
- Create a new helper function `createBayLabelSprite(rowName: string, bayNum: number): THREE.Sprite`.
- The helper will generate a canvas with the text "Row-BayNum" and create a `THREE.Sprite` from it.
- Call this function within the rack bay loop in both Section 1 and Section 2.
- Set the position of the sprite to `(r.x, RACK_TOTAL_HEIGHT + 0.5, zBayCenter)` to float above L4.
