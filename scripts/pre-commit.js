/**
 * Pre-commit hooks configuration
 * Fast feedback for developers before committing
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const config = {
  // Files to check
  patterns: {
    typescript: '**/*.{ts,tsx}',
    javascript: '**/*.{js,jsx}',
    styles: '**/*.{css,scss}',
    markdown: '**/*.md'
  },
  
  // Commands
  commands: {
    lint: 'eslint --fix',
    format: 'prettier --write',
    typeCheck: 'tsc --noEmit',
    unitTests: 'vitest run --reporter=verbose',
    securityCheck: 'npm audit --audit-level moderate'
  },
  
  // File size limits (in bytes)
  limits: {
    maxFileSize: 1024 * 1024, // 1MB
    maxLineLength: 120,
    maxFunctionLength: 50
  }
}

// Staged files checker
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    return output.trim().split('\n').filter(Boolean)
  } catch (error) {
    return []
  }
}

// File size checker
function checkFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath)
    return stats.size <= config.limits.maxFileSize
  } catch (error) {
    return true
  }
}

// Line length checker
function checkLineLength(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > config.limits.maxLineLength) {
        console.error(`❌ Line ${i + 1} in ${filePath} exceeds ${config.limits.maxLineLength} characters`)
        return false
      }
    }
    return true
  } catch (error) {
    return true
  }
}

// Function length checker
function checkFunctionLength(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Simple regex to find function bodies
    const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g) || []
    const arrowFunctionMatches = content.match(/\w+\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}/g) || []
    
    const allFunctions = [...functionMatches, ...arrowFunctionMatches]
    
    for (const func of allFunctions) {
      const lines = func.split('\n').length
      if (lines > config.limits.maxFunctionLength) {
        console.error(`❌ Function in ${filePath} exceeds ${config.limits.maxFunctionLength} lines`)
        return false
      }
    }
    return true
  } catch (error) {
    return true
  }
}

// Security pattern checker
function checkSecurityPatterns(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    
    // Security patterns to check for
    const securityPatterns = [
      /console\.(log|error|warn|debug)/, // Console statements
      /eval\(/, // eval usage
      /innerHTML\s*=/, // Direct innerHTML assignment
      /document\.write/, // document.write usage
      /setTimeout\s*\(\s*["'`][^"'`]*["'`]/, // String setTimeout
      /setInterval\s*\(\s*["'`][^"'`]*["'`]/, // String setInterval
      /new\s+Function\(/, // Function constructor
      /crypto\.createHash\('md5'/, // Weak hashing
      /crypto\.createHash\('sha1'/, // Weak hashing
    ]
    
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of securityPatterns) {
        if (pattern.test(lines[i])) {
          console.error(`❌ Security issue detected in ${filePath} at line ${i + 1}: ${lines[i].trim()}`)
          return false
        }
      }
    }
    return true
  } catch (error) {
    return true
  }
}

// Main pre-commit hook
function runPreCommitHook() {
  console.log('🔍 Running pre-commit checks...')
  
  const stagedFiles = getStagedFiles()
  
  if (stagedFiles.length === 0) {
    console.log('✅ No staged files to check')
    return
  }
  
  console.log(`📁 Checking ${stagedFiles.length} staged files...`)
  
  let hasErrors = false
  
  // Check each staged file
  for (const file of stagedFiles) {
    if (!fs.existsSync(file)) continue
    
    console.log(`\n🔍 Checking ${file}...`)
    
    // File size check
    if (!checkFileSize(file)) {
      console.error(`❌ File size exceeds limit`)
      hasErrors = true
    }
    
    // Line length check for code files
    if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      if (!checkLineLength(file)) {
        hasErrors = true
      }
      
      if (!checkFunctionLength(file)) {
        hasErrors = true
      }
      
      if (!checkSecurityPatterns(file)) {
        hasErrors = true
      }
    }
  }
  
  // Run linting
  console.log('\n🔧 Running linter...')
  try {
    execSync(`${config.commands.lint} ${config.patterns.typescript} ${config.patterns.javascript}`, { stdio: 'inherit' })
    console.log('✅ Linting passed')
  } catch (error) {
    console.error('❌ Linting failed')
    hasErrors = true
  }
  
  // Run formatting check
  console.log('\n🎨 Checking formatting...')
  try {
    execSync(`prettier --check ${config.patterns.typescript} ${config.patterns.javascript} ${config.patterns.styles}`, { stdio: 'inherit' })
    console.log('✅ Formatting check passed')
  } catch (error) {
    console.error('❌ Formatting issues found. Run `npm run format` to fix.')
    hasErrors = true
  }
  
  // Type check
  console.log('\n📝 Running type check...')
  try {
    execSync(config.commands.typeCheck, { stdio: 'inherit' })
    console.log('✅ Type check passed')
  } catch (error) {
    console.error('❌ Type check failed')
    hasErrors = true
  }
  
  // Run unit tests for affected files
  console.log('\n🧪 Running unit tests...')
  try {
    execSync(config.commands.unitTests, { stdio: 'inherit' })
    console.log('✅ Unit tests passed')
  } catch (error) {
    console.error('❌ Unit tests failed')
    hasErrors = true
  }
  
  // Security audit
  console.log('\n🔒 Running security audit...')
  try {
    execSync(config.commands.securityCheck, { stdio: 'inherit' })
    console.log('✅ Security audit passed')
  } catch (error) {
    console.error('❌ Security audit found issues')
    hasErrors = true
  }
  
  if (hasErrors) {
    console.error('\n❌ Pre-commit hook failed. Please fix the issues and try again.')
    process.exit(1)
  } else {
    console.log('\n✅ All pre-commit checks passed!')
  }
}

// Export for use in package.json
module.exports = {
  runPreCommitHook,
  getStagedFiles,
  checkFileSize,
  checkLineLength,
  checkFunctionLength,
  checkSecurityPatterns,
  config
}

// Run if called directly
if (require.main === module) {
  runPreCommitHook()
}
