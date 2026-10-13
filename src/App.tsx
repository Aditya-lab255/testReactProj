import { useState, useEffect, useCallback } from 'react'
import './App.css'

type Player = 'X' | 'O'
type BoardState = (Player | null)[]
type GameMode = 'pvp' | 'ai'
type AIDifficulty = 'easy' | 'hard'

const WINNING_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function checkWinner(board: BoardState): { winner: Player | 'draw' | null; line: number[] | null } {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo }
    }
  }

  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null }
  }

  return { winner: null, line: null }
}

// Minimax algorithm for unbeatable AI
function minimax(
  currentBoard: BoardState,
  depth: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  humanPlayer: Player
): { score: number; index?: number } {
  const result = checkWinner(currentBoard)
  if (result.winner === aiPlayer) return { score: 10 - depth }
  if (result.winner === humanPlayer) return { score: depth - 10 }
  if (result.winner === 'draw') return { score: 0 }

  const availableIndices: number[] = []
  currentBoard.forEach((cell, idx) => {
    if (cell === null) availableIndices.push(idx)
  })

  if (isMaximizing) {
    let bestScore = -Infinity
    let bestMove = availableIndices[0]

    for (const idx of availableIndices) {
      currentBoard[idx] = aiPlayer
      const evaluation = minimax(currentBoard, depth + 1, false, aiPlayer, humanPlayer)
      currentBoard[idx] = null

      if (evaluation.score > bestScore) {
        bestScore = evaluation.score
        bestMove = idx
      }
    }
    return { score: bestScore, index: bestMove }
  } else {
    let bestScore = Infinity
    let bestMove = availableIndices[0]

    for (const idx of availableIndices) {
      currentBoard[idx] = humanPlayer
      const evaluation = minimax(currentBoard, depth + 1, true, aiPlayer, humanPlayer)
      currentBoard[idx] = null

      if (evaluation.score < bestScore) {
        bestScore = evaluation.score
        bestMove = idx
      }
    }
    return { score: bestScore, index: bestMove }
  }
}

function getBestMove(board: BoardState, difficulty: AIDifficulty, aiPlayer: Player): number {
  const emptyIndices: number[] = []
  board.forEach((val, idx) => {
    if (val === null) emptyIndices.push(idx)
  })

  if (emptyIndices.length === 0) return -1

  if (difficulty === 'easy') {
    const randomIdx = Math.floor(Math.random() * emptyIndices.length)
    return emptyIndices[randomIdx]
  }

  // Hard difficulty - use minimax
  const humanPlayer: Player = aiPlayer === 'X' ? 'O' : 'X'
  const boardCopy = [...board]
  const best = minimax(boardCopy, 0, true, aiPlayer, humanPlayer)
  return best.index ?? emptyIndices[0]
}

export default function App() {
  const [board, setBoard] = useState<BoardState>(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState<boolean>(true)
  const [mode, setMode] = useState<GameMode>('ai')
  const [difficulty, setDifficulty] = useState<AIDifficulty>('hard')
  const [history, setHistory] = useState<BoardState[]>([Array(9).fill(null)])
  const [scores, setScores] = useState<{ x: number; o: number; draws: number }>({
    x: 0,
    o: 0,
    draws: 0,
  })

  const { winner, line: winningLine } = checkWinner(board)
  const isGameOver = winner !== null
  const currentPlayer: Player = isXNext ? 'X' : 'O'

  const recordMove = useCallback((nextBoard: BoardState, nextIsXNext: boolean) => {
    setBoard(nextBoard)
    setHistory((prev) => [...prev, nextBoard])
    setIsXNext(nextIsXNext)

    const outcome = checkWinner(nextBoard)
    if (outcome.winner === 'X') {
      setScores((prev) => ({ ...prev, x: prev.x + 1 }))
    } else if (outcome.winner === 'O') {
      setScores((prev) => ({ ...prev, o: prev.o + 1 }))
    } else if (outcome.winner === 'draw') {
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }))
    }
  }, [])

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] || isGameOver) return
      if (mode === 'ai' && !isXNext) return // Prevent clicking while AI's turn

      const nextBoard = [...board]
      nextBoard[index] = currentPlayer

      recordMove(nextBoard, !isXNext)
    },
    [board, isGameOver, mode, isXNext, currentPlayer, recordMove]
  )

  // AI Turn handler
  useEffect(() => {
    if (mode === 'ai' && !isXNext && !isGameOver) {
      const timer = setTimeout(() => {
        const move = getBestMove(board, difficulty, 'O')
        if (move !== -1) {
          const nextBoard = [...board]
          nextBoard[move] = 'O'
          recordMove(nextBoard, true)
        }
      }, 350)

      return () => clearTimeout(timer)
    }
  }, [mode, isXNext, isGameOver, board, difficulty, recordMove])

  const handleResetRound = () => {
    const emptyBoard = Array(9).fill(null)
    setBoard(emptyBoard)
    setHistory([emptyBoard])
    setIsXNext(true)
  }

  const handleResetAll = () => {
    handleResetRound()
    setScores({ x: 0, o: 0, draws: 0 })
  }

  const handleUndo = () => {
    if (history.length <= 1 || isGameOver) return

    // In AI mode, undo both the AI move and the human move (2 steps)
    const stepsToUndo = mode === 'ai' ? 2 : 1
    const newHistoryLength = Math.max(1, history.length - stepsToUndo)
    const newHistory = history.slice(0, newHistoryLength)
    const previousBoard = newHistory[newHistory.length - 1]

    setHistory(newHistory)
    setBoard(previousBoard)

    const xCount = previousBoard.filter((c) => c === 'X').length
    const oCount = previousBoard.filter((c) => c === 'O').length
    setIsXNext(xCount === oCount)
  }

  const getStatusMessage = () => {
    if (winner === 'draw') return "🤝 It's a draw!"
    if (winner) {
      if (mode === 'ai') {
        return winner === 'X' ? '🎉 You won!' : '🤖 Computer won!'
      }
      return `🎉 Player ${winner} wins!`
    }
    if (mode === 'ai' && !isXNext) return '🤖 Computer is thinking...'
    return `Player ${currentPlayer}'s turn`
  }

  return (
    <div className="game-container">
      {/* Header */}
      <header className="game-header">
        <h1 className="game-title">Tic Tac Toe</h1>
        <p className="game-subtitle">Modern React & Bun App</p>
      </header>

      {/* Mode Controls */}
      <section className="controls-panel">
        <div className="toggle-group" role="group" aria-label="Game mode selection">
          <button
            type="button"
            className={`toggle-btn ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => {
              setMode('ai')
              handleResetRound()
            }}
          >
            vs Computer
          </button>
          <button
            type="button"
            className={`toggle-btn ${mode === 'pvp' ? 'active' : ''}`}
            onClick={() => {
              setMode('pvp')
              handleResetRound()
            }}
          >
            2 Players
          </button>
        </div>

        {mode === 'ai' && (
          <div className="difficulty-group" role="group" aria-label="AI difficulty selection">
            <button
              type="button"
              className={`pill-btn ${difficulty === 'easy' ? 'active' : ''}`}
              onClick={() => {
                setDifficulty('easy')
                handleResetRound()
              }}
            >
              Easy
            </button>
            <button
              type="button"
              className={`pill-btn ${difficulty === 'hard' ? 'active' : ''}`}
              onClick={() => {
                setDifficulty('hard')
                handleResetRound()
              }}
            >
              Unbeatable AI
            </button>
          </div>
        )}
      </section>

      {/* Scoreboard */}
      <section className="scoreboard">
        <div className={`score-card player-x ${isXNext && !isGameOver ? 'active-turn' : ''}`}>
          <div className="score-label">{mode === 'ai' ? 'You (X)' : 'Player X'}</div>
          <div className="score-value">{scores.x}</div>
        </div>

        <div className="score-card ties">
          <div className="score-label">Ties</div>
          <div className="score-value">{scores.draws}</div>
        </div>

        <div className={`score-card player-o ${!isXNext && !isGameOver ? 'active-turn' : ''}`}>
          <div className="score-label">{mode === 'ai' ? 'Bot (O)' : 'Player O'}</div>
          <div className="score-value">{scores.o}</div>
        </div>
      </section>

      {/* Status banner */}
      <div className={`status-banner ${winner ? 'highlight' : ''}`}>
        <span>{getStatusMessage()}</span>
      </div>

      {/* 3x3 Board */}
      <main className="board-wrapper">
        <div className="board">
          {board.map((cell, index) => {
            const isWinningCell = winningLine?.includes(index)
            return (
              <button
                key={index}
                type="button"
                className={`cell ${cell ? `cell-${cell.toLowerCase()}` : ''} ${
                  isWinningCell ? 'winning-cell' : ''
                }`}
                onClick={() => handleCellClick(index)}
                disabled={cell !== null || isGameOver || (mode === 'ai' && !isXNext)}
                aria-label={`Square ${index + 1}: ${cell || 'empty'}`}
              >
                {cell && <span className="cell-content">{cell}</span>}
              </button>
            )
          })}
        </div>
      </main>

      {/* Action Buttons */}
      <footer className="action-buttons">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleResetRound}
        >
          {isGameOver ? 'Play Again' : 'Restart Round'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleUndo}
          disabled={history.length <= 1 || isGameOver}
        >
          Undo Move
        </button>

        <button
          type="button"
          className="btn btn-outline"
          onClick={handleResetAll}
        >
          Reset Scores
        </button>
      </footer>

      {/* Project Info Footer */}
      <div className="app-footer">
        <span>⚡ Built with <strong>React 19</strong>, <strong>TypeScript</strong> & <strong>Bun</strong></span>
      </div>
    </div>
  )
}
