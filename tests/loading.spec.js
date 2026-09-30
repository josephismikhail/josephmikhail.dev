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
  test(`late fonts do not move already-visible content on ${path}`, async ({
    page,
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
      // Keep fonts unavailable beyond the browser's short optional-font block period.
      await page.waitForTimeout(400);
      await nextPaint(page);
      const selector =
        path === "/" ? "h1, .intro, .hero-photo" : "h1, .lede, .card";
      const before = await geometry(page, selector);
      const textBefore = await geometry(page, "h1", true);
      releaseFonts();
      await page.evaluate(() => document.fonts.ready);
      await nextPaint(page);
      expectStable(before, await geometry(page, selector));
      expectStable(textBefore, await geometry(page, "h1", true));
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
