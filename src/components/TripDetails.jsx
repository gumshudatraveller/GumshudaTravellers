import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, Button, Field, Notice, Arrow } from "./UI";
import { asset, money, today, hasBackend, request } from "../api";
import { contact } from "../../shared/data";
export function Enquiry({ trip, plan, onDone }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const description = plan
    ? `${plan.caption}\n${plan.startDate} · ${plan.nights} nights · ${plan.travelers} travelers\nRoute: ${plan.stops.join(", ")}\nTransport: ${plan.transport}\nCaptain: ${plan.captain ? "Yes" : "No"} · Photographer: ${plan.photographer ? "Yes" : "No"} · Marshal: ${plan.marshal ? "Yes" : "No"}`
    : `${trip.title} · ${trip.nights} nights · From ${money(trip.price)} per person`;
  const [details, setDetails] = useState({
    name: "",
    email: "",
    phone: "",
    date: plan?.startDate || "",
    travelers: plan?.travelers || 2,
  });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await request("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...details,
          travelers: Number(details.travelers),
          packageId: trip?.id,
          plan,
          kind: plan ? "custom" : "package",
        }),
      });
      setMessage(
        `Request ${r.reference} received. Our team will contact you to confirm availability and pricing.`,
      );
      onDone?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const change = (e) =>
    setDetails({ ...details, [e.target.name]: e.target.value });
  return (
    <div className="enquiry">
      <h3>Let’s bring your journey together.</h3>
      <p className="muted tiny">
        Enquire now. Availability, inclusions and final pricing are confirmed by
        our travel team before booking.
      </p>
      {hasBackend ? (
        <form onSubmit={submit} className="stack">
          <div className="form-grid">
            <Field label="Your name">
              <input
                name="name"
                value={details.name}
                onChange={change}
                required
                maxLength={80}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                name="phone"
                value={details.phone}
                onChange={change}
                required
                pattern="[+0-9 ()-]{8,20}"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                name="email"
                value={details.email}
                onChange={change}
                required
              />
            </Field>
            <Field label="Travel date">
              <input
                type="date"
                readOnly={!!plan}
                name="date"
                value={details.date}
                onChange={change}
                min={today()}
                required
              />
            </Field>
            <Field label="Travelers">
              <input
                name="travelers"
                readOnly={!!plan}
                type="number"
                min="1"
                max="40"
                value={details.travelers}
                onChange={change}
                required
              />
            </Field>
          </div>
          <Notice error>{error}</Notice>
          <Notice>{message}</Notice>
          <Button disabled={busy || !!message}>
            {busy
              ? "Sending…"
              : message
                ? "Request received"
                : "Request a quote"}{" "}
            <Arrow />
          </Button>
        </form>
      ) : (
        <a
          className="button"
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hi Gumshuda Travellers! I'd like to enquire about:\n${description}`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Enquire on WhatsApp <Arrow />
        </a>
      )}
    </div>
  );
}
export default function TripDetails({ trip, onClose }) {
  return (
    <Modal title={trip.title} onClose={onClose} wide>
      <img className="detail-image" src={asset(trip.image)} alt={trip.title} />
      <div className="detail-header">
        <span className="badge inline">
          {trip.nights} nights / {trip.nights + 1} days
        </span>
        <strong className="price">
          From {money(trip.price)} <small>/ person</small>
        </strong>
      </div>
      <p className="muted">{trip.description}</p>
      <p className="tiny muted">
        Indicative package · Taxes, exact inclusions and travel conditions
        confirmed with your quote. Mountain routes depend on weather and access.
      </p>
      <h3>Your journey, day by day</h3>
      <ol className="days">
        {trip.days.map((day, i) => (
          <li key={i}>
            <span>{i + 1}</span>
            <div>
              <small className="eyebrow">DAY {i + 1}</small>
              <p>{day}</p>
            </div>
          </li>
        ))}
      </ol>
      {trip.attachments?.length > 0 && (
        <div className="stack">
          <h3>Trip guides & media</h3>
          {trip.attachments.map((a) => (
            <a key={a.url} href={asset(a.url)} target="_blank" rel="noreferrer">
              {a.name} ↗
            </a>
          ))}
        </div>
      )}
      <div className="actions">
        <Link
          className="button secondary"
          to={`/planner?package=${trip.id}`}
          onClick={onClose}
        >
          Customize this journey <Arrow />
        </Link>
        <button className="text-button" onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>
      <Enquiry trip={trip} />
    </Modal>
  );
}
