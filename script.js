(function () {
  var E = window.EVENT;

  // ---------- Fill event details from config.js ----------
  if (!E.rsvpDeadline) {
    document.querySelectorAll("[data-rsvp]").forEach(function (el) { el.remove(); });
  }
  document.querySelectorAll("[data-field]").forEach(function (el) {
    var v = E[el.getAttribute("data-field")];
    if (v) el.textContent = v;
    else if (v === "") el.remove();
  });
  document.querySelectorAll("[data-field-href]").forEach(function (el) {
    el.href = "mailto:" + E[el.getAttribute("data-field-href")];
  });
  document.querySelectorAll("[data-href]").forEach(function (el) {
    var v = E[el.getAttribute("data-href")];
    if (v) el.href = v; else el.remove();
  });
  var venueLinks = document.querySelector(".card__links");
  if (venueLinks && !venueLinks.querySelector("a")) venueLinks.remove();

  // ---------- Registration form ----------
  var form = document.getElementById("reg-form");
  var status = document.getElementById("reg-status");
  var submitBtn = form.querySelector('button[type="submit"]');
  var guestFields = document.getElementById("guest-fields");
  var partySize = document.getElementById("party-size");
  var done = document.getElementById("reg-done");

  var closesAt = E.registrationClosesISO ? new Date(E.registrationClosesISO).getTime() : NaN;
  if (!isNaN(closesAt) && Date.now() > closesAt) {
    form.querySelectorAll("input, select, textarea, button").forEach(function (el) { el.disabled = true; });
    status.className = "form__status is-error";
    status.innerHTML = "Registration is now closed. Please contact <a href=\"mailto:" + E.contactEmail + "\">" + E.contactEmail + "</a> with any questions.";
  }

  function bringingGuest() {
    var r = form.querySelector('input[name="bringing-guest"]:checked');
    return r && r.value === "Yes";
  }

  function syncGuest() {
    var on = bringingGuest();
    guestFields.hidden = !on;
    partySize.value = on ? "2" : "1";
    guestFields.querySelectorAll("[data-guest-required]").forEach(function (el) { el.required = on; });
    if (!on) guestFields.querySelectorAll(".field-error").forEach(function (el) { el.remove(); });
  }
  form.querySelectorAll('input[name="bringing-guest"]').forEach(function (r) {
    r.addEventListener("change", function () {
      syncGuest();
      clearError(r.closest(".choice"));
      if (bringingGuest()) guestFields.querySelector("input").focus();
    });
  });

  // Inline validation messages
  function errorTarget(el) {
    if (el.type === "radio") return el.closest(".choice");
    if (el.type === "checkbox") return el.closest(".check");
    return el;
  }
  function clearError(target) {
    target.classList.remove("is-invalid");
    var next = target.nextElementSibling;
    if (next && next.classList.contains("field-error")) next.remove();
  }
  function showError(target, msg) {
    clearError(target);
    target.classList.add("is-invalid");
    var p = document.createElement("span");
    p.className = "field-error";
    p.textContent = msg;
    target.insertAdjacentElement("afterend", p);
  }
  function messageFor(el) {
    if (el.validity.valueMissing) {
      if (el.type === "checkbox") return "Please check this box to continue.";
      if (el.type === "radio") return "Please choose an option.";
      return "This field is required.";
    }
    if (el.validity.typeMismatch && el.type === "email") return "Please enter a valid email address.";
    return el.validationMessage;
  }
  function validate() {
    var firstBad = null, seenRadio = {};
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (el.type === "hidden" || el.closest("[hidden]") || el.name === "bot-field") return;
      if (el.type === "radio") {
        if (seenRadio[el.name]) return;
        seenRadio[el.name] = true;
      }
      var target = errorTarget(el);
      if (el.checkValidity()) { clearError(target); return; }
      showError(target, messageFor(el));
      if (!firstBad) firstBad = el;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  form.addEventListener("input", function (e) {
    var el = e.target;
    if (el.classList.contains("is-invalid") && el.checkValidity()) clearError(el);
  });
  form.addEventListener("change", function (e) {
    var el = e.target;
    if (el.type === "checkbox" && el.checkValidity()) clearError(errorTarget(el));
  });

  function summaryText(data) {
    var name = data.get("first-name");
    if (data.get("bringing-guest") === "Yes") {
      return "Thanks, " + name + "! You and " + data.get("guest-first-name") + " " + data.get("guest-last-name") +
        " are registered for the Allied Elite Financial Holiday Party. A party of two, how very preppy.";
    }
    return "Thanks, " + name + "! You're registered for the Allied Elite Financial Holiday Party.";
  }

  function showDone(data) {
    document.getElementById("reg-done-summary").textContent = summaryText(data);
    form.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: "smooth", block: "center" });
    done.focus({ preventScroll: true });
  }

  function mailtoFallback(data) {
    var lines = [];
    data.forEach(function (v, k) {
      if (k === "form-name" || k === "bot-field") return;
      lines.push(k + ": " + v);
    });
    window.location.href = "mailto:" + E.contactEmail +
      "?subject=" + encodeURIComponent("Holiday Party Registration: " + data.get("first-name") + " " + data.get("last-name")) +
      "&body=" + encodeURIComponent(lines.join("\n"));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    syncGuest();
    if (!validate()) {
      status.className = "form__status is-error";
      status.textContent = "Please fix the highlighted fields.";
      return;
    }
    var data = new FormData(form);
    if (data.get("bringing-guest") !== "Yes") {
      ["guest-first-name", "guest-last-name", "guest-email", "guest-relationship", "guest-dietary"].forEach(function (k) { data.set(k, ""); });
    }
    if (location.protocol === "file:") { mailtoFallback(data); return; }

    submitBtn.disabled = true;
    status.className = "form__status";
    status.textContent = "Sending...";
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(data).toString()
    }).then(function (res) {
      if (!res.ok) throw res.status;
      status.textContent = "";
      showDone(data);
    }).catch(function (err) {
      // 404 = Netlify hasn't detected the form. Never lose the registration: offer email.
      console.error("Registration failed:", err);
      status.className = "form__status is-error";
      status.innerHTML = "Sorry, that didn't go through" + (typeof err === "number" ? " (error " + err + ")" : "") +
        '. <button type="button" class="link-btn" id="send-by-email">Send it by email instead</button>';
      document.getElementById("send-by-email").addEventListener("click", function () { mailtoFallback(data); });
    }).then(function () { submitBtn.disabled = false; });
  });

  // ---------- Add to calendar (.ics) ----------
  document.getElementById("add-cal").addEventListener("click", function () {
    var start = new Date(E.startISO);
    var end = new Date(start.getTime() + 4 * 36e5); // 7:30 PM – 11:30 PM
    function fmt(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
    function icsEsc(s) { return String(s).replace(/([,;\\])/g, "\\$1"); }
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Allied Elite Financial//Holiday Party//EN",
      "BEGIN:VEVENT",
      "UID:aef-holiday-party-" + E.year + "@alliedeliteevents.com",
      "DTSTAMP:" + fmt(new Date()),
      "DTSTART:" + fmt(start), "DTEND:" + fmt(end),
      "SUMMARY:" + icsEsc("Allied Elite Financial Preppy Holiday Party"),
      "LOCATION:" + icsEsc(E.venueName + ", " + E.venueAddress),
      "DESCRIPTION:" + icsEsc("'80s Country Club Soirée. Dress code: '80s country club chic meets holiday sparkle."),
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "aef-holiday-party.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // ---------- Countdown ----------
  var target = new Date(E.startISO).getTime();
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function tick() {
    var d = Math.max(0, target - Date.now());
    document.getElementById("cd-days").textContent = Math.floor(d / 864e5);
    document.getElementById("cd-hours").textContent = pad(Math.floor(d / 36e5) % 24);
    document.getElementById("cd-mins").textContent = pad(Math.floor(d / 6e4) % 60);
    document.getElementById("cd-secs").textContent = pad(Math.floor(d / 1e3) % 60);
  }
  if (!isNaN(target)) { tick(); setInterval(tick, 1000); }

  // ---------- Mobile nav ----------
  var toggle = document.querySelector(".nav__toggle"), links = document.getElementById("nav-links");
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", function (e) {
    if (e.target.tagName === "A") { links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", false); }
  });

  // ---------- Snow ----------
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var snow = document.querySelector(".snow"), flakes = ["❄", "✦", "★", "❅"];
    for (var i = 0; i < 28; i++) {
      var f = document.createElement("span");
      f.textContent = flakes[i % flakes.length];
      f.style.left = Math.random() * 100 + "vw";
      f.style.animationDuration = 8 + Math.random() * 10 + "s";
      f.style.animationDelay = -Math.random() * 18 + "s";
      f.style.fontSize = 10 + Math.random() * 14 + "px";
      snow.appendChild(f);
    }
  }
})();
