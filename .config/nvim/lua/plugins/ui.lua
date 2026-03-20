return {
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
