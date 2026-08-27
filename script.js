/* Kyle Alexander — author site interactions
   - mobile nav toggle
   - constellation canvas ambience in the hero
   - scroll-triggered reveals
   - testimonial carousel (auto-advance, dots, arrows, swipe)
   - dummy newsletter form submit
*/

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile nav ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
      toggle.setAttribute(
        "aria-expanded",
        links.classList.contains("open") ? "true" : "false"
      );
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  /* ---------- constellation canvas ---------- */
  const canvas = document.querySelector("#hero-sky");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    let stars = [];
    let w, h;

    function size() {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function makeStars() {
      const count = Math.round((w * h) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.4,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
      }));
    }

    const LINK_DIST = 130;

    function draw(t) {
      ctx.clearRect(0, 0, w, h);

      // twinkling dots
      stars.forEach((s) => {
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(243, 239, 227, ${0.25 + twinkle * 0.55})`;
        ctx.fill();
      });

      // faint constellation links between nearby stars
      ctx.strokeStyle = "rgba(232, 181, 77, 0.14)";
      ctx.lineWidth = 1;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx.globalAlpha = 1 - dist / LINK_DIST;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      requestAnimationFrame(draw);
    }

    size();
    makeStars();
    requestAnimationFrame(draw);
    window.addEventListener("resize", () => {
      size();
      makeStars();
    });
  }

  /* ---------- scroll reveals ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ---------- smooth-scroll for on-page jump links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute("href");
    if (href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------- testimonial carousel ---------- */
  const carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    const track = carousel.querySelector(".carousel-track");
    const slides = Array.from(track.children);
    const dotsWrap = carousel.querySelector(".carousel-dots");
    const prevBtn = carousel.querySelector("[data-prev]");
    const nextBtn = carousel.querySelector("[data-next]");
    let index = 0;
    let perView = 1;
    let autoTimer;

    function slidesPerView() {
      const width = window.innerWidth;
      if (width >= 1000) return 3;
      if (width >= 700) return 2;
      return 1;
    }

    function maxIndex() {
      return Math.max(0, slides.length - perView);
    }

    function buildDots() {
      dotsWrap.innerHTML = "";
      const dotCount = maxIndex() + 1;
      for (let i = 0; i < dotCount; i++) {
        const b = document.createElement("button");
        b.setAttribute("aria-label", `Go to testimonial group ${i + 1}`);
        if (i === index) b.classList.add("active");
        b.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(b);
      }
    }

    function update() {
      const slideWidth = slides[0].getBoundingClientRect().width;
      const gap = 24;
      track.style.transform = `translateX(-${index * (slideWidth + gap)}px)`;
      Array.from(dotsWrap.children).forEach((d, i) =>
        d.classList.toggle("active", i === index)
      );
    }

    function goTo(i) {
      index = Math.min(Math.max(i, 0), maxIndex());
      update();
      resetAuto();
    }

    function next() {
      index = index >= maxIndex() ? 0 : index + 1;
      update();
    }

    function prev() {
      index = index <= 0 ? maxIndex() : index - 1;
      update();
    }

    function resetAuto() {
      clearInterval(autoTimer);
      if (!reduceMotion) autoTimer = setInterval(next, 5500);
    }

    function refresh() {
      perView = slidesPerView();
      index = Math.min(index, maxIndex());
      buildDots();
      update();
    }

    nextBtn.addEventListener("click", () => { next(); resetAuto(); });
    prevBtn.addEventListener("click", () => { prev(); resetAuto(); });
    window.addEventListener("resize", refresh);

    // swipe / drag support
    let startX = 0;
    let dragging = false;

    track.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX;
      clearInterval(autoTimer);
    });
    track.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      dragging = false;
      const delta = e.clientX - startX;
      if (delta > 50) prev();
      else if (delta < -50) next();
      resetAuto();
    });
    track.addEventListener("pointerleave", () => { dragging = false; });

    refresh();
    resetAuto();
  }

  /* ---------- newsletter form → FormSubmit.co ---------- */
  const form = document.querySelector("[data-newsletter-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector("button[type='submit']");
      const success = document.querySelector("[data-form-success]");
      const note = document.querySelector("[data-form-note]");
      const originalLabel = submitBtn.textContent;

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Request failed");
          if (success) success.classList.add("show");
          form.reset();
        })
        .catch(() => {
          if (note) {
            note.textContent =
              "Something went wrong sending that — try again, or email kyle@kylealexanderwrites.com directly.";
          }
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });
  }
});
