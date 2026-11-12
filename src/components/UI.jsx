import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X, ArrowUpRight } from "lucide-react";
import { asset, money } from "../api";
export const Arrow = () => <ArrowUpRight size={16} aria-hidden="true" />;
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Gumshuda Travellers home">
      <strong>
        gumshuda<span>travellers</span>
      </strong>
      <small>TRAVEL, YOUR WAY</small>
    </Link>
  );
}
export function Button({
  children,
  to,
  secondary = false,
  className = "",
  ...props
}) {
  const c = `button ${secondary ? "secondary" : ""} ${className}`;
  return to ? (
    <Link className={c} to={to} {...props}>
      {children}
    </Link>
  ) : (
    <button className={c} {...props}>
      {children}
    </button>
  );
}
export function Intro({ eyebrow, title, children, extra }) {
  return (
    <header className="page-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {extra}
    </header>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const old = document.activeElement;
    ref.current.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      old?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field" {...props}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Notice({ children, error = false }) {
  return children ? (
    <p
      role={error ? "alert" : "status"}
      className={`notice ${error ? "error" : ""}`}
    >
      {children}
    </p>
  ) : null;
}
export function PackageCard({ trip, home = false, onOpen }) {
  return (
    <article className={`package-card ${home ? "home-card" : ""}`}>
      <div className="card-photo">
        <img src={asset(trip.image)} alt={trip.title} loading="lazy" />
        <span className="badge">
          {trip.nights}N / {trip.nights + 1}D
        </span>
      </div>
      <div className="card-content">
        <h3>{home ? trip.homeTitle || trip.title : trip.title}</h3>
        <p className="muted tiny">{trip.route.join(" · ")}</p>
        {!home && (
          <p className="muted tiny inclusions">
            Stay + transfers + local experiences
          </p>
        )}
        <div className="card-bottom">
          <div>
            <strong className="price">{money(trip.price)}</strong>
            <small className="muted"> / person</small>
          </div>
          <button
            className={home ? "text-button" : "button secondary small"}
            onClick={() => onOpen(trip)}
          >
            {home ? "Explore" : "View trip"} <Arrow />
          </button>
        </div>
      </div>
    </article>
  );
}
