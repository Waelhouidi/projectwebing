(function (global) {
  "use strict";

  const Model = global.GreenMobility.Model;
  const View = global.GreenMobility.View;
  const CO2_PER_KM = 0.12;

  function setNavigation(page) {
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    });
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.getElementById("site-nav");
    if (toggle && nav) toggle.addEventListener("click", function () {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });
  }

  function wireDetails(container) {
    container.addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-detail]");
      if (!trigger) return;
      const trip = Model.getTrips().find(function (item) { return item.id === trigger.dataset.detail; });
      if (!trip) {
        View.showToast("Ce trajet n’est plus disponible.");
        return;
      }
      const dialog = document.getElementById("trip-dialog");
      document.getElementById("trip-detail").innerHTML = View.renderDetails(trip);
      dialog.showModal();
    });
  }

  function initHome() {
    const trips = Model.getTrips().filter(function (trip) { return Model.isFuture(trip) && trip.seatsAvailable > 0; });
    const bookings = Model.getBookings().filter(function (booking) { return !booking.cancelled; });
    const stats = {
      trips: trips.length,
      seats: trips.reduce(function (sum, trip) { return sum + trip.seatsAvailable; }, 0),
      co2: Math.round(bookings.reduce(function (sum, booking) {
        const trip = Model.getTrips().find(function (item) { return item.id === booking.tripId; });
        return sum + (trip ? trip.distanceKm * CO2_PER_KM * booking.seats : 0);
      }, 0))
    };
    document.querySelectorAll("[data-stat]").forEach(function (element) {
      element.textContent = String(stats[element.dataset.stat]);
    });
    const container = document.getElementById("featured-trips");
    if (!trips.length) {
      container.innerHTML = View.emptyMessage("Les prochains trajets se préparent.", "Revenez bientôt ou publiez le premier trajet.");
      return;
    }
    let position = 0;
    function render() {
      const visible = [];
      for (let index = 0; index < Math.min(3, trips.length); index += 1) visible.push(trips[(position + index) % trips.length]);
      container.innerHTML = visible.map(function (trip) { return View.tripCard(trip, { compact: true }); }).join("");
    }
    render();
    document.querySelectorAll("[data-carousel]").forEach(function (button) {
      button.addEventListener("click", function () {
        position = (position + (button.dataset.carousel === "next" ? 1 : trips.length - 1)) % trips.length;
        render();
      });
    });
    wireDetails(container);
  }

  function initSearch() {
    const container = document.getElementById("trip-results");
    const fields = {
      departure: document.getElementById("filter-departure"),
      destination: document.getElementById("filter-destination"),
      date: document.getElementById("filter-date"),
      price: document.getElementById("filter-price"),
      sort: document.getElementById("sort-by")
    };
    const count = document.getElementById("results-count");
    const empty = document.getElementById("empty-results");
    function render() {
      const departure = fields.departure.value.trim().toLocaleLowerCase("fr");
      const destination = fields.destination.value.trim().toLocaleLowerCase("fr");
      const maxPrice = fields.price.value === "" ? Infinity : Number(fields.price.value);
      const results = Model.getTrips().filter(function (trip) {
        return Model.isFuture(trip) && trip.seatsAvailable > 0 &&
          trip.departure.toLocaleLowerCase("fr").includes(departure) &&
          trip.destination.toLocaleLowerCase("fr").includes(destination) &&
          (!fields.date.value || trip.date === fields.date.value) &&
          trip.price <= maxPrice;
      }).sort(function (a, b) {
        return fields.sort.value === "price" ? a.price - b.price || a.date.localeCompare(b.date) : a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
      });
      count.textContent = results.length + (results.length === 1 ? " trajet disponible" : " trajets disponibles");
      container.innerHTML = results.map(function (trip) { return View.tripCard(trip); }).join("");
      empty.hidden = results.length > 0;
      container.hidden = results.length === 0;
    }
    Object.keys(fields).forEach(function (key) { fields[key].addEventListener(key === "sort" ? "change" : "input", render); });
    function reset() {
      fields.departure.value = "";
      fields.destination.value = "";
      fields.date.value = "";
      fields.price.value = "";
      fields.sort.value = "date";
      render();
    }
    document.getElementById("reset-filters").addEventListener("click", reset);
    document.getElementById("empty-reset").addEventListener("click", reset);
    wireDetails(container);
    const dialog = document.getElementById("trip-dialog");
    dialog.querySelector(".dialog-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    render();
  }

  function readOffer(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = {};
    ["driver", "email", "departure", "destination", "date", "time"].forEach(function (name) {
      if (!String(data[name] || "").trim()) errors[name] = "Ce champ est obligatoire.";
    });
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Saisissez une adresse email valide.";
    if (data.departure && data.destination && data.departure.trim().toLocaleLowerCase("fr") === data.destination.trim().toLocaleLowerCase("fr")) errors.destination = "Choisissez une destination différente du départ.";
    if (data.date && data.time && new Date(data.date + "T" + data.time) <= new Date()) errors.date = "Choisissez une date et une heure futures.";
    const seats = Number(data.seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > 4) errors.seats = "Choisissez entre 1 et 4 places.";
    const price = Number(data.price);
    if (data.price === "" || !Number.isFinite(price) || price < 0 || price > 1000) errors.price = "Saisissez un prix entre 0 et 1 000 TND.";
    return {
      errors: errors,
      value: {
        driver: String(data.driver || "").trim(),
        email: String(data.email || "").trim(),
        departure: String(data.departure || "").trim(),
        destination: String(data.destination || "").trim(),
        date: data.date,
        time: data.time,
        seatsAvailable: seats,
        price: price,
        notes: String(data.notes || "").trim()
      }
    };
  }

  function initOffer() {
    const form = document.getElementById("offer-form");
    const feedback = document.getElementById("offer-feedback");
    const params = new URLSearchParams(global.location.search);
    const editId = params.get("edit");
    let editingTrip = null;
    if (editId) {
      editingTrip = Model.getTrips().find(function (trip) { return trip.id === editId && trip.createdBy === "user"; });
      if (!editingTrip) {
        View.showMessage(feedback, "Cette offre n’est pas disponible pour modification.", "error");
        form.hidden = true;
        return;
      }
      ["driver", "email", "departure", "destination", "date", "time", "price", "notes"].forEach(function (name) {
        form.elements.namedItem(name).value = editingTrip[name] || "";
      });
      form.elements.namedItem("seats").value = editingTrip.seatsTotal;
      document.querySelector(".page-heading h1").textContent = "Modifiez votre trajet.";
      form.querySelector("[type='submit']").innerHTML = "Enregistrer les modifications <i class=\"fa-solid fa-arrow-right\" aria-hidden=\"true\"></i>";
    }
    const dateInput = form.elements.namedItem("date");
    dateInput.min = new Date().toISOString().slice(0, 10);
    const preview = document.getElementById("offer-preview");
    function renderPreview() {
      const departure = form.elements.namedItem("departure").value.trim();
      const destination = form.elements.namedItem("destination").value.trim();
      const date = dateInput.value;
      const time = form.elements.namedItem("time").value;
      const driver = form.elements.namedItem("driver").value.trim();
      const seats = form.elements.namedItem("seats").value;
      const price = form.elements.namedItem("price").value;
      const notes = form.elements.namedItem("notes").value.trim();
      preview.hidden = !(departure || destination || driver || date || price || notes);
      document.getElementById("preview-route").textContent = (departure || "Départ") + " → " + (destination || "Destination");
      document.getElementById("preview-driver").textContent = driver || "Conducteur";
      document.getElementById("preview-date").textContent = date ? View.formatDate(date) + (time ? " · " + time : "") : "Date et heure";
      document.getElementById("preview-seats").textContent = seats ? seats + (Number(seats) > 1 ? " places" : " place") : "Places disponibles";
      document.getElementById("preview-price").textContent = price !== "" ? price + " TND / place" : "Prix par place";
      document.getElementById("preview-notes").textContent = notes;
    }
    renderPreview();
    form.addEventListener("input", function (event) {
      const feedbackElement = document.getElementById("offer-feedback");
      if (feedbackElement.classList.contains("error")) feedbackElement.textContent = "";
      const error = form.querySelector('[data-error="' + event.target.name + '"]');
      if (error) error.textContent = "";
      event.target.removeAttribute("aria-invalid");
      renderPreview();
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const parsed = readOffer(form);
      View.showFieldErrors(form, parsed.errors);
      if (Object.keys(parsed.errors).length) {
        View.showMessage(feedback, "Vérifiez les champs signalés avant de continuer.", "error");
        return;
      }
      try {
        const trip = editingTrip ? Model.updateOffer(editingTrip.id, parsed.value) : Model.createOffer(parsed.value);
        form.reset();
        renderPreview();
        const heading = editingTrip ? "Modifications enregistrées." : "Votre trajet est publié.";
        View.showMessage(feedback, heading + " Référence : " + trip.reference + ". Retrouvez-le dans « Mes trajets ». Cette offre reste locale à votre navigateur.", "success");
        View.clearFieldErrors(form);
        if (editingTrip) {
          form.hidden = true;
          document.querySelector(".page-heading h1").textContent = "Trajet modifié.";
        }
      } catch (error) {
        View.showMessage(feedback, error.message, "error");
      }
    });
  }

  function initBooking() {
    const params = new URLSearchParams(global.location.search);
    const tripId = params.get("trip");
    const tripContainer = document.getElementById("booking-trip");
    const summaryRoute = document.getElementById("summary-route");
    const unit = document.getElementById("summary-unit");
    const total = document.getElementById("summary-total");
    const quantity = document.getElementById("booking-seats");
    const formWrap = document.getElementById("booking-form-wrap");
    const form = document.getElementById("booking-form");
    const feedback = document.getElementById("booking-feedback");
    let trip = Model.getTrips().find(function (item) { return item.id === tripId; });
    if (!trip || !Model.isFuture(trip) || trip.seatsAvailable < 1) {
      tripContainer.innerHTML = '<div class="empty-state"><span class="empty-icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span><h2>Choisissez un trajet disponible</h2><p>Ce trajet est introuvable, complet ou déjà passé.</p><a class="button button-primary" href="rechercher.html">Rechercher un trajet</a></div>';
      return;
    }

    function updateSummary() {
      const places = Number(quantity.value);
      total.textContent = (trip.price * places).toFixed(2) + " TND";
    }
    tripContainer.innerHTML = '<article class="selected-trip-card"><span class="eyebrow">Votre trajet</span><div class="selected-route">' + View.escapeHtml(trip.departure) + '<span>→</span>' + View.escapeHtml(trip.destination) + '</div><div class="selected-facts"><span>' + View.escapeHtml(View.formatDate(trip.date)) + ' à ' + View.escapeHtml(trip.time) + '</span><span>Conducteur : ' + View.escapeHtml(trip.driver) + '</span><span>' + View.escapeHtml(trip.seatsAvailable) + ' places restantes</span></div><div class="detail-notes"><strong>Point de rencontre et conditions</strong><p>' + View.escapeHtml(trip.notes || "À confirmer avec le conducteur.") + '</p></div></article>';
    summaryRoute.innerHTML = '<strong>' + View.escapeHtml(trip.departure) + ' → ' + View.escapeHtml(trip.destination) + '</strong><span>' + View.escapeHtml(View.formatDate(trip.date)) + ' · ' + View.escapeHtml(trip.time) + '</span>';
    unit.textContent = trip.price + " TND";
    quantity.disabled = false;
    quantity.innerHTML = Array.from({ length: trip.seatsAvailable }, function (_, index) {
      return '<option value="' + (index + 1) + '">' + (index + 1) + (index === 0 ? " place" : " places") + "</option>";
    }).join("");
    quantity.addEventListener("change", updateSummary);
    updateSummary();
    formWrap.hidden = false;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const errors = {};
      ["firstName", "lastName", "email", "phone"].forEach(function (name) {
        if (!String(data[name] || "").trim()) errors[name] = "Ce champ est obligatoire.";
      });
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Saisissez une adresse email valide.";
      if (data.phone && !/^[+\d][\d\s().-]{5,22}$/.test(data.phone.trim())) errors.phone = "Saisissez un numéro de téléphone valide.";
      View.showFieldErrors(form, errors);
      if (Object.keys(errors).length) {
        View.showMessage(feedback, "Vérifiez les champs signalés.", "error");
        return;
      }
      try {
        const booking = Model.makeBooking({
          tripId: trip.id,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          seats: Number(quantity.value)
        });
        form.reset();
        form.hidden = true;
        View.showMessage(feedback, "Réservation confirmée en simulation. Référence : " + booking.reference + ". Aucun paiement n’a été effectué.", "success");
        View.showToast("Réservation enregistrée sur cet appareil.");
        trip = Model.getTrips().find(function (item) { return item.id === trip.id; });
        document.querySelector(".selected-facts").lastElementChild.textContent = trip.seatsAvailable + " places restantes";
      } catch (error) {
        View.showMessage(feedback, error.message, "error");
      }
    });
  }

  function initMine() {
    const bookingsHost = document.getElementById("my-bookings");
    const offersHost = document.getElementById("my-offers");
    function render() {
      const trips = Model.getTrips();
      const allBookings = Model.getBookings();
      const bookings = allBookings.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
      const active = bookings.filter(function (booking) { return !booking.cancelled; });
      const spent = active.reduce(function (sum, booking) { return sum + booking.price * booking.seats; }, 0);
      const co2 = active.reduce(function (sum, booking) {
        const trip = trips.find(function (item) { return item.id === booking.tripId; });
        return sum + (trip ? trip.distanceKm * CO2_PER_KM * booking.seats : 0);
      }, 0);
      document.getElementById("my-trip-count").textContent = String(active.length);
      document.getElementById("my-spending").textContent = spent.toFixed(2) + " TND";
      document.getElementById("my-co2").textContent = co2.toFixed(1) + " kg";
      document.getElementById("booking-count").textContent = String(bookings.length);
      bookingsHost.innerHTML = bookings.length ? bookings.map(function (booking) {
        const trip = trips.find(function (item) { return item.id === booking.tripId; });
        const tripDetails = trip || booking;
        const hasDate = Boolean(tripDetails.date);
        const upcoming = hasDate && Model.isFuture(tripDetails);
        return '<article class="my-trip-card"><div class="my-trip-main"><div class="my-trip-route"><strong>' + View.escapeHtml(tripDetails.departure || "Trajet retiré") + ' <span>→</span> ' + View.escapeHtml(tripDetails.destination || "") + '</strong><span>' + View.escapeHtml(hasDate ? View.formatDate(tripDetails.date) + " · " + (tripDetails.time || "") : "Indisponible") + '</span></div><span class="status-badge ' + (booking.cancelled ? "status-muted" : "status-green") + '">' + (booking.cancelled ? "Annulée" : (upcoming ? "À venir" : "Terminée")) + '</span></div><div class="my-trip-meta"><span>' + View.escapeHtml(booking.seats) + (booking.seats > 1 ? " places" : " place") + ' · ' + View.escapeHtml((booking.price * booking.seats).toFixed(2)) + ' TND</span><span>Réf. ' + View.escapeHtml(booking.reference) + '</span></div>' + (!booking.cancelled && upcoming ? '<button class="text-link destructive-link" type="button" data-cancel-booking="' + View.escapeHtml(booking.id) + '">Annuler la réservation</button>' : "") + '</article>';
      }).join("") : View.emptyMessage("Pas encore de réservation.", "Les trajets que vous réservez apparaîtront ici.");

      const offers = trips.filter(function (trip) { return trip.createdBy === "user"; }).sort(function (a, b) { return a.date.localeCompare(b.date); });
      offersHost.innerHTML = offers.length ? offers.map(function (trip) {
        return '<article class="my-trip-card"><div class="my-trip-main"><div class="my-trip-route"><strong>' + View.escapeHtml(trip.departure) + ' <span>→</span> ' + View.escapeHtml(trip.destination) + '</strong><span>' + View.escapeHtml(View.formatDate(trip.date)) + ' · ' + View.escapeHtml(trip.time) + '</span></div><span class="status-badge ' + (trip.seatsAvailable ? "status-green" : "status-muted") + '">' + View.escapeHtml(trip.seatsAvailable) + ' place(s) libre(s)</span></div><div class="my-trip-meta"><span>' + View.escapeHtml(trip.price) + ' TND / place</span><span>Réf. ' + View.escapeHtml(trip.reference) + '</span></div><div class="offer-actions"><a class="text-link" href="proposer.html?edit=' + encodeURIComponent(trip.id) + '">Modifier</a><button class="text-link destructive-link" type="button" data-remove-offer="' + View.escapeHtml(trip.id) + '">Retirer</button></div></article>';
      }).join("") : View.emptyMessage("Aucune offre publiée.", "Proposez une place libre dans votre prochain trajet.");
    }
    document.addEventListener("click", function (event) {
      const cancel = event.target.closest("[data-cancel-booking]");
      const remove = event.target.closest("[data-remove-offer]");
      try {
        if (cancel && global.confirm("Annuler cette réservation ? Les places seront de nouveau disponibles.")) {
          Model.cancelBooking(cancel.dataset.cancelBooking);
          View.showToast("Réservation annulée.");
          render();
        } else if (remove && global.confirm("Retirer cette offre de votre catalogue local ?")) {
          Model.removeOffer(remove.dataset.removeOffer);
          View.showToast("Offre retirée.");
          render();
        }
      } catch (error) {
        View.showToast(error.message);
      }
    });
    render();
  }

  global.GreenMobility = global.GreenMobility || {};
  global.GreenMobility.Controller = {
    init: function (page) {
      setNavigation(page);
      const handlers = { home: initHome, search: initSearch, offer: initOffer, book: initBooking, mine: initMine };
      if (handlers[page]) handlers[page]();
    }
  };
}(window));
