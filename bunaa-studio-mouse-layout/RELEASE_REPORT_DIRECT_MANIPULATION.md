# Bunaa Studio V27 — QA Report: Direct Manipulation and Preview

## Delivered behavior

- Kept the existing project shell, original preview action, 49 source modules, and existing single-file HTML entry points.
- Added a visible preview entry to the workspace toolbar. Preview creates a standalone page from the current project and loads its rendered HTML. When the browser blocks a new tab, the same generated page is available in an iframe fallback.
- Changed default content sizing so leaf elements (buttons, links, text, form controls, images) occupy their content-sized footprint. Structural sections/containers continue to span the available row by default.
- Added mouse resize handles for width, height, or both. Explicit desktop dimensions take precedence over legacy responsive defaults, and device-specific dimensions remain scoped to their breakpoint. Images are rendered to the size saved by the editor.
- Added drag-based sibling ordering, dropping into compatible containers, rectangle marquee selection, modifier-click multi-selection, and container grouping.
- Added four container layouts: flexible horizontal row, vertical column, grid, and stack. Grouping is rejected safely when selected nodes have different parents; nodes are not silently deleted or moved across hierarchy levels.
- Preserved the workspace's scroll position while the canvas rerenders after a move, so dragging and marquee selection continue in the same visible area.
- Aligned the editor, standalone preview, and exported site with the same content-sized versus structural-full-width behavior.

## Browser checks actually executed

A local Chromium session was driven through the browser DevTools Protocol with the project HTML loaded in the browser. These were interactive checks, not just source-string checks:

- Resized a button to 157 × 98 px and verified those values were persisted in the project model.
- Dragged one button across another and verified sibling order changed.
- Resized an image from 280 × 156 px to 320 × 181 px; the saved style, responsive style, and visible bounding box all agreed.
- After a drag operation, used a mouse-drawn rectangle to select two buttons; both IDs were selected and the grouping action became enabled.
- Grouped the selected elements into a column container and verified both children and their identities survived.
- Exercised the grid grouping choice and confirmed all four layout options are present.
- Opened the new workspace preview, verified its separate blob-backed browser tab, `complete` document state, project title and actual rendered page content.

## Automated checks

- JavaScript syntax check: the generated bundle passed `node --check`.
- Source/model smoke test: `node tests/direct-manipulation-smoke.cjs` passed after expanding coverage for grouping safety, size priority, scroll retention, preview wiring, and embedded bundle parity.
- Module presence: all 49 bundled modules have corresponding source files.
- Single-file consistency: the application bundle in both `index.html` and `Bunaa.html` exactly matches `bundle-extracted.js`.
- Package archive integrity is verified after the final ZIP is created.

## Boundaries

Interactive browser checks were run on the desktop canvas at a 1440 × 900 viewport. They do not claim external publishing/service verification or exhaustive visual inspection at every tablet/mobile breakpoint. The editor stores device-specific dimensions, and the mobile/tablet layout follows the same model, but those are not described here as separately browser-tested.

## Design references consulted

- Webflow canvas overview — selection, drag movement, preview: https://help.webflow.com/hc/en-us/articles/33961319255059-Webflow-canvas-overview
- Webflow Flexbox — one-dimensional horizontal/vertical layout: https://help.webflow.com/hc/en-us/articles/33961260795155-Flexbox
- Webflow Grid — placement and resizing within rows/columns: https://help.webflow.com/hc/en-us/articles/33961365794451-Grid
- Wix Studio element sizing — direct resize handles and breakpoint-specific sizing: https://support.wix.com/en/article/studio-editor-setting-the-size-of-your-elements
- Wix Studio containers — responsive containers and grid layout: https://support.wix.com/en/article/studio-editor-using-containers
