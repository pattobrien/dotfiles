local lualine = require('lualine')

local function is_process_running(name)
  -- os.execute returns true on success and nil + error message on failure.
  -- The pgrep command returns 0 (success) if the process is found and 1 (failure) if it is not.
  local success = os.execute('pgrep -f ' .. name .. ' > /dev/null 2>&1')
  -- print(success)
  return success == true
end

local function check_build_runner()
  if is_process_running('build_runner') == true then
    return 'build runner 🏃'
  else
    return 'build runner 🚫'
  end
end

lualine.setup({
  options = {
    theme = "catppuccin",
  },
  sections = {
    lualine_a = { "mode" },
    lualine_b = { "branch" },
    lualine_c = { "filename" },
    lualine_x = { {
      check_build_runner, color = { fg = { gui = 'Normal', cterm = 'Normal', cterm16 = 'Normal' } },
    }, "encoding", "fileformat", "filetype" },
    -- TODO: what does progress do? just the percentage of how far you are in the file?
    lualine_y = { "progress" },
    lualine_z = { "location" },
  },
  -- describe what the buffer should look like when not the active buffer
  inactive_sections = {
    lualine_a = {},
    lualine_b = {},
    lualine_c = { "filename" },
    lualine_x = { "location" },
    lualine_y = {},
    lualine_z = {},
  },
})
