return {
  {
    "bullets-vim/bullets.vim",
    lazy = false,
    init = function()
      vim.g.bullets_enabled_file_types = { "markdown" }
      vim.g.bullets_outline_levels = { "std-" }
      vim.g.bullets_checkbox_markers = " x"
      vim.g.bullets_nested_checkboxes = 0
      vim.g.bullets_set_mappings = 0
      vim.g.bullets_custom_mappings = {
        { "imap", "<cr>", "<Plug>(bullets-newline)" },
        { "inoremap", "<C-cr>", "<cr>" },
        { "nmap", "o", "<Plug>(bullets-newline)" },
        { "nmap", "gN", "<Plug>(bullets-renumber)" },
        { "vmap", "gN", "<Plug>(bullets-renumber)" },
        { "nmap", "<leader>cb", "<Plug>(bullets-toggle-checkbox)" },
        { "imap", "<C-t>", "<Plug>(bullets-demote)" },
        { "imap", "<C-d>", "<Plug>(bullets-promote)" },
        { "nmap", ">>", "<Plug>(bullets-demote)" },
        { "nmap", "<<", "<Plug>(bullets-promote)" },
        { "vmap", ">", "<Plug>(bullets-demote)" },
        { "vmap", "<", "<Plug>(bullets-promote)" },
      }
    end,
  },
}
