import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { missingEnv } from "@/lib/env";
import { EnvErrorPage } from "@/app/EnvErrorPage";

const root = createRoot(document.getElementById("root")!);

if (missingEnv.length > 0) {
  root.render(
    <StrictMode>
      <EnvErrorPage missing={missingEnv} />
    </StrictMode>,
  );
} else {
  // Loaded only when env is complete, so Firebase never starts with an empty config.
  void import("@/app/providers").then(({ Providers }) => {
    root.render(
      <StrictMode>
        <Providers />
      </StrictMode>,
    );
  });
}
