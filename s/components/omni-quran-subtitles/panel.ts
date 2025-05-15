import { html } from "@benev/slate"
import { standard_panel_styles as styles, panel } from "@benev/construct"

import { shadow_view } from "../../context/context.js"
import bookopen from "../../icons/gravity-ui/bookopen.svg.js"

export const QuranSubtitlesPanel = panel({
  label: "Quran Subtitles",
  icon: bookopen,
  view: shadow_view(use => ({}: any) => {
    use.styles(styles)
    use.name("quran-subtitles")
    return html`
      <omni-quran-subtitles></omni-quran-subtitles>
    `
  }),
}) 