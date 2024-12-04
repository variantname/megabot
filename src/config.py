from pathlib import Path

# Пути для файлов
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
COOKIES_DIR = DATA_DIR / "cookies"

# Базовые настройки
BASE_DIR = Path(__file__).parent.parent
HEADLESS = False  # False для отладки
SELLER_WB_URL = "https://seller.wildberries.ru/"

# Пути для хранения данных
COOKIES_DIR = BASE_DIR / "data" / "cookies"

# Настройки браузера
BROWSER_CONFIG = {"headless": HEADLESS, "args": ["--no-sandbox"]}

# Таймауты и интервалы (все значения в секундах)
SUPPLY_CHECK_INTERVAL = 12  # секунд между проверками
PAGE_TIMEOUT = 0
WAIT_DEBUG = 0.1  # секунды для отладки
WAIT_AUTH = 3  # секунды для отладки
MAX_CHECK_AUTH_ATTEMPTS = 5  # секунды между проверками авторизации
WAIT_VALIDATE_SUPPLY_DATA = 30  # секунды для ожидания страницы с поставкой
WAIT_VALIDATE_SUPPLY_DATA_INTERVAL = 15  # секунды между проверками данных поставки
MAX_VALIDATE_SUPPLY_DATA_ATTEMPTS = 3  # секунды между проверками данных поставки
WAIT_ANIMATION = 0.5  # секунды для ожидания анимаций
WAIT_NETWORK = 30  # секунды для ожидания сети
WAIT_SELECTOR = 30  # секунды для ожидания селекторов
WAIT_SELECTOR_AUTH = 30  # секунды для ожидания селекторов
AUTH_TIMEOUT = 60  # секунды на авторизацию
CHECK_POPUPS_INTERVAL = 5  # секунды между попытками очистки попапов
MAX_CLOSE_POPUP_ATTEMPTS = 5  # максимум попыток очистки попапов
CHECK_DATE_INTERVAL = 12  # секунды между проверками даты
WAIT_BOOK_DATE = 60  # секунды для ожидания результата бронирования

SUPPLY_DATE_URL = "https://seller.wildberries.ru/supplies-management/all-supplies/supply-detail/uploaded-goods"

COEFF_VALUES = {"FREE": "Бесплатно", "ANY": "Любой", "VALUES": [5, 10, 15, 20]}


SUPPLIES = [
    {
        "preorder_id": "33011974",
        "warehouse_name": "СЦ Астрахань",
        "warehouse_id": "",
        "target_date": "8 декабря",
        "target_coeff_value": "Любой",
    },
    # {
    #     "preorder_id": "328232311",
    #     "warehouse_name": "Коледино",
    #     "warehouse_id": "",
    #     "target_date": "9 декабря",
    #     "target_coeff_value": "10",
    # },
]

# Добавим список известных попапов
POPUPS = {
    "cookies": {
        "container": 'div[id="Portal-warning-cookies-modal"]',
        "close": 'button:has(span:text("Принимаю"))',
    },
    # "help_center": {
    #     "container": '[class^="Help-center-absolute-button"]',
    #     "close": '[class^="Help-center-absolute-button__"]',
    # },
    # "quiz": {
    #     "container": "#Portal-quiz-modal",
    #     "close": '[data-testid="quiz-modal-close-button"]',
    # },
    # "tutorial_portal": {
    #     "container": "#react-joyride-portal",
    #     "close": '[data-testid="tutorial-skip-button"]',
    # },
    "tutorial_step": {
        "container": 'div[id^="react-joyride"]',
        "close": 'div[class^="Tooltip-hint-view__close-button"][data-action="close"][aria-label="Close"]',
    },
    # "tutorial_overlay": {
    #     "container": ".react-joyride__overlay",
    #     "close": '[data-testid="tutorial-skip-button"]',
    # },
}

# Селекторы WB
WB_SELECTORS = {
    "auth": {
        "authorized": "#Portal-header",  # Хедер портала (есть только у авторизованных)
    },
    "supply": {
        "preorder_id_selector": 'div[class^="Supply-detail-options__title-main"] span[data-name="Text"]:has-text("Заказ №")',
        "plan_button": 'button:has(span:text("Запланировать поставку"))',
        "next_button": '[data-testid="steps-next-button-desktop-button-primary"]',
    },
    "calendar": {
        "container": ".Calendar-plan-table-view",
        "cell": 'td[class^="Calendar-cell"]',
        "date_container": 'div[class^="Calendar-cell__date-container"]',
        "date_text": "span",
        "close_button": '#Portal-modal div[class^="Modal__close-button"] button',
        "coeff": {
            "coeff_value": "div[class^='Calendar-cell__amount-cost'] div[class^='Coefficient-table-cell'] div[class^='Coefficient-block__coefficient-text'] span[class*='Text--body-s']",
        },
        "select_button": 'div[class^="Custom-popup"] button:has-text("Выбрать")',
        "book_button": 'div[class^="Calendar-plan-buttons"] button:has(span:text("Запланировать"))',
    },
    "booking": {
        "supply_title": 'div[class^="Supply-detail-options__title-main"] span[data-name="Text"]:has-text("Поставка №")',
        "status_badge": 'div[class^="Supply-detail-options__badge"] span[data-name="Badge"]:has-text("Запланировано")',
    },
}

# eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjQxMTE4djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTc0ODc4MjUzNywiaWQiOiIwMTkzN2ZiNy00NGY4LTdiNzgtODRkMC0yYjZiZjA4NGNhM2MiLCJpaWQiOjEyMDk1MjczLCJvaWQiOjMwODIyLCJzIjoxMDczNzQyODQ4LCJzaWQiOiJkYjI4ZWZmZi1mN2E5LTUyZjgtODM0Mi1mMWE1OGY3ZDhlZDMiLCJ0IjpmYWxzZSwidWlkIjoxMjA5NTI3M30.M_GLRh1qVa__X0oXuKHiIQfkQ01nnu3uLScuJZsfOwu8718J1NnltB2_-0KPEBqDY8RvQW2IGEeSIcEPJ_tE2Q

# https://seller.wildberries.ru/supplies-management/new-supply/choose-date?warehouseId=&draftID=&transitWarehouseId=&preorderId=32932680

# https://seller.wildberries.ru/supplies-management/new-supply/choose-date?preorderID=32816035

# https://seller.wildberries.ru/supplies-management/new-supply/choose-date?warehouseId=&draftID=&transitWarehouseId=&preorderID=33009882

# Возможные значения коэффициентов
