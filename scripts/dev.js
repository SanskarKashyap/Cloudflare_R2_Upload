import { execSync } from 'node:child_process'

// 1. Detect if the parent process exits, and gracefully exit this process.
// This prevents orphaned node.exe processes on Windows when terminals close or get interrupted.
const parentPid = process.ppid;
if (parentPid) {
    setInterval(() => {
        try {
            // Signal 0 checks if the process is still running without killing it.
            // On Windows, if the parent process is dead, this will throw an error.
            process.kill(parentPid, 0);
        } catch (e) {
            console.log('\n[Dev Server] Parent process exited. Stopping dev server...');
            process.exit(0);
        }
    }, 1000).unref(); // .unref() ensures this timer doesn't keep the process alive when it wants to exit
}

// 2. Handle Ctrl+C (SIGINT) and termination signals explicitly
const cleanup = () => {
    console.log('\n[Dev Server] Shutting down dev server...');
    process.exit(0);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Runs tsc and the server in this single process (instead of nodemon's exec
// spawning a shell to run "tsc && node ..."), so Ctrl+C always terminates the
// actual server process on Windows instead of orphaning it as a grandchild.
execSync('tsc', { stdio: 'inherit' })

await import('../build/server.js')

