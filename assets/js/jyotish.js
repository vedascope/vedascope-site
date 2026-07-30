(function () {
  "use strict";

  function prepareToc() {
    var toc = document.querySelector("[data-jyotish-toc]");
    if (!toc) return;
    if (window.matchMedia("(max-width: 980px)").matches) {
      toc.removeAttribute("open");
    }

    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var sections = links
      .map(function (link) {
        return { link: link, section: document.querySelector(link.getAttribute("href")) };
      })
      .filter(function (item) { return item.section; });

    if (!("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sections.forEach(function (item) {
          item.link.classList.toggle("is-active", item.section === entry.target);
        });
      });
    }, { rootMargin: "-15% 0px -72% 0px", threshold: 0 });
    sections.forEach(function (item) { observer.observe(item.section); });
  }

  function prepareMobileMenu() {
    var menus = Array.prototype.slice.call(document.querySelectorAll(".public-mobile-menu"));
    menus.forEach(function (menu) {
      menu.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          menu.removeAttribute("open");
          var summary = menu.querySelector("summary");
          if (summary) summary.focus();
        }
      });
      menu.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () { menu.removeAttribute("open"); });
      });
    });
  }

  prepareToc();
  prepareMobileMenu();
})();
