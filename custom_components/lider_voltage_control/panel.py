"""Integration-owned LIDER frontend panel."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN

PANEL_ID = "lider"
PANEL_TITLE = "LIDER"
PANEL_URL_PATH = "dashboard-lider"
PANEL_PARENT_ROUTE = "/dashboard-infrastructure/overview"
PANEL_ICON = "mdi:transmission-tower"
PANEL_WEB_COMPONENT = "lider-voltage-control-panel"
PANEL_UI_VERSION = "0.3.2"
PANEL_TEMPLATE_VERSION = "1.0"
PANEL_STATIC_URL = "/lider_voltage_control_panel"
PANEL_STATIC_REGISTERED = "panel_static_registered"
PANEL_DIRECTORY = Path(__file__).parent / "frontend"
PANEL_BUNDLE = "lider-voltage-control-panel.js"

PANEL_METADATA = {
    "id": PANEL_ID,
    "title": PANEL_TITLE,
    "path": f"/{PANEL_URL_PATH}",
    "parent_route": PANEL_PARENT_ROUTE,
    "icon": PANEL_ICON,
    "owner": DOMAIN,
    "preferred_view": "overview",
    "ui_version": PANEL_UI_VERSION,
    "template_version": PANEL_TEMPLATE_VERSION,
    "frontend_bundle": PANEL_BUNDLE,
}


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the LIDER panel and static frontend."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if not domain_data.get(PANEL_STATIC_REGISTERED):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(PANEL_STATIC_URL, str(PANEL_DIRECTORY), cache_headers=False)]
        )
        domain_data[PANEL_STATIC_REGISTERED] = True

    if frontend.async_panel_exists(hass, PANEL_URL_PATH):
        return

    await panel_custom.async_register_panel(
        hass=hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_WEB_COMPONENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{PANEL_STATIC_URL}/{PANEL_BUNDLE}?v={PANEL_UI_VERSION}",
        embed_iframe=False,
        require_admin=False,
        handle_safe_area=True,
        config=PANEL_METADATA,
    )


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the panel when the config entry unloads."""
    frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
