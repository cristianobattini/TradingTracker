"""
News and Economic Calendar service.
Fetches RSS feeds and HTML from major forex news sites with in-memory caching.
"""

import re
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
import feedparser
import cloudscraper
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
_cache: dict[str, Any] = {}
NEWS_CACHE_TTL = 300       # 5 minutes
CALENDAR_CACHE_TTL = 1800  # 30 minutes

# ---------------------------------------------------------------------------
# News sources
# ---------------------------------------------------------------------------
NEWS_SOURCES = [
    {
        "id": "investing",
        "name": "Investing.com",
        "rss_url": "https://www.investing.com/rss/news.rss",
        "site_url": "https://www.investing.com/news/forex-news",
        "color": "#FF6B35",
        "type": "rss",
    },
    {
        "id": "fxstreet",
        "name": "FXStreet",
        "rss_url": "https://www.fxstreet.com/rss/news",
        "site_url": "https://www.fxstreet.com/news",
        "color": "#4CAF50",
        "type": "rss",
    },
    {
        "id": "dailyforex",
        "name": "DailyForex",
        "rss_url": "https://www.dailyforex.com/forex-news",
        "site_url": "https://www.dailyforex.com/forex-news",
        "color": "#9C27B0",
        "type": "html",
    },
    {
        "id": "forexfactory",
        "name": "ForexFactory",
        "rss_url": "https://www.forexfactory.com/news",
        "site_url": "https://www.forexfactory.com/news",
        "color": "#2196F3",
        "type": "html",
    },
]

# ForexFactory public calendar JSON (published weekly)
CALENDAR_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; TradingTracker/1.0; +https://github.com)"}

# Shared cloudscraper instance (handles Cloudflare JS challenges)
_scraper = cloudscraper.create_scraper()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_html(text: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _cache_valid(key: str, ttl: int) -> bool:
    entry = _cache.get(key)
    return entry is not None and (time.time() - entry["ts"]) < ttl


def _relative_time_to_iso(time_str: str) -> str | None:
    """Convert '41 min ago', '2 hr ago', '1 day ago' to ISO timestamp."""
    now = datetime.now(timezone.utc)
    m = re.search(r"(\d+)\s+(min|hr|day)", time_str or "")
    if not m:
        return None
    val, unit = int(m.group(1)), m.group(2)
    if unit == "min":
        dt = now - timedelta(minutes=val)
    elif unit == "hr":
        dt = now - timedelta(hours=val)
    else:
        dt = now - timedelta(days=val)
    return dt.isoformat()


# ---------------------------------------------------------------------------
# Fetchers
# ---------------------------------------------------------------------------

def _fetch_rss_source(source: dict) -> list[dict]:
    """Fetch and parse RSS articles from a single source (max 10)."""
    try:
        resp = httpx.get(source["rss_url"], headers=_HEADERS, timeout=10, follow_redirects=True)
        feed = feedparser.parse(resp.text)
        articles: list[dict] = []

        for entry in feed.entries[:10]:
            pub_date = None
            for attr in ("published_parsed", "updated_parsed"):
                val = getattr(entry, attr, None)
                if val:
                    try:
                        pub_date = datetime(*val[:6]).isoformat()
                    except Exception:
                        pass
                    break

            raw_summary = (
                getattr(entry, "summary", None)
                or getattr(entry, "description", None)
                or ""
            )
            summary = _strip_html(raw_summary)
            if len(summary) > 400:
                summary = summary[:400] + "…"

            articles.append(
                {
                    "id": getattr(entry, "id", None) or getattr(entry, "link", ""),
                    "title": _strip_html(getattr(entry, "title", "")),
                    "summary": summary,
                    "url": getattr(entry, "link", ""),
                    "published_at": pub_date,
                    "source": source["name"],
                    "source_id": source["id"],
                    "source_color": source["color"],
                    "site_url": source["site_url"],
                }
            )

        return articles
    except Exception as exc:
        logger.warning("Failed to fetch RSS from %s: %s", source["name"], exc)
        return []


def _fetch_dailyforex_html(source: dict) -> list[dict]:
    """Scrape DailyForex news page via cloudscraper."""
    try:
        resp = _scraper.get(source["rss_url"], timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        articles: list[dict] = []
        seen_urls: set[str] = set()

        for card in soup.select(".article-info"):
            title_el = card.select_one("a.article-title")
            time_el = card.select_one("time[datetime]")
            desc_el = card.select_one("p.article-description")

            if not title_el:
                continue

            url = title_el.get("href", "")
            if url in seen_urls:
                continue
            seen_urls.add(url)

            full_url = "https://www.dailyforex.com" + url if not url.startswith("http") else url

            pub_date = None
            if time_el and time_el.get("datetime"):
                try:
                    ts_ms = int(time_el["datetime"])
                    pub_date = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).isoformat()
                except Exception:
                    pass

            summary = ""
            if desc_el:
                bottom = desc_el.select_one(".bottom-info")
                if bottom:
                    bottom_text = bottom.get_text(strip=True)
                    summary = desc_el.get_text(separator=" ", strip=True).replace(bottom_text, "").strip()
                else:
                    summary = desc_el.get_text(separator=" ", strip=True)
                if len(summary) > 400:
                    summary = summary[:400] + "…"

            articles.append(
                {
                    "id": full_url,
                    "title": title_el.get_text(strip=True),
                    "summary": summary,
                    "url": full_url,
                    "published_at": pub_date,
                    "source": source["name"],
                    "source_id": source["id"],
                    "source_color": source["color"],
                    "site_url": source["site_url"],
                }
            )

        return articles
    except Exception as exc:
        logger.warning("Failed to scrape DailyForex: %s", exc)
        return []


def _fetch_forexfactory_html(source: dict) -> list[dict]:
    """Scrape ForexFactory news page via cloudscraper (bypasses Cloudflare)."""
    try:
        resp = _scraper.get(source["rss_url"], timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.select(".news-block__item--headline")
        articles: list[dict] = []

        for item in items[:15]:
            title_el = item.select_one(".news-block__title")
            link_el = item.select_one("a")
            detail_el = item.select_one(".news-block__details")
            preview_el = item.select_one(".news-block__preview")

            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            href = link_el.get("href", "") if link_el else ""
            if href and not href.startswith("http"):
                href = "https://www.forexfactory.com" + href

            details = detail_el.get_text(strip=True) if detail_el else ""
            time_match = re.search(r"(\d+\s+(?:min|hr|day)[^\|]*)", details)
            pub_date = _relative_time_to_iso(time_match.group(1)) if time_match else None

            preview = ""
            if preview_el:
                preview = preview_el.get_text(strip=True)
                if len(preview) > 400:
                    preview = preview[:400] + "…"

            articles.append(
                {
                    "id": href,
                    "title": title,
                    "summary": preview,
                    "url": href,
                    "published_at": pub_date,
                    "source": source["name"],
                    "source_id": source["id"],
                    "source_color": source["color"],
                    "site_url": source["site_url"],
                }
            )

        return articles
    except Exception as exc:
        logger.warning("Failed to scrape ForexFactory: %s", exc)
        return []


def _fetch_source(source: dict) -> list[dict]:
    """Dispatch to the correct fetcher based on source type."""
    if source["type"] == "rss":
        return _fetch_rss_source(source)
    elif source["type"] == "html":
        if source["id"] == "dailyforex":
            return _fetch_dailyforex_html(source)
        return _fetch_forexfactory_html(source)
    else:
        return []


# ---------------------------------------------------------------------------
# News
# ---------------------------------------------------------------------------

def fetch_all_news(force: bool = False) -> list[dict]:
    """Return merged, time-sorted news list from all sources (cached)."""
    key = "news"
    if not force and _cache_valid(key, NEWS_CACHE_TTL):
        return _cache[key]["data"]

    all_articles: list[dict] = []
    for src in NEWS_SOURCES:
        all_articles.extend(_fetch_source(src))

    # Sort newest-first; articles without a date go to the end
    all_articles.sort(key=lambda a: a.get("published_at") or "", reverse=True)

    _cache[key] = {"data": all_articles, "ts": time.time()}
    return all_articles


# ---------------------------------------------------------------------------
# Economic Calendar
# ---------------------------------------------------------------------------

def _fetch_ff_event_ids() -> dict[tuple[str, str], str]:
    """
    Scrape ForexFactory calendar HTML to build a (title, country) → event_id map.
    Returns empty dict on failure — detail links will simply be omitted.
    """
    try:
        resp = _scraper.get("https://www.forexfactory.com/calendar", timeout=20)
        soup = BeautifulSoup(resp.text, "html.parser")
        id_map: dict[tuple[str, str], str] = {}

        for row in soup.select("tr[data-event-id]"):
            event_id = row.get("data-event-id", "")
            if not event_id:
                continue
            title_el = row.select_one(".calendar__event-title")
            currency_el = row.select_one(".calendar__currency")
            if title_el and currency_el:
                key = (title_el.get_text(strip=True), currency_el.get_text(strip=True).upper())
                id_map[key] = event_id

        return id_map
    except Exception as exc:
        logger.warning("Failed to scrape ForexFactory event IDs: %s", exc)
        return {}


def fetch_calendar(force: bool = False) -> list[dict]:
    """Return economic calendar events for the current week (ForexFactory)."""
    key = "calendar"
    if not force and _cache_valid(key, CALENDAR_CACHE_TTL):
        return _cache[key]["data"]

    try:
        resp = httpx.get(CALENDAR_URL, headers=_HEADERS, timeout=15, follow_redirects=True)
        raw: list[dict] = resp.json()

        # Fetch event IDs from HTML (best-effort)
        id_map = _fetch_ff_event_ids()

        events = []
        for ev in raw:
            dt_str = ev.get("date", "")
            date_part = ""
            time_part = ""
            try:
                dt = datetime.fromisoformat(dt_str)
                date_part = dt.strftime("%Y-%m-%d")
                time_part = dt.strftime("%H:%M")
            except Exception:
                date_part = dt_str[:10] if dt_str else ""
                time_part = dt_str[11:16] if len(dt_str) > 10 else ""

            title = ev.get("title", ev.get("name", ""))
            country = ev.get("country", "")
            event_id = id_map.get((title, country.upper()), "")
            detail_url = (
                f"https://www.forexfactory.com/calendar#detail={event_id}"
                if event_id else ""
            )

            events.append({
                "title": title,
                "country": country,
                "date": date_part,
                "time": time_part,
                "impact": ev.get("impact", ""),
                "forecast": ev.get("forecast", ""),
                "previous": ev.get("previous", ""),
                "actual": ev.get("actual", ""),
                "source": "ForexFactory",
                "detail_url": detail_url,
            })

        _cache[key] = {"data": events, "ts": time.time()}
        return events
    except Exception as exc:
        logger.warning("Failed to fetch calendar: %s", exc)
        return []
