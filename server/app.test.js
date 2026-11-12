import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "./app.js";
const temp = mkdtempSync(path.join(os.tmpdir(), "gumshuda-"));
const config = {
  dataDir: path.join(temp, "data"),
  uploadDir: path.join(temp, "uploads"),
  adminEmail: "admin@example.com",
  adminPassword: "test-only-password-24chars",
  disableRateLimit: true,
};
test("API authorization, moderation, publication and persistence", async (t) => {
  let { app, close } = await createApp(config);
  try {
    const catalogue = await request(app).get("/api/packages").expect(200);
    assert.equal(catalogue.body.length, 6);
    await request(app).get("/api/admin/overview").expect(403);
    const customer = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Traveler",
        email: "traveler@example.com",
        password: "a-long-test-password",
        role: "admin",
      })
      .expect(201);
    assert.equal(customer.body.user.role, "customer");
    const customerAuth = `Bearer ${customer.body.token}`;
    await request(app)
      .get("/api/admin/overview")
      .set("Authorization", customerAuth)
      .expect(403);
    await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "incorrect" })
      .expect(401);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: config.adminPassword })
      .expect(200);
    const auth = `Bearer ${login.body.token}`;
    const trip = {
      ...catalogue.body[0],
      title: "Test unpublished journey",
      status: "draft",
    };
    const created = await request(app)
      .post("/api/admin/packages")
      .set("Authorization", auth)
      .send(trip)
      .expect(201);
    assert.equal(
      (await request(app).get("/api/packages")).body.some(
        (p) => p.id === created.body.id,
      ),
      false,
    );
    await request(app)
      .put(`/api/admin/packages/${created.body.id}`)
      .set("Authorization", auth)
      .send({ ...trip, status: "published", days: ["only one day"] })
      .expect(400);
    await request(app)
      .put(`/api/admin/packages/${created.body.id}`)
      .set("Authorization", auth)
      .send({ ...trip, status: "published" })
      .expect(200);
    assert.equal((await request(app).get("/api/packages")).body.length, 7);
    await request(app)
      .post("/api/requests")
      .send({
        name: "Traveler",
        email: "traveler@example.com",
        phone: "+91 9999999999",
        date: "2000-01-01",
        travelers: 2,
        kind: "package",
        packageId: "manali",
      })
      .expect(400);
    const future = new Date(Date.now() + 86400000 * 10)
      .toISOString()
      .slice(0, 10);
    const enquiry = await request(app)
      .post("/api/requests")
      .send({
        name: "Traveler",
        email: "traveler@example.com",
        phone: "+91 9999999999",
        date: future,
        travelers: 2,
        kind: "package",
        packageId: "manali",
      })
      .expect(201);
    assert.match(enquiry.body.reference, /^GT-/);
    await request(app)
      .post("/api/stories")
      .set("Authorization", customerAuth)
      .field("title", "Our mountain journey")
      .field("body", "A wonderful day in the mountains.")
      .field("destination", "Manali")
      .field("rating", "5")
      .field("consent", "on")
      .attach("file", Buffer.from("<script>alert(1)</script>"), {
        filename: "fake.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4ZkAAAAASUVORK5CYII=",
      "base64",
    );
    const posted = await request(app)
      .post("/api/stories")
      .set("Authorization", customerAuth)
      .field("title", "Our mountain journey")
      .field("body", "A wonderful day in the mountains.")
      .field("destination", "Manali")
      .field("rating", "5")
      .field("consent", "on")
      .attach("file", png, { filename: "photo.png", contentType: "image/png" })
      .expect(201);
    assert.equal((await request(app).get("/api/stories")).body.length, 0);
    const overview = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", auth)
      .expect(200);
    const pending = overview.body.stories[0];
    await request(app).get(pending.mediaUrl).expect(404);
    await request(app)
      .get(pending.mediaUrl)
      .set("Authorization", auth)
      .expect(200);
    await request(app)
      .patch(`/api/admin/stories/${posted.body.id}`)
      .set("Authorization", auth)
      .send({ status: "approved" })
      .expect(200);
    assert.equal((await request(app).get("/api/stories")).body.length, 1);
    await request(app).get(pending.mediaUrl).expect(200);
    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", customerAuth)
      .expect(200);
    await request(app)
      .get("/api/auth/me")
      .set("Authorization", customerAuth)
      .expect(401);
    close();
    ({ app, close } = await createApp(config));
    assert.equal((await request(app).get("/api/packages")).body.length, 7);
    assert.equal(
      (await request(app).get("/api/admin/overview").set("Authorization", auth))
        .body.requests.length,
      1,
    );
  } finally {
    close();
    rmSync(temp, { recursive: true, force: true });
  }
});
