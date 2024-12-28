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
        self.user_id_validated = False

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
            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080}
            )

            self.page = await self.context.new_page()
            logger.info("Страница создана")

            # Пробуем загрузить cookies
            await self.load_cookies()

            # Используем URL из нового конфига
            await self.page.goto(
                SYSTEM_CONFIG["urls"]["seller"],
                timeout=SYSTEM_CONFIG["timeouts"]["AUTH_TIMEOUT"] * 1000,
                wait_until="domcontentloaded",
            )
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

        if not self.user_id_validated:
            logger.error("ID поставщика не валиден")
            return False

        # Запускаем мониторинг ID в фоновом режиме
        asyncio.create_task(self.monitor_user_id(self.page))

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
                    user_type = supply.get("user_type", USER_TYPES["USER_FREE"])
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
                        target_coeff == COEFF_VALUES["COEFF_ANY"]
                        and not USER_LIMITS[user_type]["features"]["any_coeff"]
                    ):
                        logger.error(
                            f"Режим ANY коэффициент недоступен для пользователя типа {user_type}"
                        )
                        continue

                    filtered_supplies.append(supply)

            # Проверяем лимит на количество поставок для FREE пользователей
            if (
                user_type == USER_TYPES["USER_FREE"]
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
        max_attempts = 2  # В конфиг
        attempt = 0

        while attempt < max_attempts:
            try:
                supply_url = (
                    f"{SYSTEM_CONFIG['urls']['supply']}?preorderId={preorder_id}"
                )
                await page.goto(supply_url)

                popup_monitor = asyncio.create_task(self.monitor_popups(page, supply))
                validate_result = await self.validate_supply_data(page, supply)

                if validate_result:
                    popup_monitor.cancel()
                    return True

                # Если validate_supply_data вернул False:
                logger.info(
                    f"Попытка {attempt + 1}: Перезапуск вкладки для {preorder_id}"
                )
                popup_monitor.cancel()

                # Если это последняя попытка
                if attempt == max_attempts - 1:
                    await page.close()
                    logger.error(
                        f"Отправляем сообщение о недоступности поставки {preorder_id}"
                    )
                    await self.notification_sender(
                        f"Поставка {preorder_id} недоступна после {max_attempts} попыток"
                    )
                    return False

                # Если есть ещё попытки - создаём новую вкладку
                await page.close()
                page = await self.context.new_page()
                attempt += 1
                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"Ошибка при открытии поставки {preorder_id}: {str(e)}")
                return False

        return False

    async def monitor_popups(self, page: Page, supply: dict = None) -> None:
        """Постоянный мониторинг и закрытие попапов"""
        preorder_id = supply["preorder_id"] if supply else None
        logger.info(f"{preorder_id} - Запущен мониторинг попапов для ")

        while True:  # Бесконечный цикл
            try:
                await self.check_popups(page, supply)
                # Пауза между проверками
                await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["CHECK_POPUPS_INTERVAL"])

            except Exception as e:
                logger.error(f"{preorder_id} - Ошибка мониторинга попапов: {str(e)}")
                await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["CHECK_POPUPS_INTERVAL"])

    async def check_popups(self, page: Page, supply: dict = None) -> None:
        """Проверка и закрытие попапов"""
        preorder_id = supply["preorder_id"] if supply else None
        logger.info(f"{preorder_id} - Проверяем наличие попапов")

        for popup_name, selectors in SYSTEM_CONFIG["popups"].items():
            try:
                # Ищем кнопку закрытия
                close_button = await page.wait_for_selector(
                    selectors["close"], timeout=1000, state="visible"
                )

                if close_button:
                    logger.info(
                        f"{preorder_id} - Обнаружен активный попап: {popup_name}"
                    )
                    await close_button.click()
                    logger.info(f"{preorder_id} - Попап {popup_name} закрыт")

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
                        # Добавляем проверку user_id после успешной авторизации
                        if await self.validate_user_id(page):
                            # Сохраняем cookies после успешной авторизации
                            if await self.save_cookies():
                                logger.info(
                                    "Cookies успешно сохранены после авторизации"
                                )
                            return True
                        else:
                            logger.error("Ошибка валидации ID поставщика")
                            return False

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

    async def validate_user_id(self, page: Page) -> bool:
        """Проверка ИНН поставщика"""
        try:
            # Переходим на страницу карточки поставщика
            await page.goto(
                SYSTEM_CONFIG["urls"]["supplier_card"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_NETWORK"] * 1000,
            )

            # Ждем появления input с ИНН
            inn_input = await page.wait_for_selector(
                SYSTEM_CONFIG["selectors"]["auth"]["inn"],
                timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
            )

            if not inn_input:
                logger.error("Поле с ИНН не найдено")
                return False

            # Получаем значение из input
            wb_inn = await inn_input.get_attribute("value")
            if not wb_inn:
                logger.error("ИНН не найден в поле")
                return False

            # Сравниваем с сохраненным ИНН (user_id)
            if wb_inn != self.user_id:
                logger.error(f"ИНН не совпадает: {wb_inn} != {self.user_id}")
                return False

            logger.info(f"ИНН подтвержден: {wb_inn}")
            self.user_id_validated = True
            return True

        except Exception as e:
            logger.error(f"Ошибка проверки ИНН: {str(e)}")
            return False

    async def monitor_user_id(self, page: Page) -> None:
        """Периодическая проверка ИНН поставщика"""
        while True:
            try:
                if not await self.validate_user_id(page):
                    logger.error("ИНН поставщика больше не валиден")
                    # Останавливаем все активные поставки
                    for supply in USER_SUPPLIES:
                        if supply["user_id"] == self.user_id:
                            for s in supply["supplies"]:
                                s["status"]["active"] = False
                    break
                await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["CHECK_USER_ID_INTERVAL"])
            except Exception as e:
                logger.error(f"Ошибка мониторинга ИНН поставщика: {str(e)}")
                await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["CHECK_USER_ID_INTERVAL"])

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
                    SYSTEM_CONFIG["selectors"]["calendar"]["cell"],
                    timeout=SYSTEM_CONFIG["timeouts"]["WAIT_SELECTOR"] * 1000,
                    state="visible",
                )

                if calendar:
                    logger.info(f"Календарь открыт - {preorder_id}")
                    # Даем время на полную загрузку календаря
                    await asyncio.sleep(SYSTEM_CONFIG["timeouts"]["WAIT_ANIMATION"])

                    return await self.get_target_dates(page, supply)

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
        await page.close()
        return await self.open_supply_by_id(
            supply=supply, page=await self.context.new_page()
        )

    async def get_target_dates(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        booking_settings = supply["booking_settings"]

        try:
            logger.info(f"Получаем целевые даты для поставки {preorder_id}")

            # Сначала всегда получаем все даты из календаря в правильном порядке
            calendar_dates = []
            date_cells = await page.query_selector_all(
                SYSTEM_CONFIG["selectors"]["calendar"]["date_container"]
            )

            for cell in date_cells:
                date_element = await cell.query_selector(
                    SYSTEM_CONFIG["selectors"]["calendar"]["date_text"]
                )
                if date_element:
                    date_text = await date_element.inner_text()
                    # Убираем день недели из даты календаря
                    clean_date = date_text.split(",")[0]
                    calendar_dates.append(clean_date)

            logger.info(f"Даты из календаря WB: {calendar_dates}")

            if booking_settings["mode"] == BOOKING_MODES["SPECIFIC_DATES"]:
                # Фильтруем даты календаря, оставляя только те, что указаны в настройках
                target_dates = [
                    date
                    for date in calendar_dates
                    if date in booking_settings["target_dates"]
                ]
                logger.info(f"Отфильтрованные даты для {preorder_id}: {target_dates}")
            else:  # ANY_DATE
                # Используем все даты из календаря
                target_dates = calendar_dates
                logger.info(
                    f"Используем все даты из календаря для {preorder_id}: {target_dates}"
                )

            if not target_dates:
                logger.error(f"Не найдены даты для обработки - {preorder_id}")
                return False

            # Передаем даты в process_target_dates
            return await self.process_target_dates(page, target_dates, supply)

        except Exception as e:
            logger.error(
                f"Ошибка при получении целевых дат для {preorder_id}: {str(e)}"
            )
            return False

    async def process_target_dates(
        self, page: Page, target_dates: List[str], supply: dict
    ) -> bool:
        preorder_id = supply["preorder_id"]
        booking_settings = supply["booking_settings"]
        target_coeff = booking_settings["target_coeff"]

        logger.info(
            f"{preorder_id} - Режим: {booking_settings['mode']}, Приоритет: {booking_settings['priority']}"
        )

        try:
            logger.info(f"Обрабатываем даты для {preorder_id}")
            suitable_blocks = []

            # Проходим по датам в том порядке, как они идут в календаре
            for target_date in target_dates:
                logger.info(f"{preorder_id} - Найдена активная дата: {target_date}")

                # Находим ячейку с датой
                date_cell = await page.query_selector(
                    f'{SYSTEM_CONFIG["selectors"]["calendar"]["cell"]}:has(span:text("{target_date}"))'
                )

                if not date_cell:
                    logger.warning(
                        f"{preorder_id} - Ячейка для даты {target_date} не найдена"
                    )
                    continue

                # Сначала проверяем доступность даты
                is_disabled = await date_cell.get_attribute("class")
                if (
                    is_disabled
                    and SYSTEM_CONFIG["selectors"]["calendar"]["date_is_disabled"]
                    in is_disabled
                ):
                    logger.warning(
                        f"{preorder_id} - Дата {target_date} недоступна для бронирования"
                    )
                    continue

                # Потом проверяем коэффициент
                coeff_element = await date_cell.query_selector(
                    SYSTEM_CONFIG["selectors"]["calendar"]["coeff"]["coeff_value"]
                )

                if not coeff_element:
                    logger.warning(
                        f"{preorder_id} - Коэффициент для даты {target_date} не найден"
                    )
                    continue

                coeff_text = await coeff_element.inner_text()

                # Проверяем коэффициент
                if target_coeff == COEFF_VALUES["COEFF_FREE"]:
                    # Для COEFF_FREE ищем "Бесплатно"
                    if coeff_text.strip() != "Бесплатно":
                        logger.warning(
                            f"{preorder_id} - Дата ({target_date}) доступна, но коэффициент не бесплатный"
                        )
                        continue
                    coeff = "Бесплатно"
                else:
                    # Для обычных коэффициентов
                    coeff = int(coeff_text.replace("×", "").strip())
                    if coeff > int(target_coeff):
                        logger.warning(
                            f"{preorder_id} - Дата ({target_date}) доступна, но коэффициент ({coeff}) больше требуемого ({target_coeff})"
                        )
                        continue

                logger.info(
                    f"{preorder_id} - Найден подходящий слот: дата {target_date}, коэффициент {coeff}"
                )
                suitable_blocks.append(
                    {"date": target_date, "cell": date_cell, "coeff": coeff}
                )

            if not suitable_blocks:
                logger.error(f"{preorder_id} - Не найдено подходящих дат")
                return await self.close_calendar(page, supply)

            logger.info(f"Все подходящие даты для {preorder_id}:")
            for block in suitable_blocks:
                logger.info(
                    f"{preorder_id} - Дата: {block['date']}, Коэффициент: {block['coeff']}"
                )

            # Сортировка только если нужен приоритет по коэффициенту
            if booking_settings["priority"] == BOOKING_PRIORITIES["BY_LOWER_COEFF"]:
                logger.info("Сортируем по коэффициенту")
                sorted_blocks = sorted(suitable_blocks, key=lambda x: x["coeff"])
            else:
                logger.info("Используем порядок дат из календаря WB")
                sorted_blocks = suitable_blocks  # Оставляем порядок как есть

            logger.info(f"Отсортированные даты для {preorder_id}:")
            for block in sorted_blocks:
                logger.info(
                    f"{preorder_id} - Дата: {block['date']}, Коэффициент: {block['coeff']}"
                )

            best_block = sorted_blocks[0]
            logger.info(
                f"{preorder_id} - Выбран лучший вариант: дата ({best_block['date']}), коэффициент = {best_block['coeff']}"
            )

            logger.info(
                f"{preorder_id} - Запускаем бронирование: дата ({best_block['date']}), коэффициент = {best_block['coeff']}"
            )

            # Запускаем бронирование
            # return await self.select_date(
            #     page, best_block["cell"], best_block["date"], supply
            # )

        except Exception as e:
            logger.error(f"Ошибка при обработке дат для {preorder_id}: {str(e)}")
            return False

    async def close_calendar(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"{preorder_id} - Закрываем календарь")
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
            logger.info(f"{preorder_id} - Календарь закрыт")

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

        logger.info(f"Выбираем дату ({target_date}) для поставки {preorder_id}")
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
