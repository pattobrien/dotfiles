-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua

-- Disable LazyVim's spell check autocmd (fires on markdown, gitcommit, etc.)
vim.api.nvim_create_augroup("lazyvim_wrap_spell", { clear = true })

-- Keep copilot (ghost text + sidekick NES) off markdown. The root_dir gate in
-- plugins/lsp.lua is racy: on some opens copilot attaches before filetype is
-- set to "markdown", so the gate sees an empty ft and lets it through. Enforce
-- here — LspAttach fires after ft is known, catching every ordering.
vim.api.nvim_create_autocmd("LspAttach", {
  callback = function(ev)
    local client = vim.lsp.get_client_by_id(ev.data.client_id)
    if client and client.name == "copilot" and vim.bo[ev.buf].filetype == "markdown" then
      vim.schedule(function()
        vim.lsp.buf_detach_client(ev.buf, client.id)
      end)
    end
  end,
})

-- Shorten the :w save message (hide the full file path)
vim.api.nvim_create_autocmd("BufWritePost", {
  callback = function()
    local name = vim.fn.expand("%:t")
    local lines = vim.api.nvim_buf_line_count(0)
    vim.notify(string.format("%s saved (%dL)", name, lines), vim.log.levels.INFO)
  end,
})
