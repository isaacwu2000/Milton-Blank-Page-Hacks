# Egyptian pyramids model — iteration 3 user feedback

## Preserved artifact

- Immutable implementation: commit `ae63220b8`,
  `Web/src/modules/tutor/config/artifactDemoContent.ts` (`pyramidsHtml`).
- Reviewed session:
  `http://localhost:3000/tutor?sessionId=41972855-1fd7-41ba-9826-8e6ffd19a2db`
- Existing rendered evidence:
  [comparison](./iterations/final/pyramids-comparison.png),
  [focused Menkaure](./iterations/final/pyramids-menkaure.png), and
  [laptop composition](./iterations/final/in-app/laptop-pyramids.png).

The commit is the canonical artifact snapshot. Reviewers can recover the exact source
with `git show ae63220b8:Web/src/modules/tutor/config/artifactDemoContent.ts` rather than
reviewing a later implementation by accident.

## User feedback

1. The review agent missed obvious, high-impact problems and needs stronger responsive,
   interaction, and spatial-correctness checks.
2. Test several landscape sizes, not one generic desktop viewport. Laptop and tablet
   landscape are required; intermediate wide-but-short states matter because camera and
   overlay failures depend on aspect ratio.
3. The three-pyramid overview must not show height and base measurement axes. Those
   measurements make sense only after focusing one pyramid.
4. The pyramids must not be presented in a false straight comparison line. The overview
   should use their approximate true Giza site placement, cardinal orientation, common
   scale, and Khafre's higher ground.
5. The close control must be absolutely overlaid in the top-right. It must not reserve a
   header row; the artifact should use the full whiteboard height.
6. The camera must support two-finger pinch zoom on touch surfaces. Trackpad or mouse-wheel
   zoom should use the same bounded camera behavior.
7. Focused overlays currently intersect the pyramid or each other at some aspect ratios.
   Measurements must remain attached to the geometry without crossing the visible object,
   clipping, or colliding with controls and annotations.
8. The human reference is effectively invisible while its detached label remains visible.
   A scale reference must be an unmistakable visible object, such as a person or tree,
   rendered at the correct scale. Do not show a label for an object the learner cannot see.
9. The reconstructed casing state looks broken. The pyramidion is visually awkward and
   too small to teach anything. The reconstruction annotation should replace the ordinary
   historical text with concise copy explaining the smooth casing and the hypothetical
   summit treatment.
10. Do not solve overlay defects by treating the scene as a flat diagram. Dimension lines,
    labels, scale references, and selection targets must derive from the three-dimensional
    world and remain coherent while orbiting and zooming.
11. The tree is a visual reference, not another fact to read. Do not label it; the focused
    height and base dimensions already supply the numerical scale.

## Accepted decisions

- Overview: approximate true Giza site plan, not a straight comparison row.
- Overview: no measurement axes.
- Focused state: retain height and base measurements.
- Keep progressive disclosure: overview establishes site and relative scale; focus adds
  dimensions, material detail, historical annotation, and reconstruction controls.

## Review insights to retain

- A model can be attractive yet educationally false if its layout exists only to make the
  screenshot tidy.
- Responsive review must exercise camera state and interactions, not merely check for DOM
  overflow.
- A visible label does not prove its referent is visible.
- Every gesture advertised by the medium—drag, wheel, pinch, keyboard—needs an exercised
  path and bounded extreme states.
- Reconstructed states need their own explanatory copy; reusing present-day copy makes the
  visual change ambiguous.
- Screen-space annotations must be validated against the projected object bounds at several
  orbit angles and aspect ratios.

## Iteration 4 resolution

- Replaced the false comparison row with metre-scale approximate site-center offsets and
  continuous raised terrain; the plan follows the northeast-to-southwest site relationship,
  and Khafre's higher ground remains visible without isolated pedestal geometry.
- Removed overview dimensions. Focused dimensions now project a real base edge and a
  world-vertical height line instead of deriving a flat screen bounding box.
- Added a camera-relative, visibly modeled date palm as an unlabeled scale cue; the selected
  pyramid's fixed dimensions already provide the numerical reference.
- Added bounded wheel and two-pointer pinch zoom, including a stable transition from pinch
  back to one-finger orbit.
- Added collision-aware projected labels, an orbit-aware north cue, aspect-aware overview
  camera bounds, and immediate rendering when animation frames are throttled.
- Removed the whiteboard header reservation so the iframe is full-bleed and the quiet close
  control overlays the top-right corner.
- Regression evidence covers laptop, tablet landscape, and short landscape viewports.
