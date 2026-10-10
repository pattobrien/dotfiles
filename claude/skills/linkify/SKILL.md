---
name: linkify
description: List every reference from the previous response as a clickable markdown link.
disable-model-invocation: true
---

Reply with only a bullet list of every file path, URL, repo, PR, issue and
package your previous response referenced, in the order they appeared, one per
bullet. Each bullet is a markdown link: the text is the reference exactly as
your previous response wrote it, and the target follows the link rules in
`~/.claude/CLAUDE.md`. Keep using links for the rest of this conversation.
