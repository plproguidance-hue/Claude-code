import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const styles = {
  error: { classes: "border-danger/30 bg-danger/5 text-danger", Icon: AlertCircle },
  success: {
    classes: "border-success/30 bg-success/5 text-success",
    Icon: CheckCircle2,
  },
  info: { classes: "border-info/30 bg-info/5 text-info", Icon: Info },
} as const;

export function Alert({
  tone,
  children,
  className,
}: {
  tone: keyof typeof styles;
  children: React.ReactNode;
  className?: string;
}) {
  const { classes, Icon } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
        classes,
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
