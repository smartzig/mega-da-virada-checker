# Mega da Virada Results Checker

A simple, single-page web application to check your Mega da Virada lottery tickets against the winning numbers. This application is built with vanilla HTML, CSS, and JavaScript, using the Bootstrap framework for styling.

![Screenshot of the Mega da Virada Results Checker](https://i.imgur.com/example.png) <!-- I will replace this with a real screenshot once the app is visually complete -->

## ✨ Features

*   **Visual Number Picker:** Easily select the 6 winning numbers from an interactive grid.
*   **Automatic Results:** The table of your games updates in real-time as you select the numbers.
*   **Game Loading:** Automatically loads all your lottery games from an external `games.json` file.
*   **Hit Highlighting:** Clearly highlights winning games and the specific numbers that matched.
*   **Win Announcements:** Displays a prominent banner to celebrate Quadra, Quina, or Sena wins.
*   **Filtering:** Option to show only the games that had at least one matching number.

## 🚀 How to Use

1.  Open the `index.html` file in any modern web browser.
2.  The application will automatically load your lottery games from the `games.json` file.
3.  In the "Selecione os 6 números sorteados" section, click on the 6 numbers that were drawn in the lottery.
4.  The table below will instantly update to show the results for each of your games, including the number of hits and which numbers matched.

## ✏️ How to Update Your Games

To check your own lottery tickets, you need to edit the `games.json` file:

1.  Open the `games.json` file in a text editor.
2.  The file contains a simple JSON object. Each key is a unique identifier for your game (e.g., "A2CF-F06F82661065309D18-6"), and the value is an array of the 6 numbers in that game.
3.  You can add, remove, or edit the games in this file. Make sure to follow the format shown below.

**Example `games.json` format:**

```json
{
  "_comment": "Add your games here. The key is a unique name for your ticket, and the value is an array of 6 numbers.",
  "My-First-Ticket": [1, 10, 23, 44, 51, 60],
  "Another-Ticket-From-Work": [5, 12, 25, 33, 48, 57]
}
```

4.  Save the `games.json` file.
5.  Refresh the `index.html` page in your browser to see the updated list of your games.
