import { createBrowserRouter } from "react-router";
import { DevCheckPage } from "@/app/DevCheckPage";
import { NotFoundPage } from "@/app/NotFoundPage";

/** All routes (library / data mode). */
export const router = createBrowserRouter([
  { path: "/", element: <DevCheckPage /> },
  { path: "*", element: <NotFoundPage /> },
]);
