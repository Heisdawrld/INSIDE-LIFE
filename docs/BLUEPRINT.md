# Product blueprint · Foundation 0.1

## Promise

Build a life that feels recognizably Nigerian. Ordinary beginnings, agency, social connection, ambition, setbacks and recovery. Gameplay must also contain comfort, humour, food, fashion, celebration and friendship.

**Working title:** INSIDE LIFE. **Direction:** A Nigerian avatar-based social world, with Avakin Life as a category reference and Sims-style life progression supporting it. **Line:** Everybody starts somewhere. Name/trademark availability has not been researched or cleared. Build original characters, assets, interactions and identity; do not copy another game's branding or proprietary content.

## Non-negotiables

1. All money is virtual. No real-money top-ups or withdrawals.
2. Real-player social connection, self-expression and shared places are the product's centre. Jobs, money and homes support that social world. Solo play is an onboarding and fallback experience, not the final product definition.
3. Nigerian identity lives in decisions, infrastructure, behaviour and culture—not just labels and stereotyped hardship.
4. Losses have plausible causes, proportionate consequences and recovery paths. Do not stack arbitrary punishments.
5. Players control their characters. Shared possessions, households and relationships need explicit permissions.
6. Build a small place well. Expand after playtesting.

## Starting life

Everyone starts modestly. Eventually offer balanced ordinary backgrounds (apprentice, school leaver, junior worker, job-seeking graduate), not inherited fortunes. The preview has one common start: a rented room, limited funds, basic furniture and a customizable adult avatar. Initial prices are design parameters, not real-world economic measurements.

## First impression and onboarding

The opening uses original illustrated title art, restrained typography and a clear new/returning-player choice. Current flow: title → display name → adult character studio → arrival briefing → local world. Continue shows actual save details and resumes directly. New-game drafts cannot replace a save until final confirmation. Main menu, help, settings and return navigation are functional.

The production online flow will add sign-in/account creation and a persistent profile before joining shared spaces. Do not collect passwords or imply cloud persistence before authentication and a backend exist. The current preview deliberately offers local play with explicit local-save wording. Concept artwork must remain distinguishable from rendered gameplay.

## First playable chapter: Moving In

**Implemented:** arrive → meet Bisi → breakfast at Mama T's → collect parcel → walk to Tunde → receive virtual payment → buy room fan → recover needs → save/resume.

Map: a compact street with one compound and two businesses. Characters: the player, three named NPCs and ambient pedestrians. Four explicit objectives. No online players.

Completion is observable: four objectives complete; transaction history explains every balance change; the fan appears and improves resting; reload retains progress. This chapter is a foundation, not the entire promised game.

## Road and problem simulation roadmap

Roads should become spaces to use: walk, queue, board, ride and later drive. Start with believable route choice before growing map size. Add traffic signals/yielding and collision-safe pedestrians; then journey times, fares, peak traffic, vehicle condition and weather-driven routes. Do not ship a pothole that randomly destroys a player's earnings.

Household systems follow: power availability, water, food storage, data/phone access, meaningful bills, work deadlines and health. Infrastructure conditions should affect businesses and daily choices. Address one causal chain at a time (e.g. power → refrigeration → food stock → daily profit).

Police trouble, robbery and financial investigations are later fictional systems. Separate lawful activity, mistakes, suspicion and proven wrongdoing. Provide understandable cause, response options, proportionality, and recovery. Police are not arbitrary money-removal events. Simulated scams initially come from controlled NPC scenarios with discoverable clues. Do not reward players for victimizing other real players.

## Social world roadmap

Start with one small instanced social courtyard, not a seamless national MMO. Establish persistent authentication and profiles, server-owned avatar/room state, room membership, movement replication, text chat and a friends list. Add functional mute/block/report controls, reconnect handling and room capacity limits with the first social test. The acceptance test is two independently signed-in players seeing and messaging each other from separate clients; local tabs with simulated NPCs do not meet it.

Next add wardrobe ownership, saved outfits, emotes, profile presentation and friend home visits. Home entry and decoration need explicit owner/guest permissions. Shared activities and virtual trading follow only after server ownership and transaction rules are established. Prioritize a small place people enjoy spending time together over a large empty map.

Do not invent social proof, active-user counts or fake multiplayer presences. NPCs and humans must be distinguishable. Personal conversations and safety cannot depend solely on a decorative report button.

## Economy roadmap

Work → expenses → savings → productive equipment → customers → profit/loss. Track revenue and costs separately. Give useful, contextual information before decisions. Later investments use fictional assets with understandable risk; do not promise returns or mimic a real investment service.

Client-authored wealth must never transfer into multiplayer. Decide reset/migration rules before beta. Isolate the current local demo economy from future server state.

## Quality and proof

- Gameplay: a new tester can complete the first loop without live instruction.
- Feel: motion, camera, reachability, feedback, scale and controls must be coherent.
- Reliability: no duplicate rewards, negative balances, lost completed actions, or silently overwritten corrupt saves.
- Performance targets: stable 30 FPS on a named midrange Android device and 60 FPS on a named suitable laptop. These are unverified targets, not current claims.
- Retention: observe voluntary replay and qualitative stories from 10–20 independent testers before expanding scope. That is an early usability sample, not market-size evidence.
- Research: gather consented lived-experience feedback across the communities depicted. One Lagos district cannot represent all Nigeria.

## Sequence

1. **Foundation:** current local first chapter, tests, scene and input.
2. **Opening and identity:** polished title, character onboarding, navigation and consistent avatar art. Current work includes the title/onboarding; final art quality is still open.
3. **Together first:** persistent accounts and one authoritative shared courtyard with real players, chat, friends, reconnect behavior and moderation tools.
4. **Expression and belonging:** wardrobe, emotes, profiles, personal homes and guest visits, supported by virtual earning/progression.
5. **Deeper Nigerian life:** businesses, transport, household infrastructure and controlled risk systems that create stories without crowding out social play.

Do not interpret this roadmap as implemented work or a fixed schedule.
