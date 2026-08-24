"use client";

import { useCallback, useEffect, useState } from "react";

const emptyGuest = () => ({
  fullName: "",
  ownerSide: "shared",
  ceremonyRole: "none",
});

const ownerSideLabel = {
  bride: "Novia",
  groom: "Novio",
  shared: "Ambos",
};

const defaultStats = {
  totalInvitations: 0,
  totalGuests: 0,
  brideGuests: 0,
  groomGuests: 0,
  sharedGuests: 0,
  attendingGuests: 0,
  declinedGuests: 0,
};

const attendanceLabel = {
  attending: "Asistirá",
  not_attending: "No asistirá",
  pending: "Pendiente",
};

function toNumber(value) {
  return Number(value || 0);
}

function clampPeopleCount(value) {
  const peopleCount = Number(value);
  if (!Number.isInteger(peopleCount)) return null;
  return Math.min(Math.max(peopleCount, 1), 20);
}

function StatCard({ label, value, detail, tone, onClick }) {
  return (
    <button type="button" className={`admin-stat-card ${tone || ""}`} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

function AdminDashboard({ stats, onOpenResponses }) {
  const normalizedStats = { ...defaultStats, ...stats };
  const totalGuests = toNumber(normalizedStats.totalGuests);
  const attendingGuests = toNumber(normalizedStats.attendingGuests);
  const declinedGuests = toNumber(normalizedStats.declinedGuests);
  const pendingGuests = Math.max(totalGuests - attendingGuests - declinedGuests, 0);
  const brideGuests = toNumber(normalizedStats.brideGuests);
  const groomGuests = toNumber(normalizedStats.groomGuests);
  const sharedGuests = toNumber(normalizedStats.sharedGuests);
  const confirmedPercent = totalGuests
    ? Math.round((attendingGuests / totalGuests) * 100)
    : 0;
  const ownerSegments = [
    { key: "bride", label: "Novia", value: brideGuests },
    { key: "groom", label: "Novio", value: groomGuests },
    { key: "shared", label: "Ambos", value: sharedGuests },
  ];

  return (
    <section className="admin-dashboard" aria-label="Estadísticas de invitados">
      <div className="admin-dashboard-heading">
        <div>
          <p className="admin-kicker">Dashboard</p>
          <h2>Resumen de invitados</h2>
        </div>
        <span>{confirmedPercent}% confirmado</span>
      </div>

      <div className="admin-stat-grid">
        <StatCard
          label="Invitados"
          value={totalGuests}
          detail={`${toNumber(normalizedStats.totalInvitations)} invitaciones activas`}
          tone="total"
          onClick={() => onOpenResponses("all")}
        />
        <StatCard
          label="Confirmados"
          value={attendingGuests}
          detail={`${pendingGuests} pendiente(s) · ${declinedGuests} no asistirá(n)`}
          tone="confirmed"
          onClick={() => onOpenResponses("attending")}
        />
        <StatCard
          label="Invitados novia"
          value={brideGuests}
          detail={totalGuests ? `${Math.round((brideGuests / totalGuests) * 100)}% del total` : "Sin datos"}
          tone="bride"
          onClick={() => onOpenResponses("bride")}
        />
        <StatCard
          label="Invitados novio"
          value={groomGuests}
          detail={totalGuests ? `${Math.round((groomGuests / totalGuests) * 100)}% del total` : "Sin datos"}
          tone="groom"
          onClick={() => onOpenResponses("groom")}
        />
      </div>

      <div className="admin-owner-panel">
        <div className="admin-owner-track" aria-hidden="true">
          {ownerSegments.map((segment) => (
            <span
              className={`admin-owner-segment ${segment.key}`}
              key={segment.key}
              style={{
                width: totalGuests
                  ? `${Math.max((segment.value / totalGuests) * 100, segment.value ? 4 : 0)}%`
                  : "0%",
              }}
            />
          ))}
        </div>
        <div className="admin-owner-legend">
          {ownerSegments.map((segment) => (
            <span key={segment.key}>
              <i className={segment.key} />
              {segment.label}: {segment.value}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminResponsesPage({ initialFilter, onBack }) {
  const [sideFilter, setSideFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (["bride", "groom", "shared"].includes(initialFilter)) {
      setSideFilter(initialFilter);
      setAttendanceFilter("all");
      return;
    }

    setSideFilter("all");
    setAttendanceFilter(initialFilter || "all");
  }, [initialFilter]);

  useEffect(() => {
    let active = true;

    async function loadResponses() {
      setLoading(true);
      const response = await fetch("/api/admin/invitations");
      const result = await response.json();
      if (active) {
        setInvitations(response.ok ? result.invitations : []);
        setLoading(false);
      }
    }

    loadResponses();
    return () => {
      active = false;
    };
  }, []);

  const rows = invitations.flatMap((invitation) =>
    invitation.guests.map((guest) => {
      const response =
        (invitation.responses || []).find((item) =>
          item.guestResponses?.some(
            (guestResponse) =>
              Number(guestResponse.invitationGuestId) === Number(guest.id),
          ),
        ) ||
        (invitation.responses || []).find(
          (item) => Number(item.invitationGuestId) === Number(guest.id),
        ) ||
        null;
      const attendanceStatus = response?.guestResponses?.find(
        (guestResponse) =>
          Number(guestResponse.invitationGuestId) === Number(guest.id),
      )?.attendanceStatus || guest.attendanceStatus || "pending";

      return {
        id: `${invitation.id}-${guest.id}`,
        invitation,
        response,
        guest,
        attendanceStatus,
      };
    })
  );

  const filteredRows = rows.filter((row) => {
    if (sideFilter !== "all" && row.guest?.ownerSide !== sideFilter) {
      return false;
    }
    if (attendanceFilter === "attending") return row.attendanceStatus === "attending";
    if (attendanceFilter === "not_attending") return row.attendanceStatus === "not_attending";
    if (attendanceFilter === "pending") return row.attendanceStatus === "pending";
    return true;
  });

  return (
    <section className="admin-responses-page">
      <div className="admin-section-heading">
        <div>
          <p className="admin-kicker">Invitados</p>
          <h2>Lista y confirmaciones</h2>
        </div>
        <button type="button" className="admin-back-button" onClick={onBack}>
          Volver
        </button>
      </div>

      <div className="admin-response-filters">
        {[
          ["all", "Todos"],
          ["bride", "Novia"],
          ["groom", "Novio"],
          ["shared", "Ambos"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={sideFilter === value ? "active" : ""}
            onClick={() => setSideFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-response-filters">
        {[
          ["all", "Todos"],
          ["attending", "Confirmados"],
          ["pending", "Pendientes"],
          ["not_attending", "No asistirán"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={attendanceFilter === value ? "active" : ""}
            onClick={() => setAttendanceFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="admin-empty">Consultando respuestas...</p>}
      {!loading && !filteredRows.length && (
        <p className="admin-empty">Todavía no hay respuestas para esta vista.</p>
      )}

      <div className="admin-response-list">
        {filteredRows.map(({ id, invitation, response, guest, attendanceStatus }) => (
          <article className="admin-response-card" key={id}>
            <div>
              <span className={`admin-status ${attendanceStatus === "attending" ? "answered" : "pending"}`}>
                {attendanceLabel[attendanceStatus] || "Pendiente"}
              </span>
              <h3>{guest?.fullName || invitation.display_name}</h3>
              <p>
                {invitation.display_name} · {ownerSideLabel[guest?.ownerSide] || "Ambos"}
              </p>
            </div>
            <div className="admin-response-contact">
              <strong>{response?.contactName || "Sin respuesta registrada"}</strong>
              {response?.contactEmail && <span>{response.contactEmail}</span>}
              {response?.contactPhone && <span>{response.contactPhone}</span>}
            </div>
            <blockquote>
              {response?.guestMessage || "Sin mensaje de deseo registrado."}
            </blockquote>
          </article>
        ))}
      </div>
    </section>
  );
}

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
  const [peopleCount, setPeopleCount] = useState(1);
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
        peopleCount,
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
      setPeopleCount(1);
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

        <label>
          Personas por invitación
          <input
            min="1"
            max="20"
            name="peopleCount"
            type="number"
            value={peopleCount}
            onChange={(event) => setPeopleCount(event.target.value)}
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
                aria-label={`Pertenece a ${guest.fullName || `integrante ${index + 1}`}`}
                value={guest.ownerSide}
                onChange={(event) =>
                  updateGuest(index, "ownerSide", event.target.value)
                }
              >
                <option value="shared">Ambos</option>
                <option value="bride">Novia</option>
                <option value="groom">Novio</option>
              </select>
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

function InvitationDirectory({ refreshKey, onDataLoaded }) {
  const [query, setQuery] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [updatingGuestId, setUpdatingGuestId] = useState(null);
  const [updatingInvitationId, setUpdatingInvitationId] = useState(null);
  const [peopleCountDrafts, setPeopleCountDrafts] = useState({});
  const [savedInvitationId, setSavedInvitationId] = useState(null);
  const [message, setMessage] = useState("");

  const loadInvitations = useCallback(async (search = "") => {
    setLoading(true);
    const response = await fetch(
      `/api/admin/invitations?q=${encodeURIComponent(search)}`,
    );
    const result = await response.json();
    if (response.ok) {
      setInvitations(result.invitations);
      setPeopleCountDrafts(
        Object.fromEntries(
          result.invitations.map((invitation) => [
            invitation.id,
            String(invitation.people_count || 1),
          ]),
        ),
      );
      onDataLoaded(result.stats || defaultStats);
    } else {
      setInvitations([]);
      setPeopleCountDrafts({});
    }
    setLoading(false);
  }, [onDataLoaded]);

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

  async function updateInvitationPeopleCount(invitationId) {
    const invitation = invitations.find((item) => item.id === invitationId);
    const draftValue =
      peopleCountDrafts[invitationId] ?? String(invitation?.people_count || 1);
    const peopleCount = clampPeopleCount(draftValue);
    if (!peopleCount) {
      setMessage("La cantidad debe estar entre 1 y 20 personas.");
      return;
    }

    if (Number(invitation?.people_count || 1) === peopleCount) {
      setMessage("La cantidad ya está guardada.");
      return;
    }

    setUpdatingInvitationId(invitationId);
    setSavedInvitationId(null);
    setMessage("");
    const response = await fetch("/api/admin/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, peopleCount }),
    });
    const result = await response.json();
    setUpdatingInvitationId(null);
    setMessage(result.message);

    if (!response.ok) return;

    setSavedInvitationId(invitationId);
    setInvitations((current) =>
      current.map((invitation) =>
        invitation.id === invitationId
          ? { ...invitation, people_count: peopleCount }
          : invitation,
      ),
    );
    loadInvitations(query);
  }

  async function updateGuest(invitationId, guestId, field, value) {
    setUpdatingGuestId(guestId);
    setMessage("");
    const response = await fetch("/api/admin/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, [field]: value }),
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
                guest.id === guestId ? { ...guest, [field]: value } : guest,
              ),
            }
          : invitation,
      ),
    );
    if (field === "ownerSide") loadInvitations(query);
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
          placeholder="Nombre, familia, código, novia o novio"
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
                · {invitation.people_count || 1} en estadística
                {invitation.status !== "active" ? ` · ${invitation.status}` : ""}
              </p>
              <div className="admin-people-count">
                <label htmlFor={`people-count-${invitation.id}`}>
                  Personas en estadística
                </label>
                <div>
                  <input
                    id={`people-count-${invitation.id}`}
                    type="number"
                    min="1"
                    max="20"
                    value={peopleCountDrafts[invitation.id] ?? String(invitation.people_count || 1)}
                    disabled={updatingInvitationId === invitation.id}
                    onChange={(event) => {
                      setSavedInvitationId(null);
                      setPeopleCountDrafts((current) => ({
                        ...current,
                        [invitation.id]: event.target.value,
                      }));
                    }}
                  />
                  <button
                    type="button"
                    disabled={
                      updatingInvitationId === invitation.id ||
                      Number(
                        peopleCountDrafts[invitation.id] ??
                          String(invitation.people_count || 1),
                      ) === Number(invitation.people_count || 1)
                    }
                    onClick={() => updateInvitationPeopleCount(invitation.id)}
                  >
                    {updatingInvitationId === invitation.id
                      ? "Guardando..."
                      : "Guardar"}
                  </button>
                </div>
                <small>
                  {savedInvitationId === invitation.id
                    ? "Guardado en la estadística."
                    : "Usa este número para parejas o acompañantes en una sola invitación."}
                </small>
              </div>
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
                      {` · ${ownerSideLabel[guest.ownerSide] || "Ambos"}`}
                      {guest.contactEmail ? ` · ${guest.contactEmail}` : ""}
                    </span>
                    <select
                      aria-label={`Pertenece a ${guest.fullName}`}
                      value={guest.ownerSide}
                      disabled={updatingGuestId === guest.id}
                      onChange={(event) =>
                        updateGuest(
                          invitation.id,
                          guest.id,
                          "ownerSide",
                          event.target.value,
                        )
                      }
                    >
                      <option value="shared">Ambos</option>
                      <option value="bride">Novia</option>
                      <option value="groom">Novio</option>
                    </select>
                    <select
                      aria-label={`Rol ceremonial de ${guest.fullName}`}
                      value={guest.ceremonyRole}
                      disabled={updatingGuestId === guest.id}
                      onChange={(event) =>
                        updateGuest(
                          invitation.id,
                          guest.id,
                          "ceremonyRole",
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
  const [stats, setStats] = useState(defaultStats);
  const [responsesFilter, setResponsesFilter] = useState(null);

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

      <AdminDashboard stats={stats} onOpenResponses={setResponsesFilter} />

      {responsesFilter ? (
        <AdminResponsesPage
          initialFilter={responsesFilter}
          onBack={() => setResponsesFilter(null)}
        />
      ) : (
        <div className="admin-grid items-start">
          <CreateInvitation
            onCreated={() => {
              setCreatedMessage(
                "Invitación creada. Copia los links personales desde el directorio.",
              );
              setRefreshKey((key) => key + 1);
            }}
          />
          <InvitationDirectory refreshKey={refreshKey} onDataLoaded={setStats} />
        </div>
      )}
    </main>
  );
}
