"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const WEDDING_DATE = new Date("2026-12-13T12:00:00-06:00");
const MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Ermita+de+la+Santa+Cruz+Antigua+Guatemala";

function Monogram() {
  return (
    <span className="monogram" aria-label="Oliver y Analucía">
      O <i>&</i> A
    </span>
  );
}

function Botanical({ side = "left" }) {
  return (
    <svg
      className={`botanical botanical-${side}`}
      viewBox="0 0 180 340"
      aria-hidden="true"
    >
      <path d="M155 330C130 240 92 145 18 18" />
      <path d="M125 242C92 235 68 214 49 181" />
      <path d="M104 191C111 153 100 121 76 91" />
      <path d="M82 146C52 139 34 120 23 93" />
      <ellipse cx="107" cy="216" rx="25" ry="10" transform="rotate(25 107 216)" />
      <ellipse cx="78" cy="165" rx="23" ry="9" transform="rotate(28 78 165)" />
      <ellipse cx="97" cy="139" rx="9" ry="24" transform="rotate(-31 97 139)" />
      <ellipse cx="49" cy="111" rx="20" ry="8" transform="rotate(31 49 111)" />
      <ellipse cx="61" cy="76" rx="8" ry="21" transform="rotate(-34 61 76)" />
      <circle cx="46" cy="177" r="8" />
      <circle cx="33" cy="162" r="6" />
      <circle cx="24" cy="148" r="5" />
    </svg>
  );
}

function Countdown() {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const update = () => {
      const distance = Math.max(0, WEDDING_DATE.getTime() - Date.now());
      setRemaining({
        días: Math.floor(distance / 86400000),
        horas: Math.floor((distance / 3600000) % 24),
        minutos: Math.floor((distance / 60000) % 60),
        segundos: Math.floor((distance / 1000) % 60),
      });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!remaining) return <div className="countdown-placeholder" />;

  return (
    <div className="countdown" aria-label="Cuenta regresiva">
      {Object.entries(remaining).map(([label, value]) => (
        <div key={label}>
          <strong>{String(value).padStart(2, "0")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function TimelineIcon({ type }) {
  const icons = {
    welcome: "◇",
    ceremony: "♢",
    lunch: "⌁",
    toast: "♧",
    farewell: "✦",
  };
  return <span className="timeline-icon">{icons[type]}</span>;
}

function MusicPlayer({ shouldPlay }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!shouldPlay || !audioRef.current || !available) return;
    audioRef.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [shouldPlay, available]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !available) return;
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seek(event) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = Number(event.target.value);
    setProgress(audio.currentTime);
  }

  return (
    <aside className="music-player" aria-label="Reproductor de música">
      <audio
        ref={audioRef}
        src="/audio/iris.mp3"
        loop
        preload="metadata"
        onLoadedMetadata={(event) => {
          setAvailable(true);
          setDuration(event.currentTarget.duration || 0);
        }}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setAvailable(false)}
      />
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? "Pausar Iris" : "Reproducir Iris"}
      >
        {playing ? "Ⅱ" : "▶"}
      </button>
      <div className="track-info">
        <span>Nuestra canción</span>
        <strong>Iris</strong>
        <small>Goo Goo Dolls</small>
        {available ? (
          <input
            aria-label="Progreso de la canción"
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(progress, duration || 0)}
            onChange={seek}
          />
        ) : (
          <em>Pista pendiente</em>
        )}
      </div>
    </aside>
  );
}

function RsvpForm({ invitationCode }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function submitRsvp(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      invitationCode: invitationCode || form.get("invitationCode"),
      fullName: form.get("fullName"),
      companionNames: form
        .get("companionNames")
        .split("\n")
        .map((name) => name.trim())
        .filter(Boolean),
      attendance: form.get("attendance"),
      dietaryNotes: form.get("dietaryNotes"),
      email: form.get("email"),
    };

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      setStatus(response.ok ? "success" : "error");
      setMessage(result.message);
      if (response.ok) event.currentTarget.reset();
    } catch {
      setStatus("error");
      setMessage("No pudimos registrar tu respuesta. Intenta nuevamente.");
    }
  }

  return (
    <form className="rsvp-form" onSubmit={submitRsvp}>
      {!invitationCode && (
        <label>
          Código de invitación
          <input name="invitationCode" autoComplete="off" required />
        </label>
      )}
      <label>
        Nombre completo
        <input name="fullName" autoComplete="name" required />
      </label>
      <label>
        Correo electrónico
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <fieldset>
        <legend>¿Nos acompañas?</legend>
        <label className="radio">
          <input name="attendance" type="radio" value="yes" required />
          Sí, con mucho gusto
        </label>
        <label className="radio">
          <input name="attendance" type="radio" value="no" required />
          No podré acompañarlos
        </label>
      </fieldset>
      <label>
        Acompañantes indicados en tu invitación
        <textarea
          name="companionNames"
          rows="3"
          placeholder="Un nombre por línea"
        />
      </label>
      <label>
        Restricciones alimentarias
        <input name="dietaryNotes" placeholder="Opcional" />
      </label>
      <button className="button button-light" disabled={status === "loading"}>
        {status === "loading" ? "Enviando..." : "Confirmar asistencia"}
      </button>
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </form>
  );
}

export default function WeddingInvitation() {
  const [opened, setOpened] = useState(false);
  const invitationCode = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("i") || "";
  }, []);

  useEffect(() => {
    document.body.classList.toggle("invitation-open", opened);
    return () => document.body.classList.remove("invitation-open");
  }, [opened]);

  return (
    <main>
      <div className={`envelope-gate ${opened ? "is-open" : ""}`}>
        <div className="envelope-scene">
          <p className="eyebrow">Tenemos algo que celebrar</p>
          <button
            className="envelope"
            onClick={() => setOpened(true)}
            aria-label="Abrir invitación"
          >
            <span className="envelope-back" />
            <span className="letter">
              <small>Una invitación para ti</small>
              <Monogram />
              <em>13 · 12 · 2026</em>
            </span>
            <span className="envelope-front" />
            <span className="envelope-flap" />
            <span className="wax-seal">OA</span>
          </button>
          <button className="open-label" onClick={() => setOpened(true)}>
            Toca para abrir
          </button>
        </div>
      </div>

      <MusicPlayer shouldPlay={opened} />

      <section className="hero">
        <div className="hero-image" />
        <div className="hero-shade" />
        <div className="hero-copy reveal">
          <p className="eyebrow">Nuestra boda</p>
          <h1>
            Oliver <span>&</span> Analucía
          </h1>
          <div className="fine-line" />
          <p className="date-line">13 · DICIEMBRE · 2026</p>
          <p className="place-line">Antigua Guatemala</p>
          <a className="scroll-cue" href="#save-the-date">
            Descubre nuestra invitación
            <i>↓</i>
          </a>
        </div>
      </section>

      <section id="save-the-date" className="section save-date paper">
        <Botanical />
        <Botanical side="right" />
        <p className="eyebrow terracotta">Reserva la fecha</p>
        <h2>Falta muy poco</h2>
        <p className="lead">
          Queremos compartir contigo el comienzo de nuestra aventura más
          importante.
        </p>
        <Countdown />
        <a
          className="button"
          href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Boda%20Oliver%20y%20Analuc%C3%ADa&dates=20261213T180000Z/20261213T230000Z&location=Ermita%20de%20la%20Santa%20Cruz%2C%20Antigua%20Guatemala"
          target="_blank"
          rel="noreferrer"
        >
          Agregar al calendario
        </a>
      </section>

      <section className="section quote-section">
        <div className="quote-card">
          <Monogram />
          <blockquote>
            “Y de pronto, todas las canciones de amor hablaban de nosotros.”
          </blockquote>
          <span className="ornament">✦</span>
        </div>
      </section>

      <section className="section venue paper">
        <div className="venue-art">
          <img
            src="/ermita-watercolor.png"
            alt="Ilustración de la Ermita de la Santa Cruz en Antigua Guatemala"
          />
        </div>
        <div className="venue-copy">
          <p className="eyebrow terracotta">El lugar</p>
          <h2>Ermita de la Santa Cruz</h2>
          <p className="script">Antigua Guatemala</p>
          <p>
            Entre muros centenarios, piedra y cielo abierto, celebraremos
            nuestro sí rodeados de historia.
          </p>
          <div className="venue-details">
            <span>Domingo</span>
            <strong>13</strong>
            <span>Diciembre · 2026</span>
          </div>
          <p className="time">12:00 p. m. — 5:00 p. m.</p>
          <a
            className="button"
            href={MAP_URL}
            target="_blank"
            rel="noreferrer"
          >
            Ver ubicación
          </a>
        </div>
      </section>

      <section className="section itinerary">
        <p className="eyebrow">El gran día</p>
        <h2>Nuestro itinerario</h2>
        <div className="timeline">
          {[
            ["12:00", "Bienvenida", "welcome"],
            ["12:30", "Ceremonia", "ceremony"],
            ["13:30", "Almuerzo", "lunch"],
            ["15:00", "Brindis y celebración", "toast"],
            ["17:00", "Cierre", "farewell"],
          ].map(([time, label, type]) => (
            <div className="timeline-item" key={label}>
              <time>{time}</time>
              <TimelineIcon type={type} />
              <p>{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section details paper">
        <p className="eyebrow terracotta">Algunos detalles</p>
        <h2>Para celebrar juntos</h2>
        <div className="detail-grid">
          <article>
            <span className="detail-number">01</span>
            <h3>Código de vestimenta</h3>
            <p className="script">Formal de día</p>
            <p>
              Traje en tonos neutros o naturales y vestido midi o largo.
              Recomendamos calzado cómodo para piedra y jardín.
            </p>
            <small>
              Reservemos el blanco, marfil y tonos muy claros para la novia.
            </small>
          </article>
          <article>
            <span className="detail-number">02</span>
            <h3>Regalos</h3>
            <p className="script">Lluvia de sobres</p>
            <p>
              Tu presencia es nuestro mejor regalo. Si deseas tener un detalle
              con nosotros, agradeceremos un obsequio en efectivo.
            </p>
          </article>
          <article>
            <span className="detail-number">03</span>
            <h3>Invitación personal</h3>
            <p className="script">Con cariño para ti</p>
            <p>
              Esta invitación es válida únicamente para la persona que la
              recibió y los acompañantes indicados en ella.
            </p>
          </article>
        </div>
        <div className="palette" aria-label="Paleta sugerida">
          <span style={{ background: "#8e4736" }} />
          <span style={{ background: "#b96f55" }} />
          <span style={{ background: "#d8a48f" }} />
          <span style={{ background: "#68715a" }} />
          <span style={{ background: "#a4a48a" }} />
          <span style={{ background: "#e9ddcf" }} />
        </div>
      </section>

      <section className="section rsvp">
        <div className="rsvp-inner">
          <p className="eyebrow">R. S. V. P.</p>
          <h2>Confirma tu asistencia</h2>
          <p>
            Por favor responde antes del <strong>15 de noviembre de 2026</strong>.
          </p>
          <RsvpForm invitationCode={invitationCode} />
        </div>
      </section>

      <footer>
        <Botanical />
        <p>Con amor,</p>
        <h2>Oliver & Analucía</h2>
        <span>13 · 12 · 2026</span>
      </footer>
    </main>
  );
}
