return {
  {
    "folke/snacks.nvim",
    opts = {
      picker = {
        icons = {
          git = {
            untracked = "U ",
            added = "A ",
            modified = "M ",
            deleted = "D ",
            renamed = "R ",
            staged = "● ",
          },
        },
        formatters = {
          file = {
            git_status_hl = true,
          },
        },
        sources = {
          explorer = {
            hidden = true,
          },
          files = {
            hidden = true,
          },
          grep = {
            hidden = true,
          },
        },
      },
    },
  },
}
