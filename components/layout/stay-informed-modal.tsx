"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "namaste-machine-round-stay-informed-dismissed";

export function StayInformedModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = window.setTimeout(() => setOpen(true), 2500);
      return () => window.clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close stay informed dialog"
        onClick={dismiss}
      />
      <div
        role="dialog"
        aria-labelledby="stay-informed-title"
        className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
        <p id="stay-informed-title" className="font-heading text-lg font-medium">
          Stay informed
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Get updates on new courses, interview prep tools, and Namaste Machine
          Round features.
        </p>
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            dismiss();
          }}
        >
          <Input
            type="email"
            placeholder="Enter your email address"
            className="border-border bg-secondary"
            aria-label="Email address"
            required
          />
          <Button variant="ndFilled" type="submit" className="shrink-0">
            Subscribe
          </Button>
        </form>
      </div>
    </div>
  );
}
