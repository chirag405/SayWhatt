# SayWhat 🎮✨

> A multiplayer creative game where wit meets AI

SayWhat is a fun, interactive multiplayer game where players take turns being the "decider," crafting creative scenarios, and submitting witty answers. The game combines AI-generated content with player creativity, resulting in hilarious and engaging gameplay.

![SayWhat Game](https://via.placeholder.com/800x400?text=SayWhat+Game)

## 🚀 Features

### Room Creation & Joining

- 🏠 **Create a room** with customizable rounds and answer time limits
- 🔑 **Join rooms** using a unique Room ID
- 🔄 **Real-time player list** updates

### Game Flow

- ✔️ **Rounds & Turns**: Each round consists of multiple turns where every player becomes the decider once
- ✔️ **Category Selection**: The decider picks from 4 predefined categories
- ✔️ **Scenario Selection**:
  - Choose from 3 AI-generated scenarios or 1 custom player-written scenario
  - Optional context can be added for extra fun
- ✔️ **Answer Submission**:
  - Players submit answers before the timer runs out
  - If all players submit early, the timer skips
- ✔️ **AI Scoring**: AI evaluates answers and assigns points (hidden until the end of the round)

### Voting & Results

- 🎭 **Slideshow Viewing**: After each round, all answers are displayed in a slideshow
- 🗳️ **Voting**: Players upvote (+1) or downvote (0) answers (including their own)
- 🏆 **Winner Announcement**: The highest scorer wins after all rounds

### Disconnection Handling

- 🔌 **Host Migration**: If the host leaves, another player takes over
- ⚠️ **Minimum Players**: If too many players leave, the game returns to the home screen

## 🔧 Tech Stack

| Component      | Technology                                    |
| -------------- | --------------------------------------------- |
| Frontend       | React (with real-time updates via WebSockets) |
| Backend        | Node.js + Express                             |
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
