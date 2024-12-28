from loguru import logger
import sys

# Настройка логгера
logger.remove()  # Удаляем стандартный handler
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)
logger.add(
    "logs/mega_bot_{time}.log",
    rotation="1 day",
    retention="7 days",
    level="DEBUG"
)
