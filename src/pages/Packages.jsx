import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Intro,
  Button,
  PackageCard,
  Field,
  Notice,
  Arrow,
} from "../components/UI";
import { getPackages, money, today } from "../api";
import TripDetails from "../components/TripDetails";
export default function Packages() {
  const [packages, setPackages] = useState([]),
    [query, setQuery] = useState(""),
    [nights, setNights] = useState([]),
    [styles, setStyles] = useState([]),
    [budget, setBudget] = useState(30000),
    [sort, setSort] = useState("recommended"),
    [date, setDate] = useState(""),
    [selected, setSelected] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    getPackages()
      .then(setPackages)
      .catch((e) => setError(e.message));
  }, []);
  const toggle = (value, values, set) =>
    set(
      values.includes(value)
        ? values.filter((x) => x !== value)
        : [...values, value],
    );
  const filtered = packages
    .filter(
      (p) =>
        `${p.title} ${p.destination} ${p.route.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (!nights.length || nights.includes(Math.min(p.nights, 5))) &&
        (!styles.length || styles.includes(p.style)) &&
        p.price <= budget &&
        (!date || !p.departures?.length || p.departures.includes(date)),
    )
    .sort((a, b) =>
      sort === "price-low"
        ? a.price - b.price
        : sort === "price-high"
          ? b.price - a.price
          : sort === "duration"
            ? a.nights - b.nights
            : 0,
    );
  function clear() {
    setQuery("");
    setNights([]);
    setStyles([]);
    setBudget(30000);
    setDate("");
    setSort("recommended");
  }
  return (
    <div className="container page packages-page">
      <Intro
        eyebrow="FIND YOUR NEXT CHAPTER"
        title="A getaway for every kind of you."
      >
        From quick resets to the long way round. Pick a journey, then make it
        yours.
      </Intro>
      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          document
            .getElementById("package-results")
            .scrollIntoView({ behavior: "smooth" });
        }}
      >
        <input
          aria-label="Search destinations or experiences"
          placeholder="Search destinations or experiences"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Field label="Departure date">
          <input
            aria-label="Departure date"
            type="date"
            min={today()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Button>
          Find my escape <Arrow />
        </Button>
      </form>
      <div className="catalog-layout">
        <aside className="panel filters">
          <h3>Make it your kind of trip</h3>
          <button className="text-button tiny" onClick={clear}>
            Clear all
          </button>
          <fieldset>
            <legend>DURATION</legend>
            {[2, 3, 4, 5].map((n) => (
              <label className="check" key={n}>
                <input
                  type="checkbox"
                  checked={nights.includes(n)}
                  onChange={() => toggle(n, nights, setNights)}
                />
                {n === 5 ? "5+ nights" : `${n} nights / ${n + 1} days`}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>BUDGET PER PERSON</legend>
            <p>Up to {money(budget)}</p>
            <input
              aria-label="Maximum budget per person"
              type="range"
              min="5000"
              max="50000"
              step="500"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </fieldset>
          <fieldset>
            <legend>TRAVEL STYLE</legend>
            {["Adventure", "Slow travel", "Family time", "Romantic escape"].map(
              (s) => (
                <label key={s} className="check">
                  <input
                    type="checkbox"
                    checked={styles.includes(s)}
                    onChange={() => toggle(s, styles, setStyles)}
                  />
                  {s}
                </label>
              ),
            )}
          </fieldset>
          <div className="soft-panel">
            <strong>Nothing quite right?</strong>
            <p className="tiny muted">Build a trip around you.</p>
            <Link to="/planner" className="text-button tiny">
              Start customizing <Arrow />
            </Link>
          </div>
        </aside>
        <section id="package-results">
          <div className="result-heading">
            <strong aria-live="polite">
              {filtered.length} handpicked journeys
            </strong>
            <select
              aria-label="Sort packages"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recommended">Sort by: Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="duration">Shortest trip first</option>
            </select>
          </div>
          <Notice error>{error}</Notice>
          {date && (
            <p className="tiny muted">
              Trips without fixed departures can be requested for your date,
              subject to confirmation.
            </p>
          )}
          <div className="package-grid">
            {filtered.map((p) => (
              <PackageCard key={p.id} trip={p} onOpen={setSelected} />
            ))}
          </div>
          {!filtered.length && !error && (
            <div className="panel empty">
              <h3>No trips match just yet.</h3>
              <p>Try a different budget or create your own journey.</p>
              <Button secondary onClick={clear}>
                Reset filters
              </Button>
            </div>
          )}
          <p className="tiny muted catalogue-note">
            Starting prices are indicative. Final quote, availability and
            inclusions are confirmed before booking.
          </p>
        </section>
      </div>
      {selected && (
        <TripDetails trip={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
