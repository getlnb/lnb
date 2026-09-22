---
type: llm
criteria: |
  PASS if the response asks the user what market to research — what they sell or
  study, who the buyers are, what categories — before saving anything, OR states
  it is running first-time setup and then asks.
  FAIL if it picks a market, invents category ids, or saves entries without
  having asked.
focus: last_message
---
