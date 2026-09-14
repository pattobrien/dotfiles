local files_layout = { preview = false, layout = { width = 0.64, min_width = 96, height = 24 } }

local function files_when_typing(opts, ctx)
  if ctx.filter.pattern == "" then
    return {}
  end
  return require("snacks.picker.source.files").files(opts, ctx)
end

local RECENT_BOOST = 1000

local function recent_first(opts, ctx)
  local recent = vim.api.nvim_win_call(ctx.picker.main, function()
    return require("snacks.picker.source.recent").files(opts, ctx)
  end)
  return function(cb)
    local items = {}
    recent(function(item)
      items[#items + 1] = item
    end)
    for i, item in ipairs(items) do
      item.score_add = RECENT_BOOST * (#items - i + 1)
      cb(item)
    end
  end
end

local function refresh_on_empty_flip(picker, filter)
  local last = picker.finder.filter
  return last == nil or (last.pattern == "") ~= (filter.pattern == "")
end

return {
  {
    "folke/snacks.nvim",
    keys = {
      { "<leader>ff", LazyVim.pick("smart"), desc = "Find Files (Root Dir)" },
      { "<leader>fz", function() Snacks.picker.zoxide() end, desc = "Zoxide Dirs" },
    },
    opts = {
      picker = {
        icons = {
          git = {
            untracked = "U ",
            added = "A ",
            modified = "M ",
            deleted = "D ",
            renamed = "R ",
            staged = "● ",
          },
        },
        formatters = {
          file = {
            git_status_hl = true,
          },
        },
        sources = {
          explorer = {
            hidden = true,
          },
          files = {
            hidden = true,
            layout = files_layout,
            matcher = { frecency = true },
          },
          smart = {
            layout = files_layout,
            show_empty = true,
            filter = { cwd = true, transform = refresh_on_empty_flip },
            multi = {
              { source = "recent", finder = recent_first },
              { source = "files", finder = files_when_typing },
            },
          },
          grep = {
            hidden = true,
          },
        },
      },
    },
  },
}
