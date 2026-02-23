import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface AuthStatusState {
  description: string;
  title: string;
  variant?: "default" | "destructive";
}

interface AuthStatusProps {
  state: AuthStatusState;
}

export const AuthStatus = ({ state }: AuthStatusProps) => (
  <Alert variant={state.variant}>
    <AlertTitle>{state.title}</AlertTitle>
    <AlertDescription>{state.description}</AlertDescription>
  </Alert>
);
