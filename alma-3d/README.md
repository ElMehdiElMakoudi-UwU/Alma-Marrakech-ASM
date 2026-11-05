# Alma Marrakech: 3D version

The second presentation site for the Alma Marrakech residence, built around a 3D model of the type 01 villa. Visitors scroll to open it level by level, drag to rotate it and switch between day and night. Facts and images come from the September 2026 dossier.

## Run and build

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

The build goes to `dist/`. It is a static site and needs a web server. The same `Dockerfile` and Coolify steps as `alma-marrakech` apply.

## Where things are

| To change | Edit |
|---|---|
| Text and figures | `index.html` |
| Colours, fonts, spacing | Top of `src/style.css` |
| Camera, layer movement and labels for each scroll step | `src/steps.js` |
| Walls, windows, furniture, planting | `src/villa.js` |
| Materials and textures | `src/materials.js` |
| Lights, drag, day and night | `src/stage.js` |

## How the model is built

There is no model file: `src/villa.js` draws the villa in code when the page loads.

Wall positions are pixel coordinates from the 1800 px plan sheets (`public/img/plan-t1-*-1800.webp`), at 56.45 px per metre, so any wall can be checked against the drawing.

## To check with the architect

- **Heights:** the dossier gives no height dimensions. They are measured from the elevations: upper floor at 3.15 m, roof at 6.72 m, top at 6.92 m.
- **Roof corner:** the south-west corner of the roof is modelled without a post. The render shows it that way, but the elevations are less clear.
- **Parapets:** the terrace parapets are plaster, as on the elevations. The renders show glass.
- **Slit windows:** the tall slit windows are drawn on the outside only and don't cut through the walls.
- **Materials:** finishes and furniture are simplified, and furniture only sits where the plans draw it.
- **Palms:** the renders show palms along the streets, but the plans don't place them, so their positions are my choice.
- **Type 02:** not modelled, because its upper floor plan is missing from the dossier.

## Before going live

The open points in `alma-marrakech/README.md` also apply here: exact location, total lot area, contact details and the licence for the base maps.
