/**
 * Rule: two Conditions evaluated by one signal, where what one of them does changes what the other reads.
 *
 * Bug P112-OWN018-FANOUT, ruled by Richard 2026-10-27 "Teach it and warn". A quiz's timer ended into two gates, "was
 * the answer right? add a point" and "not the last question? move on". The move-on gate's On True moved the question
 * index, and the scoring gate's condition (`selected == correct`) is read over that index: it scored every answer
 * against the next question's right answer. Measured in the runtime (`noodl-runtime/test/corpus/p112-own018-fanout`):
 * the reader sees the changed value whichever order the two are wired in, so wire order is no remedy. Chained (the
 * reader's Done → the writer's Evaluate), it decides first.
 *
 * What it flags: a signal output wired to the Evaluate of two or more Conditions, and, for a pair of them (reader R,
 * writer W), a node that W's outputs reach going forward along any wire AND that feeds R's Condition going backward
 * along VALUE wires only (a signal input does not change a value R reads; the node it reaches is on the forward side).
 * Inside one component, and through logic nodes only: a walk stops at a visual element or a component instance, whose
 * outputs answer a later event. A write that reaches the other through a shared Variable NAME, not a wire, is not seen
 * either. Two gates on two `at-<state>` outputs of one States node are a dispatcher (at most one is true) and are left
 * out. So the failure mode is a missed report rather than a false one.
 *
 * Warning, not blocking: a reader that is meant to see the change (move on, then "was that the last one?") is a correct
 * graph, and the message says which value it reads rather than calling it wrong.
 *
 * @module noodl-editor/validation/rules/conditionReadsASiblingsChange
 */

import { Diagnostic, DiagnosticCode } from '../diagnostics';
import { NormConnection, NormNode } from '../model';
import { ComponentContext, Rule, RuleContext } from './types';

const CONDITION = 'Condition';

export const conditionReadsASiblingsChange: Rule = {
  code: DiagnosticCode.ConditionReadsASiblingsChange,
  description: "Two Conditions evaluated by one signal, where one's On True or On False changes what the other reads.",
  defaultEnabled: true,

  run(ctx: RuleContext): Diagnostic[] {
    const out: Diagnostic[] = [];
    const { catalog } = ctx;

    for (const { component, nodeById } of ctx.components as ComponentContext[]) {
      const outgoing = new Map<string, NormConnection[]>();
      const incoming = new Map<string, NormConnection[]>();
      for (const c of component.connections) {
        (outgoing.get(c.fromId) ?? outgoing.set(c.fromId, []).get(c.fromId)!).push(c);
        (incoming.get(c.toId) ?? incoming.set(c.toId, []).get(c.toId)!).push(c);
      }
      const isCondition = (id: string) => nodeById.get(id)?.type === CONDITION;
      // A walk goes on only through logic nodes the catalog knows. A visual element's outputs (a click) and a component
      // instance's (its own Play again button) answer a later event, not this pulse: walking through them linked the
      // rocket race's "Move A?" to "Move B?" by way of the results screen's Play again (calibration, s19).
      const passesThrough = (id: string) => {
        const type = nodeById.get(id)?.type;
        const known = type ? catalog.getNode(type) : undefined;
        return !!known && !known.isVisual;
      };

      // One signal port into two or more Evaluates.
      const gatesBySource = new Map<string, string[]>();
      for (const c of component.connections) {
        if (c.toProperty !== 'eval' || !isCondition(c.toId)) continue;
        const key = `${c.fromId}\u0000${c.fromProperty}`;
        const gates = gatesBySource.get(key) ?? [];
        if (!gates.includes(c.toId)) gates.push(c.toId);
        gatesBySource.set(key, gates);
      }

      const reported = new Set<string>();
      for (const [key, gates] of gatesBySource) {
        if (gates.length < 2) continue;
        const sourceId = key.split('\u0000')[0];
        for (const reader of gates) {
          if (reported.has(reader)) continue;
          const feeds = feedingValues(reader);
          for (const writer of gates) {
            if (writer === reader) continue;
            if (exclusiveStates(reader, writer)) continue;
            if (!reaches(writer, feeds)) continue;
            reported.add(reader);
            const r = nodeById.get(reader) as NormNode;
            const w = nodeById.get(writer) as NormNode;
            const rName = r.label ? `"${r.label}"` : 'This Condition';
            const wName = w.label ? `"${w.label}"` : 'another Condition';
            const sName = nodeById.get(sourceId)?.label ? `"${nodeById.get(sourceId)!.label}"` : 'the same signal';
            out.push({
              code: DiagnosticCode.ConditionReadsASiblingsChange,
              severity: 'warning',
              message:
                `${rName} and ${wName} are both evaluated by ${sName}, and what ${wName} does changes what ${rName} reads. ` +
                `${rName} reads its Condition after that change, whichever order the two are wired in. ` +
                `If it should decide on the value from before, chain them: ${rName}'s Done into ${wName}'s Evaluate, instead of both from ${sName}.`,
              location: {
                component: component.name,
                nodeId: r.id,
                nodeType: r.type,
                nodeLabel: r.label,
                port: 'eval',
                plug: 'input'
              },
              suggestion: `${r.id}.done → ${w.id}.eval`
            });
            break;
          }
        }
      }

      /**
       * Whether the two gates read two different `at-<state>` outputs of one States node: at most one of them is true,
       * so the one that acts was the only true one and the other reads false before the change and after it. The
       * todo template's Dialog flow is that dispatcher (six gates off one Confirm, each On True sending the States node
       * to `none`): six warnings there, none of them a fault, before this was here.
       */
      function exclusiveStates(a: string, b: string): boolean {
        const stateOf = (gate: string) => {
          const c = (incoming.get(gate) ?? []).find((w) => w.toProperty === 'condition');
          return c && nodeById.get(c.fromId)?.type === 'States' && c.fromProperty.startsWith('at-') ? c : undefined;
        };
        const sa = stateOf(a);
        const sb = stateOf(b);
        return !!sa && !!sb && sa.fromId === sb.fromId && sa.fromProperty !== sb.fromProperty;
      }

      /** Every node that feeds `gate`'s Condition, following value wires backwards (the gate itself excluded). */
      function feedingValues(gate: string): Set<string> {
        const seen = new Set<string>();
        const stack = (incoming.get(gate) ?? []).filter((c) => c.toProperty === 'condition').map((c) => c.fromId);
        while (stack.length > 0) {
          const id = stack.pop()!;
          if (id === gate || seen.has(id)) continue;
          seen.add(id);
          if (!passesThrough(id)) continue;
          const type = nodeById.get(id)?.type;
          for (const c of incoming.get(id) ?? []) {
            if (type && catalog.getPort(type, 'input', c.toProperty)?.isSignal) continue;
            stack.push(c.fromId);
          }
        }
        return seen;
      }

      /** Whether anything `gate`'s outputs reach, along any wire, is in `targets`. */
      function reaches(gate: string, targets: Set<string>): boolean {
        if (targets.size === 0) return false;
        const seen = new Set<string>([gate]);
        const stack = (outgoing.get(gate) ?? []).map((c) => c.toId);
        while (stack.length > 0) {
          const id = stack.pop()!;
          if (targets.has(id)) return true;
          if (seen.has(id)) continue;
          seen.add(id);
          if (!passesThrough(id)) continue;
          for (const c of outgoing.get(id) ?? []) stack.push(c.toId);
        }
        return false;
      }
    }
    return out;
  }
};
