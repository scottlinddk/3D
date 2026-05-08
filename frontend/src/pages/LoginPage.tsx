import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
        Sign in
      </h1>
      <p className="mb-10 text-gray-500 dark:text-gray-400">
        Connect your Garmin account to get started.
      </p>

      <Card className="w-full text-left">
        <CardHeader>
          <CardTitle>Garmin Connect</CardTitle>
          <CardDescription>
            Sign in with your Garmin Connect account to access CurveExtract.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {errorMessage(error)}
            </p>
          )}

          <Button
            variant="gradient"
            size="lg"
            className="w-full gap-2"
            onClick={login}
            disabled={isLoading}
          >
            <GarminIcon />
            Continue with Garmin
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "missing_params": return "Authorization was cancelled or incomplete.";
    case "invalid_state": return "Security check failed. Please try again.";
    case "token_exchange_failed": return "Could not complete sign-in with Garmin. Please try again.";
    case "access_denied": return "Access was denied. Please authorise CurveExtract in Garmin Connect.";
    default: return `Sign-in failed: ${code}`;
  }
}

function GarminIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  );
}
