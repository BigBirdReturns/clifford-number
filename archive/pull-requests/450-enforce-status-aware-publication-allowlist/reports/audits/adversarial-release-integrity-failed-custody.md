# Adversarial release-integrity payload custody failure

Date: 2026-07-29  
Prior lane: PR #382, `agent/adversarial-release-integrity`

The earlier adversarial-release lane retained a base64/XZ full-source carrier and a delta carrier. Before any reuse, both were treated as untrusted transport and tested independently.

Observed:

- the full-source carrier decoded to 161,728 compressed bytes but failed XZ integrity;
- its fifteen base64 parts contained one 14,999-character part and one 15,001-character part;
- 512 bounded single-symbol boundary repairs were tested with the XZ checksum as the acceptance oracle;
- none recovered a valid archive;
- the delta carrier ended in a literal `PLACEHOLDER` part and could not form one continuous strict base64 stream.

Disposition:

```text
executable authority: none
graph effect: none
publication authority: none
requirements-inventory value: retained
payload reuse: prohibited
```

The current publication repair is rebuilt from canonical `main`. The prior lane may be cited as a failed attempt and requirements inventory, but its payload bytes are not applied, merged, or represented as validated source.
