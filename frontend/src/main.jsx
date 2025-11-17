import App from "./App.jsx";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./components/theme/theme-provider.jsx";
import { AuthProvider } from "./context/AuthContext";
import React from "react";
import "./index.css";
import { clearFormData } from "./util/formPersistence";

// Global error handler to suppress non-critical errors
window.addEventListener('error', (event) => {
  // Suppress AbortError from play() being interrupted (common with browser extensions)
  if (event.error?.name === 'AbortError' && event.message?.includes('play()')) {
    event.preventDefault();
    return false;
  }
  
  // Suppress 404 errors for avatar images (handled by fallback UI)
  if (event.target?.tagName === 'IMG' && event.target.src?.includes('/uploads/avatars/')) {
    event.preventDefault();
    return false;
  }
}, true);

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress AbortError from play() being interrupted
  if (event.reason?.name === 'AbortError' && event.reason?.message?.includes('play()')) {
    event.preventDefault();
    return false;
  }
});

// Clear form drafts on page load/refresh
// Only clear if they were saved while online (preserve offline drafts)
const FORM_DRAFT_KEYS = [
  'violation_form_draft',
  'vehicle_form_draft',
  'driver_form_draft',
  'accident_form_draft'
];

// Clear all form drafts when page loads (only if they were saved online)
FORM_DRAFT_KEYS.forEach(key => {
  clearFormData(key, false); // false = don't force clear, respect offline status
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
