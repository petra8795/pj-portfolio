// Mobile nav toggle
const toggle = document.getElementById("navToggle");
const menu = document.getElementById("menu");
toggle.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});
// Close the menu when a link is tapped
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  })
);

// Scroll-reveal (respects reduced motion)
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const items = document.querySelectorAll(".reveal");
if (reduce || !("IntersectionObserver" in window)) {
  items.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => io.observe(el));
}

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();
