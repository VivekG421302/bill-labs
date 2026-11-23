// URLs of the standalone pages (public/petrol-bill, public/uber-bill). Kept in their own file so
// both App.jsx and Home.jsx can read them at load time without importing each other.
export const PETROL_URL = `${import.meta.env.BASE_URL}petrol-bill/`
export const UBER_URL = `${import.meta.env.BASE_URL}uber-bill/`
