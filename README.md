# saywhat

Based on your requirements for handling tab closures and page reloads, here's the refined game flow:

### Refined Game Flow (Step-by-Step)

- **Room Creation:**
  - A player creates a room by entering:
    - Number of rounds (where 1 round = each player being decider once)
    - Time limit for players to write their answers
  - A unique Room ID is generated and shared
- **Players Join the Room:**
  - Other players enter the Room ID to join
  - Game starts once the required number of players join
  - Real-time player list updates for all participants
- **Round Structure Change:**
  - Each round consists of multiple "turns" where each player becomes the decider once
  - The system keeps track of who has been a decider in the current round
- **Turn Begins:**
  - One player who hasn't been a decider in the current round is chosen
  - If the selected decider disconnects, a new eligible player is automatically chosen
- **Category Selection:**
  - The decider selects a category from 4 predefined options
  - Selection is broadcast in real-time to all connected players
- **Scenario Selection:**
  - The decider chooses from:
    - 3 AI-generated scenarios
    - 1 custom scenario (player-entered)
  - An optional context field can be provided
  - Selection is broadcast to all connected players
- **Answer Submission Phase:**
  - A countdown timer starts
  - All connected players submit answers within the time limit
  - if all have submitted then skip the timer
  - Timer is synchronized across all clients
- **AI Response & Scoring for Current Turn:**
  - AI generates responses for each submitted answer
  - Points are assigned based on AI evaluation
  - Scores are stored but not shown yet
- **Next Turn:**
  - Steps 4-8 repeat with a new decider
  - This continues until all players have been a decider once
- **End of Round - Answer Viewing & Voting:**
  - After all players have been deciders (completing the round), all players view all submitted answers via a slideshow
  - host can change the slider or the slide will be changed after 10sec
  - Players vote on all answers from the entire round
  - player can upvote(+1) or down vote(0) and player can vote themselves
  - Vote results update in real-time
- **Next Round:**
  - After voting, a new round begins with the first decider
  - Steps 4-10 repeat until all rounds are completed
- **Game End & Winner Announcement:**
  - The player with the highest points is declared the winner
  - All players see final rankings and scores
  - Game data persists until all players leave or timeout occurs
- **Disconnection Handling:**
  - If host disconnects, host role transfers to another player
  - If minimum player count isn't met due to disconnections, game returns to home screen

## 🔧 Tech Stack

| Component      | Technology                                    |
| -------------- | --------------------------------------------- |
| Frontend       | React (nextjs with zustand)                   |
| Backend        | supabase and nextjs server actions            |
| AI Integration | OpenAI API (for scenario & answer generation) |
| Database       | Supabase                                      |

## 🎮 How to Play

1. **Create or Join a Room** – Set rounds & time limits or enter a Room ID
2. **Take Turns as Decider** – Pick a category & scenario
3. **Submit Answers** – Be creative before time runs out!
4. **Vote on Answers** – Upvote the funniest responses
5. **Win!** – Highest score after all rounds wins

## 🛠️ Setup and Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/saywhat.git

# Navigate to the project directory
cd saywhat

# Install dependencies
npm install

# Start the development server
npm run dev
```

## 📝 License

[MIT](LICENSE)

---

Created with ❤️ by [Your Name]
