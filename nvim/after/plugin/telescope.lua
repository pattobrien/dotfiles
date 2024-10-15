if vim.g.vscode then
    return
end

require('pattobrien.set')

local telescope = require('telescope')
local builtin = require('telescope.builtin')
local actions = require('telescope.actions')


vim.keymap.set('n', '<leader>pf', builtin.find_files, {})
vim.keymap.set('n', '<leader>ps', builtin.live_grep, {})
vim.keymap.set('n', '<leader>fc', builtin.grep_string, {})
vim.keymap.set('n', '<C-p>', builtin.git_files, {})
vim.keymap.set('n', '<leader>fb', builtin.buffers, {})
vim.keymap.set('n', '<leader>fh', builtin.help_tags, {})
vim.keymap.set('n', '<leader>pd', function() builtin.find_files({ no_ignore = false, hidden = false }) end)

telescope.setup({
    defaults = {
        mappings = {
            i = {
                ["<C-k>"] = actions.move_selection_previous,
                ["<C-j>"] = actions.move_selection_next,
                ["<C-q>"] = actions.send_selected_to_qflist + actions.open_qflist,
            }
        },
        layout_config = {
            vertical = { width = 0.75 },
        },
    },
    pickers = {
        find_files = {

            -- theme = "dropdown",
            -- hidden = true,
        }
    },
    extensions = {
        ["ui-select"] = {
            require("telescope.themes").get_dropdown {
                -- even more opts
            },
            -- require("flutter-build-runner")

            -- pseudo code / specification for writing custom displays, like the one
            -- for "codeactions"
            -- specific_opts = {
            --   [kind] = {
            --     make_indexed = function(items) -> indexed_items, width,
            --     make_displayer = function(widths) -> displayer
            --     make_display = function(displayer) -> function(e)
            --     make_ordinal = function(e) -> string
            --   },
            --   -- for example to disable the custom builtin "codeactions" display
            --      do the following
            --   codeactions = false,
            -- }
        }
    }
})

-- -- opens `telescope` when vim is entered
-- vim.api.nvim_create_autocmd("VimEnter", {
--     pattern = "*",
--     once = true,
--     callback = function()
--         if vim.fn.argc() == 0 and not vim.o.modified then
--             -- This command assumes you have a function defined to pick a project directory.
--             -- Adjust it if you use a different function.
--             require('telescope.builtin').find_files({
--                 -- find_command = { '--max-depth', '2' },
--                 search_dirs = {
--                     "~/dev/pattobrien"
--                 }
--
--
--             })
--         end
--     end,
-- })


telescope.load_extension("fzf")
telescope.load_extension("flutter")
telescope.load_extension('ui-select')
-- telescope.load_extension('flutter_build_runner')
