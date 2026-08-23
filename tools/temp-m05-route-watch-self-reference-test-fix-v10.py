#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    path = args.root.resolve() / "test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js"
    text = path.read_text()
    old = """  const selfReference=clone(compared);
  const {proof_sha256:ignored,...core}=selfReference;
  selfReference.previous_receipt_proof_sha256=sha256(Buffer.from(canonicalJson(core),'utf8'));
  resign(selfReference);
  selfReference.previous_receipt_proof_sha256=selfReference.proof_sha256;
  resign(selfReference);
  assert.throws(()=>validateReceipt(selfReference,contract),/cannot name its own proof/u);
"""
    new = """  const selfReference=clone(compared);
  selfReference.previous_receipt_proof_sha256=selfReference.proof_sha256;
  assert.throws(()=>validateReceipt(selfReference,contract),/cannot name its own proof/u);
"""
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"self-reference test: expected one target, found {count}")
    path.write_text(text.replace(old, new, 1))


if __name__ == "__main__":
    main()
