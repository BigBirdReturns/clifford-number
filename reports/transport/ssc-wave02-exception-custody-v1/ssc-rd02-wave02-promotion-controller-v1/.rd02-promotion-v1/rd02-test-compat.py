#!/usr/bin/env python3
import argparse
from pathlib import Path

TEST_PATH = Path('test/status-sovereignty-rd-wave02-rd02-license-leverage.test.js')

REPLACEMENT = """const current=clone(bundle.current);const currentMode=validateCurrentAtlasCustody(current,bundle.manifest.combined_sha256);let pre,post;
if(currentMode==='pre_promotion'){pre=current;post=clone(pre);post.authority='six_terminal_class_receipts_promoted_without_cross_lane_empirical_authority';post.promoted_class_receipts.push({lane_id:'RD-02',class_id:'RD-02-C04',issue:787,source_pr:802,merge_commit:'1'.repeat(40),constitutional_exact_label:CLASS_LABEL,receipt_class_label:CLASS_LABEL,labels_exact_match:true,label_reconciliation:'none',terminal_state:TERMINAL_STATE,closure_reference_path:CLOSURE_PATH,class_receipt_path:`${PRODUCT_ROOT}/class-receipt.json`,manifest_combined_sha256:bundle.manifest.combined_sha256,class_closed:true});post.selected_classes_open=[];post.counts.terminal_class_receipts=6;post.counts.classes_closed_this_wave=6;post.counts.closed_residual_classes=6;post.counts.open_residual_classes=36;post.current_result.terminal_state='six_of_forty_two_residual_classes_closed_all_selected_attempts_terminal';post.current_result.classes_closed=6;post.current_result.classes_open=36;post.current_result.closed_class_ids=[...post.current_result.closed_class_ids,'RD-02-C04'];post.current_result.open_selected_class_ids=[];post.current_result.all_six_selected_classes_closed=true;}else{post=current;pre=clone(post);pre.authority='five_terminal_class_receipts_promoted_without_cross_lane_empirical_authority';pre.promoted_class_receipts=pre.promoted_class_receipts.filter((row)=>row.class_id!=='RD-02-C04');pre.selected_classes_open=[{class_id:'RD-02-C04'}];pre.counts.terminal_class_receipts=5;pre.counts.classes_closed_this_wave=5;pre.counts.closed_residual_classes=5;pre.counts.open_residual_classes=37;pre.current_result.terminal_state='five_of_forty_two_residual_classes_closed_one_selected_attempt_open';pre.current_result.classes_closed=5;pre.current_result.classes_open=37;pre.current_result.closed_class_ids=pre.current_result.closed_class_ids.filter((id)=>id!=='RD-02-C04');pre.current_result.open_selected_class_ids=['RD-02-C04'];pre.current_result.all_six_selected_classes_closed=false;}
assert.equal(validateCurrentAtlasCustody(pre,bundle.manifest.combined_sha256),'pre_promotion');assert.equal(validateCurrentAtlasCustody(post,bundle.manifest.combined_sha256),'post_promotion');"""


def patch(repo: Path) -> None:
    path = repo / TEST_PATH
    lines = path.read_text().splitlines()
    pre_indices = [i for i, line in enumerate(lines) if line.startswith('const pre=clone(bundle.current);')]
    post_indices = [i for i, line in enumerate(lines) if line.startswith('const post=clone(pre);')]
    if pre_indices != [11] or post_indices != [12]:
        raise RuntimeError(
            f'RD-02 custody test anchors changed: pre={pre_indices!r} post={post_indices!r}'
        )
    if post_indices[0] != pre_indices[0] + 1:
        raise RuntimeError('RD-02 custody test anchors are no longer adjacent')
    lines[pre_indices[0] : post_indices[0] + 1] = REPLACEMENT.splitlines()
    content = '\n'.join(lines) + '\n'
    if content.count("currentMode=validateCurrentAtlasCustody") != 1:
        raise RuntimeError('RD-02 successor-safe custody mode was not installed exactly once')
    if "const pre=clone(bundle.current);" in content or "const post=clone(pre);" in content:
        raise RuntimeError('stale RD-02 one-way custody construction remains')
    path.write_text(content)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, default=Path('.'))
    args = parser.parse_args()
    patch(args.repo.resolve())
    print(TEST_PATH.as_posix())


if __name__ == '__main__':
    main()
