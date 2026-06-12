const sutraToggle = document.querySelector("[data-sutra-toggle]");
const sutraMeaning = document.querySelector("[data-sutra-meaning]");

if (sutraToggle && sutraMeaning) {
  sutraToggle.addEventListener("click", () => {
    const isOpen = sutraToggle.getAttribute("aria-expanded") === "true";

    sutraToggle.setAttribute("aria-expanded", String(!isOpen));
    sutraToggle.textContent = isOpen ? "Развернуть смысл" : "Свернуть смысл";
    sutraMeaning.hidden = isOpen;
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");

    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
