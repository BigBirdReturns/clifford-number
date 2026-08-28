#!/usr/bin/env python3
"""Apply the exact V85 short-year extension-custody successor for PR #2231.

This controller-only program refuses every predecessor outside the frozen blob
contract, applies one embedded two-file patch, and verifies the exact successor
blobs before returning.
"""

from __future__ import annotations

import base64
import hashlib
from pathlib import Path
import subprocess
import zlib

LIB_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")
PRODUCT_PATHS = [str(TEST_PATH), str(LIB_PATH)]

PREDECESSOR_LIB_BLOB = "4ea5698df5928ad51c42172057578c0c2ef1781a"
PREDECESSOR_TEST_BLOB = "9a5ce8776697ae36d9833c052bfa923cf43f210d"
SUCCESSOR_LIB_BLOB = "2a6434fbdc88385fb922ee48bcd6d81c05474aff"
SUCCESSOR_TEST_BLOB = "0fda1487abcbe3352c49d7e92977333d749d18c1"
PATCH_SHA256 = "df3c230f0fe33f414f4de44e528a92c179a6f34b8615a89e86d6c21d0ae8f373"

PATCH_ZLIB_B64 = """
eNqtV19vG8cRf9enWMApxBN5x/+0JFdQGJtpXNuSIalFAZI2VndLcavjHnG3Z0v1ElDkOlAbpJaduGnroknQvrQvaYG2SR22H0YM
o+SJX6EzeyeKpFjTBkoQ3NndmdnfzOzMDh3eaBDT3OGS0LRkgUxz4YSB9Dl1TbbXpEBbuG79NCDbszjmYIvtkSVatNniZcvKNBya
LSySbCZTKhTmTNOcfcpcMpl8hZPefJOY+cV8KVUiST3mswTWGp5PErYnAkmqgrZYinDRDmWKsL02syVz6sRrkOocwc982beb/B4j
eSubszJ5q5TLlqzFTCE7n5rGUQXFktqSeC0uUdc8ctVTc0kCKpNaIGh6vjT3GfWJ47UALLdJu+kJRnzWolwEAAgsEgGsbzOAywgV
gE4yWPLEfCrWcxtlls+QmYjMRGTISorFqXwX8GnmKaiTL0Hd8ra5y2ZiJk0aNGfhXsqY2Vy+YBZLlxfJJSRfEfelVwHdCF33Pndk
k4zAn4n7h7RNBQvYFOzfPf/q2z//bdD93aD74aD7q0H3yaD7VBPHeuWDQffXeuWJJmD6G731EayQ/nuPTr8AyWfwnanxosWR+GvG
yvGQ6f9wv85v/jnra92yWOQ18QtPRNgdKhmRlLtDK7xQBtwZiRKhoQRJLveHqCbS18xlzFxpMkFeyhSjI2RYEs69N+ZcyGPXRVA+
FbsButS7x3yXtttc7BCH2bxFXdL2WYPvDYtH7LUx92YvW5lFK5cBDBMFxxkrxZ7nBmmXb0+rga2oFs9giYtxgdFiaWnRsnK0VMgX
GhPFeJaSuBrPYsNynM1hMYbfy1iJoyK8tVG+euP62g/u3i5vlG9tkhUi2H2yyWQCHD4XM91+Z32tcnfzdnkN2La2KhtrwJdOrC5X
k4Pu+/XE6kotWKhmzCXINnPQ/W3dUNVB9ygxbcdYnVgZoROGlR50H9eCmnlycHxy8OTk4OnJwYcnBx+dHD3V+QwZejTo/qL+oJjq
jCoBLKjWwD1jAY59Q1Xv1NoPbnbgZ61TV1UYN22ft+XKO1R0RmbcpztU0JGlG1TSXVyqK9ALX7iM+KuvOeC3VtWegcdZy5d06XhY
X71gZnqHh1fGHVj5yVZlbfP6+rgXa5M5WatXa0HqynLCiIy1wOzewSH6BF1RX4hAXcA1FZSBJkS1C4jTZ3/pP/4iCsEycF0aY6vq
Kc4MnOkI4mzVGDUtiXuvHqnkmKyxEPklOd0vm1vlja1R79xBpLN9McsRaoYHVGQ6io1bPgo+PRLQt9c3biHKa3fXfnSrsnH96t31
tzYrGz8ub02E9w7eTOdBNrXUqVmaKHWUHvMd2EoBme8Y6NPhNhgQM6T0mIsFQAOAPrMc6HhVxVx4Tg6VRgSELc4DsKFupM/Bz4Ic
6z2HtzAOL062i0j+p4T2dxSqNvPaLlNt5gcAZlWFAVCryoZCBe0YkqzVdr19xoDkLajYAUYVJvc4u6+HgEuUcLm9C6Pj3ReuRx0g
95mAqetSVNP2QoGLLPQ9nDLfZgKvCd1h4OIWvBegV23HI7xdYUCFA3LwxIDANg14QM5mNmiDqsoC1aL+LpOB8hoNbsMccANGhe8l
8LUgl5uIiu7DL+iEReNiPdL59vWLF6p//IH6+qt/qv7zP8AlfU+d/uk/QP9b9X//1/4nn6j+l4f9T/+uvnn/09PDf6n+i4+/PfpY
fU8Nuo+gwlwoMDfLb1VuTpRo+N5RtW3MaMlczBL9YIIH9KiidlLZzHVVg+6puBjFqSDC1jbzdSrAjAdRUixbumigDVEDNZJY6pvj
F/0vPx9uwUrv4bPe4We9hw97h5/3wIzvDv54+o/P+o+OVO/dX/afPe69+/P+8VHvEIjnsKqTNz7CeENbia9XsVDE56tYKKWyef1X
IhS2xMbD9uDGMMmun7UG+l2/CoZwEVJkSdgQWY5NTIrs+F7YDlKkwf1AGuQB9gK8QRL3qKs5nJsUHPp9kjGg15GhL0iDugG7Mp1v
ZWUl1mi5TOxAr2uS7FBS+iEKYheTTpN1YWODix6GgmU2fHbWxsMdYz4oxqYdukImoFOB/sVJRb1hG646dB3DVivWp2+iT0C0xQUg
CohsUkkC+FtF4jBa5JoHXZwE3l1o4Jqj/ZrDoZUJiOt5u7FCl+/qbjQUPnPRxMi0SC24EMzStx2MGG1ysTfUFkCySu1vCxWis15a
4PV/xfPQWAGYyc79WxGOYWCAdJ845lFY6cwlMSLR9RfYLq6Q8dAkSfbKOYtuXlfI5GlR7KqooG7phsywhOdDs8h/xhLza2/fuDpv
DGN/rbxVmVY2I0vwCGPuvwrSt40=
"""


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def require_blob(path: Path, expected: str, label: str) -> None:
    actual = git_blob_sha(path.read_bytes())
    print(f"{label} actual={actual} expected={expected}")
    if actual != expected:
        raise SystemExit(f"{label}: blob mismatch")


def run_git(*args: str, input_bytes: bytes | None = None) -> str:
    result = subprocess.run(
        ["git", *args],
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        raise SystemExit(
            f"git {' '.join(args)} failed ({result.returncode}):\n"
            f"{result.stderr.decode('utf-8', 'replace')}"
        )
    return result.stdout.decode("utf-8", "strict")


def main() -> None:
    require_blob(LIB_PATH, PREDECESSOR_LIB_BLOB, "predecessor-library")
    require_blob(TEST_PATH, PREDECESSOR_TEST_BLOB, "predecessor-focused-test")

    patch = zlib.decompress(base64.b64decode(PATCH_ZLIB_B64))
    actual_patch_sha = hashlib.sha256(patch).hexdigest()
    print(f"patch-sha256 actual={actual_patch_sha} expected={PATCH_SHA256}")
    if actual_patch_sha != PATCH_SHA256:
        raise SystemExit("embedded product patch digest mismatch")

    run_git("apply", "--check", "--whitespace=error-all", "-", input_bytes=patch)
    run_git("apply", "--whitespace=error-all", "-", input_bytes=patch)

    changed = sorted(
        line for line in run_git("diff", "--name-only").splitlines() if line
    )
    print("changed-paths=" + ",".join(changed))
    if changed != PRODUCT_PATHS:
        raise SystemExit(
            f"changed-path contract mismatch: actual={changed!r} expected={PRODUCT_PATHS!r}"
        )

    run_git("diff", "--check")
    require_blob(LIB_PATH, SUCCESSOR_LIB_BLOB, "successor-library")
    require_blob(TEST_PATH, SUCCESSOR_TEST_BLOB, "successor-focused-test")
    print("V85_REPAIR_APPLIED")


if __name__ == "__main__":
    main()
