"use client";

import { useCallback, useEffect, useState } from "react";

const emptyGuest = () => ({
  fullName: "",
  ceremonyRole: "none",
});

function Login({ onSuccess }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setMessage(result.message);
      return;
    }
    onSuccess();
  }

  return (
    <main className="admin-login px-4 py-10">
      <section className="admin-login-card w-full">
        <span className="admin-monogram">O & A</span>
        <p className="admin-kicker">Área privada</p>
        <h1>Administración de invitados</h1>
        <p>
          Acceso exclusivo para organizar invitaciones y confirmaciones.
        </p>
        <form onSubmit={submit}>
          <label>
            Correo
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="admin-primary" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
          {message && <p className="admin-error">{message}</p>}
        </form>
      </section>
    </main>
  );
}

function CreateInvitation({ onCreated }) {
  const [invitationType, setInvitationType] = useState("individual");
  const [guests, setGuests] = useState([emptyGuest()]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function updateGuest(index, field, value) {
    setGuests((current) =>
      current.map((guest, guestIndex) =>
        guestIndex === index ? { ...guest, [field]: value } : guest,
      ),
    );
  }

  function changeType(type) {
    setInvitationType(type);
    if (type === "individual") setGuests([guests[0] || emptyGuest()]);
  }

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setStatus("loading");
    setMessage("");
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationType,
        displayName: form.get("displayName"),
        personalizedMessage: form.get("personalizedMessage"),
        guests,
      }),
    });
    const result = await response.json();
    setStatus(response.ok ? "success" : "error");
    setMessage(result.message);
    if (response.ok) {
      formElement.reset();
      setGuests([emptyGuest()]);
      setInvitationType("individual");
      onCreated();
    }
  }

  return (
    <section className="admin-card admin-create">
      <div className="admin-section-heading">
        <div>
          <p className="admin-kicker">Nueva invitación</p>
          <h2>Agregar invitados</h2>
        </div>
        <span className="admin-step">01</span>
      </div>

      <form onSubmit={submit}>
        <div className="admin-type-switch">
          <button
            type="button"
            className={invitationType === "individual" ? "active" : ""}
            onClick={() => changeType("individual")}
          >
            Individual
          </button>
          <button
            type="button"
            className={invitationType === "family" ? "active" : ""}
            onClick={() => changeType("family")}
          >
            Familia o grupo
          </button>
        </div>

        <label>
          Nombre visible de la invitación
          <input
            name="displayName"
            placeholder={
              invitationType === "family"
                ? "Familia Méndez"
                : "María Fernanda López"
            }
            required
          />
        </label>

        <div className="admin-guests-heading">
          <span>Integrantes incluidos</span>
          {invitationType === "family" && (
            <button
              type="button"
              onClick={() => setGuests((current) => [...current, emptyGuest()])}
            >
              + Agregar integrante
            </button>
          )}
        </div>

        <div className="admin-guest-list">
          {guests.map((guest, index) => (
            <div className="admin-guest-row" key={index}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <input
                aria-label={`Nombre del integrante ${index + 1}`}
                value={guest.fullName}
                placeholder="Nombre completo"
                onChange={(event) =>
                  updateGuest(index, "fullName", event.target.value)
                }
                required
              />
              <select
                aria-label={`Rol ceremonial del integrante ${index + 1}`}
                value={guest.ceremonyRole}
                onChange={(event) =>
                  updateGuest(index, "ceremonyRole", event.target.value)
                }
              >
                <option value="none">Sin rol</option>
                <option value="bridesmaid">Dama de boda</option>
                <option value="groomsman">Caballero de boda</option>
              </select>
              {invitationType === "family" && guests.length > 1 && (
                <button
                  className="admin-remove"
                  type="button"
                  aria-label={`Eliminar integrante ${index + 1}`}
                  onClick={() =>
                    setGuests((current) =>
                      current.filter((_, guestIndex) => guestIndex !== index),
                    )
                  }
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <label>
          Mensaje personalizado
          <textarea
            name="personalizedMessage"
            rows="3"
            placeholder="Opcional. Aparecerá al abrir el sobre."
          />
        </label>

        <button className="admin-primary" disabled={status === "loading"}>
          {status === "loading" ? "Creando..." : "Crear invitación"}
        </button>
        {message && (
          <p className={`admin-feedback ${status}`}>{message}</p>
        )}
      </form>
    </section>
  );
}

function InvitationDirectory({ refreshKey }) {
  const [query, setQuery] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [updatingGuestId, setUpdatingGuestId] = useState(null);
  const [message, setMessage] = useState("");

  const loadInvitations = useCallback(async (search = "") => {
    setLoading(true);
    const response = await fetch(
      `/api/admin/invitations?q=${encodeURIComponent(search)}`,
    );
    const result = await response.json();
    setInvitations(response.ok ? result.invitations : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInvitations("");
  }, [loadInvitations, refreshKey]);

  async function copyInvitation(code) {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const invitationUrl = `${baseUrl.replace(/\/$/, "")}/${code}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitationUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = invitationUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(code);
      setMessage("");
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setMessage(`No pudimos copiar el enlace. Puedes copiarlo manualmente: ${invitationUrl}`);
    }
  }

  async function deleteInvitation(invitation) {
    const confirmed = window.confirm(
      `¿Eliminar la invitación de "${invitation.display_name}"?\n\nTambién se eliminarán sus integrantes y cualquier respuesta registrada.`,
    );
    if (!confirmed) return;

    setDeletingId(invitation.id);
    setMessage("");
    const response = await fetch("/api/admin/invitations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: invitation.id }),
    });
    const result = await response.json();
    setDeletingId(null);
    setMessage(result.message);
    if (response.ok) {
      setInvitations((current) =>
        current.filter((item) => item.id !== invitation.id),
      );
    }
  }

  async function updateGuestRole(invitationId, guestId, ceremonyRole) {
    setUpdatingGuestId(guestId);
    setMessage("");
    const response = await fetch("/api/admin/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, ceremonyRole }),
    });
    const result = await response.json();
    setUpdatingGuestId(null);
    setMessage(result.message);

    if (!response.ok) return;

    setInvitations((current) =>
      current.map((invitation) =>
        invitation.id === invitationId
          ? {
              ...invitation,
              guests: invitation.guests.map((guest) =>
                guest.id === guestId ? { ...guest, ceremonyRole } : guest,
              ),
            }
          : invitation,
      ),
    );
  }

  return (
    <section className="admin-card admin-directory">
      <div className="admin-section-heading">
        <div>
          <p className="admin-kicker">Directorio</p>
          <h2>Buscar invitaciones</h2>
        </div>
        <span className="admin-step">02</span>
      </div>

      <form
        className="admin-search"
        onSubmit={(event) => {
          event.preventDefault();
          loadInvitations(query);
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre, familia o código"
        />
        <button type="submit">Buscar</button>
      </form>

      <div className="admin-results">
        {message && <p className="admin-directory-message">{message}</p>}
        {loading && <p className="admin-empty">Consultando invitaciones...</p>}
        {!loading && !invitations.length && (
          <p className="admin-empty">No encontramos invitaciones.</p>
        )}
        {invitations.map((invitation) => (
          <article className="admin-invitation" key={invitation.id}>
            <div className="admin-invitation-main">
              <span
                className={`admin-status ${
                  invitation.rsvpCount ? "answered" : "pending"
                }`}
              >
                {invitation.rsvpCount ? "Con respuestas" : "Pendiente"}
              </span>
              <h3>{invitation.display_name}</h3>
              <p>
                {invitation.invitation_type === "family"
                  ? "Familia o grupo"
                  : invitation.invitation_type === "couple"
                    ? "Pareja"
                    : "Individual"}{" "}
                · {invitation.guests.length} persona(s)
                {invitation.status !== "active" ? ` · ${invitation.status}` : ""}
              </p>
              <div className="admin-member-chips">
                {invitation.guests.map((guest) => (
                  <div className="admin-member-chip" key={guest.id}>
                    <span>
                      {guest.fullName}
                      {guest.attendanceStatus === "attending"
                        ? " · Asistirá"
                        : guest.attendanceStatus === "not_attending"
                          ? " · No asistirá"
                          : ""}
                      {guest.contactEmail ? ` · ${guest.contactEmail}` : ""}
                    </span>
                    <select
                      aria-label={`Rol ceremonial de ${guest.fullName}`}
                      value={guest.ceremonyRole}
                      disabled={updatingGuestId === guest.id}
                      onChange={(event) =>
                        updateGuestRole(
                          invitation.id,
                          guest.id,
                          event.target.value,
                        )
                      }
                    >
                      <option value="none">Sin rol</option>
                      <option value="bridesmaid">Dama de boda</option>
                      <option value="groomsman">Caballero de boda</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="admin-invitation-actions">
              <small>Código interno: {invitation.code}</small>
              <div className="admin-guest-links">
                {invitation.guests.map((guest) => (
                  <button
                    key={guest.id}
                    type="button"
                    disabled={invitation.status !== "active"}
                    onClick={() => copyInvitation(guest.code)}
                  >
                    {copied === guest.code
                      ? "Copiado"
                      : `Copiar link personal: ${guest.fullName}`}
                  </button>
                ))}
              </div>
              <button
                className="admin-delete-button"
                type="button"
                disabled={deletingId === invitation.id}
                onClick={() => deleteInvitation(invitation)}
              >
                {deletingId === invitation.id
                  ? "Eliminando..."
                  : "Eliminar invitación"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AdminPanel({ initialAuthenticated }) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createdMessage, setCreatedMessage] = useState("");

  if (!authenticated) {
    return <Login onSuccess={() => setAuthenticated(true)} />;
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
  }

  return (
    <main className="admin-shell">
      <header className="admin-header sticky top-0 z-20 backdrop-blur-md">
        <div>
          <span className="admin-monogram">O & A</span>
          <p>Panel de invitados</p>
        </div>
        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </header>

      <section className="admin-hero">
        <p className="admin-kicker">Nuestra boda · 13.12.2026</p>
        <h1>Cada invitación,<br />personal y especial.</h1>
        <p>
          Crea grupos, organiza integrantes y consulta sus respuestas desde un
          solo lugar.
        </p>
        {createdMessage && (
          <span className="admin-created-code">
            {createdMessage}
          </span>
        )}
      </section>

      <div className="admin-grid items-start">
        <CreateInvitation
          onCreated={() => {
            setCreatedMessage(
              "Invitación creada. Copia los links personales desde el directorio.",
            );
            setRefreshKey((key) => key + 1);
          }}
        />
        <InvitationDirectory refreshKey={refreshKey} />
      </div>
    </main>
  );
}
