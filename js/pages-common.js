/* Page logic shared by more than one module */
window.Pages = window.Pages || {};

const Common = (() => {
  const S = Store,
    Q = Store.q;

  const bookBadge = (b) => {
    const t = Q.status(b);
    return badge(
      t,
      t === "Available" ? "" : t === "Limited" ? "warn" : "danger",
    );
  };

  const noticesHtml = (admin) =>
    (S.get("notices") || [])
      .slice()
      .reverse()
      .map(
        (n) =>
          `<div class="notice">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <strong>${esc(n.title)}</strong>
              ${admin ? `<button class="mini red" data-act="delnotice" data-id="${esc(n.id)}">Delete</button>` : ""}
            </div>
            <p>${esc(n.body)}</p>
            <small class="muted">${fmt(n.date)}</small>
          </div>`,
      )
      .join("") || '<p class="muted">No notices posted yet.</p>';

  const members = (admin) => {
    const t = $(".panel table");
    if (admin) addCol(t);

    const input = $(".toolbar input");
    const sel = $(".toolbar select");

    // Dropdown me All Members option ensure karo
    if (sel) {
      sel.innerHTML = `
        <option value="All">All Members</option>
        <option value="Student">Students</option>
        <option value="Librarian">Librarians</option>
        <option value="Staff">Staff / Faculty</option>
      `;
    }

    const draw = () => {
      const q = input ? input.value.toLowerCase().trim() : "";
      const filterVal = sel ? sel.value : "All";
      const users = S.get("users") || [];

      const filtered = users.filter((u) => {
        const uRole = (u.role || "").toLowerCase();
        const uType = (u.type || "").toLowerCase();

        // Role & Type matching
        let matchType = true;
        if (filterVal === "Student") matchType = uRole === "student" || uType === "student";
        else if (filterVal === "Librarian") matchType = uRole === "librarian" || uType === "librarian";
        else if (filterVal === "Staff") matchType = uRole !== "student" || uType !== "student";

        const textMatch = !q || 
          (u.name || "").toLowerCase().includes(q) || 
          (u.email || "").toLowerCase().includes(q) || 
          (u.memberId || "").toLowerCase().includes(q);

        return matchType && textMatch;
      });

      fill(
        t,
        filtered.map((u) => {
          const activeLoans = (Q.openOf ? Q.openOf(u.id) : []).length;
          return `<tr>
            <td>
              <strong>${esc(u.name || "User")}</strong><br>
              <span class="muted">${esc(u.email || "")}</span>
            </td>
            <td><code>${esc(u.memberId || u.id)}</code></td>
            <td>${esc(u.type || (u.role === "student" ? "Student" : u.role === "librarian" ? "Librarian" : "Staff"))}</td>
            <td>${activeLoans}</td>
            <td>${badge(u.status || "Active", u.status === "Active" ? "" : "danger")}</td>
            ${admin ? `<td>${mini("deluser", u.id, "Delete", 1)}</td>` : ""}
          </tr>`;
        }),
        admin ? 6 : 5,
      );
    };

    if (input && sel) onToolbar(draw);
    draw();

    if (admin) {
      document.addEventListener("click", async (e) => {
        const btn = e.target.closest('[data-act="deluser"]');
        if (!btn) return;
        const uid = btn.dataset.id;
        if (await Modal.ask("Are you sure you want to remove this member?", "Delete", true)) {
          S.del("users", uid);
          toast("Member removed.");
          draw();
        }
      });
    }
  };

  const actorEmail = () => {
    try {
      const s = JSON.parse(sessionStorage.getItem("ldrms_session"));
      return (s && s.user && s.user.email) ? s.user.email : "admin@gla.edu";
    } catch (e) {
      return "admin@gla.edu";
    }
  };

  return { bookBadge, noticesHtml, members, actorEmail };
})();

window.Common = Common;