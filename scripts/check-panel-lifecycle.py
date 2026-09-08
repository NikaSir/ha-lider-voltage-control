#!/usr/bin/env python3
"""Exercise LIDER panel route ownership without requiring Home Assistant."""

from __future__ import annotations

import asyncio
import importlib
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


existing_routes: set[str] = set()
registered_routes: list[str] = []
removed_routes: list[str] = []


frontend = ModuleType("homeassistant.components.frontend")
frontend.async_panel_exists = lambda _hass, path: path in existing_routes


def remove_panel(_hass, path: str, *, warn_if_unknown: bool) -> None:
    assert warn_if_unknown is False
    removed_routes.append(path)
    existing_routes.discard(path)


frontend.async_remove_panel = remove_panel

panel_custom = ModuleType("homeassistant.components.panel_custom")


async def register_panel(**kwargs) -> None:
    path = kwargs["frontend_url_path"]
    assert path not in existing_routes
    existing_routes.add(path)
    registered_routes.append(path)


panel_custom.async_register_panel = register_panel

http = ModuleType("homeassistant.components.http")
http.StaticPathConfig = lambda url, path, cache_headers: (url, path, cache_headers)

homeassistant = ModuleType("homeassistant")
components = ModuleType("homeassistant.components")
components.frontend = frontend
components.panel_custom = panel_custom
homeassistant.components = components
core = ModuleType("homeassistant.core")
core.HomeAssistant = object
config_entries = ModuleType("homeassistant.config_entries")
config_entries.ConfigEntry = object

for name, module in {
    "homeassistant": homeassistant,
    "homeassistant.components": components,
    "homeassistant.components.frontend": frontend,
    "homeassistant.components.panel_custom": panel_custom,
    "homeassistant.components.http": http,
    "homeassistant.core": core,
    "homeassistant.config_entries": config_entries,
}.items():
    sys.modules[name] = module

panel = importlib.import_module("custom_components.lider_voltage_control.panel")


class FakeHttp:
    async def async_register_static_paths(self, _paths) -> None:
        return None


def fake_hass():
    return SimpleNamespace(data={}, http=FakeHttp())


async def main() -> None:
    # An existing foreign route must neither be replaced nor removed on unload.
    existing_routes.add(panel.PANEL_URL_PATH)
    foreign = fake_hass()
    await panel.async_register_panel(foreign)
    assert registered_routes == []
    assert foreign.data[panel.DOMAIN].get(panel.PANEL_ROUTE_OWNED) is not True
    panel.async_unregister_panel(foreign)
    assert panel.PANEL_URL_PATH in existing_routes
    assert removed_routes == []

    # An owned route is recorded, survives duplicate setup and is removed once.
    existing_routes.clear()
    owned = fake_hass()
    await panel.async_register_panel(owned)
    assert registered_routes == [panel.PANEL_URL_PATH]
    assert owned.data[panel.DOMAIN][panel.PANEL_ROUTE_OWNED] is True
    await panel.async_register_panel(owned)
    assert registered_routes == [panel.PANEL_URL_PATH]
    panel.async_unregister_panel(owned)
    assert removed_routes == [panel.PANEL_URL_PATH]
    assert panel.PANEL_URL_PATH not in existing_routes
    panel.async_unregister_panel(owned)
    assert removed_routes == [panel.PANEL_URL_PATH]

    # If an owned route disappears, setup restores ownership cleanly.
    recovered = fake_hass()
    recovered.data[panel.DOMAIN] = {panel.PANEL_ROUTE_OWNED: True}
    await panel.async_register_panel(recovered)
    assert registered_routes == [panel.PANEL_URL_PATH, panel.PANEL_URL_PATH]
    assert recovered.data[panel.DOMAIN][panel.PANEL_ROUTE_OWNED] is True

    print("Panel lifecycle and route ownership verified")


asyncio.run(main())
