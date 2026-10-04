import type { TerminalLayoutSnapshot } from '../../../../shared/terminal-tab-types'
import { isTerminalLeafId, makePaneKey } from '../../../../shared/stable-pane-id'
import {
  resolvePaneAgentSessionId,
  type PaneAgentSessionIdState
} from '../terminal-pane/pane-agent-session-id'
import { collectLeafIds } from '../terminal-pane/terminal-pane-layout-tree'

export type TerminalTabMenuTargetState = PaneAgentSessionIdState & {
  terminalLayoutsByTabId: Record<string, TerminalLayoutSnapshot | undefined>
}

export type TerminalTabMenuTarget = {
  leafId: string
  agentSessionId: string | null
}

/** Picks the pane a tab-level copy action speaks for: the chat-owning leaf in chat view, else the focused leaf. */
export function resolveTerminalTabMenuTarget(
  state: TerminalTabMenuTargetState,
  tabId: string,
  isChatView: boolean
): TerminalTabMenuTarget | null {
  const layout = state.terminalLayoutsByTabId[tabId]
  const leafIds = collectLeafIds(layout?.root)
  // Why: layout ids can outlive their leaf, so each candidate must still be in the tree.
  const candidates = [
    isChatView ? layout?.chatLeafId : undefined,
    layout?.activeLeafId,
    leafIds.length === 1 ? leafIds[0] : undefined
  ]
  const leafId = candidates.find((candidate) => candidate && leafIds.includes(candidate))
  if (!leafId || !isTerminalLeafId(leafId)) {
    return null
  }
  return {
    leafId,
    agentSessionId: resolvePaneAgentSessionId(state, makePaneKey(tabId, leafId))
  }
}
