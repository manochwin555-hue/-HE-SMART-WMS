# Implementation Plan

## 1. Goal
Adjust rack-specific camera presets to show a perspective view (slight angle) that reveals the side depth of the rack posts while maintaining visibility of all shelf levels.

## 2. A4UnifiedFactory3DView.tsx Changes
- Update `PRESET_CONFIGS` for `ROW_B` through `ROW_K`.
- Modify `pos` and `target` to include a slight Z-offset to introduce perspective.
- Target `pos` example: `pos: [targetX - 5, 4, 30]` (shifting camera along Z/X to create angle).

## 3. CY3OutdoorRack3DView.tsx Changes
- Update `flyCameraTo` parameters inside `setCameraPreset` for `ROW_A` through `ROW_D`.
- Similar adjustment to introduce a perspective angle (slight side-on shift).
