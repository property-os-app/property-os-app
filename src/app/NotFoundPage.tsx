import { useNavigate } from "react-router";
import { SearchX } from "lucide-react";
import { Button } from "@/components/atoms";
import { Card, EmptyState } from "@/components/molecules";

/** Shown for any unknown URL, inside the app layout. */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Card padding="none">
      <EmptyState
        icon={<SearchX strokeWidth={1.5} />}
        title="Page not found"
        description="This page does not exist or was moved."
        action={
          <Button variant="primary" onClick={() => navigate("/")}>
            Go to home
          </Button>
        }
      />
    </Card>
  );
}
