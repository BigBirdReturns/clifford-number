# Preference custody, standing, and objective-control authority

This candidate-only laboratory supports issue [#594](https://github.com/BigBirdReturns/clifford-number/issues/594). It executes the distinction between evidence about a public and authority held by a public.

The fixture holds aggregate support constant at 80 percent while changing the source of the support evidence, the decision instrument, the rights held by affected people, and the consequence permitted by the system.

## Shared support headline

Every authority world reports:

```text
support: 800
oppose: 200
support rate: 80%
```

The numeric headline does not determine authority.

## Four authority worlds

### Modeled support with commissioner approval

The support evidence is synthetic prediction. The commissioner approves the intervention through unilateral institutional authority. The system records institutional approval and refuses to call the result public authorization.

```text
institutional approval: true
public authorization: false
implementation: institutionally approved without public authorization
```

### Advisory human feedback with commissioner approval

Affected people provide direct feedback, but the consultation is advisory. They cannot amend the objective, suspend implementation, veto the decision, or compel remedy. The commissioner remains the sole consequential actor.

```text
institutional approval: true
public authorization: false
```

The presence of actual human input does not make the procedure binding.

### Binding balanced approval

The affected constituency is defined. A binding instrument specifies quorum, overall support, group support, a challenge window, and enforceable rights to amend the objective, suspend implementation, veto the proposal, appeal, and obtain remedy. Both groups satisfy the distributional threshold.

```text
public authorization: true
implementation: authorized by binding public standing
```

### Binding distributed rejection

Aggregate support remains 80 percent, but alpha support is 100 percent and beta support is 60 percent. The binding rule requires at least two-thirds support in each affected group. The aggregate threshold passes, the beta threshold fails, and the public disposition rejects the proposal.

```text
public authorization: false
binding public rejection: true
implementation: blocked
```

The model or commissioner cannot override the sealed public rule by citing the aggregate headline.

## Authority chain

Each world emits a hash-linked chain:

```text
proposal sealed
→ support evidence recorded
→ authority instrument sealed
→ attributed decision disposition
→ deterministic authority resolution
→ interpretation sealed
```

Support evidence retains its source class. Synthetic prediction, advisory response, and binding constituency disposition are separate objects. The authority instrument retains the decision rule and enforceable rights. The resolution records institutional approval, public authorization, binding rejection, and implementation state separately.

## Refusal rules

```text
prediction = evidence, not authority
advisory feedback ≠ binding participation
institutional approval ≠ public authorization
aggregate support does not override a distributional rule
public authorization requires binding affected-public standing
objective control requires amendment, suspension, veto, appeal, and remedy
public rejection blocks implementation
model accuracy does not confer jurisdiction
```

## What standing requires

A real deployment needs evidence of more than consultation volume or agreement. It must preserve:

- the eligible affected constituency;
- the binding decision rule;
- quorum and thresholds;
- rights to redefine or amend the objective;
- suspension and veto authority;
- challenge, appeal, and remedy procedures;
- an attributed constituency disposition;
- an enforcement receipt showing that approval or rejection changed the implementation state.

A company, agency, editor, product team, or other commissioner may possess lawful institutional authority without claiming democratic authorization. The fixture does not collapse those categories. It prevents the institution from converting predictive support, user behavior, or advisory consultation into a stronger authority class than the governing instrument provides.

## Run

```bash
node tools/compile-preference-standing.mjs
node tools/validate-preference-standing.mjs
node test/preference-standing.test.js
```

Generated projections:

```text
build/research/preference-standing-authority.json
build/research/preference-standing-authority.md
```

## Evidence boundary

This fixture creates no claim about Electric Twin, News UK, Dentsu, any vendor, any publisher, or any real institution. It does not prescribe one universal constitution or decision threshold. It creates no legitimacy finding, preference-change finding, manipulation claim, intent inference, graph effect, or thesis evidence.

Its qualified conclusion is exact: support and authorization are different object classes. Public authorization cannot be inferred from a prediction, behavioral agreement, advisory feedback, or commissioner approval because authorization depends on an external binding instrument that gives the affected constituency enforceable control over the objective and consequence.
