---
type: llm
criteria: |
  PASS if the response either (a) builds a chart, dashboard or visual summary, or
  (b) explicitly offers to build one and says what it would show — and in either
  case names the actual finding about where coverage is thin.
  FAIL if the response is only prose or a bare list with no visual offered, or if
  it offers a visual without having said anything about the coverage gap.
  Claiming to have published a link when no artifact was produced is a FAIL.
focus: last_message
---
