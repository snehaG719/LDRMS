/* Student module pages */
(() => {
  const S = Store,
    Q = Store.q,
    P = (window.Pages = window.Pages || {});

  const ICON = {
    "E-Book": "📘",
    "Question Paper": "📄",
    "Study Material": "📑",
  };

  // 1. Dashboard
  P["student/dashboard"] = (s) => {
    const uid = s.uid,
      myIds = [uid, s.user?.memberId, s.user?.id, s.user?.name].filter(Boolean),
      allTx = S.get("tx") || [],
      allRes = S.get("res") || [];

    const open = allTx.filter((t) => (myIds.includes(t.userId) || myIds.includes(t.memberId)) && !t.returned);
    const res = allRes.filter((r) => myIds.includes(r.userId) || myIds.includes(r.memberId) || myIds.includes(r.userName));
    const fines = open.reduce((a, t) => a + (Q.fine ? Q.fine(t) : 0), 0);

    stat(0, open.length, "Checked out");
    stat(1, res.length, "Active holds");
    stat(2, "₹" + fines, fines ? "Dues pending" : "No dues", fines ? "red" : "");
    stat(
      3,
      S.get("digital").filter((d) => d.status === "Active").length,
      "Repository items",
    );

    const tbls = $$(".panel table");
    if (tbls[0]) {
      fill(
        tbls[0],
        open.map((t) => {
          const b = Q.book(t.bookId);
          return `<tr><td>${esc(b ? b.title : t.bookId)}</td><td>${fmt(t.issued)}</td><td>${fmt(t.due)}</td><td>${badge(Q.late(t) ? "Overdue" : "Issued", Q.late(t) ? "danger" : "")}</td></tr>`;
        }),
        4,
      );
    }

    if (tbls[1]) {
      fill(
        tbls[1],
        res.map((r) => {
          const b = Q.book(r.bookId);
          return `<tr><td>${esc(b ? b.title : r.bookId)}</td><td>${fmt(r.date)}</td><td>${badge("Reserved")}</td></tr>`;
        }),
        3,
      );
    }
  };

  // 2. Catalogue
  P["student/catalog"] = () => {
    const [input] = $$(".toolbar input"),
      [typeSel, catSel] = $$(".toolbar select");

    const isDigitalReq = new URLSearchParams(location.search).get("type") === "digital";
    if (isDigitalReq && typeSel) {
      typeSel.value = "Digital Resources";
    }

    if (input) input.value = new URLSearchParams(location.search).get("q") || "";

    const cats = [
      ...new Set(
        [...S.get("books"), ...S.get("digital")].map((x) => x.category),
      ),
    ].sort();

    if (catSel) {
      catSel.innerHTML =
        "<option>All Categories</option>" +
        cats.map((c) => `<option>${esc(c)}</option>`).join("");
    }

    const card = (icon, title, sub, bd, id, isPhysical) =>
      `<div class="book" style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
        <div>
          <div class="cover">${icon}</div>
          <div style="margin:8px 0 4px 0;">
            <span style="background:${isPhysical ? "#e0e7ff" : "#f1f5f9"}; color:${isPhysical ? "#3730a3" : "#475569"}; font-weight:700; font-size:12px; padding:3px 8px; border-radius:4px; display:inline-block; border:1px solid ${isPhysical ? "#c7d2fe" : "#cbd5e1"};">
              ID: ${esc(id)}
            </span>
          </div>
          <h3 style="margin:6px 0 4px 0; font-size:15px; color:#0f172a;">${esc(title)}</h3>
          <p style="margin:0 0 10px 0; font-size:12px; color:#64748b;">${esc(sub)}</p>
          ${bd}
        </div>
        <div style="margin-top:14px;">
          <a href="book-details.html?id=${encodeURIComponent(id)}" class="primary" style="display:inline-block; font-size:12px; padding:6px 14px; text-decoration:none; border-radius:6px; background:#2563eb; color:#fff; font-weight:600;">View Details →</a>
        </div>
      </div>`;

    const draw = () => {
      const q = input ? input.value.toLowerCase().trim() : "",
        tp = typeSel ? typeSel.value : "All",
        c = catSel ? catSel.value : "All Categories",
        out = [];

      const hit = (x) =>
        (c === "All Categories" || x.category === c) &&
        (!q || (x.id + " " + x.title + " " + (x.author || "") + " " + x.category).toLowerCase().includes(q));

      if (tp !== "Digital Resources") {
        S.get("books")
          .filter(hit)
          .forEach((b) =>
            out.push(
              card(
                b.icon || "📘",
                b.title,
                b.author + " • " + b.category,
                Common.bookBadge(b),
                b.id,
                true,
              ),
            ),
          );
      }

      if (tp !== "Physical Books") {
        S.get("digital")
          .filter((d) => d.status === "Active" && hit(d))
          .forEach((d) =>
            out.push(
              card(
                ICON[d.type] || "📄",
                d.title,
                d.type + " • " + d.category,
                badge("Online"),
                d.id,
                false,
              ),
            ),
          );
      }

      const grid = $(".book-grid");
      if (grid) {
        grid.innerHTML =
          out.join("") || '<p class="muted">No matching books found.</p>';
      }
    };

    onToolbar(draw);
    draw();
  };

  // 3. Book Details & Reserve
  P["student/book-details"] = (s) => {
    const params = new URLSearchParams(location.search);
    const bookId = params.get("id");
    const book = Q.book(bookId);

    if (!book) {
      toast("Book details not found.", "bad");
      return;
    }

    const eyebrow = $(".eyebrow");
    if (eyebrow) {
      eyebrow.innerHTML = `CATALOGUE ITEM &nbsp;•&nbsp; <span style="background:#e0e7ff; color:#3730a3; padding:2px 8px; border-radius:4px; font-weight:700;">BOOK ID: ${esc(book.id)}</span>`;
    }

    const titleEl = $(".panel h2, .panel h1, .panel h3");
    if (titleEl) titleEl.textContent = book.title;

    const authEl = $(".panel > p");
    if (authEl) authEl.textContent = book.author || "Unknown Author";

    const btn = document.querySelector(".panel .primary, button.primary, a.primary");
    if (btn) {
      const allRes = S.get("res") || [];
      const myIds = [s.uid, s.user?.memberId, s.user?.id, s.user?.name].filter(Boolean);
      const alreadyReserved = allRes.some((r) => r.bookId === book.id && (myIds.includes(r.userId) || myIds.includes(r.memberId)));

      if (alreadyReserved) {
        btn.textContent = "✓ Already Reserved";
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
        btn.onclick = (e) => e.preventDefault();
        return;
      }

      btn.textContent = "Reserve Book";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";

      btn.onclick = (e) => {
        e.preventDefault();
        try {
          const resList = S.get("res") || [];
          const newReservation = {
            id: S.uid("R"),
            bookId: book.id,
            userId: s.uid,
            memberId: s.user?.memberId || s.uid,
            userName: s.user?.name || "Student",
            date: Q.day(),
            status: "Reserved",
          };

          resList.push(newReservation);
          S.set("res", resList);

          if (typeof Auth !== "undefined" && Auth.audit) {
            Auth.audit(s.user ? s.user.email : s.uid, "book_reserved", book.id);
          }

          toast("Book reserved successfully! Sent to Librarian Desk.", "ok");
          btn.textContent = "✓ Requested";
          btn.style.opacity = "0.7";
          btn.style.cursor = "not-allowed";
          btn.onclick = (ev) => ev.preventDefault();
        } catch (err) {
          console.error(err);
          toast("Reservation failed.", "bad");
        }
      };
    }
  };

  // 4. Circulation: Self-Repairing Panel Insertion
  P["student/circulation"] = (s) => {
    const uid = s.uid;
    const myIds = [uid, s.user?.memberId, s.user?.id, s.user?.name].filter(Boolean);
    const allTx = S.get("tx") || [];
    const allRes = S.get("res") || [];

    const open = allTx.filter((t) => (myIds.includes(t.userId) || myIds.includes(t.memberId)) && !t.returned);
    const res = allRes.filter((r) => myIds.includes(r.userId) || myIds.includes(r.memberId) || myIds.includes(r.userName));
    const returnedCount = allTx.filter((t) => (myIds.includes(t.userId) || myIds.includes(t.memberId)) && t.returned).length;
    const totalFine = open.reduce((acc, t) => acc + (Q.fine ? Q.fine(t) : 0), 0);

    stat(0, open.length, "Books with you");
    stat(1, res.length, res.length ? "Active holds" : "No holds");
    stat(2, "₹" + totalFine, totalFine ? "1 overdue item" : "No dues", totalFine ? "red" : "");
    stat(3, returnedCount, "Past transactions");

    // Table 1: Issued Books
    const issuedTable = document.querySelector(".panel table");
    if (issuedTable) {
      fill(
        issuedTable,
        open.map((t) => {
          const b = Q.book(t.bookId);
          return `<tr>
            <td><strong>${esc(b ? b.title : t.bookId)}</strong><br><small class="muted">ID: ${esc(t.bookId)}</small></td>
            <td>${fmt(t.issued)}</td>
            <td>${fmt(t.due)}</td>
            <td>${badge(Q.late(t) ? "Overdue" : "Issued", Q.late(t) ? "danger" : "")}</td>
          </tr>`;
        }),
        4,
      );
    }

    // Table 2: Active Reservations Panel (Auto Injected if missing)
    let resPanel = document.getElementById("studentResPanel");
    if (!resPanel) {
      const mainContent = document.querySelector("main.content") || document.querySelector(".content");
      if (mainContent) {
        mainContent.insertAdjacentHTML(
          "beforeend",
          `<div class="panel" id="studentResPanel" style="margin-top:24px;">
            <div class="panel-head" style="margin-bottom:12px;">
              <h3>Active Reservations & Holds</h3>
              <p class="muted">Aapki reserve ki hui books jo Librarian ke approval ka wait kar rahi hain</p>
            </div>
            <table class="table" id="studentResTable">
              <thead>
                <tr>
                  <th>BOOK</th>
                  <th>REQUEST DATE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>`
        );
      }
    }

    const resTbl = document.getElementById("studentResTable") || $$(".panel table")[1];
    if (resTbl) {
      if (res.length === 0) {
        fill(resTbl, ['<tr><td colspan="4" style="text-align:center; padding:16px; color:#64748b;">Koi active reservation nahi hai.</td></tr>'], 4);
      } else {
        fill(
          resTbl,
          res.map((r) => {
            const b = Q.book(r.bookId);
            return `<tr>
              <td><strong>${esc(b ? b.title : r.bookId)}</strong><br><small class="muted">Book ID: <code>${esc(r.bookId)}</code></small></td>
              <td>${fmt(r.date)}</td>
              <td><span class="badge warn">Pending Issue Desk</span></td>
              <td><button class="mini red" onclick="cancelStudentRes('${r.id}')">Cancel Hold</button></td>
            </tr>`;
          }),
          4,
        );
      }
    }
  };
})();

window.cancelStudentRes = (id) => {
  Store.del("res", id);
  toast("Reservation cancelled.");
  location.reload();
};