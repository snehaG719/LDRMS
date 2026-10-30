/* Librarian module pages */
(() => {
  const S = Store,
    Q = Store.q,
    P = (window.Pages = window.Pages || {});

  const catOptions = (sel) => {
    const c = [...new Set(S.get("books").map((b) => b.category))].sort();
    sel.innerHTML =
      "<option>All Categories</option>" +
      c.map((x) => `<option>${esc(x)}</option>`).join("");
  };

  const field = (l) => {
    const f = $$(".field").find((x) => $("label", x).textContent.trim() === l);
    return f && $("input", f);
  };

  function form(label, keys, run) {
    const btn = $("a.primary");
    if (!btn) return;
    btn.textContent = btn.textContent.replace(/\s*\(Demo\)/, "");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const r = run(...keys.map((k) => field(k).value));
      toast(r.msg, r.ok ? "ok" : "bad");
      if (r.ok) {
        keys.forEach((k) => (field(k).value = ""));
        if (typeof renderPendingRequests === "function") renderPendingRequests();
      }
    });
  }

  // Dashboard
  P["librarian/dashboard"] = () => {
    const today = Q.day(),
      ev = S.get("log"),
      copies = S.get("books").reduce((a, b) => a + b.copies, 0);
    stat(0, copies.toLocaleString("en-IN"), "Catalogue inventory");
    stat(
      1,
      ev.filter((e) => e.type === "Issue" && e.date === today).length,
      "Completed",
      "green",
    );
    stat(
      2,
      ev.filter((e) => e.type === "Return" && e.date === today).length,
      "Processed",
    );
    stat(
      3,
      S.get("users")
        .filter((u) => u.role === "student" && u.status === "Active")
        .length.toLocaleString("en-IN"),
      "Current accounts",
    );
    fill(
      $(".panel table"),
      ev
        .slice()
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 8)
        .map((e) => {
          const u = Q.user(e.userId) || {};
          return `<tr><td>${esc(u.name)}<br><span class="muted">${esc(u.memberId)}</span></td><td>${esc(Q.book(e.bookId)?.title || e.bookId)}</td><td>${e.type}</td><td>${fmt(e.date)}</td><td>${badge(e.type === "Renew" ? "Renewed" : "Completed", e.type === "Renew" ? "warn" : "")}</td></tr>`;
        }),
      5,
    );
  };

  // Issue Book Screen (Manual Form + Student Requests Table)
  P["librarian/issue"] = () => {
    form("issue", ["Member ID", "Book ID"], Svc.issue);

    const renderPendingRequests = () => {
      const tbody = $("#pendingIssueTable tbody");
      if (!tbody) return;

      const reservations = S.get("res") || [];

      if (reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:18px; color:#94a3b8;">No pending student reservations found.</td></tr>`;
        return;
      }

      tbody.innerHTML = reservations.map((r) => {
        const u = Q.user(r.userId) || { name: "Student", memberId: r.userId };
        const b = Q.book(r.bookId) || { title: r.bookId, id: r.bookId };
        const avail = Q.avail(r.bookId);

        return `<tr>
          <td><strong>${esc(u.name)}</strong></td>
          <td><code>${esc(u.memberId || u.id)}</code></td>
          <td>${esc(b.title)} <br><small class="muted">${esc(b.id)}</small></td>
          <td>${fmt(r.date)}</td>
          <td>${avail > 0 ? badge("In Stock (" + avail + ")") : badge("Out of Stock", "danger")}</td>
          <td>
            <button onclick="approveReservation('${esc(r.id)}', '${esc(u.memberId || u.id)}', '${esc(b.id)}')" 
                    style="background:#16a34a; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-weight:600; cursor:pointer;"
                    ${avail <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
              Approve & Issue
            </button>
          </td>
        </tr>`;
      }).join("");
    };

    renderPendingRequests();
    window.renderPendingRequests = renderPendingRequests;
  };

  // Catalogue
  P["librarian/catalogue"] = () => {
    const input = $(".toolbar input"),
      sel = $(".toolbar select");
    catOptions(sel);
    const draw = () => {
      const q = input.value.toLowerCase();
      fill(
        $(".panel table"),
        S.get("books")
          .filter(
            (b) =>
              (sel.value === "All Categories" || b.category === sel.value) &&
              (!q ||
                (b.id + b.title + b.author + b.category)
                  .toLowerCase()
                  .includes(q)),
          )
          .map(
            (b) =>
              `<tr><td>${esc(b.id)}</td><td>${esc(b.title)}</td><td>${esc(b.category)}</td><td>${Q.avail(b.id)}</td><td>${Common.bookBadge(b)}</td></tr>`,
          ),
        5,
      );
    };
    onToolbar(draw);
    draw();
  };

  // Return & Renew
  P["librarian/return"] = () =>
    form("return", ["Book ID", "Member ID"], (b, m) => Svc.ret(m, b));

  P["librarian/renew"] = () => {
    const d = field("New Due Date");
    if (d) d.placeholder = "YYYY-MM-DD (optional, default +14 days)";
    const btn = $("a.primary");
    if (btn) {
      btn.textContent = btn.textContent.replace(/\s*\(Demo\)/, "");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const r = Svc.renew(
          field("Member ID").value,
          field("Book ID").value,
          d.value,
        );
        toast(r.msg, r.ok ? "ok" : "bad");
        if (r.ok)
          ["Book ID", "Member ID", "New Due Date"].forEach(
            (k) => (field(k).value = ""),
          );
      });
    }
  };

  P["librarian/members"] = () => Common.members(false);
  P["librarian/notices"] = () => {
    $(".panel").innerHTML = Common.noticesHtml(false);
  };
})();

// Global Action to Approve student hold
window.approveReservation = function(resId, memberId, bookId) {
  const r = Svc.issue(memberId, bookId);
  if (r.ok) {
    Store.del("res", resId); // Reservation list se clear
    toast("Book issued to student successfully!", "ok");
    if (typeof window.renderPendingRequests === "function") {
      window.renderPendingRequests();
    }
  } else {
    toast(r.msg, "bad");
  }
};