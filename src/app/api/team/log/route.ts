import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const user = await requireUser();
  const { firm } = await studentContext(user);
  const rows = await q("select c.round, c.at, c.path, c.old_value, c.new_value, u.name from change_log c join users u on u.id = c.user_id where c.firm_id = $1 order by c.at desc limit 500", [firm.id]);
  return { log: rows };
});
