"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const WEDDING_DATE = new Date("2026-12-13T12:00:00-06:00");
const MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=Ermita+de+la+Santa+Cruz+Antigua+Guatemala";
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4IDUiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjUiIGZpbGw9IiNmM2VmZTkiLz48L3N2Zz4=";
const PORTRAIT_PHOTOS = [
  {
    src: "/images/DSC_0084.JPG",
    label: "Retrato 01",
    caption: "Una mirada que se volvió hogar",
  },
  {
    src: "/images/DSC_0052.JPG",
    label: "Retrato 02",
    caption: "Haciendo realidad el sí...",
  },
  {
    src: "/images/DSC_0093.JPG",
    label: "Retrato 03",
    caption: "Nuestro lugar favorito: juntos",
  },
];
const MEMORY_PHOTOS = [
  {
    src: "/images/risas.jpg",
    title: "Risas",
    text: "Para esas fotos espontáneas que cuentan más que mil palabras.",
  },
  {
    src: "/images/viajes.jpg",
    title: "Viajes",
    text: "Pequeñas escapadas, calles nuevas y recuerdos compartidos.",
  },
  {
    src: "/our-story.jpg",
    title: "Promesas",
    text: "Momentos que nos trajeron hasta este capítulo.",
  },
  {
    src: "/images/celebraciones.jpg",
    title: "Celebración",
    text: "Instantes que nos recuerdan que la vida es para disfrutarla juntos.",
  },
];

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
      <ellipse
        cx="107"
        cy="216"
        rx="25"
        ry="10"
        transform="rotate(25 107 216)"
      />
      <ellipse cx="78" cy="165" rx="23" ry="9" transform="rotate(28 78 165)" />
      <ellipse cx="97" cy="139" rx="9" ry="24" transform="rotate(-31 97 139)" />
      <ellipse cx="49" cy="111" rx="20" ry="8" transform="rotate(31 49 111)" />
      <circle cx="46" cy="177" r="8" />
      <circle cx="33" cy="162" r="6" />
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

function MusicPlayer({ shouldPlay }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.72);
  const [compact, setCompact] = useState(false);

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
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function formatTime(value) {
    if (!Number.isFinite(value)) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function changeVolume(nextVolume) {
    setVolume(nextVolume);
    if (audioRef.current) audioRef.current.volume = nextVolume;
  }

  function cycleVolume() {
    if (volume === 0) {
      changeVolume(0.45);
    } else if (volume < 0.7) {
      changeVolume(0.85);
    } else {
      changeVolume(0);
    }
  }

  return (
    <aside
      className={`music-player ${compact ? "is-compact" : ""}`}
      aria-label="Reproductor de música"
    >
      <audio
        ref={audioRef}
        src="/audio/iris.mp3"
        loop
        preload="metadata"
        onLoadedMetadata={(event) => {
          setAvailable(true);
          setDuration(event.currentTarget.duration || 0);
          event.currentTarget.volume = volume;
        }}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setAvailable(false)}
      />
      <div className={`vinyl ${playing ? "spinning" : ""}`}>
        <span>OA</span>
      </div>
      <button
        className="player-toggle"
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? "Pausar Iris" : "Reproducir Iris"}
      >
        {playing ? "Ⅱ" : "▶"}
      </button>
      <div className="track-info">
        <div className="track-heading">
          <div>
            <span>Nuestra canción</span>
            <strong>Iris</strong>
            <small>Goo Goo Dolls</small>
          </div>
          <button
            type="button"
            className="player-collapse"
            onClick={() => setCompact((current) => !current)}
            aria-label={
              compact ? "Expandir reproductor" : "Minimizar reproductor"
            }
          >
            {compact ? "＋" : "−"}
          </button>
        </div>
        {available ? (
          <div className="player-controls">
            <div className="track-progress">
              <input
                aria-label="Progreso de la canción"
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(progress, duration || 0)}
                onChange={(event) => {
                  if (!audioRef.current) return;
                  audioRef.current.currentTime = Number(event.target.value);
                }}
              />
              <small>
                {formatTime(progress)} / {formatTime(duration)}
              </small>
            </div>
            <button
              className="volume-button"
              type="button"
              onClick={cycleVolume}
              aria-label={
                volume === 0
                  ? "Activar volumen"
                  : `Cambiar volumen, nivel ${volume < 0.7 ? "medio" : "alto"}`
              }
            >
              <span aria-hidden="true">
                {volume === 0 ? "♪×" : volume < 0.7 ? "♪" : "♫"}
              </span>
              {volume === 0 ? "Silencio" : volume < 0.7 ? "Medio" : "Alto"}
            </button>
          </div>
        ) : (
          <em>Pista pendiente</em>
        )}
      </div>
    </aside>
  );
}

function greetingFor(invitation) {
  if (!invitation) return "Una invitación para ti";
  if (invitation.invitationType === "family") {
    return `Querida ${invitation.displayName}`;
  }
  const guest =
    invitation.guests.find((person) => person.isPrimary) ||
    invitation.guests[0];
  if (guest?.gender === "female") return `Querida ${guest.fullName}`;
  if (guest?.gender === "male") return `Querido ${guest.fullName}`;
  return `Para ${guest?.fullName || invitation.displayName}`;
}

function getSpecialGuest(invitation) {
  if (!invitation?.guests?.length) return null;
  const hasSpecialRole = (person) => ["female", "male"].includes(person.gender);
  const guest =
    invitation.guests.find(
      (person) => person.isPrimary && hasSpecialRole(person),
    ) || invitation.guests.find(hasSpecialRole);
  if (!guest) return null;

  const isLady = guest.gender === "female";
  return {
    ...guest,
    role: isLady ? "Dama" : "Caballero",
    headline: isLady
      ? "Nuestra boda también lleva tu luz"
      : "Nuestra boda también lleva tu presencia",
    greeting: isLady
      ? `Querida ${guest.fullName}`
      : `Querido ${guest.fullName}`,
    body: isLady
      ? "Queremos que vivas este día desde un lugar muy especial. Tu alegría, tu cariño y tu forma de acompañarnos son parte de los recuerdos que queremos guardar para siempre."
      : "Queremos que vivas este día desde un lugar muy especial. Tu apoyo, tu cariño y tu forma de acompañarnos son parte de los recuerdos que queremos guardar para siempre.",
    closing: isLady
      ? "Gracias por ser una dama en esta historia."
      : "Gracias por ser un caballero en esta historia.",
  };
}

function SpecialGuestLetter({ guest, onClose }) {
  if (!guest) return null;

  return (
    <div
      className={`special-letter-modal ${guest.gender === "female" ? "for-lady" : "for-gentleman"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-letter-title"
    >
      <div className="special-letter-backdrop" onClick={onClose} />
      <article className="special-letter-card">
        <Botanical />
        <Botanical side="right" />
        <button
          className="special-letter-close"
          type="button"
          onClick={onClose}
          aria-label="Cerrar carta especial"
        >
          x
        </button>
        <div className="special-letter-seal">
          <span>{guest.role}</span>
        </div>
        <p className="eyebrow terracotta bold">Una carta especial para ti</p>
        <h2 id="special-letter-title">{guest.greeting}</h2>
        <p className="script">{guest.headline}</p>
        <p>{guest.body}</p>
        <div className="special-letter-role">
          <span>
            Has sido elegid{guest.gender === "female" ? "a" : "o"} como
          </span>
          <strong>{guest.role}</strong>
        </div>
        <p className="special-letter-closing">{guest.closing}</p>
        <button className="button" type="button" onClick={onClose}>
          Ver invitación
        </button>
      </article>
    </div>
  );
}

function RsvpForm({ invitationCode, invitation }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [guestResponses, setGuestResponses] = useState({});

  useEffect(() => {
    if (!invitation?.guests?.length) return;
    const savedResponses = new Map(
      (invitation.rsvp?.guestResponses || []).map((response) => [
        Number(response.invitationGuestId),
        response.attendanceStatus,
      ]),
    );
    setGuestResponses(
      Object.fromEntries(
        invitation.guests.map((guest) => [
          guest.id,
          savedResponses.get(Number(guest.id)) || "attending",
        ]),
      ),
    );
  }, [invitation]);

  function updateGuestResponse(guestId, attendanceStatus) {
    setGuestResponses((current) => ({
      ...current,
      [guestId]: attendanceStatus,
    }));
  }

  async function submitRsvp(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("loading");
    setMessage("");
    const form = new FormData(formElement);
    const payload = {
      invitationCode,
      contactName: form.get("contactName"),
      contactEmail: form.get("contactEmail"),
      contactPhone: form.get("contactPhone"),
      dietaryNotes: form.get("dietaryNotes"),
      guestMessage: form.get("guestMessage"),
      guestResponses: invitation.guests.map((guest) => ({
        invitationGuestId: guest.id,
        attendanceStatus: guestResponses[guest.id] || "not_attending",
      })),
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
    } catch {
      setStatus("error");
      setMessage("No pudimos registrar tu respuesta. Intenta nuevamente.");
    }
  }

  if (!invitationCode || !invitation) {
    return (
      <div className="rsvp-placeholder">
        Abre el enlace personal que recibiste para confirmar tu asistencia.
      </div>
    );
  }

  return (
    <form className="rsvp-form" onSubmit={submitRsvp}>
      {invitation.rsvp && (
        <p className="rsvp-existing">
          Ya tenemos una respuesta guardada para esta invitación. Puedes
          actualizarla aquí.
        </p>
      )}

      <fieldset className="guest-response-list">
        <legend>Confirma cada invitado</legend>
        {invitation.guests.map((guest) => (
          <div className="guest-response-row" key={guest.id}>
            <span>{guest.fullName}</span>
            <div>
              <label
                className={
                  guestResponses[guest.id] === "attending" ? "selected" : ""
                }
              >
                <input
                  name={`guest-${guest.id}`}
                  type="radio"
                  value="attending"
                  checked={guestResponses[guest.id] === "attending"}
                  onChange={() => updateGuestResponse(guest.id, "attending")}
                />
                Asistirá
              </label>
              <label
                className={
                  guestResponses[guest.id] === "not_attending" ? "selected" : ""
                }
              >
                <input
                  name={`guest-${guest.id}`}
                  type="radio"
                  value="not_attending"
                  checked={guestResponses[guest.id] === "not_attending"}
                  onChange={() =>
                    updateGuestResponse(guest.id, "not_attending")
                  }
                />
                No asistirá
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      <label>
        Nombre de contacto
        <input
          name="contactName"
          defaultValue={invitation.rsvp?.contactName || ""}
          autoComplete="name"
          required
        />
      </label>
      <label>
        Correo electrónico de contacto
        <input
          name="contactEmail"
          type="email"
          defaultValue={invitation.rsvp?.contactEmail || ""}
          autoComplete="email"
          required
        />
      </label>
      <label>
        Teléfono de contacto
        <input
          name="contactPhone"
          defaultValue={invitation.rsvp?.contactPhone || ""}
          autoComplete="tel"
          placeholder="Opcional"
        />
      </label>
      <label>
        Restricciones alimentarias
        <input
          name="dietaryNotes"
          defaultValue={invitation.rsvp?.dietaryNotes || ""}
          placeholder="Opcional"
        />
      </label>
      <label>
        Mensaje para los novios
        <textarea
          name="guestMessage"
          defaultValue={invitation.rsvp?.guestMessage || ""}
          rows="3"
          placeholder="Opcional"
        />
      </label>
      <button className="button button-light" disabled={status === "loading"}>
        {status === "loading"
          ? "Guardando respuesta..."
          : invitation.rsvp
            ? "Actualizar respuesta"
            : "Enviar respuesta"}
      </button>
      {message && <p className={`form-message ${status}`}>{message}</p>}
    </form>
  );
}

function ClosedInvitation({ message }) {
  return (
    <main className="closed-invitation">
      <div className="closed-card">
        <Monogram />
        <p className="eyebrow terracotta bold">Invitación no disponible</p>
        <h1>Gracias por visitarnos</h1>
        <p>{message}</p>
        <span>13 · 12 · 2026</span>
      </div>
    </main>
  );
}

export default function WeddingInvitation({ initialCode = "" }) {
  const [opened, setOpened] = useState(false);
  const [specialLetterDismissed, setSpecialLetterDismissed] = useState(false);
  const [invitationCode, setInvitationCode] = useState(initialCode);
  const [invitation, setInvitation] = useState(null);
  const [lookupStatus, setLookupStatus] = useState(
    initialCode ? "loading" : "generic",
  );
  const [lookupMessage, setLookupMessage] = useState("");
  const specialGuest = getSpecialGuest(invitation);
  const showSpecialLetter = opened && specialGuest && !specialLetterDismissed;

  useEffect(() => {
    if (initialCode) return;
    const queryCode =
      new URLSearchParams(window.location.search).get("i") || "";
    if (queryCode) {
      setInvitationCode(queryCode);
      setLookupStatus("loading");
    }
  }, [initialCode]);

  useEffect(() => {
    if (!invitationCode) return;
    let cancelled = false;
    fetch(`/api/invitation?code=${encodeURIComponent(invitationCode)}`)
      .then(async (response) => {
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setLookupStatus(response.status === 410 ? "used" : "invalid");
          setLookupMessage(result.message);
          return;
        }
        setInvitation(result);
        setLookupStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setLookupStatus("invalid");
          setLookupMessage("No pudimos consultar esta invitación.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invitationCode]);

  useEffect(() => {
    document.body.classList.toggle("invitation-open", opened);
    document.body.classList.toggle("envelope-locked", !opened);
    document.body.classList.toggle(
      "special-letter-open",
      Boolean(showSpecialLetter),
    );
    return () => {
      document.body.classList.remove("invitation-open");
      document.body.classList.remove("envelope-locked");
      document.body.classList.remove("special-letter-open");
    };
  }, [opened, showSpecialLetter]);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.14 },
    );
    document.querySelectorAll("[data-reveal]").forEach((element) => {
      revealObserver.observe(element);
    });

    let frame;
    const parallax = () => {
      frame = 0;
      document.querySelectorAll("[data-parallax]").forEach((element) => {
        const speed = Number(element.dataset.parallax || 0.1);
        const rect = element.parentElement.getBoundingClientRect();
        element.style.setProperty(
          "--parallax-y",
          `${(rect.top - window.innerHeight / 2) * speed}px`,
        );
      });
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(parallax);
    };
    parallax();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [lookupStatus]);

  if (lookupStatus === "used") {
    return <ClosedInvitation message={lookupMessage} />;
  }

  return (
    <main>
      <div className={`envelope-gate ${opened ? "is-open" : ""}`}>
        <div className="gate-orbit orbit-one" />
        <div className="gate-orbit orbit-two" />
        <div className="envelope-scene">
          <p className="eyebrow">Tenemos algo que celebrar</p>
          <button
            className="envelope"
            onClick={() => setOpened(true)}
            aria-label="Abrir invitación"
          >
            <span className="envelope-back" />
            <span className="letter">
              <small>{greetingFor(invitation)}</small>
              <Monogram />
              <em>13 · 12 · 2026</em>
              {invitation?.personalizedMessage && (
                <b>{invitation.personalizedMessage}</b>
              )}
            </span>
            <span className="envelope-front envelope-front-left" />
            <span className="envelope-front envelope-front-right" />
            <span className="envelope-bottom" />
            <span className="envelope-flap" />
            <span className="wax-seal">
              <span>OA</span>
            </span>
          </button>
          <button className="open-label" onClick={() => setOpened(true)}>
            <span>Presiona para abrir</span>
          </button>
          {lookupStatus === "loading" && (
            <p className="gate-status">Preparando tu invitación...</p>
          )}
          {lookupStatus === "invalid" && (
            <p className="gate-status error">{lookupMessage}</p>
          )}
        </div>
      </div>

      <SpecialGuestLetter
        guest={showSpecialLetter ? specialGuest : null}
        onClose={() => setSpecialLetterDismissed(true)}
      />

      <MusicPlayer shouldPlay={opened} />

      <section className="hero">
        <div className="hero-image" data-parallax="0.11" />
        <div className="hero-shade" />
        <div className="hero-flower flower-one" data-parallax="-0.08">
          ✦
        </div>
        <div className="hero-flower flower-two" data-parallax="0.14">
          ✦
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Nuestra boda</p>
          {invitation && (
            <p className="personal-welcome">{greetingFor(invitation)}</p>
          )}
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
        <div data-reveal>
          <p className="eyebrow terracotta bold">Reserva la fecha</p>
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
        </div>
      </section>

      <section className="section story-section">
        <div className="story-image-wrap" data-reveal>
          <div className="story-image" data-parallax="0.06" />
          <span className="story-date">Nuestra historia</span>
        </div>
        <div className="story-copy" data-reveal>
          <p className="eyebrow terracotta bold">Un camino compartido</p>
          <h2>Donde todo comienza</h2>
          <p className="script">Dos vidas, una promesa</p>
          <p className="lead-small">
            Entre conversaciones, sueños y pequeños instantes descubrimos que el
            hogar también puede ser una persona. Ahora queremos celebrar contigo
            el siguiente capítulo de nuestra historia.
          </p>
          <div className="story-signature">O & A</div>
        </div>
      </section>

      <section className="section love-portraits paper">
        <div className="portraits-heading" data-reveal>
          <p className="eyebrow terracotta bold">Retratos de nuestro amor</p>
          <h2>Momentos que queremos guardar</h2>
          <p className="lead">
            Un pequeño álbum para llenar con fotografías de nosotros, de los
            días que nos han formado y de los recuerdos que queremos conservar.
          </p>
        </div>
        <div className="portrait-grid">
          {PORTRAIT_PHOTOS.map((photo, index) => (
            <figure className="portrait-card" data-reveal key={photo.label}>
              <div className="portrait-photo">
                <Image
                  src={photo.src}
                  alt={`${photo.label} de Oliver y Analucía`}
                  fill
                  quality={75}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  sizes="(max-width: 640px) 84vw, (max-width: 1024px) 46vw, 30vw"
                />
              </div>
              <figcaption>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <p>{photo.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section quote-section">
        <div className="quote-backdrop" data-parallax="0.08" />
        <div className="quote-card" data-reveal>
          <Monogram />
          <blockquote>
            “Y de pronto, todas las canciones de amor hablaban de nosotros.”
          </blockquote>
          <span className="ornament">✦</span>
        </div>
      </section>

      <section className="section venue paper">
        <div className="venue-art" data-reveal>
          <Image
            src="/ermita-watercolor.png"
            alt="Ilustración de la Ermita de la Santa Cruz en Antigua Guatemala"
            fill
            quality={80}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            sizes="(max-width: 640px) 86vw, (max-width: 1024px) 80vw, 48vw"
          />
        </div>
        <div className="venue-copy" data-reveal>
          <p className="eyebrow terracotta bold">El lugar</p>
          <h2>Ermita de la Santa Cruz</h2>
          <p className="script">Antigua Guatemala</p>
          <p className="lead-small">
            Entre muros centenarios, piedra y cielo abierto, celebraremos
            nuestro sí rodeados de historia.
          </p>
          <div className="venue-details">
            <span>Domingo</span>
            <strong>13</strong>
            <span>Diciembre · 2026</span>
          </div>
          <p className="time">12:00 p. m. — 5:00 p. m.</p>
          <a className="button" href={MAP_URL} target="_blank" rel="noreferrer">
            Ver ubicación
          </a>
        </div>
      </section>

      <section className="section memory-gallery">
        <div className="memory-heading" data-reveal>
          <p className="eyebrow">Nuestro álbum</p>
          <h2>Capítulos en fotografías</h2>
          <p className="lead-small">
            Aquí podremos colocar más recuerdos: viajes, aniversarios, fotos
            favoritas y pequeños instantes que también son parte de esta boda.
          </p>
        </div>
        <div className="memory-grid">
          {MEMORY_PHOTOS.map((memory) => (
            <article className="memory-card" data-reveal key={memory.title}>
              <div className="memory-photo">
                <Image
                  src={memory.src}
                  alt={`Foto para ${memory.title.toLowerCase()}`}
                  fill
                  quality={75}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  sizes="(max-width: 640px) 86vw, (max-width: 1024px) 45vw, 24vw"
                />
              </div>
              <div>
                <h3>{memory.title}</h3>
                <p>{memory.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section guest-guide">
        <div className="mx-auto max-w-6xl" data-reveal>
          <div className="guest-guide-heading">
            <div>
              <p className="eyebrow">Antes de llegar</p>
              <h2>Recomendaciones para disfrutar el día</h2>
            </div>
            <p>
              La celebración comienza al mediodía en una locación histórica y al
              aire libre. Estos detalles harán tu llegada más tranquila.
            </p>
          </div>
          <div className="guest-guide-grid">
            {[
              {
                number: "01",
                title: "Sal con anticipación",
                text: "Los accesos a Antigua suelen tener tránsito durante el fin de semana. Procura estar en el lugar entre 11:30 y 11:45 a. m.",
                note: "La ceremonia iniciará puntualmente.",
              },
              {
                number: "02",
                title: "Planifica el estacionamiento",
                text: "La ermita se encuentra en una zona histórica. Considera parqueos cercanos o transporte compartido para evitar buscar espacio a última hora.",
                note: "Comparte el viaje cuando sea posible.",
              },
              {
                number: "03",
                title: "Elige calzado estable",
                text: "Antigua tiene calles empedradas y el evento incluye áreas de piedra y jardín. Recomendamos zapatos cómodos y de tacón ancho.",
                note: "Evita tacones muy delgados.",
              },
              {
                number: "04",
                title: "Prepárate para el clima",
                text: "En diciembre suele haber sol agradable al mediodía y una tarde más fresca. Lleva protección solar y una prenda ligera.",
                note: "El evento será de día y parcialmente al aire libre.",
              },
              {
                number: "05",
                title: "Hospedaje y regreso",
                text: "Si vienes desde otra ciudad, reservar en Antigua te permitirá disfrutar sin prisas. Organiza con anticipación tu transporte de regreso.",
                note: "Evita conducir si consumes bebidas alcohólicas.",
              },
              {
                number: "06",
                title: "Invitación personal",
                text: "Confirma únicamente a las personas incluidas en este enlace y avísanos con tiempo sobre cualquier restricción alimentaria.",
                note: "Fecha límite: 15 de noviembre.",
              },
            ].map((item) => (
              <article className="guest-guide-card" key={item.number}>
                <span>{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <small>{item.note}</small>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section details paper">
        <div data-reveal>
          <p className="eyebrow terracotta bold">Algunos detalles</p>
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
              <div className="palette">
                {["#8e4736", "#b96f55", "#d8a48f", "#68715a"].map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </div>
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
                Esta invitación es válida para las personas indicadas. El enlace
                se cierra al registrar la respuesta.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section rsvp">
        <div className="rsvp-inner" data-reveal>
          <p className="eyebrow">R. S. V. P.</p>
          <h2>Confirma tu asistencia</h2>
          <p>
            Por favor responde antes del{" "}
            <strong>15 de noviembre de 2026</strong>.
          </p>
          <RsvpForm invitationCode={invitationCode} invitation={invitation} />
        </div>
      </section>

      <footer>
        <Botanical />
        <Botanical side="right" />
        <div className="footer-mark">OA</div>
        <p>Con amor,</p>
        <h2>Oliver & Analucía</h2>
        <span>13 · 12 · 2026 · Antigua Guatemala</span>
        <div className="footer-links">
          <a href={MAP_URL} target="_blank" rel="noreferrer">
            Ubicación
          </a>
          <a href="#save-the-date">Volver al inicio</a>
        </div>
        <small>Hecho para celebrar una historia que apenas comienza.</small>
      </footer>
    </main>
  );
}
