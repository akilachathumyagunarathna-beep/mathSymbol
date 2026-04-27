# ✍️ SymbolWriter

> A browser-based writing tool with 150+ math & science symbol shortcuts, a scientific calculator with graphing, symbolic calculus, matrix operations, and an Excel-like Data Lab — all offline. Built with vanilla JavaScript as a first project using AI-assisted learning.

![SymbolWriter Banner](https://img.shields.io/badge/SymbolWriter-v2.0-a78bfa?style=for-the-badge&logo=javascript&logoColor=white)
![Status](https://img.shields.io/badge/status-active-34d399?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-60a5fa?style=for-the-badge)
![Offline](https://img.shields.io/badge/works-offline-a78bfa?style=for-the-badge)

---

## 🌟 What is SymbolWriter?

SymbolWriter is a feature-rich browser-based writing tool designed for students, researchers, and anyone who works with mathematical or scientific notation. It combines a rich text editor, a symbol shortcut system, a scientific calculator, and a spreadsheet — all in one place, with no installation required and fully offline capable.

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
- **Matrix operations** — `det(A)`, `inv(A)`, `transpose(A)`, `A*B`
- **Symbolic calculus** (Nerdamer.js):
  - Differentiation: `diff(3*x^2, x)` → `6x`
  - Integration: `integrate(x^2, x)` → `x^3/3 + C`
  - Equation solving: `solve(x^2-4, x)` → `[2, -2]`
  - Factorization: `factor(x^2-4)` → `(x-2)(x+2)`
- Insert results directly into the editor

### 📊 Data Lab (Spreadsheet Engine)
- Excel-like spreadsheet with 50+ built-in functions (`SUM`, `AVG`, `VLOOKUP`, `IF`, etc.)
- Use your custom calculator functions directly in cells (`=bmi(70, 1.75)`)
- Nested functions: `=SUM(bmi(70,1.75), 10)`
- Formula autocomplete with suggestions
- Multiple chart types (Bar, Line, Pie, Scatter, Radar, and more)
- Sort, filter, find & replace
- Export to CSV and Excel

### 📱 Mobile Responsive
- Touch-friendly interface with larger tap targets
- Horizontal scrolling toolbars on small screens
- Quick-access bottom toolbar on mobile

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
git clone https://github.com/akilachathumyagunarathna-beep/SymbolWriter.git
cd SymbolWriter
```

---

## 🎯 How to Use

### Symbol Shortcuts
```
/alpha  →  α      /sum  →  ∑      /sqrt  →  √
/right  →  →      /1/2  →  ½      /pi    →  π
```

### Calculator — Custom Functions
```
bmi(w, h) = w / h^2
bmi(70, 1.75)              →   22.86
```

### Calculator — Symbolic Calculus
```
diff(3*x^2, x)             →   6x
integrate(x^2, x)          →   x^3/3 + C
solve(x^2-4, x)            →   [2, -2]
factor(x^2-4)              →   (x-2)(x+2)
```

### Calculator — Matrix
```
A = [[1,2],[3,4]]
det(A)                     →   -2
inv(A)                     →   [[-2,1],[1.5,-0.5]]
```

### Data Lab — Using Custom Functions
```
=bmi(70, 1.75)             →   22.86
=SUM(bmi(70,1.75), 10)     →   32.86
```

---

## 🗂️ Project Structure

```
SymbolWriter/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── Library/
│   │   ├── math.js
│   │   ├── chart.js
│   │   ├── nerdamer.core.js
│   │   ├── Algebra.js
│   │   ├── Calculus.js
│   │   └── Solve.js
│   ├── symbols.js
│   ├── editor.js
│   ├── calculator.js
│   ├── dataLab.js
│   ├── custom.js
│   ├── wordcopy.js
│   └── app.js
└── README.md
```

---

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| Vanilla JavaScript | Core logic |
| [Math.js](https://mathjs.org/) | Formula evaluation, matrix, custom functions |
| [Nerdamer.js](https://nerdamer.com/) | Symbolic calculus (diff, integrate, solve) |
| [Chart.js](https://www.chartjs.org/) | Graphs & data visualization |
| HTML5 ContentEditable | Rich text editor |
| localStorage | Data persistence |

---

## 💡 What I Learned

This was my first programming project, built with the help of AI (Claude by Anthropic). Through building this, I learned:

- How to structure a JavaScript project across multiple files
- How to use `localStorage` for data persistence
- How to integrate third-party libraries (Math.js, Chart.js, Nerdamer)
- How to debug using browser DevTools and console
- How script loading order and global scope works in JavaScript
- How to iteratively build and improve features
- How to use Git and GitHub for version control

---

## 📌 Future Improvements

- [ ] Auto-save with localStorage
- [ ] Document templates (Math report, Science lab)
- [ ] Multi-sheet Data Lab support
- [ ] AI formula helper
- [ ] PWA — install as offline app

---

## 👤 Author

Made with ❤️ and a lot of curiosity.

> *"Built as a beginner using AI-assisted learning — proof that you don't need years of experience to build something real."*

---

## 📄 License

This project is open source under the [MIT License](LICENSE).
