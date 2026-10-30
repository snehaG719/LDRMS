/* Sliding role selector shared by login and signup */
const RoleSlider = (() => {
  const ROLES = ["student", "librarian", "admin"];
  function init(onChange, initial) {
    const right = $(".right"), seg = $(".seg"), tabs = [...seg.querySelectorAll("button")], view = $(".roles");
    let role = ROLES.includes(initial) ? initial : "student";
    const pick = (r, save = true) => {
      role = r;
      right.style.setProperty("--i", ROLES.indexOf(r));
      tabs.forEach((b) => { const on = b.dataset.role === r; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
      if (save) { try { localStorage.setItem("ldrms_role", r); } catch (e) {} }
      if (onChange) onChange(r);
    };
    tabs.forEach((b) => (b.onclick = () => pick(b.dataset.role)));
    seg.onkeydown = (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return;
      const n = ROLES[(ROLES.indexOf(role) + d + 3) % 3]; pick(n); tabs[ROLES.indexOf(n)].focus();
    };
    let x0 = null;
    view.addEventListener("pointerdown", (e) => (x0 = e.clientX));
    view.addEventListener("pointerup", (e) => {
      if (x0 === null) return; const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) pick(ROLES[Math.min(2, Math.max(0, ROLES.indexOf(role) + (dx < 0 ? 1 : -1)))]);
    });
    pick(role, false);
    return { get role() { return role; } };
  }
  return { init, ROLES };
})();
