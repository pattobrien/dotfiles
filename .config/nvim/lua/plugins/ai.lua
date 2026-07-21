return {
  -- sidekick is keys-lazy by default; upstream loads it via a lualine component
  -- that our custom lualine sections replace, so load it explicitly on file
  -- open — otherwise NES autocmds never register
  {
    "folke/sidekick.nvim",
    event = "LazyFile",
  },
}
