"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCv, deleteCv, duplicateCv } from "@/lib/actions";
import { ConfirmButton } from "@/components/ui";

export function NewCvForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const label = name.trim();
    if (!label) return;
    startTransition(async () => {
      const id = await createCv(label);
      setName("");
      router.push(`/cv/${id}`);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-none gap-2">
      <input
        className="field w-64"
        placeholder="e.g. Spotify — Backend Engineer"
        aria-label="New CV name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={pending || !name.trim()}>
        New CV
      </button>
    </form>
  );
}

export function CvListActions({ cvId, cvName }: { cvId: number; cvName: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-none items-center gap-1.5">
      <a className="btn btn-sm" href={`/api/cv/${cvId}/pdf`}>
        PDF
      </a>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() =>
          startTransition(async () => {
            const id = await duplicateCv(cvId, `${cvName} (copy)`);
            if (id) router.push(`/cv/${id}`);
          })
        }
      >
        Duplicate
      </button>
      <ConfirmButton onConfirm={() => deleteCv(cvId)} />
    </div>
  );
}
