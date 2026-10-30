(() => {
  const f = document.getElementById("f");
  if (!f) return;
  const el = f.elements,
    msg = document.getElementById("msg"),
    eh = document.getElementById("eh"),
    ph = document.getElementById("ph");
  const bars = [...document.querySelectorAll(".meter i")];

  let selectedRole = "student";

  // Role Slider Handling
  if (typeof RoleSlider !== "undefined") {
    RoleSlider.init((r) => {
      selectedRole = r;
      const typeBox = document.getElementById("typeBox");
      if (typeBox) typeBox.hidden = r !== "student";
      const codeBox = document.getElementById("codeBox");
      if (codeBox) codeBox.hidden = r === "student";
    }, new URLSearchParams(location.search).get("role"));
  }

  // Password Show/Hide Toggle
  const eye = document.getElementById("eye");
  if (eye) {
    eye.onclick = (e) => {
      e.preventDefault();
      const p = el.password;
      p.type = p.type === "password" ? "text" : "password";
      eye.textContent = p.type === "password" ? "Show" : "Hide";
    };
  }

  // Real-time Email Check
  if (el.email) {
    el.email.oninput = () => {
      const v = el.email.value.trim().toLowerCase();
      if (!v) {
        if (eh) eh.textContent = "";
        return;
      }
      let taken = false;
      try {
        if (typeof Auth !== "undefined" && typeof Auth.emailTaken === "function") {
          taken = Auth.emailTaken(v);
        } else if (typeof Store !== "undefined" && typeof Store.get === "function") {
          taken = Store.get("users").some((u) => (u.email || "").toLowerCase() === v);
        }
      } catch (err) {}
      if (eh) {
        eh.className = "hint " + (taken ? "bad" : "good");
        eh.textContent = taken ? "This email is already registered." : "Email is available.";
      }
    };
  }

  // Password Strength Meter
  if (el.password) {
    el.password.oninput = () => {
      const v = el.password.value;
      const sc = v.length >= 8 ? 4 : v.length >= 6 ? 2 : 1;
      bars.forEach((b, i) => b.classList.toggle("on", i < sc));
      if (ph) {
        ph.className = "hint " + (v.length >= 6 ? "good" : "");
        ph.textContent = v.length >= 6 ? "Strong enough." : "Must be at least 6 characters.";
      }
    };
  }

  // Form Submission
  f.onsubmit = async (e) => {
    e.preventDefault();
    if (msg) {
      msg.className = "msg";
      msg.textContent = "";
    }

    if (el.password.value !== el.confirm.value) {
      if (msg) {
        msg.className = "msg bad";
        msg.textContent = "Passwords do not match.";
      }
      return;
    }

    if (el.password.value.length < 6) {
      if (msg) {
        msg.className = "msg bad";
        msg.textContent = "Password must be at least 6 characters.";
      }
      return;
    }

    const b = f.querySelector(".btn");
    if (b) b.disabled = true;
    if (msg) msg.textContent = "Creating account...";

    try {
      const name = (el.name.value || "").trim();
      const email = (el.email.value || "").trim().toLowerCase();
      const password = el.password.value;
      const role = selectedRole || "student";
      const type = (el.type && el.type.value) || (role === "student" ? "Student" : "Staff");

      // Check if Auth.register function exists
      if (typeof Auth !== "undefined" && typeof Auth.register === "function") {
        const r = await Auth.register({
          name,
          email,
          password,
          role,
          type,
          code: el.code ? el.code.value.trim() : "GLA-STAFF-2026"
        });

        if (!r.ok) {
          if (b) b.disabled = false;
          if (msg) {
            msg.className = "msg bad";
            msg.textContent = r.msg;
          }
          return;
        }
      } else {
        // Safe Direct Store save
        let users = [];
        try { users = Store.get("users") || []; } catch (err) {}

        const exists = users.some((u) => (u.email || "").toLowerCase() === email);
        if (exists) {
          if (b) b.disabled = false;
          if (msg) {
            msg.className = "msg bad";
            msg.textContent = "An account with this email already exists.";
          }
          return;
        }

        // Generate password hash if helper available
        let passwordHash = "";
        if (typeof Auth !== "undefined" && typeof Auth.hash === "function") {
          passwordHash = await Auth.hash(password);
        }

        const newUser = {
          id: "u-" + Date.now().toString(36),
          name,
          email,
          password: password,          // Fixed: Plain text password stored
          passwordHash: passwordHash,  // Fixed: Hashed password stored
          role,
          type,
          memberId: "LIB-2026-" + Math.floor(1000 + Math.random() * 9000),
          status: "Active",
          created: new Date().toISOString().slice(0, 10)
        };

        users.push(newUser);
        Store.set("users", users);
      }

      if (msg) {
        msg.className = "msg good";
        msg.textContent = "Account created! Redirecting to sign in...";
      }

      setTimeout(() => {
        location.href = "login.html?registered=1&role=" + role;
      }, 500);

    } catch (err) {
      console.error(err);
      if (b) b.disabled = false;
      if (msg) {
        msg.className = "msg bad";
        msg.textContent = "Signup failed: " + err.message;
      }
    }
  };
})();