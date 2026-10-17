# SportsBuilder icon studies

Two original, editable families on a 24 × 24 grid. The board shows all eight subjects in both families and actual 16 / 24 / 32 px samples. These are design candidates; the app has not been changed.

- **Articulated** uses a 2-unit rounded stroke, explicit joint nodes and calibrated framing corners. It suits the existing quiet LearnUnlock controls and keeps the tracking metaphor tangible.
- **Cutout** uses solid silhouettes and clear negative spaces for a stronger compact option. It is more emphatic; reserve teal for the selected navigation item.

## Meanings

| File | Meaning |
| --- | --- |
| `build-coach.svg` | Articulated joint chain inside authoring corners, with an add point |
| `get-coached.svg` | Tracked athlete in a viewing frame with a forward coaching cue |
| `athlete-profile.svg` | Athlete silhouette beside a height ruler |
| `upload.svg` | Video enters an open receiving tray |
| `joint-motion.svg` | Connected joint and a movement arc |
| `comparison.svg` | Two matched movement traces divided by the pairing line |
| `ground-calibration.svg` | Shoe contact meets a baseline, with a downward measurement cue |
| `drill.svg` | Repeated movement cycle around a bent practice limb |

All standalone icons use `currentColor`. Inline SVGs can inherit the runtime LearnUnlock accent/ink tokens; the SVG board uses approximate export colors for broad editor compatibility. Keep labels and accessible button names in the application. Icon graphics should be `aria-hidden` when adjacent text already supplies the name.

SVG sources are authoring assets. Small-size tests reveal that articulated joint circles overlap their connecting strokes intentionally. Avoid scaling below 16 px; use a 24 px minimum optical size for the denser profile/calibration glyphs when space allows.
