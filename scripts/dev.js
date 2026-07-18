import { execSync } from 'node:child_process'

// Runs tsc and the server in this single process (instead of nodemon's exec
// spawning a shell to run "tsc && node ..."), so Ctrl+C always terminates the
// actual server process on Windows instead of orphaning it as a grandchild.
execSync('tsc', { stdio: 'inherit' })

await import('../build/server.js')
