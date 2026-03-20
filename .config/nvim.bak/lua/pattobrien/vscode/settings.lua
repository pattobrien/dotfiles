
if vim.g.vscode then

  vim.api.nvim_set_keymap('n', '<C-j>', ":call VSCodeNotify('workbench.action.navigateDown')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('x', '<C-j>', ":call VSCodeNotify('workbench.action.navigateDown')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('n', '<C-k>', ":call VSCodeNotify('workbench.action.navigateUp')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('x', '<C-k>', ":call VSCodeNotify('workbench.action.navigateUp')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('n', '<C-h>', ":call VSCodeNotify('workbench.action.navigateLeft')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('x', '<C-h>', ":call VSCodeNotify('workbench.action.navigateLeft')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('n', '<C-l>', ":call VSCodeNotify('workbench.action.navigateRight')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('x', '<C-l>', ":call VSCodeNotify('workbench.action.navigateRight')<CR>", { noremap = true, silent = true })

  -- vim.api.nvim_set_keymap('n', '<C-w>_ ', ":<C-u>call VSCodeNotify('workbench.action.toggleEditorWidths')<CR>", { noremap = true, silent = true })

  -- vim.api.nvim_set_keymap('n', '<Space>', ":call VSCodeNotify('whichkey.show')<CR>", { noremap = true, silent = true })
  -- vim.api.nvim_set_keymap('x', '<Space>', ":call VSCodeNotify('whichkey.show')<CR>", { noremap = true, silent = true })

  -- vim.api.nvim_set_keymap('n', '<C-p>', ":call VSCodeNotify('workbench.action.quickOpen')<CR>", { noremap = true, silent = true })
  -- vim.api.nvim_set_keymap('n', '<C-f>', ":call VSCodeNotify('workbench.action.findInFiles')<CR>", { noremap = true, silent = true })
  -- vim.api.nvim_set_keymap('n', '<C-b>', ":call VSCodeNotify('workbench.action.quickOpenNavigateNextInFilePicker')<CR>", { noremap = true, silent = true })
  -- vim.api.nvim_set_keymap('n', '<C-n>', ":call VSCodeNotify('workbench.action.quickOpenNavigatePreviousInFilePicker')<CR>", { noremap = true, silent = true })

  -- vim.api.nvim_set_keymap('n', '<C-s>', ":call VSCodeNotify('workbench.action.files.save')<CR>", { noremap = true, silent = true })
  -- vim.api.nvim_set_keymap('n', '<C-S>', ":call VSCodeNotify('workbench.action.files.saveAs')<CR>", { noremap = true, silent = true })
  -- vim.api.nvim_set_keymap('n', '<C-q>', ":call VSCodeNotify('workbench.action.files.closeAll')<CR>", { noremap = true, silent = true })

  -- vim.api.nvim_set_keymap('n', '<C-t>', ":call VSCodeNotify('workbench.action.terminal.toggleTerminal')<CR>", { noremap = true, silent = true })
  -- vim.api.nvim_set_keymap('n', '<C-T>', ":call VSCodeNotify('workbench.action.terminal.split')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('n', '<C-t>', ":call VSCodeNotify('workbench.action.terminal.new')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('n', '<leader>pf', ":call VSCodeNotify('workbench.action.quickOpen')<CR>", { noremap = true, silent = true })
  vim.api.nvim_set_keymap('n', '<leader>ps', ":call VSCodeNotify('workbench.action.findInFiles')<CR>", { noremap = true, silent = true })
  
  vim.api.nvim_set_keymap('n', '<leader>qf', ":call VSCodeNotify('editor.action.quickFix')<CR>", { noremap = true, silent = true })
end