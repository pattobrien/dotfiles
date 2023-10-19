-- Make sure to have these plugins in your 'init.lua' file or wherever you handle plugins.
-- use 'nvim-lua/plenary.nvim'
-- use 'nvim-telescope/telescope.nvim'

local M = {}

local telescope = require('telescope')
local plenary = require('plenary')

local run_flutter_command = function(dir)
  local handle, err = io.popen('cd ' .. dir .. ' && flutter packages run build_runner watch --delete-conflicting-outputs')

  if handle == nil then
    print(err)
    return
  end

  local result = handle:read("*a")
  handle:close()

  -- Print the result to Neovim command line.
  print(result)
end

local select_directory_and_run_command = function()
  -- telescope.builtin.find_files({
  --   prompt_title = "< Select a directory >",
  --   cwd = vim.fn.getcwd(),
  --   hidden = true,
  --   follow = true,
  --   search_dirs = { vim.fn.getcwd() }, -- Set current directory as the root for searching.
  --   attach_mappings = function(_, map)
  --     map('i', '<CR>', function(prompt_bufnr)
  --       local selection = require('telescope.actions.state').get_selected_entry(prompt_bufnr)
  --       require('telescope.actions').close(prompt_bufnr)
  --
  --       -- Run the Flutter command in the selected directory.
  --       run_flutter_command(selection.value)
  --     end)
  --
  --     -- Return true to keep the mappings as they were.
  --     return true
  --   end
  -- })
  local cwd = vim.fn.getcwd()
end


local Popup = require("nui.popup")
local Layout = require("nui.layout")

function M.my_picker(opts)
  opts = opts or {}
  opts.cwd = opts.cwd or vim.fn.getcwd()


  local popup_one, popup_two = Popup({
    enter = true,
    border = "single",
  }), Popup({
    border = "double",
  })

  local layout = Layout(
    {
      position = "50%",
      size = {
        width = 80,
        height = "60%",
      },
    },
    Layout.Box({
      Layout.Box(popup_one, { size = "40%" }),
      Layout.Box(popup_two, { size = "60%" }),
    }, { dir = "row" })
  )

  local current_dir = "row"

  popup_one:map("n", "r", function()
    if current_dir == "col" then
      layout:update(Layout.Box({
        Layout.Box(popup_one, { size = "40%" }),
        Layout.Box(popup_two, { size = "60%" }),
      }, { dir = "row" }))

      current_dir = "row"
    else
      layout:update(Layout.Box({
        Layout.Box(popup_two, { size = "60%" }),
        Layout.Box(popup_one, { size = "40%" }),
      }, { dir = "col" }))

      current_dir = "col"
    end
  end, {})

  layout:mount()
  -- require('telescope.builtin').find_files(opts)
end

local Input = require("nui.input")
local event = require("nui.utils.autocmd").event

local input = Input({
  position = "50%",
  size = {
    width = 20,
  },
  border = {
    style = "single",
    text = {
      top = "[Howdy?]",
      top_align = "center",
    },
  },
  win_options = {
    winhighlight = "Normal:Normal,FloatBorder:Normal",
  },
}, {
  prompt = "> ",
  default_value = "Hello",
  on_close = function()
    print("Input Closed!")
  end,
  on_submit = function(value)
    print("Input Submitted: " .. value)
  end,
})

-- mount/open the component
-- input:mount()

-- unmount component when cursor leaves buffer
input:on(event.BufLeave, function()
  input:unmount()
end)

return M