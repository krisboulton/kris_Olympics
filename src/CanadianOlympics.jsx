import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ESPN-style Olympic Dashboard – Medal Alerts + Lower Thirds + 3-Panel Layout

const API_BASE = "https://api.your-backend.com/olympics"; // replace with your live API

/**
 * Pure helpers (exported so they can be unit-tested)
 */
export function computeMedalCount(athletes = []) {
  return athletes.reduce(
    (acc, athlete) => {
      if (athlete?.medal === "gold") acc.gold += 1;
      if (athlete?.medal === "silver") acc.silver += 1;
      if (athlete?.medal === "bronze") acc.bronze += 1;
      acc.total = acc.gold + acc.silver + acc.bronze;
      return acc;
    },
    { gold: 0, silver: 0, bronze: 0, total: 0 }
  );
}

export function computeLiveEventsCount(athletes = []) {
  const isLiveStatus = (status) => {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return (
      s.includes("live") ||
      s.includes("in progress") ||
      s.includes("in-progress") ||
      s.includes("ongoing") ||
      s.includes("underway") ||
      s.includes("running")
    );
  };

  return athletes.reduce((count, athlete) => {
    if (athlete?.isLive === true) return count + 1;
    if (isLiveStatus(athlete?.status)) return count + 1;
    return count;
  }, 0);
}

export function computeStats(athletes = []) {
  const totalAthletes = athletes.length;
  const medalists = athletes.filter((a) => !!a?.medal);
  const medalistsCount = medalists.length;

  const medalsBySport = medalists.reduce((acc, a) => {
    const sport = a?.sport || "Unknown";
    acc[sport] = (acc[sport] || 0) + 1;
    return acc;
  }, {});

  const topSports = Object.entries(medalsBySport)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sport, count]) => ({ sport, count }));

  const medalsByAthlete = medalists.reduce((acc, a) => {
    const name = a?.name || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const topAthletes = Object.entries(medalsByAthlete)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const topAthlete = topAthletes[0] || null;
  const topSport = topSports[0] || null;

  const lower = (v) => String(v || "").toLowerCase();
  const liveNow = athletes
    .filter(
      (a) =>
        a?.isLive === true ||
        lower(a?.status).includes("live") ||
        lower(a?.status).includes("in progress") ||
        lower(a?.status).includes("in-progress") ||
        lower(a?.status).includes("ongoing") ||
        lower(a?.status).includes("underway")
    )
    .slice(0, 12);

  // NOTE: this is "most recent" by array order.
  // If your API provides a timestamp, you should sort by it.
  const recentMedals = medalists.slice(-8).reverse();

  return {
    totalAthletes,
    medalistsCount,
    topSport,
    topAthlete,
    topSports,
    topAthletes,
    liveNow,
    recentMedals,
  };
}

// Build a scrolling ticker from live events + recent medal updates
export function computeTickerMessages(athletes = [], stats) {
  const s = stats || computeStats(athletes);

  const liveMsgs = (s.liveNow || []).map((a) => {
    const sport = a?.sport || "Sport";
    const event = a?.event || "Event";
    const name = a?.name || "Canadian athlete";
    const status = a?.status || (a?.isLive ? "Live" : "In progress");
    const result = a?.result ? ` • ${a.result}` : "";
    return `🔴 LIVE: ${name} — ${sport} (${event}) • ${status}${result}`;
  });

  const medalMsgs = (s.recentMedals || []).slice(0, 5).map((a) => {
    const name = a?.name || "Canadian athlete";
    const sport = a?.sport || "Sport";
    const medal = String(a?.medal || "").toUpperCase();
    return `🏅 MEDAL: ${name} — ${sport} • ${medal}`;
  });

  const fallback = [`🇨🇦 Team Canada live feed active • Updating every 60s`];

  const combined = [...liveMsgs, ...medalMsgs];
  return combined.length ? combined : fallback;
}

// Minimal self-tests (run only when NODE_ENV=test)
/* istanbul ignore next */
if (typeof process !== "undefined" && process?.env?.NODE_ENV === "test") {
  // Medal count tests
  const sample = [
    { medal: "gold" },
    { medal: "silver" },
    { medal: "bronze" },
    { medal: null },
    { medal: "gold" },
  ];
  const m = computeMedalCount(sample);
  console.assert(m.gold === 2, "computeMedalCount gold failed");
  console.assert(m.silver === 1, "computeMedalCount silver failed");
  console.assert(m.bronze === 1, "computeMedalCount bronze failed");
  console.assert(m.total === 4, "computeMedalCount total failed");

  // Live events tests
  const liveSample = [
    { status: "Live" },
    { status: "in progress" },
    { status: "Final" },
    { isLive: true },
    { status: undefined },
  ];
  console.assert(computeLiveEventsCount(liveSample) === 3, "computeLiveEventsCount failed");

  // Stats tests
  const stats = computeStats([
    { name: "A", sport: "S1", medal: "gold" },
    { name: "A", sport: "S1", medal: "silver" },
    { name: "B", sport: "S2" },
    { name: "C", sport: "S2", medal: "bronze" },
  ]);
  console.assert(stats.totalAthletes === 4, "computeStats totalAthletes failed");
  console.assert(stats.medalistsCount === 3, "computeStats medalistsCount failed");
  console.assert(stats.topSport?.sport === "S1" && stats.topSport?.count === 2, "computeStats topSport failed");
  console.assert(stats.topAthlete?.name === "A" && stats.topAthlete?.count === 2, "computeStats topAthlete failed");

  // Ticker tests
  const tickerMsgs = computeTickerMessages(
    [
      { name: "Z", sport: "Hockey", event: "Final", status: "Live", result: "2-1" },
      { name: "Y", sport: "Ski", medal: "gold" },
    ],
    computeStats([
      { name: "Z", sport: "Hockey", event: "Final", status: "Live", result: "2-1" },
      { name: "Y", sport: "Ski", medal: "gold" },
    ])
  );
  console.assert(Array.isArray(tickerMsgs) && tickerMsgs.length >= 1, "computeTickerMessages basic failed");
}

export default function CanadianOlympics() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medalAlert, setMedalAlert] = useState(null);
  const prevMedals = useRef({ gold: 0, silver: 0, bronze: 0 });

  useEffect(() => {
    let isMounted = true;

    async function fetchResults() {
      try {
        const res = await fetch(`${API_BASE}/canada/results`);
        if (!res.ok) throw new Error("Failed to fetch results");
        const data = await res.json();
        if (isMounted) setAthletes(Array.isArray(data?.athletes) ? data.athletes : []);
      } catch (err) {
        if (isMounted) setError(err?.message || String(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchResults();
    const interval = setInterval(fetchResults, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const medalCount = useMemo(() => computeMedalCount(athletes), [athletes]);
  const liveEventsCount = useMemo(() => computeLiveEventsCount(athletes), [athletes]);
  const stats = useMemo(() => computeStats(athletes), [athletes]);

  // Build ticker messages for live score updates
  const tickerMessages = useMemo(() => {
    const liveMsgs = stats.liveNow.map((a) =>
      `${a?.sport}: ${a?.name} — ${a?.event} (${a?.status || "Live"})`
    );
    const medalMsgs = stats.recentMedals.map((a) =>
      `MEDAL: ${a?.name} (${a?.sport}) — ${String(a?.medal || "").toUpperCase()}`
    );
    const base = [...liveMsgs, ...medalMsgs];
    return base.length ? base : ["No live score updates at the moment"]; 
  }, [stats.liveNow, stats.recentMedals]);

  // Detect new medals and trigger alert
  useEffect(() => {
    const medalIncreased =
      medalCount.gold > prevMedals.current.gold ||
      medalCount.silver > prevMedals.current.silver ||
      medalCount.bronze > prevMedals.current.bronze;

    if (medalIncreased) {
      const latest = [...athletes].reverse().find((a) => a?.medal);
      if (latest) {
        setMedalAlert(latest);
        const t = setTimeout(() => setMedalAlert(null), 6000);
        return () => clearTimeout(t);
      }
    }

    prevMedals.current = medalCount;
  }, [medalCount, athletes]);

  const MedalTile = ({ label, value, color, emoji }) => (
    <motion.div
      key={`${label}-${value}`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`px-8 py-5 rounded-2xl bg-black/40 backdrop-blur border ${color} shadow-2xl`}
    >
      <p className="uppercase tracking-widest text-sm">
        {emoji} {label}
      </p>
      <motion.p
        key={value}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-5xl font-extrabold"
      >
        {value}
      </motion.p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900 text-white p-6 transition-all relative overflow-hidden">
      {/* OLYMPIC + CANADIAN MAPLE BACKGROUND WATERMARKS */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10 bg-no-repeat bg-center bg-contain"
        style={{
          backgroundImage:
            "url('https://upload.wikimedia.org/wikipedia/commons/5/5c/Olympic_rings_without_rims.svg')",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] bg-no-repeat bg-center bg-contain"
        style={{
          backgroundImage: "url('https://upload.wikimedia.org/wikipedia/commons/d/d9/Maple_Leaf.svg')",
        }}
      />

      {/* FULL SCREEN MEDAL ALERT */}
      <AnimatePresence>
        {medalAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
              <p className="text-red-600 uppercase tracking-widest mb-4">Medal Alert</p>
              <h1 className="text-7xl font-black mb-2">{medalAlert.name}</h1>
              <p className="text-3xl text-gray-300 mb-4">
                {medalAlert.sport} – {medalAlert.event}
              </p>
              <p className="text-5xl font-extrabold text-yellow-400">
                🏅 {String(medalAlert.medal || "").toUpperCase()} MEDAL
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-10 relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-6xl font-black tracking-tight">TEAM CANADA</h1>
            <p className="text-red-500 uppercase tracking-widest text-sm">Olympic Command Center</p>
          </div>

          {/* Live events counter */}
          <motion.div
            key={liveEventsCount}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="px-4 py-2 rounded-xl bg-black/40 backdrop-blur border border-white/10 shadow-lg"
            title="Number of events currently in progress"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <p className="text-xs uppercase tracking-widest text-gray-300">Live events</p>
              <p className="text-lg font-extrabold">{liveEventsCount}</p>
            </div>
          </motion.div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6">
          <MedalTile label="Gold" value={medalCount.gold} color="border-yellow-400" emoji="🥇" />
          <MedalTile label="Silver" value={medalCount.silver} color="border-gray-300" emoji="🥈" />
          <MedalTile label="Bronze" value={medalCount.bronze} color="border-orange-400" emoji="🥉" />
          <MedalTile label="Total" value={medalCount.total} color="border-red-500" emoji="🏆" />
        </div>
      </header>

      {loading && <p className="text-center animate-pulse">Syncing live feeds…</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      {/* LOWER HALF – 3 PANEL LAYOUT */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 relative">
        {/* PANEL 1 – Live / Active Events */}
        <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 shadow-xl">
          <h3 className="text-sm uppercase tracking-widest text-gray-300 mb-3">Live / Active Events</h3>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {stats.liveNow.map((athlete, index) => (
              <div key={athlete?.id ?? `live-${index}`} className="p-3 rounded-xl bg-black/40 border border-white/10">
                <p className="font-bold">{athlete?.name}</p>
                <p className="text-xs text-gray-400">
                  {athlete?.sport} — {athlete?.event}
                </p>
                <p className="text-xs text-red-400 mt-1">{athlete?.status || "Live"}</p>
              </div>
            ))}
            {liveEventsCount === 0 && <p className="text-sm text-gray-400">No live Canadian events at the moment</p>}
          </div>
        </div>

        {/* PANEL 2 – Key Stats */}
        <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 shadow-xl flex flex-col justify-center">
          <h3 className="text-sm uppercase tracking-widest text-gray-300 mb-6">Key Stats</h3>
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Athletes</p>
              <p className="text-4xl font-extrabold">{stats.totalAthletes}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Live Events</p>
              <p className="text-4xl font-extrabold text-red-400">{liveEventsCount}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-widest text-gray-400">Top Sport</p>
              <p className="text-3xl font-extrabold">{stats.topSport ? stats.topSport.sport : "—"}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats.topSport ? `${stats.topSport.count} medal result(s)` : "No medal results yet"}
              </p>
            </div>
          </div>
        </div>

        {/* PANEL 3 – Medal Winners */}
        <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4 shadow-xl">
          <h3 className="text-sm uppercase tracking-widest text-gray-300 mb-3">Medal Winners</h3>

          {/* Most recent medal winner (hero) */}
          {stats.recentMedals[0] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl overflow-hidden bg-black/50 border border-white/10"
            >
              <div className="relative">
                <img
                  src={
                    stats.recentMedals[0]?.photoUrl ||
                    stats.recentMedals[0]?.image ||
                    "https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg"
                  }
                  alt={stats.recentMedals[0]?.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              <div className="p-3">
                <p className="text-xs uppercase tracking-widest text-red-400">Most Recent Medal</p>
                <p className="text-lg font-extrabold">{stats.recentMedals[0]?.name}</p>
                <p className="text-sm text-gray-300">
                  {stats.recentMedals[0]?.sport} — {stats.recentMedals[0]?.event}
                </p>
                <p className="mt-1 text-sm font-extrabold text-yellow-400">
                  🏅 {String(stats.recentMedals[0]?.medal || "").toUpperCase()}
                </p>
              </div>
            </motion.div>
          )}

          {/* Other medal winners */}
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {stats.recentMedals.slice(1).map((athlete, index) => (
              <div
                key={athlete?.id ?? `medal-${athlete?.name ?? "ath"}-${index}`}
                className="p-3 rounded-xl bg-black/40 border border-white/10"
              >
                <p className="font-bold">{athlete?.name}</p>
                <p className="text-xs text-gray-400">
                  {athlete?.sport} — {athlete?.event}
                </p>
                <p className="text-sm mt-1 font-extrabold text-yellow-400">
                  🏅 {String(athlete?.medal).toUpperCase()}
                </p>
              </div>
            ))}

            {medalCount.total === 0 && <p className="text-sm text-gray-400">No medals yet</p>}
          </div>
        </div>
      </div>

      {/* LIVE SCROLLING TICKER – FIXED BOTTOM */}
      {/* LIVE SCROLLING TICKER – FIXED BOTTOM (LARGER) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden border-t border-white/10 bg-black/80 backdrop-blur">
        <motion.div
          className="flex whitespace-nowrap gap-16 py-4 px-6"
          animate={{ x: ["100%", "-100%"] }}
          transition={{ repeat: Infinity, duration: 26, ease: "linear" }}
        >
          {tickerMessages.map((msg, idx) => (
            <React.Fragment key={`ticker-frag-${idx}`}>
              <span
                className="text-lg md:text-xl uppercase tracking-widest font-semibold text-gray-100"
              >
                {msg}
              </span>
              {idx < tickerMessages.length - 1 && (
                <span
                  className="mx-6 text-red-500 text-2xl leading-none"
                  aria-hidden
                >
                  🍁
                </span>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      <footer className="mt-12 mb-12 text-center text-xs text-gray-500 relative">
        Live Olympic Feeds • Broadcast Alert System • Team Canada
      </footer>
    </div>
  );
}
