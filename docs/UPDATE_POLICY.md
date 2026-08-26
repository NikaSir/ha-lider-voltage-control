# Update policy

LIDER Voltage Control наследует проверенный порядок Stark SolarPower и поставляется в Home Assistant через HACS без GitHub Releases и автоматических release-тегов.

1. Разработка выполняется не в `main`.
2. Изменения проходят через pull request.
3. До слияния проверяются Python, JSON, JavaScript и согласованность панели.
4. Проверенная ветка сливается в `main`.
5. Интеграция обновляется в Home Assistant через HACS.
6. Home Assistant перезапускается только когда это требуется.
7. Удаление config entry для обычного обновления запрещено.
8. ZIP используется только как аварийный путь восстановления.
