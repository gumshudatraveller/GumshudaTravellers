import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Plus, LogOut } from "lucide-react";
import { useAuth } from "../App";
import { Brand, Button, Field, Notice, Modal } from "../components/UI";
import {
  request,
  hasAdminBackend as hasBackend,
  hasSupabase,
  asset,
  money,
} from "../api";
import { packages as seed, images, contact } from "../../shared/data";
const empty = () => ({
  title: "",
  destination: "Himachal Pradesh",
  route: ["Manali"],
  nights: 2,
  price: 0,
  priceOnRequest: true,
  style: "Adventure",
  image: images.packageLahaul,
  days: ["", "", ""],
  status: "draft",
  attachments: [],
  description: "",
  departures: [],
});
export default function Admin() {
  const { user, openLogin, logout } = useAuth(),
    [tab, setTab] = useState("Itineraries"),
    [packages, setPackages] = useState(hasBackend ? [] : seed),
    [requests, setRequests] = useState([]),
    [stories, setStories] = useState([]),
    [media, setMedia] = useState([]),
    [draft, setDraft] = useState(empty),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false),
    [dirty, setDirty] = useState(false);
  const allowed = hasBackend && user?.role === "admin";
  async function refresh() {
    if (!allowed) return;
    try {
      const r = await request("/admin/overview");
      setPackages(r.packages);
      setRequests(r.requests);
      setStories(r.stories);
      setMedia(r.media);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    refresh();
  }, [allowed]);
  const change = (v) => { setDirty(true); setDraft((d) => ({ ...d, ...v })); };
  function openEditor(value) {
    setDraft({ ...empty(), ...value, priceOnRequest: !!value?.priceOnRequest, attachments: value?.attachments || [] });
    setError(""); setMessage(""); setDirty(false); setEditing(true);
  }
  function closeEditor() {
    if (busy) return;
    if (dirty && !window.confirm("Discard unsaved package changes?")) return;
    setEditing(false); setDirty(false);
  }
  useEffect(() => {
    const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(publish) {
    setError("");
    setMessage("");
    if (!allowed || busy) return;
    if (!draft.title.trim()) { setError("Enter a package title before saving."); return; }
    if (!Number.isFinite(draft.nights) || draft.nights < 1 || draft.nights > 30) { setError("Nights must be between 1 and 30."); return; }
    if (!Number.isFinite(draft.price) || draft.price < 0 || (!draft.priceOnRequest && draft.price < 1)) { setError("Enter a price or choose Price on request."); return; }
    if (draft.departures.some(d => d.trim() && (!/^\d{4}-\d{2}-\d{2}$/.test(d.trim()) || Number.isNaN(Date.parse(d.trim()))))) { setError("Use departure dates in YYYY-MM-DD format, separated by commas."); return; }
    if (
      publish &&
      (!draft.title.trim() ||
        !draft.days.length ||
        draft.days.some((d) => !d.trim()))
    ) {
      setError("Add a title and an itinerary for every day before publishing.");
      return;
    }
    setBusy(true);
    try {
      const saved = await request(`/admin/packages${draft.id ? "/" + draft.id : ""}`, {
        method: draft.id ? "PUT" : "POST",
        body: JSON.stringify({
          ...draft,
          title: draft.title.trim(),
          route: draft.route.map(s => s.trim()).filter(Boolean),
          departures: draft.departures.map(s => s.trim()).filter(Boolean),
          status: publish ? "published" : "draft",
        }),
      });
      setMessage(publish ? "Itinerary published." : "Draft saved.");
      setDraft(saved);
      setDirty(false);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    const input = e.currentTarget;
    const file = input.files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const uploaded = await request("/admin/media", {
        method: "POST",
        body: fd,
      });
      if (editing && uploaded?.type?.startsWith("image/")) change({ image: uploaded.url });
      else if (editing) change({ attachments: [...draft.attachments, { name: uploaded.name, url: uploaded.url, type: uploaded.type }] });
      setMessage(
        editing ? "Upload complete. Save the package to keep this media selection." : "Upload complete. Open a package to select this media.",
      );
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      input.value = "";
    }
  }
  async function moderate(id, status) {
    try {
      await request(`/admin/stories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  async function requestStatus(id, status) {
    try {
      await request(`/admin/requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  if (hasBackend && !allowed)
    return (
      <div className="container empty">
        <Brand />
        <h1>Welcome to your travel studio.</h1>
        <p className="muted">
          Sign in with your administrator account to manage packages and media.
        </p>
        {user ? (
          <>
            <Notice error>
              Your account does not have administrator access.
            </Notice>
            <Button onClick={logout}>Log out</Button>
          </>
        ) : (
          <Button onClick={openLogin}>Admin login</Button>
        )}
        <p>
          <Link to="/">Back to the website →</Link>
        </p>
      </div>
    );
  const tabs = hasSupabase
    ? ["Itineraries", "Media library", "Account"]
    : [
        "Overview",
        "Itineraries",
        "Custom trip requests",
        "Bookings",
        "Traveler stories",
        "Media library",
        "Account",
      ];
  const filtered = packages.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      `${p.title} ${p.destination}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const uploader = (
    <label className="dropzone compact">
      <Upload />
      <strong>{busy ? "Please wait…" : "Upload photos, videos or PDFs"}</strong>
      <small>
        {hasSupabase
          ? "JPG, PNG, WebP, MP4, PDF · Up to 10 MB"
          : "JPG, PNG, WebP, MP4, PDF · Up to 100 MB"}
      </small>
      <input
        type="file"
        accept={
          hasSupabase
            ? "image/jpeg,image/png,image/webp,video/mp4,application/pdf"
            : "image/jpeg,image/png,image/webp,video/mp4,application/pdf"
        }
        onChange={upload}
        disabled={!allowed || busy}
      />
    </label>
  );
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <Brand />
        <p className="tiny">TRAVEL STUDIO</p>
        <small>WORKSPACE</small>
        {tabs.map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <Link className="admin-back" to="/">
          View customer website ↗
        </Link>
        <p>Gumshuda team</p>
        {allowed && (
          <button onClick={logout}>
            <LogOut size={15} /> Log out
          </button>
        )}
      </aside>
      <div className="admin-content">
        <header className="admin-top">
          Workspace / {tab}
          <a href={`tel:${contact.phone.replaceAll(" ", "")}`}>
            Travel team · Help
          </a>
        </header>
        <div className="admin-workspace">
          <div className="section-heading">
            <div>
              <h2>Your next great itinerary starts here.</h2>
              <p className="muted">
                Create journeys, manage content and get them ready for your
                travelers.
              </p>
            </div>
            <Button
              onClick={() => {
                setTab("Itineraries");
                openEditor(empty());
              }}
            >
              <Plus size={16} /> Create itinerary
            </Button>
          </div>
          {!hasBackend && (
            <Notice>
              Studio preview. Connect the hosted backend to enable admin login,
              publishing and uploads.
            </Notice>
          )}
          <Notice error>{error}</Notice>
          <Notice>{message}</Notice>
          <div
            className="stats"
            style={hasSupabase ? { display: "none" } : undefined}
          >
            <div className="panel">
              <p>Live packages</p>
              <strong>
                {packages.filter((p) => p.status === "published").length}
              </strong>
              <small>Available to explore</small>
            </div>
            <div className="panel">
              <p>Custom requests</p>
              <strong>
                {requests.filter((r) => r.kind === "custom").length}
              </strong>
              <small>Personal journeys</small>
            </div>
            <div className="panel">
              <p>Stories to review</p>
              <strong>
                {stories.filter((s) => s.status === "pending").length}
              </strong>
              <small>Photos and travel films</small>
            </div>
          </div>
          {["Overview", "Itineraries"].includes(tab) && (
            <div className="admin-columns" style={{display:"block"}}>
              <div>
                <section className="panel library-table">
                  <h3>Itinerary library</h3>
                  <div className="segmented flat">
                    {[
                      ["all", "All itineraries"],
                      ["published", "Published"],
                      ["draft", "Drafts"],
                    ].map(([s, label]) => (
                      <button
                        key={s}
                        className={status === s ? "selected" : ""}
                        onClick={() => setStatus(s)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    placeholder="Search itineraries by title or destination"
                    aria-label="Search itineraries"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>ITINERARY</th>
                          <th>DURATION</th>
                          <th>FROM / PERSON</th>
                          <th>STATUS</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.title}</strong>
                              <small>{p.destination}</small>
                            </td>
                            <td>
                              {p.nights}N / {p.nights + 1}D
                            </td>
                            <td>
                              {p.priceOnRequest
                                ? "Request a quote"
                                : money(p.price)}
                            </td>
                            <td>
                              <span className={`status ${p.status}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="text-button tiny"
                                onClick={() => openEditor(p)}
                              >
                                Edit
                              </button>
                              <button type="button" className="text-button tiny" onClick={() => { const { id, ...copy } = p; openEditor({ ...copy, title: `${p.title} (copy)`.slice(0,120), status: "draft" }); }}>Duplicate</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="panel media-panel">
                  <h3>Bring your journeys to life</h3>
                  <p className="tiny muted">
                    Photos, videos and useful guides, all in one place.
                  </p>
                  {uploader}
                  <div className="media-preview">
                    <img
                      src={asset(images.adminManali)}
                      alt="Manali package cover"
                    />
                    <div>
                      <strong>Manali cover</strong>
                      <p className="tiny muted">
                        Figma cover photo · Ready to use
                      </p>
                    </div>
                    <button
                      className="text-button tiny"
                      onClick={() => setTab("Media library")}
                    >
                      Manage all assets ↗
                    </button>
                  </div>
                </section>
              </div>
              {editing && <Modal title={draft.id ? "Edit package" : "Create package"} wide onClose={closeEditor}>
              <form
                className="itinerary-editor admin-package-editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  save(true);
                }}
              >
                <Notice error>{error}</Notice><Notice>{message}</Notice>
                <p className="tiny">{dirty ? "Unsaved changes" : "Changes saved or ready to edit"}</p>
                <p className="tiny muted">
                  {draft.status === "published"
                    ? "Published journey"
                    : "Draft · Not visible to customers"}
                </p>
                <fieldset disabled={!allowed || busy}>
                  <Field label="Itinerary title">
                    <input
                      value={draft.title}
                      maxLength={120}
                      onChange={(e) => change({ title: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Destination">
                    <input
                      value={draft.destination}
                      onChange={(e) => change({ destination: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Route (comma separated)">
                    <input
                      value={draft.route.join(",")}
                      onChange={(e) =>
                        change({
                          route: e.target.value.split(","),
                        })
                      }
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Nights">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={draft.nights}
                        onChange={(e) => {
                          change({ nights: Number(e.target.value) });
                        }}
                      />
                    </Field>
                    <Field label="From price / person">
                      <input
                        type="number"
                        min={draft.priceOnRequest ? "0" : "1"}
                        disabled={!!draft.priceOnRequest}
                        value={draft.price}
                        onChange={(e) =>
                          change({ price: Number(e.target.value) })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Travel style">
                    <select
                      value={draft.style}
                      onChange={(e) => change({ style: e.target.value })}
                    >
                      {[
                        "Adventure",
                        "Slow travel",
                        "Family time",
                        "Romantic escape",
                        "Wildlife & culture",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!!draft.priceOnRequest}
                      onChange={(e) =>
                        change({ priceOnRequest: e.target.checked })
                      }
                    />
                    Price on request (hide numeric price)
                  </label>
                  <Field label="Description">
                    <textarea
                      value={draft.description}
                      maxLength={3000}
                      onChange={(e) => change({ description: e.target.value })}
                    />
                  </Field>
                  <h4>Package cover</h4>
                  <img className="admin-cover-preview" src={asset(draft.image)} alt="Selected package cover" />
                  {uploader}
                  <Field label="Cover photo">
                    <select
                      value={draft.image}
                      onChange={(e) => change({ image: e.target.value })}
                    >
                      <option value={images.packageLahaul}>Lahaul cover</option>
                      <option value={images.packageUdaipurJawai}>
                        Udaipur–Jawai cover
                      </option>
                      <option value={images.packageChandratal}>
                        Chandrataal cover
                      </option>
                      <option value={images.packageManali}>Manali cover</option>
                      <option value={images.packageSpiti}>Spiti cover</option>
                      <option value={images.packageKerala}>Kerala cover</option>
                      {media
                        .filter((m) => m.type.startsWith("image/"))
                        .map((m) => (
                          <option key={m.id} value={m.url}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <h4>Daily itinerary</h4>
                  {draft.days.map((d, i) => (
                    <Field key={i} label={`Day ${i + 1}`}>
                      <textarea
                        rows={3}
                        value={d}
                        onChange={(e) =>
                          change({
                            days: draft.days.map((v, n) =>
                              n === i ? e.target.value : v,
                            ),
                          })
                        }
                      />
                      <button type="button" className="text-button" disabled={draft.days.length <= 1} onClick={() => change({days: draft.days.filter((_, n) => n !== i)})}>Remove day {i + 1}</button>
                    </Field>
                  ))}
                  <Button type="button" secondary onClick={() => change({ days: [...draft.days, ""] })}>Add itinerary day</Button>
                  <p className="tiny muted">Add overnight travel days separately. Changing nights does not delete your itinerary.</p>
                  <Field label="Departure dates (comma separated, YYYY-MM-DD)">
                    <input
                      value={draft.departures?.join(",") || ""}
                      onChange={(e) =>
                        change({
                          departures: e.target.value
                            .split(","),
                        })
                      }
                    />
                  </Field>
                  <h4>Package details</h4>
                  {[ ["inclusions", "Inclusions (one per line)"], ["exclusions", "Exclusions (one per line)"], ["highlights", "Highlights (one per line)"] ].map(([key, label]) => <Field key={key} label={label}><textarea rows={3} value={(draft[key] || []).join("\n")} onChange={e => change({[key]: e.target.value.split("\n")})} /></Field>)}
                  <Field label="Transport"><input value={draft.transport || ""} onChange={e => change({transport:e.target.value})} placeholder="e.g. Urbania AC traveller" /></Field>
                  <Field label="Group size"><input type="number" min="1" max="100" value={draft.groupSize || ""} onChange={e => change({groupSize: Number(e.target.value) || null})} /></Field>
                  <h4>Customer attachments</h4>
                  {media.map((m) => (
                    <label className="check tiny" key={m.id}>
                      <input
                        type="checkbox"
                        checked={draft.attachments.some((a) => a.url === m.url)}
                        onChange={(e) =>
                          change({
                            attachments: e.target.checked
                              ? [
                                  ...draft.attachments,
                                  { name: m.name, url: m.url, type: m.type },
                                ]
                              : draft.attachments.filter(
                                  (a) => a.url !== m.url,
                                ),
                          })
                        }
                      />
                      {m.name}
                    </label>
                  ))}
                  {!media.length && (
                    <p className="tiny muted">
                      Upload assets to attach them here.
                    </p>
                  )}
                  <div className="actions">
                    <Button type="button" secondary onClick={() => save(false)}>
                      {draft.status === "published" ? "Unpublish & save draft" : "Save draft"}
                    </Button>
                    <Button type="submit">{busy ? "Saving…" : draft.status === "published" ? "Save published changes" : "Publish itinerary"}</Button>
                    <Button type="button" secondary onClick={closeEditor}>Close editor</Button>
                  </div>
                </fieldset>
              </form>
              </Modal>}
            </div>
          )}
          {["Custom trip requests", "Bookings"].includes(tab) && (
            <section className="panel">
              <h3>{tab}</h3>
              {requests
                .filter(
                  (r) => r.kind === (tab === "Bookings" ? "package" : "custom"),
                )
                .map((r) => (
                  <article className="request-card" key={r.id}>
                    <div>
                      <strong>
                        {r.reference} · {r.name}
                      </strong>
                      <p>
                        {r.email} · {r.phone}
                      </p>
                      <p>
                        {r.date} · {r.travelers} travelers
                      </p>
                      <pre>
                        {r.plan
                          ? JSON.stringify(r.plan, null, 2)
                          : r.packageTitle || r.packageId}
                      </pre>
                    </div>
                    <Field label="Request status">
                      <select
                        value={r.status}
                        onChange={(e) => requestStatus(r.id, e.target.value)}
                      >
                        {[
                          "new",
                          "contacted",
                          "quoted",
                          "confirmed",
                          "cancelled",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </Field>
                  </article>
                ))}
              {!requests.length && (
                <p className="muted">
                  No enquiries yet. New enquiries will appear here.
                </p>
              )}
            </section>
          )}
          {tab === "Traveler stories" && (
            <section className="panel">
              <h3>Community review</h3>
              {stories.map((s) => (
                <article className="request-card" key={s.id}>
                  <div>
                    <strong>{s.title}</strong>
                    <p>
                      {s.author} · {s.destination} · {s.rating} stars
                    </p>
                    <p>{s.body}</p>
                    <ProtectedMedia item={s} />
                    <span className="status">{s.status}</span>
                  </div>
                  <div className="actions">
                    <Button onClick={() => moderate(s.id, "approved")}>
                      Approve
                    </Button>
                    <Button
                      secondary
                      onClick={() => moderate(s.id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                </article>
              ))}
              {!stories.length && (
                <p className="muted">
                  Stories awaiting review will appear here.
                </p>
              )}
            </section>
          )}
          {tab === "Media library" && (
            <section className="panel">
              <h3>Your media library</h3>
              {uploader}
              <div className="media-grid">
                {media.map((m) => (
                  <article key={m.id}>
                    {m.type.startsWith("image/") ? (
                      <img src={asset(m.url)} alt={m.name} />
                    ) : (
                      <div className="file-icon">
                        {m.type === "application/pdf" ? "PDF" : "VIDEO"}
                      </div>
                    )}
                    <a href={asset(m.url)} target="_blank" rel="noreferrer">
                      {m.name} ↗
                    </a>
                    <small>{(m.size / 1024 / 1024).toFixed(1)} MB</small>
                    <Button type="button" secondary onClick={() => { setTab("Itineraries"); openEditor({ ...empty(), ...(m.type.startsWith("image/") ? {image:m.url} : {attachments:[{name:m.name,url:m.url,type:m.type}]}) }); }}>Create package with this file</Button>
                  </article>
                ))}
              </div>
            </section>
          )}
          {tab === "Account" && (
            <section className="panel">
              <h3>Business details</h3>
              <p>Gumshuda Travellers</p>
              <p>
                {contact.phone} · {contact.alternate}
              </p>
              <p>Instagram: @{contact.instagram}</p>
              <p className="muted">
                Use Itineraries to create, edit, duplicate, publish or unpublish a package. Use Media library to upload images, short MP4 videos and PDF guides.
              </p>
              <h4>Account</h4>
              <p>{user?.email || "Preview mode"}</p>
              <p className="tiny muted">
                Only your owner account can change packages. Published changes appear when customers reload the website.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
function ProtectedMedia({ item }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let objectUrl,
      cancelled = false;
    const source = asset(item.mediaUrl);
    fetch(source, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("gumshuda-token")}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.mediaUrl]);
  return url ? (
    item.type === "video" ? (
      <video className="review-media" src={url} controls />
    ) : (
      <img className="review-media" src={url} alt={item.title} />
    )
  ) : (
    <p className="tiny">Media preview loading</p>
  );
}
