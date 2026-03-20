return {
  -- Use catppuccin mocha as the colorscheme
  {
    "catppuccin/nvim",
    name = "catppuccin",
    opts = {
      flavour = "mocha",
    },
  },

  -- Tell LazyVim to use catppuccin
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "catppuccin",
    },
  },

  -- Previous catppuccin config with semantic token customizations.
  -- Commented out during LazyVim migration — uncomment to restore custom highlights.
  --
  -- {
  --   "catppuccin/nvim",
  --   name = "catppuccin",
  --   opts = function()
  --     local C = require("catppuccin.palettes").get_palette()
  --     local O = require("catppuccin").options
  --     return {
  --       flavour = "mocha",
  --       background = { light = "latte", dark = "mocha" },
  --       transparent_background = false,
  --       show_end_of_buffer = false,
  --       term_colors = true,
  --       dim_inactive = { enabled = false, shade = "dark", percentage = 0.10 },
  --       styles = {
  --         comments = { "strikethrough", "italic" },
  --         conditionals = { "italic" },
  --       },
  --       custom_highlights = {
  --         DapBreakpoint = { fg = C.red },
  --         DapStopped = { bg = C.overlay0 },
  --       },
  --       integrations = {
  --         cmp = true,
  --         gitsigns = true,
  --         nvimtree = true,
  --         telescope = true,
  --         notify = true,
  --         dap = { enabled = true, enable_ui = true },
  --         native_lsp = {
  --           enabled = true,
  --           virtual_text = {
  --             errors = { "italic" },
  --             hints = { "italic" },
  --             warnings = { "italic" },
  --             information = { "italic" },
  --           },
  --           underlines = {
  --             errors = { "undercurl" },
  --             hints = { "undercurl" },
  --             warnings = { "undercurl" },
  --             information = { "undercurl" },
  --             ok = { "undercurl" },
  --           },
  --         },
  --       },
  --       highlight_overrides = {
  --         all = function(colors)
  --           return {
  --             LspNamespace = { fg = C.blue, style = { "italic" } },
  --             LspType = { fg = C.yellow, style = O.styles.types or {} },
  --             LspClass = { fg = C.mauve, style = O.styles.keywords or {} },
  --             LspStruct = { fg = C.sapphire },
  --             LspTypeParameter = { fg = C.yellow, style = O.styles.types or {} },
  --             LspParameter = { fg = C.maroon, style = { "italic" } },
  --             LspVariable = { fg = C.text, style = O.styles.variables or {} },
  --             LspProperty = { fg = C.teal, style = O.styles.properties or {} },
  --             LspFunction = { fg = C.blue, style = O.styles.functions or {} },
  --             LspMethod = { fg = C.blue, style = O.styles.functions or {} },
  --             LspMacro = { fg = C.teal, style = O.styles.functions or {} },
  --             LspKeyword = { fg = C.mauve, style = O.styles.keywords or {} },
  --             LspComment = { fg = C.red, style = O.styles.comments },
  --             LspString = { fg = C.green, style = O.styles.strings or {} },
  --             LspNumber = { fg = C.green, style = O.styles.numbers or {} },
  --             LspOperator = { fg = C.sky, style = O.styles.operators or {} },
  --             DiagnosticUnderlineError = { fg = C.red, sp = C.red, undercurl = true },
  --           }
  --         end,
  --       },
  --     }
  --   end,
  -- },
}
