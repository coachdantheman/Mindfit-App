import test from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS, QUESTION_ORDER, NEEDS, RESULTS, scoreQuiz, validateAnswers, QuizAnswers } from '../lib/quiz'

const all = (v: number): QuizAnswers => Object.fromEntries(QUESTIONS.map(q => [q.id, v]))

test('every need has two questions and three actions', () => {
  for (const n of NEEDS) {
    assert.equal(QUESTIONS.filter(q => q.need === n).length, 2)
    assert.equal(RESULTS[n].actions.length, 3)
  }
  assert.equal(new Set(QUESTION_ORDER.map(q => q.id)).size, QUESTIONS.length)
  for (let i = 1; i < QUESTION_ORDER.length; i++) assert.notEqual(QUESTION_ORDER[i].need, QUESTION_ORDER[i - 1].need)
})

test('scores sum per need and pick the highest', () => {
  const r = scoreQuiz({ ...all(1), q3: 4, q4: 3 })
  assert.deepEqual(r.scores, { confidence: 2, focus: 7, pressure: 2, motivation: 2, recovery: 2 })
  assert.equal(r.top_need, 'focus')
  assert.equal(r.low, false)
})

test('ties go to the earlier need in tie-break order', () => {
  assert.equal(scoreQuiz(all(4)).top_need, 'pressure')
  assert.equal(scoreQuiz({ ...all(0), q1: 3, q9: 3 }).top_need, 'confidence')
  assert.equal(scoreQuiz({ ...all(0), q7: 2, q10: 2 }).top_need, 'motivation')
})

test('low flag when every need is 2 or under', () => {
  assert.equal(scoreQuiz(all(1)).low, true)
  assert.equal(scoreQuiz(all(0)).low, true)
  assert.equal(scoreQuiz({ ...all(1), q5: 2 }).low, false)
})

test('validateAnswers', () => {
  assert.deepEqual(validateAnswers(all(2)), all(2))
  assert.equal(validateAnswers(null), null)
  assert.equal(validateAnswers([]), null)
  assert.equal(validateAnswers({ ...all(2), q1: 5 }), null)
  assert.equal(validateAnswers({ ...all(2), q1: -1 }), null)
  assert.equal(validateAnswers({ ...all(2), q1: 1.5 }), null)
  assert.equal(validateAnswers({ ...all(2), q1: '2' }), null)
  assert.equal(validateAnswers({ ...all(2), extra: 1 }), null)
  const missing = all(2); delete missing.q10
  assert.equal(validateAnswers(missing), null)
})
