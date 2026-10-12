import { Body, Num } from "@/components/atoms";
import { Card, CardHeader } from "@/components/molecules";

/** Shown instead of the app when env variables are missing, so the screen is never blank. */
export function EnvErrorPage({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto max-w-content p-6">
      <Card className="border-danger/40">
        <CardHeader title="App configuration is missing" description="These environment variables are missing or empty:" />
        <ul className="my-4 list-disc pl-6">
          {missing.map((name) => (
            <li key={name}>
              <Num className="font-semibold text-danger">{name}</Num>
            </li>
          ))}
        </ul>
        <Body>Add it to .env.local and restart npm run dev.</Body>
      </Card>
    </main>
  );
}
