/* Store: single versioned database in localStorage + query helpers */
const Store = (() => {
  const KEY = "ldrms_db_v2";
  const day = (n = 0) =>
    new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

  const seed = () => {
    const tx = [
      ["T-1", "CN-1024", "u-stu", -20, -6, null, 0],
      ["T-2", "OS-2045", "u-stu", -3, 11, null, 0],
      ["T-3", "DB-3001", "u-stu", -5, 9, null, 0],
      ["T-4", "CN-1024", "u-ana", -8, 6, null, 0],
      ["T-5", "CS-4012", "u-rah", -2, 12, null, 0],
      ["T-6", "AI-5001", "u-ana", -30, -16, -17, 0],
      ["T-7", "OS-2045", "u-rah", -40, -26, -20, 12],
      ["T-8", "OS-2045", "u-neha", -6, 8, null, 0],
    ].map(([id, bookId, userId, i, d, r, fine]) => ({
      id,
      bookId,
      userId,
      issued: day(i),
      due: day(d),
      returned: r === null ? null : day(r),
      fine,
      renewals: 0,
    }));

    const log = [];
    tx.forEach((t) => {
      log.push({
        id: "E-" + t.id + "i",
        type: "Issue",
        userId: t.userId,
        bookId: t.bookId,
        date: t.issued,
        ts: Date.parse(t.issued),
      });
      if (t.returned)
        log.push({
          id: "E-" + t.id + "r",
          type: "Return",
          userId: t.userId,
          bookId: t.bookId,
          date: t.returned,
          ts: Date.parse(t.returned),
        });
    });

    const usersList = (typeof SEED_USERS !== "undefined") ? SEED_USERS : [];

    return {
      users: usersList,
      books: [
        {
          id: "CN-1024",
          title: "Computer Networks",
          author: "Andrew S. Tanenbaum & David J. Wetherall",
          category: "Computer Science",
          type: "Book",
          copies: 20,
          isbn: "9780132126953",
          location: "Central Library • Shelf C-14",
          icon: "🌐",
        },
        {
          id: "OS-2045",
          title: "Operating System Concepts",
          author: "Silberschatz",
          category: "Computer Science",
          type: "Book",
          copies: 10,
          isbn: "",
          location: "Central Library • Shelf C-09",
          icon: "💻",
        },
        {
          id: "CS-4012",
          title: "Cyber Security Fundamentals",
          author: "William Stallings",
          category: "Cyber Security",
          type: "Book",
          copies: 15,
          isbn: "",
          location: "Central Library • Shelf S-03",
          icon: "🔐",
        },
        {
          id: "AI-5001",
          title: "Artificial Intelligence",
          author: "Russell & Norvig",
          category: "Data Science",
          type: "Book",
          copies: 12,
          isbn: "",
          location: "Central Library • Shelf D-21",
          icon: "🧠",
        },
        {
          id: "DB-3001",
          title: "Database System Concepts",
          author: "Silberschatz",
          category: "Computer Science",
          type: "Book",
          copies: 8,
          isbn: "",
          location: "Central Library • Shelf C-11",
          icon: "🗄️",
        },
      ],
      digital: [
        { id: "DR-001", title: "Introduction to Algorithms", type: "E-Book", category: "Computer Science", status: "Active" },
        { id: "DR-002", title: "Operating Systems Lecture Notes", type: "Study Material", category: "Computer Science", status: "Active" },
        { id: "DR-003", title: "Computer Networks Paper 2025", type: "Question Paper", category: "Computer Science", status: "Active" },
        { id: "DR-004", title: "Cyber Security Lab Manual", type: "Study Material", category: "Cyber Security", status: "Active" },
        { id: "DR-005", title: "Clean Code", type: "E-Book", category: "Computer Science", status: "Active" }
      ],
      tx,
      log,
      res: [],
      audit: [],
      notices: [
        {
          id: "N-1",
          title: "Extended reading hall hours",
          body: "Reading hall remains open until 10:00 PM during examinations.",
          date: day(-2),
        },
      ],
    };
  };

  const load = () => {
    let x = null;
    try {
      x = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      x = null;
    }
    if (!x || !Array.isArray(x.users) || x.users.length === 0) {
      x = seed();
      localStorage.setItem(KEY, JSON.stringify(x));
    }
    return x;
  };

  const get = (k) => (load()[k] || []);
  const set = (k, v) => {
    const x = load();
    x[k] = v;
    localStorage.setItem(KEY, JSON.stringify(x));
  };

  const q = {
    day,
    addDays: (d, n) =>
      new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10),
    book: (id) => get("books").find((b) => b.id === id),
    user: (id) => get("users").find((u) => u.id === id || u.email === id || u.memberId === id),
    open: () => get("tx").filter((t) => !t.returned),
    openOf: (uid) => q.open().filter((t) => t.userId === uid),
    avail: (id) => {
      const b = q.book(id);
      return b
        ? Math.max(0, b.copies - q.open().filter((t) => t.bookId === id).length)
        : 0;
    },
    status: (b) => {
      const a = q.avail(b.id);
      return a === 0
        ? "Unavailable"
        : a / b.copies <= 0.4
          ? "Limited"
          : "Available";
    },
    late: (t) => !t.returned && t.due < day(),
    fine: (t) =>
      t.returned
        ? t.fine || 0
        : t.due < day()
          ? Math.floor((Date.parse(day()) - Date.parse(t.due)) / 864e5) * 2
          : 0,
  };

  return {
    q,
    get,
    set,
    add: (k, i) => {
      set(k, [...get(k), i]);
      return i;
    },
    upd: (k, id, p) =>
      set(
        k,
        get(k).map((r) => (r.id === id ? { ...r, ...p } : r)),
      ),
    del: (k, id) =>
      set(
        k,
        get(k).filter((r) => r.id !== id),
      ),
    uid: (p) =>
      p +
      "-" +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 5),
    reset: () => localStorage.removeItem(KEY),
  };
})();

// Window par bind karo taaki kabhi bhi Store is not defined na aaye
window.Store = Store;