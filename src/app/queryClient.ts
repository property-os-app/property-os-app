import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

/** Status codes that will not change on a retry (validation, auth, role, not found, conflict). */
const NO_RETRY = [400, 401, 403, 404, 409];

/** One shared cache for the whole app. Queries retry once except on NO_RETRY; mutations never retry. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && NO_RETRY.includes(error.status)) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
