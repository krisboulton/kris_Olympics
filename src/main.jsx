import React from "react";
import { createRoot } from "react-dom/client";
import CanadianOlympics from "./App.jsx"; // <-- this should point to the file that contains your big component

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CanadianOlympics />
  </React.StrictMode>
);


