/* Services: circulation business rules shared by Librarian and Student modules */
const Svc = (() => {
  const S = Store,
    Q = Store.q;
  const bad = (msg) => ({ ok: false, msg }),
    good = (msg) => ({ ok: true, msg });
  const ev = (type, userId, bookId) =>
    S.add("log", {
      id: S.uid("E"),
      type,
      userId,
      bookId,
      date: Q.day(),
      ts: Date.now(),
    });
  const member = (ref) => {
    ref = (ref || "").trim().toLowerCase();
    return (
      ref &&
      S.get("users").find(
        (u) =>
          u.role === "student" &&
          (u.memberId.toLowerCase() === ref || u.email === ref),
      )
    );
  };
  const loan = (uid, bid) => Q.openOf(uid).find((t) => t.bookId === bid);
  function issue(ref, bookId) {
    const u = member(ref);
    if (!u) return bad("Member not found. Check the member ID.");
    if (u.status !== "Active") return bad("This member account is disabled.");
    const b = Q.book((bookId || "").trim().toUpperCase());
    if (!b) return bad("Book not found. Check the book ID.");
    const mine = Q.openOf(u.id);
    if (mine.some(Q.late))
      return bad("Member has overdue books. Return them first.");
    if (mine.some((t) => t.bookId === b.id))
      return bad("Member already has this book.");
    if (mine.length >= 5) return bad("Member reached the 5 book limit.");
    if (Q.avail(b.id) < 1) return bad("No copies available.");
    const due = Q.addDays(Q.day(), 14);
    S.add("tx", {
      id: S.uid("T"),
      bookId: b.id,
      userId: u.id,
      issued: Q.day(),
      due,
      returned: null,
      fine: 0,
      renewals: 0,
    });
    S.set(
      "res",
      S.get("res").filter((r) => !(r.userId === u.id && r.bookId === b.id)),
    );
    ev("Issue", u.id, b.id);
    return good(`Issued "${b.title}" to ${u.name}. Due ${fmt(due)}.`);
  }
  function ret(ref, bookId) {
    const u = member(ref);
    if (!u) return bad("Member not found. Check the member ID.");
    const id = (bookId || "").trim().toUpperCase(),
      t = loan(u.id, id);
    if (!t) return bad("No active loan for this member and book.");
    const fine = Q.fine(t);
    S.upd("tx", t.id, { returned: Q.day(), fine });
    ev("Return", u.id, id);
    return good(`Returned "${Q.book(id)?.title}". Fine: ₹${fine}.`);
  }
  function renew(ref, bookId, newDue) {
    const u = member(ref);
    if (!u) return bad("Member not found. Check the member ID.");
    const id = (bookId || "").trim().toUpperCase(),
      t = loan(u.id, id);
    if (!t) return bad("No active loan for this member and book.");
    if (Q.late(t))
      return bad("Overdue books cannot be renewed. Return it first.");
    if ((t.renewals || 0) >= 2) return bad("Renewal limit (2) reached.");
    if (
      S.get("res").some((r) => r.bookId === id && r.userId !== u.id) &&
      Q.avail(id) === 0
    )
      return bad("Another member has reserved this book.");
    let due = Q.addDays(t.due, 14);
    if (newDue && newDue.trim()) {
      due = newDue.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || isNaN(Date.parse(due)))
        return bad("Use the date format YYYY-MM-DD.");
      if (due <= t.due || due > Q.addDays(t.due, 30))
        return bad(
          "New due date must be after the current due date, within 30 days.",
        );
    }
    S.upd("tx", t.id, { due, renewals: (t.renewals || 0) + 1 });
    ev("Renew", u.id, id);
    return good(`Renewed "${Q.book(id)?.title}". New due date ${fmt(due)}.`);
  }
  function renewTx(txId, uid) {
    const t = S.get("tx").find((x) => x.id === txId);
    const u = Q.user(uid);
    if (!t || t.userId !== uid || !u) return bad("Loan not found.");
    return renew(u.memberId, t.bookId);
  }
  function reserve(uid, bookId) {
    if (!Q.book(bookId)) return bad("Book not found.");
    if (loan(uid, bookId)) return bad("You already have this book issued.");
    const mine = S.get("res").filter((r) => r.userId === uid);
    if (mine.some((r) => r.bookId === bookId))
      return bad("You already reserved this book.");
    if (mine.length >= 3) return bad("You can hold up to 3 reservations.");
    S.add("res", { id: S.uid("R"), bookId, userId: uid, date: Q.day() });
    return good("Book reserved. The library will hold it for you.");
  }
  function cancel(id, uid) {
    const r = S.get("res").find((x) => x.id === id);
    if (!r || r.userId !== uid) return bad("Reservation not found.");
    S.del("res", id);
    return good("Reservation cancelled.");
  }
  return { member, issue, ret, renew, renewTx, reserve, cancel };
})();
