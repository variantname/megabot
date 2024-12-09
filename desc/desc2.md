# Разработка бота для WB: локальная и серверная версии

## Текущая ситуация

-  Разработан базовый бот с использованием Playwright
-  Реализована изоляция пользователей (отдельные браузеры, контексты, cookies)
-  Есть базовая логика работы с поставками WB

## Цель

Создать две версии бота с единым личным кабинетом:

1. Локальная версия (установка на ПК пользователя)
2. Серверная версия (работа через браузер)

## Технические решения

### Общая часть

-  Единый личный кабинет на Next.js
-  Общая система подписок и биллинга
-  Единая база пользователей
-  Общая логика работы с WB API

### Локальная версия

**Преимущества:**

-  Меньше нагрузка на сервер
-  Проще авторизация в WB (через локальный браузер)
-  Нет задержек при работе

**Недостатки:**

-  Требует включенного ПК
-  Нужна установка ПО
-  Сложнее контролировать использование

**Реализация:**

-  Компиляция в бинарный файл
-  Обфускация кода
-  Проверка лицензии через API
-  Защита от копирования

### Серверная версия

**Преимущества:**

-  Работает 24/7
-  Не требует установки
-  Доступ с любого устройства
-  Полный контроль использования

**Недостатки:**

-  Больше нагрузка на сервер
-  Требуется стриминг браузера
-  Возможны задержки при работе

**Реализация:**

-  Browser streaming через iframe
-  WebSocket для управления
-  Контейнеризация для масштабирования

## Защита от нелегального использования

### Локальная версия

1. Привязка к seller_id
2. Регулярная проверка подписки и ключа лицензии через доступ БД
3. Антиотладка
4. Шифрование критичных частей кода

### Серверная версия

1. Авторизация через ЛК
2. Изоляция пользователей
3. Ограничение доступа по URL
4. Контроль ресурсов

## План реализации

1. Доработка текущего кода для поддержки двух режимов
2. Разработка системы лицензирования
3. Создание инсталлятора локальной версии
4. Настройка серверной инфраструктуры
5. Интеграция с ЛК
6. Тестирование и отладка

## Вопросы для проработки

1. Выбор системы стриминга браузера
2. Настройка масштабирования серверной части
3. Разработка системы защиты локальной версии
4. Проработка системы биллинга

Требуется обсуждение конкретных технических решений по каждому пункту.