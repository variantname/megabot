import asyncio
from pathlib import Path
import psutil
import time
from bot import MEGABOT
from utils.logger import logger
import os
from datetime import datetime
import logging

# Создаем отдельный логгер для метрик
metrics_logger = logging.getLogger("metrics")
metrics_logger.setLevel(logging.INFO)

# Создаем директорию для логов метрик если её нет
metrics_dir = Path("metrics_logs")
metrics_dir.mkdir(exist_ok=True)

# Создаем файл лога с текущей датой
metrics_file = (
    metrics_dir / f"metrics_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.log"
)
file_handler = logging.FileHandler(metrics_file, encoding="utf-8")
file_handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s"))
metrics_logger.addHandler(file_handler)


async def monitor_resources(duration_minutes: int = 15):
    metrics_logger.info("Начинаем мониторинг ресурсов")
    process = psutil.Process(os.getpid())
    start_time = time.time()

    # Начальные значения счетчиков
    start_io = process.io_counters()
    start_cpu_time = process.cpu_times()
    start_net = psutil.net_io_counters()

    # Запускаем бота
    logger.info("Запускаем бота...")
    bot = MEGABOT(user_id="30822")
    await bot.init_browser()
    bot_task = asyncio.create_task(bot.create_supply(user_id="30822"))

    try:
        while (time.time() - start_time) < (duration_minutes * 60):
            # Текущие метрики
            current_io = process.io_counters()
            current_cpu = process.cpu_percent()
            current_net = psutil.net_io_counters()
            memory = process.memory_info()

            metrics_logger.info(
                f"=== Текущие метрики ===\n"
                f"CPU: {current_cpu}%\n"
                f"RAM: {memory.rss / 1024 / 1024:.1f} MB\n"
                f"Диск чтение: {(current_io.read_bytes - start_io.read_bytes) / 1024 / 1024:.1f} MB\n"
                f"Диск запись: {(current_io.write_bytes - start_io.write_bytes) / 1024 / 1024:.1f} MB\n"
                f"Сеть входящий: {(current_net.bytes_recv - start_net.bytes_recv) / 1024 / 1024:.1f} MB\n"
                f"Сеть исходящий: {(current_net.bytes_sent - start_net.bytes_sent) / 1024 / 1024:.1f} MB\n"
                f"Потоки: {process.num_threads()}\n"
                f"Время работы: {(time.time() - start_time) / 60:.1f} мин"
            )
            await asyncio.sleep(10)

    except KeyboardInterrupt:
        metrics_logger.info("Тест остановлен пользователем")
    finally:
        # Получаем конечные значения
        end_io = process.io_counters()
        end_cpu_time = process.cpu_times()
        end_net = psutil.net_io_counters()
        total_time = (time.time() - start_time) / 3600  # в часах

        metrics_logger.info(
            "\n=== ИТОГОВОЕ ПОТРЕБЛЕНИЕ РЕСУРСОВ ===\n"
            f"Время работы: {total_time:.2f} часов\n"
            f"CPU время: {sum(end_cpu_time) - sum(start_cpu_time):.1f} сек\n"
            f"Пиковая RAM: {memory.rss / 1024 / 1024:.1f} MB\n"
            f"Диск чтение: {(end_io.read_bytes - start_io.read_bytes) / 1024 / 1024:.1f} MB\n"
            f"Диск запись: {(end_io.write_bytes - start_io.write_bytes) / 1024 / 1024:.1f} MB\n"
            f"Сеть входящий: {(end_net.bytes_recv - start_net.bytes_recv) / 1024 / 1024:.1f} MB\n"
            f"Сеть исходящий: {(end_net.bytes_sent - start_net.bytes_sent) / 1024 / 1024:.1f} MB\n"
            f"Финальное число потоков: {process.num_threads()}"
        )

        # Останавливаем бота
        bot_task.cancel()
        await bot.close()
        metrics_logger.info("Тест завершен")


if __name__ == "__main__":
    metrics_logger.info("Запускаем тест потребления ресурсов")
    asyncio.run(monitor_resources(10))  # Тест на 15 минут
