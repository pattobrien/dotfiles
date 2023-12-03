if vim.g.vscode then 
  return
end

require 'nvim-web-devicons'.setup {}
require('nvim-tree')

vim.o.background = 'dark' -- For dark theme (neovim's default)

-- local colors = require('catppuccin').colorscheme
local C = require("catppuccin.palettes").get_palette() -- fetch colors from palette
local O = require("catppuccin").options

local N = {
  secondary = '#13B9FD',
  primary = '#0175C2',
  blue = '#02569B',
  darkTeal = '#00d2b8',
  lightTeal = '#55ddca',
  yellow = '#FFC108',
  oldLightBlue = '#00a4e4',
  lightGrey = '#D5D7DA',
  lightOrange = '#F4D1AE',
  almostWhitePink = '#EEE5E9',
  hotterPink = '#FF99C8',
  dark = '#023C40',
  lightPink = '#D3C0D2',
}

require('lspconfig')
require("catppuccin").setup({
  flavour = "mocha", -- latte, frappe, macchiato, mocha
  background = {
    -- :h background
    light = "latte",
    dark = "mocha",
  },
  transparent_background = false,
  show_end_of_buffer = false, -- show the '~' characters after the end of buffers
  term_colors = true,
  dim_inactive = {
    enabled = false,
    shade = "dark",
    percentage = 0.10,
  },
  no_italic = false, -- Force no italic
  no_bold = false,   -- Force no bold
  styles = {
    comments = { "strikethrough", "italic" },
    conditionals = { "italic" },
    loops = {},
    functions = {},
    keywords = {},
    strings = {},
    variables = {},
    numbers = {},
    booleans = {},
    properties = {},
    types = {},
    operators = {},
  },
  color_overrides = {},
  custom_highlights = {
    DapBreakpoint = { fg = C.red, },
    DapStopped = { bg = C.overlay0, },
    dapstopped = { bg = C.overlay0, },

    -- Semantic
    -- ['@class'] = { fg = N.darkTeal },
    -- ['@type'] = { fg = N.darkTeal },
    -- ['@keyword'] = { fg = C.mauve },

    -- ['@label'] = { fg = N.lightPink, },
    -- ['@property'] = { fg = N.lightTeal },
    -- ['@parameter'] = { fg = N.lightOrange },
    -- ['@operator'] = { fg = C.surface0 },
    --
    -- ['@annotation'] = { fg = N.dark },
    --
    -- ['@function'] = { fg = N.secondary },
    -- ['@method'] = { fg = N.secondary },
    --
    -- ['@constructor'] = { fg = N.oldLightBlue },
    --
    -- -- ['@struct'] = { fg = C.surface0 },
    -- -- ['@enum'] = { fg = C.surface0  },
    -- -- ['@enumMember'] = { fg = C.surface0 },
    -- -- ['@event'] = { fg = C.surface0},
    -- -- ['@interface'] = { fg = C.surface0 },
    -- -- ['@modifier'] = { fg = C.surface0 },
    -- -- ['@async'] = { fg = C.surface0 },
    -- -- ['@variable'] = { fg = C.surface0 },
    -- -- -- Container(
    -- -- --   label: Class.property(),
    -- -- -- )
    -- -- ['@regexp'] = { fg = C.surface0 },
    -- -- ['@typeParameter'] = { fg = C.surface0 },
    -- -- ['@decorator'] = { fg = C.surface0 },
    -- -- ['@comment'] = { fg = C.surface0 },
    -- -- ['@macro'] = { fg = C.surface0 },
    -- -- ['@string'] = { fg = C.surface0 },
    -- -- ['@number'] = { fg = C.surface0 },
    --
    -- -- ['@declaration'] = { fg = C.surface0 },
    -- ['@definition'] = { fg = C.surface0 },
    -- ['@readonly'] = { fg = C.surface0 },
    -- ['@static'] = { fg = C.surface0 },
    -- ['@deprecated'] = { fg = C.surface0 },
    -- ['@abstract'] = { fg = C.surface0 },
    -- ['@modification'] = { fg = C.surface0 },
    -- ['@documentation'] = { fg = C.surface0 },
    -- ['@defaultLibrary'] = { fg = C.surface0 },
    --
    -- -- is this a actual semantic token?
    -- ['@boolean'] = { fg = C.surface0 },
    --
    -- -- ['@punctuation'] = { fg = C.surface0, },
    -- -- ['@punctuation.delimiter'] = { fg = C.surface0, },
    -- -- ['@punctuation.bracket'] = { fg = C.surface0, },
    -- -- ['@punctuation.special'] = { fg = C.surface0, },
    -- -- ['@keyword.function'] = { fg = C.surface0, },
    -- -- ['@keyword.operator'] = { fg = C.surface0, },
    -- ['@namespace'] = { fg = C.surface0, },

    -- LspNamespace = { fg = C.blue, style = { "italic" } },
    -- LspType = { fg = C.surface0, style = O.styles.types or {} },
    -- LspClass = { fg = C.surface0, style = O.styles.keywords or {} },
    -- -- LspEnum = {},
    -- -- LspInterface =
    -- LspStruct = { fg = C.sapphire },
    -- LspTypeParameter = { fg = C.yellow, style = O.styles.types or {} }, -- For types.
    --
    -- LspParameter = { fg = C.maroon, style = { "italic" } }, -- For parameters of a function.
    --
    -- LspVariable = { fg = C.text, style = O.styles.variables or {} },
    -- LspProperty = { fg = C.teal, style = O.styles.properties or {} },
    -- -- LspEnumMember =
    -- -- LspEvent =
    -- LspFunction = { fg = C.blue, style = O.styles.functions or {} },
    -- LspMethod = { fg = C.blue, style = O.styles.functions or {} }, -- For method calls and definitions.
    -- LspMacro = { fg = C.teal, style = O.styles.functions or {} },
    -- LspKeyword = { fg = C.mauve, style = O.styles.keywords or {} },
    -- -- LspModifier =
    -- LspComment = { fg = C.red, style = O.styles.comments },
    -- LspString = { fg = C.green, style = O.styles.strings or {} },
    -- LspNumber = { fg = C.green, style = O.styles.numbers or {} },
    -- -- LspRegexp =
    -- LspOperator = { fg = C.sky, style = O.styles.operators or {} },
    -- -- LspDeclaration =
    -- -- LspDefinition =
    -- -- LspReadonly =
    -- -- LspStatic =
    -- LspDeprecated = { fg = C.surface2, style = { "strikethrough" } },
    -- -- LspAbstract =
    -- -- LspAsync =
    -- -- LspModification =
    -- -- LspDocumentation =
    -- -- LspDefaultLibrary =
  },
  integrations = {
    harpoon = true,
    lsp_saga = true,
    cmp = true,
    gitsigns = true,
    nvimtree = true,
    telescope = true,
    notify = true,
    mini = false,
    dap = {
      enabled = true,
      enable_ui = true,
    },
    native_lsp = {
      enabled = true,
      virtual_text = {
        errors = { "italic" },
        hints = { "italic" },
        warnings = { "italic" },
        information = { "italic" },
      },
      underlines = {
        errors = { "undercurl" },
        hints = { "undercurl" },
        warnings = { "undercurl" },
        information = { "undercurl" },
        ok = { "undercurl" },
      },
    },
    -- For more plugins integrations please scroll down (https://github.com/catppuccin/nvim#integrations)
  },
  highlight_overrides = {
    all = function(colors)
      return {
        LspNamespace = { fg = C.blue, style = { "italic" } },
        LspType = { fg = C.yellow, style = O.styles.types or {} },
        LspClass = { fg = C.mauve, style = O.styles.keywords or {} },
        -- LspEnum = {},
        -- LspInterface =
        LspStruct = { fg = C.sapphire },
        LspTypeParameter = { fg = C.yellow, style = O.styles.types or {} }, -- For types.
        LspParameter = { fg = C.maroon, style = { "italic" } },             -- For parameters of a function.
        LspVariable = { fg = C.text, style = O.styles.variables or {} },
        LspProperty = { fg = C.teal, style = O.styles.properties or {} },
        -- LspEnumMember =
        -- LspEvent =
        LspFunction = { fg = C.blue, style = O.styles.functions or {} },
        LspMethod = { fg = C.blue, style = O.styles.functions or {} }, -- For method calls and definitions.
        LspMacro = { fg = C.teal, style = O.styles.functions or {} },
        LspKeyword = { fg = C.mauve, style = O.styles.keywords or {} },
        -- LspModifier =
        LspComment = { fg = C.red, style = O.styles.comments },
        LspString = { fg = C.green, style = O.styles.strings or {} },
        LspNumber = { fg = C.green, style = O.styles.numbers or {} },
        -- LspRegexp =
        LspOperator = { fg = C.sky, style = O.styles.operators or {} },
        -- LspDeclaration =
        -- LspDefinition =
        -- LspReadonly =
        -- LspStatic =
        -- LspDeprecated = { fg = C.surface2, style = { "strikethrough" } },
        -- LspAbstract =
        -- LspAsync =
        -- LspModification =
        -- LspDocumentation =
        -- LspDefaultLibrary =
        -- DapBreakpoint = { fg = N.darkTeal, bg = C.red, },
        NvimTreeGitDirty = { fg = C.yellow },
        NvimTreeGitNew = { fg = C.green },
        NvimTreeGitDeleted = { fg = C.red, },
        NvimTreeGitIgnored = { fg = C.surface0, },
        DiagnosticUnderlineError = { fg = C.red, sp = C.red, undercurl = true },
        -- NvimTreeGitStaged
        -- NvimTreeGitMerge
        -- NvimTreeGitRenamed
        -- LspDiagnosticsUnderlineError = { fg = C.red, sp = C.red, undercurl = true },
        -- LspDiagnosticsUnderlineWarning = { fg = "#d78f00", sp = "#d78f00", undercurl = true },
        -- DiagnosticsUnderlineError = { fg = C.red, sp = C.red, undercurl = true },
        -- DiagnosticsUnderlineWarning = { fg = "#d78f00", sp = "#d78f00", undercurl = true },
      }
    end,

  },
})

-- setup must be called before loading
-- local colorscheme = require('catppuccin')
-- vim.highlight = colorscheme.highlight

vim.cmd.colorscheme "catppuccin"

require('dap')
require('lspconfig')

-- vim.cmd('highlight DiagnosticVirtualTextError guifg=#ff0000')
-- vim.cmd('highlight DiagnosticUnderlineError term=undercurl guisp=#ff0000 gui=undercurl')

local sign = vim.fn.sign_define

sign("DapBreakpoint", { text = "●", texthl = "DapBreakpoint", linehl = "", numhl = "" })
sign("DapBreakpointCondition", { text = "●", texthl = "DapBreakpointCondition", linehl = "", numhl = "" })
sign("DapLogPoint", { text = "◆", texthl = "DapLogPoint", linehl = "", numhl = "" })
sign('DapBreakpointCondition',
  { text = 'ﳁ', texthl = 'DapBreakpoint', linehl = 'dapbreakpoint', numhl = 'dapbreakpoint' })
sign('DapBreakpointRejected',
  { text = '', texthl = 'dapbreakpoint', linehl = 'dapbreakpoint', numhl = 'dapbreakpoint' })
sign('DapLogpoint', { text = '', texthl = 'daplogpoint', linehl = 'daplogpoint', numhl = 'daplogpoint' })
sign('DapStopped', { text = '', texthl = 'dapstopped', linehl = 'DapStopped', numhl = 'dapstopped' })

-- signs for LSP diagnostics underlines:w

sign('DiagnosticUnderlineError',
  {
    -- fg = "#ff0000",
    -- sp = "#ff0000",
    -- guifg = "#ff0000",
    text = '▔',
    -- texthl = 'DiagnosticVirtualTextError',
    linehl = 'DiagnosticVirtualTextError',
    numhl = 'DiagnosticVirtualTextError',
    -- texthl = 'LspDiagnosticsDefaultError',
    -- linehl = 'LspDiagnosticsUnderlineError',
    -- numhl = 'LspDiagnosticsUnderlineError'
  })
sign('DiagnosticVirtualTextError',
  {
    text = '▔',
    texthl = 'DiagnosticVirtualTextError',
    linehl = 'DiagnosticVirtualTextError',
    numhl = 'DiagnosticVirtualTextError',

    -- texthl = 'LspDiagnosticsDefaultError',
    -- linehl = 'LspDiagnosticsUnderlineError',
    -- numhl = 'LspDiagnosticsUnderlineError'
  })
sign('LspDiagnosticsUnderlineError',
  {
    fg = C.red,
    sp = C.red,
    text = '▔',
    texthl = 'LspDiagnosticsDefaultError',
    linehl = 'LspDiagnosticsUnderlineError',
    numhl = 'LspDiagnosticsUnderlineError'
  })
-- sign('DiagnosticUnderlineError',
--   { fg = C.red, sp = C.red, text = '▔', texthl = 'LspDiagnosticsDefaultError', linehl = 'LspDiagnosticsUnderlineError', numhl = 'LspDiagnosticsUnderlineError' })
-- sign('DiagnosticUnderlineWarn', { fg = C.yellow, sp = C.yellow, text = '▔', texthl = 'LspDiagnosticsDefaultWarning', linehl = 'LspDiagnosticsUnderlineWarning', numhl = 'LspDiagnosticsUnderlineWarning' })
--
-- vim.api.nvim_set_hl('DapBreakpoint', { ctermbg = 0, guifg = '#993939', guibg = '#31353f' }, false)
-- vim.api.nvim_set_hl('DapLogPoint', { ctermbg = 0, guifg = '#61afef', guibg = '#31353f' }, false)
-- vim.api.nvim_set_hl('DapStopped', { ctermbg = 0, guifg = '#98c379', guibg = '#31353f' }, false)

-- vim.api.nvim_set_hl(0, 'DiagnosticVirtualTextError', {
--   -- undercurl = true,
--   strikethrough = true,
-- })
-- vim.fn.sign_define('DapBreakpoint', {
--   text = '',
--   texthl = 'dapbreakpoint',
--   linehl = 'dapbreakpoint',
--   numhl = 'dapbreakpoint'
-- })

-- require('catppuccin.lib.highlighter').syntax({
--   -- NvimTreeGitDirty = { fg = C.yellow },
--   NvimTreeGitNew = { fg = C.green },
--   NvimTreeGitDeleted = { fg = C.red, },
--   -- NvimTreeGitIgnored = { fg = C.surface0, },
--   -- NvimTreeGitStaged
--   -- NvimTreeGitMerge
--   -- NvimTreeGitRenamed
--   LspDiagnosticsUnderlineError = { fg = "#ff5f87", sp = "#ff5f87", undercurl = true },
--   LspDiagnosticsUnderlineWarning = { fg = "#d78f00", sp = "#d78f00", undercurl = true },
--   DiagnosticsUnderlineError = { fg = "#ff5f87", sp = "#ff5f87", undercurl = true },
--   DiagnosticsUnderlineWarning = { fg = "#d78f00", sp = "#d78f00", undercurl = true },
-- })

-- vim.colorscheme = require('catppuccin').colorscheme
-- vim.cmd.colorscheme "catppuccin"

-- vim.highlight = colorscheme.highlight
-- vim.cm:d [[
-- autocmd ColorScheme * highlight DiagnosticVirtualTextError guifg=#ff0000
-- ]]
-- vim.cmd('colorscheme nightfly')
