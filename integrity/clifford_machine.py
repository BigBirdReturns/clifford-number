#!/usr/bin/env python3
"""Installed read-only Clifford executable. The operator pins scope at launch."""
import os
from pathlib import Path
from workbench import aperture
if __name__=='__main__':
    bundle=os.environ.get('CLIFFORD_EVIDENCE_BUNDLE')
    expected=os.environ.get('CLIFFORD_EVIDENCE_SHA256')
    if not bundle or not expected:
        raise SystemExit('Pinned CLIFFORD_EVIDENCE_BUNDLE and CLIFFORD_EVIDENCE_SHA256 are required')
    aperture(Path(bundle),expected,budget=24)
