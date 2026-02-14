#!/usr/bin/env tsx
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)

console.log('🔍 Checking for running processes...\n')

try {
  const psOutput = execSync(
    `ps aux | grep "${projectRoot}" | grep -E "nuxt|node|esbuild" | grep -v grep | grep -v cleanup`,
    { encoding: 'utf-8' },
  ).trim()

  if (!psOutput) {
    console.log('✅ No annobib processes found')
    process.exit(0)
  }

  const lines = psOutput.split('\n')
  console.log(`Found ${lines.length} process(es):\n`)

  const pids: string[] = []
  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    const pid = parts[1]
    const command = parts.slice(10).join(' ')
    pids.push(pid)
    console.log(`  PID ${pid}: ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`)
  }

  console.log(`\n🛑 Killing ${pids.length} process(es)...`)

  for (const pid of pids) {
    try {
      execSync(`kill ${pid}`, { stdio: 'ignore' })
      console.log(`  ✓ Killed PID ${pid}`)
    } catch (err) {
      console.log(`  ⚠️  Could not kill PID ${pid} (may have already exited)`)
    }
  }

  console.log('\n✅ Cleanup complete')
} catch (err: any) {
  if (err.status === 1 && !err.stdout?.trim()) {
    console.log('✅ No annobib processes found')
  } else {
    console.error('Error during cleanup:', err.message)
    process.exit(1)
  }
}
