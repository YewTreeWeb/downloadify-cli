import {expect, test} from '@oclif/test'

describe('crunchyroll', () => {
  test
  .stdout()
  .command(['crunchyroll'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['crunchyroll', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
