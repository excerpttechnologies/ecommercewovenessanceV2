// "use client";
// import { useRouter } from "next/navigation";
// import { useQueryClient } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";

// export function LogoutButton() {
//   const router = useRouter();
//   const qc = useQueryClient();
//   return (
//     <Button variant="ghost" size="sm" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); qc.clear(); router.push("/"); router.refresh(); }}>Log out</Button>
//   );
// }


////////////////////////////////////////////////////////////////

"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const qc = useQueryClient();
  return (
    <Button variant="ghost" size="sm" className="h-10 w-full justify-start gap-2.5 rounded-xl px-3 text-sm font-medium text-red-700 hover:bg-red-50 hover:text-red-700" onClick={async () => { await fetch("/api/v1/auth/logout", { method: "POST" }); qc.clear(); router.push("/"); router.refresh(); }}>
      <LogOut className="h-4 w-4" /> Log out
    </Button>
  );
}
