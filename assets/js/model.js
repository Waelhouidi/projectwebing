(function (global) {
  "use strict";

  const KEYS = {
    trips: "greenmobility.trips.v1",
    bookings: "greenmobility.bookings.v1"
  };
  const ROUTES = [
    ["Sousse", "Tunis", 14], ["Monastir", "Sousse", 4], ["Tunis", "Nabeul", 6],
    ["Sfax", "Sousse", 9], ["Mahdia", "Monastir", 3], ["Sousse", "Kairouan", 7],
    ["Tunis", "Sousse", 15], ["Gabès", "Sfax", 5], ["Nabeul", "Tunis", 6],
    ["Monastir", "Tunis", 13], ["Sfax", "Tunis", 13], ["Kairouan", "Sousse", 7]
  ];
  const DRIVERS = ["Yasmine Ben Ali", "Sami Trabelsi", "Amira Gharbi", "Malek Ben Amor", "Ines Jlassi", "Rayan Kacem"];
  const DISTANCES = [145, 22, 68, 132, 18, 58, 145, 115, 68, 165, 270, 58];

  function localDate(offset, hour) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    if (hour !== undefined) date.setHours(hour, 0, 0, 0);
    return date.toISOString().slice(0, 10);
  }

  function createDemoTrips() {
    return ROUTES.map(function (route, index) {
      return {
        id: "demo-" + (index + 1),
        driver: DRIVERS[index % DRIVERS.length],
        email: "conducteur" + (index + 1) + "@exemple.tn",
        departure: route[0],
        destination: route[1],
        date: localDate((index % 9) + 1, 8 + (index % 8)),
        time: String(8 + (index % 8)).padStart(2, "0") + ":" + (index % 2 ? "30" : "00"),
        price: route[2],
        seatsAvailable: 1 + (index % 3),
        seatsTotal: 1 + (index % 3),
        notes: index % 2 ? "Point de rencontre à confirmer avec le conducteur." : "Départ près de la gare principale.",
        distanceKm: DISTANCES[index],
        createdBy: "demo"
      };
    });
  }

  function read(key, fallback) {
    const raw = global.localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error("Les données locales sont illisibles. Effacez les données du site puis réessayez.");
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new Error("Impossible d’enregistrer les données dans ce navigateur. Vérifiez l’espace disponible ou les paramètres de stockage.");
    }
  }

  function initialize() {
    if (global.localStorage.getItem(KEYS.trips) === null) write(KEYS.trips, createDemoTrips());
    if (global.localStorage.getItem(KEYS.bookings) === null) write(KEYS.bookings, []);
  }

  function makeReference(prefix) {
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function getTrips() {
    return read(KEYS.trips, []);
  }

  function getBookings() {
    return read(KEYS.bookings, []);
  }

  function createOffer(data) {
    const trips = getTrips();
    const trip = Object.assign({}, data, {
      id: makeReference("GM"),
      reference: makeReference("OFF"),
      seatsTotal: data.seatsAvailable,
      distanceKm: 80,
      createdBy: "user"
    });
    trips.push(trip);
    write(KEYS.trips, trips);
    return trip;
  }

  function updateOffer(id, data) {
    const trips = getTrips();
    const trip = trips.find(function (item) { return item.id === id && item.createdBy === "user"; });
    if (!trip) throw new Error("Cette offre n’est plus disponible pour modification.");
    const reservedSeats = getBookings().filter(function (booking) {
      return booking.tripId === id && !booking.cancelled;
    }).reduce(function (total, booking) { return total + booking.seats; }, 0);
    if (data.seatsAvailable < reservedSeats) {
      throw new Error("Le nombre de places ne peut pas être inférieur aux places déjà réservées (" + reservedSeats + ").");
    }
    Object.assign(trip, data, {
      seatsTotal: data.seatsAvailable,
      seatsAvailable: data.seatsAvailable - reservedSeats
    });
    write(KEYS.trips, trips);
    return trip;
  }

  function removeOffer(id) {
    const bookings = getBookings();
    const hasBookings = bookings.some(function (booking) {
      return booking.tripId === id && !booking.cancelled;
    });
    if (hasBookings) throw new Error("Cette offre a des réservations actives. Annulez-les avant de retirer le trajet.");
    write(KEYS.trips, getTrips().filter(function (trip) { return trip.id !== id; }));
  }

  function makeBooking(data) {
    const trips = getTrips();
    const trip = trips.find(function (item) { return item.id === data.tripId; });
    if (!trip) throw new Error("Ce trajet n’est plus disponible.");
    if (new Date(trip.date + "T" + trip.time) <= new Date()) throw new Error("Ce trajet est déjà passé.");
    if (trip.seatsAvailable < data.seats) throw new Error("Le nombre de places disponibles a changé. Vérifiez le trajet.");
    const bookings = getBookings();
    const duplicate = bookings.some(function (booking) {
      return booking.tripId === data.tripId && booking.email.toLowerCase() === data.email.toLowerCase() && !booking.cancelled;
    });
    if (duplicate) throw new Error("Une réservation existe déjà pour ce trajet et cette adresse email.");

    const booking = Object.assign({}, data, {
      id: makeReference("RES"),
      reference: makeReference("GM"),
      price: trip.price,
      departure: trip.departure,
      destination: trip.destination,
      date: trip.date,
      time: trip.time,
      distanceKm: trip.distanceKm,
      createdAt: new Date().toISOString(),
      cancelled: false
    });
    trip.seatsAvailable -= data.seats;
    bookings.push(booking);
    write(KEYS.trips, trips);
    try {
      write(KEYS.bookings, bookings);
    } catch (error) {
      trip.seatsAvailable += data.seats;
      write(KEYS.trips, trips);
      throw error;
    }
    return booking;
  }

  function cancelBooking(id) {
    const bookings = getBookings();
    const booking = bookings.find(function (item) { return item.id === id && !item.cancelled; });
    if (!booking) throw new Error("Cette réservation est déjà annulée ou introuvable.");
    const trip = getTrips().find(function (item) { return item.id === booking.tripId; });
    if (!trip || new Date(trip.date + "T" + trip.time) <= new Date()) {
      throw new Error("Seules les réservations de trajets futurs peuvent être annulées.");
    }
    booking.cancelled = true;
    trip.seatsAvailable += booking.seats;
    write(KEYS.trips, getTrips().map(function (item) { return item.id === trip.id ? trip : item; }));
    try {
      write(KEYS.bookings, bookings);
    } catch (error) {
      trip.seatsAvailable -= booking.seats;
      booking.cancelled = false;
      write(KEYS.trips, getTrips().map(function (item) { return item.id === trip.id ? trip : item; }));
      throw error;
    }
    return booking;
  }

  function isFuture(trip) {
    return new Date(trip.date + "T" + trip.time) > new Date();
  }

  initialize();
  global.GreenMobility = global.GreenMobility || {};
  global.GreenMobility.Model = {
    getTrips: getTrips,
    getBookings: getBookings,
    createOffer: createOffer,
    updateOffer: updateOffer,
    removeOffer: removeOffer,
    makeBooking: makeBooking,
    cancelBooking: cancelBooking,
    isFuture: isFuture
  };
}(window));
