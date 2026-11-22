import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";
import { productNames, readable, type RawLog } from "@/lib/logtext";

export const GET = handle(async () => {
  const user = await requireUser();
  const { firm } = await studentContext(user);
  const rows = await q<RawLog & { round: number; at: string; name: string }>(
    "select c.firm_id, c.round, c.at, c.path, c.old_value, c.new_value, u.name from change_log c join users u on u.id = c.user_id where c.firm_id = $1 order by c.at desc limit 500",
    [firm.id],
  );
  return { log: readable(rows, await productNames({ firmId: firm.id })).map(({ round, at, name, text }) => ({ round, at, name, text })) };
});
