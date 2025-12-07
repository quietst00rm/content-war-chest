import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

console.log("Main.tsx executing...");

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Failed to find root element");
  throw new Error("Failed to find root element");
}

console.log("Root element found, creating React root...");

try {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log("React app rendered successfully");
} catch (error) {
  console.error("Failed to render React app:", error);
  throw error;
}