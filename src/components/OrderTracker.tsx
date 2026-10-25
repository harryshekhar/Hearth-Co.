import { Check, Clock, CreditCard, Truck, PackageCheck, XCircle } from "lucide-react";

const STEPS = [
  { id: "pending", label: "Order placed", icon: Clock },
  { id: "paid", label: "Confirmed", icon: CreditCard },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: PackageCheck },
] as const;

export function OrderTracker({ status, createdAt }: { status: string; createdAt: string }) {
  if (status === "cancelled") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <XCircle className="size-4" /> This order was cancelled.
      </div>
    );
  }
  const current = Math.max(0, STEPS.findIndex((s) => s.id === status));
  const eta = new Date(new Date(createdAt).getTime() + 5 * 86400000).toLocaleDateString();
  return (
    <div className="mt-4 rounded-lg bg-secondary/50 p-4">
      <ol className="flex items-start">
        {STEPS.map((s, i) => {
          const done = i <= current;
          return (
            <li key={s.id} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= current ? "bg-primary" : "bg-border"}`} />}
              <span className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 ${done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                {i < current ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </span>
              <span className={`mt-2 text-xs ${done ? "font-medium" : "text-muted-foreground"}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>
      {status !== "delivered" && <p className="mt-3 text-center text-xs text-muted-foreground">Estimated delivery by {eta}</p>}
    </div>
  );
}
