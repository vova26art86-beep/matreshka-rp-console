#!/usr/bin/env python3
"""Low-frequency monitor for Matreshka RP leader complaints (XenForo)."""
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

FORUM_URL = "https://forum.matrp.ru/index.php?forums/zaloby-na-liderov.3191/"
VK_API = "https://api.vk.com/method/"
VK_API_VERSION = "5.199"
VK_GROUP_ID = "243203254"
VK_SCREEN_NAME = "vladimirsudariko"
STATE_PATH = Path("monitoring/state.json")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; MatreshkaComplaintMonitor/1.0; +https://github.com/vova26art86-beep/matreshka-rp-console)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "ru,en;q=0.8",
}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def load_state():
    if not STATE_PATH.exists():
        return {"initialized": False, "topics": {}}
    try:
        data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        if not isinstance(data.get("topics"), dict):
            raise ValueError("invalid topics state")
        return data
    except Exception as exc:
        raise RuntimeError(f"Не удалось прочитать файл состояния: {exc}")


def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(STATE_PATH)


def get_topic_id(href):
    match = re.search(r"/threads/[^/?#]*\.(\d+)", href or "")
    if match:
        return match.group(1)
    match = re.search(r"[?&]threads/[^.&]+\.(\d+)", href or "")
    return match.group(1) if match else None


def get_post_id(href):
    if not href:
        return None
    match = re.search(r"(?:#post-|/posts/|post-)(\d+)", href)
    return match.group(1) if match else None


def parse_forum(html):
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select(".structItem--thread")
    if not rows:
        # A challenge/login/error page must not be mistaken for an empty forum.
        title = soup.title.get_text(" ", strip=True) if soup.title else "без заголовка"
        raise RuntimeError(f"Не найдены темы XenForo (страница: {title}). Возможно, форум показал защиту или изменил разметку.")
    found = {}
    for row in rows:
        title_link = row.select_one(".structItem-title a[href*='/threads/']")
        if not title_link:
            continue
        href = urljoin(FORUM_URL, title_link.get("href", ""))
        topic_id = get_topic_id(href)
        if not topic_id:
            continue
        title = title_link.get_text(" ", strip=True) or "Без названия"
        starter = row.select_one(".structItem-parts a.username") or row.select_one(".structItem-minor a.username")
        starter_name = starter.get_text(" ", strip=True) if starter else "неизвестен"
        latest_cell = row.select_one(".structItem-cell--latest") or row.select_one(".structItem-latest")
        latest = None
        if latest_cell:
            latest = latest_cell.select_one("a[href*='#post-'], a[href*='/posts/']")
            if not latest:
                latest = latest_cell.select_one(".structItem-latestDate a") or latest_cell.select_one("a")
        latest_href = urljoin(FORUM_URL, latest.get("href", "")) if latest else href
        last_post_id = get_post_id(latest_href)
        latest_user = latest_cell.select_one("a.username") if latest_cell else None
        last_author = latest_user.get_text(" ", strip=True) if latest_user else starter_name
        time_el = (latest_cell.select_one("time") if latest_cell else None) or row.select_one("time")
        stamp = time_el.get("datetime", "") if time_el else ""
        if not last_post_id:
            last_post_id = f"latest:{stamp}:{last_author}" if stamp else f"latest:{last_author}"
        found[topic_id] = {
            "title": title,
            "url": href,
            "last_post_id": str(last_post_id),
            "last_author": last_author,
            "starter": starter_name,
            "timestamp": stamp,
            "last_url": latest_href,
        }
    if not found:
        raise RuntimeError("На странице не удалось разобрать ни одной темы; состояние не изменено.")
    return found


def vk_call(method, token, params):
    payload = dict(params)
    payload.update({"access_token": token, "v": VK_API_VERSION})
    response = SESSION.post(VK_API + method, data=payload, timeout=25)
    response.raise_for_status()
    data = response.json()
    if "error" in data:
        err = data["error"]
        raise RuntimeError(f"VK API {method}: {err.get('error_code')} — {err.get('error_msg')}")
    return data.get("response")


def resolve_user_id(token):
    result = vk_call("users.get", token, {"user_ids": VK_SCREEN_NAME})
    if not result:
        raise RuntimeError("VK не вернул ID получателя по screen name.")
    return str(result[0]["id"])


def send_vk(token, user_id, message):
    # random_id prevents duplicate delivery if VK retries a request.
    random_id = int(time.time() * 1000) % 2_000_000_000
    vk_call("messages.send", token, {
        "user_id": user_id,
        "random_id": random_id,
        "group_id": VK_GROUP_ID,
        "message": message,
    })


def event_message(kind, topic):
    if kind == "new":
        head = "🆕 Новая жалоба на лидера"
        author = topic.get("starter", "неизвестен")
    else:
        head = "💬 Новый ответ в жалобе на лидера"
        author = topic.get("last_author", "неизвестен")
    lines = [
        head,
        f"Тема: {topic['title']}",
        f"Автор сообщения: {author}",
    ]
    if topic.get("timestamp"):
        lines.append(f"Время: {topic['timestamp']}")
    lines.append(f"Открыть тему: {topic['last_url'] if kind == 'reply' else topic['url']}")
    return "\n".join(lines)


def main():
    token = os.environ.get("VK_GROUP_TOKEN", "").strip()
    if not token:
        raise RuntimeError("Не задан секрет VK_GROUP_TOKEN в GitHub Actions.")
    state = load_state()
    response = SESSION.get(FORUM_URL, timeout=35)
    response.raise_for_status()
    current = parse_forum(response.text)

    if not state.get("initialized"):
        state["topics"] = {
            tid: {"last_post_id": item["last_post_id"], "title": item["title"], "url": item["url"]}
            for tid, item in current.items()
        }
        state["initialized"] = True
        save_state(state)
        user_id = resolve_user_id(token)
        send_vk(token, user_id,
                "✅ Мониторинг жалоб на лидеров Matreshka RP запущен.\n"
                "Буду присылать новые темы и ответы в разделе:\n" + FORUM_URL)
        print(f"Первичная настройка: сохранено тем — {len(current)}. Старые жалобы не отправлялись.")
        return

    user_id = resolve_user_id(token)
    known = state.setdefault("topics", {})
    # Older entries are retained so replies in older topics remain detectable.
    for tid, item in current.items():
        previous = known.get(tid)
        if previous is None:
            send_vk(token, user_id, event_message("new", item))
            known[tid] = {"last_post_id": item["last_post_id"], "title": item["title"], "url": item["url"]}
            save_state(state)
            print(f"Отправлено уведомление о новой теме {tid}")
        elif str(previous.get("last_post_id")) != str(item["last_post_id"]):
            send_vk(token, user_id, event_message("reply", item))
            known[tid] = {"last_post_id": item["last_post_id"], "title": item["title"], "url": item["url"]}
            save_state(state)
            print(f"Отправлено уведомление о новом ответе в теме {tid}")
    print(f"Проверка завершена. Тем на странице: {len(current)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ОШИБКА МОНИТОРИНГА: {exc}", file=sys.stderr)
        sys.exit(1)
