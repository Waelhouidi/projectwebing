(function (global) {
  "use strict";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(date + "T12:00:00"));
  }

  function route(trip) {
    return '<div class="route-line"><span>' + escapeHtml(trip.departure) + '</span><i aria-hidden="true"></i><span>' + escapeHtml(trip.destination) + '</span></div>';
  }

  function tripCard(trip, options) {
    const compact = options && options.compact;
    return '<article class="trip-card">' +
      '<div class="trip-card-top"><span class="date-chip">' + escapeHtml(formatDate(trip.date)) + ' · ' + escapeHtml(trip.time) + '</span><span class="seat-chip">' + escapeHtml(trip.seatsAvailable) + (trip.seatsAvailable === 1 ? ' place' : ' places') + '</span></div>' +
      route(trip) +
      '<div class="trip-card-bottom"><div class="driver-info"><span class="driver-avatar">' + escapeHtml(trip.driver.trim().charAt(0).toUpperCase()) + '</span><span>' + escapeHtml(trip.driver) + '</span></div><strong class="trip-price">' + escapeHtml(trip.price) + '<small> TND</small></strong></div>' +
      '<div class="trip-card-actions"><button class="text-link detail-link" type="button" data-detail="' + escapeHtml(trip.id) + '">Détails</button><a class="button button-small button-primary" href="reserver.html?trip=' + encodeURIComponent(trip.id) + '"' + (compact ? ' aria-label="Réserver le trajet ' + escapeHtml(trip.departure) + ' vers ' + escapeHtml(trip.destination) + '"' : '') + '>Réserver</a></div>' +
      '</article>';
  }

  function renderDetails(trip) {
    return '<span class="eyebrow">Détails du trajet</span><h2 id="dialog-title">' + escapeHtml(trip.departure) + ' <span class="route-arrow">→</span> ' + escapeHtml(trip.destination) + '</h2>' +
      '<div class="detail-facts"><div><span>Date et heure</span><strong>' + escapeHtml(formatDate(trip.date)) + ' · ' + escapeHtml(trip.time) + '</strong></div><div><span>Conducteur</span><strong>' + escapeHtml(trip.driver) + '</strong></div><div><span>Places restantes</span><strong>' + escapeHtml(trip.seatsAvailable) + '</strong></div><div><span>Prix par place</span><strong>' + escapeHtml(trip.price) + ' TND</strong></div></div>' +
      '<div class="detail-notes"><strong>Point de rencontre et conditions</strong><p>' + escapeHtml(trip.notes || "À confirmer avec le conducteur.") + '</p></div>' +
      '<a class="button button-primary" href="reserver.html?trip=' + encodeURIComponent(trip.id) + '">Choisir ce trajet <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>';
  }

  function showFieldErrors(form, errors) {
    form.querySelectorAll(".field-error").forEach(function (element) { element.textContent = ""; });
    form.querySelectorAll("[aria-invalid='true']").forEach(function (element) { element.removeAttribute("aria-invalid"); });
    Object.keys(errors).forEach(function (name) {
      const input = form.elements.namedItem(name);
      const message = form.querySelector('[data-error="' + name + '"]');
      if (input) input.setAttribute("aria-invalid", "true");
      if (message) message.textContent = errors[name];
    });
    const firstInvalid = form.querySelector("[aria-invalid='true']");
    if (firstInvalid) firstInvalid.focus();
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".field-error").forEach(function (element) { element.textContent = ""; });
    form.querySelectorAll("[aria-invalid='true']").forEach(function (element) { element.removeAttribute("aria-invalid"); });
  }

  function showMessage(element, message, type) {
    element.className = "form-feedback " + (type || "");
    element.textContent = message;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    global.clearTimeout(showToast.timeout);
    showToast.timeout = global.setTimeout(function () { toast.classList.remove("is-visible"); }, 3200);
  }

  function emptyMessage(title, text) {
    return '<div class="list-empty"><span class="empty-icon"><i class="fa-solid fa-route" aria-hidden="true"></i></span><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(text) + '</p></div>';
  }

  global.GreenMobility = global.GreenMobility || {};
  global.GreenMobility.View = {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    tripCard: tripCard,
    renderDetails: renderDetails,
    showFieldErrors: showFieldErrors,
    clearFieldErrors: clearFieldErrors,
    showMessage: showMessage,
    showToast: showToast,
    emptyMessage: emptyMessage
  };
}(window));
