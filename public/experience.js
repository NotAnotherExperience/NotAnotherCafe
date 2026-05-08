document.documentElement.classList.add("js-ready");

const revealTargets = [
  ".hero-copy",
  ".nae-philosophy-hero-copy",
  ".live-panel",
  ".section-heading",
  ".form-surface",
  ".bay-card",
  ".media-slot",
  ".session-summary",
  ".timeline-item",
  ".console-card",
  ".pitch-copy",
  ".proof-stack article",
  ".nae-feature-photo",
  ".nae-writing",
  ".nae-side-photo",
  ".nae-clear-photo",
  ".nae-memory-strip img",
  ".nae-exp-hero-copy",
  ".nae-exp-copy",
  ".nae-exp-anchor-photo",
  ".nae-exp-memory img",
  ".nae-moment-grid article",
  ".nae-code-list p",
  ".nae-wide-photo"
];

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
);

document.querySelectorAll(revealTargets.join(",")).forEach((element) => {
  element.classList.add("reveal");
  observer.observe(element);
});

const progress = document.createElement("div");
progress.className = "scroll-progress";
progress.setAttribute("aria-hidden", "true");
document.body.appendChild(progress);

function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progressValue = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.transform = `scaleX(${Math.min(1, Math.max(0, progressValue))})`;
}

window.addEventListener("scroll", updateScrollProgress, { passive: true });
updateScrollProgress();

document.querySelectorAll(".console-card, .menu-card, .check-item, .bay-card, .session-summary, .proof-stack article, .nae-moment-grid article, .nae-code-list p").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    card.style.setProperty("--my", `${event.clientY - rect.top}px`);
  });
});
