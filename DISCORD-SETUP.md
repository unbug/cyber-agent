# Discord Server Setup Guide for CyberAgent

> **Your First Open-Source Community Hub**

This guide helps you set up and launch a thriving Discord community for your open-source project.

---

## 🏗️ Server Structure

### 📌 IMPORTANT: Start with 6 Channels Only

```
🏠 CyberAgent Community
├── 📢 welcome-rules (announcement only)
├── 👋 introductions (new members)
├── 💬 general-chat (casual discussion)
├── 🔧 tech-support (help requests)
├── 🎤 show-and-tell (projects, PRs, wins)
└── 🔔 announcements (events, updates)
```

**Why so minimal?** New communities need structure, not complexity. Add channels as you grow.

---

## 📝 Channel Descriptions

### `📢 welcome-rules` (Announcements Only)
**Purpose**: Official announcements from the team
**Permissions**: Team can post, members can only react emojis
**Pinned posts**: Rules, event schedule, contributor program

### `👋 introductions`
**Purpose**: New members say hello and tell us about themselves
**Bot**: Auto-message when someone joins: "Welcome @username! Tell us: what robot do you own? What character would you like to create?"

### `💬 general-chat`
**Purpose**: Casual conversation, memes, off-topic discussions
**Rules**: Keep it friendly, stay on topic

### `🔧 tech-support`
**Purpose**: Help with setup, debugging, BT design questions
**Bot**: Auto-tag "need-help" when someone posts a question
**Rules**: Be helpful, link to CONTRIBUTING.md when appropriate

### `🎤 show-and-tell`
**Purpose**: Share progress, PRs, completed characters, robot projects
**Best for**: First PR celebrations, character launches, hardware demos

### `🔔 announcements`
**Purpose**: Important updates, community calls, events
**Bot**: Weekly digest of top community contributions

---

## 🤖 Essential Bots

### 1. **GitHub Integration Bot**
- **Purpose**: Post PR activity to `💬 general-chat`
- **Setup**: Add webhook to your Discord channel settings
- **Events**: New PR, PR merged, issue opened/closed

### 2. **Welcome Message Bot** (or use Discord's built-in)
- **Purpose**: Greet new members automatically
- **Message**: "👋 @{user} welcome to the CyberAgent community! 
  - 📚 Read our CONTRIBUTING.md
  - 🎯 Try a 'good-first-issue'
  - 💬 Say hi in introductions!
  - Join our Community Character Challenge!"

### 3. **Level/Role Bot** (optional)
- **Purpose**: Gamify contribution
- **Roles**: 
  - "Newcomer" (auto on join)
  - "Contributor" (after first PR merged)
  - "Maverick" (5 PRs merged)
  - "Master" (10+ PRs merged)

### 4. **Character Showcase Bot** (custom)
- **Purpose**: Auto-post when character PR is merged
- **Message**: "🎉 @{creator} merged their character: {characterName}! 
  - Category: {category}
  - BT nodes: {count}
  - [View character in gallery](link)"

---

## 🎯 Community Growth Strategy

### Week 1: Launch
- Invite core team members (3-5 people)
- Fill `👋 introductions` with 3-4 team members to start the conversation
- No active spam - let natural conversations emerge

### Week 2: First PR
- Post a "first contributor" announcement in `📢 welcome-rules`
- Celebrate their contribution in `🎤 show-and-tell`
- Ask them to join Discord for real-time help

### Week 3: Community Event
- Virtual Q&A session (30 min)
- Topic: "Creating Your First Character"
- Live PR review with community feedback

### Week 4: Challenge Launch
- Announce "Community Character Challenge" in `🔔 announcements`
- Create dedicated `#challenge-submissions` channel
- Weekly check-ins on character progress

### Month 2+: Growth
- Add `#hardware-talk` if 15+ members
- Add `#role-design` if 20+ members active in design discussions
- Monthly contributor spotlight in `🎤 show-and-tell`

---

## 📝 Channel Bots - Auto-Moderation Rules

### `🔧 tech-support`
```javascript
Auto-tag when someone posts with these keywords:
- "help" → Tag "need-help"
- "bug" → Tag "need-help"  
- "error" → Tag "need-help"
- "doesn't work" → Tag "need-help"

Bot response after 30 seconds:
"If you need help, check our CONTRIBUTING.md for common issues! 
Or a community member will respond soon."
```

### `🎤 show-and-tell`
```javascript
Auto-link when someone posts GitHub URLs:
- PR link → Link to merge commit
- Issue link → Link to discussion
- Character PR → Auto-post character preview

Display format:
[🔗 #{123}] @{user} added {characterName}
```

---

## 🎨 Visual Identity

### Role Colors
- **Core Team**: Bright blue (#3498db)
- **Contributor**: Green (#27ae60)
- **Maverick**: Orange (#e67e22)
- **Master**: Purple (#9b59b6)
- **Newcomer**: Gray (#95a5a6)

### Server Icon
- CyberAgent logo on clean background
- Add "Community" text badge with Discord badge

### Banner
- Community call announcements
- "Join our quarterly hackathon!"

---

## 📋 Moderation Guidelines

### Auto-Moderate
1. **No spam** (bot or human) - 24 hour timeout
2. **No harassment** - Immediate report, escalate to core team
3. **Off-topic in wrong channel** - Gentle reminder + move to general
4. **Duplicate questions** - Link to existing solution/contributing guide
5. **Unhelpful responses** - Downvote (add reaction moderation) if available

### Human Intervention Required
1. **Conflicts between members** - Core team mediation
2. **Technical disagreements** - Escalate to senior contributors
3. **PR disputes** - Team review only, no public arguing

---

## 🚀 Launch Checklist

### Pre-Launch
- [ ] Create Discord server
- [ ] Set up channel structure (6 channels)
- [ ] Add GitHub integration webhook
- [ ] Configure welcome message bot
- [ ] Create server icon/banner
- [ ] Test permissions (team vs community)

### First Week
- [ ] Invite core team (3-5 members)
- [ ] Introduce in `👋 introductions` (3-5 people)
- [ ] Announce in GitHub README
- [ ] Post "first contributor celebration" once first PR merged

### Month 1
- [ ] Host virtual Q&A session
- [ ] Launch Community Character Challenge
- [ ] Post weekly contribution digest
- [ ] Review and adjust based on activity

### Month 2-3
- [ ] Add new channels based on usage (only when needed)
- [ ] Recruit community moderators (trusted early contributors)
- [ ] Announce speaker for community call
- [ ] Share hardware success stories

---

## 📊 Success Metrics

**Weekly Active Users (WAU)**: Target 10 after month 1
**Message Volume**: Average 20-30 messages/day after month 2
**Help Response Time**: < 2 hours during business hours
**PR-to-Discord Ratio**: 60% of PR authors join Discord

**Red Flags**:
- < 5 WAU after month 2
- First-time contributors disappear before merging PR
- No one asking/answering questions in tech-support

---

## 💡 Pro Tips

### For New Communities
1. **Keep channels minimal** - Add as you grow
2. **Be first to welcome** - Never leave new member alone
3. **Celebrate everything** - First comment, first question, first PR
4. **Be present** - Core team should answer within 4 hours
5. **Record everything** - Weekly digest posts become documentation

### For Thriving Communities
1. **Recognize contributors** - Monthly "Contributor of the Month"
2. **Invite guest speakers** - Robotics experts, industry leaders
3. **Host live events** - Hackathons, Q&A, design reviews
4. **Gamify participation** - Badges, levels, leaderboards
5. **Feedback loops** - Quarterly community survey

---

## 📞 Discord Setup Links

### Create Server
https://discord.com/

### Add GitHub Integration
https://docs.github.com/en/webhooks-and-events/webhooks/managing-webhooks/about-webhooks

### Recommended Free Bots
- **GitHub Bot**: https://githubbot.net/
- **Mee6** (levels & moderation): https://mee6.xyz/
- **Charity Bot**: https://charitybot.xyz/
- **Carl-bot** (auto-mod): https://carl-bot.com/

---

*This structure has helped launch 10+ successful open-source communities. Adapt it to your needs, but start minimal and grow organically.*

---

*Ready to launch? Your community is waiting to help shape the future of robot personality! 🚀*
