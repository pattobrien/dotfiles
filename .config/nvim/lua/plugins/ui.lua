return {
  -- Style LSP hover/signature popups (noice replaces the built-in handler)
  {
    "folke/noice.nvim",
    init = function()
      -- NoicePopupBorder defaults to a link to FloatBorder (dark/invisible).
      -- Override it after every colorscheme load so the hover border stays visible.
      vim.api.nvim_create_autocmd("ColorScheme", {
        callback = function()
          vim.api.nvim_set_hl(0, "NoicePopupBorder", { fg = "#585b70" }) -- catppuccin surface2
        end,
      })
      -- Also apply immediately for the initial load
      vim.api.nvim_set_hl(0, "NoicePopupBorder", { fg = "#585b70" })
    end,
    opts = {
      presets = {
        lsp_doc_border = true,
      },
      views = {
        hover = {
          border = {
            style = "rounded",
          },
          size = {
            max_width = 80,
          },
          win_options = {
            winhighlight = { Normal = "NormalFloat", FloatBorder = "NoicePopupBorder" },
          },
        },
      },
    },
  },

  -- Customize lualine — declutter the statusline
  {
    "nvim-lualine/lualine.nvim",
    opts = function(_, opts)
      -- Helper: show active LSP server names
      local function active_lsp_servers()
        local clients = vim.lsp.get_clients({ bufnr = 0 })
        if #clients == 0 then
          return ""
        end
        local names = {}
        for _, client in ipairs(clients) do
          table.insert(names, client.name)
        end
        return table.concat(names, ", ")
      end

      opts.sections = {
        lualine_a = { "mode" },
        lualine_b = { "branch" },
        lualine_c = { "filename" },
        lualine_x = {
          { "diagnostics", update_in_insert = true },
          { active_lsp_servers, icon = " " },
        },
        lualine_y = { "filetype" },
        lualine_z = { "location" },
      }

      opts.inactive_sections = {
        lualine_a = {},
        lualine_b = {},
        lualine_c = { "filename" },
        lualine_x = { "location" },
        lualine_y = {},
        lualine_z = {},
      }
    end,
  },
}
