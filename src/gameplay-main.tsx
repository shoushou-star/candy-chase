import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/800.css";
import "./styles/global.css";
import { GameplayPrototypePage } from "./gameplay/ui/GameplayPrototypePage";

ReactDOM.createRoot(document.getElementById("gameplay-root")!).render(
  <React.StrictMode>
    <GameplayPrototypePage />
  </React.StrictMode>,
);
