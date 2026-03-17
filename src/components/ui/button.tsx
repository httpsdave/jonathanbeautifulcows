import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.08em] transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--jbc-neon) focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        neon: "border border-black/70 bg-(--jbc-neon) text-black shadow-[4px_4px_0_var(--jbc-paper)] [&_svg]:text-black hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--jbc-paper)]",
        outline:
          "border border-(--jbc-neon) bg-transparent text-(--jbc-neon) hover:bg-(--jbc-neon) hover:text-background",
        ghost: "text-foreground hover:bg-white/10",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3",
        lg: "h-12 px-7",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "neon",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };