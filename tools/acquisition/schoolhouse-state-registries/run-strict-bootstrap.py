#!/usr/bin/env python3
"""Execute run-strict.py with its dynamic module registered for dataclasses."""

from __future__ import annotations

from pathlib import Path

TARGET = Path(__file__).with_name("run-strict.py")
source = TARGET.read_text(encoding="utf-8")
source = source.replace(
    "import re\nimport urllib.parse\n",
    "import re\nimport sys\nimport urllib.parse\n",
    1,
)
source = source.replace(
    "MODULE = importlib.util.module_from_spec(SPEC)\nSPEC.loader.exec_module(MODULE)\n",
    "MODULE = importlib.util.module_from_spec(SPEC)\n"
    "sys.modules[SPEC.name] = MODULE\n"
    "SPEC.loader.exec_module(MODULE)\n",
    1,
)
if "sys.modules[SPEC.name] = MODULE" not in source:
    raise RuntimeError("strict runner bootstrap seam not found")
namespace = {
    "__name__": "__main__",
    "__file__": str(TARGET),
    "__package__": None,
}
exec(compile(source, str(TARGET), "exec"), namespace, namespace)
