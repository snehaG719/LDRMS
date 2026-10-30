(() => {
  const f = document.getElementById("f"),
    msg = document.getElementById("msg"),
    q = new URLSearchParams(location.search),
    el = f.elements;

  const HOME = {
    admin: "Member4_Admin/admin/dashboard.html",
    librarian: "Member3_Librarian/librarian/dashboard.html",
    student: "Member1_Student_Core/student-core/dashboard.html",
  };

  // Check existing session
  const activeSession = JSON.parse(sessionStorage.getItem("ldrms_session") || "null");
  if (activeSession && activeSession.role && HOME[activeSession.role]) {
    location.replace(HOME[activeSession.role]);
    return;
  }

  let currentRole = "student";
  if (typeof RoleSlider !== "undefined") {
    RoleSlider.init((r) => {
      currentRole = r;
      if (msg) {
        msg.className = "msg";
        msg.textContent = "";
      }
    }, q.get("role") || localStorage.getItem("ldrms_role") || "student");
  }

  const eye = document.getElementById("eye");
  if (eye) {
    eye.onclick = (e) => {
      e.preventDefault();
      const p = el.password;
      p.type = p.type === "password" ? "text" : "password";
      eye.textContent = p.type === "password" ? "Show" : "Hide";
    };
  }

  if (q.get("registered") && msg) {
    msg.className = "msg good";
    msg.textContent = "Account created. You can sign in now.";
  }

  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector(".btn");
    if (btn) btn.disabled = true;
    if (msg) {
      msg.className = "msg";
      msg.textContent = "Signing in...";
    }

    const email = el.email.value.trim().toLowerCase();
    const password = el.password.value;
    const role = currentRole || "student";

    try {
      let r = null;
      if (typeof Auth !== "undefined" && typeof Auth.login === "function") {
        r = await Auth.login(email, password, role);
      }

      if (btn) btn.disabled = false;

      if (r && !r.ok) {
        if (msg) {
          msg.className = "msg bad";
          msg.textContent = r.msg;
        }
        el.password.value = "";
        return;
      }

      // Successful login redirect
      const targetRole = (r && r.role) || role;
      const target = HOME[targetRole] || HOME["student"];
      location.replace(target);

    } catch (err) {
      console.error(err);
      if (btn) btn.disabled = false;
      if (msg) {
        msg.className = "msg bad";
        msg.textContent = "Login error: " + err.message;
      }
    }
  };
})();