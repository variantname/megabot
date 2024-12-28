from pathlib import Path

# Пути
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "users_data"
COOKIES_DIR = DATA_DIR / "cookies"


def get_user_cookies_dir(user_id: str) -> Path:
    return COOKIES_DIR / user_id


WB_SELECTORS = {
    "auth": {
        "authorized": "#Portal-header",
        "inn": 'div[class^="Operating-account-form__wrapper"] input[id="inn"]',
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
        "date_is_disabled": "is-disabled",
        "book_button": 'div[class^="Calendar-plan-buttons"] button:has(span:text("Запланировать"))',
    },
    "booking": {
        "supply_title": 'div[class^="Supply-detail-options__title-main"] span[data-name="Text"]:has-text("Поставка №")',
        "status_badge": 'div[class^="Supply-detail-options__badge"] span[data-name="Badge"]:has-text("Запланировано")',
    },
}

POPUPS = {
    "other_modal": {
        # "container": 'div[id="Portal-modal"]',
        "close": 'div[id="Portal-modal"] button:has(span:text("Понятно"))',
    },
    "cookies": {
        # "container": 'div[id="Portal-warning-cookies-modal"]',
        "close": 'div[id="Portal-warning-cookies-modal"] button:has(span:text("Принимаю"))',
    },
    # "help_center": {
    #     "container": '[class^="Help-center-absolute-button"]',
    #     "close": '[class^="Help-center-absolute-button__"]',
    # },
    "quiz": {
        # "container": "",
        "close": '#Portal-quiz-modal button:has(span:text("Отменить"))',
    },
    # "tutorial_portal": {
    #     "container": "#react-joyride-portal",
    #     "close": '[data-testid="tutorial-skip-button"]',
    # },
    "tutorial_step": {
        # "container": 'div[id^="react-joyride"]',
        "close": 'div[class^="Tooltip-hint-view__close-button"][data-action="close"][aria-label="Close"]',
    },
    # "tutorial_overlay": {
    #     "container": ".react-joyride__overlay",
    #     "close": '[data-testid="tutorial-skip-button"]',
    # },
}

# Системные настройки
SYSTEM_CONFIG = {
    "timeouts": {
        "SUPPLY_CHECK_INTERVAL": 12,  # секунд между проверками
        "PAGE_TIMEOUT": 0,
        "WAIT_DEBUG": 0.1,  # секунды для отладки
        "WAIT_AUTH": 3,  # секунды для отладки
        "MAX_CHECK_AUTH_ATTEMPTS": 5,  # секунды между проверками авторизации
        "WAIT_VALIDATE_SUPPLY_DATA": 15,  # секунды для ожидания страницы с поставкой
        "WAIT_VALIDATE_SUPPLY_DATA_INTERVAL": 5,  # секунды между проверками данных поставки
        "MAX_VALIDATE_SUPPLY_DATA_ATTEMPTS": 2,  # секунды между проверками данных поставки
        "WAIT_ANIMATION": 0.5,  # секунды для ожидания анимаций
        "WAIT_NETWORK": 30,  # секунды для ожидания сети
        "WAIT_SELECTOR": 30,  # секунды для ожидания селекторов
        "WAIT_SELECTOR_AUTH": 30,  # секунды для ожидания селекторов
        "AUTH_TIMEOUT": 60,  # секунды на авторизацию
        "CHECK_POPUPS_INTERVAL": 5,  # секунды между попытками очистки попапов
        "MAX_CLOSE_POPUP_ATTEMPTS": 25,  # максимум попыток очистки попапов
        "CHECK_DATE_INTERVAL": 5,  # секунды между проверками даты
        "WAIT_BOOK_DATE": 60,
        "COOKIES_TTL": 3600,  # секунды для ожидания результата бронирования
        "CHECK_USER_ID_INTERVAL": 300,  # секунды между проверками ID поставщика
    },
    "browser": {"headless": False, "args": ["--no-sandbox"]},
    "urls": {
        "seller": "https://seller.wildberries.ru/",
        "supply": "https://seller.wildberries.ru/supplies-management/all-supplies/supply-detail/uploaded-goods",
        "supplier_card": "https://seller.wildberries.ru/supplier-settings/supplier-card",
    },
    "selectors": WB_SELECTORS,
    "popups": POPUPS,
}

# Константы для настроек бронирования
BOOKING_MODES = {"SPECIFIC_DATES": "SPECIFIC_DATES", "ANY_DATE": "ANY_DATE"}

BOOKING_PRIORITIES = {
    "BY_LOWER_COEFF": "BY_LOWER_COEFF",
    "BY_CLOSEST_DATE": "BY_CLOSEST_DATE",
}

COEFF_VALUES = {
    "COEFF_FREE": "COEFF_FREE",
    "COEFF_ANY": "COEFF_ANY",
    "COEFF_VALUE": [5, 10, 15, 20],
}

USER_TYPES = {"USER_FREE": "USER_FREE", "USER_PAID": "USER_PAID"}

# Лимиты для разных типов пользователей
USER_LIMITS = {
    USER_TYPES["USER_FREE"]: {
        "max_supplies": 3,  # Максимум 3 активные поставки
        "features": {
            "any_date": True,  # Нет доступа к режиму "Любая дата"
            "any_coeff": True,  # Нет доступа к режиму "Любой коэффициент"
        },
    },
    USER_TYPES["USER_PAID"]: {
        "max_supplies": None,  # Без ограничений
        "features": {
            "any_date": True,  # Доступен режим "Любая дата"
            "any_coeff": True,  # Доступен режим "Любой коэффициент"
        },
    },
}

# Тестовые поставки (потом заменим на данные из БД)
USER_SUPPLIES = [
    {
        "user_id": "860236680501",
        "supplies": [
            {
                "supply_id": "test_supply_3",
                "user_type": USER_TYPES["USER_FREE"],
                "preorder_id": "33373903",
                "warehouse_name": "Новосибирск Пасечная",
                "warehouse_id": "",
                "booking_settings": {
                    "mode": BOOKING_MODES["SPECIFIC_DATES"],
                    "target_dates": [
                        "23 декабря",
                        "24 декабря",
                        "25 декабря",
                        "26 декабря",
                        "27 декабря",
                        "28 декабря",
                        "29 декабря",
                    ],
                    # "mode": BOOKING_MODES["ANY_DATE"],
                    # "target_dates": None,
                    "priority": BOOKING_PRIORITIES["BY_CLOSEST_DATE"],
                    "target_coeff": COEFF_VALUES["COEFF_VALUE"][1],  # 5
                    # "target_coeff": COEFF_VALUES["COEFF_FREE"],
                },
                "status": {
                    "active": True,
                    "attempts_count": 0,
                    "booked": False,
                    "supply_id": None,
                },
            },
            {
                "supply_id": "test_supply_1",
                "user_type": USER_TYPES["USER_FREE"],
                "preorder_id": "33203923",
                "warehouse_name": "СЦ Новосибирск Пасечная",
                "warehouse_id": "",
                "booking_settings": {
                    "mode": BOOKING_MODES["SPECIFIC_DATES"],
                    "target_dates": ["11 декабря", "30 декабря"],
                    "priority": BOOKING_PRIORITIES["BY_LOWER_COEFF"],
                    "target_coeff": COEFF_VALUES["COEFF_VALUE"][0],  # 5
                },
                "status": {
                    "active": False,
                    "attempts_count": 0,
                    "booked": False,
                    "supply_id": None,
                },
            },
            {
                "supply_id": "test_supply_2",
                "preorder_id": "33262463",
                "warehouse_name": "СЦ Архангельск",
                "warehouse_id": "",
                "booking_settings": {
                    "mode": BOOKING_MODES["SPECIFIC_DATES"],
                    "target_dates": [
                        # "17 декабря",
                        # "19 декабря",
                        # "18 декабря",
                        "23 декабря",
                    ],
                    "priority": None,
                    # "target_coeff": COEFF_VALUES["COEFF_VALUE"][0],  # 5
                    "target_coeff": COEFF_VALUES["COEFF_FREE"],  # "Любой"
                },
                "status": {
                    "active": False,
                    "attempts_count": 0,
                    "booked": False,
                    "supply_id": None,
                },
            },
        ],
    }
]
