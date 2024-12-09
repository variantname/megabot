import asyncio
import re
from playwright.async_api import async_playwright, Page, ElementHandle
from utils.logger import logger
from config import (
    COOKIES_DIR,
    USER_SUPPLIES,
    COEFF_VALUES,
    SYSTEM_CONFIG,
    BOOKING_MODES,
    BOOKING_PRIORITIES,
    COEFF_VALUES,
    USER_TYPES,
    USER_LIMITS,
    get_user_cookies_dir,
)

import json
from pathlib import Path
import time
from dataclasses import dataclass
from typing import List, Optional, Dict


class MEGABOT:
    def __init__(self, user_id: str):
        self.browser = None
        self.page = None
        self.playwright = None
        self.context = None
        self.redis_client = None
        self.supply_status = None
        self.auth_status = False
        self.user_id = user_id

        # Создаем базовые директории при инициализации
        COOKIES_DIR.mkdir(parents=True, exist_ok=True)
        user_cookies_dir = get_user_cookies_dir(user_id)
        user_cookies_dir.mkdir(parents=True, exist_ok=True)

        self.cookies_file = user_cookies_dir / "wb_cookies.json"
        self.auth_notification_sent = False

    async def init_browser(self):
        logger.info("Начинаем запуск браузера...")
        try:
            # Запускаем Playwright
            self.playwright = await async_playwright().start()
            logger.info("Playwright запущен")

            # Запускаем браузер с настройками из конфига
            self.browser = await self.playwright.chromium.launch(
                **SYSTEM_CONFIG["browser"]
            )
            logger.info("Браузер запущен")

            # Создаем контекст и страницу
            self.context = await self.browser.new_context()
            self.page = await self.context.new_page()
            logger.info("Страница создана")

            # Пробуем загрузить cookies
            await self.load_cookies()

            # Используем URL из нового конфига
            await self.page.goto(SYSTEM_CONFIG["urls"]["seller"])
            logger.info("Перешли на сайт WB")

            # Ждем результат проверки авторизации
            auth_result = await self.check_auth_status(self.page)
            if not auth_result:
                logger.error("Ошибка авторизации")
                return False

            return True

        except Exception as e:
            logger.error(f"Ошибка: {str(e)}")
            await self.close()
            return False

    async def close(self):
        """Закрытие всех ресурсов"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Все ресурсы закрыты")
        except Exception as e:
            logger.error(f"Ошибка при закрытии ресурсов: {str(e)}")

    async def notification_sender(self, message):
        """Отправка уведомлений
        - В Redis для Monitor Bot
        - В Telegram
        """
        pass

    async def save_cookies(self):
        """Сохранение cookies"""
        try:
            cookies = await self.context.cookies()
            if not cookies:
                logger.error("Нет cookies для сохранения")
                return False

            # Создаем директорию для cookies если её нет
            self.cookies_file.parent.mkdir(parents=True, exist_ok=True)

            with open(self.cookies_file, "w") as f:
                json.dump(cookies, f)
            logger.info(f"Cookies сохранены в {self.cookies_file}")
            return True

        except Exception as e:
            logger.error(f"Ошибка сохранения cookies: {str(e)}")
            return False

    async def load_cookies(self):
        """Загрузка cookies"""
        try:
            if self.cookies_file.exists():
                # Загружаем cookies
                with open(self.cookies_file, "r") as f:
                    cookies = json.load(f)

                if not cookies:
                    logger.error("Файл cookies пустой")
                    return False

                await self.context.add_cookies(cookies)
                logger.info(f"Cookies загружены из {self.cookies_file}")
                return True

            logger.warning(f"Файл cookies не найден: {self.cookies_file}")
            return False

        except Exception as e:
            logger.error(f"Ошибка загрузки cookies: {str(e)}")
            return False

    async def create_supply(self, user_id: str) -> bool:
        logger.info(f"Начинаем создание поставок для пользователя {user_id}")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            # Находим данные пользователя в USER_SUPPLIES
            user_data = next(
                (user for user in USER_SUPPLIES if user["user_id"] == user_id), None
            )
            if not user_data:
                logger.error(f"Пользователь {user_id} не найден")
                return False

            user_supplies = user_data["supplies"]

            # Проверяем права доступа для каждой поставки
            filtered_supplies = []
            for supply in user_supplies:
                if supply["status"]["active"]:
                    user_type = supply.get("user_type", USER_TYPES["FREE"])
                    booking_mode = supply["booking_settings"]["mode"]
                    target_coeff = supply["booking_settings"]["target_coeff"]

                    # Проверяем доступ к ANY_DATE
                    if (
                        booking_mode == BOOKING_MODES["ANY_DATE"]
                        and not USER_LIMITS[user_type]["features"]["any_date"]
                    ):
                        logger.error(
                            f"Режим ANY_DATE недоступен для пользователя типа {user_type}"
                        )
                        continue

                    # Проверяем доступ к ANY коэффициенту
                    if (
                        target_coeff == COEFF_VALUES["ANY"]
                        and not USER_LIMITS[user_type]["features"]["any_coeff"]
                    ):
                        logger.error(
                            f"Режим ANY коэффициент недоступен для пользователя типа {user_type}"
                        )
                        continue

                    filtered_supplies.append(supply)

            # Проверяем лимит на количество поставок для FREE пользователей
            if (
                user_type == USER_TYPES["FREE"]
                and len(filtered_supplies) > USER_LIMITS[user_type]["max_supplies"]
            ):
                logger.warning(
                    f"Превышен лимит активных поставок для пользователя {user_id}"
                )
                return False

            # Создаем задачи только для отфильтрованных поставок
            tasks = []
            for supply in filtered_supplies:
                page = await self.context.new_page()
                task = asyncio.create_task(
                    self.open_supply_by_id(supply=supply, page=page)
                )
                tasks.append(task)
                # await asyncio.sleep(3)  # 2 секунды между поставками

            await asyncio.gather(*tasks)
            return True

        except Exception as e:
            logger.error(
                f"Ошибка запуска поставок для пользователя {user_id}: {str(e)}"
            )
            return False

    async def open_supply_by_id(self, supply: dict, page: Page) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Открываем заказ {preorder_id}")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            supply_url = f"{SYSTEM_CONFIG['urls']['supply']}?preorderId={preorder_id}"

            # Сначала дожидаемся загрузки страницы
            await page.goto(
                supply_url,
                wait_until="networkidle",
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_VALIDATE_SUPPLY_DATA"] * 1000,
            )

            # Запускаем задачи параллельно
            popup_monitor = asyncio.create_task(self.monitor_popups(page, supply))
            validate_task = asyncio.create_task(self.validate_supply_data(page, supply))

            # Ждем завершения validate_task
            await validate_task

            # Отменяем мониторинг попапов при завершении
            popup_monitor.cancel()

            return True

        except Exception as e:
            logger.error(f"Ошибка при открытии поставки {preorder_id}: {str(e)}")
            return False

    async def monitor_popups(self, page: Page, supply: dict = None) -> None:
        """Постоянный мониторинг и закрытие попапов"""
        preorder_id = supply["preorder_id"] if supply else None
        logger.info(f"Запущен мониторинг попапов для {preorder_id}")

        while True:  # Бесконечный цикл
            try:
                await self.check_popups(page, supply)
                # Пауза между проверками
                await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["CHECK_POPUPS_INTERVAL"])

            except Exception as e:
                logger.error(f"Ошибка мониторинга попапов для {preorder_id}: {str(e)}")
                await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["CHECK_POPUPS_INTERVAL"])

    async def check_popups(self, page: Page, supply: dict = None) -> None:
        """Проверка и закрытие попапов"""
        preorder_id = supply["preorder_id"] if supply else None
        logger.info(f"Проверяем наличие попапов для {preorder_id}")

        for popup_name, selectors in SYSTEM_CONFIG["popups"].items():
            try:
                # Ищем кнопку закрытия
                close_button = await page.wait_for_selector(
                    selectors["close"], timeout=1000, state="visible"
                )

                if close_button:
                    logger.info(
                        f"Обнаружен активный попап: {popup_name} для {preorder_id}"
                    )
                    await close_button.click()
                    logger.info(f"Попап {popup_name} закрыт для {preorder_id}")

            except Exception:
                continue  # Если попап не найден или ошибка закрытия - продолжаем проверку других

    async def check_auth_status(self, page: Page) -> bool:
        logger.info("Проверяем статус авторизации...")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            attempts = 0
            while attempts < SYSTEM_CONFIG["timeouts"]["MAX_CHECK_AUTH_ATTEMPTS"]:
                try:
                    navbar = await page.wait_for_selector(
                        SYSTEM_CONFIG["selectors"]["auth"]["authorized"],
                        timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR_AUTH"] * 1000,
                        state="attached",
                    )

                    if navbar:
                        logger.info("Авторизация успешна")
                        # Сохраняем cookies после успешной авторизации
                        if await self.save_cookies():
                            logger.info("Cookies успешно сохранены после авторизации")
                        return True

                except Exception:
                    logger.info(
                        f"Не авторизован. Попытка {attempts + 1}/{SYSTEM_CONFIG['timeouts']['MAX_CHECK_AUTH_ATTEMPTS']}"
                    )

                await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_AUTH"])
                attempts += 1

            logger.error(
                f"Не удалось авторизоваться после {SYSTEM_CONFIG['timeouts']['MAX_CHECK_AUTH_ATTEMPTS']} попыток"
            )
            asyncio.create_task(self.auth_false())
            return False

        except Exception as e:
            logger.error(f"Ошибка проверки авторизации: {str(e)}")
            asyncio.create_task(self.auth_false())
            return False

    async def auth_false(self) -> bool:
        if self.auth_notification_sent:
            return True

        self.auth_notification_sent = True
        asyncio.create_task(self.notification_sender("Требуется авторизация"))
        return True

    async def validate_supply_data(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Проверяем данные заказа {preorder_id}")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        max_attempts = SYSTEM_CONFIG["timeouts"]["MAX_VALIDATE_SUPPLY_DATA_ATTEMPTS"]
        attempt = 0

        while attempt < max_attempts:
            try:
                # Сразу проверяем ID поставки
                preorder_element = await page.wait_for_selector(
                    SYSTEM_CONFIG["selectors"]["supply"]["preorder_id_selector"],
                    timeout=SYSTEM_CONFIG["timeouts"]["WAIT_VALIDATE_SUPPLY_DATA"]
                    * 1000,
                    state="visible",
                )

                if not preorder_element:
                    logger.error(f"Не найден элемент с номером заказа - {preorder_id}")
                    attempt += 1
                    continue

                text = await preorder_element.inner_text()
                page_id = text.split("№")[-1].strip()

                if page_id == preorder_id:
                    logger.info(f"ID заказа {preorder_id} подтвержден")
                    return await self.open_calendar(page, supply)

                logger.error(
                    f"Неверный номер заказа. На странице: {page_id}, ожидался: {preorder_id}"
                )
                return False

            except Exception as e:
                logger.error(
                    f"Попытка {attempt + 1}: Ошибка проверки данных поставки {preorder_id}: {str(e)}"
                )
                attempt += 1
                await asyncio.sleep(
                    SYSTEM_CONFIG["timeouts"]["WAIT_VALIDATE_SUPPLY_DATA_INTERVAL"]
                )

        # Если все попытки неудачны
        logger.error(f"Поставка {preorder_id} не найдена после {max_attempts} попыток")
        await self.notification_sender(
            f"Поставка {preorder_id} не найдена. Проверьте правильность номера Заказа."
        )
        return False

    async def open_calendar(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Открываем календарь для заказа {preorder_id}")

        max_attempts = 3
        attempt = 0

        while attempt < max_attempts:
            try:
                # Ждем кнопку планирования
                plan_button = await page.wait_for_selector(
                    SYSTEM_CONFIG["selectors"]["supply"]["plan_button"],
                    timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                    state="visible",
                )

                if not plan_button:
                    logger.error(
                        f"Попытка {attempt + 1}: Кнопка планирования не найдена - {preorder_id}"
                    )
                    attempt += 1
                    continue

                # Кликаем по кнопке
                await plan_button.click()
                logger.info(f"Кликнули по кнопке планирования - {preorder_id}")

                # Ждем появления календаря
                calendar = await page.wait_for_selector(
                    SYSTEM_CONFIG["selectors"]["calendar"]["container"],
                    timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                    state="visible",
                )

                if calendar:
                    logger.info(f"Календарь открыт - {preorder_id}")
                    # Даем время на полную загрузку календаря
                    await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_ANIMATION"])
                    asyncio.create_task(self.find_date_block(page, supply))
                    return True

                logger.error(
                    f"Попытка {attempt + 1}: Календарь не появился после клика - {preorder_id}"
                )

            except Exception as e:
                logger.error(
                    f"Попытка {attempt + 1}: Ошибка открытия календаря - {preorder_id}: {str(e)}"
                )

            attempt += 1
            await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_ANIMATION"])

        logger.error(
            f"Не удалось открыть календарь после {max_attempts} попыток - {preorder_id}"
        )
        return False

    async def find_date_block(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        try:
            logger.info(f"Ищем подходящую дату - {preorder_id}")
            await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

            # Получаем список дат для поиска
            target_dates = await self.get_target_dates(page, supply)
            if not target_dates:
                logger.error(f"Не найдены целевые даты для поиска - {preorder_id}")
                return False

            logger.info(f"Будем искать следующие даты: {target_dates}")

            # Ищем подходящий блок
            target_block = await self.process_target_dates(page, target_dates, supply)
            if not target_block:
                return False

            # Запускаем выбор даты
            asyncio.create_task(self.select_date(page, target_block, supply))
            return True

        except Exception as e:
            logger.error(f"Ошибка при поиске даты - {preorder_id}: {str(e)}")
            return False

    async def get_target_dates(self, page: Page, supply: dict) -> List[str]:
        """Получает список дат для поиска в календаре"""
        preorder_id = supply["preorder_id"]
        booking_settings = supply["booking_settings"]
        target_dates = []

        try:
            logger.info(f"Получаем целевые даты для поставки {preorder_id}")

            if booking_settings["mode"] == BOOKING_MODES["SPECIFIC_DATES"]:
                # Для конкретных дат просто берем их из настроек
                target_dates = booking_settings["target_dates"]
                logger.info(
                    f"Для {preorder_id} взяты конкретные даты из настроек: {target_dates}"
                )

            else:  # ANY_DATE
                # Собираем все непустые даты из календаря
                date_cells = await page.query_selector_all(
                    SYSTEM_CONFIG["selectors"]["calendar"]["date_container"]
                )

                for cell in date_cells:
                    date_element = await cell.query_selector(
                        SYSTEM_CONFIG["selectors"]["calendar"]["date_text"]
                    )
                    if date_element:
                        date_text = await date_element.inner_text()
                        target_dates.append(date_text)

                logger.info(
                    f"Для {preorder_id} собраны все даты из календаря: {target_dates}"
                )

            return target_dates

        except Exception as e:
            logger.error(
                f"Ошибка при получении целевых дат для {preorder_id}: {str(e)}"
            )
            return []

    async def process_target_dates(
        self, page: Page, target_dates: List[str], supply: dict
    ) -> Optional[ElementHandle]:
        """Обрабатывает список дат и возвращает подходящий блок календаря"""
        preorder_id = supply["preorder_id"]
        booking_settings = supply["booking_settings"]
        target_coeff = booking_settings["target_coeff"]

        try:
            logger.info(f"Обрабатываем даты для {preorder_id}")
            suitable_blocks = []

            # Для каждой даты ищем её блок в календаре
            for date in target_dates:
                # Ищем блок с этой датой
                date_blocks = await page.query_selector_all(
                    SYSTEM_CONFIG["selectors"]["calendar"]["cell"]
                )

                for block in date_blocks:
                    # Проверяем дату
                    date_container = await block.query_selector(
                        SYSTEM_CONFIG["selectors"]["calendar"]["date_container"]
                    )
                    if not date_container:
                        continue

                    date_element = await date_container.query_selector(
                        SYSTEM_CONFIG["selectors"]["calendar"]["date_text"]
                    )
                    if not date_element:
                        continue

                    current_date = await date_element.inner_text()
                    if current_date != date:
                        continue

                    # Проверяем коэффициент
                    coeff_element = await block.query_selector(
                        SYSTEM_CONFIG["selectors"]["calendar"]["coeff"]["coeff_value"]
                    )
                    if not coeff_element:
                        continue

                    coeff_text = await coeff_element.inner_text()
                    coeff = 0 if coeff_text == COEFF_VALUES["FREE"] else int(coeff_text)

                    # Проверяем подходит ли коэффициент
                    if target_coeff == COEFF_VALUES["FREE"] and coeff != 0:
                        continue
                    elif target_coeff != COEFF_VALUES["ANY"] and coeff > int(
                        target_coeff
                    ):
                        continue

                    # Если дошли до сюда - блок подходит
                    suitable_blocks.append(
                        {"block": block, "date": date, "coeff": coeff}
                    )

            if not suitable_blocks:
                logger.error(f"Не найдено подходящих дат для {preorder_id}")
                return None

            # Сортируем блоки
            if booking_settings["mode"] == BOOKING_MODES["ANY_DATE"]:
                # Для ANY_DATE сортируем по дате
                sorted_blocks = sorted(suitable_blocks, key=lambda x: x["date"])
            else:
                # Для SPECIFIC_DATES учитываем приоритет
                if booking_settings["priority"] == BOOKING_PRIORITIES["BY_COEFF"]:
                    sorted_blocks = sorted(
                        suitable_blocks, key=lambda x: (x["coeff"], x["date"])
                    )
                else:
                    sorted_blocks = sorted(suitable_blocks, key=lambda x: x["date"])

            best_block = sorted_blocks[0]["block"]
            logger.info(
                f"Найден подходящий блок для даты {sorted_blocks[0]['date']} с коэффициентом {sorted_blocks[0]['coeff']}"
            )

            return best_block

        except Exception as e:
            logger.error(f"Ошибка при обработке дат для {preorder_id}: {str(e)}")
            return None

    async def validate_date_block(
        self, page: Page, target_date_block, supply: dict
    ) -> bool:
        logger.info(
            f"Проверяем доступность даты для поставки {supply['preorder_id']}..."
        )
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            # Получаем класс родительского элемента
            cell_class = await target_date_block.get_attribute("class")

            if "is-disabled" in cell_class:
                logger.error(f"Выбранная дата недоступна - {supply['preorder_id']}")
                asyncio.create_task(self.close_calendar(page, supply))
                return False

            logger.info(f"Дата доступна - {supply['preorder_id']}")
            asyncio.create_task(self.validate_coeff(page, target_date_block, supply))
            return True

        except Exception as e:
            logger.error(
                f"Ошибка при проверке доступности даты - {supply['preorder_id']}: {str(e)}"
            )
            return False

    async def validate_coeff(self, page: Page, target_date_block, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        booking_settings = supply["booking_settings"]
        target_coeff = booking_settings["target_coeff"]

        logger.info(f"Проверяем коэффициент для {preorder_id}...")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            # Ищем значение коэффициента
            coeff_value_span = await target_date_block.wait_for_selector(
                SYSTEM_CONFIG["selectors"]["calendar"]["coeff"]["coeff_value"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                state="visible",
            )

            if not coeff_value_span:
                logger.error(f"Не найдено значение коэффициента для {preorder_id}")
                return False

            # Получаем текст коэффициента
            coeff_text = await coeff_value_span.inner_text()

            # Преобразуем коэффициент
            if coeff_text == COEFF_VALUES["FREE"]:
                real_coeff = 0
            else:
                try:
                    real_coeff = int(coeff_text)
                except ValueError:
                    logger.error(
                        f"{preorder_id}: Неожиданное значение коэффициента: {coeff_text}"
                    )
                    return False

            # Проверяем коэффициент в зависимости от настроек
            if target_coeff == COEFF_VALUES["FREE"] and real_coeff == 0:
                logger.info(f"Найден бесплатный слот - {preorder_id}")
                asyncio.create_task(self.select_date(page, target_date_block, supply))
                return True

            elif target_coeff == COEFF_VALUES["ANY"]:
                logger.info(f"{preorder_id}: Принят любой коэффициент ({real_coeff})")
                asyncio.create_task(self.select_date(page, target_date_block, supply))
                return True

            elif real_coeff <= int(target_coeff):
                logger.info(
                    f"{preorder_id}: Коэффициент подходит: {real_coeff} <= {target_coeff}"
                )
                asyncio.create_task(self.select_date(page, target_date_block, supply))
                return True

            else:
                logger.error(
                    f"{preorder_id}: Текущий коэффициент {real_coeff} больше целевого {target_coeff}"
                )
                asyncio.create_task(self.close_calendar(page, supply))
                return False

        except Exception as e:
            logger.error(f"{preorder_id}: Ошибка при проверке коэффициента: {str(e)}")
            return False

    async def close_calendar(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Закрываем календарь для поставки {preorder_id}...")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            # Ждем кнопку закрытия
            close_button = await page.wait_for_selector(
                SYSTEM_CONFIG["selectors"]["calendar"]["close_button"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                state="visible",
            )

            if not close_button:
                logger.error("Кнопка закрытия календаря не найдена")
                return False

            # Кликаем по кнопке
            await close_button.click()
            logger.info("Календарь закрыт")

            # Запускаем повторное открытие календаря через интервал
            await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["CHECK_DATE_INTERVAL"])
            asyncio.create_task(self.open_calendar(page, supply))
            return True

        except Exception as e:
            logger.error(f"Ошибка при закрытии календаря {preorder_id}: {str(e)}")
            return False

    async def select_date(self, page: Page, target_date_block, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        booking_settings = supply["booking_settings"]
        target_date = (
            booking_settings["target_dates"][0]
            if booking_settings["target_dates"]
            else "ближайшая"
        )

        logger.info(f"Выбираем дату {target_date} для поставки {preorder_id}...")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            # Наводим курсор на ячейку
            await target_date_block.hover()
            logger.info(f"{preorder_id}: Курсор наведен на ячейку")

            # Ждем появления кнопки после hover эффекта
            select_button = await target_date_block.wait_for_selector(
                SYSTEM_CONFIG["selectors"]["calendar"]["select_button"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                state="visible",
            )

            if not select_button:
                logger.error(f"{preorder_id}: Кнопка выбора даты не появилась")
                return False

            # Кликаем по кнопке
            await select_button.click()
            logger.info(f"Дата {target_date} выбрана для поставки {preorder_id}")

            # Вызываем бронирование
            asyncio.create_task(self.book_date(page, supply))
            return True

        except Exception as e:
            logger.error(f"{preorder_id}: Ошибка при выборе даты: {str(e)}")
            return False

    async def book_date(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]

        logger.info(f"Бронируем дату для поставки {preorder_id}...")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            # Ждем появления кнопки "Запланировать"
            book_button = await page.wait_for_selector(
                SYSTEM_CONFIG["selectors"]["calendar"]["book_button"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                state="visible",
            )

            if not book_button:
                logger.error(f"{preorder_id}: Кнопка 'Запланировать' не найдена")
                return False

            # Кликаем по кнопке
            await book_button.click()
            logger.info(f"Запрос на бронирование отправлен для поставки {preorder_id}")

            # Проверяем результат бронирования
            asyncio.create_task(self.validate_book_date(page, supply))
            return True

        except Exception as e:
            logger.error(f"{preorder_id}: Ошибка при бронировании даты: {str(e)}")
            return False

    async def validate_book_date(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Проверяем результат бронирования для поставки {preorder_id}...")
        await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_DEBUG"])

        try:
            # Ждем изменения URL
            start_time = time.time()
            while (
                time.time() - start_time < SYSTEM_CONFIG["timeouts"]["WAIT_BOOK_DATE"]
            ):
                current_url = page.url
                if "supplyId" in current_url:
                    supply_id = current_url.split("supplyId=")[-1]
                    logger.info(f"Поставка {preorder_id} получила номер {supply_id}")

                    # Обновляем статус поставки
                    supply["status"]["supply_id"] = supply_id
                    supply["status"]["booked"] = True
                    break
                await asyncio.sleep(1)
            else:
                logger.error(
                    f"Поставка {preorder_id}: URL не изменился за {SYSTEM_CONFIG['timeouts']['WAIT_BOOK_DATE']} секунд"
                )
                return False

            # Проверяем заголовок поставки
            supply_title = await page.wait_for_selector(
                SYSTEM_CONFIG["selectors"]["booking"]["supply_title"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                state="visible",
            )

            if not supply_title:
                logger.error(
                    f"Поставка {preorder_id}: Не найден заголовок с номером поставки"
                )
                return False

            # Проверяем статус
            status_badge = await page.wait_for_selector(
                SYSTEM_CONFIG["selectors"]["booking"]["status_badge"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                state="visible",
            )

            if not status_badge:
                logger.error(
                    f"Поставка {preorder_id}: Не найден статус 'Запланировано'"
                )
                return False

            logger.info(
                f"Поставка {preorder_id} успешно забронирована и получила номер {supply_id}"
            )

            # Отправляем уведомление об успешном бронировании
            asyncio.create_task(
                self.notification_sender(
                    f"Поставка {preorder_id} успешно забронирована\nНомер поставки: {supply_id}"
                )
            )
            return True

        except Exception as e:
            logger.error(
                f"Ошибка при проверке бронирования поставки {preorder_id}: {str(e)}"
            )
            return False


async def main():
    logger.info("СТАРТ РАБОТЫ БОТА")
    bots = []  # Список активных ботов

    try:
        # Создаем отдельного бота для каждого пользователя
        for user_data in USER_SUPPLIES:
            user_id = user_data["user_id"]
            logger.info(f"Инициализация бота для пользователя {user_id}")

            bot = MEGABOT(user_id)
            if await bot.init_browser():  # Свой браузер для каждого бота
                bots.append(bot)
                # Запускаем обработку поставок в отдельной корутине
                asyncio.create_task(bot.create_supply(user_id))
            else:
                logger.error(f"❌ Ошибка инициализации браузера для {user_id}")

        # Держим главный поток активным
        while True:
            await asyncio.sleep(60)

    except KeyboardInterrupt:
        logger.info("Получен сигнал остановки")
    finally:
        # Закрываем все браузеры
        for bot in bots:
            await bot.close()
        logger.info("ЗАВЕРШЕНИЕ РАБОТЫ БОТА")


if __name__ == "__main__":
    asyncio.run(main())
