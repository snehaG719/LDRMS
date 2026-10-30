/* One-time terminal typing effect on the auth pages */
(() => {
  const el = document.getElementById("term");
  if (!el) return;
  const lines = [
    "$ ldrms --connect gla.edu",
    "[ok] catalogue online",
    "[ok] digital repository online",
    "[ok] roles: student | librarian | admin",
    "$ authenticate",
  ];
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = lines.join("\n");
    return;
  }
  let l = 0,
    c = 0,
    out = "";
  const tick = () => {
    if (l >= lines.length) {
      el.innerHTML = esc(out) + '<span class="cur"></span>';
      return;
    }
    out += lines[l][c++] || "";
    if (c > lines[l].length) {
      out += "\n";
      l++;
      c = 0;
    }
    el.innerHTML =
      esc(out).replace(/\[ok\]/g, '<span class="ok">[ok]</span>') +
      '<span class="cur"></span>';
    setTimeout(tick, c === 0 ? 220 : 22);
  };
  tick();
})();
