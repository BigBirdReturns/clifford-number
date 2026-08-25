from pathlib import Path

LIB_PATH = Path("tools/lib/industrial-exhaust-artifacts.mjs")
TEST_PATH = Path("test/industrial-exhaust-retained-store-custody.test.js")

lib = LIB_PATH.read_text()
confinement_anchor = '''        chain_descriptors.append(descriptor)
        chain.append({"display": display, **identity(descriptor_stats)})
        maybe_rename_directory_chain_sibling(display, create)
'''
if lib.count(confinement_anchor) != 1:
    raise SystemExit("progressive confinement anchor mismatch")
confinement_block = '''        chain_descriptors.append(descriptor)
        chain.append({"display": display, **identity(descriptor_stats)})
        restrict_filesystem_writes(
            descriptor,
            f"directory-chain:{display}",
        )
        maybe_rename_directory_chain_sibling(display, create)
'''
lib = lib.replace(confinement_anchor, confinement_block)

proof_anchor = '''    const parentConfinement = writeConfinementEvents.find(
      event => event?.scope === 'receipt-parent'
    );
    if (!eventTypes.has('runtime-confined')
      || writeConfinementEvents.length !== 2
      || capabilityEvents.length !== 1
      || !rootConfinement
      || !parentConfinement
      || Number(rootConfinement?.abi) < 3
'''
if lib.count(proof_anchor) != 1:
    raise SystemExit("parent progressive proof anchor mismatch")
proof_block = '''    const parentConfinement = writeConfinementEvents.find(
      event => event?.scope === 'receipt-parent'
    );
    const directoryConfinements = writeConfinementEvents.filter(
      event => typeof event?.scope === 'string'
        && event.scope.startsWith('directory-chain:')
    );
    const chainEntries = Array.isArray(response.chain)
      ? response.chain.slice(1)
      : [];
    const directoryConfinementByScope = new Map(
      directoryConfinements.map(event => [event.scope, event])
    );
    const directoryChainConfined =
      directoryConfinementByScope.size === directoryConfinements.length
      && directoryConfinements.length === chainEntries.length
      && chainEntries.every(entry => {
        const event = directoryConfinementByScope.get(
          `directory-chain:${entry?.display}`
        );
        return event
          && Number(event.abi) >= 3
          && String(event.dev) === String(entry?.dev)
          && String(event.ino) === String(entry?.ino);
      });
    if (!eventTypes.has('runtime-confined')
      || writeConfinementEvents.length !== chainEntries.length + 2
      || capabilityEvents.length !== 1
      || !rootConfinement
      || !parentConfinement
      || !directoryChainConfined
      || Number(rootConfinement?.abi) < 3
'''
lib = lib.replace(proof_anchor, proof_block)
LIB_PATH.write_text(lib)

test = TEST_PATH.read_text()
scope_anchor = '''      const confinementScopes = [...new Set(
        control.events
          .filter(event => event.type === 'filesystem-write-confined')
          .map(event => event.scope)
      )].sort();
      assert.deepEqual(
        confinementScopes,
        ['receipt-parent', 'repository-root'],
        `${receiptType} helper must enter repository-root and receipt-parent Landlock domains`
      );
'''
if test.count(scope_anchor) != 1:
    raise SystemExit("progressive scope assertion anchor mismatch")
scope_block = '''      const parentSegments = path.relative(
        raceRoot,
        path.dirname(absoluteReceiptPath)
      ).split(path.sep).filter(Boolean);
      const expectedConfinementScopes = [
        'receipt-parent',
        'repository-root'
      ];
      let progressiveDisplay = '';
      for (const segment of parentSegments) {
        progressiveDisplay = progressiveDisplay
          ? `${progressiveDisplay}/${segment}`
          : segment;
        expectedConfinementScopes.push(
          `directory-chain:${progressiveDisplay}`
        );
      }
      const confinementScopes = [...new Set(
        control.events
          .filter(event => event.type === 'filesystem-write-confined')
          .map(event => event.scope)
      )].sort();
      assert.deepEqual(
        confinementScopes,
        [...new Set(expectedConfinementScopes)].sort(),
        `${receiptType} helper must progressively narrow every directory-chain Landlock domain`
      );
'''
test = test.replace(scope_anchor, scope_block)
TEST_PATH.write_text(test)
