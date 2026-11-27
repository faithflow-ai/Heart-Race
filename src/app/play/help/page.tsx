import { redirect } from "next/navigation";

/** "How it works" is now Start here. */
export default function HelpPage() {
  redirect("/play/start");
}
