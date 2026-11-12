import { test, expect } from "@playwright/test";

async function geometry(page, selector, text = false) {
  return page.locator(selector).evaluateAll(
    (elements, text) =>
      elements.flatMap((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rects = text
          ? [...range.getClientRects()]
          : [element.getBoundingClientRect()];
        return rects.map((rect) => ({
          top: rect.top + scrollY,
          height: rect.height,
          width: rect.width,
        }));
      }),
    text,
  );
}

async function nextPaint(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

function expectStable(before, after) {
  expect(after).toHaveLength(before.length);
  for (let i = 0; i < before.length; i++) {
    for (const property of ["top", "height", "width"]) {
      expect(
        Math.abs(after[i][property] - before[i][property]),
        `element ${i} changed ${property} after its resource loaded`,
      ).toBeLessThanOrEqual(1);
    }
  }
}

for (const path of ["/", "/kartr/"]) {
  test(`content fits narrow screens when fonts cannot load on ${path}`, async ({
    page,
  }) => {
    await page.route("**/*.woff2", (route) => route.abort("failed"));
    for (const width of [320, 375, 390, 701, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `fallback-font overflow at ${width}px on ${path}`,
      ).toBeLessThanOrEqual(width);
      for (const link of await page.locator(".socials a").all()) {
        const box = await link.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
      }
    }
  });

  test(`late fonts replace the fallback typefaces on ${path}`, async ({
    page,
    browserName,
  }) => {
    let releaseFonts;
    const fontsHeld = new Promise((resolve) => {
      releaseFonts = resolve;
    });
    await page.route("**/*.woff2", async (route) => {
      await fontsHeld;
      await route.continue();
    });
    try {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toBeVisible();
      // Exceed the optional-font deadline that previously left visitors in Arial.
      await page.waitForTimeout(400);
      await nextPaint(page);
      const bodySelector = path === "/" ? ".intro" : ".lede";
      const headingBefore = await geometry(page, "h1", true);
      const bodyBefore = await geometry(page, bodySelector, true);
      releaseFonts();
      await page.evaluate(() => document.fonts.ready);
      await nextPaint(page);
      // Measuring rendered glyphs catches optional fonts that are downloaded
      // (fonts.check returns true) but never actually replace the fallback.
      expect(await geometry(page, "h1", true)).not.toEqual(headingBefore);
      expect(await geometry(page, bodySelector, true)).not.toEqual(bodyBefore);
      if (browserName === "chromium") {
        // Chromium also exposes which font actually painted each glyph.
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("DOM.enable");
        await cdp.send("CSS.enable");
        const { root } = await cdp.send("DOM.getDocument");
        for (const [selector, family] of [
          ["h1", "Patrick Hand"],
          [bodySelector, "Inter"],
        ]) {
          const { nodeId } = await cdp.send("DOM.querySelector", {
            nodeId: root.nodeId,
            selector,
          });
          const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
          expect(fonts.some(font => font.isCustomFont && font.familyName === family)).toBe(true);
        }
        await cdp.detach();
      }
    } finally {
      releaseFonts();
    }
  });
}

test("delayed photos keep their reserved space while reading", async ({
  page,
}) => {
  let releasePhotos;
  const photosHeld = new Promise((resolve) => {
    releasePhotos = resolve;
  });
  await page.route("**/assets/*.webp", async (route) => {
    await photosHeld;
    await route.continue();
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(async () => {
      // WebKit's fonts.ready can wait for document load, including held images.
      // Await these fonts directly so the two controlled resources stay independent.
      await Promise.all([
        document.fonts.load("20px Patrick"),
        document.fonts.load("20px Inter"),
      ]);
      document.querySelectorAll("main img").forEach((img) => {
        img.loading = "eager";
      });
    });
    await nextPaint(page);
    const before = await geometry(page, "main figure, .chapter");
    releasePhotos();
    await page
      .locator("main img")
      .evaluateAll((images) => Promise.all(images.map((img) => img.decode())));
    await nextPaint(page);
    expectStable(before, await geometry(page, "main figure, .chapter"));
  } finally {
    releasePhotos();
  }
});
