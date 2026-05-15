import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mppga-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variantClass: Record<Variant, string> = {
  primary: "bg-mppga-teal text-white hover:bg-mppga-teal-hover",
  secondary:
    "border border-mppga-teal text-mppga-teal hover:bg-mppga-teal-tint",
  ghost: "text-mppga-teal hover:bg-mppga-teal-tint",
  inverse: "bg-white text-mppga-teal-deep hover:bg-mppga-teal-tint",
};

const sizeClass: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  extra?: string,
): string {
  return [base, variantClass[variant], sizeClass[size], extra]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant, size, className, ...rest }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest} />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  variant,
  size,
  className,
  ...rest
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
