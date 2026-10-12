import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { Toaster } from "@/components/molecules";
import { queryClient } from "@/app/queryClient";
import { router } from "@/app/router";

/** App root: query cache, toasts and the router. */
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
