import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const retained = [
  "/kartr/",
  "https://ix-infra.com/",
  "https://github.com/josephismikhail",
  "https://www.linkedin.com/in/josephismikhail/",
  "https://www.instagram.com/joey._ix/",
  "https://www.tiktok.com/@joey._ix",
  "https://www.youtube.com/@joey_ixinfra",
  "https://x.com/josephismikhail",
];
test("story loads with all links, photos, fonts and no runtime errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failures = [];
  page.on("response", (r) => {
    if (r.url().startsWith("http://127.0.0.1") && r.status() >= 400)
      failures.push(r.url());
  });
  await page.goto("/");
  await expect(page).toHaveTitle("you can call me Joey");
  await expect(page.locator("h1")).toContainText("you can call me Joey");
  await expect(page.locator("section.chapter")).toHaveCount(7);
  for (const href of retained)
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  await expect(
    page.locator('a[href*="facebook"], a[href^="mailto:"]'),
  ).toHaveCount(0);
  for (const img of await page.locator("main img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0), {
        timeout: 15000,
        message: `Image should finish loading: ${await img.getAttribute("src")}`,
      })
      .toBe(true);
  }
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check("20px Patrick"))).toBe(
    true,
  );
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
test("chapter navigation follows the responsive flow", async ({ page }) => {
  await page.goto("/");
  const mobile = page.viewportSize().width <= 700;
  if (mobile) {
    await expect(page.locator(".margin-nav")).toBeHidden();
    await page.locator(".mobile-chapters summary").click();
    await page
      .getByRole("navigation", { name: "Mobile chapters", exact: true })
      .getByRole("link", { name: "03 / the Camry" })
      .click();
    await expect(page.locator(".mobile-chapters")).not.toHaveAttribute(
      "open",
      "",
    );
  } else {
    await expect(page.locator(".mobile-chapters")).toBeHidden();
    await page
      .getByRole("navigation", { name: "Chapters", exact: true })
      .getByRole("link", { name: "03 / the car" })
      .click();
  }
  await expect(page).toHaveURL(/#car$/);
  await expect(page.locator("#car")).toBeInViewport();
  await page.locator("#ix .button").click();
  await expect(page).toHaveURL(/\/kartr\/$/);
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
});
test("no horizontal overflow across narrow, tablet and wide screens", async ({
  page,
}) => {
  for (const width of [
    320, 375, 390, 700, 701, 768, 1024, 1150, 1151, 1200, 1230, 1231, 1440,
    1920,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `overflow at ${width}px`,
    ).toBeLessThanOrEqual(width);
  }
});
test("all chapter links can receive visible focus in landscape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const links = page
    .getByRole("navigation", { name: "Chapters", exact: true })
    .getByRole("link");
  for (const link of await links.all()) {
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport({ ratio: 1 });
  }
  await links.last().press("Enter");
  await expect(page).toHaveURL(/#follow$/);
});
test("hovered signup radios retain visible contrast", async ({ page }) => {
  await page.goto("/kartr/");
  const choice = page.locator(".choice").first();
  await choice.hover();
  await choice.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    ),
  );
  const contrast = await choice.evaluate((el) => {
    const rgba = (color) => color.match(/[\d.]+/g).map(Number);
    const blend = (front, back) =>
      front
        .slice(0, 3)
        .map(
          (channel, i) =>
            channel * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)),
        );
    const luminance = (color) =>
      color
        .map((channel) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        })
        .reduce(
          (sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i],
          0,
        );
    const background = blend(
      rgba(getComputedStyle(el).backgroundColor),
      rgba(getComputedStyle(el.closest(".card")).backgroundColor),
    );
    const border = blend(
      rgba(getComputedStyle(el.querySelector("input")).borderTopColor),
      background,
    );
    const values = [luminance(background), luminance(border)].sort(
      (a, b) => a - b,
    );
    return (values[1] + 0.05) / (values[0] + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(3);
});
test("static hosting serves source assets and genuine missing-page errors", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute(
    "href",
    "/style.css",
  );
  for (const path of [
    "/style.css",
    "/script.js",
    "/kartr/",
    "/kartr-theme.css",
  ]) {
    expect((await request.get(path)).status()).toBe(200);
  }
  expect((await request.get("/does-not-exist/")).status()).toBe(404);
});
test("both pages meet WCAG AA automated accessibility checks", async ({
  page,
}) => {
  for (const path of ["/", "/kartr/"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
test("keyboard skip and reduced-motion animation controls work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to the story" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  const button = page.getByRole("button", { name: "Play the evidence" });
  await expect(page.locator("#guitar-image")).toHaveAttribute(
    "src",
    /guitar-still(?:-[\w-]+)?\.webp$/,
  );
  await button.click();
  await expect(page.locator("#guitar-image")).toHaveAttribute(
    "src",
    "/assets/guitar.gif",
  );
  await page.getByRole("button", { name: "Pause the evidence" }).click();
  await expect(page.locator("#guitar-image")).toHaveAttribute(
    "src",
    /guitar-still(?:-[\w-]+)?\.webp$/,
  );
});
test("story and signup remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("h1")).toBeVisible();
  await page.locator("#ix .button").click();
  await expect(page.locator("#signup")).toHaveAttribute("method", /post/i);
  await expect(page.locator("#signup")).toHaveAttribute(
    "action",
    /docs.google.com/,
  );
  await page.getByLabel("Other", { exact: true }).check();
  await expect(page.locator("#other")).toBeVisible();
  await context.close();
});
async function fill(page) {
  await page.getByLabel("Name", { exact: true }).fill("Test Reader");
  await page.getByLabel("Email", { exact: true }).fill("reader@example.com");
  await page.getByLabel("Other", { exact: true }).check();
  await page.locator("#other").fill("A personal research project");
}
test("signup validation and mocked submission preserve the form contract", async ({
  page,
}) => {
  let payload;
  await page.route("https://docs.google.com/**", async (route) => {
    payload = new URLSearchParams(route.request().postData());
    await route.fulfill({ status: 200, body: "" });
  });
  await page.goto("/kartr/");
  await page.getByRole("button", { name: "Request alpha access" }).click();
  await expect(page.getByRole("alert")).toContainText("Please enter your name");
  await fill(page);
  await page.getByRole("button", { name: "Request alpha access" }).click();
  await expect(page.getByRole("status")).toContainText("You’re on the list");
  expect(payload.get("entry.2087374943")).toBe("Joey_Website");
  expect(payload.get("entry.1838877468")).toBe("__other_option__");
  expect(payload.get("entry.1838877468.other_option_response")).toBe(
    "A personal research project",
  );
});
test("failed signup restores fields and provides fallback without losing answers", async ({
  page,
}) => {
  await page.route("https://docs.google.com/**", (route) =>
    route.abort("failed"),
  );
  await page.goto("/kartr/");
  await fill(page);
  await page.getByRole("button", { name: "Request alpha access" }).click();
  await expect(page.getByRole("alert")).toContainText("We couldn’t reach");
  await expect(
    page.getByRole("link", { name: "Use the original signup form" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toBeEnabled();
  await expect(page.locator("#other")).toHaveValue(
    "A personal research project",
  );
  await page.getByLabel("School work", { exact: true }).check();
  await expect(page.locator("#other")).toBeHidden();
  await expect(page.locator("#other")).toHaveValue("");
});
