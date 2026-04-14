// scripts/validate-characters.js
// Validates character files follow the template structure

const fs = require('fs');
const path = require('path');

const CHARACTERS_DIR = path.join(__dirname, '../src/characters');
const CHARACTERS_INDEX = path.join(__dirname, '../src/data/characters.ts');

console.log('🔍 Running character validation...\n');

let errors = 0;
let newCharacters = [];

// Check if character file exists and has required exports
function validateCharacterFile(filePath) {
  const fileName = path.basename(filePath, '.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(CHARACTERS_DIR, filePath);
  
  const checks = [];
  
  // Check 1: Character spec exists
  const hasSpec = content.includes('export const characterSpec') || content.includes('export function createCharacter');
  checks.push({
    name: 'characterSpec',
    passed: hasSpec,
    message: hasSpec ? 'Character spec found ✓' : '❌ Missing character spec'
  });
  
  // Check 2: BTNode defined
  const hasBT = content.includes('BTNode') || content.includes('behaviorTree');
  checks.push({
    name: 'behaviorTree',
    passed: hasBT,
    message: hasBT ? 'Behavior tree defined ✓' : '❌ Missing behavior tree'
  });
  
  // Check 3: Custom actions included
  const hasActions = content.includes('action') || content.includes('Action');
  checks.push({
    name: 'customActions',
    passed: hasActions,
    message: hasActions ? 'Custom actions included ✓' : '❌ No custom actions found'
  });
  
  // Check 4: Description field
  const hasDesc = content.includes('description') && (content.includes('"') || content.includes("'"));
  checks.push({
    name: 'description',
    passed: hasDesc,
    message: hasDesc ? 'Description present ✓' : '❌ Missing description'
  });
  
  // Check 5: Category field
  const hasCategory = content.includes('category');
  checks.push({
    name: 'category',
    passed: hasCategory,
    message: hasCategory ? 'Category specified ✓' : '❌ Missing category'
  });
  
  return {
    fileName,
    relativePath,
    checks,
    allPassed: checks.every(c => c.passed)
  };
}

// Main validation
try {
  // Get all .ts files in characters directory
  const files = fs.readdirSync(CHARACTERS_DIR);
  const tsFiles = files.filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  console.log(`Found ${tsFiles.length} character files\n`);
  
  tsFiles.forEach(file => {
    const filePath = path.join(CHARACTERS_DIR, file);
    const result = validateCharacterFile(filePath);
    
    newCharacters.push({
      name: result.fileName,
      path: result.relativePath,
      valid: result.allPassed
    });
    
    if (result.allPassed) {
      console.log(`✅ ${result.fileName}`);
      result.checks.forEach(check => {
        console.log(`   ${check.message}`);
      });
    } else {
      errors++;
      console.log(`\n❌ ${result.fileName}`);
      result.checks.forEach(check => {
        if (!check.passed) {
          console.log(`   ${check.message}`);
        }
      });
    }
  });
  
  console.log('\n' + '='.repeat(50));
  if (errors === 0) {
    console.log('✅ All character files validated successfully!');
  } else {
    console.log(`\n⚠️ Found ${errors} errors in ${errors} character file(s)`);
  }
  
  process.exit(errors > 0 ? 1 : 0);
  
} catch (error) {
  console.error('Error during validation:', error.message);
  process.exit(1);
}
