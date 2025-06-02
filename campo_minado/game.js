(() => {
  const BOARD_SIZE = 10;
  const MINES_COUNT = 15;

  const boardEl = document.getElementById('board');
  const minesRemainingEl = document.getElementById('mines-remaining');
  const resetButton = document.getElementById('reset-button');
  const messageEl = document.getElementById('message');

  let board = [];
  let minesLeft = MINES_COUNT;
  let revealedCount = 0;
  let flagsPlaced = 0;
  let gameOver = false;

  // Directions to check neighbors (8 surrounding tiles)
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  function createBoard() {
    boardEl.innerHTML = '';
    board = [];
    minesLeft = MINES_COUNT;
    revealedCount = 0;
    flagsPlaced = 0;
    gameOver = false;
    messageEl.textContent = '';
    messageEl.className = '';

    minesRemainingEl.textContent = `Minas restantes: ${minesLeft}`;

    // Create 2D array board with tile data
    for (let row = 0; row < BOARD_SIZE; row++) {
      const rowArray = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = {
          row,
          col,
          mine: false,
          revealed: false,
          flagged: false,
          adjacentMines: 0,
          element: null,
        };
        rowArray.push(tile);
      }
      board.push(rowArray);
    }

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < MINES_COUNT) {
      const r = Math.floor(Math.random() * BOARD_SIZE);
      const c = Math.floor(Math.random() * BOARD_SIZE);
      if (!board[r][c].mine) {
        board[r][c].mine = true;
        minesPlaced++;
      }
    }

    // Calculate adjacent mines count for each tile
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col].mine) {
          board[row][col].adjacentMines = -1;
          continue;
        }
        let count = 0;
        directions.forEach(([dr, dc]) => {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc].mine) {
            count++;
          }
        });
        board[row][col].adjacentMines = count;
      }
    }

    // Create board tiles in DOM with ARIA roles and attributes
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const tile = board[row][col];
        const tileButton = document.createElement('button');
        tileButton.classList.add('tile');
        tileButton.setAttribute('role', 'gridcell');
        tileButton.setAttribute('aria-label', 'Não revelado');
        tileButton.setAttribute('tabindex', '0');
        tileButton.dataset.row = row;
        tileButton.dataset.col = col;
        // Handle left click and right click
        tileButton.addEventListener('click', handleLeftClick);
        tileButton.addEventListener('contextmenu', handleRightClick);
        // Keyboard support: Space or Enter to reveal, Shift+Space or Shift+Enter to toggle flag
        tileButton.addEventListener('keydown', (e) => {
          if (gameOver) return;
          const isShift = e.shiftKey;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isShift) {
              toggleFlag(tile);
            } else {
              revealTile(tile);
            }
          }
        });
        tile.element = tileButton;
        boardEl.appendChild(tileButton);
      }
    }
  }

  function handleLeftClick(e) {
    if (gameOver) return;
    const tile = getTileFromElement(e.currentTarget);
    if (!tile) return;
    if (tile.revealed || tile.flagged) return;
    revealTile(tile);
  }

  function handleRightClick(e) {
    e.preventDefault();
    if (gameOver) return;
    const tile = getTileFromElement(e.currentTarget);
    if (!tile) return;
    if (tile.revealed) return;
    toggleFlag(tile);
  }

  function getTileFromElement(elem) {
    const row = parseInt(elem.dataset.row, 10);
    const col = parseInt(elem.dataset.col, 10);
    if (isNaN(row) || isNaN(col)) return null;
    return board[row][col];
  }

  function revealTile(tile) {
    if (tile.revealed || tile.flagged || gameOver) return;
    tile.revealed = true;
    revealedCount++;
    updateTileUI(tile);

    if (tile.mine) {
      endGame(false);
      return;
    }

    if (tile.adjacentMines === 0) {
      // Recursive reveal of neighbors
      directions.forEach(([dr, dc]) => {
        const nr = tile.row + dr;
        const nc = tile.col + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          const neighbor = board[nr][nc];
          if (!neighbor.revealed && !neighbor.flagged) revealTile(neighbor);
        }
      });
    }

    // Check win condition
    if (revealedCount === BOARD_SIZE * BOARD_SIZE - MINES_COUNT) {
      endGame(true);
    }
  }

  function toggleFlag(tile) {
    if (tile.revealed || gameOver) return;
    tile.flagged = !tile.flagged;
    flagsPlaced += tile.flagged ? 1 : -1;
    minesLeft = MINES_COUNT - flagsPlaced;
    updateTileUI(tile);
    minesRemainingEl.textContent = `Minas restantes: ${minesLeft}`;
  }

  function updateTileUI(tile) {
    const el = tile.element;
    if (tile.revealed) {
      el.classList.add('revealed');
      el.classList.remove('flagged');
      el.disabled = true;
      el.setAttribute('aria-label', tile.mine ? 'Mina' : `${tile.adjacentMines} minas adjacentes`);
      el.dataset.adjacent = tile.adjacentMines;
      if (tile.mine) {
        el.textContent = '💣';
        el.classList.add('mine');
      } else {
        el.textContent = tile.adjacentMines > 0 ? tile.adjacentMines : '';
      }
    } else if (tile.flagged) {
      el.classList.add('flagged');
      el.textContent = '🚩';
      el.setAttribute('aria-label', 'Bandeira');
      el.disabled = false;
    } else {
      el.classList.remove('flagged', 'revealed', 'mine');
      el.textContent = '';
      el.disabled = false;
      el.removeAttribute('aria-label');
      el.dataset.adjacent = '0';
    }
  }

  function revealAllMines() {
    for (const row of board) {
      for (const tile of row) {
        if (tile.mine && !tile.revealed) {
          tile.revealed = true;
          updateTileUI(tile);
        }
      }
    }
  }

  function endGame(won) {
    gameOver = true;
    if (won) {
      messageEl.textContent = '🎉 Parabéns! Você venceu!';
      messageEl.className = 'win';
    } else {
      revealAllMines();
      messageEl.textContent = '💥 Você perdeu! Tente novamente.';
      messageEl.className = 'lose';
    }
    // Disable all tiles
    for (const row of board) {
      for (const tile of row) {
        tile.element.disabled = true;
      }
    }
  }

  // Reset game on button click
  resetButton.addEventListener('click', () => {
    createBoard();
  });

  // Initialize game on page load
  createBoard();
})();
