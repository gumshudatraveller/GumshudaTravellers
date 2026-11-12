import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Star } from "lucide-react";
import { Intro, Button, Field, Notice, Modal, Arrow } from "../components/UI";
import { getStories, request, asset, hasBackend } from "../api";
import { useAuth } from "../App";
export default function Stories() {
  const { user, openLogin } = useAuth();
  const [stories, setStories] = useState([]),
    [tab, setTab] = useState("all"),
    [rating, setRating] = useState(5),
    [file, setFile] = useState(null),
    [preview, setPreview] = useState(""),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    getStories()
      .then(setStories)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(f) {
    setError("");
    if (f && f.size > 100 * 1024 * 1024) {
      setError("Choose a file smaller than 100 MB.");
      return;
    }
    if (
      f &&
      !["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(f.type)
    ) {
      setError("Please choose a JPG, PNG, WebP or MP4 file.");
      return;
    }
    setFile(f);
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!hasBackend) {
      setError(
        "Community uploads will open when online accounts are available.",
      );
      return;
    }
    if (!user) {
      openLogin();
      return;
    }
    if (!file) {
      setError("Choose a photo or video to share.");
      return;
    }
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("rating", String(rating));
    data.set("file", file);
    setBusy(true);
    try {
      await request("/stories", { method: "POST", body: data });
      setMessage(
        "Your story was submitted for review. It will appear after approval.",
      );
      form.reset();
      setFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page stories-page">
      <Intro
        eyebrow="THE GUMSHUDA JOURNAL"
        title="Real trips. Real happy detours."
      >
        A place for the photos, the films and the “you had to be there” moments.
      </Intro>
      <div className="story-tabs segmented">
        {[
          ["all", "All stories"],
          ["photo", "Photo journals"],
          ["video", "Travel films"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "selected" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="stories-layout">
        <form className="panel story-form" onSubmit={submit}>
          <h2>Every trip has a story.</h2>
          <p className="tiny muted">What’s yours?</p>
          <label
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              choose(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              onChange={(e) => choose(e.target.files[0])}
            />
            {preview ? (
              file?.type.startsWith("video/") ? (
                <video src={preview} controls />
              ) : (
                <img src={preview} alt="Your selected travel photo" />
              )
            ) : (
              <>
                <Upload size={27} />
                <strong>Drop your photos or videos</strong>
                <span>or choose from your device</span>
                <small>JPG, PNG, WebP, MP4 · Up to 100 MB</small>
              </>
            )}
          </label>
          <Field label="Story title">
            <input
              name="title"
              placeholder="A detour worth remembering"
              required
              maxLength={120}
            />
          </Field>
          <Field label="Your destination">
            <select name="destination">
              {[
                "Manali",
                "Spiti",
                "Kasol",
                "Jibhi",
                "Kerala",
                "Meghalaya",
                "Other",
              ].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="How was your trip?">
            <div className="rating" role="group" aria-label="Trip rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  aria-label={`${n} stars`}
                  aria-pressed={rating === n}
                  onClick={() => setRating(n)}
                >
                  <Star
                    fill={n <= rating ? "currentColor" : "none"}
                    size={25}
                  />
                </button>
              ))}
            </div>
          </Field>
          <Field label="Tell us the little things">
            <textarea
              name="body"
              placeholder="The view you didn’t expect. The café you stumbled into. The moment you’ll never forget…"
              required
              minLength={10}
              maxLength={3000}
              rows={5}
            />
          </Field>
          <label className="check tiny">
            <input type="checkbox" name="consent" required />I own this media
            and agree to share it publicly after review.
          </label>
          <Notice error>{error}</Notice>
          <Notice>{message}</Notice>
          <Button disabled={busy}>
            {busy ? "Uploading…" : "Post my story"} <Arrow />
          </Button>
          <p className="tiny muted">Stories appear after a community review.</p>
        </form>
        <div>
          <div className="story-grid">
            {stories
              .filter((s) => tab === "all" || s.type === tab)
              .map((s) => (
                <article className="panel story-card" key={s.id}>
                  <div className="story-photo">
                    {s.type === "video" ? (
                      <video
                        src={asset(s.mediaUrl)}
                        controls
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={asset(s.mediaUrl || s.image)}
                        alt={s.title}
                        loading="lazy"
                      />
                    )}
                    <span className="badge">
                      {s.sample
                        ? "SAMPLE PHOTO JOURNAL"
                        : s.type === "video"
                          ? "TRAVEL FILM"
                          : "PHOTO JOURNAL"}
                    </span>
                  </div>
                  <div className="story-body">
                    <span
                      className="stars"
                      aria-label={`${s.rating} out of 5 stars`}
                    >
                      {"★ ".repeat(s.rating)}
                    </span>
                    <h3>{s.title}</h3>
                    <p className="muted">{s.body}</p>
                    <strong>{s.author}</strong>
                    <p className="tiny muted">
                      {s.destination}
                      {s.sample ? " · Example from the design" : ""}
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setSelected(s)}
                    >
                      Read story <Arrow />
                    </button>
                  </div>
                </article>
              ))}
          </div>
          {!stories.some((s) => tab === "all" || s.type === tab) && (
            <div className="panel empty">
              <h3>The next story could be yours.</h3>
              <p className="muted">
                No {tab === "video" ? "travel films" : "stories"} have been
                published here yet.
              </p>
            </div>
          )}
          <div className="story-invite">
            <p className="eyebrow">THE LITTLE MOMENTS MATTER</p>
            <h2>Find the places that never make the guidebooks.</h2>
            <p className="muted">
              A dedicated trip captain. A personal photographer. A journey made
              around you.
            </p>
            <Link to="/planner" className="text-button">
              Make a story of your own <Arrow />
            </Link>
          </div>
        </div>
      </div>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <p className="eyebrow">
            {selected.sample ? "SAMPLE STORY" : selected.destination}
          </p>
          {selected.type === "video" ? (
            <video
              className="detail-image"
              src={asset(selected.mediaUrl)}
              controls
            />
          ) : (
            <img
              className="detail-image"
              src={asset(selected.mediaUrl || selected.image)}
              alt={selected.title}
            />
          )}
          <p>{selected.body}</p>
          <p className="muted">
            {selected.author} · {selected.destination}
          </p>
        </Modal>
      )}
    </div>
  );
}
