1. Базовые действия:

```
!!! В каждый метод нужно добавить дополнительную задержку wait-debug=3000, помимо указанных задержек wait-

!!!! ВНИМАНИЕ !!!! ВАЖНО !!!! = Каждый метод должен запускать другой метод циклично, по условиям, как в описании ниже !!!!
- init_browser()
  - инициализирует браузер
  - запускает вкладку ВБ
  - запускает check_auth_status()

- create_supply(supplies) -> bool
  - принимает массив SUPPLIES
  - создает новую страницу для каждой поставки
  - запускает параллельно open_supply_by_id для каждой поставки
  - возвращает True если все поставки успешно обработаны
  - возвращает False если хотя бы одна поставка не обработана + error "Ошибка обработки поставок: {причина}"

- open_supply_by_id(preorder_id) -> bool
  - переходит на страницу каждой поставки
  - параллельно вызывает validate_supply_data()
  - параллельно вызывает check_popups()

- check_auth_status() -> bool
  - проверяет статус авторизации
  - возвращает True + лог "Авторизация успешна"
  - возвращает False + лог "Не авторизован" + вызывает auth_false()

- auth_false() -> bool
  - отправляет уведомление через notification_sender()

- notification_sender()
  - TODO

- validate_supply_data() -> bool
  - на кажлой вкладке отдельно параллельно проверяет, что preorder_id соответствует данным в SUPPLIES
  - поверяет это в поле WB_SELECTORS["supply"]["preorder_id"]
  - возвращает True, если preorder_id соответствует данным в SUPPLIES + вызывает hover_date_block
  - возвращает False, если preorder_id не соответствует данным в SUPPLIES + выводит error "Страница не соответствует Заказу {preorder_id}" + закрывает вкладку + запускает open_supply_by_id именно для этого preorder_id

- check_popups() -> bool
  - проверяет наличие попапов
  - возвращает True, если попапы есть + вызывает clear_popups()
  - возвращает False, если попапов нет + лог "Попапы не обнаружены"

- clear_popups() -> bool
  - очищает все попапы
  - вызывает check_popups()
  - возвращает True, если check_popups()=False
  - возвращает False, если check_popups()=True спустя X попыток + возвращает error "Не удалось очистить попапы" + "причина неудачи"

- find_date_block(target_date) -> bool
  - находит все блоки с датами date_blocks
  - находит нужный блок с target_date = target_date_block
  - возвращает True, если блок найден + вызывает hover_date_block(target_date_block)
  - возвращает False, если блок не найден

- validate_date_block(target_date) -> bool
  - проверяет, что блок с target_date содержит target_date
  - возвращает false, если target_date_block содержит
  <td class^="Calendar-cell--is-disabled + error "Дата target_date недоступна"
  - возвращает true, если блок не содержит class^="Calendar-cell--is-disabled" + вызывает hover_date_block(target_date_block)

- validate_coeff(target_date_block) -> bool
  - target_coeff_value - укаывает юзер при создании задачи
  - target_coeff_value = [Бесплатно, 5, 10, 20, Любой]
  - проверяет, что target_date_block -> real_coeff_value <= target_coeff_value
  - возвращает false, если real_coeff_value > target_coeff_value + message "Коэффициент на дату target_date больше, чем target_coeff_value"
  - возвращает true, если real_coeff_value <= target_coeff_value (если target_coeff_value = "Любой", то real_coeff_value > 0 || real_coeff_value = "Бесплатно") + вызывает hover_date_block(target_date_block)

- hover_date_block(target_date_block) -> bool
  - находит target_date_block + требуется прокрутка для наведения, весь календарь не помещается на экран
  - наводит курсор на target_date_block
  - возвращает True, если найден блок с target_date + вызывает check_select_date_button()
  - возвращает False, если не смог навести курсор на блок с target_date + вызывает validate_date_block()

- check_select_date_button() -> bool
  - задержкаwait-check_select_date_button=100
  - возвращает True, если кнопка select_date_button есть в ДОМ + вызывает click_select_date_button()
  - возвращает False, если кнопки нет/недоступна + вызывает hover_date_block()

- click_select_date_button() -> bool
  - задержка wait-validate_select_date=50
  - если check_select_date_button()=True, кликает по select_date_button
  - возвращает True, если клик был + вызывает check_final_button()
  - возвращает False, если клик не был + вызывает check_select_date_button()

- validate_select_date() -> bool
  - задержка wait-validate_select_date=50
  - возвращает True, если блок содержит class^="Calendar-cell--is-checked"
  - возвращает False, если блок не содержит class^="Calendar-cell--is-checked" + вызывает click_select_date_button()

- check_final_button() -> bool
  - задержка wait-check_final_button=50
  - возвращает True, если кнопка НЕ имеет disabled="" + вызывает click_final_button()
  - возвращает False, если кнопка имеет disabled="" + вызывает click_select_date_button()

- click_final_button() -> bool
  - задержка wait-click_final_button=50
  - кликает по кнопке final_button
  - задержка wait-validate_final_button=5000
  - возвращает True, если произошёл переход на SUCCESS_URL=seller.wildberries.ru/supplies-management/new-supply/packaging?supplyID=
  - возвращает False, если перехода не произошло + вызывает check_final_button()











```
