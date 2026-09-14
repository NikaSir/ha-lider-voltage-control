from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PANEL = (ROOT / "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel.js").read_text(encoding="utf-8")
SOURCE = (ROOT / "custom_components/lider_voltage_control/frontend/lider-voltage-control-panel-core.js").read_text(encoding="utf-8")
SHELL = (ROOT / "templates/shell_v2/nikas-specialized-shell.js").read_text(encoding="utf-8")


def test_refresh_action_is_black_at_rest():
    assert '".refresh{justify-self:end;color:var(--primary-text-color,#17191c);' in PANEL
    assert '".refresh{justify-self:end;color:var(--primary-text-color,#17191c);' in SOURCE
    assert ".nikas-shell__side-action--right{justify-self:end;color:var(--primary-text-color,#17191c)}" in SHELL
