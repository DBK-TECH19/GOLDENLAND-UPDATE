require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const defaults = require("./lib/default-content");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
const port = Number(process.env.PORT || 3000);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
  : null;

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || "";
const analyticsSalt = process.env.ANALYTICS_SALT || "goldenland-analytics-salt";
const brevoApiKey = process.env.BREVO_API_KEY || "";
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || "";
const brevoSenderName = process.env.BREVO_SENDER_NAME || "GoldenLand Construction";
const mediaBucket = process.env.SUPABASE_MEDIA_BUCKET || "site-media";

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use("/assets", express.static(path.join(__dirname, "assets")));

function requireSupabase(req, res, next) {
  if (!supabase) {
    return res.status(500).json({ error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

function sanitizeCollection(items, mapper) {
  return (Array.isArray(items) ? items : []).map(mapper);
}

function normalizeContent(payload) {
  const settings = payload?.settings || {};
  const company = { ...defaults.settings.company, ...(settings.company || {}) };
  const hero = { ...defaults.settings.hero, ...(settings.hero || {}) };
  const social = { ...defaults.settings.social, ...(settings.social || {}) };

  return {
    settings: {
      company,
      hero: {
        ...hero,
        stats: Array.isArray(hero.stats) ? hero.stats : defaults.settings.hero.stats
      },
      social
    },
    services: sanitizeCollection(payload?.services || defaults.services, (item, index) => ({
      id: item.id,
      title: String(item.title || "").trim(),
      description: String(item.description || item.desc || "").trim(),
      icon: String(item.icon || "fa-briefcase").trim(),
      sortOrder: Number(item.sortOrder ?? index)
    })).filter((item) => item.title),
    projects: sanitizeCollection(payload?.projects || defaults.projects, (item, index) => ({
      id: item.id,
      category: String(item.category || "commercial").trim(),
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim(),
      location: String(item.location || "").trim(),
      badge: String(item.badge || "").trim(),
      imageUrl: String(item.imageUrl || item.image_url || "").trim(),
      sortOrder: Number(item.sortOrder ?? index)
    })).filter((item) => item.title),
    testimonials: sanitizeCollection(payload?.testimonials || defaults.testimonials, (item, index) => ({
      id: item.id,
      rating: Math.max(1, Math.min(5, Number(item.rating || 5))),
      text: String(item.text || "").trim(),
      author: String(item.author || "").trim(),
      role: String(item.role || item.position || "").trim(),
      avatarText: String(item.avatarText || item.avatar_text || "GL").trim(),
      avatarColor: String(item.avatarColor || item.avatar_color || "#0b2b5c").trim(),
      sortOrder: Number(item.sortOrder ?? index)
    })).filter((item) => item.text)
  };
}

async function loadSiteContentFromDatabase() {
  if (!supabase) {
    return normalizeContent(defaults);
  }

  const [settingsResult, servicesResult, projectsResult, testimonialsResult] = await Promise.all([
    supabase.from("site_settings").select("key, value"),
    supabase.from("services").select("*").order("sort_order", { ascending: true }),
    supabase.from("projects").select("*").order("sort_order", { ascending: true }),
    supabase.from("testimonials").select("*").order("sort_order", { ascending: true })
  ]);

  [settingsResult, servicesResult, projectsResult, testimonialsResult].forEach((result) => {
    if (result.error) {
      throw result.error;
    }
  });

  const settings = settingsResult.data.reduce((accumulator, row) => {
    accumulator[row.key] = row.value;
    return accumulator;
  }, {});

  return normalizeContent({
    settings,
    services: servicesResult.data.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      icon: item.icon,
      sortOrder: item.sort_order
    })),
    projects: projectsResult.data.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
      location: item.location,
      badge: item.badge,
      imageUrl: item.image_url,
      sortOrder: item.sort_order
    })),
    testimonials: testimonialsResult.data.map((item) => ({
      id: item.id,
      rating: item.rating,
      text: item.text,
      author: item.author,
      role: item.role,
      avatarText: item.avatar_text,
      avatarColor: item.avatar_color,
      sortOrder: item.sort_order
    }))
  });
}

async function replaceTableRows(tableName, rows) {
  const deleteResult = await supabase.from(tableName).delete().not("id", "is", null);
  if (deleteResult.error) {
    throw deleteResult.error;
  }

  if (!rows.length) {
    return;
  }

  const insertResult = await supabase.from(tableName).insert(rows);
  if (insertResult.error) {
    throw insertResult.error;
  }
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function hashIp(req) {
  const hash = crypto.createHash("sha256");
  hash.update(`${getClientIp(req)}:${analyticsSalt}`);
  return hash.digest("hex");
}

async function sendBrevoEmail({ to, subject, htmlContent, textContent }) {
  if (!brevoApiKey || !brevoSenderEmail) {
    return { skipped: true };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoApiKey
    },
    body: JSON.stringify({
      sender: {
        email: brevoSenderEmail,
        name: brevoSenderName
      },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function sendAdminNotification(submission) {
  if (!brevoApiKey || !brevoSenderEmail || !process.env.ADMIN_NOTIFICATION_EMAIL) {
    return;
  }

  await sendBrevoEmail({
    to: process.env.ADMIN_NOTIFICATION_EMAIL,
    subject: `New website inquiry from ${submission.name}`,
    textContent: `Service: ${submission.service}\nEmail: ${submission.email}\nPhone: ${submission.phone || "N/A"}\n\n${submission.message}`,
    htmlContent: `
      <h2>New website inquiry</h2>
      <p><strong>Name:</strong> ${submission.name}</p>
      <p><strong>Email:</strong> ${submission.email}</p>
      <p><strong>Phone:</strong> ${submission.phone || "N/A"}</p>
      <p><strong>Service:</strong> ${submission.service}</p>
      <p><strong>Message:</strong><br>${submission.message.replace(/\n/g, "<br>")}</p>
    `
  });
}

async function verifyAdminPassword(candidate) {
  if (adminPasswordHash) {
    return bcrypt.compare(candidate, adminPasswordHash);
  }

  return Boolean(adminPassword) && candidate === adminPassword;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/api/site-content", async (req, res) => {
  try {
    const content = await loadSiteContentFromDatabase();
    res.json(content);
  } catch (error) {
    console.error("Failed to load site content:", error);
    res.status(500).json({ error: "Failed to load site content." });
  }
});

app.post("/api/analytics/visit", requireSupabase, async (req, res) => {
  try {
    const payload = {
      visit_date: new Date().toISOString().slice(0, 10),
      ip_hash: hashIp(req),
      page_path: String(req.body.pagePath || "/"),
      referrer: String(req.body.referrer || "direct"),
      title: String(req.body.title || ""),
      user_agent: String(req.get("user-agent") || "")
    };

    const result = await supabase
      .from("analytics_visits")
      .upsert(payload, { onConflict: "visit_date,ip_hash", ignoreDuplicates: true });

    if (result.error) {
      throw result.error;
    }

    res.status(202).json({ ok: true });
  } catch (error) {
    console.error("Failed to record visit:", error);
    res.status(500).json({ error: "Failed to record visit." });
  }
});

app.post("/api/analytics/click", requireSupabase, async (req, res) => {
  try {
    const result = await supabase.from("analytics_clicks").insert({
      ip_hash: hashIp(req),
      page_path: String(req.body.pagePath || "/"),
      event_type: String(req.body.eventType || "click"),
      target: String(req.body.target || "unknown")
    });

    if (result.error) {
      throw result.error;
    }

    res.status(202).json({ ok: true });
  } catch (error) {
    console.error("Failed to record click:", error);
    res.status(500).json({ error: "Failed to record click." });
  }
});

app.post("/api/contact-submissions", requireSupabase, async (req, res) => {
  try {
    const payload = {
      name: String(req.body.name || "").trim(),
      email: String(req.body.email || "").trim(),
      phone: String(req.body.phone || "").trim(),
      service: String(req.body.service || "").trim(),
      message: String(req.body.message || "").trim(),
      status: "new"
    };

    if (!payload.name || !payload.email || !payload.service || !payload.message) {
      return res.status(400).json({ error: "Name, email, service, and message are required." });
    }

    const insertResult = await supabase.from("contact_submissions").insert(payload).select().single();
    if (insertResult.error) {
      throw insertResult.error;
    }

    await sendAdminNotification(insertResult.data).catch((error) => {
      console.error("Admin notification failed:", error);
    });

    res.status(201).json({ ok: true, submission: insertResult.data });
  } catch (error) {
    console.error("Failed to save contact submission:", error);
    res.status(500).json({ error: "Failed to submit contact form." });
  }
});

app.get("/api/admin/session", (req, res) => {
  res.json({
    authenticated: Boolean(req.session?.isAdmin),
    email: req.session?.adminEmail || null
  });
});

app.post("/api/admin/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (email !== adminEmail.toLowerCase()) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const passwordMatches = await verifyAdminPassword(password);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  req.session.isAdmin = true;
  req.session.adminEmail = adminEmail;
  res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).end();
  });
});

app.get("/api/admin/dashboard", requireSupabase, requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [submissions, visits, clicks, media, replies, clickBreakdown] = await Promise.all([
      supabase.from("contact_submissions").select("*", { count: "exact", head: true }),
      supabase.from("analytics_visits").select("*", { count: "exact", head: true }),
      supabase.from("analytics_clicks").select("*", { count: "exact", head: true }),
      supabase.from("media_assets").select("*", { count: "exact", head: true }),
      supabase.from("submission_replies").select("*", { count: "exact", head: true }),
      supabase.from("analytics_clicks").select("event_type,target,created_at").gte("created_at", `${today}T00:00:00.000Z`)
    ]);

    [submissions, visits, clicks, media, replies, clickBreakdown].forEach((result) => {
      if (result.error) {
        throw result.error;
      }
    });

    const clicksByType = clickBreakdown.data.reduce((accumulator, row) => {
      accumulator[row.event_type] = (accumulator[row.event_type] || 0) + 1;
      return accumulator;
    }, {});

    res.json({
      totals: {
        submissions: submissions.count || 0,
        uniqueVisits: visits.count || 0,
        clicks: clicks.count || 0,
        mediaAssets: media.count || 0,
        replies: replies.count || 0
      },
      clicksByType
    });
  } catch (error) {
    console.error("Failed to load admin dashboard:", error);
    res.status(500).json({ error: "Failed to load dashboard." });
  }
});

app.get("/api/admin/content", requireSupabase, requireAdmin, async (req, res) => {
  try {
    const [content, media, submissions, replies, recentVisits, recentClicks] = await Promise.all([
      loadSiteContentFromDatabase(),
      supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_submissions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("submission_replies").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("analytics_visits").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("analytics_clicks").select("*").order("created_at", { ascending: false }).limit(100)
    ]);

    [media, submissions, replies, recentVisits, recentClicks].forEach((result) => {
      if (result.error) {
        throw result.error;
      }
    });

    res.json({
      ...content,
      media: media.data,
      submissions: submissions.data,
      replies: replies.data,
      analytics: {
        visits: recentVisits.data,
        clicks: recentClicks.data
      }
    });
  } catch (error) {
    console.error("Failed to load admin content:", error);
    res.status(500).json({ error: "Failed to load admin content." });
  }
});

app.put("/api/admin/content", requireSupabase, requireAdmin, async (req, res) => {
  try {
    const content = normalizeContent(req.body);
    const settingRows = [
      { key: "company", value: content.settings.company },
      { key: "hero", value: content.settings.hero },
      { key: "social", value: content.settings.social }
    ];

    const settingsResult = await supabase.from("site_settings").upsert(settingRows, { onConflict: "key" });
    if (settingsResult.error) {
      throw settingsResult.error;
    }

    await replaceTableRows("services", content.services.map((item) => ({
      title: item.title,
      description: item.description,
      icon: item.icon,
      sort_order: item.sortOrder
    })));

    await replaceTableRows("projects", content.projects.map((item) => ({
      category: item.category,
      title: item.title,
      description: item.description,
      location: item.location,
      badge: item.badge,
      image_url: item.imageUrl,
      sort_order: item.sortOrder
    })));

    await replaceTableRows("testimonials", content.testimonials.map((item) => ({
      rating: item.rating,
      text: item.text,
      author: item.author,
      role: item.role,
      avatar_text: item.avatarText,
      avatar_color: item.avatarColor,
      sort_order: item.sortOrder
    })));

    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to save admin content:", error);
    res.status(500).json({ error: "Failed to save content." });
  }
});

app.post("/api/admin/media", requireSupabase, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const extension = path.extname(req.file.originalname) || "";
    const storagePath = `${Date.now()}-${crypto.randomUUID()}${extension}`;

    const uploadResult = await supabase.storage.from(mediaBucket).upload(storagePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const { data: publicUrlData } = supabase.storage.from(mediaBucket).getPublicUrl(storagePath);
    const insertResult = await supabase.from("media_assets").insert({
      title: req.body.title || req.file.originalname,
      kind: req.file.mimetype.startsWith("video/") ? "video" : req.file.mimetype.startsWith("image/") ? "image" : "file",
      file_path: storagePath,
      public_url: publicUrlData.publicUrl,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size
    }).select().single();

    if (insertResult.error) {
      throw insertResult.error;
    }

    res.status(201).json({ ok: true, asset: insertResult.data });
  } catch (error) {
    console.error("Media upload failed:", error);
    res.status(500).json({ error: "Failed to upload media." });
  }
});

app.post("/api/admin/submissions/:id/reply", requireSupabase, requireAdmin, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();

    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    const submissionResult = await supabase.from("contact_submissions").select("*").eq("id", submissionId).single();
    if (submissionResult.error) {
      throw submissionResult.error;
    }

    const submission = submissionResult.data;
    const brevoResult = await sendBrevoEmail({
      to: submission.email,
      subject,
      textContent: message,
      htmlContent: `<p>${message.replace(/\n/g, "<br>")}</p>`
    });

    const replyResult = await supabase.from("submission_replies").insert({
      submission_id: submissionId,
      admin_email: req.session.adminEmail,
      subject,
      message,
      brevo_message_id: brevoResult?.messageId || null
    });

    if (replyResult.error) {
      throw replyResult.error;
    }

    const updateResult = await supabase.from("contact_submissions").update({
      status: "replied",
      replied_at: new Date().toISOString()
    }).eq("id", submissionId);

    if (updateResult.error) {
      throw updateResult.error;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to reply to submission:", error);
    res.status(500).json({ error: "Failed to send reply." });
  }
});

app.patch("/api/admin/submissions/:id/status", requireSupabase, requireAdmin, async (req, res) => {
  try {
    const result = await supabase
      .from("contact_submissions")
      .update({ status: String(req.body.status || "new") })
      .eq("id", req.params.id);

    if (result.error) {
      throw result.error;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Failed to update submission status:", error);
    res.status(500).json({ error: "Failed to update status." });
  }
});

app.listen(port, () => {
  console.log(`GoldenLand server listening on http://localhost:${port}`);
});
