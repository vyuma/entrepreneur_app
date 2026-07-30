import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAdminMe } from "@/lib/admin";
import SideNav from "./SideNav";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  // 管理リンクは権限を持つ人にだけ見せる（本体の保護は /admin 側で行う）
  const me = await getAdminMe();

  return (
    <div className="bg-grid min-h-screen bg-zinc-50 dark:bg-black">
      <SideNav
        isAdmin={me.is_admin}
        userName={session.user.name}
        userImage={session.user.image}
      />
      {/* サイドバーの幅ぶんだけ本文を右に寄せる（lg 未満は上部バーなので不要） */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
