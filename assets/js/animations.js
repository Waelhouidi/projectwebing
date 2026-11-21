import { animate, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@14.14.0/+esm";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initAnimations() {
  if (reduceMotion) return;

  const revealTargets = document.querySelectorAll(
    ".hero-copy, .hero-art, .stats-grid > div, .section-heading, .benefit-card, " +
    ".page-heading, .filter-panel, .form-card, .side-note, " +
    ".dashboard-stat, .list-section, .safety-panel, .booking-layout > *"
  );

  revealTargets.forEach(function (element) {
    let hasAnimated = false;
    inView(element, function () {
      if (hasAnimated) return;
      hasAnimated = true;
      animate(element, { opacity: [0, 1], y: [18, 0] }, {
        duration: 0.48,
        ease: "easeOut"
      });
    }, { amount: 0.12 });
  });

  document.querySelectorAll(".featured-grid, .catalog-grid, .my-list").forEach(function (container) {
    let hasAnimated = false;
    inView(container, function () {
      if (hasAnimated) return;
      hasAnimated = true;
      const cards = container.querySelectorAll(".trip-card, .my-trip-card");
      if (cards.length > 1) {
        animate(cards, { opacity: [0, 1], y: [12, 0] }, {
          delay: stagger(0.055),
          duration: 0.38,
          ease: "easeOut"
        });
      }
    }, { amount: 0.1 });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAnimations, { once: true });
} else {
  initAnimations();
}
