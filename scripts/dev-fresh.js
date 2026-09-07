/**
 * 启动 dev server 前先杀掉还占着 :5173 的旧实例（Windows 端口切换的根源）。
 * Linux/Mac 上不会匹配 netstat 输出，安静通过。
 */
const { execSync, execFileSync } = require('child_process')

try {
  const out = execSync('netstat -ano | findstr :5173 | findstr LISTENING', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  })
  const m = out.match(/LISTENING\s+(\d+)/)
  if (m && m[1]) {
    console.log(`Killing stale dev server PID ${m[1]} on :5173 ...`)
    try {
      // 参数列表形式执行，不走 shell 拼接（PID 来自 netstat 输出，仍只允许纯数字）
      if (!/^\d+$/.test(m[1])) throw new Error(`unexpected PID: ${m[1]}`)
      execFileSync('taskkill', ['/F', '/PID', m[1]], { stdio: 'inherit' })
    } catch (_) {
      // ignore
    }
  }
} catch (_) {
  // nothing listening on :5173
}
