import {html} from "@benev/slate"
import {standard_panel_styles as styles, panel} from "@benev/construct"

import {shadow_view} from "../../context/context.js"
import fontcursor from "../../icons/gravity-ui/fontcursor.svg.js"

export const SubtitlesPanel = panel({
  label: "Subtitles",
  icon: fontcursor,
  view: shadow_view(use => ({}: any) => {
    use.styles(styles)
    use.name("subtitles")
    return html`
      <omni-subtitles></omni-subtitles>
    `
  }),
}) 