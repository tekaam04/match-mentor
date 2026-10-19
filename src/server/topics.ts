import { db } from "@/lib/db";
import { ActionError } from "./errors";

export function listActiveTopics() {
  return db.topic.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true } });
}

/** Ensures every id refers to an active topic. */
export async function assertActiveTopics(ids: string[], field = "topicIds"): Promise<void> {
  if (ids.length === 0) return;
  const count = await db.topic.count({ where: { id: { in: ids }, active: true } });
  if (count !== new Set(ids).size) {
    throw new ActionError("invalid", "Please fix the highlighted fields.", { [field]: ["Choose from the listed topics."] });
  }
}
