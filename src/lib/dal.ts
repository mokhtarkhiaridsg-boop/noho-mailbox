import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const verifySession = cache(async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session.user;
});

export const verifyAdmin = cache(async () => {
  const user = await verifySession();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
});
