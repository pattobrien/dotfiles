-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua

-- Shorten the :w save message (hide the full file path)
vim.api.nvim_create_autocmd("BufWritePost", {
  callback = function()
    local name = vim.fn.expand("%:t")
    local lines = vim.api.nvim_buf_line_count(0)
    vim.notify(string.format("%s saved (%dL)", name, lines), vim.log.levels.INFO)
  end,
})
