<<<<<<< HEAD
# ✍️ SymbolWriter

> A browser-based rich text editor with a built-in symbol library, scientific calculator, and spreadsheet engine — built as a first project using AI-assisted learning.

![SymbolWriter Banner](https://img.shields.io/badge/SymbolWriter-v2.0-a78bfa?style=for-the-badge&logo=javascript&logoColor=white)
![Status](https://img.shields.io/badge/status-active-34d399?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-60a5fa?style=for-the-badge)

---

## 🌟 What is SymbolWriter?

SymbolWriter is a feature-rich browser-based writing tool designed for students, researchers, and anyone who works with mathematical or scientific notation. It combines a rich text editor, a symbol shortcut system, a scientific calculator, and a spreadsheet — all in one place, with no installation required.

---

## ✨ Features

### 📝 Rich Text Editor
- Bold, italic, underline, strikethrough formatting
- Headings, blockquotes, code blocks, tables, task lists
- Find & Replace
- Word count, character count, reading time
- Export to `.doc`, `.txt`, `.html`
- Copy formatted text directly into Microsoft Word or Google Docs

### 🔣 Symbol Shortcut System
- 150+ built-in mathematical and scientific symbols
- Type `/alpha` → `α`, `/sum` → `∑`, `/int` → `∫` and more
- Categories: Greek Letters, Math Operators, Set Theory, Arrows, Geometry, and more
- Create and save your own **custom symbol shortcuts**
- Import/export custom shortcuts as JSON

### 🧮 Scientific Calculator
- Multi-row calculation with variable support (`x = 10`, `2*x`)
- Define and save **custom functions** (`bmi(w,h) = w/h^2`)
- Function graphing with Chart.js
- Insert results directly into the editor

### 📊 Data Lab (Spreadsheet Engine)
- Excel-like spreadsheet with 50+ built-in functions (`SUM`, `AVG`, `VLOOKUP`, `IF`, etc.)
- Use your custom calculator functions directly in cells (`=bmi(70, 1.75)`)
- Formula autocomplete with suggestions
- Multiple chart types (Bar, Line, Pie, Scatter, Radar, and more)
- Sort, filter, find & replace
- Export to CSV and Excel
- Multiple data types: Currency (USD, LKR, EUR), Percentage, Date, Boolean

---

## 🚀 Getting Started

### Option 1 — Open directly in browser
1. Download or clone this repository
2. Open `index.html` in any modern browser
3. No server, no installation needed!

### Option 2 — Use Live Server (VS Code)
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **Open with Live Server**

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/SymbolWriter.git

# Open the folder
cd SymbolWriter

# Open index.html in your browser
```

---

## 🎯 How to Use

### Symbol Shortcuts
Type a `/` followed by the symbol name anywhere in the editor:
```
/alpha  →  α
/sum    →  ∑
/sqrt   →  √
/right  →  →
/1/2    →  ½
```

### Calculator Custom Functions
In the Calculator panel, define a function:
```
bmi(w, h) = w / h^2
```
Then use it directly in the Data Lab:
```
=bmi(70, 1.75)   →   22.86
```

---

## 🗂️ Project Structure

```
SymbolWriter/
├── index.html          # Main HTML file
├── js/
│   ├── symbols.js      # Built-in symbol library
│   ├── editor.js       # Rich text editor logic
│   ├── calculator.js   # Calculator & custom functions
│   ├── dataLab.js      # Spreadsheet engine
│   ├── custom.js       # Custom symbol management
│   ├── wordcopy.js     # Export & clipboard features
│   ├── chart.js        # Chart helpers
│   └── app.js          # App initialization
└── README.md
```

---

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| Vanilla JavaScript | Core logic |
| [Math.js](https://mathjs.org/) | Formula evaluation & custom functions |
| [Chart.js](https://www.chartjs.org/) | Graphs & data visualization |
| HTML5 ContentEditable | Rich text editor |
| localStorage | Data persistence |

---

## 💡 What I Learned

This was my first programming project, built with the help of AI (Claude by Anthropic). Through building this, I learned:

- How to structure a JavaScript project across multiple files
- How to use `localStorage` for data persistence
- How to integrate third-party libraries (Math.js, Chart.js)
- How to debug using browser DevTools and console
- How ES Modules and script loading order works
- How to iteratively build and improve features

---

## 📌 Future Improvements

- [ ] Mobile responsive design
- [ ] Dark/Light theme toggle improvements
- [ ] More chart customization options
- [ ] Collaborative editing (backend)
- [ ] Sinhala language UI option

---

## 👤 Author

Made with ❤️ and a lot of curiosity.

> *"Built as a beginner using AI-assisted learning — proof that you don't need years of experience to build something real."*

---

## 📄 License

This project is open source under the [MIT License](LICENSE).
=======
# SymbolWriter
A browser-based writing tool with 150+ math/science symbol shortcuts, scientific calculator with custom functions, and an Excel-like spreadsheet engine. Built with vanilla JavaScript, Math.js and Chart.js — my first project as a beginner using AI-assisted learning.
>>>>>>> f71049cf8d5a0dc2f0db2d37fe0de442cc797afb
