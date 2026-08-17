import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import { DataProvider } from "./lib/store";
import { AuthProvider } from "./lib/auth";
import { TabProvider } from "./lib/tabs";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <TabProvider>
            <App />
          </TabProvider>
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
