import { currentUser } from "@/lib/auth";
import { handle } from "@/lib/http";

export const GET = handle(async () => ({ user: await currentUser() }));
