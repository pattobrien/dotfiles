-- -- Make sure to have these plugins in your 'init.lua' file or wherever you handle plugins.
-- -- use 'nvim-lua/plenary.nvim'
-- -- use 'nvim-telescope/telescope.nvim'
--
-- local M = {}
--
-- local telescope = require('telescope')
-- local plenary = require('plenary')
--
-- local run_flutter_command = function(dir)
--   local handle, err = io.popen('cd ' .. dir .. ' && flutter packages run build_runner watch --delete-conflicting-outputs')
--
--   if handle == nil then
--     print(err)
--     return
--   end
--
--   local result = handle:read("*a")
--   handle:close()
--
--   -- Print the result to Neovim command line.
--   print(result)
-- end
--
-- local select_directory_and_run_command = function()
--   telescope.builtin.find_files({
--     prompt_title = "< Select a directory >",
--     cwd = vim.fn.getcwd(),
--     hidden = true,
--     follow = true,
--     search_dirs = { vim.fn.getcwd() }, -- Set current directory as the root for searching.
--     attach_mappings = function(_, map)
--       map('i', '<CR>', function(prompt_bufnr)
--         local selection = require('telescope.actions.state').get_selected_entry(prompt_bufnr)
--         require('telescope.actions').close(prompt_bufnr)
--
--         -- Run the Flutter command in the selected directory.
--         run_flutter_command(selection.value)
--       end)
--
--       -- Return true to keep the mappings as they were.
--       return true
--     end
--   })
-- end
--
-- -- Map this function to a key combination.
-- vim.keymap.set('n', '<leader>br', function()
--     select_directory_and_run_command()
--   end,
--   { noremap = true, silent = true })
--
--
--
-- function M.my_picker(opts)
--   opts = opts or {}
--   opts.cwd = opts.cwd or vim.fn.getcwd()
--
--   require('telescope.builtin').find_files(opts)
-- end
--
-- return M
