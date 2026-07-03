return {
  -- Diagnostics: zsh's own `--no-exec` syntax check (no shellcheck — it can't
  -- parse zsh and would emit false positives on zsh-isms). Syntax-only, but
  -- zero false positives and no extra binary (zsh is already installed).
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = {
        zsh = { "zsh" },
      },
    },
  },

  -- Formatting: shfmt gained a zsh dialect in v3.13. Pass `-ln zsh` only for
  -- zsh buffers so the default sh/bash handling is untouched. `-ln` overrides
  -- editorconfig, so pass `-i 2` explicitly to keep the repo's 2-space style.
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = {
        zsh = { "shfmt" },
      },
      formatters = {
        shfmt = {
          prepend_args = function(_, ctx)
            return vim.bo[ctx.buf].filetype == "zsh" and { "-ln", "zsh", "-i", "2" } or {}
          end,
        },
      },
    },
  },
}
