"""作業時間メッセージの解析と、記録に対する応援メッセージ。

Bot のメッセージ監視とスラッシュコマンドの両方から使うため、
循環インポートを避けてここに切り出している。
"""

import random
import re

# 1回に記録できる上限（12時間）。誤記録が積み上がらないように頭打ちにする。
MAX_MINUTES = 720


def parse_minutes(text: str) -> int:
    """テキストから時間・分を抽出して合計分数を返す（0なら抽出失敗）"""
    # 全角数字→半角変換、全角コロン→半角コロン
    text = text.translate(str.maketrans("０１２３４５６７８９：", "0123456789:"))
    # 漢数字の簡易変換
    kanji = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
             "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
    for k, v in kanji.items():
        text = text.replace(k, str(v))

    total = 0
    consumed_spans: list[tuple[int, int]] = []
    # 「H:MM」形式は時刻（13:00 に集合 など）との区別がつかず誤記録になりやすいため
    # 意図的に解釈しない。「3時間20分」のように明示してもらう。
    # 「X時間半」は X*60 + 30、「X時間」は X*60
    for match in re.finditer(r"(\d+(?:\.\d+)?)\s*時間\s*(半)?", text):
        total += int(float(match.group(1)) * 60)
        if match.group(2):
            total += 30
        consumed_spans.append(match.span())
    # 「半時間」(数字なしで時間の前に半) → 30分
    for match in re.finditer(r"半\s*時間", text):
        if not any(s <= match.start() < e for s, e in consumed_spans):
            total += 30
    # 「X分」(X時間の直後の分以外)
    for match in re.finditer(r"(\d+)\s*分", text):
        if any(s <= match.start() < e for s, e in consumed_spans):
            continue
        total += int(match.group(1))
    return min(total, MAX_MINUTES)


# 記録された分数に応じた応援メッセージ。降順に評価する。
PRAISE_MESSAGES: list[tuple[int, list[str]]] = [
    (480, ["とんでもない集中力です…！しっかり休んでくださいね🛌", "8時間超え、 お疲れさまでした！"]),
    (300, ["5時間以上！打ち込んでますね！休憩も忘れずに！"]),
    (180, ["3時間集中、がんばりました！", "この調子です！"]),
    (120, ["2時間しっかり確保できましたね", "いい流れです!"]),
    (60, ["1時間しっかり集中できましたね", "着実に積み上がりを感じられますね"]),
    (30, ["積み重ねが将来に効いてきます！","30分の集中が未来を作ります！"]),
    (0, ["短い時間から始めるのはやる気を出すスパイスです!"]),
]


def praise_for(minutes: int) -> str:
    """記録時間に応じたひとことを返す。同じ文言が続かないよう候補から選ぶ。"""
    for threshold, messages in PRAISE_MESSAGES:
        if minutes >= threshold:
            return random.choice(messages)
    return PRAISE_MESSAGES[-1][1][0]


def format_duration(minutes: int) -> str:
    hours, mins = divmod(minutes, 60)
    if hours and mins:
        return f"{hours}時間{mins}分"
    if hours:
        return f"{hours}時間"
    return f"{mins}分"
