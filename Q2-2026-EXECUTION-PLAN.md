# CyberAgent Platform - Q2 2026 Strategic Execution Plan

## Executive Summary: The Pivot is Real

**Current State:** Open-source character-to-robot platform, MIT licensed, 6 characters, ~120 GitHub stars

**Strategic Pivot:** Transform from "character gallery" to **universal standard for robot personality**

**Why:** Behavior Trees are the assembly language of robot behavior. The winner owns the standard, not the best gallery.

---

## Phase 1: Foundation (Current - Q2-Q3 2026)

### Immediate Actions (Weeks 1-4)

#### 1. Community Program Launch ⭐ PRIORITY #1

**Week 1:**
- [x] Create CONTRIBUTING.md (complete contributor guide)
- [x] Create character-template.md (starter template)
- [ ] Add "good-first-issue" labels to GitHub
- [ ] Open 5 starter issues (documentation fixes, simple character additions)

**Week 2-3:**
- [ ] Launch GitHub Discussions
- [ ] Start Discord server with 3 channels: #builders, #role-design, #hardware
- [ ] Create first video tutorial: "Your First CyberAgent Character"

**Week 4:**
- [ ] Announce "Community Character Challenge" ($1K prize)
- [ ] Publish challenge guidelines on GitHub Issues
- [ ] Set up automated PR review bots

**Week 5-8:**
- [ ] Judge submissions (community voting + core team review)
- [ ] Announce winners, distribute hardware
- [ ] Integrate 3 winning characters into main repo

**Goal:** 25+ community PRs in Q2

#### 2. SDK Architecture Preparation ⭐ PRIORITY #2

**Week 1:**
- [x] Finalize dual-language SDK spec (TypeScript core + Rust embedded)
- [x] Document architecture decisions in SDK-SPEC.md
- [ ] Create `@cyber-agent/core` package structure
- [ ] Set up monorepo with npm workspaces

**Week 2-3:**
- [ ] Implement core BT executor in TypeScript
- [ ] Create basic Rust SDK for ESP32
- [ ] Cross-compile test: TypeScript → WebSocket → Rust ESP32

**Week 4-6:**
- [ ] Write SDK documentation (API reference, examples)
- [ ] Create starter templates: `npx @cyber-agent/init my-robot`
- [ ] Publish alpha to npm (private beta)

**Goal:** SDK beta by end of Q2

#### 3. Character Creator MVP ⭐ PRIORITY #3

**Week 1-2:**
- [ ] Design drag-and-drop BT editor spec
- [ ] Choose library: `react-flow` vs `d3` for tree visualization
- [ ] Mockup: character editor UI

**Week 3-4:**
- [ ] Implement basic node dragging/canvas rendering
- [ ] Connect to existing BT executor
- [ ] Export to CDF JSON

**Week 5-8:**
- [ ] Add Three.js preview (simulated robot in browser)
- [ ] Save/load functionality
- [ ] Community submission workflow
- [ ] Integrate into main site

**Goal:** Public beta by end of Q2

---

### Metrics & KPIs

| Phase | Metric | Target | Current |
|------|--------|--------|---------|
| Q2 2026 | GitHub stars | 2,500+ | ~120 |
| Q2 2026 | Community PRs | 25+ | 0 |
| Q2 2026 | Characters | 50+ | 6 |
| Q2 2026 | First hardware partner | 1 | 0 |
| Q2 2026 | SDK alpha release | 1 | none |

---

## Phase 2: Standardization (Q3-Q4 2026)

### Q3 Goals: Become the de facto standard for robot personality

#### Week 1-4: CDF 1.1 Specification
- [ ] Define emotion system API (multi-dimensional)
- [ ] Define memory system API (character history)
- [ ] Draft specification document
- [ ] Submit to GitHub for community review

#### Week 5-8: Hardware Partner Program
- [ ] Recruit 3 pilot partners (EDU robot kits)
- [ ] Create "CyberAgent Compatible" certification
- [ ] Integrate 2 partner robots into platform

#### Week 9-12: SDK v1.0 Beta
- [ ] Complete TypeScript core SDK
- [ ] Complete Rust embedded SDK
- [ ] Public beta release
- [ ] Collect feedback from pilot programs

**Key Milestone:** 1,000 GitHub stars by end of Q3

---

## Phase 3: Platform (Q1-Q4 2027)

### Q1 2027: Mobile Companion App
- [ ] React Native base app
- [ ] Character browsing + control
- [ ] Real-time BT visualization on mobile
- [ ] iOS + Android release

### Q2 2027: Marketplace Launch
- [ ] Community character submission system
- [ ] Review process (automated + manual)
- [ ] Premium character system (optional)
- [ ] First 100 community characters

### Q3 2027: LLM Character Synthesis
- [ ] Video input → BT generation prototype
- [ ] Natural language → character design
- [ ] Beta to community testers

### Q4 2027: SDK v2.0 + CDF 1.1 Standardization
- [ ] Finalize emotion/memory systems
- [ ] Submit CDF as open standard
- [ ] Academic paper submission

---

## Risk Mitigation Matrix

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|-----------|-------|
| BehaviorTree.CPP fork | Medium | High | Focus on developer experience, not feature parity | Product |
| Sony aibo opens SDK | Low | Medium | Establish standard before they react | Strategy |
| Low community engagement | High | Critical | Gamification, monetary incentives, hardware grants | Community |
| Hardware manufacturer resistance | Medium | High | Start with hobbyist/EDU market, prove demand | BD |
| Developer burnout | Medium | Medium | Clear roadmap, reasonable timelines, recognition | Engineering |

---

## Resource Allocation

### Core Team (Current)
- **1 Full-time Engineer**: Platform development, SDK architecture
- **Part-time Product**: UX research, community program, partnerships

### Q2-Q3 Hires Needed
- **Community Manager**: Launch programs, Discord, conferences
- **SDK Engineer**: TypeScript + Rust expertise
- **Documentation Lead**: API docs, tutorials, video content

### Budget Requirements (Q2-Q3)
- Hardware grants ($5K)
- Conference travel ($3K)
- Documentation tooling ($1K)
- Total: ~$10K for Q2-Q3

---

## Success Definition

**We win when:**
1. Third-party robot platforms adopt CDF without our push
2. Community contributes 10x more than core team
3. CyberAgent becomes mandatory learning for robotics students
4. Industry vendors license CDF certification program

**We lose when:**
1. BehaviorTree.CPP forks and beats us on developer experience
2. Sony or Sony-equivalent opens a closed competitor SDK
3. We ship features but not community
4. We focus on platform instead of standard

---

## Next 48 Hours

### TODAY
- [x] Strategic pivot document created (STRATEGIC-PIVOT.md)
- [x] Community contribution guides drafted
- [x] SDK architecture specification completed

### TOMORROW
- [ ] Set up GitHub Discussions
- [ ] Label issues for first contributors
- [ ] Create Discord server invite
- [ ] Plan first community hacking session (virtual)

### END OF WEEK
- [ ] Open 5 starter "good-first-issue" tasks
- [ ] Post first tutorial: "Creating Your First Character"
- [ ] Announce community character challenge

---

## Final Note

**The long game is not long-term waiting. It's short-term execution aligned with 10-year vision.**

Every feature, every PR, every community interaction should answer: "Is this building towards becoming the universal standard?"

If the answer is no, don't do it.

---

*This document is living. Update quarterly with executive summary of progress.*