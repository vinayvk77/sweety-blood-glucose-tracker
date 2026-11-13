import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const SLOTS = ["Morning (fasting)", "After breakfast", "After lunch", "After dinner"];
const today = new Date().toLocaleDateString("en-CA");

async function request(path, { token, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the API. Start the server and check your PostgreSQL connection.");
  }
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sweety-session")) || null;
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState("login");

  const handleLogin = (nextSession) => {
    localStorage.setItem("sweety-session", JSON.stringify(nextSession));
    setSession(nextSession);
  };
  const handleLogout = () => {
    localStorage.removeItem("sweety-session");
    setSession(null);
  };

  return session
    ? <Dashboard session={session} onLogout={handleLogout} />
    : <AuthScreen mode={authMode} onModeChange={setAuthMode} onLogin={handleLogin} />;
}

function AuthScreen({ mode, onModeChange, onLogin }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await request(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      onLogin(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand"><span className="brand-mark">s</span> sweety</div>
        <div className="intro-copy">
          <span className="eyebrow">YOUR HEALTH, GENTLY TRACKED</span>
          <h1>Small steps.<br />A clearer picture.</h1>
          <p>A calm place to record your glucose readings and understand your day, one number at a time.</p>
        </div>
        <div className="intro-note"><span className="pulse-dot" /> Your health journey, kept private.</div>
        <div className="decorative-orb orb-one" /><div className="decorative-orb orb-two" />
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="mobile-brand"><span className="brand-mark">s</span> sweety</div>
          <span className="eyebrow">{isRegister ? "LET'S GET STARTED" : "WELCOME BACK"}</span>
          <h2>{isRegister ? "Create your account" : "Sign in to Sweety"}</h2>
          <p className="muted">{isRegister ? "Your readings stay yours, always." : "Your daily health snapshot is waiting."}</p>
          {isRegister && (
            <label>Your name
              <input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex Morgan" required />
            </label>
          )}
          <label>Email address
            <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
          </label>
          <label>Password
            <input type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 8 : undefined} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={isRegister ? "At least 8 characters" : "Enter your password"} required />
          </label>
          {error && <div className="alert" role="alert">{error}</div>}
          <button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"} <span aria-hidden="true">→</span></button>
          <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Sweety?"}{" "}
            <button type="button" className="text-button" onClick={() => { onModeChange(isRegister ? "login" : "register"); }}> {isRegister ? "Sign in" : "Create an account"}</button>
          </p>
          <p className="privacy-note">🔒 Your health information is private to your account.</p>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ session, onLogout }) {
  const [date, setDate] = useState(today);
  const [readings, setReadings] = useState([]);
  const [reports, setReports] = useState(null);
  const [reportTab, setReportTab] = useState("daily");
  const [form, setForm] = useState({ slot: SLOTS[0], value: "", id: null });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [readingResult, reportResult] = await Promise.all([
        request(`/readings?date=${encodeURIComponent(date)}`, { token: session.token }),
        request(`/reports?date=${encodeURIComponent(date)}`, { token: session.token }),
      ]);
      setReadings(readingResult.readings);
      setReports(reportResult);
      setError("");
    } catch (err) {
      setError(err.message);
      if (err.message.includes("session has expired")) onLogout();
    }
  }, [date, onLogout, session.token]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedReport = reports?.[reportTab];
  const formattedDate = useMemo(() => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }), [date]);
  const rangeLabel = selectedReport
    ? `${formatDate(selectedReport.startDate)}${selectedReport.startDate !== selectedReport.endDate ? ` – ${formatDate(selectedReport.endDate)}` : ""}`
    : "";

  const submitReading = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await request(form.id ? `/readings/${form.id}` : "/readings", {
        token: session.token,
        method: form.id ? "PUT" : "POST",
        body: JSON.stringify({ date, slot: form.slot, value: form.value }),
      });
      setForm({ slot: SLOTS.find((slot) => !readings.some((reading) => reading.slot === slot)) || SLOTS[0], value: "", id: null });
      setNotice(form.id ? "Reading updated." : "Reading saved.");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const editReading = (reading) => {
    setForm({ slot: reading.slot, value: String(reading.value), id: reading.id });
    setNotice("");
    setError("");
  };

  const deleteReading = async (reading) => {
    if (!window.confirm(`Delete the ${reading.slot} reading?`)) return;
    try {
      await request(`/readings/${reading.id}`, { token: session.token, method: "DELETE" });
      setNotice("Reading deleted.");
      if (form.id === reading.id) setForm({ slot: SLOTS[0], value: "", id: null });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Sweety home"><span className="brand-mark">s</span> sweety</a>
        <div className="topbar-actions"><span className="user-greeting">Hello, {session.user.name.split(" ")[0]}</span><button className="button button-quiet" onClick={onLogout}>Sign out</button></div>
      </header>
      <main className="dashboard">
        <section className="welcome-row">
          <div><span className="eyebrow">YOUR HEALTH OVERVIEW</span><h1>A little check-in, {session.user.name.split(" ")[0]} <span className="wave">✳</span></h1><p className="muted">Every reading helps you see the bigger picture.</p></div>
          <label className="date-picker">Viewing date<input type="date" value={date} max={today} onChange={(e) => { setDate(e.target.value); setForm({ slot: SLOTS[0], value: "", id: null }); }} /></label>
        </section>

        {error && <div className="alert page-alert" role="alert">{error}</div>}
        {notice && !error && <div className="success page-alert" role="status">{notice}</div>}

        <section className="report-section">
          <div className="section-heading"><div><span className="eyebrow">YOUR REPORT</span><h2>{reportTab === "daily" ? formattedDate : reportTab === "monthToDate" ? "Month to date" : "Previous month"}</h2><p className="muted">{rangeLabel || "Loading report…"}</p></div></div>
          <div className="report-tabs" role="tablist" aria-label="Report period">
            {[["daily", "Daily"], ["monthToDate", "Month to date"], ["previousMonth", "Previous month"]].map(([key, label]) => (
              <button key={key} role="tab" aria-selected={reportTab === key} className={reportTab === key ? "report-tab active" : "report-tab"} onClick={() => setReportTab(key)}>{label}</button>
            ))}
          </div>
          {selectedReport?.count
            ? <div className="stats-grid">
                <StatCard label="Highest" value={selectedReport.highest} unit="mg/dL" tone="peach" icon="↗" />
                <StatCard label="Lowest" value={selectedReport.lowest} unit="mg/dL" tone="mint" icon="↘" />
                <StatCard label="Average" value={Number(selectedReport.average).toFixed(1)} unit="mg/dL" tone="lavender" icon="∿" />
                <StatCard label="Readings" value={selectedReport.count} unit={Number(selectedReport.count) === 1 ? "reading" : "readings"} tone="cream" icon="○" />
              </div>
            : selectedReport && <div className="empty-report"><span className="empty-icon">♡</span><strong>No readings for this period yet</strong><span>Add a reading to start building your report.</span></div>}
        </section>

        <section className="lower-grid">
          <div className="panel readings-panel">
            <div className="panel-heading"><div><span className="eyebrow">DAILY LOG</span><h2>Readings</h2></div><span className="count-pill">{readings.length} / 4</span></div>
            {readings.length ? <div className="reading-list">
              {readings.map((reading) => <div className="reading-row" key={reading.id}>
                <div className="slot-mark">{SLOTS.indexOf(reading.slot) + 1}</div><div className="reading-info"><strong>{reading.slot}</strong><span>{formatDate(reading.date)}</span></div>
                <div className="reading-value">{reading.value}<small> mg/dL</small></div>
                <div className="row-actions"><button title="Edit reading" aria-label={`Edit ${reading.slot}`} onClick={() => editReading(reading)}>✎</button><button title="Delete reading" aria-label={`Delete ${reading.slot}`} onClick={() => deleteReading(reading)}>×</button></div>
              </div>)}
            </div> : <div className="empty-log"><span>☼</span><strong>No readings logged for this day</strong><p>When you're ready, add your first reading.</p></div>}
          </div>

          <div className="panel form-panel">
            <div className="panel-heading"><div><span className="eyebrow">{form.id ? "MAKE A CHANGE" : "DAILY CHECK-IN"}</span><h2>{form.id ? "Edit reading" : "Add a reading"}</h2></div><span className="form-sparkle">✳</span></div>
            <form onSubmit={submitReading}>
              <label>Time slot<select value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
                {SLOTS.map((slot) => <option value={slot} key={slot} disabled={!form.id && readings.some((reading) => reading.slot === slot)}>{slot}</option>)}
              </select></label>
              <label>Glucose level <span className="unit-hint">mg/dL</span>
                <div className="value-input-wrap"><input type="number" min="40" max="600" step="1" inputMode="numeric" placeholder="e.g. 110" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /><span>mg/dL</span></div>
                <small className="field-hint">Enter a whole number between 40 and 600.</small>
              </label>
              <button className="button button-primary full-width" disabled={busy || (readings.length >= 4 && !form.id)}>{busy ? "Saving…" : form.id ? "Save changes" : "Save reading"} <span>→</span></button>
              {form.id && <button type="button" className="button button-quiet full-width cancel-edit" onClick={() => setForm({ slot: SLOTS[0], value: "", id: null })}>Cancel editing</button>}
              {readings.length >= 4 && !form.id && <p className="limit-note">You've logged all four readings for this day.</p>}
            </form>
          </div>
        </section>
        <footer className="footer-note">Made for mindful moments <span>·</span> Your readings are private to your account.</footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, unit, tone, icon }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}<small>{unit}</small></div></article>;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default App;
