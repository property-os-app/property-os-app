import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { Toaster } from "@/components/molecules";
import { queryClient } from "@/app/queryClient";
import { router } from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthProvider";

/** App root: query cache, auth state, toasts and the router. */
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
