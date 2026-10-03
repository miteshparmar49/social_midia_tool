import { auth } from "@/auth";

// Returns the logged-in user's id. Throws if nobody is logged in.
export async function getUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}
