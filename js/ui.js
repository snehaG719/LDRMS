/* UI helpers: modal dialogs, toast, table helpers */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const badge = (t, c = "") =>
  `<span class="badge${c ? " " + c : ""}">${esc(t)}</span>`;
const pad = (n) => String(n).padStart(2, "0");

function toast(m, type = "ok") {
  const t = document.createElement("div");
  t.className = "lm-toast " + type;
  t.textContent = m;
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

const Modal = {
  form(title, fields, vals, onSave, o = {}) {
    vals = vals || {};
    const d = document.createElement("div");
    d.className = "lm-overlay";
    d.style.cssText = "position:fixed; inset:0; background:rgba(15,23,42,0.6); display:grid; place-items:center; z-index:9999; padding:16px;";

    let fieldsHtml = "";
    fields.forEach((f) => {
      const v = vals[f.n] !== undefined ? vals[f.n] : "";
      fieldsHtml += `<div class="field" style="margin-bottom:12px; text-align:left;">
        <label style="display:block; margin-bottom:5px; font-weight:600; font-size:12px; color:#1e293b;">${esc(f.l)}</label>`;

      if (f.t === "select") {
        fieldsHtml += `<select name="${f.n}" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; background:#fff; color:#0f172a;">
          ${f.o.map((x) => `<option value="${esc(x.v ?? x)}"${(x.v ?? x) == v ? " selected" : ""}>${esc(x.l ?? x)}</option>`).join("")}
        </select>`;
      } else if (f.t === "textarea") {
        fieldsHtml += `<textarea name="${f.n}" rows="3" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; background:#fff; color:#0f172a; resize:vertical;">${esc(v)}</textarea>`;
      } else {
        fieldsHtml += `<input name="${f.n}" type="${f.t || "text"}" value="${esc(v)}" ${f.ro ? "readonly" : ""} ${f.ph ? `placeholder="${esc(f.ph)}"` : ""} style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:14px; background:#fff; color:#0f172a;">`;
      }
      fieldsHtml += `</div>`;
    });

    d.innerHTML = `<form class="lm-box" novalidate style="background:#fff; border-radius:12px; padding:24px; width:100%; max-width:460px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 40px rgba(0,0,0,0.25);">
      <h3 style="margin:0 0 14px 0; font-size:18px; color:#0f172a; font-weight:700;">${esc(title)}</h3>
      ${o.intro ? `<p style="color:#64748b; font-size:13px; margin-bottom:14px;">${esc(o.intro)}</p>` : ""}
      ${fieldsHtml}
      <p class="lm-err" role="alert" style="color:#dc2626; font-size:12px; min-height:16px; margin:4px 0 10px 0;"></p>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button type="submit" class="primary" style="background:#2563eb; color:#fff; border:none; padding:9px 18px; border-radius:6px; font-weight:600; cursor:pointer;">${esc(o.label || "Save")}</button>
        ${o.lock ? "" : '<button type="button" class="btn-cancel" style="background:#fff; border:1px solid #cbd5e1; color:#334155; padding:9px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Cancel</button>'}
      </div>
    </form>`;

    document.body.append(d);
    const f = d.querySelector("form");
    const err = d.querySelector(".lm-err");
    const close = () => d.remove();

    if (!o.lock) {
      const cancelBtn = d.querySelector(".btn-cancel");
      if (cancelBtn) cancelBtn.onclick = close;
      d.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    }

    const firstInput = f.querySelector("input:not([readonly]), select, textarea");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }

    f.onsubmit = async (e) => {
      e.preventDefault();
      err.textContent = "";

      // Direct values extraction
      const data = {};
      const inputs = f.querySelectorAll("input, select, textarea");
      inputs.forEach((inp) => {
        if (inp.name) data[inp.name] = inp.value;
      });

      const res = await onSave(data);
      if (typeof res === "string" && res) {
        err.textContent = res;
      } else {
        close();
      }
    };
  },

  ask(title, yes = "Confirm", danger = false) {
    return new Promise((ok) => {
      const d = document.createElement("div");
      d.className = "lm-overlay";
      d.style.cssText = "position:fixed; inset:0; background:rgba(15,23,42,0.6); display:grid; place-items:center; z-index:9999; padding:16px;";
      d.innerHTML = `<div class="lm-box" style="background:#fff; border-radius:12px; padding:22px; width:100%; max-width:400px; box-shadow:0 20px 40px rgba(0,0,0,0.25);">
        <h3 style="margin:0 0 16px 0; font-size:17px; color:#0f172a;">${esc(title)}</h3>
        <div style="display:flex; gap:10px;">
          <button class="btn-confirm" style="background:${danger ? "#dc2626" : "#2563eb"}; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">${esc(yes)}</button>
          <button class="btn-cancel" style="background:#fff; border:1px solid #cbd5e1; color:#334155; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Cancel</button>
        </div>
      </div>`;
      document.body.append(d);

      const close = (val) => {
        d.remove();
        ok(val);
      };

      d.querySelector(".btn-cancel").onclick = () => close(false);
      d.querySelector(".btn-confirm").onclick = () => close(true);
    });
  },

  info(title, html) {
    const d = document.createElement("div");
    d.className = "lm-overlay";
    d.style.cssText = "position:fixed; inset:0; background:rgba(15,23,42,0.6); display:grid; place-items:center; z-index:9999; padding:16px;";
    d.innerHTML = `<div class="lm-box" style="background:#fff; border-radius:12px; padding:22px; width:100%; max-width:420px; box-shadow:0 20px 40px rgba(0,0,0,0.25);">
      <h3 style="margin:0 0 12px 0; font-size:17px; color:#0f172a;">${esc(title)}</h3>
      <div style="color:#475569; font-size:14px; margin-bottom:16px;">${html}</div>
      <button class="primary" style="background:#2563eb; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Close</button>
    </div>`;
    document.body.append(d);
    d.querySelector(".primary").onclick = () => d.remove();
  }
};

const fill = (tbl, rows, cols) => {
  const b = $("tbody", tbl);
  if (!b) return;
  b.innerHTML =
    rows.join("") ||
    `<tr class="empty-row"><td colspan="${cols}" style="text-align:center; padding:18px; color:#64748b;">No records found.</td></tr>`;
};

const mini = (act, id, label, red = 0) =>
  `<button class="mini${red ? " red" : ""}" data-act="${esc(act)}" data-id="${esc(id)}">${esc(label)}</button>`;

const addCol = (tbl) => {
  const th = $("thead tr", tbl);
  if (th && !$("th[data-act-col]", th)) {
    const col = document.createElement("th");
    col.setAttribute("data-act-col", "1");
    th.append(col);
  }
};

const stat = (idx, val, sub, cls = "") => {
  const el = $$(".stat")[idx];
  if (!el) return;
  const v = $("strong", el),
    s = $("span, small", el);
  if (v) v.textContent = val;
  if (s) {
    if (sub) s.textContent = sub;
    if (cls) s.className = cls;
  }
};

const onToolbar = (render) => {
  $$(".toolbar input, .toolbar select").forEach((e) =>
    e.addEventListener(e.tagName === "INPUT" ? "input" : "change", render),
  );
};