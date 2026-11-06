# Implementation Plan

## 1. Floating Bay Labels for CY3
- Add the `createBayLabelSprite` helper function (from A4 view) to `CY3OutdoorRack3DView.tsx`.
- Within the rack loop (Section where rows/bays/levels are created), call `createBayLabelSprite` to create labels like "A-01".
- Position labels at `(xPos, RACK_HEIGHT + 0.5, rConfig.z)`.

## 2. Improve Row-Specific Camera Views
- Update `setCameraPreset` to ensure a tighter, more focused view when a specific row (e.g., 'ROW_A') is selected.
- Adjust `flyCameraTo` parameters in `setCameraPreset` to fully frame the selected row.
