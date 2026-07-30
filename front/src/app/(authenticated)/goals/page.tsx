import { redirect } from "next/navigation";

/**
 * 目標は TODO と同じページに統合した。
 * Discord から送られた既存のリンク（/goals）が切れないよう転送だけする。
 */
export default function GoalsPage() {
  redirect("/todos");
}
