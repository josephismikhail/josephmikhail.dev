const chapterMenu = document.querySelector(".mobile-chapters");
chapterMenu.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    chapterMenu.open = false;
  }),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && chapterMenu.open) {
    chapterMenu.open = false;
    chapterMenu.querySelector("summary").focus();
  }
});
if ("IntersectionObserver" in window) {
  const links = [...document.querySelectorAll(".margin-nav a")];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((link) => {
            if (link.hash === "#" + entry.target.id)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        }
      });
    },
    { rootMargin: "-10% 0px -55% 0px" },
  );
  document
    .querySelectorAll(".chapter")
    .forEach((section) => observer.observe(section));
}
const animationButton = document.querySelector(".animation-toggle");
const guitar = document.querySelector("#guitar-image");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let playing = false;
function setPlayback(next) {
  playing = next;
  guitar.src = next ? "/assets/guitar.gif" : "/assets/guitar-still.webp";
  animationButton.textContent = next
    ? "Pause the evidence Ⅱ"
    : "Play the evidence ▷";
  animationButton.setAttribute("aria-pressed", String(next));
}
animationButton.hidden = false;
animationButton.addEventListener("click", () => setPlayback(!playing));
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) setPlayback(false);
});
