return {
  -- diffview-plus — maintained fork of diffview.nvim for PR-style diff review
  {
    "dlyongemallo/diffview-plus.nvim",
    main = "diffview",
    opts = {},
    cmd = {
      "DiffviewOpen",
      "DiffviewClose",
      "DiffviewFileHistory",
      "DiffviewToggleFiles",
      "DiffviewFocusFiles",
      "DiffviewRefresh",
      "DiffviewLog",
    },
    keys = {
      { "<leader>gv", "<cmd>DiffviewOpen<cr>", desc = "Diffview (working tree)" },
      { "<leader>gV", "<cmd>DiffviewOpen origin/HEAD...HEAD<cr>", desc = "Diffview (PR diff vs origin)" },
    },
  },
}
