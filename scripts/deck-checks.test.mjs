// Tests for the pure checks behind lint-deck.mjs. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publishProblems, bannedHit, forbiddenHit } from './deck-checks.mjs'

test('manual-only workflow passes', () => {
  assert.deepEqual(publishProblems('on:\n  workflow_dispatch:\njobs: {}\n'), [])
})

test('push to main only is allowed', () => {
  for (const on of ['on: {push: {branches: [main]}, workflow_dispatch: {}}',
    'on:\n  push:\n    branches: [main]\n  workflow_dispatch:'])
    assert.deepEqual(publishProblems(`${on}\njobs: {}\n`), [], on)
})

test('push to any other branch, or every branch, is caught', () => {
  for (const on of ['on: push', 'on: [push, workflow_dispatch]', 'on: {push: {}}',
    'on: {push: {branches: [main, dev]}}', 'on: {push: {branches: ["**"]}}',
    'on: {push: {branches-ignore: [dev]}}', 'on:\n  push:\n    branches: [feat/x]'])
    assert.notDeepEqual(publishProblems(`${on}\njobs: {}\n`), [], on)
})

test('other automatic triggers are caught', () => {
  for (const t of ['schedule', 'workflow_run', 'pull_request'])
    assert.notDeepEqual(publishProblems(`on: [workflow_dispatch, ${t}]\n`), [], t)
})

test('banned names match case-insensitively and inside repo slugs', () => {
  const names = ['OPERA', 'HySDS']
  assert.equal(bannedHit('see github.com/nasa/opera-sds-pcm', names), 'opera')
  assert.equal(bannedHit('Opera does this', names), 'Opera')
  assert.equal(bannedHit('built on hysds', names), 'hysds')
})

test('ordinary words are not banned names', () => {
  assert.equal(bannedHit('operations and operators', ['OPERA']), null)
})

test('forbidden phrases match case-insensitively', () => {
  assert.equal(forbiddenHit('The 2025 bill agrees: x', ['bill agrees']), 'bill agrees')
  assert.equal(forbiddenHit('fine text', ['bill agrees']), null)
})
