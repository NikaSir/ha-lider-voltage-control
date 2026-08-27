import "./lider-voltage-control-panel-ui050.js?v=0.5.0";

const UI_VERSION = "0.5.1";
const Panel = customElements.get("lider-voltage-control-panel");

function installCompactTabsPatch() {
  if (!Panel || Panel.prototype.__nikasUi051CompactTabsPatched) return;
  const proto = Panel.prototype;
  proto.__nikasUi051CompactTabsPatched = true;

  const previousMount = proto._mount;
  proto._mount = function compactTabsMount() {
    previousMount.call(this);
    if (!this.shadowRoot) return;

    let style = this.shadowRoot.querySelector('style[data-nikas-ui="0.5.1"]');
    if (!style) {
      style = document.createElement("style");
      style.dataset.nikasUi = UI_VERSION;
      style.textContent = `
        .title-return{justify-self:center;min-width:min(290px,100%);max-width:100%;min-height:44px;padding:5px 14px;border:1px solid color-mix(in srgb,var(--primary-color,#03a9d9) 24%,var(--divider-color,#dfe3e8));border-radius:16px;background:color-mix(in srgb,var(--primary-color,#03a9d9) 5%,var(--card-background-color,#fff));box-shadow:0 5px 16px rgba(23,45,76,.06);cursor:pointer}
        .title-return:active{background:color-mix(in srgb,var(--primary-color,#03a9d9) 13%,var(--card-background-color,#fff));border-color:color-mix(in srgb,var(--primary-color,#03a9d9) 42%,var(--divider-color,#dfe3e8));box-shadow:0 2px 7px rgba(23,45,76,.05)}
        .tabs{grid-template-columns:repeat(6,minmax(0,1fr));gap:0;padding-left:max(3px,env(safe-area-inset-left));padding-right:max(3px,env(safe-area-inset-right))}
        .tabs button{min-width:0;min-height:58px;padding:3px 1px;gap:1px}
        .tabs button ha-icon{--mdc-icon-size:24px;width:24px;height:24px}
        .tabs button small{display:block;max-width:100%;font-size:11px;line-height:1.05;letter-spacing:-.025em;white-space:nowrap;overflow:hidden;text-overflow:clip}
        .diagnostics-page{padding-bottom:6px}
        .diagnostics-hero .hero-title{min-width:0}
        .diagnostics-hero p{margin-top:4px;font-size:13px;color:var(--secondary-text-color,#68737d)}
        .raw-group{padding:12px;display:grid;gap:9px}
        .raw-group-head{align-items:flex-start}
        .raw-group-head>div{min-width:0}
        .raw-group-head p{margin:3px 0 0;font-size:13px;line-height:1.35;color:var(--secondary-text-color,#68737d)}
        .raw-count{min-width:28px;height:28px;padding:0 7px;border:1px solid var(--divider-color,#dfe3e8);border-radius:999px;display:grid;place-items:center;font-size:12px;font-weight:750;color:var(--secondary-text-color,#68737d)}
        .raw-entities{display:grid;gap:8px}
        .raw-entity{min-width:0;border:1px solid var(--divider-color,#dfe3e8);border-radius:16px;background:color-mix(in srgb,var(--secondary-text-color,#68737d) 3%,var(--card-background-color,#fff));padding:10px;display:grid;gap:8px;cursor:pointer;outline:none}
        .raw-entity:focus-visible{border-color:var(--primary-color,#03a9d9);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary-color,#03a9d9) 18%,transparent)}
        .raw-entity-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .raw-entity-head>div{min-width:0}
        .raw-entity-head h3{margin:0;font-size:15px;line-height:1.25}
        .raw-entity-head code{display:block;margin-top:3px;font-size:11px;color:var(--secondary-text-color,#68737d);white-space:normal;overflow-wrap:anywhere}
        .raw-entity-head ha-icon{flex:0 0 auto;--mdc-icon-size:20px;color:var(--secondary-text-color,#68737d)}
        .raw-list{display:grid;border-top:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 75%,transparent)}
        .raw-row{min-width:0;display:grid;grid-template-columns:minmax(108px,.8fr) minmax(0,1.4fr);gap:10px;padding:7px 2px;border-bottom:1px solid color-mix(in srgb,var(--divider-color,#dfe3e8) 55%,transparent)}
        .raw-row span{font-size:12px;color:var(--secondary-text-color,#68737d);overflow-wrap:anywhere}
        .raw-row strong{min-width:0;font-size:13px;font-weight:650;text-align:right;overflow-wrap:anywhere;word-break:break-word}
        .raw-state strong{font-size:15px;color:var(--primary-text-color,#17191c)}
        .raw-empty{margin:0;padding:8px 2px;font-size:13px;color:var(--secondary-text-color,#68737d)}
        @media(max-width:430px){
          .title-return{min-width:0;width:100%;padding-inline:8px}
          .title-return strong{font-size:21px}
          .title-return small{font-size:13px}
          .tabs button{padding-inline:0}
          .tabs button ha-icon{--mdc-icon-size:23px;width:23px;height:23px}
          .tabs button small{font-size:10px;letter-spacing:-.035em}
          .raw-row{grid-template-columns:minmax(96px,.75fr) minmax(0,1.25fr)}
        }
      `;
      this.shadowRoot.appendChild(style);
    }

    const version = this.shadowRoot.querySelector(".title-return small");
    if (version) version.textContent = `UI v${UI_VERSION}`;
  };
}

installCompactTabsPatch();
