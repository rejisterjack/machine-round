"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  className?: string;
  variant?: "desktop" | "mobile";
};

export function UserMenu({ className, variant = "desktop" }: UserMenuProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span
        className={cn(
          "text-sm text-muted-foreground",
          variant === "mobile" && "px-3 py-2",
          className,
        )}
        aria-hidden
      >
        …
      </span>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className={cn(
          variant === "desktop"
            ? "nd-header-link inline-flex"
            : buttonVariants({ variant: "outline", size: "lg" }),
          variant === "mobile" && "w-full justify-center",
          className,
        )}
      >
        Sign In
      </Link>
    );
  }

  const { user } = session;

  if (variant === "mobile") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          {user.image ? (
            <Image
              src={user.image}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full"
            />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
              {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name ?? "Signed in"}</p>
            {user.email ? (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {user.image ? (
        <Image
          src={user.image}
          alt=""
          width={28}
          height={28}
          className="size-7 rounded-full"
        />
      ) : null}
      <span className="max-w-[8rem] truncate text-sm text-foreground">
        {user.name ?? user.email}
      </span>
      <button
        type="button"
        className="nd-nav-link text-muted-foreground hover:text-primary"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </button>
    </div>
  );
}
