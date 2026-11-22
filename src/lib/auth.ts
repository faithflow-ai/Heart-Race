import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { newId, one, q } from "./db";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "student" | "instructor";
}

const COOKIE = "hr_session";
function secret() {
  const s = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-only-secret-change-me");
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

const list = (v: string | undefined) => (v ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
export const allowedDomains = () => list(process.env.ALLOWED_EMAIL_DOMAINS ?? "cui.edu,eagles.cui.edu");
export const instructorEmails = () => list(process.env.INSTRUCTOR_EMAILS);

export function emailProblem(email: string): string | null {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return "Enter a valid email address.";
  if (instructorEmails().includes(e)) return null;
  const domain = e.split("@")[1];
  const ok = allowedDomains();
  if (ok.length && !ok.includes(domain)) return `Use your Concordia email (${ok.map((d) => "@" + d).join(" or ")}).`;
  return null;
}

export async function signup(email: string, name: string, password: string): Promise<User> {
  const e = email.trim().toLowerCase();
  const problem = emailProblem(e);
  if (problem) throw new HttpError(400, problem);
  if (password.length < 8) throw new HttpError(400, "Use a password of at least 8 characters.");
  if (!name.trim()) throw new HttpError(400, "Enter your name.");
  if (await one("select id from users where email = $1", [e])) throw new HttpError(400, "An account with that email already exists. Sign in instead.");
  const role = instructorEmails().includes(e) ? "instructor" : "student";
  const id = newId("u_");
  await q("insert into users (id, email, name, password_hash, role) values ($1,$2,$3,$4,$5)", [id, e, name.trim(), await bcrypt.hash(password, 10), role]);
  return { id, email: e, name: name.trim(), role };
}

export async function login(email: string, password: string): Promise<User> {
  const row = await one<User & { password_hash: string }>("select * from users where email = $1", [email.trim().toLowerCase()]);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) throw new HttpError(400, "Email or password is wrong.");
  // Promote if the instructor list changed after signup.
  if (row.role !== "instructor" && instructorEmails().includes(row.email)) {
    await q("update users set role = 'instructor' where id = $1", [row.id]);
    row.role = "instructor";
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function setPassword(userId: string, password: string) {
  if (password.length < 8) throw new HttpError(400, "Use a password of at least 8 characters.");
  await q("update users set password_hash = $1 where id = $2", [await bcrypt.hash(password, 10), userId]);
}

export async function startSession(user: User) {
  const token = await new SignJWT({ sub: user.id }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return await one<User>("select id, email, name, role from users where id = $1", [payload.sub]);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "Please sign in.");
  return u;
}

export async function requireInstructor(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "instructor") throw new HttpError(403, "Instructor access only.");
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
