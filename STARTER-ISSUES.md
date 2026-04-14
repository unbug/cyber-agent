# Starter Issues - CyberAgent Open Standard

> **Perfect for first-time contributors!**

All issues below are designed to help you understand the codebase while making real improvements. Pick one, complete it in an hour, and you're a contributor!

---

## 🐛 Documentation Fixes

### 1. Fix Typo in ENG README
**Difficulty**: ⭐  **Time**: 5 min  
**Description**: Fix "Behavoir Tree" typo → "Behavior Tree" in README.md
**Why**: Small but affects professional presentation
**Labels**: `documentation`, `good-first-issue`, `help-wanted`

### 2. Update Character Examples in README
**Difficulty**: ⭐  **Time**: 15 min  
**Description**: Character list in README only shows 6 examples. Update to reflect recent additions like "zen-turtle", "scout-eagle"
**Why**: New users need accurate character list
**Labels**: `documentation`, `good-first-issue`

### 3. Add Character Template to Documentation
**Difficulty**: ⭐⭐  **Time**: 20 min  
**Description**: Add link to `character-template.md` in main README under "Contributing" section
**Why**: First-time contributors need clear onboarding
**Labels**: `documentation`, `good-first-issue`

---

## ✨ Character Additions

### 4. Add "meditation-bird" Character
**Difficulty**: ⭐⭐  **Time**: 30 min  
**Description**: Create new character with calm, restful behavior patterns
**Requirements**:
- Category: companion
- BT: Idle → Meditate → Rest → Wake
- Custom action: `breathe()` (LED color cycling, soft motor movements)
**Labels**: `character`, `good-first-issue`, `enhancement`

### 5. Add "scavenger-bot" Character  
**Difficulty**: ⭐⭐  **Time**: 30 min  
**Description**: Explorer character that seeks and returns to base
**Requirements**:
- Category: educator
- BT: Wander → Discover → Return → Report
- Custom actions: `scanForObjects()`, `returnToBase()`
**Labels**: `character`, `good-first-issue`, `enhancement`

### 6. Create "night-owl" Character
**Difficulty**: ⭐⭐⭐  **Time**: 45 min  
**Description**: Nocturnal companion with sleep patterns
**Requirements**:
- Category: companion, educator
- BT: Active (night) → Sleep (day) → Wake (dawn) → Alert (dusk)
- Custom actions: `sleepCycle()`, `wake()`
- Environment condition: darkness sensor
**Labels**: `character`, `good-first-issue`, `enhancement`

---

## 🖼️ Visual Enhancements

### 7. Add Character Category Badges
**Difficulty**: ⭐⭐  **Time**: 20 min  
**Description**: Add colored badges in Gallery view for character categories
**Requirements**:
- "companion" → Blue badge
- "guard" → Red badge  
- "entertainer" → Purple badge
- "educator" → Green badge
**Labels**: `ui`, `good-first-issue`

### 8. Add Character Search Functionality
**Difficulty**: ⭐⭐⭐  **Time**: 30 min  
**Description**: Add search bar to Gallery page for filtering characters
**Requirements**:
- Search by name, description, category
- Real-time filtering as user types
- Clear button to reset
**Labels**: `ui`, `good-first-issue`

### 9. Add Character Avatar Icons
**Difficulty**: ⭐⭐⭐  **Time**: 45 min  
**Description**: Create simple SVG icons for each character
**Requirements**:
- Dog icon: simple outline
- Cat icon: simple outline
- Dino icon: simple outline  
- etc.
**Labels**: `ui`, `good-first-issue`

---

## 🔧 Core Improvements

### 10. Add Character Versioning
**Difficulty**: ⭐⭐⭐⭐  **Time**: 45 min  
**Description**: Add version field to each character spec
**Requirements**:
- Each character has `version: "x.y.z"` field
- Display version in character details page
- Migration path for existing characters
**Labels**: `core`, `enhancement`

### 11. Add Character Search Index
**Difficulty**: ⭐⭐⭐  **Time**: 30 min  
**Description**: Create search index for fast character lookup
**Requirements**:
- Build search index from character descriptions
- Implement search algorithm
- Integrate with Gallery page
**Labels**: `core`, `enhancement`

### 12. Add Character Analytics
**Difficulty**: ⭐⭐⭐  **Time**: 30 min  
**Description**: Track character usage statistics
**Requirements**:
- Count usage per character
- Store statistics (localStorage or backend)
- Display top characters dashboard
**Labels**: `core`, `analytics`, `enhancement`

---

## 🧪 Testing

### 13. Add Character Test Cases
**Difficulty**: ⭐  **Time**: 30 min  
**Description**: Add unit tests for existing characters
**Requirements**:
- Test each character's BT execution
- Test custom actions work correctly
- Test state transitions are correct
**Labels**: `testing`, `good-first-issue`

### 14. Add Integration Test for Full Flow
**Difficulty**: ⭐⭐⭐  **Time**: 45 min  
**Description**: Test end-to-end flow: load character → execute BT → verify actions
**Requirements**:
- Create integration test suite
- Test with all 6 existing characters
- Test with one new custom character
**Labels**: `testing`, `good-first-issue`

---

## 📝 How to Get Started

1. **Pick an issue** from the list above
2. **Comment on the issue** to claim it (we'll mark it for you)
3. **Fork the repository** and start working
4. **Test thoroughly** with `npm test`
5. **Create a PR** with a clear description of changes
6. **Wait for review** (we'll respond within 24 hours)

---

## 🎯 First Contribution Tips

- **Start small**: Pick a ⭐ or ⭐⭐ difficulty issue
- **Read first**: Go through CONTRIBUTING.md before starting
- **Ask questions**: Discord #builders channel or GitHub Issues
- **Document**: Add comments in code explaining your approach
- **Test**: Ensure your change doesn't break existing functionality
- **Iterate**: Expect 1-2 rounds of feedback on your PR

---

## 🏆 Once You Complete Your First Issue

You'll automatically get:
- **Contributor badge** on GitHub
- **Access to Discord #contributors** channel
- **Invitation to community calls** and events
- **Priority review** for your next PR
- **Mention on our "Thanks!" page**

Then you can graduate to:
- ⭐⭐⭐ Difficulty character creation
- Core engine improvements
- Architecture-level discussions

---

**Total time to contribute: Less than 2 hours for most issues.**

**Ready to build the universal standard for robot personality? Start with one of these issues today! 🚀**
