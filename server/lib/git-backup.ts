import { execFile } from 'node:child_process'
import { DATA_DIR } from './data-store.ts'

let timer: ReturnType<typeof setTimeout> | null = null

export function scheduleBackup(message: string): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    runBackup(message)
  }, 5000)
}

function runBackup(message: string): void {
  execFile('git', ['-C', DATA_DIR, 'diff', '--quiet'], (diffErr) => {
    if (!diffErr) return
    execFile('git', ['-C', DATA_DIR, 'add', '-A'], (addErr) => {
      if (addErr) {
        console.error('[git-backup] git add failed:', addErr.message)
        return
      }
      execFile('git', ['-C', DATA_DIR, 'commit', '-m', message], (commitErr) => {
        if (commitErr) {
          console.error('[git-backup] git commit failed:', commitErr.message)
          return
        }
        execFile('git', ['-C', DATA_DIR, 'push'], (pushErr) => {
          if (pushErr) {
            console.error('[git-backup] git push failed:', pushErr.message)
            return
          }
          console.log('[git-backup] backup committed and pushed:', message)
        })
      })
    })
  })
}
