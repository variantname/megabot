import asyncio
from playwright.async_api import async_playwright
from loguru import logger

logger.add("test_clicks.log", format="{time} | {level} | {message}")


async def test_multiple_clicks():
    """Тест на одновременные клики"""
    logger.info("Начинаем тест множественных кликов")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        try:
            # Создаем HTML страницу для теста
            await page.set_content(
                """
                <button id="test-btn-1" onclick="console.log('Click 1 at ' + new Date().toISOString()); this.textContent = 'Clicked 1'">Button 1</button>
                <button id="test-btn-2" onclick="console.log('Click 2 at ' + new Date().toISOString()); this.textContent = 'Clicked 2'">Button 2</button>
            """
            )

            # Находим кнопки
            button1 = await page.wait_for_selector("#test-btn-1")
            button2 = await page.wait_for_selector("#test-btn-2")

            logger.info("Начинаем параллельные клики")

            # Создаем задачи для кликов
            task1 = asyncio.create_task(button1.click())
            task2 = asyncio.create_task(button2.click())

            # Ждем выполнения обоих кликов
            await asyncio.gather(task1, task2)

            logger.info("Клики выполнены")

            # Даем время посмотреть результат
            await asyncio.sleep(60)

        except Exception as e:
            logger.error(f"Ошибка в тесте: {str(e)}")

        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(test_multiple_clicks())
