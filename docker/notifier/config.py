import os

IMAGEBOARD: str = os.environ['NOTIFIER_SITE_URL']
ACCOUNT_USERNAME: str = os.environ['NOTIFIER_USERNAME']
ACCOUNT_PASSWORD: str = os.environ['NOTIFIER_PASSWORD']
HTTP_USERNAME: str = os.environ.get('HTTP_USERNAME', None)
HTTP_PASSWORD: str = os.environ.get('HTTP_PASSWORD', None)

"""Notifications"""
USE_TERMUX_API: bool = False

"""Reports watcher"""
WATCH_REPORTS: bool = True
FETCH_REPORTS_INTERVAL: int = 60 * 1
REPORTS_BOARDS: tuple = (
    None,
    'plaza',
    'meta',
)

"""Recent watcher"""
WATCH_RECENT: bool = True
RECENT_RECONNECTION_DELAY: int = 25
RECENT_BOARDS: tuple = (
    None,
)

BLACKLIST: tuple = (
    None,
)
TRIGGER_OFFSET: int = 25
TRIGGER_WRAPPER: str = "*"

URL_WHITELIST: tuple = None

"""Session Settings"""
REQUEST_RETRIES: int = 6  # number of allowed retries
RETRIES_BACKOFF_FACTOR: float = 3  # sleep factor between retries, defines how the backoff grows
REQUEST_TIMEOUT: int = 15  # max wait time for a server response (in seconds)

"""Atom Feeds"""
FEED_AUTHOR_NAME: str = "Marzitan"
FEED_LOGO: str = f"https://{IMAGEBOARD}/file/web-app-manifest-192x192.png"
FEED_LANGUAGE: str = "en"

REPORTS_FEED_TITLE: str = "Marzichan Reports"
REPORTS_FEED_SUBTITLE: str = "The most recent reports on Marzichan."
REPORTS_FEED_URL: str = f"https://{IMAGEBOARD}/feed/reports.atom"
REPORTS_FEED_PATH: str = "/opt/jschan/static/feed/reports.atom"

RECENT_FEED_TITLE: str = "Marzichan Posts"
RECENT_FEED_SUBTITLE: str = "The most recent posts on Marzichan."
RECENT_FEED_URL: str = f"https://{IMAGEBOARD}/feed/posts.atom"
RECENT_FEED_PATH: str = "/opt/jschan/static/feed/posts.atom"

"""Discord Webhooks"""
RECENT_WEBHOOK: str = os.environ['NOTIFIER_RECENT_WEBHOOK']
REPORTS_WEBHOOK: str = os.environ['NOTIFIER_REPORTS_WEBHOOK']
