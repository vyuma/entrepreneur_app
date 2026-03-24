import logging

from app.bot import bot
from app.core.config import settings


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    bot.run(settings.DISCORD_BOT_TOKEN)


if __name__ == "__main__":
    main()
