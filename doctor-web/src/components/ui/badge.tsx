import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--ring)]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary:
          "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        destructive:
          "border-[#F8D2D2] bg-[#FDF2F2] text-[var(--destructive)]",
        warning:
          "border-[#F8E1C2] bg-[#FDF8EE] text-[#D9A441]",
        success:
          "border-[#D5F5E3] bg-[#EEFDF5] text-[var(--chart-2)]",
        outline:
          "border-[var(--border)] bg-[#F3F4F6] text-[#6B7280]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
