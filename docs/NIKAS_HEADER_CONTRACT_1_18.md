# NikaS Header Contract v1.18

**Status:** required for the six-panel unified-header beta set  
**Applies to:** HO-SC-8W, S8 OMNI, NikaS Climate, LIDER, Keenetic Hero 4G+ and Stark SolarPower  
**Reference geometry:** S8 OMNI / Keenetic approved header composition

This contract is a narrow compatibility overlay for NikaS UI Standard v2.2 and
Refresh Action Contract v1.1. Where those documents prescribe
`var(--primary-color)` for the refresh glyph, this contract supersedes that
single color rule. All unrelated v2.2 and Refresh v1.1 requirements remain in force.

## 1. Fixed application shell

The panel has one host-bound shell. Its vertical order is:

1. Header: `60px + top safe area`;
2. one scrollable work viewport;
3. peer-device selector: `52px`, only when more than one peer context exists;
4. Bottom Tab Bar: `64px + bottom safe area`.

Header, peer selector and Bottom Tab Bar remain at native scale and fixed screen
coordinates. Only the work canvas scrolls and scales. At 100% the work viewport
must not scroll horizontally.

## 2. Header

The Header uses the symmetric grid
`52px | minmax(0, 1fr) | 52px`. Side actions are `44px × 44px`, have a
`16px` radius, the standard border/background/shadow, and at least a
`44px × 44px` touch target.

The center plaque is `min(360px, 100%) × 52px`, with the approved S8 OMNI
surface. Its first line is the panel name; its second line is `UI vX.Y.Z`.
It is the only Header return control. It navigates through an explicit Home
Assistant route to the declared parent (normally `/home/overview`), with a safe
fallback. A back arrow, the word “Back”, `history.back()`, and ambient browser
history are prohibited.

The left rail owns the Home Assistant menu. The right rail may contain one
panel-global refresh action. Domain content must not add a second large title.

## 3. Refresh appearance and feedback

The idle and busy refresh glyph uses
`var(--primary-text-color, #17191c)`: black/dark in the light theme and
theme-appropriate high contrast in the dark theme. A blue idle refresh glyph is
non-conforming.

The mounted button keeps its geometry through all states:

- idle: `mdi:refresh`, primary text color;
- busy: rotating `mdi:refresh`, primary text color, minimum 900 ms and until
  the real request settles;
- success: static `mdi:check`, `#43a047`, visible for 1400 ms;
- error: static `mdi:alert-circle-outline`, `#e53935`, visible for 1400 ms.

Refresh is read-only telemetry work. It must not reload Home Assistant, rebuild
the shell, reset the route, tab, peer, scroll, zoom, or discard an editor draft.

## 4. HERO and connection block

The first domain card in the work viewport is the visual/status HERO. Its image
may vary by product, but it must not change Header geometry or cause a height
jump while loading.

When the approved blue decoration is used, its geometry is `205px × 205px`,
`top:-92px`, `right:-70px`, circular, clipped by the persistent card layer,
and independent of the Home Assistant theme primary color.

When the canonical connection plaque is present, its geometry is `168px ×
58px`, `top:13px`, `right:13px`, measured from the HERO inner border. The
two lines retain product-specific truthful semantics while preserving the
canonical geometry.

## 5. Peer-device selector

A multi-device panel places its selector directly above the Bottom Tab Bar,
outside the work viewport. It must not appear in the Header or inside the HERO.

Selection and health are independent: the selected button uses the standard
primary selection surface, while a separate lamp communicates peer health.
Telemetry patches the mounted lamp and label without rebuilding the selector.
Single-device panels omit this row instead of reserving blank space.

## 6. Rendering stability

Header, title return handler, optional peer selector, work viewport and Bottom
Tab Bar are mounted once. Telemetry, refresh feedback and connection decoration
use point patches. Full `shadowRoot.innerHTML` replacement during live updates
is prohibited.

## 7. Acceptance

Verify at `430×932`, `932×430`, `768×1024`, `1024×768`, and
`1440×900`:

- Header/title/action coordinates differ by no more than 2 px between panels;
- refresh is dark in the light theme and readable in the dark theme;
- success/error feedback does not move the title;
- scrolling and zoom affect only the work viewport;
- a multi-device selector stays immediately above the Bottom Tab Bar;
- repeated telemetry updates do not flash, remount chrome, or lose navigation.
