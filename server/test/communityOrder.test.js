import { describe, expect, it } from 'vitest'
import { sortMembersByCustomOrder } from '../src/communityOrder.js'

function member(id, nickname, isSelf = false) {
  return { id, nickname, isSelf }
}

describe('sortMembersByCustomOrder', () => {
  it('puts self first', () => {
    const sorted = sortMembersByCustomOrder(
      [member('b', 'Bob'), member('a', 'Alice', true), member('c', 'Carol')],
      new Map(),
    )
    expect(sorted.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('sorts others by zh-CN nickname when no custom order', () => {
    const list = [member('1', '张三'), member('2', '李四'), member('3', '王五')]
    const sorted = sortMembersByCustomOrder(list, new Map())
    const expected = [...list].sort((a, b) => {
      const nameCmp = a.nickname.localeCompare(b.nickname, 'zh-CN')
      return nameCmp !== 0 ? nameCmp : a.id.localeCompare(b.id)
    })
    expect(sorted.map((m) => m.nickname)).toEqual(
      expected.map((m) => m.nickname),
    )
  })

  it('uses stable id fallback when nicknames compare equal', () => {
    const sorted = sortMembersByCustomOrder(
      [member('b-id', '同名'), member('a-id', '同名')],
      new Map(),
    )
    expect(sorted.map((m) => m.id)).toEqual(['a-id', 'b-id'])
  })

  it('prefers community_member_order over nickname sort', () => {
    const sorted = sortMembersByCustomOrder(
      [
        member('1', '张三'),
        member('2', '李四'),
        member('3', '王五'),
      ],
      new Map([
        ['3', 0],
        ['1', 1],
      ]),
    )
    expect(sorted.map((m) => m.id)).toEqual(['3', '1', '2'])
  })
})
