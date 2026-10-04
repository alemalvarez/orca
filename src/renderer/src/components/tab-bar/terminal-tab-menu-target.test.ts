import { describe, expect, it } from 'vitest'
import type { AgentStatusEntry } from '../../../../shared/agent-status-types'
import type { TerminalLayoutSnapshot } from '../../../../shared/terminal-tab-types'
import {
  resolveTerminalTabMenuTarget,
  type TerminalTabMenuTargetState
} from './terminal-tab-menu-target'

const LEAF_A = '11111111-1111-4111-8111-111111111111'
const LEAF_B = '22222222-2222-4222-8222-222222222222'
const LEAF_GONE = '33333333-3333-4333-8333-333333333333'

const splitLayout = (overrides: Partial<TerminalLayoutSnapshot> = {}): TerminalLayoutSnapshot => ({
  root: {
    type: 'split',
    direction: 'vertical',
    first: { type: 'leaf', leafId: LEAF_A },
    second: { type: 'leaf', leafId: LEAF_B }
  },
  activeLeafId: LEAF_B,
  expandedLeafId: null,
  ...overrides
})

function liveStatus(id: string): AgentStatusEntry {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the resolver only reads providerSession and restoredUnconfirmed.
  return { providerSession: { key: 'session_id', id } } as unknown as AgentStatusEntry
}

function makeState(
  overrides: Partial<TerminalTabMenuTargetState> = {}
): TerminalTabMenuTargetState {
  return {
    terminalLayoutsByTabId: { 'term-1': splitLayout() },
    agentStatusByPaneKey: {
      [`term-1:${LEAF_A}`]: liveStatus('session-a'),
      [`term-1:${LEAF_B}`]: liveStatus('session-b')
    },
    sleepingAgentSessionsByPaneKey: {},
    paneForegroundAgentByPaneKey: {},
    ...overrides
  }
}

describe('resolveTerminalTabMenuTarget', () => {
  it('targets the focused leaf of a split tab', () => {
    expect(resolveTerminalTabMenuTarget(makeState(), 'term-1', false)).toEqual({
      leafId: LEAF_B,
      agentSessionId: 'session-b'
    })
  })

  it('targets the chat-owning leaf while the tab shows native chat', () => {
    const state = makeState({
      terminalLayoutsByTabId: { 'term-1': splitLayout({ chatLeafId: LEAF_A }) }
    })
    expect(resolveTerminalTabMenuTarget(state, 'term-1', true)).toEqual({
      leafId: LEAF_A,
      agentSessionId: 'session-a'
    })
  })

  it('falls back to the only leaf when no leaf is focused', () => {
    const state = makeState({
      terminalLayoutsByTabId: {
        'term-1': {
          root: { type: 'leaf', leafId: LEAF_A },
          activeLeafId: null,
          expandedLeafId: null
        }
      }
    })
    expect(resolveTerminalTabMenuTarget(state, 'term-1', false)).toEqual({
      leafId: LEAF_A,
      agentSessionId: 'session-a'
    })
  })

  it('ignores a stale focused leaf that is no longer in the layout', () => {
    const state = makeState({
      terminalLayoutsByTabId: { 'term-1': splitLayout({ activeLeafId: LEAF_GONE }) }
    })
    expect(resolveTerminalTabMenuTarget(state, 'term-1', false)).toBeNull()
  })

  it('keeps the terminal target but reports no session for a plain shell pane', () => {
    const state = makeState({ agentStatusByPaneKey: {} })
    expect(resolveTerminalTabMenuTarget(state, 'term-1', false)).toEqual({
      leafId: LEAF_B,
      agentSessionId: null
    })
  })

  it('returns null for tabs without a terminal layout', () => {
    expect(resolveTerminalTabMenuTarget(makeState(), 'agent-session-1', false)).toBeNull()
  })
})
