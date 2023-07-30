local nvimtree = require("nvim-tree")

-- suggested settings from nvim-tree
vim.g.loaded = 1
vim.g.loaded_netrwPlugin = 1

nvimtree.setup({
  filters = {
    dotfiles = false,
    git_clean = false,
    no_buffer = false,
    -- custom = {
    --   "**/.DS_Store",
    --   "**/.git",
    -- },
    exclude = {
    --   -- '**/.dart_tool/**',
    },
  },  -- change folder arrow icons
  renderer = {
    highlight_git = true,
    indent_markers = {
      enable = true,
    },
    icons = {
      show = {
        git = false,
        folder = true,
        folder_arrow = false,
      },
      glyphs = {
        folder = {
          arrow_closed = "", -- arrow when folder is closed
          arrow_open = "", -- arrow when folder is open
        },
      },
    },
  },
  -- disable window_picker for
  -- explorer to work well with
  -- window splits
  actions = {
    open_file = {
      window_picker = {
        enable = false,
      },
    },
  },
  reload_on_bufenter = true,
  git = {
    enable = true,
    show_on_dirs = true,
  },
  modified = {
    enable = true,
    show_on_dirs = false,
  },
  diagnostics = {
    enable = true,
    show_on_dirs = true,
    show_on_open_dirs = true,
    debounce_delay = 50,
    severity = {
      min = vim.diagnostic.severity.WARN,
      max = vim.diagnostic.severity.ERROR,
    },
    icons = {
      -- hint = "",
      -- info = "",
      warning = "",
      error = "",
    },
  },
  sync_root_with_cwd = true,
  respect_buf_cwd = true,
  update_focused_file = {
    enable = true,
    update_root = true
  },
  tab = {
    sync = {
      open = true,
      close = true,
      ignore = {},
    },
  },
})
