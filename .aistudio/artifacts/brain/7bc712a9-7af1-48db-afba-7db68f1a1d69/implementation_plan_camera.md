# Implementation Plan

## 1. Goal
Ensure all rack-specific camera presets (Rows B-K in A4, Rows A-D in CY3) use a flat, "front-facing" perspective that perfectly frames the selected row.

## 2. A4UnifiedFactory3DView.tsx Changes
- Update `PRESET_CONFIGS` for `ROW_B` through `ROW_K`.
- Currently, they use perspective offsets (e.g., `pos: [-14.5, 15, -10]`).
- Change to a direct front-on projection:
  - `pos`: Move further back on the Z or X axis depending on row orientation.
  - `target`: Keep centered on the rack row to ensure it fills the frame.

## 3. CY3OutdoorRack3DView.tsx Changes
- Update `flyCameraTo` parameters inside `setCameraPreset` for `ROW_A` through `ROW_D`.
- Similar adjustment to achieve a flat, front-facing view for each rack row.
