# Joey’s notebook

A static personal site: handwritten notebook styling, seven story chapters, and distinct desktop/mobile reading flows. GitHub Pages can continue serving `main` at `/` directly; no production runtime or hosting change is required.

## Local development

Use Node 24 or later.

```sh
npm ci
npm run dev -- --port 5173
```

- Desktop: http://127.0.0.1:5173/
- Phone-sized preview: http://127.0.0.1:5173/mobile-preview.html
- Signup: http://127.0.0.1:5173/kartr/

The phone preview uses a 390 × 844 iframe; the automated mobile projects additionally emulate touch and mobile browser behavior. It is a preview helper, not a separate website.

## Validation

```sh
npm run build
npx playwright install chromium firefox webkit
npm test
```

Edge must be installed locally to run the `edge` project. CI installs it explicitly. GitHub Actions checks Chromium, Firefox, WebKit, Edge, Android Chrome emulation, iPhone Safari emulation, and iPad emulation. Coverage includes links and images, fourteen viewport widths (320–1920px), landscape navigation and focus, hovered radio contrast, keyboard access, reduced motion, WCAG AA automated checks, JavaScript-disabled behavior, genuine 404 responses, and mocked signup validation/success/failure. Traces, screenshots, and videos are retained on failure. No tests send real signup requests.

`All browser checks` is the stable aggregate status suitable for branch protection. Browser emulation is not a substitute for physical-device testing. `npm audit --audit-level=high` also gates CI. The production site uses no runtime dependencies and serves fonts locally.

CI uses the official Playwright container with the browser engines and OS dependencies already installed; only the Edge job installs an additional browser. When upgrading Playwright, update the container tag and its version check in `.github/workflows/checks.yml` to match `playwright-core` in `package-lock.json`.

Loading regressions are covered by holding fonts and photos back, then checking that heading/body/form text and reserved photo space do not move when those resources arrive. Font-failure checks also cover narrow layouts and social-link bounds from 320 to 768px. These checks run in all seven browser profiles; frame-rate comparisons remain manual profiling because CI timing depends on shared runner hardware.

The paper texture is a pre-rendered 360px PNG tile, avoiding live SVG turbulence during scrolling. Both pages preload their two WOFF2 fonts and use `font-display: optional`: normally the notebook fonts appear at first paint, while a slow connection keeps the already-visible fallback instead of causing a late font swap. Below-the-fold photos decode asynchronously and declare their actual dimensions to reserve stable space.

## Content and assets

- `index.html`: chapters, copy, links, descriptive alternative text.
- `style.css`: desktop spreads, notebook details, and mobile flow.
- `script.js`: progressive chapter tracking and opt-in guitar animation.
- `kartr/index.html`: original Google Forms integration; `kartr-theme.css` applies the notebook styling.
- `assets/`: optimized photos, original guitar animation, local fonts and their OFL licenses.

The standalone root remains deployable on GitHub Pages. `npm run build` also produces a portable `dist/` copy for other static hosts. Playwright uses `npm run test:serve` to serve the repository root with a plain static server, matching the files deployed by GitHub Pages; Vite transformations and SPA fallbacks are not involved in those tests. No deployment or repository settings are changed by this branch.

The supplied seventh image is a lifting selfie. The running achievement is included in the text; no race image was supplied.

### Image work

Built-in imagegen was used for two project assets (then WebP encoded for delivery):

- `assets/hero.webp`: “Create an ultra-wide photographic website banner, aspect ratio 3:1. Outpaint the original background naturally to the left and right: sidewalk, red storefront, parked bicycles and metal storefront gate. Preserve the man's exact identity, face, smile, blue LA cap and white shirt, and original natural sunlight. Keep him centered. Show original head and shoulders, with plentiful scene to either side. Photorealistic seamless background extension only, no typography, no graphic elements.”
- `assets/team.webp`: “Restore and sharpen this low resolution conference team photograph for a personal website. Preserve all four people's exact identity, faces, clothing, poses, order and framing. Preserve the entire poster and its wording. Carefully reduce compression and improve edge clarity, natural photographic detail, no beautification, no invented detail, no stylization. Keep the same wide aspect ratio and composition.”

Generated background content and reconstructed photo detail are synthetic. Original supplied files remain untouched in Downloads.

The Saka trophy image is sourced from the [Premier League](https://www.premierleague.com/en/news/4363537), with a visible source credit in the page. Source image: https://resources.premierleague.pulselive.com/photo-resources/2026/07/31/2182df19-3600-4862-951c-099896d518fc/Saka-3.jpg?width=1440
