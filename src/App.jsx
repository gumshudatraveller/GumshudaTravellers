import { useEffect, useState, createContext, useContext } from "react";
import { Routes, Route, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { request, hasAdminBackend as hasBackend, hasSupabase } from "./api";
import { contact } from "../shared/data";
import { Brand, Button, Arrow, Modal, Field, Notice } from "./components/UI";
import Home from "./pages/Home";
import Packages from "./pages/Packages";
import Planner from "./pages/Planner";
import Stories from "./pages/Stories";
import Admin from "./pages/Admin";
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
export default function App() {
  const [user, setUser] = useState(null),
    [login, setLogin] = useState(false),
    [mobile, setMobile] = useState(false);
  const location = useLocation();
  useEffect(() => {
    if (hasBackend)
      request("/auth/me")
        .then(setUser)
        .catch(() => sessionStorage.removeItem("gumshuda-token"));
  }, []);
  useEffect(() => {
    setMobile(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const logout = async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {}
    sessionStorage.removeItem("gumshuda-token");
    setUser(null);
  };
  const auth = { user, setUser, openLogin: () => setLogin(true), logout };
  return (
    <AuthContext.Provider value={auth}>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content").focus();
        }}
      >
        Skip to content
      </a>
      {!location.pathname.startsWith("/admin") && (
        <nav className="navigation">
          <div className="nav-inner">
            <Brand />
            <button
              className="icon-button mobile-toggle"
              aria-label="Toggle navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
            <div className={`nav-links ${mobile ? "open" : ""}`}>
              <NavLink to="/" end>
                Discover
              </NavLink>
              <NavLink to="/packages">Travel packages</NavLink>
              <NavLink to="/planner">Build your trip</NavLink>
              <NavLink to="/stories">Traveler stories</NavLink>
              {user?.role === "admin" && <NavLink to="/admin">Manage packages</NavLink>}
              <button
                className="text-button mobile-auth"
                onClick={user ? logout : () => setLogin(true)}
              >
                {user ? "Log out" : "Log in"}
              </button>
            </div>
            <div className="nav-actions">
              {user ? (
                <button className="text-button" onClick={logout}>
                  Log out
                </button>
              ) : (
                <button className="text-button" onClick={() => setLogin(true)}>
                  Log in
                </button>
              )}
              <Button to="/planner">
                Plan my trip <Arrow />
              </Button>
            </div>
          </div>
        </nav>
      )}
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="*"
            element={
              <div className="container empty">
                <h1>This road takes a detour.</h1>
                <Button to="/">Back to discover</Button>
              </div>
            }
          />
        </Routes>
      </main>
      {!location.pathname.startsWith("/admin") && (
        <footer>
          <div className="container footer-grid">
            <div>
              <Brand />
              <p className="muted tiny">A little further from ordinary.</p>
            </div>
            <div>
              <div className="footer-links">
                <Link to="/packages">Explore packages</Link>
                <Link to="/planner">Build your trip</Link>
                <Link to="/stories">Traveler stories</Link>
              </div>
              <div className="footer-links muted tiny">
                <a href={`tel:${contact.phone.replaceAll(" ", "")}`}>
                  {contact.phone}
                </a>
                <a
                  href={`https://instagram.com/${contact.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{contact.instagram}
                </a>
              </div>
            </div>
            <div className="footer-copy">
              <Link to="/admin">Travel studio ↗</Link>
              <p>
                © {new Date().getFullYear()} Gumshuda Travellers. All journeys
                welcome.
              </p>
            </div>
          </div>
        </footer>
      )}
      {login && <Login onClose={() => setLogin(false)} />}
    </AuthContext.Provider>
  );
}
function Login({ onClose }) {
  const navigate = useNavigate();
  const { setUser } = useAuth(),
    [signup, setSignup] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(e.currentTarget));
      const r = await request(`/auth/${signup ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      sessionStorage.setItem("gumshuda-token", r.token);
      setUser(r.user);
      onClose();
      if (r.user.role === "admin") navigate("/admin");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={signup ? "Start your next chapter" : "Welcome back"}
      onClose={onClose}
    >
      <p className="muted">
        {hasSupabase
          ? "Sign in with your owner account to manage travel packages."
          : "Save your journeys and share the moments that stay with you."}
      </p>
      {!hasBackend ? (
        <Notice>
          Online accounts are coming soon. You can already explore packages,
          plan a trip and enquire on WhatsApp.
        </Notice>
      ) : (
        <form onSubmit={submit} className="stack">
          {signup && (
            <Field label="Your name">
              <input name="name" required maxLength={80} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <input type="email" name="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <input
              type="password"
              name="password"
              required
              minLength={signup ? 12 : undefined}
              maxLength={signup ? 128 : undefined}
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </Field>
          {signup && (
            <small className="muted">Use at least 12 characters.</small>
          )}
          <Notice error>{error}</Notice>
          <Button disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Log in"}{" "}
            <Arrow />
          </Button>
          {!hasSupabase && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setSignup(!signup);
                setError("");
              }}
            >
              {signup
                ? "Already have an account? Log in"
                : "New here? Create an account"}
            </button>
          )}
        </form>
      )}
    </Modal>
  );
}
