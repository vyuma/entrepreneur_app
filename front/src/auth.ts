import NextAuth from "next-auth"
import Discord from "next-auth/providers/discord"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      authorization: {
        params: { scope: "identify email guilds.members.read" },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (!account?.access_token) return false

      const guildId = process.env.DISCORD_GUILD_ID
      const res = await fetch(
        `https://discord.com/api/users/@me/guilds/${guildId}/member`,
        {
          headers: { Authorization: `Bearer ${account.access_token}` },
        }
      )

      if (!res.ok) return "/auth/not-member"
      return true
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = profile.id as string
        token.username = (profile as { username?: string }).username ?? ""
        token.avatar = (profile as { avatar?: string }).avatar ?? null

        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        const secret = process.env.INTERNAL_API_SECRET
        await fetch(`${apiUrl}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Token": secret!,
          },
          body: JSON.stringify({
            discord_id: profile.id,
            username: (profile as { username?: string }).username,
            display_name: (profile as { global_name?: string }).global_name ?? null,
            avatar_url: token.avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${token.avatar}.png`
              : null,
          }),
        })
      }
      return token
    },

    async session({ session, token }) {
      session.user.discordId = token.discordId as string
      return session
    },
  },
})
