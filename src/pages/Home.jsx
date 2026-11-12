import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Arrow, PackageCard, Notice } from "../components/UI";
import { asset, getPackages } from "../api";
import { images } from "../../shared/data";
import TripDetails from "../components/TripDetails";
export default function Home() {
  const [packages, setPackages] = useState([]),
    [selected, setSelected] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    getPackages()
      .then(setPackages)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <section className="container hero" data-node-id="3:13">
        <div className="hero-copy">
          <p className="eyebrow">GO SOMEWHERE THAT STAYS WITH YOU</p>
          <h1>
            Less ordinary.
            <br />
            More you.
          </h1>
          <p className="muted">
            Small escapes. Big adventures. Entirely your call.
            <br />
            Find a ready-to-go journey or make your own way.
          </p>
          <div className="actions">
            <Button to="/packages">
              Explore packages <Arrow />
            </Button>
            <Button to="/planner" secondary>
              Build my own trip →
            </Button>
          </div>
          <p className="hero-trust">
            Thoughtfully planned <span>/</span> Locally led <span>/</span> Made
            for you
          </p>
        </div>
        <div className="hero-visual">
          <img
            src={asset(images.hero)}
            alt="Mountain valley with a wooden cabin and forested slopes"
            fetchPriority="high"
          />
          <span className="hero-label">Your next chapter starts here</span>
          <div className="hero-caption">
            <small>A little closer to the extraordinary</small>
            <strong>Find your mountain escape</strong>
          </div>
        </div>
      </section>
      <section className="container favorites">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A FEW FAVORITES</p>
            <h2>Good trips. Great stories.</h2>
            <p className="muted">
              Handpicked itineraries, with room for a little spontaneity.
            </p>
          </div>
          <Link className="text-button" to="/packages">
            View all packages <Arrow />
          </Link>
        </div>
        <Notice error>{error}</Notice>
        <div className="package-grid home-grid">
          {packages.slice(0, 3).map((p, i) => (
            <PackageCard
              key={p.id}
              trip={{
                ...p,
                image: [images.manali, images.spiti, images.kerala][i],
              }}
              home
              onOpen={setSelected}
            />
          ))}
        </div>
      </section>
      <section className="container">
        <div className="custom-invite">
          <div>
            <p className="eyebrow">NOT A ONE-SIZE-FITS-ALL KIND OF TRAVELER?</p>
            <h2>Your dates. Your detours. Your story.</h2>
            <p>
              Choose the places, the pace and the people. We’ll bring it all
              together.
            </p>
            <Button to="/planner" className="lime">
              Make your own trip <Arrow />
            </Button>
          </div>
          <ol>
            <li>Pick your dates</li>
            <li>Pin your places</li>
            <li>Make it yours</li>
          </ol>
        </div>
      </section>
      <section className="container story-preview">
        <img
          src={asset(images.friends)}
          alt="Travelers exploring a mountain trail together"
          loading="lazy"
        />
        <div>
          <p className="eyebrow">FROM YOUR CAMERA ROLL</p>
          <h2>The best souvenirs are stories.</h2>
          <p className="quote">
            The quiet riverside stop. The chai that tasted better in the
            mountains. The people who became your people.
          </p>
          <p className="muted tiny">
            Solo escapes · Couple getaways · Private & stranger groups
          </p>
          <Link to="/stories" className="text-button">
            Explore traveler stories <Arrow />
          </Link>
        </div>
      </section>
      {selected && (
        <TripDetails trip={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
