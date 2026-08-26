# LIDER voltage control for Home Assistant

Специализированная read-only панель Home Assistant NikaS для контроля электросети:

- входящая трёхфазная сеть до стабилизаторов LIDER;
- контрольные напряжения после стабилизаторов;
- отдельная неотключаемая линия;
- история и нативный `more-info` Home Assistant.

Панель следует проверенной оболочке Stark SolarPower: безопасные зоны iPhone, системная кнопка меню HA, фиксированная нижняя навигация и gesture-only масштабирование рабочей области 75–200%.

## Установка

1. Добавить репозиторий в HACS как пользовательский репозиторий категории `Integration`.
2. Установить **LIDER Voltage Control**.
3. Перезапустить Home Assistant.
4. Добавить интеграцию **LIDER Voltage Control** в `Настройки → Устройства и службы`.
5. Открыть пункт **LIDER** в боковом меню.

Обновление выполняется через ветку `main` и HACS. GitHub Releases не используются.

## Подтверждённые источники

| Точка | Фаза A | Фаза B | Фаза C |
| --- | --- | --- | --- |
| До LIDER | `sensor.power_monitor_voltage_a` | `sensor.power_monitor_voltage_b` | `sensor.power_monitor_voltage_c` |
| После LIDER | `sensor.socket_zb_2_voltage` | `sensor.socket_zb_3_voltage` | `sensor.socket_zb_31_voltage` |

Неотключаемая линия: `sensor.socket_zb_25_voltage`.

## Безопасность

Панель не создаёт команд управления и не подменяет недоступные значения. `unknown`, `unavailable` и отсутствующие сущности показываются как `Нет данных`.

