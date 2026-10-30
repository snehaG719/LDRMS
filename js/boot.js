/* Boot: guard every module page, decorate the shell, run the page script */
(() => {
  const parts = location.pathname.split("/").filter(Boolean);
  const page = (parts.pop() || "").replace(".html", ""),
    dir = parts.pop();
  const role = {
    admin: "admin",
    librarian: "librarian",
    "student-core": "student",
  }[dir];
  if (!role) return;
  document.documentElement.style.visibility = "hidden";
  const s = Auth.guard(role);
  if (!s) return;
  const LABEL = {
    admin: "Administrator",
    librarian: "Librarian",
    student: "Student",
  };

  document.addEventListener("DOMContentLoaded", () => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = Auth.ROOT + "css/app.css";
    document.head.append(l);

    const u = s.user || {},
      ini = (u.name || "U")
        .split(" ")
        .filter((x) => !/^Dr\.?$/i.test(x))
        .map((x) => x[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const hu = $(".header .user");
    if (hu) hu.innerHTML = `<div class="avatar">${esc(ini)}</div>${esc(u.name || "User")}`;

    const su = $(".side-user");
    if (su) su.innerHTML = `<strong>${esc(u.name || "User")}</strong>${LABEL[role]}<br><span>${esc(u.memberId || "")}</span>`;

    // --- SIDEBAR AUTOMATIC REPAIR & LINK FIXES ---
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      // 1. Digital Library shortcut fix
      const digLink = Array.from(sidebar.querySelectorAll("a")).find((a) =>
        a.textContent.toLowerCase().includes("digital library")
      );
      if (digLink) {
        digLink.setAttribute("href", "catalog.html?type=digital");
      }

      // 2. Reservations navigation fix (Smooth scroll to panel)
      const resNav = Array.from(sidebar.querySelectorAll("a")).find((a) =>
        a.textContent.toLowerCase().includes("reservation")
      );
      if (resNav) {
        resNav.onclick = (e) => {
          const panels = document.querySelectorAll(".panel");
          const targetSec =
            document.getElementById("reservations") ||
            document.getElementById("reservations-sec") ||
            panels[1];
          if (targetSec && location.pathname.includes("circulation.html")) {
            e.preventDefault();
            targetSec.scrollIntoView({ behavior: "smooth" });
          } else if (!location.pathname.includes("circulation.html")) {
            resNav.href = "circulation.html#reservations";
          }
        };
      }

      // 3. Home aur redundant Change Password links hatana
      sidebar.querySelectorAll("a").forEach((a) => {
        const txt = a.textContent.toLowerCase();
        const href = a.getAttribute("href") || "";
        if (
          txt.includes("home") ||
          href.includes("index.html") ||
          txt.includes("change password") ||
          a.dataset.sys === "pw"
        ) {
          a.remove();
        }
      });

      // 4. Duplicate profile link hatana aur single profile.html active rakhna
      const allProfiles = Array.from(sidebar.querySelectorAll("a")).filter((a) =>
        a.textContent.toLowerCase().includes("profile")
      );

      if (allProfiles.length > 0) {
        allProfiles[0].setAttribute("href", "profile.html");
        for (let i = 1; i < allProfiles.length; i++) {
          allProfiles[i].remove();
        }
      } else {
        const lastNav =
          sidebar.querySelector(".nav:last-of-type") ||
          sidebar.querySelector("a:last-of-type");
        if (lastNav) {
          lastNav.insertAdjacentHTML(
            "afterend",
            '<a class="nav" href="profile.html"><span>●</span>Profile</a>'
          );
        }
      }

      // 5. Ensure single Log Out button at the bottom
      sidebar.querySelectorAll('a[data-sys="out"]').forEach((a, i) => {
        if (i > 0) a.remove();
      });
      if (!sidebar.querySelector('a[data-sys="out"]')) {
        const lastNav =
          sidebar.querySelector(".nav:last-of-type") ||
          sidebar.querySelector("a:last-of-type");
        if (lastNav) {
          lastNav.insertAdjacentHTML(
            "afterend",
            '<a class="nav" href="#" data-sys="out"><span>⏻</span>Log Out</a>'
          );
        }
      }
    }

    // Global Log Out click listener
    document.addEventListener("click", (e) => {
      const a = e.target.closest('[data-sys="out"]');
      if (!a) return;
      e.preventDefault();
      Auth.logout();
    });

    try {
      const fn = (window.Pages || {})[role + "/" + page];
      if (fn) fn(s);
    } catch (err) {
      console.error(err);
    }
    document.documentElement.style.visibility = "";
  });
})();