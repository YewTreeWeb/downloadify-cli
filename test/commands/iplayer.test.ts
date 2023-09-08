import {expect, test} from '@oclif/test'

describe('iplayer', () => {
  test
  .stdout()
  .command(['iplayer'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['iplayer', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
