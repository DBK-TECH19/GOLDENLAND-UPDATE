const adminState = {
  content: null,
  dashboard: null
};

async function adminRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    },
    credentials: "same-origin",
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

function showToast(message, type = "info") {
  const root = document.getElementById("toastRoot");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  root.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setAuthenticated(isAuthenticated) {
  document.getElementById("loginView").classList.toggle("hidden", isAuthenticated);
  document.getElementById("dashboardView").classList.toggle("hidden", !isAuthenticated);
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function populateContentForm(content) {
  adminState.content = content;
  const form = document.getElementById("contentForm");
  const { company, hero, social } = content.settings;

  form.elements.brandName.value = company.brandName || "";
  form.elements.subtitle.value = company.subtitle || "";
  form.elements.gps.value = company.gps || "";
  form.elements.location.value = company.location || "";
  form.elements.email.value = company.email || "";
  form.elements.phone.value = company.phone || "";
  form.elements.phoneRaw.value = company.phoneRaw || "";
  form.elements.whatsapp.value = company.whatsapp || "";
  form.elements.mapEmbedUrl.value = company.mapEmbedUrl || "";
  form.elements.heroTagline.value = hero.tagline || "";
  form.elements.heroTitlePrefix.value = hero.titlePrefix || "";
  form.elements.heroTitleHighlight.value = hero.titleHighlight || "";
  form.elements.heroBackgroundImage.value = hero.backgroundImage || "";
  form.elements.videoUrl.value = hero.videoUrl || "";
  form.elements.videoLabel.value = hero.videoLabel || "";
  form.elements.heroDescription.value = hero.description || "";
  form.elements.heroStats.value = prettyJson(hero.stats || []);
  form.elements.facebook.value = social.facebook || "";
  form.elements.linkedin.value = social.linkedin || "";
  form.elements.instagram.value = social.instagram || "";

  document.getElementById("servicesJson").value = prettyJson(content.services || []);
  document.getElementById("projectsJson").value = prettyJson(content.projects || []);
  document.getElementById("testimonialsJson").value = prettyJson(content.testimonials || []);

  renderMedia(content.media || []);
  renderSubmissions(content.submissions || [], content.replies || []);
}

function renderDashboard(dashboard) {
  adminState.dashboard = dashboard;
  const stats = document.getElementById("dashboardStats");
  const entries = Object.entries(dashboard.totals || {});
  stats.innerHTML = entries.map(([key, value]) => `
    <article class="admin-stat-card">
      <p>${key.replace(/([A-Z])/g, " $1")}</p>
      <strong>${value}</strong>
    </article>
  `).join("");

  const breakdown = document.getElementById("clickBreakdown");
  breakdown.innerHTML = Object.keys(dashboard.clicksByType || {}).length
    ? Object.entries(dashboard.clicksByType).map(([key, value]) => `<p><strong>${key}</strong>: ${value}</p>`).join("")
    : "<p>No click data yet.</p>";
}

function renderMedia(items) {
  const list = document.getElementById("mediaList");
  list.innerHTML = items.length ? items.map((item) => `
    <article class="admin-media-card">
      <div>
        <p class="admin-media-title">${item.title}</p>
        <p>${item.kind} · ${item.mime_type || "unknown"}</p>
      </div>
      <div class="admin-media-actions">
        <a href="${item.public_url}" target="_blank" rel="noreferrer">Open</a>
        <button type="button" data-copy-url="${item.public_url}">Copy URL</button>
      </div>
    </article>
  `).join("") : "<p>No media uploaded yet.</p>";

  list.querySelectorAll("[data-copy-url]").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copyUrl);
      showToast("Media URL copied.", "success");
    });
  });
}

function renderSubmissions(submissions, replies) {
  const list = document.getElementById("submissionsList");
  const repliesBySubmission = replies.reduce((accumulator, reply) => {
    accumulator[reply.submission_id] = accumulator[reply.submission_id] || [];
    accumulator[reply.submission_id].push(reply);
    return accumulator;
  }, {});

  list.innerHTML = submissions.length ? submissions.map((submission) => {
    const replyList = repliesBySubmission[submission.id] || [];
    return `
      <article class="admin-submission-card">
        <div class="admin-submission-head">
          <div>
            <h3>${submission.name}</h3>
            <p>${submission.email} · ${submission.phone || "No phone"}</p>
          </div>
          <span class="admin-status-pill">${submission.status}</span>
        </div>
        <p><strong>Service:</strong> ${submission.service}</p>
        <p>${submission.message}</p>
        <div class="admin-reply-history">
          ${replyList.length ? replyList.map((reply) => `<p><strong>${reply.subject}</strong><br>${reply.message}</p>`).join("") : "<p>No reply sent yet.</p>"}
        </div>
        <form class="replyForm" data-submission-id="${submission.id}">
          <input name="subject" placeholder="Reply subject" required>
          <textarea name="message" rows="4" placeholder="Reply message" required></textarea>
          <div class="admin-reply-actions">
            <button type="submit" class="btn-primary">Send Reply</button>
            <button type="button" class="btn-outline" data-mark-done="${submission.id}">Mark Resolved</button>
          </div>
        </form>
      </article>
    `;
  }).join("") : "<p>No submissions yet.</p>";

  list.querySelectorAll(".replyForm").forEach((form) => {
    form.addEventListener("submit", handleReplySubmit);
  });

  list.querySelectorAll("[data-mark-done]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await adminRequest(`/api/admin/submissions/${button.dataset.markDone}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "resolved" })
        });
        showToast("Submission marked as resolved.", "success");
        await refreshAdminData();
      } catch (error) {
        console.error(error);
        showToast("Failed to update status.", "error");
      }
    });
  });
}

function collectContentPayload() {
  const form = document.getElementById("contentForm");

  return {
    settings: {
      company: {
        brandName: form.elements.brandName.value,
        subtitle: form.elements.subtitle.value,
        gps: form.elements.gps.value,
        location: form.elements.location.value,
        email: form.elements.email.value,
        phone: form.elements.phone.value,
        phoneRaw: form.elements.phoneRaw.value,
        whatsapp: form.elements.whatsapp.value,
        mapEmbedUrl: form.elements.mapEmbedUrl.value
      },
      hero: {
        tagline: form.elements.heroTagline.value,
        titlePrefix: form.elements.heroTitlePrefix.value,
        titleHighlight: form.elements.heroTitleHighlight.value,
        description: form.elements.heroDescription.value,
        backgroundImage: form.elements.heroBackgroundImage.value,
        videoUrl: form.elements.videoUrl.value,
        videoLabel: form.elements.videoLabel.value,
        stats: JSON.parse(form.elements.heroStats.value || "[]")
      },
      social: {
        facebook: form.elements.facebook.value,
        linkedin: form.elements.linkedin.value,
        instagram: form.elements.instagram.value,
        whatsapp: form.elements.whatsapp.value
      }
    },
    services: JSON.parse(document.getElementById("servicesJson").value || "[]"),
    projects: JSON.parse(document.getElementById("projectsJson").value || "[]"),
    testimonials: JSON.parse(document.getElementById("testimonialsJson").value || "[]")
  };
}

async function refreshAdminData() {
  const [content, dashboard] = await Promise.all([
    adminRequest("/api/admin/content"),
    adminRequest("/api/admin/dashboard")
  ]);

  populateContentForm(content);
  renderDashboard(dashboard);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await adminRequest("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setAuthenticated(true);
    await refreshAdminData();
    showToast("Signed in successfully.", "success");
    form.reset();
  } catch (error) {
    console.error(error);
    showToast("Invalid admin credentials.", "error");
  }
}

async function handleSaveContent() {
  try {
    const payload = collectContentPayload();
    await adminRequest("/api/admin/content", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    showToast("Site content saved.", "success");
    await refreshAdminData();
  } catch (error) {
    console.error(error);
    showToast("Failed to save content. Check your JSON fields.", "error");
  }
}

async function handleMediaUpload(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  try {
    await adminRequest("/api/admin/media", {
      method: "POST",
      body: formData
    });
    showToast("Media uploaded to Supabase.", "success");
    form.reset();
    await refreshAdminData();
  } catch (error) {
    console.error(error);
    showToast("Media upload failed.", "error");
  }
}

async function handleReplySubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submissionId = form.dataset.submissionId;
  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    await adminRequest(`/api/admin/submissions/${submissionId}/reply`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showToast("Reply sent through Brevo.", "success");
    form.reset();
    await refreshAdminData();
  } catch (error) {
    console.error(error);
    showToast("Failed to send reply.", "error");
  }
}

async function initializeAdmin() {
  document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
  document.getElementById("saveContentButton").addEventListener("click", handleSaveContent);
  document.getElementById("mediaForm").addEventListener("submit", handleMediaUpload);
  document.getElementById("refreshDashboardButton").addEventListener("click", refreshAdminData);
  document.getElementById("logoutButton").addEventListener("click", async () => {
    await adminRequest("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    showToast("Logged out.", "info");
  });

  try {
    const session = await adminRequest("/api/admin/session");
    if (session.authenticated) {
      setAuthenticated(true);
      await refreshAdminData();
    } else {
      setAuthenticated(false);
    }
  } catch (error) {
    console.error(error);
    setAuthenticated(false);
  }
}

document.addEventListener("DOMContentLoaded", initializeAdmin);
