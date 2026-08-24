from pathlib import Path

path = Path('test/industrial-exhaust-retained-store-custody.test.js')
text = path.read_text()

start_marker = "  const assertAncestorSwapCannotRedirectPublication = ({\n"
end_marker = "\n  const ancestorRaceIndexRoot = fs.mkdtempSync(\n"
start = text.index(start_marker)
end = text.index(end_marker, start)
replacement = r'''  const assertHelperWriteAuthorityIsReceiptParentOnly = ({
    receiptType,
    raceRoot,
    externalRoot,
    absoluteReceiptPath,
    writeReceipt
  }) => {
    const canonicalReceiptsPath = path.join(raceRoot, 'receipts');
    const displacedReceiptsPath = path.join(raceRoot, 'receipts-displaced');
    const externalReceiptsPath = path.join(externalRoot, 'receipts');
    const relativeWithinReceipts = path.relative(
      canonicalReceiptsPath,
      absoluteReceiptPath
    );
    const externalReceiptPath = path.join(
      externalReceiptsPath,
      relativeWithinReceipts
    );

    fs.mkdirSync(path.dirname(absoluteReceiptPath), { recursive: true });
    fs.mkdirSync(path.dirname(externalReceiptPath), { recursive: true });
    const control = {
      events: [],
      fault: {
        type: 'swap_visible_ancestor_after_temp_open',
        canonical_receipts_path: canonicalReceiptsPath,
        displaced_receipts_path: displacedReceiptsPath,
        external_receipts_path: externalReceiptsPath
      }
    };

    try {
      const expectedRelativePath = path.relative(
        raceRoot,
        absoluteReceiptPath
      ).split(path.sep).join('/');
      assert.equal(
        withReceiptDirfdControl(control, writeReceipt),
        expectedRelativePath,
        `${receiptType} publication must continue after denying ambient ancestor mutation`
      );
      const confinementScopes = [...new Set(
        control.events
          .filter(event => event.type === 'filesystem-write-confined')
          .map(event => event.scope)
      )].sort();
      assert.deepEqual(
        confinementScopes,
        ['receipt-parent', 'repository-root'],
        `${receiptType} helper must enter repository-root and receipt-parent Landlock domains`
      );
      assert.equal(
        control.events.some(
          event => event.type === 'ambient-write-denied'
            && event.operation === 'visible-ancestor-swap'
        ),
        true,
        `${receiptType} helper must prove that ancestor mutation was denied`
      );
      assert.equal(
        control.events.some(event => event.type === 'visible-ancestor-swapped'),
        false,
        `${receiptType} helper may not alter the visible receipt ancestor`
      );
      assert.equal(
        fs.existsSync(displacedReceiptsPath),
        false,
        `${receiptType} denied mutation may not displace the canonical receipt tree`
      );
      assert.equal(
        fs.existsSync(externalReceiptPath),
        false,
        `${receiptType} helper may not mutate the external replacement tree`
      );
      assert.equal(
        fs.existsSync(absoluteReceiptPath),
        true,
        `${receiptType} receipt must remain reachable after ambient mutation denial`
      );
    } finally {
      fs.rmSync(raceRoot, { recursive: true, force: true });
      fs.rmSync(externalRoot, { recursive: true, force: true });
    }
  };
'''
text = text[:start] + replacement + text[end:]
count = text.count('assertAncestorSwapCannotRedirectPublication({')
if count != 2:
    raise SystemExit(f'expected two ancestor-race calls, found {count}')
text = text.replace(
    'assertAncestorSwapCannotRedirectPublication({',
    'assertHelperWriteAuthorityIsReceiptParentOnly({'
)
path.write_text(text)
