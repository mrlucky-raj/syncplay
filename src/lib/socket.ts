import { io } from 'socket.io-client';

// Use the VITE_BACKEND_URL environment variable if provided (e.g., when hosting frontend on Netlify and backend elsewhere)
// Otherwise, fallback to the current origin (for local development or single-server hosting)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

export const socket = io(BACKEND_URL, {
  autoConnect: false,
});
