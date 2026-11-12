import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, X } from "lucide-react";
import { Intro, Button, Field, Modal, Notice } from "../components/UI";
import RouteMap from "../components/RouteMap";
import { Enquiry } from "../components/TripDetails";
import { today, dateAdd, money, getPackages } from "../api";
import { places, estimate } from "../../shared/data";
function defaults() {
  return {
    caption: "Mountains, chai & a little adventure",
    region: "Himachal",
    startDate: dateAdd(today(), 7),
    nights: 3,
    travelers: 2,
    transport: "Private cab",
    captain: true,
    photographer: false,
    marshal: false,
    stops: ["manali", "solang", "vashisht", "naggar"],
    notes: {},
    travelStyle: "Private group",
  };
}
function loadPlan() {
  try {
    const p = JSON.parse(localStorage.getItem("gumshuda-plan"));
    return p && p.startDate >= today() && Array.isArray(p.stops)
      ? { ...defaults(), ...p }
      : defaults();
  } catch {
    return defaults();
  }
}
function Calendar({ value, nights, onChange }) {
  const [month, setMonth] = useState(() => new Date(`${value}T12:00:00`));
  const y = month.getFullYear(),
    m = month.getMonth(),
    offset = (new Date(y, m, 1).getDay() + 6) % 7,
    days = new Date(y, m + 1, 0).getDate();
  useEffect(() => setMonth(new Date(`${value}T12:00:00`)), [value]);
  return (
    <div className="calendar">
      <div>
        <strong>
          {month.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          type="button"
          className="icon-button"
          aria-label="Previous month"
          onClick={() => setMonth(new Date(y, m - 1, 1))}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          onClick={() => setMonth(new Date(y, m + 1, 1))}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <small key={`day${i}`}>{d}</small>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
            end = dateAdd(value, nights);
          return (
            <button
              key={d}
              type="button"
              disabled={d < today()}
              aria-label={d}
              aria-pressed={d === value}
              className={
                d === value || d === end
                  ? "chosen"
                  : d > value && d < end
                    ? "in-range"
                    : ""
              }
              onClick={() => onChange(d)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default function Planner() {
  const [plan, setPlan] = useState(loadPlan),
    [review, setReview] = useState(false),
    [saved, setSaved] = useState(true),
    [editing, setEditing] = useState(null);
  const [params] = useSearchParams();
  const total = estimate(plan);
  const update = (values) => setPlan((p) => ({ ...p, ...values }));
  useEffect(() => {
    try {
      localStorage.setItem("gumshuda-plan", JSON.stringify(plan));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [plan]);
  useEffect(() => {
    const id = params.get("package");
    if (id)
      getPackages()
        .then((ps) => {
          const p = ps.find((x) => x.id === id);
          if (p)
            update({
              caption: p.title,
              nights: p.nights,
              region: p.destination === "Kerala" ? "Kerala" : "Himachal",
              notes: Object.fromEntries(p.days.map((d, i) => [i, d])),
              stops: places
                .filter((v) =>
                  p.route.some((r) => r.toLowerCase() === v.name.toLowerCase()),
                )
                .map((v) => v.id),
            });
        })
        .catch(() => {});
  }, [params]);
  const stopObjects = plan.stops
    .map((id) => places.find((p) => p.id === id))
    .filter(Boolean);
  const dayText = (i) =>
    plan.notes[i] ||
    (i === 0
      ? "Arrive · "
      : i === plan.nights
        ? "Return journey · "
        : "Explore · ") +
      (stopObjects[i % Math.max(stopObjects.length, 1)]?.name || plan.region);
  const move = (i, d) => {
    const stops = [...plan.stops];
    if (i + d < 0 || i + d >= stops.length) return;
    [stops[i], stops[i + d]] = [stops[i + d], stops[i]];
    update({ stops });
  };
  return (
    <div className="container page planner-page">
      <Intro
        eyebrow="MAKE YOUR OWN WAY"
        title="A trip that feels like you."
        extra={
          <div className="steps">
            <b>01 Your trip</b>
            <span />
            02 Review
            <span />
            03 Enquire
          </div>
        }
      >
        Choose your dates. Pin your places. We’ll take care of the details.
      </Intro>
      <div className="planner-layout">
        <aside className="panel essentials">
          <h3>The essentials</h3>
          <Field label="Trip caption">
            <input
              maxLength={120}
              value={plan.caption}
              onChange={(e) => update({ caption: e.target.value })}
            />
          </Field>
          <Field label="Where to?">
            <select
              value={plan.region}
              onChange={(e) =>
                update({
                  region: e.target.value,
                  stops:
                    e.target.value === "Kerala"
                      ? ["kochi", "munnar", "alleppey"]
                      : ["manali", "solang", "vashisht", "naggar"],
                  notes: {},
                })
              }
            >
              <option value="Himachal">Manali, Himachal Pradesh</option>
              <option value="Kerala">Kerala, South India</option>
            </select>
          </Field>
          <h4>Your travel dates</h4>
          <div className="date-inputs">
            <Field label="Start date">
              <input
                type="date"
                min={today()}
                value={plan.startDate}
                onChange={(e) => {
                  if (e.target.value >= today())
                    update({ startDate: e.target.value });
                }}
              />
            </Field>
            <Field label="Nights">
              <input
                type="number"
                min="1"
                max="30"
                value={plan.nights}
                onChange={(e) =>
                  update({
                    nights: Math.min(30, Math.max(1, Number(e.target.value))),
                  })
                }
              />
            </Field>
          </div>
          <Calendar
            value={plan.startDate}
            nights={plan.nights}
            onChange={(startDate) => update({ startDate })}
          />
          <Field label="Travelers">
            <div className="stepper">
              <span>
                {plan.travelers}{" "}
                {plan.travelers === 1 ? "traveler" : "travelers"}
              </span>
              <button
                aria-label="Fewer travelers"
                onClick={() =>
                  update({ travelers: Math.max(1, plan.travelers - 1) })
                }
              >
                −
              </button>
              <button
                aria-label="More travelers"
                onClick={() =>
                  update({ travelers: Math.min(40, plan.travelers + 1) })
                }
              >
                +
              </button>
            </div>
          </Field>
          <Field label="Your travel style">
            <select
              value={plan.travelStyle}
              onChange={(e) => update({ travelStyle: e.target.value })}
            >
              {[
                "Solo travel",
                "Couple getaway",
                "Private group",
                "Stranger group",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <h4>How would you like to travel?</h4>
          <div className="transport">
            {["Private cab", "Self-drive", "Tempo", "Urbania"].map((t) => (
              <button
                className={plan.transport === t ? "selected" : ""}
                key={t}
                onClick={() => update({ transport: t })}
              >
                {t}
              </button>
            ))}
          </div>
          <h4>Your travel crew</h4>
          {[
            ["captain", "Trip captain", "Local expertise, all the way"],
            [
              "photographer",
              "Personal photographer",
              "Capture the moments, stay in them.",
            ],
            [
              "marshal",
              "Trip marshal",
              "Guided bike rides, subject to availability.",
            ],
          ].map(([key, label, note]) => (
            <label key={key} className="crew">
              <span>
                <input
                  type="checkbox"
                  checked={plan[key]}
                  onChange={(e) => update({ [key]: e.target.checked })}
                />
                {label}
              </span>
              <small>{note}</small>
            </label>
          ))}
          <small className="muted">
            {saved
              ? "Preferences saved on this device as you plan."
              : "Your browser could not save this plan."}
          </small>
        </aside>
        <div className="planner-main">
          <RouteMap
            region={plan.region}
            stops={plan.stops}
            onChange={(stops) => update({ stops })}
          />
          <div className="planner-bottom">
            <section className="panel daily">
              <h3>Your journey, one day at a time</h3>
              <p className="tiny muted">
                Reorder stops or add your own discoveries.
              </p>
              <ol className="days">
                {Array.from({ length: plan.nights + 1 }, (_, i) => (
                  <li key={i}>
                    <span>{i + 1}</span>
                    <div>
                      <small className="eyebrow">
                        {dateAdd(plan.startDate, i)} · DAY {i + 1}
                      </small>
                      {editing === i ? (
                        <input
                          aria-label={`Day ${i + 1} itinerary`}
                          value={dayText(i)}
                          onChange={(e) =>
                            update({
                              notes: { ...plan.notes, [i]: e.target.value },
                            })
                          }
                          onBlur={() => setEditing(null)}
                          autoFocus
                        />
                      ) : (
                        <>
                          <h4>{dayText(i)}</h4>
                          <p className="tiny muted">
                            {i === plan.nights
                              ? "Check out · Travel home"
                              : `Stay in ${plan.region} · 1 night`}
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      className="text-button tiny"
                      onClick={() => setEditing(i)}
                    >
                      Edit
                    </button>
                  </li>
                ))}
              </ol>
              <details>
                <summary>Manage your {plan.stops.length} route stops</summary>
                <div className="route-stops">
                  {stopObjects.map((p, i) => (
                    <div key={p.id}>
                      <span>
                        {i + 1}. {p.name}
                      </span>
                      <button
                        className="icon-button"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={`Move ${p.name} up`}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={i === stopObjects.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={`Move ${p.name} down`}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${p.name}`}
                        onClick={() =>
                          update({
                            stops: plan.stops.filter((id) => id !== p.id),
                          })
                        }
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            </section>
            <aside className="trip-summary">
              <small>YOUR LITTLE ESCAPE</small>
              <h3>{plan.caption || "Your next great adventure"}</h3>
              <p>
                {plan.startDate} — {dateAdd(plan.startDate, plan.nights)}
              </p>
              <p>
                {plan.nights} nights · {plan.travelers} travelers ·{" "}
                {plan.stops.length} stops
              </p>
              <dl>
                <div>
                  <dt>Stays & experiences</dt>
                  <dd>{money(total.stays)}</dd>
                </div>
                <div>
                  <dt>{plan.transport}</dt>
                  <dd>{money(total.transport)}</dd>
                </div>
                <div>
                  <dt>Your travel crew</dt>
                  <dd>{money(total.crew)}</dd>
                </div>
              </dl>
              <p>Estimated total</p>
              <strong className="summary-price">{money(total.total)}</strong>
              <small>
                For {plan.travelers} travelers · indicative estimate, final
                quote on review
              </small>
              <Button
                className="lime"
                disabled={!plan.caption.trim() || !plan.stops.length}
                onClick={() => setReview(true)}
              >
                Review my trip →
              </Button>
            </aside>
          </div>
        </div>
      </div>
      {review && (
        <Modal
          title="Your journey, thoughtfully put together."
          onClose={() => setReview(false)}
          wide
        >
          <p className="eyebrow">02 · REVIEW YOUR TRIP</p>
          <h2>{plan.caption}</h2>
          <p>
            {plan.startDate} — {dateAdd(plan.startDate, plan.nights)} ·{" "}
            {plan.nights} nights · {plan.travelers} travelers
          </p>
          <p className="muted">{stopObjects.map((p) => p.name).join(" → ")}</p>
          <ol className="review-days">
            {Array.from({ length: plan.nights + 1 }, (_, i) => (
              <li key={i}>{dayText(i)}</li>
            ))}
          </ol>
          <Notice>
            Estimated total {money(total.total)}. Our team checks route
            feasibility, taxes, stays and available services before confirming a
            quote.
          </Notice>
          <button className="text-button" onClick={() => window.print()}>
            Print / save plan as PDF
          </button>
          <Enquiry
            plan={{
              ...plan,
              stops: stopObjects.map((p) => p.name),
              itinerary: Array.from({ length: plan.nights + 1 }, (_, i) =>
                dayText(i),
              ),
            }}
          />
        </Modal>
      )}
    </div>
  );
}
