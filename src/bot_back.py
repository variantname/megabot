import asyncio
import re
from playwright.async_api import async_playwright, Page
from utils.logger import logger
from config import (
    BROWSER_CONFIG,
    MAX_CHECK_AUTH_ATTEMPTS,
    SELLER_WB_URL,
    AUTH_TIMEOUT,
    SUPPLIES,
    SUPPLY_DATE_URL,
    WAIT_AUTH,
    WAIT_VALIDATE_SUPPLY_DATA,
    WB_SELECTORS,
    COOKIES_DIR,
    POPUPS,
    WAIT_DEBUG,
    WAIT_ANIMATION,
    CHECK_POPUPS_INTERVAL,
    MAX_CLOSE_POPUP_ATTEMPTS,
    WAIT_NETWORK,
    WAIT_SELECTOR,
    WAIT_SELECTOR_AUTH,
    WAIT_VALIDATE_SUPPLY_DATA_INTERVAL,
    MAX_VALIDATE_SUPPLY_DATA_ATTEMPTS,
    CHECK_DATE_INTERVAL,
    COEFF_VALUES,
    WAIT_BOOK_DATE,
)

import json
from pathlib import Path
import time


class MEGABOT:
    def __init__(self):
        # Инициализация основных компонентов бота
        self.browser = None  # Браузер
        self.page = None  # Страница браузера
        self.playwright = None  # Основной объект для управления браузером
        self.context = None  # Добавляем контекст браузера

        # Будущие компоненты
        self.redis_client = None  # Для связи с Redis
        self.supply_status = None  # Текущий статус поставки
        self.auth_status = False  # Статус авторизации
        self.cookies_file = COOKIES_DIR / "wb_cookies.json"
        self.auth_notification_sent = False

    async def init_browser(self):
        logger.info("Начинаем запуск браузера...")
        try:
            # Запускаем Playwright
            self.playwright = await async_playwright().start()
            logger.info("Playwright запущен")

            # Запускаем браузер с настройками из конфига
            self.browser = await self.playwright.chromium.launch(**BROWSER_CONFIG)
            logger.info("Браузер запущен")

            # Создаем контекст и страницу
            self.context = await self.browser.new_context()
            self.page = await self.context.new_page()
            logger.info("Страница создана")

            # Пробуем загрузить cookies
            await self.load_cookies()

            # Переходим на сайт WB
            await self.page.goto(SELLER_WB_URL)
            logger.info("Перешли на сайт WB")

            # Запускаем проверку авторизации асинхронно
            asyncio.create_task(self.check_auth_status(self.page))

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
            # Создаем директорию если её нет
            self.cookies_file.parent.mkdir(parents=True, exist_ok=True)

            # Получаем и сохраняем cookies
            cookies = await self.page.context.cookies()
            with open(self.cookies_file, "w") as f:
                json.dump(cookies, f)
            logger.info("Cookies сохранены")

        except Exception as e:
            logger.error(f"Ошибка сохранения cookies: {str(e)}")

    async def load_cookies(self):
        """Загрузка cookies"""
        try:
            if self.cookies_file.exists():
                # Загружаем cookies
                with open(self.cookies_file, "r") as f:
                    cookies = json.load(f)
                await self.page.context.add_cookies(cookies)
                logger.info("Cookies загружены")
                return True
            return False

        except Exception as e:
            logger.error(f"Ошибка загрузки cookies: {str(e)}")
            return False

    async def create_supply(self, supplies: list) -> bool:
        logger.info("Начинаем создание поставок...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Создаем список для хранения задач
            tasks = []

            for supply in supplies:
                page = await self.context.new_page()
                # Теперь передаем весь объект supply
                task = asyncio.create_task(
                    self.open_supply_by_id(supply=supply, page=page)
                )
                tasks.append(task)

            # Ждем завершения всех задач
            await asyncio.gather(*tasks)
            return True

        except Exception as e:
            logger.error(f"Ошибка запуска поставок: {str(e)}")
            return False

    async def open_supply_by_id(self, supply: dict, page: Page) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Открываем поставку {preorder_id}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            supply_url = f"{SUPPLY_DATE_URL}?preorderId={preorder_id}"

            # Сначала дожидаемся загрузки страницы
            await page.goto(
                supply_url,
                wait_until="networkidle",
                timeout=WAIT_VALIDATE_SUPPLY_DATA * 1000,
            )

            # Запускаем задачи параллельно
            validate_task = asyncio.create_task(self.validate_supply_data(page, supply))
            popup_task = asyncio.create_task(self.check_popups(page))

            # Ждем завершения обеих задач
            await asyncio.gather(validate_task, popup_task)

            return True

        except Exception as e:
            logger.error(f"Ошибка при открытии поставки {preorder_id}: {str(e)}")
            return False

    async def check_popups(self, page: Page) -> bool:
        logger.info("Проверяем наличие попапов...")
        await asyncio.sleep(WAIT_DEBUG)

        while True:  # Бесконечный цикл для постоянной проверки
            try:
                for popup_name, selectors in POPUPS.items():
                    try:
                        # Проверяем наличие контейнера в DOM
                        popup_container = await page.wait_for_selector(
                            selectors["container"],
                            timeout=WAIT_SELECTOR * 1000,
                            state="attached",
                        )

                        if popup_container:
                            # Проверяем наличие кнопки закрытия
                            close_button = await page.wait_for_selector(
                                selectors["close"],
                                timeout=1000,
                                state="visible",
                            )

                            if close_button:
                                logger.info(f"Обнаружен активный попап: {popup_name}")
                                asyncio.create_task(
                                    self.clear_popups(page, selectors["close"])
                                )
                                return True

                    except Exception:
                        continue  # Пропускаем ошибки для каждого попапа

                logger.info("Активные попапы не обнаружены")
                await asyncio.sleep(
                    CHECK_POPUPS_INTERVAL
                )  # Пауза перед следующей проверкой

            except Exception as e:
                logger.error(f"Ошибка проверки попапов: {str(e)}")
                await asyncio.sleep(
                    CHECK_POPUPS_INTERVAL
                )  # Пауза перед следующей проверкой

    async def clear_popups(self, page: Page, close_selector: str) -> bool:
        logger.info("Начинаем очистку попапов...")
        await asyncio.sleep(WAIT_DEBUG)

        attempts = 0
        while attempts < MAX_CLOSE_POPUP_ATTEMPTS:
            try:
                # Пытаемся закрыть попап
                close_button = await page.wait_for_selector(
                    close_selector, timeout=1000
                )
                if close_button:
                    await close_button.click()
                    logger.info("Попап закрыт")
                    return True

            except Exception as e:
                logger.error(f"Ошибка при закрытии попапа: {str(e)}")

            attempts += 1
            await asyncio.sleep(WAIT_ANIMATION)

        logger.error("Не удалось очистить попапы после нескольких попыток")
        return False

    async def check_auth_status(self, page: Page) -> bool:
        logger.info("Проверяем статус авторизации...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            attempts = 0
            while attempts < MAX_CHECK_AUTH_ATTEMPTS:
                # Проверяем наличие навбара с таймаутом
                navbar = await page.wait_for_selector(
                    WB_SELECTORS["auth"]["authorized"],
                    timeout=WAIT_SELECTOR_AUTH * 1000,
                    state="attached",  # Ждем появления в DOM
                )

                if navbar:
                    logger.info("Авторизация успешна")
                    return True
                else:
                    logger.info(
                        f"Не авторизован. Попытка {attempts + 1}/{MAX_CHECK_AUTH_ATTEMPTS}"
                    )
                    await asyncio.sleep(WAIT_AUTH)  # Ждем перед следующей попыткой
                    attempts += 1

            # Если после всех попыток все еще не авторизованы
            logger.error(
                f"Не удалось авторизоваться после {MAX_CHECK_AUTH_ATTEMPTS} попыток"
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
        logger.info(f"Проверяем данные поставки {preorder_id}...")
        await asyncio.sleep(WAIT_DEBUG)

        max_attempts = MAX_VALIDATE_SUPPLY_DATA_ATTEMPTS
        attempt = 0

        while attempt < max_attempts:
            try:
                # Сразу проверяем ID поставки
                preorder_element = await page.wait_for_selector(
                    WB_SELECTORS["supply"]["preorder_id_selector"],
                    timeout=WAIT_VALIDATE_SUPPLY_DATA * 1000,
                    state="visible",
                )

                if not preorder_element:
                    logger.error("Не найден элемент с номером заказа")
                    attempt += 1
                    continue

                text = await preorder_element.inner_text()
                page_id = text.split("№")[-1].strip()

                if page_id == preorder_id:
                    logger.info(f"ID поставки {preorder_id} подтвержден")
                    asyncio.create_task(self.open_calendar(page, supply))
                    return True

                logger.error(
                    f"Неверный номер заказа. На странице: {page_id}, ожидался: {preorder_id}"
                )
                return False

            except Exception as e:
                logger.error(
                    f"Попытка {attempt + 1}: Ошибка проверки данных поставки {preorder_id}: {str(e)}"
                )
                attempt += 1
                await asyncio.sleep(WAIT_VALIDATE_SUPPLY_DATA_INTERVAL)

        # Если все попытки неудачны
        logger.error(f"Поставка {preorder_id} не найдена после {max_attempts} попыток")
        await self.notification_sender(
            f"Поставка {preorder_id} не найдена. Проверьте правильность номера Заказа."
        )
        return False

    async def open_calendar(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Открываем календарь для поставки {preorder_id}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Ждем кнопку планирования
            plan_button = await page.wait_for_selector(
                WB_SELECTORS["supply"]["plan_button"],
                timeout=WAIT_SELECTOR * 1000,
                state="visible",
            )

            if not plan_button:
                logger.error("Кнопка планирования не найдена")
                return False

            # Кликаем по кнопке
            await plan_button.click()

            # Ждем появления календаря
            calendar = await page.wait_for_selector(
                WB_SELECTORS["calendar"]["cell"],
                timeout=WAIT_SELECTOR * 1000,
                state="visible",
            )

            if calendar:
                logger.info("Календарь открыт")
                # Вызываем поиск даты
                asyncio.create_task(self.find_date_block(page, supply))
                return True

            logger.error("Календарь не появился после клика")
            return False

        except Exception as e:
            logger.error(
                f"Ошибка открытия календаря для поставки {preorder_id}: {str(e)}"
            )
            return False

    async def find_date_block(self, page: Page, supply: dict) -> bool:
        try:
            target_date = supply["target_date"]
            logger.info(f"Ищем блок с датой {target_date}...")
            await asyncio.sleep(WAIT_DEBUG)

            # Находим все блоки с датами
            date_blocks = await page.query_selector_all(
                WB_SELECTORS["calendar"]["cell"]
            )

            if not date_blocks:
                logger.error("Не найдены блоки с датами")
                return False

            # Ищем блок с нужной датой
            target_date_block = None
            for block in date_blocks:
                # Ищем контейнер с датой внутри блока
                date_container = await block.query_selector(
                    WB_SELECTORS["calendar"]["date_container"]
                )
                if date_container:
                    # Получаем текст даты
                    date_span = await date_container.query_selector(
                        WB_SELECTORS["calendar"]["date_text"]
                    )
                    if date_span:
                        date_text = await date_span.inner_text()
                        if target_date in date_text:
                            target_date_block = block
                            break

            if target_date_block:
                logger.info(f"Найден блок с датой {target_date}")
                return await self.validate_date_block(page, target_date_block, supply)

            logger.error(f"Блок с датой {target_date} не найден")
            return False

        except Exception as e:
            logger.error(f"Ошибка при поиске блока с датой: {str(e)}")
            return False

    async def validate_date_block(
        self, page: Page, target_date_block, supply: dict
    ) -> bool:
        target_date = supply["target_date"]
        logger.info(f"Проверяем доступность даты {target_date}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Получаем класс родительского элемента
            cell_class = await target_date_block.get_attribute("class")

            if "is-disabled" in cell_class:
                logger.error(f"Дата {target_date} недоступна")
                asyncio.create_task(self.close_calendar(page, supply))
                return False

            logger.info(f"Дата {target_date} доступна")
            # Передаем target_date_block для дальнейшей работы
            asyncio.create_task(self.validate_coeff(page, target_date_block, supply))
            return True

        except Exception as e:
            logger.error(
                f"Ошибка при проверке доступности даты {target_date}: {str(e)}"
            )
            return False

    async def validate_coeff(self, page: Page, target_date_block, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        target_date = supply["target_date"]
        target_coeff = supply["target_coeff_value"]
        logger.info(f"Проверяем коэффициент для даты {target_date}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Ищем значение коэффициента
            coeff_value_span = await target_date_block.wait_for_selector(
                WB_SELECTORS["calendar"]["coeff"]["coeff_value"],
                timeout=WAIT_SELECTOR * 1000,
                state="visible",
            )

            if not coeff_value_span:
                logger.error("Не найдено значение коэффициента")
                return False

            # Получаем текст коэффициента
            coeff_text = await coeff_value_span.inner_text()

            # Проверяем различные варианты target_coeff
            if target_coeff == COEFF_VALUES["FREE"]:
                # Проверяем на "Бесплатно"
                if coeff_text == COEFF_VALUES["FREE"]:
                    logger.info(f"{preorder_id}: Найден бесплатный слот")
                    asyncio.create_task(
                        self.select_date(page, target_date_block, supply)
                    )
                    return True
                else:
                    logger.error(f"{preorder_id}: Приёмка не бесплатная: {coeff_text}")
                    asyncio.create_task(self.close_calendar(page, supply))
                    return False

            elif target_coeff == COEFF_VALUES["ANY"]:
                # Для "Любой" сразу бронируем
                logger.info(f"{preorder_id}: Выбран любой коэффициент - бронируем")
                asyncio.create_task(self.select_date(page, target_date_block, supply))
                return True

            else:
                # Для числовых значений
                try:
                    real_coeff_value = int(coeff_text)
                    target_coeff_int = int(target_coeff)

                    if real_coeff_value <= target_coeff_int:
                        logger.info(
                            f"{preorder_id}: Коэффициент подходит: {real_coeff_value} <= {target_coeff_int}"
                        )
                        asyncio.create_task(
                            self.select_date(page, target_date_block, supply)
                        )
                        return True
                    else:
                        logger.error(
                            f"{preorder_id}: Текущий коэффициент приёмки {real_coeff_value} больше максимального {target_coeff_int}"
                        )
                        asyncio.create_task(self.close_calendar(page, supply))
                        return False
                except ValueError:
                    logger.error(
                        f"{preorder_id}: Неожиданное значение коэффициента: {coeff_text}"
                    )
                    return False

        except Exception as e:
            logger.error(f"{preorder_id}: Ошибка при проверке коэффициента: {str(e)}")
            return False

    async def close_calendar(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Закрываем календарь для поставки {preorder_id}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Ждем кнопку закрытия
            close_button = await page.wait_for_selector(
                WB_SELECTORS["calendar"]["close_button"],
                timeout=WAIT_SELECTOR * 1000,
                state="visible",
            )

            if not close_button:
                logger.error("Кнопка закрытия календаря не найдена")
                return False

            # Кликаем по кнопке
            await close_button.click()
            logger.info("Календарь закрыт")

            # Запускаем open_calendar
            await asyncio.sleep(CHECK_DATE_INTERVAL)
            asyncio.create_task(self.open_calendar(page, supply))
            return True

        except Exception as e:
            logger.error(f"Ошибка при закрытии календаря {preorder_id}: {str(e)}")
            return False

    async def select_date(self, page: Page, target_date_block, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        target_date = supply["target_date"]
        logger.info(f"Выбираем дату {target_date} для поставки {preorder_id}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Наводим курсор на ячейку
            await target_date_block.hover()
            logger.info(f"{preorder_id}: Курсор наведен на ячейку")

            # Ждем появления кнопки после hover эффекта
            select_button = await target_date_block.wait_for_selector(
                WB_SELECTORS["calendar"]["select_button"],
                timeout=WAIT_SELECTOR * 1000,
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
        target_date = supply["target_date"]
        logger.info(f"Бронируем дату {target_date} для поставки {preorder_id}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Ждем появления кнопки "Запланировать"
            book_button = await page.wait_for_selector(
                WB_SELECTORS["calendar"]["book_button"],
                timeout=WAIT_SELECTOR * 1000,
                state="visible",
            )

            if not book_button:
                logger.error(f"{preorder_id}: Кнопка 'Запланировать' не найдена")
                return False

            # Кликаем по кнопке
            await book_button.click()
            logger.info(
                f"Запрос на бронирование даты {target_date} отправлен для поставки {preorder_id}"
            )

            # Проверяем результат бронирования
            asyncio.create_task(self.validate_book_date(page, supply))
            return True

        except Exception as e:
            logger.error(f"{preorder_id}: Ошибка при бронировании даты: {str(e)}")
            return False

    async def validate_book_date(self, page: Page, supply: dict) -> bool:
        preorder_id = supply["preorder_id"]
        logger.info(f"Проверяем результат бронирования для поставки {preorder_id}...")
        await asyncio.sleep(WAIT_DEBUG)

        try:
            # Ждем изменения URL
            start_time = time.time()
            while time.time() - start_time < WAIT_BOOK_DATE:
                current_url = page.url
                if "supplyId" in current_url:
                    supply_id = current_url.split("supplyId=")[-1]
                    logger.info(f"Поставка {preorder_id} получила номер {supply_id}")
                    break
                await asyncio.sleep(1)
            else:
                logger.error(
                    f"Поставка {preorder_id}: URL не изменился за {WAIT_BOOK_DATE} секунд"
                )
                return False

            # Проверяем заголовок поставки
            supply_title = await page.wait_for_selector(
                WB_SELECTORS["booking"]["supply_title"],
                timeout=WAIT_SELECTOR * 1000,
                state="visible",
            )

            if not supply_title:
                logger.error(
                    f"Поставка {preorder_id}: Не найден заголовок с номером поставки"
                )
                return False

            # Проверяем статус
            status_badge = await page.wait_for_selector(
                WB_SELECTORS["booking"]["status_badge"],
                timeout=WAIT_SELECTOR * 1000,
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
            return True

        except Exception as e:
            logger.error(
                f"Ошибка при проверке бронирования поставки {preorder_id}: {str(e)}"
            )
            return False


async def main():
    logger.info("СТАРТ РАБОТЫ БОТА")
    bot = MEGABOT()

    try:
        # Инициализация браузера
        if not await bot.init_browser():
            logger.error("❌ Ошибка инициализации браузера")
            return

        # Запускаем обработку поставок (теперь не проверяем результат)
        await bot.create_supply(SUPPLIES)

        # Здесь можно добавить бесконечный цикл или другую логику
        # чтобы бот продолжал работать
        while True:
            await asyncio.sleep(60)  # роверка каждую минуту

    except KeyboardInterrupt:
        logger.info("Получен сигнал остановки")
    finally:
        await bot.close()
        logger.info("ЗАВЕРШЕНИЕ РАБОТЫ БОТА")


if __name__ == "__main__":
    asyncio.run(main())
