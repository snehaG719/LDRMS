/* Auth: Dynamic hashing, session creation & module router */
const Auth = (() => {
  const ROOT = new URL("../", document.currentScript.src).href;
  const HOME = {
    admin: "Member4_Admin/admin/dashboard.html",
    librarian: "Member3_Librarian/librarian/dashboard.html",
    student: "Member1_Student_Core/student-core/dashboard.html",
  };
  const SK = "ldrms_session";

  // Safe SHA-256 hash generator
  async function hash(str) {
    if (!str) return "";
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
    } catch (e) {}
    return str;
  }

  const audit = (actor, action, detail = "") => {
    try {
      const a = Store.get("audit") || [];
      a.push({ ts: Date.now(), actor: actor || "admin", action, detail });
      Store.set("audit", a.slice(-200));
    } catch (e) {}
  };

  const emailTaken = (e) =>
    (Store.get("users") || []).some(
      (u) => (u.email || "").toLowerCase() === (e || "").trim().toLowerCase()
    );

  async function login(email, pw, role) {
    email = (email || "").trim().toLowerCase();
    pw = (pw !== undefined && pw !== null) ? String(pw).trim() : "";

    // 1. Khali field checking
    if (!email || !pw) {
      return { ok: false, msg: "Email and password are required." };
    }

    const users = Store.get("users") || [];
    const u = users.find((x) => (x.email || "").toLowerCase() === email);

    // 2. User exist check
    if (!u) {
      return { ok: false, msg: "Invalid email or password." };
    }

    // 3. STRICT PASSWORD VALIDATION
    // Database me maujood plain ya hash password nikalna
    const targetPlain = String(u.password ?? u.pass ?? "").trim();
    const targetHash = String(u.passwordHash ?? "").trim();

    // Input password ka hash
    const inputHash = await hash(pw);

    let isPasswordCorrect = false;

    // A. Direct string match
    if (targetPlain && targetPlain === pw) {
      isPasswordCorrect = true;
    }
    // B. Input hashed matches database hash
    else if (targetHash && targetHash === inputHash) {
      isPasswordCorrect = true;
    }
    // C. Database me plain password agar hash banakar match ho
    else if (targetPlain && targetPlain === inputHash) {
      isPasswordCorrect = true;
    }
    // D. Direct hash value entered
    else if (targetHash && targetHash === pw) {
      isPasswordCorrect = true;
    }

    // Galat password strictly block hoga
    if (!isPasswordCorrect) {
      return { ok: false, msg: "Invalid email or password." };
    }

    // 4. Role mismatch checking (Role & Type dono check karta hai)
    const userRole = (u.role || u.type || "").toLowerCase();
    const reqRole = (role || "").toLowerCase();
    if (reqRole && userRole && userRole !== reqRole) {
      return { ok: false, msg: `This account is a ${userRole}. Select ${userRole} tab above.` };
    }

    // 5. Session creation
    const activeRole = u.role || u.type || reqRole || "student";
    const sess = {
      token: "TKN-" + Date.now(),
      uid: u.id,
      role: activeRole,
      user: u,
      start: Date.now(),
      last: Date.now(),
    };

    sessionStorage.setItem(SK, JSON.stringify(sess));
    localStorage.setItem("ldrms_role", activeRole);
    audit(email, "login", activeRole);
    return { ok: true, role: activeRole };
  }

  function session() {
    try {
      return JSON.parse(sessionStorage.getItem(SK));
    } catch (e) {
      return null;
    }
  }

  function guard(role) {
    const s = session();
    if (!s) {
      location.replace(ROOT + "login.html");
      return null;
    }
    return s;
  }

  function logout() {
    const s = session();
    if (s && s.user) audit(s.user.email, "logout");
    sessionStorage.removeItem(SK);
    location.replace(ROOT + "login.html");
  }

  return {
    ROOT,
    HOME,
    login,
    hash,
    session,
    guard,
    logout,
    audit,
    emailTaken,
    strength: (pw) => (pw.length >= 8 ? 4 : pw.length >= 6 ? 2 : 1),
    rules: (pw) => (pw.length < 6 ? ["at least 6 characters"] : []),
  };
})();

window.Auth = Auth;