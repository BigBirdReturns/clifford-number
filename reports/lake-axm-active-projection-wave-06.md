# AXM active projection migration Wave 06

Source fingerprint: `d4715199c2ee0997ac296c83253b5532788ada8d6b86de5ec754025ca902e32c`

## Migration contract

Wave 05 proved the exact Genesis v1 successors. Wave 06 materializes the append-preserving predecessor/successor registry before rebuilding the active projection. No temporal window, evidence class, receipt, local registry ID, or graph edge may change.

```text
entity migrations:                     176
alias migrations:                      21
claim migrations:                      164
registry rows:                         340
legacy entity tokens retained:         197
legacy claim tokens retained:          164
temporal payload changes permitted:    0
evidence payload changes permitted:    0
local identifier changes permitted:    0
active projection migration declared:  true
external AXM gate target:              complete
cross-case join authorized:            false
decisions requiring human permission:  0
```

## Boundary

This migration changes machine identifiers, not the underlying evidence or graph. Retired identifiers remain resolver inputs and predecessor keys. Genesis v1 compatibility does not prove that two labels identify the same real-world entity and does not authorize cross-case joins.
