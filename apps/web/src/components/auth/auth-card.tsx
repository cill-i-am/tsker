import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  title: string;
}

export const AuthCard = ({ children, description, footer, title }: AuthCardProps) => (
  <Card className="w-full max-w-md border-border/70 shadow-xl">
    <CardHeader className="space-y-1">
      <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
    {footer ? (
      <CardFooter className="justify-center text-xs text-muted-foreground">{footer}</CardFooter>
    ) : null}
  </Card>
);
