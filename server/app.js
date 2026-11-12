import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";
import { packages as seed, places, estimate, images } from "../shared/data.js";
const scrypt = promisify(scryptCb);
const hashToken = (t) => createHash("sha256").update(t).digest("hex");
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}
async function verifyPassword(password, encoded) {
  const [salt, hex] = encoded.split(":");
  const expected = Buffer.from(hex, "hex"),
    actual = await scrypt(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const string = (max = 120) => z.string().trim().min(1).max(max);
const email = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T12:00:00Z`);
    return !isNaN(d) && d.toISOString().slice(0, 10) === s;
  }, "Invalid date");
const planSchema = z.object({
  caption: string(),
  region: z.enum(["Himachal", "Kerala"]),
  startDate: date,
  nights: z.number().int().min(1).max(30),
  travelers: z.number().int().min(1).max(40),
  transport: z.enum(["Private cab", "Self-drive", "Tempo", "Urbania"]),
  captain: z.boolean(),
  photographer: z.boolean(),
  marshal: z.boolean(),
  stops: z.array(string(80)).min(1).max(50),
  itinerary: z.array(string(500)).min(2).max(31),
  travelStyle: string(40),
});
const requestSchema = z.object({
  name: string(80),
  email,
  phone: z.string().regex(/^[+0-9 ()-]{8,20}$/),
  date,
  travelers: z.number().int().min(1).max(40),
  kind: z.enum(["package", "custom"]),
  packageId: z.string().max(100).optional(),
  plan: planSchema.optional(),
});
const packageSchema = z
  .object({
    title: string(),
    destination: string(),
    route: z.array(string(80)).min(1).max(30),
    nights: z.number().int().min(1).max(30),
    price: z.number().int().min(1).max(10000000),
    style: z.enum([
      "Adventure",
      "Slow travel",
      "Family time",
      "Romantic escape",
    ]),
    image: string(200),
    days: z.array(z.string().trim().max(500)).min(2).max(31),
    status: z.enum(["draft", "published"]),
    attachments: z
      .array(z.object({ name: string(200), url: string(200) }))
      .max(30)
      .default([]),
    description: z.string().max(3000).default(""),
    departures: z.array(date).max(365).default([]),
  })
  .refine(
    (p) =>
      p.status !== "published" ||
      (p.days.length === p.nights + 1 && p.days.every((d) => d.length > 0)),
    "Published itineraries must include every day",
  );
const storySchema = z.object({
  title: string(),
  body: z.string().trim().min(10).max(3000),
  destination: string(80),
  rating: z.coerce.number().int().min(1).max(5),
  consent: z.literal("on"),
});
export async function createApp(options = {}) {
  const dataDir = path.resolve(
      options.dataDir || process.env.DATA_DIR || "data",
    ),
    uploadDir = path.resolve(
      options.uploadDir || process.env.UPLOAD_DIR || "uploads",
    );
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(uploadDir, { recursive: true });
  mkdirSync(path.join(uploadDir, "staging"), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "gumshuda.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS packages(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS stories(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,filename TEXT UNIQUE NOT NULL,name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,owner TEXT NOT NULL,public INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  const insert = db.prepare("INSERT INTO packages(id,data) VALUES(?,?)");
  if (!db.prepare("SELECT value FROM meta WHERE key='seeded'").get()) {
    db.exec("BEGIN");
    for (const p of seed) insert.run(p.id, JSON.stringify(p));
    db.prepare("INSERT INTO meta VALUES(?,?)").run("seeded", "1");
    db.exec("COMMIT");
  }
  const adminEmail = options.adminEmail ?? process.env.ADMIN_EMAIL,
    adminPassword = options.adminPassword ?? process.env.ADMIN_PASSWORD;
  if (
    adminEmail &&
    adminPassword &&
    !db
      .prepare("SELECT id FROM users WHERE email=?")
      .get(adminEmail.toLowerCase())
  ) {
    email.parse(adminEmail);
    z.string().min(16).max(128).parse(adminPassword);
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
      randomUUID(),
      "Gumshuda team",
      adminEmail.toLowerCase(),
      await hashPassword(adminPassword),
      "admin",
    );
  }
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const origins = (
    options.clientOrigin ||
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5173"
  )
    .split(",")
    .map((s) => s.trim());
  app.use(
    cors({
      origin(origin, cb) {
        cb(null, !origin || origins.includes(origin));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  if (!options.disableRateLimit)
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 120,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: { error: "Too many requests. Please try again shortly." },
      }),
    );
  app.use((req, res, next) => {
    const token = req.headers.authorization?.match(
      /^Bearer ([a-f0-9]{64})$/,
    )?.[1];
    if (token) {
      const user = db
        .prepare(
          "SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>?",
        )
        .get(hashToken(token), Date.now());
      if (user) req.user = user;
    }
    next();
  });
  function authenticated(req, res, next) {
    if (!req.user)
      return res.status(401).json({ error: "Please log in to continue." });
    next();
  }
  function admin(req, res, next) {
    if (req.user?.role !== "admin")
      return res
        .status(403)
        .json({ error: "Administrator access is required." });
    next();
  }
  const parse = (schema, body) => schema.parse(body);
  const all = (table) =>
    db
      .prepare(`SELECT data FROM ${table}`)
      .all()
      .map((r) => JSON.parse(r.data));
  const one = (table, id) => {
    const row = db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(id);
    return row ? JSON.parse(row.data) : null;
  };
  const save = (table, obj) =>
    db
      .prepare(
        `INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`,
      )
      .run(obj.id, JSON.stringify(obj));
  const userView = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  });
  function session(user) {
    db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      hashToken(token),
      user.id,
      Date.now() + 86400000,
    );
    return { token, user: userView(user) };
  }
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  const authLimit = options.disableRateLimit
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60000,
        limit: 12,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
          error: "Too many sign-in attempts. Please wait 15 minutes.",
        },
      });
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const v = parse(
      z.object({
        name: string(80),
        email,
        password: z.string().min(12).max(128),
      }),
      req.body,
    );
    if (db.prepare("SELECT id FROM users WHERE email=?").get(v.email))
      return res
        .status(409)
        .json({ error: "This email already has an account. Please log in." });
    const u = {
      id: randomUUID(),
      name: v.name,
      email: v.email,
      role: "customer",
    };
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?)").run(
      u.id,
      u.name,
      u.email,
      await hashPassword(v.password),
      u.role,
    );
    res.status(201).json(session(u));
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const v = parse(
      z.object({ email, password: z.string().min(1).max(128) }),
      req.body,
    );
    const u = db.prepare("SELECT * FROM users WHERE email=?").get(v.email);
    const dummy =
      "00000000000000000000000000000000:" + Buffer.alloc(64).toString("hex");
    const valid = await verifyPassword(v.password, u?.password || dummy);
    if (!u || !valid)
      return res
        .status(401)
        .json({ error: "The email or password is incorrect." });
    res.json(session(u));
  });
  app.get("/api/auth/me", authenticated, (req, res) => res.json(req.user));
  app.post("/api/auth/logout", authenticated, (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token=?").run(
      hashToken(req.headers.authorization.slice(7)),
    );
    res.json({ ok: true });
  });
  app.get("/api/packages", (req, res) =>
    res.json(all("packages").filter((p) => p.status === "published")),
  );
  app.get("/api/places", (req, res) =>
    res.json(
      places.filter((p) => !req.query.region || p.region === req.query.region),
    ),
  );
  app.post("/api/requests", (req, res) => {
    const v = parse(requestSchema, req.body);
    const current = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    if (v.date < current)
      return res
        .status(400)
        .json({ error: "Choose a current or future travel date." });
    let trip;
    if (v.kind === "package") {
      trip = one("packages", v.packageId);
      if (!trip || trip.status !== "published")
        return res.status(400).json({ error: "Choose a published package." });
    } else if (
      !v.plan ||
      v.plan.startDate !== v.date ||
      v.plan.travelers !== v.travelers ||
      v.plan.itinerary.length !== v.plan.nights + 1
    )
      return res
        .status(400)
        .json({ error: "Complete your trip dates and daily itinerary." });
    const id = randomUUID(),
      reference = `GT-${id.slice(0, 8).toUpperCase()}`;
    save("requests", {
      ...v,
      id,
      reference,
      packageTitle: trip?.title,
      estimate: v.plan ? estimate(v.plan).total : trip.price * v.travelers,
      status: "new",
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ reference });
  });
  const upload = multer({
    dest: path.join(uploadDir, "staging"),
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 1,
      fields: 10,
      fieldSize: 20000,
    },
  }).single("file");
  function inspect(file, allowPdf) {
    if (!file)
      throw Object.assign(new Error("Choose a media file."), { status: 400 });
    const b = readFileSync(file.path).subarray(0, 20);
    let type, ext;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
      type = "image/jpeg";
      ext = "jpg";
    } else if (
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      type = "image/png";
      ext = "png";
    } else if (
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    ) {
      type = "image/webp";
      ext = "webp";
    } else if (
      b.toString("ascii", 4, 8) === "ftyp" &&
      ["isom", "iso2", "mp41", "mp42", "avc1", "M4V "].includes(
        b.toString("ascii", 8, 12),
      )
    ) {
      type = "video/mp4";
      ext = "mp4";
    } else if (allowPdf && b.toString("ascii", 0, 5) === "%PDF-") {
      type = "application/pdf";
      ext = "pdf";
    } else
      throw Object.assign(
        new Error(
          "Unsupported file content. Use a valid JPG, PNG, WebP, MP4 or PDF.",
        ),
        { status: 400 },
      );
    return { type, ext };
  }
  function storeFile(file, owner, published, allowPdf) {
    const { type, ext } = inspect(file, allowPdf);
    const id = randomUUID(),
      filename = `${id}.${ext}`;
    renameSync(file.path, path.join(uploadDir, filename));
    const name = path.basename(file.originalname).slice(0, 200);
    db.prepare("INSERT INTO media VALUES(?,?,?,?,?,?,?)").run(
      id,
      filename,
      name,
      type,
      file.size,
      owner,
      published ? 1 : 0,
    );
    return { id, name, type, size: file.size, url: `/uploads/${filename}` };
  }
  app.post("/api/stories", authenticated, upload, (req, res) => {
    const v = parse(storySchema, req.body);
    const m = storeFile(req.file, req.user.id, false, false);
    const story = {
      ...v,
      id: randomUUID(),
      author: req.user.name,
      userId: req.user.id,
      mediaId: m.id,
      mediaUrl: m.url,
      type: m.type.startsWith("video/") ? "video" : "photo",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    delete story.consent;
    save("stories", story);
    res.status(201).json({ id: story.id, status: "pending" });
  });
  app.get("/api/stories", (req, res) =>
    res.json(
      all("stories")
        .filter((s) => s.status === "approved")
        .map(({ userId, mediaId, ...s }) => s),
    ),
  );
  app.get("/uploads/:filename", (req, res) => {
    const m = db
      .prepare("SELECT * FROM media WHERE filename=?")
      .get(req.params.filename);
    if (
      !m ||
      (!m.public && req.user?.role !== "admin" && req.user?.id !== m.owner)
    )
      return res.status(404).json({ error: "Media not found." });
    res.type(m.type);
    if (m.type === "application/pdf") res.attachment(m.name);
    res.set(
      "Cache-Control",
      m.public ? "public, max-age=3600" : "private, no-store",
    );
    res.sendFile(path.join(uploadDir, m.filename));
  });
  app.use("/api/admin", admin);
  app.get("/api/admin/overview", (req, res) =>
    res.json({
      packages: all("packages"),
      requests: all("requests").reverse(),
      stories: all("stories").reverse(),
      media: db
        .prepare("SELECT * FROM media WHERE public=1")
        .all()
        .map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          size: m.size,
          url: `/uploads/${m.filename}`,
        })),
    }),
  );
  function validateMedia(p) {
    const valid = (url) =>
      url.startsWith("/uploads/") &&
      db
        .prepare("SELECT id FROM media WHERE filename=? AND public=1")
        .get(url.slice(9));
    if (!Object.values(images).includes(p.image) && !valid(p.image))
      throw Object.assign(
        new Error("Choose a cover image from the media library."),
        { status: 400 },
      );
    for (const a of p.attachments)
      if (!valid(a.url))
        throw Object.assign(
          new Error("Choose attachments from the media library."),
          { status: 400 },
        );
  }
  app.post("/api/admin/packages", (req, res) => {
    const p = parse(packageSchema, req.body);
    validateMedia(p);
    const result = { ...p, id: randomUUID(), indicative: true };
    save("packages", result);
    res.status(201).json(result);
  });
  app.put("/api/admin/packages/:id", (req, res) => {
    if (!one("packages", req.params.id))
      return res.status(404).json({ error: "Itinerary not found." });
    const p = parse(packageSchema, req.body);
    validateMedia(p);
    const result = { ...p, id: req.params.id, indicative: true };
    save("packages", result);
    res.json(result);
  });
  app.patch("/api/admin/stories/:id", (req, res) => {
    const v = parse(
      z.object({ status: z.enum(["approved", "rejected"]) }),
      req.body,
    );
    const s = one("stories", req.params.id);
    if (!s) return res.status(404).json({ error: "Story not found." });
    s.status = v.status;
    save("stories", s);
    db.prepare("UPDATE media SET public=? WHERE id=?").run(
      v.status === "approved" ? 1 : 0,
      s.mediaId,
    );
    res.json(s);
  });
  app.patch("/api/admin/requests/:id", (req, res) => {
    const v = parse(
      z.object({
        status: z.enum([
          "new",
          "contacted",
          "quoted",
          "confirmed",
          "cancelled",
        ]),
      }),
      req.body,
    );
    const r = one("requests", req.params.id);
    if (!r) return res.status(404).json({ error: "Request not found." });
    r.status = v.status;
    save("requests", r);
    res.json(r);
  });
  app.post("/api/admin/media", upload, (req, res) =>
    res.status(201).json(storeFile(req.file, req.user.id, true, true)),
  );
  app.use((req, res) => res.status(404).json({ error: "Not found." }));
  app.use((err, req, res, next) => {
    if (req.file?.path && existsSync(req.file.path)) unlinkSync(req.file.path);
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({
          error: err.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        });
    if (err instanceof multer.MulterError)
      return res
        .status(400)
        .json({
          error:
            err.code === "LIMIT_FILE_SIZE"
              ? "File must be smaller than 100 MB."
              : "Invalid upload.",
        });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request is too large." });
    res
      .status(err.status || 500)
      .json({
        error: err.status
          ? err.message
          : "Unable to complete your request. Please try again.",
      });
  });
  return { app, close: () => db.close() };
}
