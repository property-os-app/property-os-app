import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/molecules";
import { ApiError } from "@/lib/api";
import { beginSessionEnd, requestSignOut, SESSION_ENDED_MESSAGE } from "@/features/auth/session";

/** Status codes that will not change on a retry (validation, auth, role, not found, conflict). */
const NO_RETRY = [400, 401, 403, 404, 409];

/** Missing or invalid token: toast once (even when many requests fail together), then sign out. Never for USER_NOT_REGISTERED. */
function onApiError(error: unknown) {
  if (!(error instanceof ApiError)) return;
  if (error.code !== "MISSING_TOKEN" && error.code !== "INVALID_TOKEN") return;
  if (!beginSessionEnd()) return;
  toast.error(SESSION_ENDED_MESSAGE);
  requestSignOut(SESSION_ENDED_MESSAGE);
}

/** One shared cache for the whole app. Queries retry once except on NO_RETRY; mutations never retry. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onApiError }),
  mutationCache: new MutationCache({ onError: onApiError }),
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
