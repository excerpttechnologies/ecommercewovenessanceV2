"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <Button variant="ghost" size="sm" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); qc.clear(); router.push("/"); router.refresh(); }}>Log out</Button>
  );
}
