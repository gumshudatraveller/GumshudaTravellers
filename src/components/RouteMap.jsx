import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { places, distance, images } from "../../shared/data";
import { asset } from "../api";
export default function RouteMap({ region, stops, onChange }) {
  const [selected, setSelected] = useState(
      places.find((p) => p.id === "manali"),
    ),
    [mode, setMode] = useState("preview"),
    [search, setSearch] = useState("");
  const container = useRef(),
    mapRef = useRef(),
    layers = useRef(),
    schematicRef = useRef();
  const [scale, setScale] = useState(1);
  const options = places.filter((p) => p.region === region);
  const nearby = options
    .filter((p) => p.id !== selected.id)
    .map((p) => ({ ...p, km: distance(selected, p) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);
  useEffect(() => {
    if (mode !== "preview" || !schematicRef.current) return;
    const observer = new ResizeObserver((entries) =>
      setScale(entries[0].contentRect.width / 854),
    );
    observer.observe(schematicRef.current);
    return () => observer.disconnect();
  }, [mode]);
  useEffect(() => {
    setSelected(
      places.find((p) => p.id === (region === "Himachal" ? "manali" : "kochi")),
    );
    if (region !== "Himachal") setMode("map");
  }, [region]);
  useEffect(() => {
    if (mode !== "map" || !container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).setView(
      [selected.lat, selected.lng],
      11,
    );
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    layers.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mode]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layers.current) return;
    layers.current.clearLayers();
    options.forEach((p) => {
      const active = stops.indexOf(p.id);
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: active >= 0 ? 11 : 7,
        color: "#176b56",
        fillColor: active >= 0 ? "#176b56" : "#fff",
        fillOpacity: 1,
        weight: 2,
      });
      marker
        .bindTooltip(p.name, { permanent: false, direction: "top" })
        .on("click", () => setSelected(p))
        .addTo(layers.current);
    });
    const route = stops
      .map((id) => places.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => [p.lat, p.lng]);
    if (route.length > 1)
      L.polyline(route, {
        color: "#176b56",
        weight: 3,
        dashArray: "7 8",
      }).addTo(layers.current);
    const bounds = route.length ? route : options.map((p) => [p.lat, p.lng]);
    if (bounds.length)
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 11 });
  }, [mode, region, stops.join(",")]);
  function add(id) {
    if (!stops.includes(id)) onChange([...stops, id]);
    setMode("map");
  }
  function choose(id) {
    const p = places.find((p) => p.id === id);
    if (p) {
      setSelected(p);
      setMode("map");
      mapRef.current?.flyTo([p.lat, p.lng], 12);
    }
    setSearch("");
  }
  return (
    <section className="panel route-panel">
      <div className="route-heading">
        <div>
          <h3>Pin a place. Find your next detour.</h3>
          <p className="tiny muted">Click a stop to explore nearby places</p>
        </div>
        <div className="segmented">
          {region === "Himachal" && (
            <button
              className={mode === "preview" ? "selected" : ""}
              onClick={() => setMode("preview")}
            >
              Route preview
            </button>
          )}
          <button
            className={mode === "map" ? "selected" : ""}
            onClick={() => setMode("map")}
          >
            Live map
          </button>
        </div>
      </div>
      <div className="map-search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a place on the map…"
          aria-label="Search curated places"
        />
        {search && (
          <div className="place-results">
            {options
              .filter((p) =>
                p.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((p) => (
                <button key={p.id} onClick={() => choose(p.id)}>
                  {p.name} <small>{p.kind}</small>
                </button>
              ))}
          </div>
        )}
      </div>
      {mode === "preview" ? (
        <div
          className="schematic"
          ref={schematicRef}
          style={{ "--map-scale": scale }}
        >
          <div className="schematic-inner">
            <img
              className="terrain"
              src={asset(images.terrain)}
              alt="Illustrative Manali route, river and roads"
            />
            {[
              { id: "solang", x: 435, y: 40, n: 2 },
              { id: "vashisht", x: 570, y: 150, n: 3 },
              { id: "manali", x: 451, y: 226, n: 1 },
              { id: "naggar", x: 580, y: 335, n: 4 },
            ].map((p) => (
              <button
                key={p.id}
                style={{ left: p.x, top: p.y }}
                className={`schematic-pin ${p.id === "manali" ? "active" : ""}`}
                onClick={() => setSelected(places.find((v) => v.id === p.id))}
              >
                <span>
                  <img
                    src={asset(
                      p.id === "manali" ? images.activePin : images.pin,
                    )}
                    alt=""
                  />
                  <b>{p.n}</b>
                </span>
                <strong>{places.find((v) => v.id === p.id).name}</strong>
              </button>
            ))}
            <small className="map-river">BEAS RIVER</small>
            <small className="map-old">OLD MANALI</small>
          </div>
          <small className="map-caption">
            Illustrative Figma route · switch to live map for your selected
            stops
          </small>
        </div>
      ) : (
        <div
          ref={container}
          className="live-map"
          aria-label="Interactive map of destinations"
        />
      )}
      <div className="nearby">
        <div>
          <h4>Explore around {selected.name}</h4>
          <button
            className="text-button tiny"
            disabled={stops.includes(selected.id)}
            onClick={() => add(selected.id)}
          >
            {stops.includes(selected.id)
              ? "In your route ✓"
              : "+ Add this place"}
          </button>
          <p className="tiny muted">
            Curated nearby highlights · approximate straight-line distance
          </p>
        </div>
        {nearby.map((p) => (
          <div className="nearby-row" key={p.id}>
            <button className="text-button" onClick={() => choose(p.id)}>
              {p.name}
            </button>
            <small>{p.km.toFixed(1)} km</small>
            <button
              className="text-button"
              disabled={stops.includes(p.id)}
              onClick={() => add(p.id)}
            >
              {stops.includes(p.id) ? "Added ✓" : "+ Add"}
            </button>
          </div>
        ))}
        <p className="tiny muted">
          Map lines connect your stops; they are not road directions. Travel
          times and access are confirmed with your trip captain.
        </p>
      </div>
    </section>
  );
}
